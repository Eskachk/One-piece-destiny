import { describe, expect, it } from 'vitest';
import {
  CRAFT_COST,
  DUPLICATES_PER_CRAFT,
  evaluateCraft,
} from './crafting';
import { DUPLICATE_SHARDS } from './rarity';
import {
  PARTICIPATION_BERRIES,
  PARTICIPATION_CHESTS,
  weeklyReward,
  berriesForRank,
} from './rewards';

describe('coût de fabrication (§29)', () => {
  it('vaut le rendement de six doublons', () => {
    for (const rarity of ['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'] as const) {
      expect(CRAFT_COST[rarity]).toBe(
        DUPLICATE_SHARDS[rarity] * DUPLICATES_PER_CRAFT,
      );
    }
  });

  it('croît avec la rareté', () => {
    expect(CRAFT_COST.COMMON).toBeLessThan(CRAFT_COST.RARE);
    expect(CRAFT_COST.RARE).toBeLessThan(CRAFT_COST.EPIC);
    expect(CRAFT_COST.EPIC).toBeLessThan(CRAFT_COST.LEGENDARY);
    expect(CRAFT_COST.LEGENDARY).toBeLessThan(CRAFT_COST.MYTHIC);
  });
});

describe('evaluateCraft', () => {
  it('autorise la fabrication au coût exact', () => {
    const decision = evaluateCraft({
      rarity: 'RARE',
      owned: false,
      shards: CRAFT_COST.RARE,
    });
    expect(decision).toEqual({
      allowed: true,
      cost: CRAFT_COST.RARE,
      remainingShards: 0,
    });
  });

  it('conserve le surplus de fragments', () => {
    const decision = evaluateCraft({
      rarity: 'COMMON',
      owned: false,
      shards: CRAFT_COST.COMMON + 25,
    });
    expect(decision).toMatchObject({ allowed: true, remainingShards: 25 });
  });

  it('refuse un fragment de moins et chiffre le manque', () => {
    const decision = evaluateCraft({
      rarity: 'EPIC',
      owned: false,
      shards: CRAFT_COST.EPIC - 1,
    });
    expect(decision).toEqual({
      allowed: false,
      reason: 'NOT_ENOUGH_SHARDS',
      cost: CRAFT_COST.EPIC,
      missing: 1,
    });
  });

  it('refuse de fabriquer un personnage déjà possédé', () => {
    const decision = evaluateCraft({
      rarity: 'LEGENDARY',
      owned: true,
      shards: 999_999,
    });
    expect(decision).toMatchObject({ allowed: false, reason: 'ALREADY_OWNED' });
  });

  it('refuse un personnage hors référentiel', () => {
    const decision = evaluateCraft({ rarity: null, owned: false, shards: 10_000 });
    expect(decision).toMatchObject({
      allowed: false,
      reason: 'UNKNOWN_CHARACTER',
    });
  });
});

describe('récompenses hebdomadaires (§72)', () => {
  it("ne donne rien à qui n'a pas joué", () => {
    expect(weeklyReward({ participated: false, rank: 1 })).toEqual({
      berries: 0,
      chests: 0,
      tiers: [],
    });
  });

  it('accorde un coffre à tout participant, même dernier', () => {
    const reward = weeklyReward({ participated: true, rank: 5_000 });
    expect(reward.chests).toBe(PARTICIPATION_CHESTS);
    expect(reward.berries).toBe(PARTICIPATION_BERRIES);
  });

  it('accorde un coffre même sans classement', () => {
    const reward = weeklyReward({ participated: true, rank: null });
    expect(reward.chests).toBe(PARTICIPATION_CHESTS);
    expect(reward.berries).toBe(PARTICIPATION_BERRIES);
  });

  it('récompense le podium par des montants distincts', () => {
    /*
     * Le défaut du barème au percentile, sur une communauté réelle. Le rang 1
     * parmi douze joueurs vaut un percentile d'environ huit : le palier
     * « top 1 % » était mathématiquement inatteignable, et le vainqueur
     * touchait exactement la même chose que le troisième. Le classement
     * existait sans jamais récompenser le fait de le gagner.
     */
    const [premier, deuxieme, troisieme] = [1, 2, 3].map((rank) =>
      weeklyReward({ participated: true, rank }).berries,
    );

    expect(premier).toBeGreaterThan(deuxieme);
    expect(deuxieme).toBeGreaterThan(troisieme);
    expect(troisieme).toBeGreaterThan(berriesForRank(4));
  });

  it('décroît sans jamais remonter, palier après palier', () => {
    const rangs = [1, 2, 3, 4, 10, 11, 30, 31, 100, 101, 1_000];
    const gains = rangs.map(berriesForRank);
    for (let i = 1; i < gains.length; i += 1) {
      expect(gains[i], `rang ${rangs[i]}`).toBeLessThanOrEqual(gains[i - 1]);
    }
  });

  it("n'accorde qu'un seul palier par joueur", () => {
    // L'ancien barème empilait « Participation + Top 1% + Top 10% + Top 50% ».
    // Un seul palier se lit d'un coup d'œil, et se promet avant la publication.
    expect(weeklyReward({ participated: true, rank: 1 }).tiers).toEqual(['1er']);
    expect(weeklyReward({ participated: true, rank: 7 }).tiers).toEqual(['Top 10']);
    expect(weeklyReward({ participated: true, rank: 900 }).tiers).toEqual(['Participation']);
  });

  it('garde le vainqueur à portée du participant régulier', () => {
    // Les Berries accélèrent la collection, elles n'y donnent pas accès : tout
    // participant reçoit déjà un coffre. Un écart de vingt-cinq fois entre le
    // premier et le dernier resterait supportable ; au-delà, jouer sans gagner
    // n'aurait plus de sens.
    expect(berriesForRank(1)).toBeLessThanOrEqual(PARTICIPATION_BERRIES * 25);
  });

  it('donne le même nombre de coffres à tous les participants', () => {
    const chests = [1, 3, 10, 50, 500].map(
      (rank) => weeklyReward({ participated: true, rank }).chests,
    );
    expect(new Set(chests).size).toBe(1);
  });
});
