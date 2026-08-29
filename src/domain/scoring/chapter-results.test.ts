import { describe, expect, it } from 'vitest';
import {
  computeChapterResults,
  computePickRates,
  percentileFromRank,
  percentileOf,
} from './chapter-results';
import { CHARACTER_INDEX } from '../../data/characters';
import type { LockedTeam } from '../types';

const roster = CHARACTER_INDEX;

function team(userId: string, ids: [string, string, string]): LockedTeam {
  return {
    userId,
    chapterId: 'ch-1180',
    characterIds: ids,
    lockedAt: new Date('2026-08-23T21:59:59Z'),
  };
}

describe('computePickRates', () => {
  it('retourne une carte vide sans équipe', () => {
    expect(computePickRates([]).size).toBe(0);
  });

  it('calcule la proportion d\'équipes ayant choisi chaque personnage', () => {
    const rates = computePickRates([
      team('a', ['luffy', 'zoro', 'nami']),
      team('b', ['luffy', 'law', 'koby']),
      team('c', ['luffy', 'zoro', 'sabo']),
    ]);
    expect(rates.get('luffy')).toBe(1);
    expect(rates.get('zoro')).toBeCloseTo(2 / 3);
    expect(rates.get('koby')).toBeCloseTo(1 / 3);
    expect(rates.get('shanks')).toBeUndefined();
  });
});

describe('computeChapterResults', () => {
  const appearances = [
    { characterId: 'luffy', appearances: 12 },
    { characterId: 'zoro', appearances: 7 },
    { characterId: 'usopp', appearances: 4 },
    { characterId: 'bartolomeo', appearances: 6 },
  ];

  it('trie du meilleur score au moins bon', () => {
    const results = computeChapterResults({
      teams: [
        team('absent', ['shanks', 'akainu', 'perona']),
        team('present', ['luffy', 'zoro', 'bartolomeo']),
      ],
      appearances,
      roster,
      scoringVersion: 'v1.0.0',
    });

    expect(results[0].playerId).toBe('present');
    expect(results[0].score.total).toBeGreaterThan(results[1].score.total);
    expect(results[1].score.total).toBe(0);
  });

  it('ignore une équipe citant un personnage inconnu', () => {
    const results = computeChapterResults({
      teams: [
        team('valide', ['luffy', 'zoro', 'usopp']),
        team('corrompue', ['luffy', 'zoro', 'personnage-inexistant']),
      ],
      appearances,
      roster,
      scoringVersion: 'v1.0.0',
    });

    expect(results).toHaveLength(1);
    expect(results[0].playerId).toBe('valide');
  });

  it('utilise la version de score du chapitre, pas la dernière', () => {
    expect(() =>
      computeChapterResults({
        teams: [team('a', ['luffy', 'zoro', 'nami'])],
        appearances,
        roster,
        scoringVersion: 'v0.9.0',
      }),
    ).toThrow(/introuvable/);
  });

  it('donne le même résultat sur deux exécutions identiques', () => {
    const input = {
      teams: [team('a', ['luffy', 'zoro', 'usopp'])],
      appearances,
      roster,
      scoringVersion: 'v1.0.0',
    };
    expect(computeChapterResults(input)).toEqual(computeChapterResults(input));
  });
});

describe('percentileFromRank', () => {
  it('place le premier sur quatre au top 25%', () => {
    expect(percentileFromRank(1, 4)).toBe(25);
  });

  it('place le dernier à 100', () => {
    expect(percentileFromRank(4, 4)).toBe(100);
  });

  it('arrondit au dixième', () => {
    expect(percentileFromRank(6, 128)).toBe(4.7);
  });

  it('refuse un rang hors bornes ou un classement vide', () => {
    expect(percentileFromRank(0, 10)).toBeNull();
    expect(percentileFromRank(11, 10)).toBeNull();
    expect(percentileFromRank(1, 0)).toBeNull();
  });
});

describe('percentileOf', () => {
  const results = ['a', 'b', 'c', 'd'].map((playerId, index) => ({
    playerId,
    score: { scoringVersion: 'v1.0.0', characters: [], total: 100 - index },
  }));

  it('place le premier au sommet', () => {
    expect(percentileOf(results, 'a')).toBe(25);
  });

  it('place le dernier à 100', () => {
    expect(percentileOf(results, 'd')).toBe(100);
  });

  it('retourne null pour un joueur absent du classement', () => {
    expect(percentileOf(results, 'inconnu')).toBeNull();
  });
});
