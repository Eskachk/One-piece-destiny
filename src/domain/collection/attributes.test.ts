import { describe, expect, it } from 'vitest';
import { attributesOf, MAX_ATTRIBUTES } from './attributes';
import { CHARACTER_INDEX } from '../../data/characters';
import type { Character } from '../types';

const character = (partial: Partial<Character>): Character => ({
  id: 'x',
  name: 'X',
  rarity: 'COMMON',
  affiliations: [],
  relations: [],
  abilities: [],
  presenceExpectation: 'LOW',
  ...partial,
});

describe('attributs de carte', () => {
  it('lit le Haki dans les capacités', () => {
    const found = attributesOf(
      character({ abilities: ['Haki des Rois', 'Fruit du démon'] }),
    );
    expect(found.map((a) => a.id)).toContain('conqueror');
    expect(found.map((a) => a.id)).toContain('fruit');
  });

  it('lit le type de fruit dans les affiliations', () => {
    // L'import range le type de fruit en affiliation, pas en capacité : la
    // détection doit regarder les deux listes indifféremment.
    const found = attributesOf(
      character({ affiliations: ["Big Mom's crew", 'Paramecia'] }),
    );
    expect(found.map((a) => a.id)).toContain('paramecia');
    expect(found.map((a) => a.id)).toContain('pirate');
  });

  it('reconnaît la Marine', () => {
    const found = attributesOf(character({ affiliations: ['Marine'] }));
    expect(found.map((a) => a.id)).toContain('marine');
  });

  it('ne rend rien pour un personnage sans donnée', () => {
    expect(attributesOf(character({}))).toEqual([]);
  });

  it('plafonne le nombre de symboles', () => {
    // Sans plafond, un personnage richement décrit couvrirait sa propre carte.
    const found = attributesOf(
      character({
        abilities: [
          'Haki des Rois',
          'Haki armement',
          'Haki observation',
          'Fruit du démon',
          'Captain',
          'Doctor',
          'Navigation',
        ],
        affiliations: ['Marine', 'Logia'],
      }),
    );
    expect(found.length).toBeLessThanOrEqual(MAX_ATTRIBUTES);
  });

  it('donne au moins un symbole aux personnages écrits à la main', () => {
    // Ces vingt-quatre entrées sont la vitrine du jeu : une carte sans aucun
    // symbole y signalerait une règle de détection cassée.
    for (const id of ['luffy', 'zoro', 'nami', 'akainu', 'mihawk']) {
      const found = attributesOf(CHARACTER_INDEX.get(id)!);
      expect(found.length, id).toBeGreaterThan(0);
    }
  });

  it('rend des identifiants uniques : ils servent de clé de rendu', () => {
    const found = attributesOf(
      character({
        abilities: ['Haki armement', 'sabre'],
        affiliations: ["Le Roux crew", 'Zoan'],
      }),
    );
    expect(new Set(found.map((a) => a.id)).size).toBe(found.length);
  });
});
