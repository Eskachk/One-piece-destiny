import { describe, expect, it } from 'vitest';
import {
  applyPreferenceUpdate,
  CATEGORY_OF,
  channelsFor,
  DEFAULT_PREFERENCES,
  isMandatory,
} from './preferences';
import type { NotificationKind } from './notifications';

const ALL_KINDS: NotificationKind[] = [
  'CREW_LOCK_SOON',
  'CREW_LOCKED',
  'RESULTS_COMPUTING',
  'RESULTS_READY',
  'CHAPTER_CORRECTED',
  'REWARD_RECEIVED',
  'SECURITY_ALERT',
];

describe('préférences de notification', () => {
  it('classe chaque type de notification', () => {
    // Un type sans catégorie serait routé vers aucun canal, donc perdu en
    // silence.
    for (const kind of ALL_KINDS) {
      expect(CATEGORY_OF[kind]).toBeDefined();
    }
  });

  it('ne propose pas le marketing par défaut', () => {
    // Le consentement à la prospection ne se présume pas.
    expect(DEFAULT_PREFERENCES.marketingEmail).toBe(false);
  });

  it('active les notifications de service par défaut', () => {
    expect(DEFAULT_PREFERENCES.weeklyInApp).toBe(true);
    expect(DEFAULT_PREFERENCES.rewardsEmail).toBe(true);
  });

  it('envoie toujours les alertes de sécurité, préférences coupées', () => {
    const toutCoupe = {
      weeklyEmail: false,
      rewardsEmail: false,
      marketingEmail: false,
      weeklyInApp: false,
      rewardsInApp: false,
    };

    // Un attaquant disposant d'une session ne doit pas pouvoir éteindre
    // l'alarme avant d'agir.
    expect(channelsFor('SECURITY_ALERT', toutCoupe)).toEqual(['IN_APP', 'EMAIL']);
    expect(isMandatory('SECURITY')).toBe(true);
  });

  it('respecte le refus des e-mails hebdomadaires', () => {
    const canaux = channelsFor('RESULTS_READY', {
      ...DEFAULT_PREFERENCES,
      weeklyEmail: false,
    });
    expect(canaux).toEqual(['IN_APP']);
  });

  it('respecte le refus complet d’une catégorie facultative', () => {
    const canaux = channelsFor('REWARD_RECEIVED', {
      ...DEFAULT_PREFERENCES,
      rewardsEmail: false,
      rewardsInApp: false,
    });
    expect(canaux).toEqual([]);
  });

  it('n’envoie jamais de marketing en in-app', () => {
    // Une annonce commerciale ne doit pas se mêler aux notifications de jeu.
    for (const kind of ALL_KINDS) {
      if (CATEGORY_OF[kind] !== 'MARKETING') continue;
      expect(channelsFor(kind, { ...DEFAULT_PREFERENCES, marketingEmail: true })).not.toContain(
        'IN_APP',
      );
    }
  });

  it('ignore les champs inconnus d’une mise à jour', () => {
    // Le formulaire vient du navigateur : rien d'inattendu ne doit être écrit.
    const next = applyPreferenceUpdate(DEFAULT_PREFERENCES, {
      weeklyEmail: false,
      estAdministrateur: true,
      berries: 999_999,
    });

    expect(next.weeklyEmail).toBe(false);
    expect(Object.keys(next).sort()).toEqual(Object.keys(DEFAULT_PREFERENCES).sort());
  });

  it('ignore les valeurs de type incorrect', () => {
    const next = applyPreferenceUpdate(DEFAULT_PREFERENCES, {
      weeklyEmail: 'oui',
      rewardsEmail: 1,
    });
    expect(next.weeklyEmail).toBe(DEFAULT_PREFERENCES.weeklyEmail);
    expect(next.rewardsEmail).toBe(DEFAULT_PREFERENCES.rewardsEmail);
  });
});
