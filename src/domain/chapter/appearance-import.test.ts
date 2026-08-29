import { describe, expect, it } from 'vitest';
import { parseAppearanceImport } from './appearance-import';
import { CHARACTERS } from '../../data/characters';

const parse = (input: string) => parseAppearanceImport(input, CHARACTERS);

describe('parseAppearanceImport', () => {
  it("mappe l'exemple du cahier §6.3", () => {
    const { appearances, issues } = parse(
      ['Luffy 12', 'Zoro 7', 'Sanji 5', 'Koby 3', 'Bartolomeo 2'].join('\n'),
    );

    expect(issues).toEqual([]);
    expect(appearances).toEqual([
      { characterId: 'luffy', appearances: 12 },
      { characterId: 'zoro', appearances: 7 },
      { characterId: 'sanji', appearances: 5 },
      { characterId: 'koby', appearances: 3 },
      { characterId: 'bartolomeo', appearances: 2 },
    ]);
  });

  it('accepte les notations ×12 et x12', () => {
    const { appearances, issues } = parse('Luffy ×12\nZoro x7');
    expect(issues).toEqual([]);
    expect(appearances).toEqual([
      { characterId: 'luffy', appearances: 12 },
      { characterId: 'zoro', appearances: 7 },
    ]);
  });

  it('résout un prénom partiel vers le nom complet', () => {
    const { appearances } = parse('Bonney 4');
    expect(appearances).toEqual([{ characterId: 'bonney', appearances: 4 }]);
  });

  it('ignore les accents et la casse', () => {
    const { appearances, issues } = parse('SABO 3\nhelmeppo 1');
    expect(issues).toEqual([]);
    expect(appearances.map((a) => a.characterId)).toEqual(['sabo', 'helmeppo']);
  });

  it('ignore les lignes vides', () => {
    const { appearances, issues } = parse('\nLuffy 12\n\n\nZoro 7\n');
    expect(issues).toEqual([]);
    expect(appearances).toHaveLength(2);
  });

  it('accepte une apparition à zéro', () => {
    const { appearances, issues } = parse('Luffy 0');
    expect(issues).toEqual([]);
    expect(appearances).toEqual([{ characterId: 'luffy', appearances: 0 }]);
  });

  it('signale un personnage inconnu sans bloquer le reste', () => {
    const { appearances, issues } = parse('Luffy 12\nCharacter X 2\nZoro 7');
    expect(appearances).toHaveLength(2);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ line: 2, kind: 'UNKNOWN_CHARACTER' });
  });

  it('accepte un nom seul : la presence suffit', () => {
    // Le moteur v2 ne compte plus les cases. Une ligne sans nombre est donc
    // la saisie normale, plus une anomalie.
    const { appearances, issues } = parse('Luffy');
    expect(issues).toHaveLength(0);
    expect(appearances).toEqual([{ characterId: 'luffy', appearances: 1 }]);
  });

  it('refuse un nombre négatif', () => {
    const { appearances, issues } = parse('Luffy -3');
    expect(appearances).toEqual([]);
    expect(issues[0].kind).toBe('INVALID_COUNT');
  });

  it('signale un doublon en citant la première ligne', () => {
    const { appearances, issues } = parse('Luffy 12\nZoro 7\nLuffy 5');
    expect(appearances).toHaveLength(2);
    expect(issues[0]).toMatchObject({ kind: 'DUPLICATE', line: 3 });
    expect(issues[0].message).toContain('ligne 1');
  });

  it('signale une ambiguïté plutôt que de choisir au hasard', () => {
    // « Monkey » désigne aussi bien Luffy que Dragon ou Garp.
    const { appearances, issues } = parse('Monkey 4');
    expect(appearances).toEqual([]);
    expect(issues[0].kind).toBe('AMBIGUOUS_CHARACTER');
    expect(issues[0].candidates).toEqual(
      expect.arrayContaining(['luffy', 'dragon', 'garp']),
    );
  });

  it("n'identifie personne à partir d'un fragment trop court", () => {
    const { issues } = parse('D. 4');
    expect(issues[0].kind).toBe('UNKNOWN_CHARACTER');
  });
});
