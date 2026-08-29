import 'server-only';

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'node:crypto';

/**
 * Chiffrement des secrets applicatifs au repos.
 *
 * Utilisé pour le secret TOTP (cahier §86) : quiconque lit la table
 * `user_accounts` peut sinon générer les codes à six chiffres de n'importe
 * quel administrateur, ce qui réduit la double authentification à un seul
 * facteur.
 *
 * AES-256-GCM : chiffre **et** authentifie. Un secret modifié en base est
 * rejeté au déchiffrement au lieu d'être silencieusement accepté.
 *
 * ⚠️ La clé vit dans l'environnement, jamais en base. Si les deux étaient au
 * même endroit, le chiffrement ne protégerait plus de rien.
 */

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc.v1.';

let cachedKey: Buffer | null = null;

function encryptionKey(): Buffer | null {
  if (cachedKey) return cachedKey;

  const secret = process.env.MFA_ENCRYPTION_KEY;
  if (!secret || secret.length < 16) return null;

  // Dérivation : la variable d'environnement peut être une phrase, la clé
  // AES doit faire exactement 32 octets.
  cachedKey = scryptSync(secret, 'opq.mfa.v1', 32);
  return cachedKey;
}

export function isEncryptionConfigured(): boolean {
  return encryptionKey() !== null;
}

/**
 * Chiffre une valeur. Sans clé configurée, retourne la valeur telle quelle :
 * l'application reste fonctionnelle, et `isEncryptionConfigured` permet de
 * le signaler plutôt que de le cacher.
 */
export function seal(plaintext: string): string {
  const key = encryptionKey();
  if (!key) return plaintext;

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return (
    PREFIX +
    [iv, tag, encrypted].map((part) => part.toString('base64url')).join('.')
  );
}

/**
 * Déchiffre une valeur.
 *
 * Accepte aussi les valeurs en clair : les secrets créés avant l'introduction
 * du chiffrement doivent continuer à fonctionner, sinon activer le
 * chiffrement enfermerait dehors tous les administrateurs existants.
 */
export function open(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored;

  const key = encryptionKey();
  if (!key) {
    throw new Error(
      'Secret chiffré mais MFA_ENCRYPTION_KEY absente : impossible de le lire.',
    );
  }

  const [ivPart, tagPart, dataPart] = stored.slice(PREFIX.length).split('.');
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivPart, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));

  return (
    decipher.update(Buffer.from(dataPart, 'base64url')).toString('utf8') +
    decipher.final('utf8')
  );
}

/** La valeur stockée est-elle encore en clair ? Sert au diagnostic. */
export function isSealed(stored: string): boolean {
  return stored.startsWith(PREFIX);
}
