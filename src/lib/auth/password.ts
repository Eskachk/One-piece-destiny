import 'server-only';

import { hash, verify } from '@node-rs/argon2';

/**
 * Hachage des mots de passe (cahier §86).
 *
 * Argon2id : résistant aux attaques par GPU et par canal auxiliaire. Les
 * paramètres suivent les recommandations OWASP (19 MiB, 2 itérations,
 * parallélisme 1) et doivent être réévalués périodiquement.
 */

const OPTIONS = {
  memoryCost: 19_456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, OPTIONS);
}

/**
 * Vérifie un mot de passe.
 *
 * Ne propage jamais d'exception : une empreinte corrompue en base doit se
 * traduire par un échec d'authentification, pas par une erreur 500 qui
 * révélerait que le compte existe.
 */
export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, password, OPTIONS);
  } catch {
    return false;
  }
}

/**
 * Empreinte factice, utilisée quand le compte n'existe pas.
 *
 * Sans elle, une adresse inconnue répondrait instantanément alors qu'une
 * adresse connue paierait le coût d'Argon2 : l'écart de temps suffirait à
 * énumérer les comptes. On vérifie donc toujours une vraie empreinte.
 *
 * Elle est calculée une seule fois, à la première demande, à partir d'une
 * valeur aléatoire que personne ne connaît.
 */
let dummyHash: Promise<string> | null = null;

export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(crypto.randomUUID() + crypto.randomUUID());
  return dummyHash;
}
