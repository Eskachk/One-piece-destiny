/**
 * Niveaux de personnage (cahier §34).
 *
 * Le cahier est catégorique sur ce qu'il faut **éviter** :
 *
 *     Level 30 = +30 % score
 *
 * « Cela rendrait les anciens joueurs mécaniquement trop puissants. »
 *
 * Le niveau ne sert donc qu'à la progression cosmétique et aux statistiques.
 * Ce module n'expose **aucune fonction produisant un multiplicateur de
 * score** — et le moteur de scoring n'importe rien d'ici. C'est la garantie
 * structurelle qu'un niveau ne pourra pas devenir un avantage par accident.
 */

/** Expérience gagnée chaque fois qu'un personnage est aligné dans un équipage. */
export const XP_PER_APPEARANCE_IN_CREW = 10;

/** Bonus quand le chapitre est publié et que le personnage a marqué. */
export const XP_PER_SCORING_CHAPTER = 15;

export const MAX_LEVEL = 30;

/**
 * Seuil d'expérience du niveau donné.
 *
 * Courbe quadratique douce : monter reste perceptible longtemps sans devenir
 * inatteignable.
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 50 * (level - 1) * level;
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) {
    level += 1;
  }
  return level;
}

export interface LevelProgress {
  level: number;
  xp: number;
  /** Expérience au début du niveau courant. */
  currentFloor: number;
  /** Expérience requise pour le niveau suivant, `null` au niveau maximal. */
  nextThreshold: number | null;
  /** Avancement dans le niveau courant, 0–1. */
  ratio: number;
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelFromXp(xp);
  const currentFloor = xpForLevel(level);

  if (level >= MAX_LEVEL) {
    return { level, xp, currentFloor, nextThreshold: null, ratio: 1 };
  }

  const nextThreshold = xpForLevel(level + 1);
  const span = nextThreshold - currentFloor;

  return {
    level,
    xp,
    currentFloor,
    nextThreshold,
    ratio: span === 0 ? 1 : (xp - currentFloor) / span,
  };
}

/**
 * Expérience gagnée par un personnage sur un chapitre.
 *
 * @param inCrew  le personnage était-il dans l'équipage verrouillé ?
 * @param scored  a-t-il rapporté des points ?
 */
export function xpEarned(inCrew: boolean, scored: boolean): number {
  if (!inCrew) return 0;
  return XP_PER_APPEARANCE_IN_CREW + (scored ? XP_PER_SCORING_CHAPTER : 0);
}

/** Récompenses de niveau — cosmétiques, jamais du score (§34). */
export const LEVEL_REWARDS: { level: number; reward: string }[] = [
  { level: 5, reward: 'Cadre bronze' },
  { level: 10, reward: 'Cadre argent' },
  { level: 20, reward: 'Cadre or' },
  { level: 30, reward: 'Cadre légendaire animé' },
];

export function unlockedRewards(level: number): string[] {
  return LEVEL_REWARDS.filter((entry) => level >= entry.level).map(
    (entry) => entry.reward,
  );
}
