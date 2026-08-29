import { describe, expect, it } from 'vitest';
import {
  bestRarity,
  ceremonyPlan,
  hakiColorAt,
  reducedMotionPlan,
} from './chest-ceremony';
import type { ChestCard } from './chest';
import type { Rarity } from '../types';
import { RARITY_COLOR } from './rarity';

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
  it('reste plus sobre pour un coffre ordinaire', () => {
    // §56 demande que le légendaire se distingue, pas que le coffre ordinaire
    // soit inerte : une cérémonie sans aucune particule se lisait comme une
    // animation ratée plutôt que comme une récompense modeste. L'invariant
    // utile est donc l'**écart** entre les deux, pas un zéro absolu.
    const ordinary = ceremonyPlan([card('COMMON'), card('RARE'), card('EPIC')]);
    const premium = ceremonyPlan([card('LEGENDARY')]);

    expect(ordinary.tier).toBe('STANDARD');
    expect(ordinary.particles * 3).toBeLessThan(premium.particles);
    expect(ordinary.shakeSeconds).toBeLessThan(premium.shakeSeconds);
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

  it('garde une cérémonie bornée, même premium', () => {
    // §60 : les animations longues sont l'exception, pas la norme. Le coffre
    // est justement cette exception — mais elle reste plafonnée, sinon
    // l'attente cesse d'être une promesse pour devenir une corvée.
    expect(ceremonyPlan([card('MYTHIC')]).totalSeconds).toBeLessThan(7);
  });

  it('révèle les cartes une par une, jamais en bloc (§61)', () => {
    expect(
      ceremonyPlan([card('COMMON'), card('RARE')]).cardIntervalSeconds,
    ).toBeGreaterThan(0);
  });

  it('fait monter les éclairs davantage sur un coffre premium', () => {
    expect(ceremonyPlan([card('LEGENDARY')]).bolts).toBeGreaterThan(
      ceremonyPlan([card('EPIC')]).bolts,
    );
  });
});

describe('éclairs de Haki', () => {
  it('termine sur la couleur de la meilleure carte du coffre', () => {
    // C'est ce qui rend l'attente tenable : la dernière couleur annonce la
    // récompense juste avant qu'elle apparaisse.
    const plan = ceremonyPlan([card('COMMON'), card('MYTHIC')]);
    expect(plan.hakiColors.at(-1)).toBe(RARITY_COLOR.MYTHIC);
  });

  it('change de couleur au fil de la charge', () => {
    const plan = ceremonyPlan([card('LEGENDARY')]);
    expect(hakiColorAt(plan, 0)).not.toBe(hakiColorAt(plan, 1));
  });

  it('reste défini hors des bornes plutôt que de disparaître', () => {
    // La boucle de rendu peut dépasser 1 d'une image : un éclair qui
    // s'évanouit à cause d'un arrondi serait un défaut visible.
    const plan = ceremonyPlan([card('EPIC')]);
    expect(hakiColorAt(plan, -0.4)).toBe(plan.hakiColors[0]);
    expect(hakiColorAt(plan, 1.4)).toBe(plan.hakiColors.at(-1));
  });
});

describe('reducedMotionPlan (§111)', () => {
  const cards = [card('LEGENDARY')];

  it('supprime tremblement, éclairs, particules et attente', () => {
    const plan = reducedMotionPlan(cards);
    expect(plan.shakeSeconds).toBe(0);
    expect(plan.particles).toBe(0);
    expect(plan.suspenseSeconds).toBe(0);
    expect(plan.bolts).toBe(0);
    expect(plan.cardIntervalSeconds).toBe(0);
  });

  it('garde les couleurs : ce sont des repères, pas du mouvement', () => {
    expect(reducedMotionPlan(cards).hakiColors.length).toBeGreaterThan(0);
  });

  it('conserve la rareté mise en avant : la révélation reste due', () => {
    expect(reducedMotionPlan(cards).highlight).toBe('LEGENDARY');
  });

  it('reste quasi instantané', () => {
    expect(reducedMotionPlan(cards).totalSeconds).toBeLessThanOrEqual(0.25);
  });
});
