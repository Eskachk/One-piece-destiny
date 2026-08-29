import type { Rarity } from '../types';
import { rarityRank } from '../collection/rarity';

/**
 * Missions (cahier §73).
 *
 * Le cahier est explicite sur l'intention : donner des objectifs
 * supplémentaires **sans rendre le jeu artificiellement frustrant**. D'où
 * trois règles que ce module s'impose :
 *
 *   1. aucune mission n'exige de gagner — seulement de jouer, d'oser ou de
 *      collectionner. Un joueur moyen doit pouvoir toutes les accomplir ;
 *   2. les récompenses sont en Berries et en coffres, jamais en points de
 *      score (§48, §72) ;
 *   3. rien n'expire brutalement : une mission non accomplie reste ouverte.
 */

export type MissionId =
  | 'PLAY_STREAK'
  | 'USE_RARE_CHARACTER'
  | 'TAKE_A_RISK'
  | 'REACH_PERCENTILE'
  | 'COMPLETE_A_SET'
  | 'CRAFT_A_CHARACTER';

export interface Mission {
  id: MissionId;
  title: string;
  description: string;
  /** Objectif chiffré. */
  target: number;
  rewardBerries: number;
  rewardChests: number;
}

export const MISSIONS: Mission[] = [
  {
    id: 'PLAY_STREAK',
    title: 'Capitaine assidu',
    description: 'Verrouille un équipage 4 semaines de suite.',
    target: 4,
    rewardBerries: 600,
    rewardChests: 1,
  },
  {
    id: 'USE_RARE_CHARACTER',
    title: 'Pièce de collection',
    description: 'Aligne un personnage Épique ou mieux.',
    target: 1,
    rewardBerries: 250,
    rewardChests: 0,
  },
  {
    id: 'TAKE_A_RISK',
    title: 'Cap sur l’inconnu',
    description: 'Verrouille un équipage au risque supérieur à 60.',
    target: 1,
    rewardBerries: 400,
    rewardChests: 0,
  },
  {
    id: 'REACH_PERCENTILE',
    title: 'Dans le haut du panier',
    description: 'Termine une semaine dans le top 25 %.',
    target: 1,
    rewardBerries: 500,
    rewardChests: 0,
  },
  {
    id: 'COMPLETE_A_SET',
    title: 'Équipage au complet',
    description: 'Complète un set de collection.',
    target: 1,
    rewardBerries: 800,
    rewardChests: 1,
  },
  {
    id: 'CRAFT_A_CHARACTER',
    title: 'Forgeron',
    description: 'Fabrique un personnage avec des fragments.',
    target: 1,
    rewardBerries: 300,
    rewardChests: 0,
  },
];

export const MISSION_INDEX = new Map(MISSIONS.map((m) => [m.id, m]));

/** Rareté à partir de laquelle « Pièce de collection » est validée. */
const RARE_THRESHOLD: Rarity = 'EPIC';

export interface MissionInput {
  /** Semaines consécutives avec un équipage verrouillé. */
  playStreak: number;
  /** Meilleure rareté alignée, toutes semaines confondues. */
  bestRarityPlayed: Rarity | null;
  /** Risque le plus élevé jamais verrouillé, 0–100. */
  highestRisk: number;
  /** Meilleur percentile obtenu (1 = meilleur). */
  bestPercentile: number | null;
  /** Nombre de sets complétés. */
  completedSets: number;
  /** Nombre de personnages fabriqués. */
  craftedCharacters: number;
}

export interface MissionProgress {
  mission: Mission;
  /** Avancement courant, borné à `target`. */
  current: number;
  complete: boolean;
}

/**
 * Évalue toutes les missions à partir de l'état du joueur.
 *
 * Fonction pure : le même état donne toujours le même avancement, ce qui rend
 * l'attribution des récompenses rejouable sans surprise.
 */
export function evaluateMissions(input: MissionInput): MissionProgress[] {
  const raw: Record<MissionId, number> = {
    PLAY_STREAK: input.playStreak,
    USE_RARE_CHARACTER:
      input.bestRarityPlayed &&
      rarityRank(input.bestRarityPlayed) >= rarityRank(RARE_THRESHOLD)
        ? 1
        : 0,
    TAKE_A_RISK: input.highestRisk > 60 ? 1 : 0,
    // Le percentile est meilleur quand il est petit : 25 % ou moins valide.
    REACH_PERCENTILE:
      input.bestPercentile !== null && input.bestPercentile <= 25 ? 1 : 0,
    COMPLETE_A_SET: input.completedSets,
    CRAFT_A_CHARACTER: input.craftedCharacters,
  };

  return MISSIONS.map((mission) => {
    const current = Math.min(raw[mission.id], mission.target);
    return { mission, current, complete: current >= mission.target };
  });
}

/**
 * Récompenses à verser pour les missions nouvellement accomplies.
 *
 * `alreadyClaimed` évite de payer deux fois : c'est l'appelant qui tient la
 * liste, ce module ne décide que du montant.
 */
export function pendingRewards(
  progress: MissionProgress[],
  alreadyClaimed: ReadonlySet<MissionId>,
): { missionIds: MissionId[]; berries: number; chests: number } {
  const earned = progress.filter(
    (entry) => entry.complete && !alreadyClaimed.has(entry.mission.id),
  );

  return {
    missionIds: earned.map((entry) => entry.mission.id),
    berries: earned.reduce((sum, e) => sum + e.mission.rewardBerries, 0),
    chests: earned.reduce((sum, e) => sum + e.mission.rewardChests, 0),
  };
}
