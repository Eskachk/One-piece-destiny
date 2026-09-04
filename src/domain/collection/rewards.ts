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
 *
 * Le barème est indexé sur le **rang** et non sur le percentile — voir
 * `RANK_TIERS` pour la raison, qui tient à la taille réelle de la communauté.
 */

/** Socle accordé à quiconque a joué la semaine. */
export const PARTICIPATION_BERRIES = 300;
export const PARTICIPATION_CHESTS = 1;

/**
 * Barème au **rang**, et non plus au percentile.
 *
 * ## Pourquoi le percentile ne pouvait pas marcher
 *
 * L'ancien barème payait « le premier pour cent », « les dix premiers pour
 * cent », « la première moitié ». Sur une communauté de douze joueurs, le
 * rang 1 vaut un percentile d'environ huit : **le palier du haut était
 * mathématiquement inatteignable**, et le vainqueur touchait la même chose que
 * le troisième. Le classement existait sans jamais récompenser le fait de le
 * gagner.
 *
 * Un percentile ne veut rien dire tant qu'on n'est pas des centaines. Un rang,
 * si — « je suis deuxième » se comprend à douze comme à dix mille.
 *
 * ## Le barème
 *
 * Un seul palier par joueur, celui de son rang : c'est plus lisible qu'un
 * empilement, et cela permet d'annoncer le gain avant la publication.
 *
 *     1er           5 000     3 coffres et demi au prix boutique
 *     2e            3 000
 *     3e            2 000
 *     4e au 10e     1 000
 *     11e au 30e      600
 *     31e au 100e     350
 *     au-delà         200     le socle de participation
 *
 * ## L'équilibrage, et ce qui le gouverne
 *
 * Un coffre coûte 1 500 Berries en boutique, et **tout joueur qui verrouille
 * une équipe en reçoit déjà un gratuitement** (§116 : c'est le rendez-vous
 * hebdomadaire qu'on récompense, pas la domination).
 *
 * Les Berries sont donc une monnaie d'**accélération**, pas d'accès : un
 * participant régulier s'offre un coffre supplémentaire toutes les sept ou
 * huit semaines, le vainqueur trois d'un coup. L'écart est net sans être
 * décourageant — et il ne donne aucun avantage de score, ce que le §48
 * interdit formellement.
 *
 * L'écart entre le premier et le troisième — cinq mille contre deux mille —
 * est volontairement franc : gagner doit se sentir. Entre le dixième et le
 * onzième, en revanche, la marche est douce (1 000 contre 600), parce qu'à
 * cet endroit du classement un rang tient souvent à un seul personnage.
 */
export const RANK_TIERS: { maxRank: number; berries: number; label: string }[] = [
  { maxRank: 1, berries: 5_000, label: '1er' },
  { maxRank: 2, berries: 3_000, label: '2e' },
  { maxRank: 3, berries: 2_000, label: '3e' },
  { maxRank: 10, berries: 1_000, label: 'Top 10' },
  { maxRank: 30, berries: 600, label: 'Top 30' },
  { maxRank: 100, berries: 450, label: 'Top 100' },
];

export interface WeeklyReward {
  berries: number;
  chests: number;
  /** Palier atteint, pour l'affichage. */
  tiers: string[];
}

export interface WeeklyRewardInput {
  /** Le joueur a-t-il verrouillé une équipe pour ce chapitre ? */
  participated: boolean;
  /** Rang au classement, 1 pour le meilleur. `null` si non classé. */
  rank: number | null;
}

/**
 * Récompense d'un joueur pour un chapitre.
 *
 * Fonction pure : le même classement produit toujours les mêmes récompenses,
 * ce qui rend un recalcul contrôlé (§79) sans surprise.
 */
export function weeklyReward(input: WeeklyRewardInput): WeeklyReward {
  if (!input.participated) {
    return { berries: 0, chests: 0, tiers: [] };
  }

  if (input.rank !== null) {
    for (const tier of RANK_TIERS) {
      if (input.rank <= tier.maxRank) {
        return {
          berries: tier.berries,
          chests: PARTICIPATION_CHESTS,
          tiers: [tier.label],
        };
      }
    }
  }

  return {
    berries: PARTICIPATION_BERRIES,
    chests: PARTICIPATION_CHESTS,
    tiers: ['Participation'],
  };
}

/** Ce que rapporte un rang, pour l'annoncer avant la publication. */
export function berriesForRank(rank: number): number {
  return weeklyReward({ participated: true, rank }).berries;
}

/** Prix d'un coffre à la boutique (cahier §36, en Berries uniquement). */
export const CHEST_PRICE_BERRIES = 1_500;
