/**
 * Récompenses hebdomadaires (cahier §72).
 *
 * Deux contraintes du cahier gouvernent ce barème :
 *
 *   §48  la monnaie ne doit jamais acheter la victoire — elle n'ouvre que
 *        de la collection et des choix économiques ;
 *   §72  les récompenses compétitives doivent rester équitables.
 *
 * Conséquence : le classement module la quantité de Berries, jamais un
 * avantage de score. Et **tout joueur ayant verrouillé une équipe reçoit un
 * coffre**, quel que soit son rang : le rendez-vous hebdomadaire (§116) est
 * ce qu'on veut récompenser, pas la domination.
 */

/** Socle accordé à quiconque a joué la semaine. */
export const PARTICIPATION_BERRIES = 200;
export const PARTICIPATION_CHESTS = 1;

/**
 * Bonus par palier de percentile. Les paliers sont cumulatifs vers le haut :
 * un joueur du top 1 % touche aussi les paliers 10 % et 50 %.
 */
export const PERCENTILE_TIERS: { maxPercentile: number; berries: number }[] = [
  { maxPercentile: 1, berries: 800 },
  { maxPercentile: 10, berries: 300 },
  { maxPercentile: 50, berries: 100 },
];

export interface WeeklyReward {
  berries: number;
  chests: number;
  /** Paliers atteints, pour l'affichage. */
  tiers: string[];
}

export interface WeeklyRewardInput {
  /** Le joueur a-t-il verrouillé une équipe pour ce chapitre ? */
  participated: boolean;
  /** Percentile obtenu (1 = meilleur). `null` si non classé. */
  percentile: number | null;
}

/**
 * Calcule la récompense d'un joueur pour un chapitre.
 * Fonction pure : le même classement produit toujours les mêmes récompenses,
 * ce qui rend un recalcul contrôlé (§79) sans surprise.
 */
export function weeklyReward(input: WeeklyRewardInput): WeeklyReward {
  if (!input.participated) {
    return { berries: 0, chests: 0, tiers: [] };
  }

  let berries = PARTICIPATION_BERRIES;
  const tiers: string[] = ['Participation'];

  if (input.percentile !== null) {
    for (const tier of PERCENTILE_TIERS) {
      if (input.percentile <= tier.maxPercentile) {
        berries += tier.berries;
        tiers.push(`Top ${tier.maxPercentile}%`);
      }
    }
  }

  return { berries, chests: PARTICIPATION_CHESTS, tiers };
}

/** Prix d'un coffre à la boutique (cahier §36, en Berries uniquement). */
export const CHEST_PRICE_BERRIES = 1_500;
