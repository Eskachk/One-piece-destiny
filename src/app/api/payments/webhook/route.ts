import { NextResponse } from 'next/server';
import { paymentsState } from '@/lib/payments/provider';
import { reglerPaiement } from '@/lib/payments/reglement';

/**
 * Webhook du prestataire de paiement.
 *
 * ⚠️ Inactif tant que `PAYMENTS_ENABLED` ne vaut pas `true`. La route répond
 * alors 503 : refuser explicitement vaut mieux que répondre 200 à un
 * événement qu'on ignore, ce qui ferait croire au prestataire que tout va
 * bien.
 *
 * La route ne fait que deux choses : vérifier la signature, puis confier
 * l'événement au règlement (`lib/payments/reglement.ts`), qui est le même
 * que celui du retour en boutique. Ordre des contrôles, du moins coûteux au
 * plus coûteux :
 *
 *   signature → idempotence → statut → produit → montant → devise → crédit
 *
 * Le corps est lu **brut** : `request.json()` réencoderait la charge utile et
 * la signature ne correspondrait plus.
 *
 * Les codes de réponse sont pour le prestataire, pas pour un humain : 200
 * quand l'événement est traité — accepté, refusé ou déjà vu, peu importe, il
 * n'y a rien à réessayer ; 500 seulement sur une erreur technique, pour qu'il
 * réessaie. Le règlement reprend alors là où il s'était arrêté.
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

  const reglement = await reglerPaiement(event, state.provider.name, 'webhook');

  switch (reglement.issue) {
    case 'CREDITE':
      return NextResponse.json({ ok: true, accepted: true });
    case 'DEJA':
      return NextResponse.json({ ok: true, duplicate: true });
    case 'REFUSE':
      return NextResponse.json({ ok: true, accepted: false });
    case 'ERREUR':
      return NextResponse.json({ error: 'Attribution impossible.' }, { status: 500 });
  }
}
