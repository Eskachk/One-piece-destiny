import { describe, expect, it } from 'vitest';
import { traduireMessage } from './locales';
import { ACTION_FAILURE_MESSAGE } from '@/components/attempt';
import { RESTRICTION_MESSAGE } from '@/domain/antiabuse/engine';
import { describeCraftRefusal } from '@/domain/collection/crafting';
import { describePriceRefusal } from '@/domain/market/pricing';
import {
  describeListingRefusal,
  describePurchaseRefusal,
} from '@/domain/market/anti-manipulation';
import {
  chapterCorrected,
  crewLockSoon,
  crewLocked,
  resultsComputing,
  resultsReady,
  rewardReceived,
  securityAlert,
} from '@/domain/notifications/notifications';

/**
 * Chaque message que le serveur émet doit avoir sa forme anglaise.
 *
 * Le dictionnaire est écrit à la main d'après le code : rien ne garantit
 * qu'une virgule n'a pas bougé d'un côté. Ce test fait passer les vrais
 * messages — ceux que les fonctions produisent — par la recherche inverse, et
 * refuse qu'un seul ressorte en français.
 */

const anglais = (message: string) => {
  const traduit = traduireMessage('en', message);
  expect(traduit, message).not.toBe(message);
  expect(traduit, message).not.toMatch(/[éèêàçù]/);
  return traduit;
};

describe('messages du serveur, retraduits', () => {
  it('les refus du domaine', () => {
    anglais(ACTION_FAILURE_MESSAGE);
    anglais(RESTRICTION_MESSAGE);
    for (const r of ['ALREADY_OWNED', 'NOT_ENOUGH_SHARDS', 'UNKNOWN_CHARACTER'] as const) {
      anglais(describeCraftRefusal(r));
    }
    for (const r of ['COOLDOWN', 'TOO_MANY_CANCELLATIONS', 'RECENTLY_PURCHASED'] as const) {
      anglais(describeListingRefusal(r));
    }
    for (const r of ['OWN_LISTING', 'ALREADY_OWNED', 'LINKED_ACCOUNT', 'WASH_TRADING'] as const) {
      anglais(describePurchaseRefusal(r));
    }
    anglais(describePriceRefusal({ valid: false, reason: 'NOT_INTEGER', floor: 1, ceiling: 2 }));
    expect(anglais(describePriceRefusal({ valid: false, reason: 'BELOW_FLOOR', floor: 40, ceiling: 2 }))).toBe(
      'Minimum price for this rarity: 40 🪙.',
    );
    anglais(describePriceRefusal({ valid: false, reason: 'ABOVE_CEILING', floor: 1, ceiling: 900 }));
  });

  it('les freins de cadence, aux trois formes', () => {
    // `action-throttle` est réservé au serveur ; ses phrases sont recopiées.
    anglais('Trop de tentatives. Réessaie dans un instant.');
    expect(anglais('Trop de tentatives. Réessaie dans 1 seconde.')).toBe(
      'Too many attempts. Try again in 1 second.',
    );
    expect(anglais('Trop de tentatives. Réessaie dans 30 secondes.')).toBe(
      'Too many attempts. Try again in 30 seconds.',
    );
    expect(anglais('Trop de tentatives. Réessaie dans 10 minutes.')).toBe(
      'Too many attempts. Try again in 10 minutes.',
    );
  });

  it('les notifications', () => {
    const drafts = [
      crewLockSoon('p', 'c'),
      crewLocked('p', 'c'),
      resultsComputing('p', 'c'),
      resultsReady('p', 'c', 1130),
      rewardReceived('p', 'c', 500, 0),
      rewardReceived('p', 'c', 0, 1),
      rewardReceived('p', 'c', 500, 2),
      chapterCorrected('p', 'c', 1130, 'raison', 'x'),
      securityAlert('p', 'MFA_ENABLED', new Date()),
    ];
    for (const draft of drafts) {
      anglais(draft.title);
      if (draft.body && draft.body !== 'raison') anglais(draft.body);
    }
    expect(traduireMessage('en', rewardReceived('p', 'c', 500, 2).title)).toBe(
      '🎁 Reward: 500 Berries and 2 chests.',
    );
  });
});
