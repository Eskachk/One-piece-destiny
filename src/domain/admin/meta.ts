/**
 * Surveillance de la méta (cahier §13).
 *
 * Le cahier veut pouvoir repérer trois choses chaque semaine :
 * un personnage trop dominant, un personnage à haut potentiel mais très
 * risqué, et une stratégie sous-évaluée.
 *
 * Ces statistiques ne servent qu'à l'équilibrage. Elles ne sont pas exposées
 * telles quelles au joueur : le §12 met en garde contre une information si
 * précise qu'elle résoudrait le jeu.
 */

export interface CharacterOutcome {
  characterId: string;
  /** Score obtenu ce chapitre-là. */
  score: number;
  /** L'équipe qui l'incluait a-t-elle fini dans le meilleur quart ? */
  won: boolean;
}

export interface MetaStats {
  characterId: string;
  /** Part des équipes l'ayant sélectionné, 0–1. */
  pickRate: number;
  average: number;
  median: number;
  /** Variance : un écart élevé signale un personnage « tout ou rien ». */
  variance: number;
  /** Part des sélections finissant dans le meilleur quart, 0–1. */
  winRate: number;
  picks: number;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

/**
 * Agrège les résultats par personnage.
 *
 * @param outcomes  une entrée par sélection observée
 * @param teamCount nombre total d'équipes, pour le taux de sélection
 */
export function metaStats(
  outcomes: CharacterOutcome[],
  teamCount: number,
): MetaStats[] {
  const byCharacter = new Map<string, CharacterOutcome[]>();
  for (const outcome of outcomes) {
    const list = byCharacter.get(outcome.characterId) ?? [];
    list.push(outcome);
    byCharacter.set(outcome.characterId, list);
  }

  const stats: MetaStats[] = [];

  for (const [characterId, entries] of byCharacter) {
    const scores = entries.map((e) => e.score);
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;

    const variance =
      scores.length < 2
        ? 0
        : scores.reduce((sum, score) => sum + (score - average) ** 2, 0) /
          (scores.length - 1);

    stats.push({
      characterId,
      pickRate: teamCount === 0 ? 0 : entries.length / teamCount,
      average: Number(average.toFixed(1)),
      median: median(scores),
      variance: Number(variance.toFixed(1)),
      winRate: entries.filter((e) => e.won).length / entries.length,
      picks: entries.length,
    });
  }

  return stats.sort((a, b) => b.pickRate - a.pickRate);
}

/**
 * Seuils de lecture de la méta, volontairement explicites.
 *
 * C'est ici que vit la protection contre le « personnage parfait » (§14) :
 * elle observe plusieurs semaines. Sur un seul chapitre, qu'un personnage
 * très présent soit aussi le meilleur score est normal — la domination ne
 * devient un problème que si elle dure.
 */
export const DOMINANT_PICK_RATE = 0.6;
export const DOMINANT_WIN_RATE = 0.6;
export const UNDERRATED_PICK_RATE = 0.1;

export type MetaFlag = 'DOMINANT' | 'HIGH_VARIANCE' | 'UNDERRATED';

export interface FlaggedCharacter {
  characterId: string;
  flag: MetaFlag;
  reason: string;
}

/**
 * Signale les personnages qui méritent un coup d'œil.
 *
 * Un personnage peut porter plusieurs signalements : dominant et à forte
 * variance ne s'excluent pas.
 */
export function flagMeta(stats: MetaStats[]): FlaggedCharacter[] {
  const flags: FlaggedCharacter[] = [];

  for (const entry of stats) {
    if (
      entry.pickRate >= DOMINANT_PICK_RATE &&
      entry.winRate >= DOMINANT_WIN_RATE
    ) {
      flags.push({
        characterId: entry.characterId,
        flag: 'DOMINANT',
        reason: `Choisi par ${Math.round(entry.pickRate * 100)} % des équipes et gagnant dans ${Math.round(entry.winRate * 100)} % des cas.`,
      });
    }

    // Moyenne élevée mais médiane basse : le personnage « tout ou rien » que
    // le cahier veut distinguer d'un choix fiable.
    if (entry.picks >= 5 && entry.average > entry.median * 1.5) {
      flags.push({
        characterId: entry.characterId,
        flag: 'HIGH_VARIANCE',
        reason: `Moyenne ${entry.average} pour une médiane de ${entry.median} : résultats très irréguliers.`,
      });
    }

    if (
      entry.pickRate <= UNDERRATED_PICK_RATE &&
      entry.winRate >= DOMINANT_WIN_RATE
    ) {
      flags.push({
        characterId: entry.characterId,
        flag: 'UNDERRATED',
        reason: `Rarement choisi (${Math.round(entry.pickRate * 100)} %) mais souvent gagnant : stratégie sous-évaluée.`,
      });
    }
  }

  return flags;
}
