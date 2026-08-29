import { describe, expect, it } from 'vitest';
import {
  applyChapterToDivision,
  DIVISIONS,
  INITIAL_DIVISION_STATE,
  STREAK_TO_MOVE,
  type DivisionState,
} from './divisions';
import {
  SEASON_01,
  seasonStanding,
  seasonTier,
  wouldImproveSeason,
} from './season';
import { deriveStyle, MIN_WEEKS_FOR_STYLE } from '../player/style';
import {
  analyseChapter,
  averagePickRate,
  specialAwards,
  synergyShare,
} from '../scoring/chapter-analysis';
import type { ChapterResult } from '../scoring/chapter-results';

// --- Divisions (§19) -------------------------------------------------------

describe('divisions', () => {
  const state = (overrides: Partial<DivisionState> = {}): DivisionState => ({
    ...INITIAL_DIVISION_STATE,
    ...overrides,
  });

  it('ne fait pas monter sur une seule bonne semaine', () => {
    const outcome = applyChapterToDivision(state(), 10);
    expect(outcome.move).toBe('STAYED');
    expect(outcome.state.promotionStreak).toBe(1);
  });

  it('promeut après deux semaines consécutives en zone haute', () => {
    let current = state();
    for (let i = 0; i < STREAK_TO_MOVE; i += 1) {
      current = applyChapterToDivision(current, 10).state;
    }
    expect(current.division).toBe('GRAND_LINE');
    expect(current.promotionStreak).toBe(0);
  });

  it('casse la série sur une semaine moyenne', () => {
    let current = applyChapterToDivision(state(), 10).state;
    current = applyChapterToDivision(current, 50).state;
    expect(current.promotionStreak).toBe(0);
    expect(current.division).toBe('EAST_BLUE');
  });

  it('relègue après deux mauvaises semaines consécutives', () => {
    let current = state({ division: 'NEW_WORLD' });
    current = applyChapterToDivision(current, 90).state;
    current = applyChapterToDivision(current, 90).state;
    expect(current.division).toBe('GRAND_LINE');
  });

  it('ne relègue jamais en dessous de la première division', () => {
    let current = state();
    for (let i = 0; i < 6; i += 1) {
      current = applyChapterToDivision(current, 95).state;
    }
    expect(current.division).toBe('EAST_BLUE');
  });

  it('ne promeut jamais au-dessus de la dernière division', () => {
    let current = state({ division: 'PIRATE_KING' });
    for (let i = 0; i < 6; i += 1) {
      current = applyChapterToDivision(current, 2).state;
    }
    expect(current.division).toBe('PIRATE_KING');
  });

  it('ne pénalise pas une semaine non jouée', () => {
    const current = state({ division: 'YONKO', relegationStreak: 1 });
    const outcome = applyChapterToDivision(current, null);
    expect(outcome.move).toBe('STAYED');
    expect(outcome.state.division).toBe('YONKO');
    expect(outcome.state.relegationStreak).toBe(0);
  });

  it('traverse toutes les divisions de bas en haut', () => {
    let current = state();
    for (let i = 0; i < (DIVISIONS.length - 1) * STREAK_TO_MOVE; i += 1) {
      current = applyChapterToDivision(current, 5).state;
    }
    expect(current.division).toBe('PIRATE_KING');
  });
});

// --- Saisons (§20) ---------------------------------------------------------

