import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * TOTP — mots de passe à usage unique basés sur le temps (RFC 6238),
 * pour la double authentification administrateur (cahier §86).
 *
 * Choix du TOTP plutôt que du SMS : pas de dépendance à un opérateur, pas de
 * coût par message, et surtout aucune exposition au détournement de carte SIM.
 * N'importe quelle application d'authentification fait l'affaire.
 *
 * Implémentation volontairement explicite plutôt qu'une dépendance de plus :
 * l'algorithme tient en trente lignes et est validé ici contre les vecteurs
 * de test de la RFC.
 */

/** Durée de vie d'un code, en secondes. */
export const TIME_STEP_SECONDS = 30;

/** Nombre de chiffres affichés. */
export const DIGITS = 6;

/**
 * Tolérance, en pas de temps, de part et d'autre de l'instant courant.
 * ±1 absorbe une horloge décalée de moins de 30 s sans élargir sérieusement
 * la fenêtre d'attaque.
 */
export const DRIFT_STEPS = 1;

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** Encode des octets en base32 (RFC 4648), sans remplissage. */
export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

/** Décode une chaîne base32. Tolère espaces, minuscules et remplissage. */
export function base32Decode(input: string): Uint8Array {
  const cleaned = input.toUpperCase().replace(/[\s=]/g, '');
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;

  for (const char of cleaned) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) throw new Error('Secret base32 invalide.');

    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Uint8Array.from(bytes);
}

/** Numéro du pas de temps courant. */
export function timeStep(now: Date, stepSeconds = TIME_STEP_SECONDS): number {
  return Math.floor(now.getTime() / 1000 / stepSeconds);
}

/** HOTP (RFC 4226) : le code pour un compteur donné. */
export function generateHotp(
  secret: Uint8Array,
  counter: number,
  digits = DIGITS,
): string {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac('sha1', Buffer.from(secret)).update(buffer).digest();

  // Troncature dynamique : les 4 bits de poids faible désignent l'offset.
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    (digest[offset + 1] << 16) |
    (digest[offset + 2] << 8) |
    digest[offset + 3];

  return String(binary % 10 ** digits).padStart(digits, '0');
}

/** Code attendu à un instant donné. */
export function generateTotp(
  secret: Uint8Array,
  now: Date,
  digits = DIGITS,
): string {
  return generateHotp(secret, timeStep(now), digits);
}

export interface TotpVerification {
  valid: boolean;
  /** Pas de temps ayant validé le code, à mémoriser contre le rejeu. */
  step: number | null;
}

/**
 * Vérifie un code saisi.
 *
 * `lastUsedStep` interdit le rejeu : un code déjà consommé reste invalide
 * pendant les 30 secondes où il serait sinon encore accepté. Sans cela,
 * intercepter un code une fois suffirait à le réutiliser.
 */
export function verifyTotp(
  secret: Uint8Array,
  code: string,
  now: Date,
  lastUsedStep: number | null = null,
  digits = DIGITS,
): TotpVerification {
  const cleaned = code.replace(/\s/g, '');
  if (!new RegExp(`^\\d{${digits}}$`).test(cleaned)) {
    return { valid: false, step: null };
  }

  const current = timeStep(now);

  for (let offset = -DRIFT_STEPS; offset <= DRIFT_STEPS; offset += 1) {
    const step = current + offset;
    if (lastUsedStep !== null && step <= lastUsedStep) continue;

    if (constantTimeEquals(generateHotp(secret, step, digits), cleaned)) {
      return { valid: true, step };
    }
  }

  return { valid: false, step: null };
}

/** Comparaison à temps constant : ne pas fuiter le préfixe correct d'un code. */
function constantTimeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

/**
 * URI `otpauth://` à encoder en QR code.
 *
 * @param issuer  nom affiché dans l'application d'authentification
 * @param account identifiant du compte, généralement l'adresse e-mail
 */
export function otpauthUri(
  secret: Uint8Array,
  issuer: string,
  account: string,
): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret: base32Encode(secret),
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(TIME_STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** Secret présenté par groupes de 4, pour la saisie manuelle. */
export function formatSecretForDisplay(secret: Uint8Array): string {
  return base32Encode(secret).replace(/(.{4})/g, '$1 ').trim();
}
