import { describe, expect, it } from 'vitest';
import { CAPS, scoreCharacter, scoreTeam } from './v1';
import { getScoringEngine } from './index';
import { CHARACTER_INDEX } from '../../data/characters';
import type { ChapterAppearance, Character } from '../types';

const roster = CHARACTER_INDEX;
const get = (id: string): Character => roster.get(id)!;

function ctx(
  appearances: ChapterAppearance[],
  pickedIds: string[],
  pickRates?: Map<string, number>,
) {
  return {
    appearances,
    picked: pickedIds.map(get),
    roster,
    pickRates,
  };
}

describe('base score', () => {
  it('applique 2 points par apparition (exemple du cahier §9.1)', () => {
    const score = scoreCharacter(
      get('luffy'),
      ctx([{ characterId: 'luffy', appearances: 12 }], ['luffy']),
    );
    expect(score.base).toBe(24);
  });

  it('plafonne à 50 points', () => {
    const score = scoreCharacter(
      get('luffy'),
      ctx([{ characterId: 'luffy', appearances: 999 }], ['luffy']),
    );
    expect(score.base).toBe(CAPS.base);
  });

  it('vaut 0 pour un personnage absent', () => {
    const score = scoreCharacter(get('shanks'), ctx([], ['shanks']));
    expect(score.base).toBe(0);
    expect(score.total).toBe(0);
  });
});

describe('synergy score', () => {
  it('ne rapporte rien à un personnage absent, même bien connecté', () => {
    // Shanks est lié à Luffy, très présent. Shanks reste absent : 0 point.
    const score = scoreCharacter(
      get('shanks'),
      ctx([{ characterId: 'luffy', appearances: 12 }], ['shanks']),
    );
    expect(score.synergy).toBe(0);
    expect(score.total).toBe(0);
  });

  it("ne récompense pas un lien dont l'autre extrémité est absente", () => {
    // Law est allié de Luffy, mais Luffy n'apparaît pas dans ce chapitre.
    const score = scoreCharacter(
      get('law'),
      ctx([{ characterId: 'law', appearances: 5 }], ['law']),
    );
    expect(score.synergy).toBe(0);
  });

  it('récompense une alliance réellement activée', () => {
    const score = scoreCharacter(
      get('law'),
      ctx(
        [
          { characterId: 'law', appearances: 5 },
          { characterId: 'luffy', appearances: 8 },
        ],
        ['law'],
      ),
    );
    expect(score.synergy).toBeGreaterThan(0);
  });

  it('plafonne à 30 points', () => {
    // Tout l'équipage présent : Luffy cumule un grand nombre de liens.
    const appearances = [...roster.keys()].map((characterId) => ({
      characterId,
      appearances: 5,
    }));
    const score = scoreCharacter(get('luffy'), ctx(appearances, ['luffy']));
    expect(score.synergy).toBe(CAPS.synergy);
  });
});

describe('risk bonus', () => {
  it('ne verse rien si le pari a échoué', () => {
    const score = scoreCharacter(get('bartolomeo'), ctx([], ['bartolomeo']));
    expect(score.risk).toBe(0);
  });

  it('récompense davantage un choix improbable qu\'un choix évident', () => {
    const appearances = [
      { characterId: 'luffy', appearances: 10 },
      { characterId: 'bartolomeo', appearances: 10 },
    ];
    const safe = scoreCharacter(get('luffy'), ctx(appearances, ['luffy']));
    const risky = scoreCharacter(get('bartolomeo'), ctx(appearances, ['bartolomeo']));
    expect(risky.risk).toBeGreaterThan(safe.risk);
  });

  it('augmente quand le personnage est peu sélectionné par la communauté', () => {
    const appearances = [{ characterId: 'bonney', appearances: 10 }];
    const popular = scoreCharacter(
      get('bonney'),
      ctx(appearances, ['bonney'], new Map([['bonney', 0.9]])),
    );
    const ignored = scoreCharacter(
      get('bonney'),
      ctx(appearances, ['bonney'], new Map([['bonney', 0.02]])),
    );
    expect(ignored.risk).toBeGreaterThan(popular.risk);
  });

  it('plafonne à 20 points', () => {
    const score = scoreCharacter(
      get('bartolomeo'),
      ctx(
        [{ characterId: 'bartolomeo', appearances: 40 }],
        ['bartolomeo'],
        new Map([['bartolomeo', 0]]),
      ),
    );
    expect(score.risk).toBe(CAPS.risk);
  });
});

describe('scoreTeam', () => {
  it('ne dépasse jamais 100 points par personnage', () => {
    const appearances = [...roster.keys()].map((characterId) => ({
      characterId,
      appearances: 50,
    }));
    const team = scoreTeam(ctx(appearances, ['luffy', 'zoro', 'bartolomeo']));
    for (const character of team.characters) {
      expect(character.total).toBeLessThanOrEqual(CAPS.total);
    }
    expect(team.total).toBeLessThanOrEqual(3 * CAPS.total);
  });

  it('estampille la version du moteur', () => {
    const team = scoreTeam(ctx([], ['luffy', 'zoro', 'nami']));
    expect(team.scoringVersion).toBe('v1.0.0');
  });

  it('permet à un pari risqué de rivaliser avec un choix sûr (cahier §10)', () => {
    // Luffy très présent mais sans surprise, Bartolomeo moins présent mais
    // improbable et soutenu par une alliance activée.
    const appearances = [
      { characterId: 'luffy', appearances: 12 },
      { characterId: 'usopp', appearances: 6 },
      { characterId: 'bartolomeo', appearances: 7 },
    ];
    const pickRates = new Map([
      ['luffy', 0.71],
      ['bartolomeo', 0.04],
    ]);
    const safe = scoreCharacter(get('luffy'), ctx(appearances, ['luffy'], pickRates));
    const risky = scoreCharacter(
      get('bartolomeo'),
      ctx(appearances, ['bartolomeo'], pickRates),
    );
    // Le pari ne doit pas écraser le choix sûr, mais rester compétitif.
    expect(risky.total).toBeGreaterThan(safe.total * 0.8);
  });
});

describe('registre de versions', () => {
  it('retourne le moteur v1.0.0', () => {
    expect(getScoringEngine('v1.0.0').version).toBe('v1.0.0');
  });

  it('échoue explicitement sur une version inconnue', () => {
    expect(() => getScoringEngine('v9.9.9')).toThrow(/introuvable/);
  });
});
