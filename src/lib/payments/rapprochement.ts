import 'server-only';

import { paymentsState } from '@/lib/payments/provider';
import { reglerPaiement } from '@/lib/payments/reglement';
import { db } from '@/lib/supabase-admin';

/**
 * Rapprochement au retour en boutique.
 *
 * Le prestataire renvoie le joueur sur `/boutique?paiement=ok` une fois la
 * caisse passée. Jusqu'ici la page ne le regardait pas : le joueur revenait
 * sur une boutique muette, et ses Berries n'arrivaient que si le webhook
 * arrivait — ce qui, en production, ne s'était encore jamais produit.
 *
 * Ici, au retour, on **demande** au prestataire l'état des sessions ouvertes
 * par ce joueur ces dernières vingt-quatre heures (la durée de vie d'une
 * session de paiement). Si l'une est payée, elle est réglée sur-le-champ par
 * le même chemin que le webhook — et si le webhook est passé avant, le
 * règlement le voit et ne crédite pas deux fois.
 *
 * Trois sessions au plus : on règle ce que le joueur vient de faire, pas
 * l'historique. Et les intentions plus vieilles que la session du prestataire
 * sont closes en `CANCELLED` — le seul statut de clôture que la table admet
 * hors `PAID` et `FAILED` : elles ne pourront plus jamais être payées, et les
 * compter parmi les « caisses ouvertes » faussait les statistiques.
 */

export type Retour =
  /** Une session payée vient d'être créditée, ou l'avait déjà été. */
  | { etat: 'credite'; productId: string }
  /** Une session est ouverte mais le prestataire ne la dit pas encore payée. */
  | { etat: 'attente' }
  /** Aucune session récente : rien à rapprocher. */
  | { etat: 'rien' };

const VALIDITE_SESSION_MS = 24 * 60 * 60 * 1000;

export async function rapprocherRetour(playerId: string): Promise<Retour> {
  const state = paymentsState();
  if (!state.enabled) return { etat: 'rien' };

  const limite = new Date(Date.now() - VALIDITE_SESSION_MS).toISOString();

  // Ménage d'abord : les intentions périmées ne sont plus « ouvertes ».
  await db()
    .from('payment_intents')
    .update({ status: 'CANCELLED' })
    .eq('player_id', playerId)
    .eq('status', 'CREATED')
    .lt('created_at', limite);

  const { data: ouvertes } = await db()
    .from('payment_intents')
    .select('id, product_id, provider_ref')
    .eq('player_id', playerId)
    .eq('status', 'CREATED')
    .not('provider_ref', 'is', null)
    .gte('created_at', limite)
    .order('created_at', { ascending: false })
    .limit(3);

  const sessions = (ouvertes ?? []) as { id: string; product_id: string; provider_ref: string }[];
  if (sessions.length === 0) return { etat: 'rien' };

  for (const session of sessions) {
    let event = null;
    try {
      event = await state.provider.retrievePayment(session.provider_ref);
    } catch {
      // Prestataire injoignable : on ne bloque pas la page pour ça, le
      // webhook ou un prochain retour feront le travail.
      continue;
    }
    if (!event || event.status !== 'paid') continue;

    // L'intention est la nôtre, pas celle que le prestataire croit : on la
    // force, au cas où ses métadonnées manqueraient.
    const reglement = await reglerPaiement({ ...event, intentId: session.id }, state.provider.name, 'retour');
    if (reglement.issue === 'CREDITE' || reglement.issue === 'DEJA') {
      return { etat: 'credite', productId: reglement.productId ?? session.product_id };
    }
  }

  return { etat: 'attente' };
}
