import { NextResponse } from 'next/server';
import { verifyClaim } from '@/domain/payments/catalog';
import { audit } from '@/lib/audit';
import { paymentsState } from '@/lib/payments/provider';
import { db } from '@/lib/supabase-admin';

/**
 * Webhook du prestataire de paiement.
 *
 * ⚠️ Inactif tant que `PAYMENTS_ENABLED` ne vaut pas `true`. La route répond
 * alors 503 : refuser explicitement vaut mieux que répondre 200 à un
 * événement qu'on ignore, ce qui ferait croire au prestataire que tout va
 * bien.
 *
 * Ordre des contrôles, du moins coûteux au plus coûteux, et surtout du plus
 * décisif au plus accessoire :
 *
 *   signature → idempotence → statut → produit → montant → devise → crédit
 *
 * Le corps est lu **brut** : `request.json()` réencoderait la charge utile et
 * la signature ne correspondrait plus.
 */
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const state = paymentsState();
  if (!state.enabled) {
    return NextResponse.json({ error: state.reason }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('stripe-signature');

  const event = await state.provider.verifyWebhook(rawBody, signature);
  if (!event) {
    // Ni le corps ni la signature ne sont journalisés : ils peuvent contenir
    // des données personnelles, et l'échec suffit au diagnostic.
    console.warn('[payment] PAYMENT_WEBHOOK_INVALID signature refusée');
    return NextResponse.json({ error: 'Signature invalide.' }, { status: 400 });
  }

  console.info(`[payment] PAYMENT_WEBHOOK_RECEIVED event=${event.eventId}`);

  // Idempotence : la clé primaire de `payment_events` est l'identifiant
  // d'événement. Un rejeu échoue ici et n'accorde rien une seconde fois.
  const claim = await db()
    .from('payment_events')
    .insert({
      event_id: event.eventId,
      provider: state.provider.name,
      intent_id: event.intentId,
      verdict: 'RECEIVED',
    });

  if (claim.error) {
    if (claim.error.code === '23505') {
      // Déjà traité. On répond 200 : sinon le prestataire réessaierait sans fin.
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error('[payment] PAYMENT_EVENT_INSERT_FAILED');
    return NextResponse.json({ error: 'Journalisation impossible.' }, { status: 500 });
  }

  // L'intention porte le joueur : c'est le serveur qui l'a écrite à la
  // création du paiement, pas le client.
  const { data: intent } = await db()
    .from('payment_intents')
    .select('id, player_id, product_id, amount_cents, currency, status')
    .eq('id', event.intentId ?? '')
    .maybeSingle();

  const verdict = verifyClaim({
    productId: event.productId,
    amountCents: event.amountCents,
    currency: event.currency,
    status: event.status,
    playerId: intent?.player_id ?? null,
    eventId: event.eventId,
  });

  if (!verdict.ok) {
    await db()
      .from('payment_events')
      .update({ verdict: `REJECTED: ${verdict.reason}` })
      .eq('event_id', event.eventId);

    await audit({
      playerId: intent?.player_id ?? null,
      action: 'payment.webhook',
      status: 'REFUSED',
      metadata: { reason: verdict.reason, eventId: event.eventId },
    });

    console.warn(`[payment] PAYMENT_REJECTED ${verdict.reason}`);
    // 200 : l'événement est traité — il est simplement refusé. Un 4xx ferait
    // réessayer le prestataire sur un verdict qui ne changera pas.
    return NextResponse.json({ ok: true, accepted: false });
  }

  // Règlement et crédit dans une seule transaction SQL. La fonction ne
  // crédite que si l'intention était encore « CREATED » : deux webhooks
  // concurrents sur le même achat ne peuvent pas créditer deux fois, même
  // s'ils franchissent ensemble le contrôle d'idempotence précédent.
  // `grant_purchase_v2` accorde aussi les coffres royaux et les personnages du
  // rayon boutique. Tout ce qu'elle reçoit vient du **catalogue serveur** —
  // jamais du webhook : le prestataire dit qu'un produit a été payé, il ne dit
  // pas ce que ce produit contient.
  const { data: granted, error: grantError } = await db().rpc(
    'grant_purchase_v2',
    {
      p_player_id: verdict.playerId,
      p_intent_id: intent?.id ?? null,
      p_berries: verdict.product.grants.berries,
      p_chests: verdict.product.grants.chests,
      p_royal_chests: verdict.product.grants.royalChests ?? 0,
      p_character_id: verdict.product.grants.characterId ?? null,
    },
  );

  if (grantError) {
    console.error('[payment] PAYMENT_GRANT_FAILED');
    // 500 : le prestataire réessaiera, et l'idempotence empêchera le doublon.
    return NextResponse.json({ error: 'Attribution impossible.' }, { status: 500 });
  }

  if (granted === false) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  await db()
    .from('payment_events')
    .update({ verdict: 'VERIFIED' })
    .eq('event_id', event.eventId);

  await audit({
    playerId: verdict.playerId,
    action: 'payment.verified',
    status: 'SUCCESS',
    metadata: {
      productId: verdict.product.id,
      amountCents: verdict.product.priceCents,
      eventId: event.eventId,
    },
  });

  console.info(`[payment] PAYMENT_VERIFIED event=${event.eventId}`);
  return NextResponse.json({ ok: true, accepted: true });
}
