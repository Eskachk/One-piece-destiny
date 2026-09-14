import 'server-only';

import { verifyClaim } from '@/domain/payments/catalog';
import { audit } from '@/lib/audit';
import type { VerifiedEvent } from '@/lib/payments/provider';
import { db } from '@/lib/supabase-admin';

/**
 * Règlement d'un paiement : de l'événement vérifié au crédit du joueur.
 *
 * ## Pourquoi c'est sorti du webhook
 *
 * Le webhook était le **seul** chemin qui créditait un achat. Or un webhook
 * est la partie la plus fragile de toute la chaîne : il dépend d'un point de
 * terminaison déclaré dans le tableau de bord du prestataire, d'un secret de
 * signature copié sans faute, et d'une livraison réseau vers Vercel. Aucun de
 * ces trois maillons n'est dans le code, et aucun ne se teste au déploiement.
 * Quinze intentions en base, zéro événement reçu : la chaîne n'avait jamais
 * été exercée en production.
 *
 * Le règlement vit donc ici, et il a **deux** entrées :
 *
 *   — le webhook, quand il arrive ;
 *   — le retour du joueur sur la boutique (`rapprochement.ts`), qui demande
 *     directement au prestataire si la session est payée.
 *
 * Les deux passent par la même fonction, les mêmes contrôles, la même
 * transaction SQL. Si le webhook est en panne, le joueur est crédité au
 * retour ; s'il est en avance, le retour trouve l'intention déjà réglée.
 *
 * ## L'idempotence, et le défaut qu'elle cachait
 *
 * `payment_events` a pour clé l'identifiant d'événement : un rejeu échoue à
 * l'insertion et n'accorde rien deux fois. Mais la ligne était écrite **avant**
 * le crédit, avec le verdict `RECEIVED`. Si le crédit échouait ensuite — base
 * indisponible pendant une seconde — la route répondait 500, le prestataire
 * réessayait… et le rejeu tombait sur la ligne déjà présente : « déjà
 * traité », 200, jamais crédité. L'achat était perdu, payé, et silencieux.
 *
 * La clé reste la même ; c'est le **verdict** qui décide maintenant. Une
 * ligne `VERIFIED`, `REJECTED` ou `DUPLICATE` est close. Une ligne `RECEIVED`
 * ou `FAILED` est un traitement interrompu : le rejeu reprend. Le double
 * crédit reste impossible — `grant_purchase_v2` ne crédite que si l'intention
 * est encore `CREATED`, dans une seule transaction.
 */

export type Reglement =
  /** Crédité à l'instant. */
  | { issue: 'CREDITE'; productId: string; playerId: string }
  /** Déjà réglé, par ce chemin ou par l'autre. */
  | { issue: 'DEJA'; productId: string | null; playerId: string | null }
  /** Refusé après vérification — montant, devise, statut, produit. Définitif. */
  | { issue: 'REFUSE'; reason: string }
  /** Erreur technique : l'appelant doit faire réessayer (500 pour un webhook). */
  | { issue: 'ERREUR' };

const CLOS = ['VERIFIED', 'DUPLICATE'];

export async function reglerPaiement(
  event: VerifiedEvent,
  provider: string,
  source: 'webhook' | 'retour',
): Promise<Reglement> {
  const claim = await db().from('payment_events').insert({
    event_id: event.eventId,
    provider,
    intent_id: event.intentId,
    verdict: 'RECEIVED',
  });

  if (claim.error) {
    if (claim.error.code !== '23505') {
      console.error(`[payment] PAYMENT_EVENT_INSERT_FAILED source=${source}`);
      return { issue: 'ERREUR' };
    }

    // Déjà vu. Clos si un verdict définitif a été posé ; sinon c'est un
    // traitement interrompu, et on le reprend.
    const { data: existant } = await db()
      .from('payment_events')
      .select('verdict, intent_id')
      .eq('event_id', event.eventId)
      .maybeSingle();

    const verdict = existant?.verdict ?? '';
    if (CLOS.includes(verdict) || verdict.startsWith('REJECTED')) {
      const { data: intent } = await db()
        .from('payment_intents')
        .select('player_id, product_id')
        .eq('id', existant?.intent_id ?? '')
        .maybeSingle();
      return { issue: 'DEJA', productId: intent?.product_id ?? null, playerId: intent?.player_id ?? null };
    }
    console.warn(`[payment] PAYMENT_EVENT_RESUMED event=${event.eventId} verdict=${verdict}`);
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
    // Montant écrit par le serveur à l'ouverture du paiement. Il peut être
    // inférieur au prix du catalogue — offre de lancement — et le webhook
    // arrive parfois après la fin de l'offre.
    expectedCents: intent?.amount_cents ?? null,
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
      metadata: { reason: verdict.reason, eventId: event.eventId, source },
    });

    console.warn(`[payment] PAYMENT_REJECTED ${verdict.reason}`);
    return { issue: 'REFUSE', reason: verdict.reason };
  }

  // Règlement et crédit dans une seule transaction SQL. La fonction ne
  // crédite que si l'intention était encore « CREATED » : deux règlements
  // concurrents sur le même achat ne peuvent pas créditer deux fois.
  // `grant_purchase_v2` accorde aussi les coffres royaux et les personnages du
  // rayon boutique. Tout ce qu'elle reçoit vient du **catalogue serveur** —
  // jamais du prestataire : il dit qu'un produit a été payé, il ne dit pas ce
  // que ce produit contient.
  const { data: granted, error: grantError } = await db().rpc('grant_purchase_v2', {
    p_player_id: verdict.playerId,
    p_intent_id: intent?.id ?? null,
    p_berries: verdict.product.grants.berries,
    p_chests: verdict.product.grants.chests,
    p_royal_chests: verdict.product.grants.royalChests ?? 0,
    p_character_id: verdict.product.grants.characterId ?? null,
  });

  if (grantError) {
    // `FAILED`, pas `RECEIVED` : la ligne dit qu'on a essayé, et le rejeu la
    // reprendra (voir l'en-tête).
    await db().from('payment_events').update({ verdict: 'FAILED' }).eq('event_id', event.eventId);
    console.error(`[payment] PAYMENT_GRANT_FAILED source=${source}`);
    return { issue: 'ERREUR' };
  }

  if (granted === false) {
    await db().from('payment_events').update({ verdict: 'DUPLICATE' }).eq('event_id', event.eventId);
    return { issue: 'DEJA', productId: verdict.product.id, playerId: verdict.playerId };
  }

  await db().from('payment_events').update({ verdict: 'VERIFIED' }).eq('event_id', event.eventId);

  await audit({
    playerId: verdict.playerId,
    action: 'payment.verified',
    status: 'SUCCESS',
    metadata: {
      productId: verdict.product.id,
      // Le montant réellement encaissé, pas le prix affiché au catalogue.
      amountCents: event.amountCents,
      eventId: event.eventId,
      source,
    },
  });

  console.info(`[payment] PAYMENT_VERIFIED event=${event.eventId} source=${source}`);
  return { issue: 'CREDITE', productId: verdict.product.id, playerId: verdict.playerId };
}
