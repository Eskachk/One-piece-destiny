import { describe, expect, it } from 'vitest';
import {
  checkResetRateLimit,
  evaluateResetToken,
  MAX_RESETS_PER_ACCOUNT,
  RESET_TOKEN_TTL_MS,
  RESET_WINDOW_MS,
  resetTokenExpiry,
  type ResetTokenState,
} from './password-reset';

const now = new Date('2026-08-28T12:00:00Z');

function token(overrides: Partial<ResetTokenState> = {}): ResetTokenState {
  return {
    expiresAt: new Date(now.getTime() + 60_000),
    usedAt: null,
    revokedAt: null,
    ...overrides,
  };
}

describe('durée de vie du jeton', () => {
  it('vaut une heure à partir de son émission', () => {
    expect(resetTokenExpiry(now).getTime()).toBe(now.getTime() + RESET_TOKEN_TTL_MS);
  });

  it('accepte un jeton frais', () => {
    expect(evaluateResetToken(token(), now)).toEqual({ valid: true });
  });

  it('refuse un jeton expiré', () => {
    const expired = token({ expiresAt: now });
    expect(evaluateResetToken(expired, now)).toEqual({
      valid: false,
      reason: 'EXPIRED',
    });
  });

  it('refuse un jeton déjà consommé', () => {
    const used = token({ usedAt: new Date(now.getTime() - 1000) });
    expect(evaluateResetToken(used, now)).toEqual({
      valid: false,
      reason: 'ALREADY_USED',
    });
  });

  it('refuse un jeton révoqué', () => {
    const revoked = token({ revokedAt: new Date(now.getTime() - 1000) });
    expect(evaluateResetToken(revoked, now)).toEqual({
      valid: false,
      reason: 'REVOKED',
    });
  });

  it('donne la priorité à la révocation sur l\'expiration', () => {
    const both = token({ expiresAt: now, revokedAt: now });
    expect(evaluateResetToken(both, now)).toEqual({
      valid: false,
      reason: 'REVOKED',
    });
  });
});

describe('limitation des demandes', () => {
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000);

  it('autorise une première demande', () => {
    const decision = checkResetRateLimit([], now, MAX_RESETS_PER_ACCOUNT);
    expect(decision.allowed).toBe(true);
    expect(decision.remaining).toBe(MAX_RESETS_PER_ACCOUNT);
  });

  it('bloque au-delà du plafond', () => {
    const requests = Array.from({ length: MAX_RESETS_PER_ACCOUNT }, (_, i) =>
      ago(i + 1),
    );
    expect(checkResetRateLimit(requests, now, MAX_RESETS_PER_ACCOUNT).allowed).toBe(
      false,
    );
  });

  it('ignore les demandes sorties de la fenêtre', () => {
    const old = Array.from(
      { length: 10 },
      () => new Date(now.getTime() - RESET_WINDOW_MS - 60_000),
    );
    expect(checkResetRateLimit(old, now, MAX_RESETS_PER_ACCOUNT).allowed).toBe(true);
  });

  it('décompte les demandes restantes', () => {
    expect(
      checkResetRateLimit([ago(1)], now, MAX_RESETS_PER_ACCOUNT).remaining,
    ).toBe(MAX_RESETS_PER_ACCOUNT - 1);
  });
});
