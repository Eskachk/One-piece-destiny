/**
 * Divisions (cahier §19).
 *
 * Avec beaucoup de joueurs, un classement mondial cesse de motiver : être
 * 4 812e ne dit rien. Les divisions redonnent un adversaire à sa portée.
 *
 * Le mouvement dépend du **percentile**, pas du rang absolu : sinon la
 * difficulté de monter varierait avec le nombre de joueurs de la semaine.
 */

export const DIVISIONS = [
  'EAST_BLUE',
  'GRAND_LINE',
  'NEW_WORLD',
  'YONKO',
  'PIRATE_KING',
] as const;

export type Division = (typeof DIVISIONS)[number];

export const DIVISION_LABEL: Record<Division, string> = {
  EAST_BLUE: 'East Blue',
  GRAND_LINE: 'Grand Line',
  NEW_WORLD: 'New World',
  YONKO: 'Yonko',
  PIRATE_KING: 'Pirate King',
};

export const STARTING_DIVISION: Division = 'EAST_BLUE';

/** Monter demande un top 25 % ; on redescend sous les 75 %. */
export const PROMOTION_PERCENTILE = 25;
export const RELEGATION_PERCENTILE = 75;

/**
 * Semaines consécutives nécessaires pour bouger.
 *
 * Une seule bonne semaine ne fait pas monter, une seule mauvaise ne fait pas
 * descendre : le cahier §20 veut qu'une absence ne ruine pas une saison, et
 * la même logique vaut ici — on récompense la régularité, pas le coup de
 * chance.
 */
export const STREAK_TO_MOVE = 2;

export function divisionRank(division: Division): number {
  return DIVISIONS.indexOf(division);
}

export interface DivisionState {
  division: Division;
  /** Semaines consécutives en zone de promotion. */
  promotionStreak: number;
  /** Semaines consécutives en zone de relégation. */
  relegationStreak: number;
}

export const INITIAL_DIVISION_STATE: DivisionState = {
  division: STARTING_DIVISION,
  promotionStreak: 0,
  relegationStreak: 0,
};

export type DivisionMove = 'PROMOTED' | 'RELEGATED' | 'STAYED';

export interface DivisionOutcome {
  state: DivisionState;
  move: DivisionMove;
}

/**
 * Applique le résultat d'un chapitre à la division d'un joueur.
 *
 * @param percentile percentile obtenu (1 = meilleur), `null` si non classé.
 */
export function applyChapterToDivision(
  current: DivisionState,
  percentile: number | null,
): DivisionOutcome {
  // Non classé : on ne pénalise pas, mais les séries en cours retombent.
  if (percentile === null) {
    return {
      state: { ...current, promotionStreak: 0, relegationStreak: 0 },
      move: 'STAYED',
    };
  }

  const index = divisionRank(current.division);
  const atTop = index === DIVISIONS.length - 1;
  const atBottom = index === 0;

  if (percentile <= PROMOTION_PERCENTILE) {
    const streak = current.promotionStreak + 1;

    if (streak >= STREAK_TO_MOVE && !atTop) {
      return {
        state: {
          division: DIVISIONS[index + 1],
          promotionStreak: 0,
          relegationStreak: 0,
        },
        move: 'PROMOTED',
      };
    }

    return {
      state: { ...current, promotionStreak: streak, relegationStreak: 0 },
      move: 'STAYED',
    };
  }

  if (percentile >= RELEGATION_PERCENTILE) {
    const streak = current.relegationStreak + 1;

    if (streak >= STREAK_TO_MOVE && !atBottom) {
      return {
        state: {
          division: DIVISIONS[index - 1],
          promotionStreak: 0,
          relegationStreak: 0,
        },
        move: 'RELEGATED',
      };
    }

    return {
      state: { ...current, promotionStreak: 0, relegationStreak: streak },
      move: 'STAYED',
    };
  }

  // Zone neutre : les deux séries retombent.
  return {
    state: { ...current, promotionStreak: 0, relegationStreak: 0 },
    move: 'STAYED',
  };
}