describe('saisons', () => {
  const entries = (scores: number[]) =>
    scores.map((total, index) => ({ chapterNumber: 1100 + index, total }));

  it('ne retient que les meilleurs résultats', () => {
    const standing = seasonStanding(entries([10, 200, 50]), {
      ...SEASON_01,
      countedResults: 2,
    });
    expect(standing.total).toBe(250);
    expect(standing.counted).toHaveLength(2);
    expect(standing.dropped).toEqual([{ chapterNumber: 1100, total: 10 }]);
  });

  it("empêche qu'une absence ruine la saison", () => {
    // 26 semaines dont 6 ratées : le total reste celui des 20 meilleures.
    const scores = [...Array(20).fill(180), ...Array(6).fill(0)];
    const standing = seasonStanding(entries(scores));
    expect(standing.total).toBe(20 * 180);
    expect(standing.dropped.every((entry) => entry.total === 0)).toBe(true);
  });

  it('compte toutes les semaines jouées, même écartées', () => {
    const standing = seasonStanding(entries(Array(26).fill(100)));
    expect(standing.played).toBe(26);
    expect(standing.remaining).toBe(0);
  });

  it('départage à égalité par le chapitre le plus ancien', () => {
    const standing = seasonStanding(entries([100, 100]), {
      ...SEASON_01,
      countedResults: 1,
    });
    expect(standing.counted[0].chapterNumber).toBe(1100);
  });

  it('signale qu\'un score améliorerait le total', () => {
    const played = entries(Array(20).fill(50));
    expect(wouldImproveSeason(played, 60)).toBe(true);
    expect(wouldImproveSeason(played, 40)).toBe(false);
  });

  it('accepte tout score tant que le quota n\'est pas atteint', () => {
    expect(wouldImproveSeason(entries([300]), 1)).toBe(true);
  });

  it('attribue les paliers de fin de saison', () => {
    expect(seasonTier(1, 5000)).toBe('Top 1');
    expect(seasonTier(7, 5000)).toBe('Top 10');
    expect(seasonTier(80, 5000)).toBe('Top 100');
    expect(seasonTier(300, 50_000)).toBe('Top 1%');
    expect(seasonTier(4000, 5000)).toBeNull();
  });
});

// --- Styles de joueur (§16) ------------------------------------------------

describe('styles de joueur', () => {
  const week = (risk: number, synergyShare: number, averagePickRate: number) => ({
    risk,
    synergyShare,
    averagePickRate,
  });

  it('ne se prononce pas trop tôt', () => {
    const history = Array(MIN_WEEKS_FOR_STYLE - 1).fill(week(80, 0.1, 0.5));
    expect(deriveStyle(history).style).toBe('UNDECIDED');
  });

  it('identifie le joueur prudent', () => {
    const history = Array(6).fill(week(20, 0.1, 0.7));
    expect(deriveStyle(history).style).toBe('SAFE_CAPTAIN');
  });

  it('identifie le parieur', () => {
    const history = Array(6).fill(week(80, 0.1, 0.5));
    expect(deriveStyle(history).style).toBe('GAMBLER');
  });

  it('identifie le lecteur de synergies', () => {
    const history = Array(6).fill(week(50, 0.45, 0.5));
    expect(deriveStyle(history).style).toBe('SYNERGY_MASTER');
  });

  it('identifie le chasseur de méta', () => {
    const history = Array(6).fill(week(50, 0.1, 0.08));
    expect(deriveStyle(history).style).toBe('META_HUNTER');
  });

  it('expose les moyennes ayant conduit au verdict', () => {
    const verdict = deriveStyle([week(20, 0.2, 0.4), week(40, 0.4, 0.6)]);
    expect(verdict.averages.risk).toBe(30);
    expect(verdict.averages.synergyShare).toBeCloseTo(0.3);
    expect(verdict.weeks).toBe(2);
  });

  it('gère un historique vide sans diviser par zéro', () => {
    expect(deriveStyle([]).averages.risk).toBe(0);
  });
});

// --- Analyse post-chapitre (§64) et distinctions (§18) ---------------------

function result(
  playerId: string,
  cards: { id: string; base: number; synergy: number; risk: number }[],
): ChapterResult {
  const characters = cards.map((card) => ({
    characterId: card.id,
    appearances: card.base / 2,
    base: card.base,
    synergy: card.synergy,
    risk: card.risk,
    total: card.base + card.synergy + card.risk,
    breakdown: [],
  }));

  return {
    playerId,
    score: {
      scoringVersion: 'v1.0.0',
      characters,
      total: characters.reduce((sum, c) => sum + c.total, 0),
    },
  };
}

