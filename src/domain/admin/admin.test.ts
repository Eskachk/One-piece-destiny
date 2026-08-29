import { describe, expect, it } from 'vitest';
import { simulateChapter } from './simulator';
import {
  detectAnomalies,
  hasBlockingAnomaly,
  IMPLAUSIBLE_APPEARANCES,
} from './anomalies';
import { flagMeta, metaStats, type CharacterOutcome } from './meta';
import { CHARACTERS } from '../../data/characters';

const simulate = (appearances: { characterId: string; appearances: number }[]) =>
  simulateChapter({
    appearances,
    roster: CHARACTERS,
    scoringVersion: 'v1.0.0',
  });

describe('Chapter Simulator (§80)', () => {
  const appearances = [
    { characterId: 'luffy', appearances: 12 },
    { characterId: 'zoro', appearances: 7 },
    { characterId: 'bartolomeo', appearances: 6 },
    { characterId: 'usopp', appearances: 4 },
  ];

  const result = simulate(appearances);

  it('évalue tout le référentiel, du meilleur au moins bon', () => {
    expect(result.characters).toHaveLength(CHARACTERS.length);
    for (let i = 1; i < result.characters.length; i += 1) {
      expect(result.characters[i - 1].score.total).toBeGreaterThanOrEqual(
        result.characters[i].score.total,
      );
    }
  });

  it('propose une meilleure équipe de trois personnages', () => {
    expect(result.bestTeam.characterIds).toHaveLength(3);
    expect(result.bestTeam.total).toBe(result.maxTeamScore);
  });

  it('le meilleur trio est bien le sommet du classement', () => {
    const top3 = result.characters.slice(0, 3).map((c) => c.characterId);
    expect(result.bestTeam.characterIds).toEqual(top3);
  });

  it('identifie un jackpot parmi les personnages peu attendus', () => {
    // Bartolomeo est en présence LOW et marque : c'est le pari payant.
    expect(result.jackpot?.characterId).toBe('bartolomeo');
  });

  it('identifie un piège parmi les personnages très attendus', () => {
    // Le piège est un personnage très attendu qui ne marque rien.
    //
    // Une version antérieure affirmait « ici, pas de piège » — vrai avec 24
    // personnages, faux dès que le référentiel en compte des centaines : il
    // existe alors toujours un personnage HIGH absent du chapitre. Le
    // comportement était correct, c'est l'assertion qui reposait sur la taille
    // du référentiel. On vérifie donc l'invariant lui-même.
    const withoutStars = simulate([{ characterId: 'koby', appearances: 8 }]);
    const trap = withoutStars.trap;

    expect(trap).not.toBeNull();

    const character = CHARACTERS.find((c) => c.id === trap?.characterId);
    expect(character?.presenceExpectation).toBe('HIGH');
    expect(trap?.score.total).toBe(0);
  });

  it('ne plante pas sur un chapitre sans apparition', () => {
    const empty = simulate([]);
    expect(empty.maxTeamScore).toBe(0);
    expect(empty.jackpot).toBeNull();
    expect(empty.averageSynergyShare).toBe(0);
  });

  it('respecte le plafond de score par personnage', () => {
    const saturated = simulate(
      CHARACTERS.map((c) => ({ characterId: c.id, appearances: 40 })),
    );
    for (const entry of saturated.characters) {
      expect(entry.score.total).toBeLessThanOrEqual(100);
    }
  });
});

