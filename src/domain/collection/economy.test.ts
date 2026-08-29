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
  it('ne donne rien à qui n\'a pas joué', () => {
    expect(weeklyReward({ participated: false, percentile: 1 })).toEqual({
      berries: 0,
      chests: 0,
      tiers: [],
    });
  });

  it('accorde un coffre à tout participant, même dernier', () => {
    const reward = weeklyReward({ participated: true, percentile: 100 });
    expect(reward.chests).toBe(PARTICIPATION_CHESTS);
    expect(reward.berries).toBe(PARTICIPATION_BERRIES);
  });

  it('accorde un coffre même sans classement', () => {
    const reward = weeklyReward({ participated: true, percentile: null });
    expect(reward.chests).toBe(PARTICIPATION_CHESTS);
  });

  it('cumule les paliers vers le haut', () => {
    const top1 = weeklyReward({ participated: true, percentile: 0.5 });
    expect(top1.tiers).toEqual(['Participation', 'Top 1%', 'Top 10%', 'Top 50%']);
    expect(top1.berries).toBe(PARTICIPATION_BERRIES + 800 + 300 + 100);
  });

  it('classe le meilleur au-dessus du médian, sans écart abyssal', () => {
    const best = weeklyReward({ participated: true, percentile: 1 });
    const median = weeklyReward({ participated: true, percentile: 50 });
    const last = weeklyReward({ participated: true, percentile: 100 });

    expect(best.berries).toBeGreaterThan(median.berries);
    expect(median.berries).toBeGreaterThan(last.berries);
    // Le meilleur ne doit pas décrocher au point de rendre le jeu inatteignable.
    expect(best.berries).toBeLessThanOrEqual(last.berries * 10);
  });

  it('donne le même nombre de coffres à tous les participants', () => {
    const percentiles = [1, 25, 50, 75, 100];
    const chests = percentiles.map(
      (percentile) => weeklyReward({ participated: true, percentile }).chests,
    );
    expect(new Set(chests).size).toBe(1);
  });
});
