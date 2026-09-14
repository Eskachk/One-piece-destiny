import { describe, expect, it } from 'vitest';
import { analyseChapter, topPicks } from './chapter-analysis';

describe('les plus choisis de la semaine', () => {
  const rates = new Map([
    ['nami', 0.4],
    ['luffy', 0.9],
    ['zoro', 0.6],
    ['usopp', 0.1],
    ['brook', 0.4],
  ]);

  it('donne les trois premiers, du plus au moins choisi', () => {
    expect(topPicks(rates).map((p) => p.characterId)).toEqual(['luffy', 'zoro', 'brook']);
  });

  it('départage une égalité par l’identifiant, pour un ordre stable', () => {
    // brook et nami à 0,4 : brook passe devant, toujours.
    expect(topPicks(rates, 5).map((p) => p.characterId)).toEqual([
      'luffy',
      'zoro',
      'brook',
      'nami',
      'usopp',
    ]);
  });

  it('accompagne l’analyse enregistrée à la publication', () => {
    const analyse = analyseChapter([], rates);
    expect(analyse.topPicks).toHaveLength(3);
    expect(analyse.topPicks?.[0]).toEqual({ characterId: 'luffy', pickRate: 0.9 });
    expect(analyse.mostPicked?.characterId).toBe('luffy');
  });

  it('reste vide sans équipage', () => {
    expect(topPicks(new Map())).toEqual([]);
  });
});