describe('détection d\'anomalies (§81)', () => {
  const base = [
    { characterId: 'luffy', appearances: 12 },
    { characterId: 'zoro', appearances: 7 },
    { characterId: 'nami', appearances: 5 },
    { characterId: 'usopp', appearances: 4 },
    { characterId: 'sanji', appearances: 3 },
  ];

  const analyse = (appearances: typeof base) =>
    detectAnomalies({
      appearances,
      roster: CHARACTERS,
      simulation: simulate(appearances),
    });

  it('signale un personnage hors référentiel comme critique', () => {
    const anomalies = analyse([
      ...base,
      { characterId: 'personnage-inexistant', appearances: 3 },
    ]);
    const found = anomalies.find((a) => a.kind === 'UNKNOWN_CHARACTER');
    expect(found?.severity).toBe('CRITICAL');
    expect(hasBlockingAnomaly(anomalies)).toBe(true);
  });

  it('signale un nombre d\'apparitions invraisemblable', () => {
    const anomalies = analyse([
      { characterId: 'luffy', appearances: IMPLAUSIBLE_APPEARANCES + 1 },
    ]);
    expect(anomalies.some((a) => a.kind === 'IMPLAUSIBLE_APPEARANCES')).toBe(true);
  });

  it('ne signale rien d\'anormal sur un chapitre banal', () => {
    const anomalies = analyse(base);
    expect(anomalies.filter((a) => a.severity === 'CRITICAL')).toEqual([]);
  });

  it('signale une synergie devenue majoritaire dans le score', () => {
    // Une seule apparition mais tout l'équipage présent : le score de ce
    // personnage vient presque entièrement de la synergie.
    const anomalies = analyse([
      { characterId: 'luffy', appearances: 1 },
      { characterId: 'zoro', appearances: 6 },
      { characterId: 'nami', appearances: 6 },
      { characterId: 'sanji', appearances: 6 },
      { characterId: 'robin', appearances: 6 },
    ]);
    expect(anomalies.some((a) => a.kind === 'SYNERGY_TOO_PROFITABLE')).toBe(true);
  });

  it('n\'est pas bloquant pour un simple avertissement', () => {
    const anomalies = analyse([
      { characterId: 'luffy', appearances: IMPLAUSIBLE_APPEARANCES + 1 },
    ]);
    expect(hasBlockingAnomaly(anomalies)).toBe(false);
  });
});

describe('surveillance de la méta (§13)', () => {
  const outcome = (
    characterId: string,
    score: number,
    won: boolean,
  ): CharacterOutcome => ({ characterId, score, won });

  it('calcule taux de sélection, moyenne, médiane et variance', () => {
    const stats = metaStats(
      [
        outcome('luffy', 50, true),
        outcome('luffy', 60, true),
        outcome('luffy', 55, false),
      ],
      4,
    );

    expect(stats[0].characterId).toBe('luffy');
    expect(stats[0].pickRate).toBeCloseTo(0.75);
    expect(stats[0].median).toBe(55);
    expect(stats[0].winRate).toBeCloseTo(2 / 3);
    expect(stats[0].variance).toBeGreaterThan(0);
  });

  it('gère un personnage choisi une seule fois', () => {
    const stats = metaStats([outcome('koby', 30, false)], 1);
    expect(stats[0].variance).toBe(0);
    expect(stats[0].median).toBe(30);
  });

  it('gère un classement vide', () => {
    expect(metaStats([], 0)).toEqual([]);
  });

  it('signale un personnage dominant (§14)', () => {
    const outcomes = Array.from({ length: 8 }, () =>
      outcome('luffy', 60, true),
    );
    const flags = flagMeta(metaStats(outcomes, 10));
    expect(flags.some((f) => f.flag === 'DOMINANT')).toBe(true);
  });

  it('signale un personnage « tout ou rien »', () => {
    // Moyenne tirée vers le haut par un pic, médiane basse.
    const outcomes = [
      outcome('bartolomeo', 0, false),
      outcome('bartolomeo', 0, false),
      outcome('bartolomeo', 0, false),
      outcome('bartolomeo', 5, false),
      outcome('bartolomeo', 90, true),
    ];
    const flags = flagMeta(metaStats(outcomes, 20));
    expect(flags.some((f) => f.flag === 'HIGH_VARIANCE')).toBe(true);
  });

  it('signale une stratégie sous-évaluée', () => {
    const outcomes = [
      outcome('perona', 70, true),
      outcome('perona', 65, true),
    ];
    const flags = flagMeta(metaStats(outcomes, 100));
    expect(flags.some((f) => f.flag === 'UNDERRATED')).toBe(true);
  });

  it('ne signale rien sur une méta équilibrée', () => {
    const outcomes = [
      outcome('luffy', 50, true),
      outcome('luffy', 45, false),
      outcome('zoro', 48, false),
      outcome('zoro', 52, true),
    ];
    const flags = flagMeta(metaStats(outcomes, 10));
    expect(flags).toEqual([]);
  });
});
