/**
 * Politique de remise des e-mails.
 *
 * Le projet n'a ni Redis, ni BullMQ, ni worker permanent — et en introduire
 * un pour quelques messages hebdomadaires coûterait plus qu'il ne rapporte.
 * La file vit donc dans Postgres, qui est déjà là et déjà transactionnel.
 * Ce module contient la partie décisionnelle, sans base ni réseau, pour
 * qu'elle soit vérifiable sans rien brancher.
 */

/** Au-delà, le message part en lettre morte plutôt que de tourner sans fin. */
export const MAX_ATTEMPTS = 5;

/** Palier de base du délai exponentiel. */
export const BASE_DELAY_MS = 30_000;

/** Plafond : un message ne doit pas être repoussé de plusieurs heures. */
export const MAX_DELAY_MS = 15 * 60 * 1000;

/**
 * Une panne de fournisseur mérite un réessai ; une adresse invalide n'en
 * mérite aucun. Distinguer les deux évite d'épuiser cinq tentatives — et de
 * salir la réputation d'envoi — sur un message qui n'arrivera jamais.
 */
export type FailureKind = 'TRANSIENT' | 'PERMANENT';

export interface Attempt {
  attempts: number;
  failure: FailureKind;
}

export type NextStep =
  | { action: 'RETRY'; delayMs: number; attempt: number }
  | { action: 'DEAD_LETTER'; reason: string };

/**
 * Délai avant la n-ième tentative : 30 s, 1 min, 2 min, 4 min… plafonné.
 *
 * Le décalage aléatoire (« jitter ») évite que cent messages échoués au même
 * instant ne repartent tous ensemble et ne remettent le fournisseur à terre.
 */
export function backoffMs(attempt: number, random: () => number = Math.random): number {
  const exponential = Math.min(BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1), MAX_DELAY_MS);
  // ±20 % autour de la valeur nominale.
  const jitter = exponential * 0.2 * (random() * 2 - 1);
  return Math.max(1_000, Math.round(exponential + jitter));
}

export function nextStep(
  attempt: Attempt,
  random: () => number = Math.random,
): NextStep {
  if (attempt.failure === 'PERMANENT') {
    return {
      action: 'DEAD_LETTER',
      reason: 'Échec définitif : adresse refusée par le fournisseur.',
    };
  }

  if (attempt.attempts >= MAX_ATTEMPTS) {
    return {
      action: 'DEAD_LETTER',
      reason: `Abandon après ${MAX_ATTEMPTS} tentatives.`,
    };
  }

  return {
    action: 'RETRY',
    attempt: attempt.attempts + 1,
    delayMs: backoffMs(attempt.attempts + 1, random),
  };
}

/**
 * Classe une erreur de fournisseur.
 *
 * En cas de doute, on considère l'échec **temporaire** : réessayer un message
 * livrable est bénin, abandonner un message livrable ne l'est pas.
 */
export function classifyStatus(status: number): FailureKind {
  // 429 et 5xx : le fournisseur est débordé ou en panne.
  if (status === 429 || status >= 500) return 'TRANSIENT';
  // 4xx : la requête elle-même est fautive (adresse, domaine, quota dépassé).
  if (status >= 400) return 'PERMANENT';
  return 'TRANSIENT';
}

/**
 * Validation d'adresse avant mise en file.
 *
 * Volontairement stricte sur un point : **aucun retour chariot ni saut de
 * ligne**. C'est la porte d'entrée de l'injection d'en-têtes, où une adresse
 * du type `a@b.c\nBcc: victime@exemple.fr` ajoute un destinataire caché.
 */
export function isSendableAddress(address: string): boolean {
  if (/[\r\n\0]/.test(address)) return false;
  if (address.length > 254) return false;
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(address);
}
