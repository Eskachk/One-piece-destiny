import { describe, expect, it } from 'vitest';
import {
  evaluateReferral,
  generateReferralCode,
  MAX_REWARDED_REFERRALS,
  normalizeReferralCode,
  REFERRAL_WINDOW_MS,
} from './referral';
import {
  HISTORY_WINDOW,
  MIN_OBSERVATIONS,
  suggestCounts,
  suggestionsAsImportText,
} from '../admin/assisted-count';
import { CHARACTERS } from '../../data/characters';

const now = new Date('2026-08-28T12:00:00Z');
const ago = (ms: number) => new Date(now.getTime() - ms);

describe('parrainage (§71)', () => {
  const base = {
    referrerId: 'parrain',
    referredId: 'filleul',
    alreadyReferred: false,
    referrerRewardedCount: 0,
    referredAccountCreatedAt: ago(60_000),
    now,
  };

  it('accepte un parrainage normal et le récompense', () => {
    expect(evaluateReferral(base)).toEqual({ allowed: true, rewarded: true });
  });

  it('refuse un code inconnu', () => {
    expect(evaluateReferral({ ...base, referrerId: null })).toMatchObject({
      allowed: false,
      reason: 'UNKNOWN_CODE',
    });
  });

  it('refuse l\'auto-parrainage', () => {
    expect(
      evaluateReferral({ ...base, referrerId: 'filleul' }),
    ).toMatchObject({ allowed: false, reason: 'SELF_REFERRAL' });
  });

  it('refuse un second parrainage', () => {
    expect(evaluateReferral({ ...base, alreadyReferred: true })).toMatchObject({
      allowed: false,
      reason: 'ALREADY_REFERRED',
    });
  });

  it('refuse un compte trop ancien', () => {
    const decision = evaluateReferral({
      ...base,
      referredAccountCreatedAt: ago(REFERRAL_WINDOW_MS + 60_000),
    });
    expect(decision).toMatchObject({ allowed: false, reason: 'ACCOUNT_TOO_OLD' });
  });

  it('enregistre le lien mais cesse de récompenser au plafond', () => {
    const decision = evaluateReferral({
      ...base,
      referrerRewardedCount: MAX_REWARDED_REFERRALS,
    });
    expect(decision).toEqual({ allowed: true, rewarded: false });
  });

  it('génère des codes lisibles et variés', () => {
    const codes = new Set(Array.from({ length: 200 }, generateReferralCode));
    expect(codes.size).toBeGreaterThan(190);
    for (const code of codes) {
      // Ni 0/O ni 1/I : les codes se recopient à la main.
      expect(code).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);
    }
  });

  it('normalise la saisie', () => {
    expect(normalizeReferralCode('  ab3d-ef4g ')).toBe('AB3DEF4G');
  });
});

describe('comptage assisté (§7)', () => {
  const history = (
    entries: [number, string, number][],
  ) =>
    entries.map(([chapterNumber, characterId, appearances]) => ({
      chapterNumber,
      characterId,
      appearances,
    }));

  it('ne propose rien sans historique', () => {
    expect(suggestCounts([], CHARACTERS, 1180)).toEqual([]);
  });

  it('exige plusieurs observations avant de proposer', () => {
    const suggestions = suggestCounts(
      history([[1179, 'luffy', 10]]),
      CHARACTERS,
      1180,
    );
    expect(suggestions).toEqual([]);
  });

  it('propose la moyenne des apparitions observées', () => {
    const suggestions = suggestCounts(
      history([
        [1177, 'luffy', 10],
        [1178, 'luffy', 12],
        [1179, 'luffy', 14],
      ]),
      CHARACTERS,
      1180,
    );
    expect(suggestions[0]).toMatchObject({ characterId: 'luffy', suggested: 12 });
  });

  it('calcule la confiance sur la régularité de présence', () => {
    const suggestions = suggestCounts(
      history([
        [1177, 'luffy', 10],
        [1178, 'luffy', 10],
        [1177, 'shanks', 2],
        [1178, 'shanks', 0],
        [1179, 'shanks', 3],
      ]),
      CHARACTERS,
      1180,
    );

    const luffy = suggestions.find((s) => s.characterId === 'luffy')!;
    const shanks = suggestions.find((s) => s.characterId === 'shanks')!;
    // Luffy présent sur 2 chapitres observés sur 3, Shanks sur 2 également —
    // mais un zéro ne compte pas comme une présence.
    expect(luffy.confidence).toBeGreaterThan(0);
    expect(shanks.observed).toBe(2);
  });

  it('ignore les chapitres hors fenêtre', () => {
    const suggestions = suggestCounts(
      history([
        [1100, 'luffy', 10],
        [1101, 'luffy', 10],
      ]),
      CHARACTERS,
      1180,
    );
    expect(suggestions).toEqual([]);
  });

  it('ignore un personnage hors référentiel', () => {
    const suggestions = suggestCounts(
      history([
        [1178, 'inexistant', 5],
        [1179, 'inexistant', 5],
      ]),
      CHARACTERS,
      1180,
    );
    expect(suggestions).toEqual([]);
  });

  it('classe les suggestions les plus sûres en premier', () => {
    const suggestions = suggestCounts(
      history([
        [1176, 'luffy', 10],
        [1177, 'luffy', 10],
        [1178, 'luffy', 10],
        [1179, 'luffy', 10],
        [1178, 'koby', 2],
        [1179, 'koby', 2],
      ]),
      CHARACTERS,
      1180,
    );
    expect(suggestions[0].characterId).toBe('luffy');
    expect(suggestions[0].confidence).toBeGreaterThanOrEqual(
      suggestions[1].confidence,
    );
  });

  it('rend un texte collable dans l\'import rapide', () => {
    const suggestions = suggestCounts(
      history([
        [1178, 'luffy', 12],
        [1179, 'luffy', 12],
      ]),
      CHARACTERS,
      1180,
    );
    expect(suggestionsAsImportText(suggestions, CHARACTERS)).toBe(
      'Monkey D. Luffy 12',
    );
  });

  it('respecte les constantes annoncées', () => {
    expect(HISTORY_WINDOW).toBeGreaterThan(0);
    expect(MIN_OBSERVATIONS).toBeGreaterThanOrEqual(2);
  });
});
