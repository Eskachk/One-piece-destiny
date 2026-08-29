/**
 * Calcul des résultats d'un chapitre (cahier §75).
 *
 * Le classement n'est jamais recalculé à la consultation : un worker calcule
 * une fois, stocke, et le joueur lit un résultat déjà prêt.
 *
 * Fonction pure — elle ne touche ni la base ni le réseau, ce qui la rend
 * testable et réutilisable par un worker hors du serveur web.
 */

import type {
  Character,
  ChapterAppearance,
  LockedTeam,
} from '../types';
import { getScoringEngine } from './index';
import type { TeamScore } from './v1';

export interface ChapterResult {
  playerId: string;
  score: TeamScore;
}

/**
 * Taux de sélection par personnage (cahier §13).
 * Alimente à la fois le bonus de risque et la surveillance de la méta.
 */
export function computePickRates(teams: LockedTeam[]): Map<string, number> {
  const rates = new Map<string, number>();
  if (teams.length === 0) return rates;

  const counts = new Map<string, number>();
  for (const team of teams) {
    // Une équipe ne compte qu'une fois par personnage.
    for (const id of new Set(team.characterIds)) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }

  for (const [id, count] of counts) {
    rates.set(id, count / teams.length);
  }
  return rates;
}

export interface ComputeInput {
  teams: LockedTeam[];
  appearances: ChapterAppearance[];
  roster: Map<string, Character>;
  /** Version figée du chapitre — jamais « la dernière » (cahier §78). */
  scoringVersion: string;
}

/**
 * Calcule le score de chaque équipe d'un chapitre, trié du meilleur au moins
 * bon. Les équipes citant un personnage absent du référentiel sont ignorées
 * plutôt que scorées à tort.
 */
export function computeChapterResults(input: ComputeInput): ChapterResult[] {
  const engine = getScoringEngine(input.scoringVersion);
  const pickRates = computePickRates(input.teams);

  const results: ChapterResult[] = [];

  for (const team of input.teams) {
    const picked = team.characterIds
      .map((id) => input.roster.get(id))
      .filter((c): c is Character => c !== undefined);

    if (picked.length !== team.characterIds.length) {
      // Donnée incohérente : on ne devine pas, on laisse l'anomalie visible.
      continue;
    }

    results.push({
      playerId: team.userId,
      score: engine.scoreTeam({
        appearances: input.appearances,
        picked,
        roster: input.roster,
        pickRates,
      }),
    });
  }

  return results.sort((a, b) => b.score.total - a.score.total);
}

/**
 * Percentile à partir d'un rang déjà connu (cahier §17).
 * `rank` commence à 1. Retourne par exemple 4.7 pour « TOP 4.7% ».
 */
export function percentileFromRank(rank: number, total: number): number | null {
  if (total <= 0 || rank < 1 || rank > total) return null;
  return Number(((rank / total) * 100).toFixed(1));
}

/**
 * Percentile d'un joueur, plus parlant qu'un rang absolu (cahier §17).
 * Retourne par exemple 4.7 pour « TOP 4.7% ».
 */
export function percentileOf(
  results: ChapterResult[],
  playerId: string,
): number | null {
  const index = results.findIndex((r) => r.playerId === playerId);
  if (index === -1 || results.length === 0) return null;
  return Number((((index + 1) / results.length) * 100).toFixed(1));
}
