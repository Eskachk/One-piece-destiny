import { describe, expect, it } from 'vitest';
import {
  isTeamEditable,
  lockCountdown,
  nextSundayLockInstant,
  spoilerState,
} from './lock';
import type { ChapterEvent } from '../types';

function chapter(overrides: Partial<ChapterEvent> = {}): ChapterEvent {
  return {
    id: 'ch-1180',
    chapterNumber: 1180,
    status: 'NORMAL',
    teamLockAt: new Date('2026-08-23T21:59:59Z'),
    officialReleaseAt: null,
    resultsPublishedAt: null,
    scoringVersion: 'v1.0.0',
    dataVersion: '2026.08.01',
    ...overrides,
  };
}

describe('nextSundayLockInstant', () => {
  it('vise le dimanche 23:59:59 heure de Paris', () => {
    // Jeudi 20 août 2026, heure d'été à Paris (UTC+2) → 21:59:59Z.
    const lock = nextSundayLockInstant(new Date('2026-08-20T10:00:00Z'));
    expect(lock.toISOString()).toBe('2026-08-23T21:59:59.000Z');
  });

  it("gère l'heure d'hiver (UTC+1)", () => {
    // Décembre : Paris est à UTC+1, l'échéance tombe donc à 22:59:59Z.
    const lock = nextSundayLockInstant(new Date('2026-12-10T10:00:00Z'));
    expect(lock.toISOString()).toBe('2026-12-13T22:59:59.000Z');
  });

  it('reste sur le dimanche courant si l\'échéance n\'est pas passée', () => {
    const lock = nextSundayLockInstant(new Date('2026-08-23T08:00:00Z'));
    expect(lock.toISOString()).toBe('2026-08-23T21:59:59.000Z');
  });

  it('bascule au dimanche suivant une fois l\'échéance dépassée', () => {
    const lock = nextSundayLockInstant(new Date('2026-08-23T23:00:00Z'));
    expect(lock.toISOString()).toBe('2026-08-30T21:59:59.000Z');
  });
});

describe('isTeamEditable', () => {
  const event = chapter();

  it('autorise la modification à 23:59:59 exactement', () => {
    expect(isTeamEditable(event, new Date('2026-08-23T21:59:59Z'))).toBe(true);
  });

  it('refuse la modification à 00:00:00', () => {
    expect(isTeamEditable(event, new Date('2026-08-23T22:00:00Z'))).toBe(false);
  });

  it('refuse toute requête tardive, même d\'une seconde', () => {
    expect(isTeamEditable(event, new Date('2026-08-23T21:59:59.001Z'))).toBe(false);
  });

  it('refuse la modification pendant un HIATUS', () => {
    const paused = chapter({ status: 'HIATUS' });
    expect(isTeamEditable(paused, new Date('2026-08-20T10:00:00Z'))).toBe(false);
  });

  it('reste ouvert sur un chapitre DELAYED avant échéance', () => {
    const delayed = chapter({ status: 'DELAYED' });
    expect(isTeamEditable(delayed, new Date('2026-08-20T10:00:00Z'))).toBe(true);
  });

  it("ne dépend pas de la date de sortie du chapitre", () => {
    // Chapitre déjà sorti (spoil ou sortie anticipée) mais échéance non
    // atteinte : l'équipe reste modifiable, la sortie n'influence rien.
    const early = chapter({ officialReleaseAt: new Date('2026-08-21T00:00:00Z') });
    expect(isTeamEditable(early, new Date('2026-08-22T10:00:00Z'))).toBe(true);
  });
});

describe('lockCountdown', () => {
  it('décompose le temps restant', () => {
    const c = lockCountdown(chapter(), new Date('2026-08-21T07:22:59Z'));
    expect(c).toEqual({ days: 2, hours: 14, minutes: 37, seconds: 0, locked: false });
  });

  it('signale le verrouillage une fois l\'échéance passée', () => {
    const c = lockCountdown(chapter(), new Date('2026-08-24T00:00:00Z'));
    expect(c.locked).toBe(true);
    expect(c.days).toBe(0);
  });
});

describe('spoilerState', () => {
  it('verrouille tant que les résultats ne sont pas publiés', () => {
    expect(spoilerState(chapter({ status: 'PUBLISHED' }))).toBe('SPOILER_LOCK');
  });

  it('révèle une fois les résultats publiés', () => {
    expect(spoilerState(chapter({ status: 'RESULTS_PUBLISHED' }))).toBe(
      'CHAPTER_REVEALED',
    );
  });
});