describe('analyse post-chapitre', () => {
  const results = [
    result('a', [
      { id: 'luffy', base: 44, synergy: 8, risk: 2 },
      { id: 'bartolomeo', base: 12, synergy: 10, risk: 18 },
      { id: 'akainu', base: 0, synergy: 0, risk: 0 },
    ]),
    result('b', [
      { id: 'luffy', base: 44, synergy: 8, risk: 2 },
      { id: 'zoro', base: 14, synergy: 6, risk: 1 },
      { id: 'akainu', base: 0, synergy: 0, risk: 0 },
    ]),
  ];

  const pickRates = new Map([
    ['luffy', 0.9],
    ['bartolomeo', 0.05],
    ['zoro', 0.5],
    ['akainu', 0.6],
  ]);

  const analysis = analyseChapter(results, pickRates);

  it('désigne le personnage le plus choisi', () => {
    expect(analysis.mostPicked?.characterId).toBe('luffy');
  });

  it('désigne le meilleur rendement', () => {
    expect(analysis.bestPerformer?.characterId).toBe('luffy');
  });

  it('désigne la surprise parmi les personnages peu choisis', () => {
    expect(analysis.biggestSurprise?.characterId).toBe('bartolomeo');
  });

  it('désigne le piège parmi les personnages très choisis', () => {
    expect(analysis.biggestTrap?.characterId).toBe('akainu');
    expect(analysis.biggestTrap?.points).toBe(0);
  });

  it('calcule moyenne et médiane', () => {
    expect(analysis.averageScore).toBeGreaterThan(0);
    expect(analysis.medianScore).toBeGreaterThan(0);
  });

  it('ne plante pas sur un chapitre sans résultat', () => {
    const empty = analyseChapter([], new Map());
    expect(empty.averageScore).toBe(0);
    expect(empty.mostPicked).toBeNull();
  });
});

describe('classements spécialisés (§18)', () => {
  const results = [
    result('safe', [{ id: 'luffy', base: 50, synergy: 2, risk: 1 }]),
    result('risky', [{ id: 'bartolomeo', base: 10, synergy: 4, risk: 20 }]),
    result('synergy', [{ id: 'law', base: 20, synergy: 28, risk: 3 }]),
  ];

  const awards = specialAwards(results);
  const winner = (award: string) =>
    awards.find((a) => a.award === award)?.playerId;

  it('récompense le meilleur score total', () => {
    expect(winner('BEST_PREDICTION')).toBe('safe');
  });

  it('récompense la meilleure synergie', () => {
    expect(winner('BEST_SYNERGY')).toBe('synergy');
  });

  it('récompense le risque le plus élevé', () => {
    expect(winner('HIGHEST_RISK')).toBe('risky');
  });

  it('offre plusieurs façons d\'être reconnu', () => {
    // L'intention du §18 : le vainqueur du général ne rafle pas tout.
    expect(new Set(awards.map((a) => a.playerId)).size).toBeGreaterThan(1);
  });

  it('ne décerne rien sur un classement vide', () => {
    expect(specialAwards([])).toEqual([]);
  });
});

describe('mesures pour la détection de style', () => {
  it('calcule la part de synergie', () => {
    const r = result('x', [{ id: 'law', base: 20, synergy: 20, risk: 0 }]);
    expect(synergyShare(r)).toBeCloseTo(0.5);
  });

  it('retourne 0 pour un score nul', () => {
    const r = result('x', [{ id: 'law', base: 0, synergy: 0, risk: 0 }]);
    expect(synergyShare(r)).toBe(0);
  });

  it('moyenne les taux de sélection d\'une équipe', () => {
    const rates = new Map([
      ['a', 0.9],
      ['b', 0.1],
    ]);
    expect(averagePickRate(['a', 'b'], rates)).toBeCloseTo(0.5);
    expect(averagePickRate([], rates)).toBe(0);
  });
});
