/**
 * Limitation des tentatives de connexion (cahier §86, §98).
 *
 * Fonctions pures : elles décident à partir d'un état fourni, sans toucher au
 * stockage. Cela les rend testables et réutilisables aussi bien pour le login
 * que pour la réinitialisation de mot de passe.
 *
 * Deux compteurs distincts, parce qu'ils protègent de deux attaques
 * différentes :
 *
 *   - par compte  → force brute sur un mot de passe précis ;
 *   - par IP      → balayage de nombreux comptes depuis une même source
 *                   (« password spraying »).
 */

export const MAX_ATTEMPTS_PER_ACCOUNT = 5;
export const MAX_ATTEMPTS_PER_IP = 20;

/** Fenêtre d'observation des échecs. */
export const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

/** Durée de blocage une fois le seuil franchi. */
export const LOCKOUT_MS = 15 * 60 * 1000;

export interface AttemptRecord {
  at: Date;
  successful: boolean;
}

export interface RateLimitDecision {
  allowed: boolean;
  /** Instant auquel une nouvelle tentative redevient possible. */
  retryAt: Date | null;
  remaining: number;
}

/**
 * Ne conserve que les échecs postérieurs à la dernière connexion réussie et
 * situés dans la fenêtre : une connexion réussie remet le compteur à zéro.
 */
function recentFailures(attempts: AttemptRecord[], now: Date): AttemptRecord[] {
  const windowStart = now.getTime() - ATTEMPT_WINDOW_MS;

  const sorted = [...attempts].sort((a, b) => a.at.getTime() - b.at.getTime());
  const lastSuccess = sorted.filter((a) => a.successful).at(-1);

  return sorted.filter(
    (attempt) =>
      !attempt.successful &&
      attempt.at.getTime() >= windowStart &&
      (!lastSuccess || attempt.at.getTime() > lastSuccess.at.getTime()),
  );
}

function evaluate(
  attempts: AttemptRecord[],
  now: Date,
  max: number,
): RateLimitDecision {
  const failures = recentFailures(attempts, now);

  if (failures.length < max) {
    return { allowed: true, retryAt: null, remaining: max - failures.length };
  }

  // Le blocage court à partir du dernier échec, pas du premier : insister
  // pendant le blocage prolonge l'attente.
  const lastFailure = failures.at(-1)!;
  const retryAt = new Date(lastFailure.at.getTime() + LOCKOUT_MS);

  if (now.getTime() >= retryAt.getTime()) {
    return { allowed: true, retryAt: null, remaining: max };
  }

  return { allowed: false, retryAt, remaining: 0 };
}

export function checkAccountRateLimit(
  attempts: AttemptRecord[],
  now: Date,
): RateLimitDecision {
  return evaluate(attempts, now, MAX_ATTEMPTS_PER_ACCOUNT);
}

export function checkIpRateLimit(
  attempts: AttemptRecord[],
  now: Date,
): RateLimitDecision {
  return evaluate(attempts, now, MAX_ATTEMPTS_PER_IP);
}
