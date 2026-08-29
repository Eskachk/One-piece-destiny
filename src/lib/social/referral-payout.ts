import 'server-only';

import {
  MAX_REWARDED_REFERRALS,
  REFERRAL_BERRIES_REFERRER,
} from '@/domain/social/referral';
import { getRepository } from '@/lib/repository';
import { dispatch } from '@/lib/notifications/dispatch';
import {
  confirmReferral,
  isSocialAvailable,
  pendingReferrerOf,
  rewardedReferralCount,
} from './repository';

/**
 * Versement au parrain (cahier §71, §43).
 *
 * Déclenché quand le filleul verrouille un équipage — pas à son inscription.
 * Un compte fabriqué s'arrête avant cette étape ; un joueur réellement ramené
 * la franchit dès sa première semaine.
 *
 * Ordre des opérations, et il n'est pas interchangeable :
 *
 *   1. **lire** le parrain en attente, sans rien modifier ;
 *   2. **vérifier le plafond** — au-delà, on ne touche pas à la ligne. La
 *      marquer « récompensée » sans payer la ferait disparaître du compteur
 *      tout en la comptant comme honorée ;
 *   3. **réclamer** la ligne de façon atomique, puis créditer.
 *
 * L'étape 3 est le verrou contre le double paiement : `confirmReferral` ne
 * rend un parrain que si la ligne était encore en attente.
 */
export async function payReferrerOnFirstCrew(
  playerId: string,
): Promise<void> {
  if (!isSocialAvailable()) return;

  const referrerId = await pendingReferrerOf(playerId);
  if (!referrerId) return;

  // Plafond atteint : le lien reste enregistré, mais il ne rapporte plus. On
  // laisse la ligne en attente plutôt que de la consommer pour rien.
  if ((await rewardedReferralCount(referrerId)) >= MAX_REWARDED_REFERRALS) {
    return;
  }

  const claimed = await confirmReferral(playerId);
  if (!claimed) return;

  await getRepository().grantBerriesAndChests(
    claimed,
    REFERRAL_BERRIES_REFERRER,
    0,
  );

  await dispatch(claimed, {
    kind: 'REWARD_RECEIVED',
    title: '🏴 Ton filleul a pris la mer',
    body: `+${REFERRAL_BERRIES_REFERRER} Berries : quelqu'un que tu as invité vient de verrouiller son premier équipage.`,
    href: '/profil',
    dedupeKey: `referral:${playerId}`,
  });
}
