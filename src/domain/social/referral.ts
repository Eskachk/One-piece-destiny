/**
 * Parrainage (cahier §71).
 *
 * « Rester simple. Inviter un ami → petite récompense pour les deux. Limiter
 * les abus et éviter les systèmes de spam. »
 *
 * Trois garde-fous en découlent :
 *
 *   1. la récompense est **petite et unique** — pas de pyramide où parrainer
 *      devient plus rentable que jouer ;
 *   2. un filleul ne peut être parrainé qu'une fois, jamais par lui-même ;
 *   3. un plafond de filleuls récompensés, pour qu'un générateur de comptes
 *      ne devienne pas une source de revenus.
 */

export const REFERRAL_BERRIES_REFERRER = 300;
export const REFERRAL_BERRIES_REFERRED = 300;

/** Au-delà, les parrainages restent enregistrés mais ne rapportent plus. */
export const MAX_REWARDED_REFERRALS = 10;

const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LENGTH = 8;

/**
 * Code lisible : ni voyelles ni caractères ambigus (0/O, 1/I).
 *
 * Utilise l'API Web Crypto plutôt que `node:crypto` : ce module est importé
 * par un composant client pour ses constantes, et une dépendance Node y
 * casserait le bundle navigateur.
 *
 * Le rejet des valeurs hors du plus grand multiple de l'alphabet évite le
 * biais modulo : sans lui, les premières lettres sortiraient plus souvent.
 */
export function generateReferralCode(): string {
  const limit = Math.floor(256 / CODE_ALPHABET.length) * CODE_ALPHABET.length;
  let code = '';

  while (code.length < CODE_LENGTH) {
    const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
    for (const byte of bytes) {
      if (byte >= limit) continue;
      code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
      if (code.length === CODE_LENGTH) break;
    }
  }

  return code;
}

export function normalizeReferralCode(input: string): string {
  return input.trim().toUpperCase().replace(/[\s-]/g, '');
}

export type ReferralRefusal =
  | 'UNKNOWN_CODE'
  | 'SELF_REFERRAL'
  | 'ALREADY_REFERRED'
  | 'ACCOUNT_TOO_OLD';

export type ReferralDecision =
  | { allowed: true; rewarded: boolean }
  | { allowed: false; reason: ReferralRefusal };

/**
 * Fenêtre pendant laquelle un nouveau compte peut saisir un code.
 *
 * Sans elle, un joueur installé pourrait se faire parrainer après coup par un
 * complice : le parrainage récompenserait alors une inscription qui a déjà eu
 * lieu.
 */
export const REFERRAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface ReferralContext {
  referrerId: string | null;
  referredId: string;
  alreadyReferred: boolean;
  /** Parrainages déjà récompensés du parrain. */
  referrerRewardedCount: number;
  referredAccountCreatedAt: Date;
  now: Date;
}

export function evaluateReferral(
  context: ReferralContext,
): ReferralDecision {
  if (!context.referrerId) {
    return { allowed: false, reason: 'UNKNOWN_CODE' };
  }
  if (context.referrerId === context.referredId) {
    return { allowed: false, reason: 'SELF_REFERRAL' };
  }
  if (context.alreadyReferred) {
    return { allowed: false, reason: 'ALREADY_REFERRED' };
  }

  const age =
    context.now.getTime() - context.referredAccountCreatedAt.getTime();
  if (age > REFERRAL_WINDOW_MS) {
    return { allowed: false, reason: 'ACCOUNT_TOO_OLD' };
  }

  // Le lien est enregistré même au-delà du plafond : seule la récompense
  // s'arrête. On garde ainsi la traçabilité sans encourager le volume.
  return {
    allowed: true,
    rewarded: context.referrerRewardedCount < MAX_REWARDED_REFERRALS,
  };
}

export function describeReferralRefusal(reason: ReferralRefusal): string {
  switch (reason) {
    case 'UNKNOWN_CODE':
      return 'Ce code de parrainage est inconnu.';
    case 'SELF_REFERRAL':
      return 'Tu ne peux pas te parrainer toi-même.';
    case 'ALREADY_REFERRED':
      return 'Tu as déjà été parrainé.';
    case 'ACCOUNT_TOO_OLD':
      return 'Le parrainage se saisit dans les 7 jours suivant l\'inscription.';
  }
}
