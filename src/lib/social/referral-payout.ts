import 'server-only';

import {
  MAX_REWARDED_REFERRALS,
  REFERRAL_BERRIES_REFERRER,
  evaluateReferralPayout,
} from '@/domain/social/referral';
import { getRepository } from '@/lib/repository';
import { dispatch } from '@/lib/notifications/dispatch';
import {
  confirmReferral,
  isSocialAvailable,
  pendingReferrerOf,
  referralMaturityOf,
  releasePendingBerries,
  rewardedReferralCount,
} from './repository';

/**
 * Versement au parrain (cahier §71, §43).
 *
 * Appelé à **chaque** enregistrement d'équipage, pas seulement au premier :
 * les conditions de maturité (adresse confirmée, trois chapitres joués) se
 * remplissent avec le temps, et il faut donc les réexaminer à chaque passage.
 * Tant qu'elles ne sont pas réunies, la ligne reste en attente et rien n'est
 * consommé.
 *
 * Ordre des opérations, et il n'est pas interchangeable :
 *
 *   1. **lire** le parrain en attente, sans rien modifier ;
 *   2. **vérifier le plafond** — au-delà, on ne touche pas à la ligne. La
 *      marquer « récompensée » sans payer la ferait disparaître du compteur
 *      tout en la comptant comme honorée ;
 *   3. **vérifier la maturité du filleul** (§43) — même raisonnement : on
 *      laisse la ligne en attente plutôt que de la consommer pour rien ;
 *   4. **réclamer** la ligne de façon atomique, puis créditer.
 *
 * L'étape 4 est le verrou contre le double paiement : `confirmReferral` ne
 * rend un parrain que si la ligne était encore en attente.
 */
export async function payReferrerOnFirstCrew(
  playerId: string,
): Promise<void> {
  if (!isSocialAvailable()) return;

  // Libération de la dotation d'arrivée du joueur lui-même.
  //
  // Elle est posée en attente à l'inscription et ne devient dépensable qu'ici,
  // au premier équipage verrouillé. C'est la mesure qui rend le fermage
  // stérile : créer un compte ne produit plus aucune monnaie, il faut jouer.
  //
  // La fonction en base est idempotente (verrou de ligne + remise à zéro) :
  // l'appeler à chaque enregistrement d'équipage ne crédite qu'une fois.
  //
  // La libération et la lecture du parrain partent **ensemble** : elles ne se
  // lisent pas l'une l'autre. La première crédite le joueur, la seconde
  // regarde qui l'a amené.
  const [, referrerId] = await Promise.all([
    releasePendingBerries(playerId),
    pendingReferrerOf(playerId),
  ]);

  if (!referrerId) return;

  // Plafond atteint : le lien reste enregistré, mais il ne rapporte plus. On
  // laisse la ligne en attente plutôt que de la consommer pour rien.
  //
  // Plafond et maturité se lisent ensemble : deux refus indépendants, dont
  // aucun ne conditionne l'autre. Les enchaîner faisait payer deux
  // allers-retours pour une décision qui n'en demande qu'un.
  const [rewarded, maturity] = await Promise.all([
    rewardedReferralCount(referrerId),
    referralMaturityOf(playerId, referrerId),
  ]);

  if (rewarded >= MAX_REWARDED_REFERRALS) return;

  // Le filleul a-t-il assez joué ? Sans ce contrôle, fabriquer un compte et
  // cliquer trois personnages suffisait à encaisser 800 Berries.
  if (!evaluateReferralPayout(maturity).pay) return;

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
    body: `+${REFERRAL_BERRIES_REFERRER} Berries : quelqu'un que tu as invité a confirmé son adresse et joué trois chapitres.`,
    href: '/profil',
    dedupeKey: `referral:${playerId}`,
  });
}
