/**
 * Analyse post-chapitre (cahier §64) et classements spécialisés (§18).
 *
 * Ce contenu n'est calculé et exposé qu'après publication : il révèle
 * directement les performances, donc il tombe sous l'anti-spoiler du §3.
 *
 * Objectif du §18 : plusieurs façons d'être reconnu. Un joueur qui ne gagnera
 * jamais le classement général peut signer le plus beau pari de la semaine.
 */

import type { Character } from '../types';
import type { ChapterResult } from './chapter-results';

export interface ChapterAnalysis {
  mostPicked: { characterId: string; pickRate: number } | null;
  bestPerformer: { characterId: string; points: number } | null;
  /** Peu choisi mais très rentable : la bonne surprise. */
  biggestSurprise: { characterId: string; points: number; pickRate: number } | null;
  /** Très choisi et décevant : le piège de la semaine. */
  biggestTrap: { characterId: string; points: number; pickRate: number } | null;
  averageScore: number;
  medianScore: number;
}

const SURPRISE_MAX_PICK_RATE = 0.25;
const TRAP_MIN_PICK_RATE = 0.4;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

/**
 * Points moyens rapportés par chaque personnage, tous joueurs confondus.
 * Un personnage rapporte le même score à tout le monde ; on déduplique donc
 * par personnage plutôt que de moyenner sur les équipes.
 */
function pointsByCharacter(results: ChapterResult[]): Map<string, number> {
  const points = new Map<string, number>();
  for (const result of results) {
    for (const score of result.score.characters) {
      points.set(score.characterId, score.total);
    }
  }
  return points;
}

export function analyseChapter(
  results: ChapterResult[],
  pickRates: Map<string, number>,
): ChapterAnalysis {
  const totals = results.map((r) => r.score.total);
  const points = pointsByCharacter(results);

  const mostPicked = [...pickRates.entries()].sort((a, b) => b[1] - a[1])[0];
  const bestPerformer = [...points.entries()].sort((a, b) => b[1] - a[1])[0];

  // Surprise : rentable alors que peu de monde l'avait vu venir.
  const surprise = [...points.entries()]
    .filter(([id, value]) => value > 0 && (pickRates.get(id) ?? 0) <= SURPRISE_MAX_PICK_RATE)
    .sort((a, b) => b[1] - a[1])[0];

  // Piège : largement choisi, et qui n'a rien rapporté.
  const trap = [...pickRates.entries()]
    .filter(([id, rate]) => rate >= TRAP_MIN_PICK_RATE)
    .map(([id, rate]) => ({ id, rate, points: points.get(id) ?? 0 }))
    .sort((a, b) => a.points - b.points)[0];

  return {
    mostPicked: mostPicked
      ? { characterId: mostPicked[0], pickRate: mostPicked[1] }
      : null,
    bestPerformer: bestPerformer
      ? { characterId: bestPerformer[0], points: bestPerformer[1] }
      : null,
    biggestSurprise: surprise
      ? {
          characterId: surprise[0],
          points: surprise[1],
          pickRate: pickRates.get(surprise[0]) ?? 0,
        }
      : null,
    biggestTrap: trap
      ? { characterId: trap.id, points: trap.points, pickRate: trap.rate }
      : null,
    averageScore:
      totals.length === 0
        ? 0
        : Number((totals.reduce((a, b) => a + b, 0) / totals.length).toFixed(1)),
    medianScore: median(totals),
  };
}

// ---------------------------------------------------------------------------
// Classements spécialisés (cahier §18)
// ---------------------------------------------------------------------------

export type SpecialAward =
  | 'BEST_PREDICTION'
  | 'BEST_UPSET'
  | 'HIGHEST_RISK'
  | 'BEST_SYNERGY';

export const AWARD_LABEL: Record<SpecialAward, string> = {
  BEST_PREDICTION: 'Meilleure prédiction',
  BEST_UPSET: 'Plus beau pari',
  HIGHEST_RISK: 'Risque maximal',
  BEST_SYNERGY: 'Meilleure synergie',
};

export interface AwardWinner {
  award: SpecialAward;
  playerId: string;
  value: number;
}

/**
 * Désigne les lauréats de la semaine.
 *
 * Chaque distinction lit une dimension différente du score, de sorte qu'un
 * même joueur ne les rafle pas mécaniquement toutes.
 */
export function specialAwards(results: ChapterResult[]): AwardWinner[] {
  if (results.length === 0) return [];

  const sumOf = (
    result: ChapterResult,
    key: 'base' | 'synergy' | 'risk',
  ): number => result.score.characters.reduce((sum, c) => sum + c[key], 0);

  const best = (
    award: SpecialAward,
    score: (result: ChapterResult) => number,
  ): AwardWinner | null => {
    const ranked = [...results].sort((a, b) => score(b) - score(a));
    const winner = ranked[0];
    const value = score(winner);
    // Une distinction à zéro ne récompense rien : mieux vaut ne pas la
    // décerner que de sacrer quelqu'un par défaut.
    return value > 0 ? { award, playerId: winner.playerId, value } : null;
  };

  return [
    best('BEST_PREDICTION', (r) => r.score.total),
    best('BEST_SYNERGY', (r) => sumOf(r, 'synergy')),
    best('HIGHEST_RISK', (r) => sumOf(r, 'risk')),
    // Le pari : beaucoup de risque converti en points, peu de présence brute.
    best('BEST_UPSET', (r) => sumOf(r, 'risk') * 2 - sumOf(r, 'base') / 2),
  ].filter((winner): winner is AwardWinner => winner !== null);
}

/** Part du score venant de la synergie, pour la détection de style (§16). */
export function synergyShare(result: ChapterResult): number {
  const total = result.score.total;
  if (total === 0) return 0;
  const synergy = result.score.characters.reduce((sum, c) => sum + c.synergy, 0);
  return synergy / total;
}

/** Taux de sélection moyen d'une équipe, pour la détection de style (§16). */
export function averagePickRate(
  characterIds: string[],
  pickRates: Map<string, number>,
): number {
  if (characterIds.length === 0) return 0;
  const sum = characterIds.reduce((acc, id) => acc + (pickRates.get(id) ?? 0), 0);
  return sum / characterIds.length;
}

export type { Character };
