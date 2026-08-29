import { describe, expect, it } from 'vitest';
import { chestOdds } from './odds';
import { openChest } from './chest';
import { CHARACTERS } from '../../data/characters';
import { RARITY_ORDER } from './rarity';
import type { Rarity } from '../types';

/**
 * Le cahier §113 impose d'annoncer la composition avant l'achat. Une
 * probabilité affichée qui ne correspond pas au tirage serait exactement la
 * pratique que cette obligation vise à empêcher.
 *
 * Ce test simule donc un grand nombre d'ouvertures et compare la fréquence
 * observée à la valeur annoncée. C'est le seul test du projet qui vérifie une
 * promesse faite au joueur plutôt qu'une règle interne.
 */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    // Xorshift32 : suffisamment uniforme pour une comparaison statistique,
    // et parfaitement reproductible.
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x100000000;
  };
}

describe('probabilités annoncées des coffres (§113)', () => {
  const odds = chestOdds(CHARACTERS);

  it('annonce chaque rareté', () => {
    expect(odds.map((o) => o.rarity)).toEqual([...RARITY_ORDER]);
  });

  it('reste dans les bornes d’une probabilité', () => {
    for (const entry of odds) {
      expect(entry.atLeastOnePercent).toBeGreaterThanOrEqual(0);
      expect(entry.atLeastOnePercent).toBeLessThanOrEqual(100);
    }
  });

  // Le référentiel compte des centaines de personnages : chaque emplacement
  // filtre puis parcourt toute la liste. Le delai par defaut de 5 s ne suffit
  // plus — on l'allonge plutot que de reduire l'echantillon, car c'est la
  // taille de l'echantillon qui donne sa valeur a la comparaison.
  it('correspond au tirage réel du serveur', () => {
    const TIRAGES = 20_000;
    const random = seeded(20240829);
    const owned = new Set<string>();

    const auMoinsUne = new Map<Rarity, number>();
    const total = new Map<Rarity, number>();

    for (let i = 0; i < TIRAGES; i += 1) {
      const result = openChest({
        roster: CHARACTERS,
        owned,
        // Pitié neutralisée : elle n'entre pas dans les chiffres annoncés,
        // elle ne fait que les améliorer.
        pityCounter: 0,
        random,
      });

      const vues = new Set<Rarity>();
      for (const card of result.cards) {
        total.set(card.rarity, (total.get(card.rarity) ?? 0) + 1);
        vues.add(card.rarity);
      }
      for (const rarity of vues) {
        auMoinsUne.set(rarity, (auMoinsUne.get(rarity) ?? 0) + 1);
      }
    }

    for (const entry of odds) {
      const observePct = ((auMoinsUne.get(entry.rarity) ?? 0) / TIRAGES) * 100;
      const observeMoyenne = (total.get(entry.rarity) ?? 0) / TIRAGES;

      // Tolérance absolue de 2 points : au-delà, l'écart ne s'explique plus
      // par le hasard sur 20 000 tirages et l'annonce serait trompeuse.
      expect(Math.abs(observePct - entry.atLeastOnePercent)).toBeLessThan(2);
      expect(Math.abs(observeMoyenne - entry.expectedPerChest)).toBeLessThan(0.1);
    }
  }, 120_000);

  it('garantit au moins une carte Rare ou mieux', () => {
    // L'emplacement garanti du coffre (§30) doit se retrouver dans les
    // chiffres : les raretés Rare et au-dessus, cumulées, sont certaines.
    const cumul = odds
      .filter((o) => o.rarity !== 'COMMON')
      .reduce((sum, o) => sum + o.expectedPerChest, 0);
    expect(cumul).toBeGreaterThanOrEqual(1);
  });
});
