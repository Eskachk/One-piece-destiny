import { describe, expect, it } from 'vitest';
import {
  ADULT_AGE,
  ageOn,
  bandOf,
  isPlausibleBirthDate,
  restrictionsFor,
  restrictionsForBirthDate,
} from './age';

const MAINTENANT = new Date('2026-08-29T12:00:00Z');

describe('calcul de l’âge', () => {
  it('compte les années révolues', () => {
    expect(ageOn(new Date('2000-01-01T00:00:00Z'), MAINTENANT)).toBe(26);
  });

  it('ne compte pas un anniversaire à venir', () => {
    // Né le 30 août : la veille, il a encore un an de moins.
    expect(ageOn(new Date('2008-08-30T00:00:00Z'), MAINTENANT)).toBe(17);
  });

  it('compte l’anniversaire du jour même', () => {
    expect(ageOn(new Date('2008-08-29T00:00:00Z'), MAINTENANT)).toBe(18);
  });
});

describe('restrictions par tranche d’âge', () => {
  it('n’accorde rien en l’absence de date de naissance', () => {
    // Sans information, on ne peut pas affirmer la majorité — donc on ne
    // l'accorde pas. Ne jamais présumer favorablement.
    const restrictions = restrictionsForBirthDate(null, MAINTENANT);
    expect(restrictions.mayPurchase).toBe(false);
    expect(restrictions.mayReceiveMarketing).toBe(false);
    expect(restrictions.dailySpendCapCents).toBe(0);
  });

  it('autorise l’achat à un compte majeur', () => {
    const restrictions = restrictionsForBirthDate(
      new Date('1995-05-05T00:00:00Z'),
      MAINTENANT,
    );
    expect(restrictions.mayPurchase).toBe(true);
    expect(restrictions.dailySpendCapCents).toBeGreaterThan(0);
  });

  it('interdit l’achat et le marketing aux mineurs', () => {
    for (const naissance of ['2012-01-01', '2010-06-15']) {
      const restrictions = restrictionsForBirthDate(
        new Date(`${naissance}T00:00:00Z`),
        MAINTENANT,
      );
      expect(restrictions.mayPurchase).toBe(false);
      expect(restrictions.mayReceiveMarketing).toBe(false);
    }
  });

  it('exige un accord parental sous 16 ans', () => {
    expect(bandOf(new Date('2014-01-01T00:00:00Z'), MAINTENANT)).toBe('CHILD');
    expect(restrictionsFor('CHILD').needsParentalConsent).toBe(true);
    expect(restrictionsFor('TEEN').needsParentalConsent).toBe(false);
  });

  it('laisse le Market ouvert à tous', () => {
    // Le Market n'échange que de la monnaie de jeu : le fermer aux mineurs
    // les priverait du jeu sans les protéger de quoi que ce soit.
    for (const band of ['UNKNOWN', 'CHILD', 'TEEN', 'ADULT'] as const) {
      expect(restrictionsFor(band).mayUseMarket).toBe(true);
    }
  });

  it('n’autorise l’achat qu’aux majeurs', () => {
    const majeur = restrictionsFor('ADULT');
    expect(majeur.mayPurchase).toBe(true);

    for (const band of ['UNKNOWN', 'CHILD', 'TEEN'] as const) {
      expect(restrictionsFor(band).mayPurchase).toBe(false);
    }
  });

  it('fixe la majorité à 18 ans', () => {
    const veille = new Date('2008-08-30T00:00:00Z');
    expect(ageOn(veille, MAINTENANT)).toBe(ADULT_AGE - 1);
    expect(bandOf(veille, MAINTENANT)).toBe('TEEN');
  });
});

describe('plausibilité d’une date de naissance', () => {
  it('refuse une date future', () => {
    expect(isPlausibleBirthDate(new Date('2030-01-01T00:00:00Z'), MAINTENANT)).toBe(false);
  });

  it('refuse un âge absurde', () => {
    expect(isPlausibleBirthDate(new Date('1800-01-01T00:00:00Z'), MAINTENANT)).toBe(false);
  });

  it('refuse une date invalide', () => {
    expect(isPlausibleBirthDate(new Date('pas-une-date'), MAINTENANT)).toBe(false);
  });

  it('accepte une date ordinaire', () => {
    expect(isPlausibleBirthDate(new Date('1990-03-12T00:00:00Z'), MAINTENANT)).toBe(true);
  });
});
