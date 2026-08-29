/**
 * Politique de mot de passe (cahier §86).
 *
 * « Raisonnable » au sens du cahier : on privilégie la longueur plutôt qu'une
 * accumulation de règles de composition. Une phrase longue bat une soupe de
 * caractères courte, et les règles agressives poussent surtout les gens à
 * réutiliser leurs mots de passe.
 */

export const PASSWORD_MIN_LENGTH = 12;
/** Borne haute : au-delà, hacher coûte cher pour rien (déni de service). */
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Mots de passe notoirement compromis. En production cette liste doit être
 * remplacée par une vérification type « Have I Been Pwned » par k-anonymat.
 */
const COMMON_PASSWORDS = new Set([
  'motdepasse',
  'password',
  'password123',
  'azertyuiop',
  'qwertyuiop',
  '123456789012',
  'onepiecequest',
  'grandlineweekly',
  'administrateur',
]);

export type PasswordIssue =
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'TOO_COMMON'
  | 'REPEATED_CHARACTER'
  | 'CONTAINS_EMAIL';

export interface PasswordCheck {
  valid: boolean;
  issues: PasswordIssue[];
}

/** Message affichable pour la première anomalie rencontrée. */
export function describePasswordIssue(issue: PasswordIssue): string {
  switch (issue) {
    case 'TOO_SHORT':
      return `Le mot de passe doit faire au moins ${PASSWORD_MIN_LENGTH} caractères.`;
    case 'TOO_LONG':
      return `Le mot de passe ne peut pas dépasser ${PASSWORD_MAX_LENGTH} caractères.`;
    case 'TOO_COMMON':
      return 'Ce mot de passe est trop courant.';
    case 'REPEATED_CHARACTER':
      return 'Évite de répéter indéfiniment le même caractère.';
    case 'CONTAINS_EMAIL':
      return 'Le mot de passe ne doit pas contenir ton adresse e-mail.';
  }
}

export function checkPassword(
  password: string,
  email?: string,
): PasswordCheck {
  const issues: PasswordIssue[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) issues.push('TOO_SHORT');
  if (password.length > PASSWORD_MAX_LENGTH) issues.push('TOO_LONG');

  if (COMMON_PASSWORDS.has(password.toLowerCase())) issues.push('TOO_COMMON');

  // « aaaaaaaaaaaa » atteint la longueur minimale sans rien valoir.
  if (/^(.)\1*$/.test(password)) issues.push('REPEATED_CHARACTER');

  if (email) {
    const local = email.split('@')[0]?.toLowerCase();
    if (local && local.length >= 3 && password.toLowerCase().includes(local)) {
      issues.push('CONTAINS_EMAIL');
    }
  }

  return { valid: issues.length === 0, issues };
}
