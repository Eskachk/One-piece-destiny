import { describe, expect, it } from 'vitest';
import {
  bestRarity,
  ceremonyPlan,
  reducedMotionPlan,
} from './chest-ceremony';
import type { ChestCard } from './chest';
import type { Rarity } from '../types';

const card = (rarity: Rarity): ChestCard => ({
  characterId: `x-${rarity}`,
  rarity,
  duplicate: false,
  shards: 0,
});

describe('bestRarity', () => {
  it('retient la rareté la plus élevée du coffre', () => {
    expect(bestRarity([card('COMMON'), card('LEGENDARY'), card('RARE')])).toBe(
      'LEGENDARY',
    );
  });

  it('retombe sur Commun pour un coffre vide', () => {
    expect(bestRarity([])).toBe('COMMON');
  });
});

describe('ceremonyPlan (§56)', () => {
  it('reste sobre pour un coffre ordinaire', () => {
    const plan = ceremonyPlan([card('COMMON'), card('RARE'), card('EPIC')]);
    expect(plan.tier).toBe('STANDARD');
    expect(plan.particles).toBe(0);
  });

  it('passe en version premium dès un légendaire', () => {
    const plan = ceremonyPlan([card('COMMON'), card('LEGENDARY')]);
    expect(plan.tier).toBe('PREMIUM');
    expect(plan.particles).toBeGreaterThan(0);
  });

  it('traite le mythique comme premium', () => {
    expect(ceremonyPlan([card('MYTHIC')]).tier).toBe('PREMIUM');
  });

  it('allonge le silence avant une grosse récompense (§61)', () => {
    const ordinary = ceremonyPlan([card('EPIC')]);
    const premium = ceremonyPlan([card('LEGENDARY')]);
    expect(premium.suspenseSeconds).toBeGreaterThan(ordinary.suspenseSeconds);
  });

  it('garde une cérémonie courte, même premium', () => {
    // §60 : les animations longues sont l'exception, pas la norme.
    expect(ceremonyPlan([card('MYTHIC')]).totalSeconds).toBeLessThan(4);
  });
});

describe('reducedMotionPlan (§111)', () => {
  const cards = [card('LEGENDARY')];

  it('supprime tremblement, particules et attente', () => {
    const plan = reducedMotionPlan(cards);
    expect(plan.shakeSeconds).toBe(0);
    expect(plan.particles).toBe(0);
    expect(plan.suspenseSeconds).toBe(0);
  });

  it('conserve la rareté mise en avant : la révélation reste due', () => {
    expect(reducedMotionPlan(cards).highlight).toBe('LEGENDARY');
  });

  it('reste quasi instantané', () => {
    expect(reducedMotionPlan(cards).totalSeconds).toBeLessThanOrEqual(0.25);
  });
});
