import { describe, expect, it } from 'vitest';
import {
  evaluateMissions,
  MISSIONS,
  pendingRewards,
  type MissionId,
  type MissionInput,
} from './missions';

const empty: MissionInput = {
  playStreak: 0,
  bestRarityPlayed: null,
  highestRisk: 0,
  bestPercentile: null,
  completedSets: 0,
  craftedCharacters: 0,
};

const progressFor = (overrides: Partial<MissionInput> = {}) =>
  evaluateMissions({ ...empty, ...overrides });

const find = (progress: ReturnType<typeof evaluateMissions>, id: MissionId) =>
  progress.find((entry) => entry.mission.id === id)!;

describe('catalogue de missions (§73)', () => {
  it("n'exige jamais de gagner, seulement de jouer, oser ou collectionner", () => {
    // Aucune mission ne doit demander une victoire : le §73 met en garde
    // contre la frustration artificielle.
    const titles = MISSIONS.map((m) => m.description.toLowerCase()).join(' ');
    expect(titles).not.toContain('gagne');
    expect(titles).not.toContain('premier');
  });

  it('ne récompense qu\'en Berries et en coffres', () => {
    for (const mission of MISSIONS) {
      expect(mission.rewardBerries).toBeGreaterThanOrEqual(0);
      expect(mission.rewardChests).toBeGreaterThanOrEqual(0);
      // Aucun champ de bonus de score : la monnaie n'achète pas la victoire.
      expect(Object.keys(mission)).not.toContain('rewardScore');
    }
  });

  it('a des objectifs atteignables', () => {
    for (const mission of MISSIONS) {
      expect(mission.target).toBeGreaterThan(0);
      expect(mission.target).toBeLessThanOrEqual(10);
    }
  });
});

describe('evaluateMissions', () => {
  it('part à zéro pour un nouveau joueur', () => {
    const progress = progressFor();
    expect(progress.every((entry) => !entry.complete)).toBe(true);
  });

  it('suit la série de semaines jouées', () => {
    expect(find(progressFor({ playStreak: 2 }), 'PLAY_STREAK').current).toBe(2);
    expect(find(progressFor({ playStreak: 4 }), 'PLAY_STREAK').complete).toBe(true);
  });

  it('borne l\'avancement à l\'objectif', () => {
    expect(find(progressFor({ playStreak: 99 }), 'PLAY_STREAK').current).toBe(4);
  });

  it('valide « pièce de collection » dès un Épique', () => {
    expect(
      find(progressFor({ bestRarityPlayed: 'RARE' }), 'USE_RARE_CHARACTER')
        .complete,
    ).toBe(false);
    expect(
      find(progressFor({ bestRarityPlayed: 'EPIC' }), 'USE_RARE_CHARACTER')
        .complete,
    ).toBe(true);
    expect(
      find(progressFor({ bestRarityPlayed: 'MYTHIC' }), 'USE_RARE_CHARACTER')
        .complete,
    ).toBe(true);
  });

  it('valide la prise de risque au-delà de 60', () => {
    expect(find(progressFor({ highestRisk: 60 }), 'TAKE_A_RISK').complete).toBe(
      false,
    );
    expect(find(progressFor({ highestRisk: 61 }), 'TAKE_A_RISK').complete).toBe(
      true,
    );
  });

  it('valide le percentile quand il est petit', () => {
    // Un percentile bas est un bon classement : 10 % vaut mieux que 40 %.
    expect(
      find(progressFor({ bestPercentile: 10 }), 'REACH_PERCENTILE').complete,
    ).toBe(true);
    expect(
      find(progressFor({ bestPercentile: 40 }), 'REACH_PERCENTILE').complete,
    ).toBe(false);
  });

  it('ignore un percentile absent', () => {
    expect(
      find(progressFor({ bestPercentile: null }), 'REACH_PERCENTILE').complete,
    ).toBe(false);
  });

  it('suit sets complétés et fabrications', () => {
    expect(
      find(progressFor({ completedSets: 1 }), 'COMPLETE_A_SET').complete,
    ).toBe(true);
    expect(
      find(progressFor({ craftedCharacters: 1 }), 'CRAFT_A_CHARACTER').complete,
    ).toBe(true);
  });
});

describe('pendingRewards', () => {
  const allDone = progressFor({
    playStreak: 4,
    bestRarityPlayed: 'LEGENDARY',
    highestRisk: 80,
    bestPercentile: 5,
    completedSets: 1,
    craftedCharacters: 1,
  });

  it('cumule les récompenses des missions accomplies', () => {
    const rewards = pendingRewards(allDone, new Set());
    expect(rewards.missionIds).toHaveLength(MISSIONS.length);
    expect(rewards.berries).toBe(
      MISSIONS.reduce((sum, m) => sum + m.rewardBerries, 0),
    );
  });

  it('ne paie pas deux fois une mission déjà réclamée', () => {
    const claimed = new Set<MissionId>(['PLAY_STREAK', 'TAKE_A_RISK']);
    const rewards = pendingRewards(allDone, claimed);
    expect(rewards.missionIds).not.toContain('PLAY_STREAK');
    expect(rewards.missionIds).not.toContain('TAKE_A_RISK');
  });

  it('ne verse rien quand tout est déjà réclamé', () => {
    const claimed = new Set<MissionId>(MISSIONS.map((m) => m.id));
    expect(pendingRewards(allDone, claimed)).toEqual({
      missionIds: [],
      berries: 0,
      chests: 0,
    });
  });

  it('ignore les missions non accomplies', () => {
    expect(pendingRewards(progressFor(), new Set()).berries).toBe(0);
  });
});
