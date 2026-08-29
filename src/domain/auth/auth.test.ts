import { describe, expect, it } from 'vitest';
import { checkPassword, PASSWORD_MIN_LENGTH } from './password-policy';
import {
  ATTEMPT_WINDOW_MS,
  checkAccountRateLimit,
  checkIpRateLimit,
  LOCKOUT_MS,
  MAX_ATTEMPTS_PER_ACCOUNT,
  type AttemptRecord,
} from './rate-limit';
import {
  ABSOLUTE_TIMEOUT_MS,
  evaluateSession,
  INACTIVITY_TIMEOUT_MS,
  isRecentlyAuthenticated,
  REAUTH_WINDOW_MS,
  sessionExpiresAt,
  type SessionState,
} from './session';

describe('politique de mot de passe', () => {
  it('accepte une phrase longue', () => {
    expect(checkPassword('le chapeau de paille vogue').valid).toBe(true);
  });

  it('refuse en dessous de la longueur minimale', () => {
    const result = checkPassword('a'.repeat(PASSWORD_MIN_LENGTH - 1));
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('TOO_SHORT');
  });

  it('refuse un mot de passe trop courant', () => {
    expect(checkPassword('password123').issues).toContain('TOO_COMMON');
  });

  it('refuse un caractère répété, même assez long', () => {
    expect(checkPassword('a'.repeat(20)).issues).toContain('REPEATED_CHARACTER');
  });

  it("refuse un mot de passe contenant l'adresse e-mail", () => {
    const result = checkPassword('eskanor-navigue-2026', 'eskanor@example.com');
    expect(result.issues).toContain('CONTAINS_EMAIL');
  });

  it('borne la longueur haute pour ne pas coûter cher à hacher', () => {
    expect(checkPassword('x'.repeat(500)).issues).toContain('TOO_LONG');
  });
});

describe('limitation des tentatives', () => {
  const now = new Date('2026-08-28T12:00:00Z');
  const fail = (minutesAgo: number): AttemptRecord => ({
    at: new Date(now.getTime() - minutesAgo * 60_000),
    successful: false,
  });

  it('autorise une première tentative', () => {
    const decision = checkAccountRateLimit([], now);
    expect(decision.allowed).toBe(true);
    expect(decision.remaining).toBe(MAX_ATTEMPTS_PER_ACCOUNT);
  });

  it('bloque au-delà du seuil', () => {
    const attempts = Array.from({ length: MAX_ATTEMPTS_PER_ACCOUNT }, (_, i) =>
      fail(i + 1),
    );
    const decision = checkAccountRateLimit(attempts, now);
    expect(decision.allowed).toBe(false);
    expect(decision.retryAt).toBeInstanceOf(Date);
  });

  it('ignore les échecs sortis de la fenêtre', () => {
    const old = Array.from({ length: 10 }, () => ({
      at: new Date(now.getTime() - ATTEMPT_WINDOW_MS - 60_000),
      successful: false,
    }));
    expect(checkAccountRateLimit(old, now).allowed).toBe(true);
  });

  it('remet le compteur à zéro après une connexion réussie', () => {
    const attempts: AttemptRecord[] = [
      fail(10),
      fail(9),
      fail(8),
      fail(7),
      fail(6),
      { at: new Date(now.getTime() - 5 * 60_000), successful: true },
    ];
    expect(checkAccountRateLimit(attempts, now).allowed).toBe(true);
  });

  it('libère le compte une fois le blocage écoulé', () => {
    const attempts = Array.from({ length: MAX_ATTEMPTS_PER_ACCOUNT }, () => ({
      at: new Date(now.getTime() - LOCKOUT_MS - 1000),
      successful: false,
    }));
    // Hors fenêtre d'observation : le compte est de nouveau utilisable.
    expect(checkAccountRateLimit(attempts, now).allowed).toBe(true);
  });

  it('prolonge le blocage si on insiste pendant le verrou', () => {
    const attempts = Array.from({ length: MAX_ATTEMPTS_PER_ACCOUNT }, (_, i) =>
      fail(i + 2),
    );
    const before = checkAccountRateLimit(attempts, now).retryAt!;
    const after = checkAccountRateLimit([...attempts, fail(0)], now).retryAt!;
    expect(after.getTime()).toBeGreaterThan(before.getTime());
  });

  it("tolère davantage de tentatives par IP que par compte", () => {
    const attempts = Array.from({ length: MAX_ATTEMPTS_PER_ACCOUNT + 1 }, (_, i) =>
      fail(i + 1),
    );
    expect(checkAccountRateLimit(attempts, now).allowed).toBe(false);
    expect(checkIpRateLimit(attempts, now).allowed).toBe(true);
  });
});

describe('cycle de vie des sessions', () => {
  const now = new Date('2026-08-28T12:00:00Z');
  const session = (overrides: Partial<SessionState> = {}): SessionState => ({
    createdAt: new Date(now.getTime() - 60_000),
    lastSeenAt: new Date(now.getTime() - 60_000),
    authenticatedAt: new Date(now.getTime() - 60_000),
    revokedAt: null,
    ...overrides,
  });

  it('accepte une session fraîche', () => {
    expect(evaluateSession(session(), now)).toEqual({ valid: true });
  });

  it('rejette une session révoquée', () => {
    const verdict = evaluateSession(session({ revokedAt: now }), now);
    expect(verdict).toEqual({ valid: false, reason: 'REVOKED' });
  });

  it("rejette après le délai d'inactivité", () => {
    const stale = session({
      lastSeenAt: new Date(now.getTime() - INACTIVITY_TIMEOUT_MS),
    });
    expect(evaluateSession(stale, now)).toEqual({
      valid: false,
      reason: 'INACTIVITY_TIMEOUT',
    });
  });

  it('rejette au timeout absolu, même restée active', () => {
    const old = session({
      createdAt: new Date(now.getTime() - ABSOLUTE_TIMEOUT_MS),
      lastSeenAt: now,
    });
    expect(evaluateSession(old, now)).toEqual({
      valid: false,
      reason: 'ABSOLUTE_TIMEOUT',
    });
  });

  it('exige une réauthentification passé le délai', () => {
    expect(isRecentlyAuthenticated(session(), now)).toBe(true);

    const stale = session({
      authenticatedAt: new Date(now.getTime() - REAUTH_WINDOW_MS),
    });
    expect(isRecentlyAuthenticated(stale, now)).toBe(false);
  });

  it("aligne l'expiration sur la limite la plus proche", () => {
    const fresh = session({ createdAt: new Date(now.getTime() - 1000) });
    expect(sessionExpiresAt(fresh).getTime()).toBe(
      fresh.lastSeenAt.getTime() + INACTIVITY_TIMEOUT_MS,
    );

    const nearAbsolute = session({
      createdAt: new Date(now.getTime() - ABSOLUTE_TIMEOUT_MS + 60_000),
      lastSeenAt: now,
    });
    expect(sessionExpiresAt(nearAbsolute).getTime()).toBe(
      nearAbsolute.createdAt.getTime() + ABSOLUTE_TIMEOUT_MS,
    );
  });
});
