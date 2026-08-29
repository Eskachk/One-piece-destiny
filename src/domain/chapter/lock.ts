/**
 * Verrouillage des équipes — décidé par le serveur, jamais par le client
 * (cahier §2.2 et §76).
 *
 * Règle fondamentale : les équipes sont modifiables jusqu'au dimanche
 * 23:59:59 inclus. À 00:00:00 elles ne le sont plus. La date de sortie du
 * chapitre n'influence jamais cette échéance — un spoil ou une sortie
 * anticipée ne doit pas pouvoir être exploité.
 *
 * Toutes les dates critiques sont stockées en UTC et converties à l'affichage.
 */

import type { ChapterEvent } from '../types';

/** Fuseau de référence pour l'échéance hebdomadaire annoncée aux joueurs. */
export const LOCK_TIMEZONE = 'Europe/Paris';

/** Décalage du fuseau `timeZone` à l'instant `date`, en millisecondes. */
function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);

  const at = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)!.value);

  // `hour` peut valoir 24 en hour12:false sur certains runtimes.
  const asUtc = Date.UTC(
    at('year'),
    at('month') - 1,
    at('day'),
    at('hour') % 24,
    at('minute'),
    at('second'),
  );

  return asUtc - date.getTime();
}

/** Convertit une heure murale d'un fuseau en instant UTC. */
function zonedWallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute, second);
  // Deux passes : la première estimation peut tomber du mauvais côté d'un
  // changement d'heure, la seconde corrige.
  const firstGuess = naive - timeZoneOffsetMs(new Date(naive), timeZone);
  const offset = timeZoneOffsetMs(new Date(firstGuess), timeZone);
  return new Date(naive - offset);
}

/**
 * Instant de verrouillage : le prochain dimanche 23:59:59 dans le fuseau de
 * référence, à partir de `reference`. Si `reference` est déjà un dimanche
 * avant l'échéance, c'est ce dimanche-là qui est retourné.
 */
export function nextSundayLockInstant(
  reference: Date,
  timeZone: string = LOCK_TIMEZONE,
): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(reference);

  const at = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)!.value;

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentDay = weekdays.indexOf(at('weekday'));
  const daysUntilSunday = (7 - currentDay) % 7;

  const candidate = zonedWallClockToUtc(
    Number(at('year')),
    Number(at('month')),
    Number(at('day')) + daysUntilSunday,
    23,
    59,
    59,
    timeZone,
  );

  // On est dimanche mais l'échéance est passée : viser le dimanche suivant.
  if (candidate.getTime() < reference.getTime()) {
    return new Date(candidate.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
  return candidate;
}

/** Statuts pour lesquels une équipe peut exister et être modifiée. */
const EDITABLE_STATUSES = new Set(['NORMAL', 'DELAYED']);

/**
 * Décision d'autorité : l'équipe est-elle encore modifiable ?
 * `now` doit provenir de l'horloge serveur, jamais du client.
 *
 * L'échéance est inclusive : à 23:59:59 l'équipe est encore modifiable,
 * à 00:00:00 elle ne l'est plus.
 */
export function isTeamEditable(chapter: ChapterEvent, now: Date): boolean {
  if (!EDITABLE_STATUSES.has(chapter.status)) return false;
  return now.getTime() <= chapter.teamLockAt.getTime();
}

/** Millisecondes restantes avant verrouillage (0 si déjà verrouillé). */
export function msUntilLock(chapter: ChapterEvent, now: Date): number {
  return Math.max(0, chapter.teamLockAt.getTime() - now.getTime());
}

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  locked: boolean;
}

/** Décompose le compte à rebours pour l'affichage (cahier §63). */
export function lockCountdown(chapter: ChapterEvent, now: Date): Countdown {
  const remaining = msUntilLock(chapter, now);
  const totalSeconds = Math.floor(remaining / 1000);
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
    locked: remaining === 0,
  };
}

/**
 * État anti-spoiler (cahier §3). Tant que les résultats ne sont pas publiés,
 * aucune apparition, aucun score et aucune statistique post-chapitre ne doit
 * être exposé — y compris via le Market.
 */
export type SpoilerState = 'SPOILER_LOCK' | 'CHAPTER_REVEALED';

export function spoilerState(chapter: ChapterEvent): SpoilerState {
  return chapter.status === 'RESULTS_PUBLISHED'
    ? 'CHAPTER_REVEALED'
    : 'SPOILER_LOCK';
}
