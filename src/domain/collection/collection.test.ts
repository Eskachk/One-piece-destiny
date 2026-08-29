import { describe, expect, it } from 'vitest';
import {
  CHEST_SIZE,
  openChest,
  openStarterChest,
  PITY_THRESHOLD,
  STARTER_CHEST_SLOTS,
} from './chest';
import { DUPLICATE_SHARDS, isAtLeast, rarityRank } from './rarity';
import { allSetsProgress, collectionSummary, setProgress, COLLECTION_SETS } from './sets';
import { CHARACTERS } from '../../data/characters';

/** Générateur déterministe : les tests ne doivent pas dépendre du hasard. */
function sequence(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

/** Générateur pseudo-aléatoire reproductible, pour les tests statistiques. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe('openChest — composition', () => {
  it('rend toujours 5 cartes', () => {
    for (let seed = 1; seed <= 30; seed += 1) {
      const result = openChest({
        roster: CHARACTERS,
        owned: new Set(),
        pityCounter: 0,
        random: seeded(seed),
      });
      expect(result.cards).toHaveLength(CHEST_SIZE);
    }
  });

  it('garantit au moins un Rare ou mieux, comme annoncé', () => {
    for (let seed = 1; seed <= 50; seed += 1) {
      const result = openChest({
        roster: CHARACTERS,
        owned: new Set(),
        pityCounter: 0,
        random: seeded(seed),
      });
      const best = result.cards.some((card) => isAtLeast(card.rarity, 'RARE'));
      expect(best).toBe(true);
    }
  });

  it('ne rend que des personnages du référentiel', () => {
    const ids = new Set(CHARACTERS.map((c) => c.id));
    const result = openChest({
      roster: CHARACTERS,
      owned: new Set(),
      pityCounter: 0,
      random: seeded(7),
    });
    for (const card of result.cards) {
      expect(ids.has(card.characterId)).toBe(true);
    }
  });
});

describe('openChest — doublons (§28)', () => {
  it('convertit un doublon en fragments plutôt qu\'en rien', () => {
    const owned = new Set(CHARACTERS.map((c) => c.id));
    const result = openChest({
      roster: CHARACTERS,
      owned,
      pityCounter: 0,
      random: seeded(3),
    });

    for (const card of result.cards) {
      expect(card.duplicate).toBe(true);
      expect(card.shards).toBe(DUPLICATE_SHARDS[card.rarity]);
      expect(card.shards).toBeGreaterThan(0);
    }
  });

  it('n\'accorde aucun fragment pour une carte neuve', () => {
    const result = openChest({
      roster: CHARACTERS,
      owned: new Set(),
      pityCounter: 0,
      random: seeded(11),
    });
    for (const card of result.cards.filter((c) => !c.duplicate)) {
      expect(card.shards).toBe(0);
    }
  });

  it('traite un second exemplaire tiré dans le même coffre comme un doublon', () => {
    // Référentiel d'un seul personnage : tous les emplacements le tirent.
    const single = CHARACTERS.filter((c) => c.id === 'luffy');
    const result = openChest({
      roster: single,
      owned: new Set(),
      pityCounter: 0,
      random: sequence([0]),
    });

    expect(result.cards[0].duplicate).toBe(false);
    expect(result.cards.slice(1).every((card) => card.duplicate)).toBe(true);
  });
});

describe('openChest — système de pitié (§31)', () => {
  it('ne se déclenche pas avant le seuil', () => {
    const result = openChest({
      roster: CHARACTERS,
      owned: new Set(),
      pityCounter: PITY_THRESHOLD - 1,
      random: seeded(5),
    });
    expect(result.pityTriggered).toBe(false);
  });

  it('garantit un légendaire au seuil atteint', () => {
    const result = openChest({
      roster: CHARACTERS,
      owned: new Set(),
      pityCounter: PITY_THRESHOLD,
      random: seeded(5),
    });

    expect(result.pityTriggered).toBe(true);
    expect(rarityRank(result.cards[0].rarity)).toBeGreaterThanOrEqual(
      rarityRank('LEGENDARY'),
    );
  });

  it('remet le compteur à zéro dès qu\'un légendaire sort', () => {
    const result = openChest({
      roster: CHARACTERS,
      owned: new Set(),
      pityCounter: PITY_THRESHOLD,
      random: seeded(5),
    });
    expect(result.pityCounter).toBe(0);
  });

  it('avance le compteur quand aucun légendaire ne sort', () => {
    // Référentiel sans légendaire : le compteur ne peut qu'avancer.
    const commons = CHARACTERS.filter(
      (c) => c.rarity === 'COMMON' || c.rarity === 'RARE',
    );
    const result = openChest({
      roster: commons,
      owned: new Set(),
      pityCounter: 4,
      random: seeded(9),
    });
    expect(result.pityCounter).toBe(5);
  });
});

describe('openStarterChest (§27)', () => {
  it('rend 3 personnages distincts, sans doublon frustrant', () => {
    // Trois cartes, soit exactement la taille d'un équipage : le nouveau
    // joueur peut jouer sa première semaine sans rien ouvrir d'autre.
    for (let seed = 1; seed <= 40; seed += 1) {
      const result = openStarterChest(CHARACTERS, seeded(seed));
      const ids = result.cards.map((c) => c.characterId);

      expect(result.cards).toHaveLength(STARTER_CHEST_SLOTS.length);
      expect(new Set(ids).size).toBe(STARTER_CHEST_SLOTS.length);
      expect(result.cards.every((card) => !card.duplicate)).toBe(true);
    }
  });

  it('garantit au moins une carte Rare ou mieux', () => {
    // Sans cela, un démarrage à trois communs ne donnerait aucune envie de
    // continuer.
    for (let seed = 1; seed <= 40; seed += 1) {
      const result = openStarterChest(CHARACTERS, seeded(seed));
      const meilleur = Math.max(...result.cards.map((c) => rarityRank(c.rarity)));
      expect(meilleur).toBeGreaterThanOrEqual(rarityRank('RARE'));
    }
  });

  it('ne remplit jamais un équipage de doublons', () => {
    const result = openStarterChest(CHARACTERS, seeded(7));
    expect(result.cards.every((card) => card.shards === 0)).toBe(true);
  });
});

describe('sets de collection (§33)', () => {
  const mugiwara = COLLECTION_SETS.find((s) => s.id === 'mugiwara')!;

  it('liste les membres possédés et manquants', () => {
    const progress = setProgress(mugiwara, CHARACTERS, new Set(['luffy', 'zoro']));
    expect(progress.owned).toEqual(expect.arrayContaining(['luffy', 'zoro']));
    expect(progress.missing).toContain('nami');
    expect(progress.complete).toBe(false);
  });

  it('marque un set complet quand tous ses membres sont possédés', () => {
    const members = CHARACTERS.filter((c) =>
      c.affiliations.includes(mugiwara.affiliation),
    ).map((c) => c.id);

    const progress = setProgress(mugiwara, CHARACTERS, new Set(members));
    expect(progress.complete).toBe(true);
    expect(progress.missing).toEqual([]);
  });

  it('ne déclare jamais complet un set sans membre', () => {
    const progress = setProgress(mugiwara, [], new Set());
    expect(progress.complete).toBe(false);
  });

  it('ne promet que des récompenses cosmétiques', () => {
    for (const set of COLLECTION_SETS) {
      expect(set.reward.toLowerCase()).toContain('cosmétique');
    }
  });

  it('calcule la progression de tous les sets', () => {
    const progress = allSetsProgress(CHARACTERS, new Set(['luffy']));
    expect(progress).toHaveLength(COLLECTION_SETS.length);
  });
});

describe('collectionSummary', () => {
  it('compte les personnages possédés', () => {
    const summary = collectionSummary(CHARACTERS, new Set(['luffy', 'zoro']));
    expect(summary.owned).toBe(2);
    expect(summary.total).toBe(CHARACTERS.length);
  });

  it('ignore un identifiant possédé absent du référentiel', () => {
    const summary = collectionSummary(CHARACTERS, new Set(['fantome']));
    expect(summary.owned).toBe(0);
  });

  it('gère un référentiel vide sans division par zéro', () => {
    expect(collectionSummary([], new Set()).percent).toBe(0);
  });
});
