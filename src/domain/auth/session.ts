/**
 * Cycle de vie des sessions (cahier §85).
 *
 * Deux expirations complémentaires :
 *
 *   - inactivité : une session oubliée sur un poste partagé se ferme seule ;
 *   - absolue    : même active en permanence, une session finit par expirer,
 *                  ce qui borne la valeur d'un cookie volé.
 *
 * La décision est prise ici, à partir de dates fournies — jamais à partir de
 * l'horloge du client.
 */

export const INACTIVITY_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 h
export const ABSOLUTE_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

/**
 * Délai au-delà duquel une action critique exige une réauthentification
 * (cahier §86) : changement d'e-mail ou de mot de passe, achat, publication
 * des résultats.
 */
export const REAUTH_WINDOW_MS = 15 * 60 * 1000;

export interface SessionState {
  createdAt: Date;
  lastSeenAt: Date;
  /** Dernière saisie effective du mot de passe. */
  authenticatedAt: Date;
  revokedAt: Date | null;
}

export type SessionInvalidReason =
  | 'REVOKED'
  | 'INACTIVITY_TIMEOUT'
  | 'ABSOLUTE_TIMEOUT';

export type SessionVerdict =
  | { valid: true }
  | { valid: false; reason: SessionInvalidReason };

export function evaluateSession(
  session: SessionState,
  now: Date,
): SessionVerdict {
  if (session.revokedAt) {
    return { valid: false, reason: 'REVOKED' };
  }

  if (now.getTime() - session.createdAt.getTime() >= ABSOLUTE_TIMEOUT_MS) {
    return { valid: false, reason: 'ABSOLUTE_TIMEOUT' };
  }

  if (now.getTime() - session.lastSeenAt.getTime() >= INACTIVITY_TIMEOUT_MS) {
    return { valid: false, reason: 'INACTIVITY_TIMEOUT' };
  }

  return { valid: true };
}

/**
 * L'authentification est-elle assez fraîche pour une action critique ?
 * Une session valide ne suffit pas : il faut avoir saisi son mot de passe
 * récemment.
 */
export function isRecentlyAuthenticated(
  session: SessionState,
  now: Date,
): boolean {
  return now.getTime() - session.authenticatedAt.getTime() < REAUTH_WINDOW_MS;
}

/** Expiration du cookie, alignée sur la plus proche des deux limites. */
export function sessionExpiresAt(session: SessionState): Date {
  return new Date(
    Math.min(
      session.createdAt.getTime() + ABSOLUTE_TIMEOUT_MS,
      session.lastSeenAt.getTime() + INACTIVITY_TIMEOUT_MS,
    ),
  );
}
