/**
 * Réinitialisation de mot de passe (cahier §86).
 *
 * Logique pure : durée de vie du jeton, usage unique, limitation des demandes.
 * Le stockage et l'envoi vivent dans `lib/auth`.
 *
 * Principe directeur : un jeton de réinitialisation est un mot de passe
 * temporaire. Il est donc court-vécu, à usage unique, et sa consommation
 * révoque toutes les sessions ouvertes.
 */

/** Un jeton vaut une heure : assez pour relever ses mails, pas plus. */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** Fenêtre d'observation des demandes répétées. */
export const RESET_WINDOW_MS = 15 * 60 * 1000;

/**
 * Plafonds de demandes. Volontairement bas : au-delà, on ne rend service à
 * personne — on alimente surtout le harcèlement par courriel d'une adresse
 * qu'on ne contrôle pas.
 */
export const MAX_RESETS_PER_ACCOUNT = 3;
export const MAX_RESETS_PER_IP = 10;

export interface ResetTokenState {
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
}

export type ResetTokenInvalidReason = 'EXPIRED' | 'ALREADY_USED' | 'REVOKED';

export type ResetTokenVerdict =
  | { valid: true }
  | { valid: false; reason: ResetTokenInvalidReason };

export function evaluateResetToken(
  token: ResetTokenState,
  now: Date,
): ResetTokenVerdict {
  if (token.revokedAt) return { valid: false, reason: 'REVOKED' };
  if (token.usedAt) return { valid: false, reason: 'ALREADY_USED' };
  if (now.getTime() >= token.expiresAt.getTime()) {
    return { valid: false, reason: 'EXPIRED' };
  }
  return { valid: true };
}

export function resetTokenExpiry(issuedAt: Date): Date {
  return new Date(issuedAt.getTime() + RESET_TOKEN_TTL_MS);
}

export interface ResetRateLimitDecision {
  allowed: boolean;
  remaining: number;
}

/**
 * Limite les demandes à partir des horodatages des demandes récentes.
 *
 * Note importante : quand cette limite est atteinte, l'interface doit
 * **quand même** répondre « si un compte existe, un message a été envoyé ».
 * Répondre « trop de demandes » révélerait que l'adresse est connue.
 */
export function checkResetRateLimit(
  requestedAt: Date[],
  now: Date,
  max: number,
): ResetRateLimitDecision {
  const windowStart = now.getTime() - RESET_WINDOW_MS;
  const recent = requestedAt.filter((at) => at.getTime() >= windowStart);

  return {
    allowed: recent.length < max,
    remaining: Math.max(0, max - recent.length),
  };
}
