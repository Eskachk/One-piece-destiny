import type { Character, ChapterAppearance } from '../types';
import { getScoringEngine } from '../scoring';
import type { CharacterScore } from '../scoring/v1';

/**
 * Chapter Simulator (cahier §80).
 *
 * Avant publication, l'administrateur doit pouvoir répondre à : quels
 * personnages rapportent le plus cette semaine, quelle est la meilleure
 * composition possible, y a-t-il un jackpot ou un piège, une synergie
 * est-elle devenue trop rentable.
 *
 * Le but n'est pas de prédire les joueurs mais de **repérer un déséquilibre
 * avant qu'il ne soit figé dans un classement** (§77, §79).
 */

export interface SimulationInput {
  appearances: ChapterAppearance[];
  roster: Character[];
  scoringVersion: string;
  /** Taux de sélection observés, s'ils sont déjà connus. */
  pickRates?: Map<string, number>;
}

export interface SimulatedCharacter {
  characterId: string;
  score: CharacterScore;
}

export interface SimulationResult {
  /** Score de chaque personnage, du meilleur au moins bon. */
  characters: SimulatedCharacter[];
  /** Meilleure équipe possible et son total. */
  bestTeam: { characterIds: string[]; total: number };
  /** Score maximal théorique d'une équipe. */
  maxTeamScore: number;
  /**
   * Jackpot : le meilleur rendement parmi les personnages qu'on n'attendait
   * pas. C'est la bonne surprise du chapitre.
   */
  jackpot: SimulatedCharacter | null;
  /**
   * Piège : un personnage très attendu qui ne rapporte rien. C'est ce qui
   * fera le plus de déçus.
   */
  trap: SimulatedCharacter | null;
  /** Part moyenne de synergie dans les scores non nuls. */
  averageSynergyShare: number;
}

/**
 * Score de chaque personnage du référentiel comme s'il était sélectionné.
 *
 * On évalue chaque personnage seul : la synergie dépend de qui apparaît dans
 * le chapitre, pas de qui l'accompagne dans l'équipe, donc le score
 * individuel est stable.
 */
function scoreEveryCharacter(input: SimulationInput): SimulatedCharacter[] {
  const engine = getScoringEngine(input.scoringVersion);
  const roster = new Map(input.roster.map((c) => [c.id, c]));

  return input.roster
    .map((character) => ({
      characterId: character.id,
      score: engine.scoreTeam({
        appearances: input.appearances,
        picked: [character],
        roster,
        pickRates: input.pickRates,
      }).characters[0],
    }))
    .sort((a, b) => b.score.total - a.score.total);
}

export function simulateChapter(input: SimulationInput): SimulationResult {
  const characters = scoreEveryCharacter(input);

  // La meilleure équipe est simplement le trio de tête : les scores
  // individuels ne dépendent pas des coéquipiers.
  const top3 = characters.slice(0, 3);
  const maxTeamScore = top3.reduce((sum, c) => sum + c.score.total, 0);

  const jackpot =
    characters.find(
      (c) =>
        c.score.total > 0 &&
        input.roster.find((r) => r.id === c.characterId)?.presenceExpectation ===
          'LOW',
    ) ?? null;

  // Piège : attendu comme très présent, et pourtant à zéro.
  const trap =
    characters
      .filter(
        (c) =>
          c.score.total === 0 &&
          input.roster.find((r) => r.id === c.characterId)
            ?.presenceExpectation === 'HIGH',
      )
      .at(0) ?? null;

  const scoring = characters.filter((c) => c.score.total > 0);
  const averageSynergyShare =
    scoring.length === 0
      ? 0
      : scoring.reduce((sum, c) => sum + c.score.synergy / c.score.total, 0) /
        scoring.length;

  return {
    characters,
    bestTeam: {
      characterIds: top3.map((c) => c.characterId),
      total: maxTeamScore,
    },
    maxTeamScore,
    jackpot,
    trap,
    averageSynergyShare,
  };
}
