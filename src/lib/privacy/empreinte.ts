import 'server-only';

import { createHash, createHmac, scryptSync } from 'node:crypto';

/**
 * Pseudonymisation des adresses IP avant écriture en base.
 *
 * ## Pourquoi
 *
 * L'adresse IP servait à trois choses, et **aucune n'a besoin de l'adresse
 * elle-même** : compter les tentatives de connexion d'une même origine,
 * repérer deux inscriptions depuis la même origine, limiter la cadence avant
 * qu'un compte existe. Toutes trois ne comparent que des égalités. Une
 * empreinte à clé secrète conserve l'égalité (même adresse, même empreinte)
 * et retire l'information (l'empreinte ne se remonte pas à l'adresse).
 *
 * Ce que ça change concrètement : celui qui lit la base — un administrateur,
 * une sauvegarde qui traîne, un accès obtenu par erreur — voit `h:9f3K…`, pas
 * `82.66.12.7`. Il ne peut ni localiser un joueur, ni recouper son adresse
 * avec un autre service.
 *
 * ## Pourquoi une clé, et laquelle
 *
 * Un simple SHA-256 ne suffit pas : l'espace des adresses IPv4 tient en
 * quatre milliards de valeurs, une table de correspondance se calcule en
 * quelques minutes. Le HMAC avec une clé qui ne vit **que dans
 * l'environnement** rend la table impossible à qui n'a pas la clé.
 *
 * La clé est dérivée de `MFA_ENCRYPTION_KEY` avec un sel qui lui est propre —
 * la clé AES des secrets TOTP et la clé HMAC des empreintes sont ainsi deux
 * clés distinctes issues du même secret, sans variable de plus à configurer
 * (une variable de plus est une variable de plus à oublier en production).
 *
 * Sans clé configurée — en développement seulement, `env-check` l'exige en
 * production — on retombe sur un hachage salé fixe : encore pseudonyme, pas
 * secret. Mieux qu'une adresse en clair, et signalé comme tel.
 */

const PREFIXE = 'h:';
/** 22 caractères base64url = 132 bits : bien assez pour ne jamais collisionner. */
const LONGUEUR = 22;

let cle: Buffer | null | undefined;

function cleEmpreinte(): Buffer | null {
  if (cle !== undefined) return cle;
  const secret = process.env.MFA_ENCRYPTION_KEY;
  cle = secret && secret.length >= 16 ? scryptSync(secret, 'opq.ip.v1', 32) : null;
  return cle;
}

/** Une valeur est-elle déjà une empreinte ? Sert à ne jamais hacher deux fois. */
export function estEmpreinte(valeur: string): boolean {
  return valeur.startsWith(PREFIXE);
}

/**
 * Empreinte d'une adresse, ou `null` si aucune adresse.
 *
 * Idempotente : une empreinte passée ici ressort inchangée, pour qu'un
 * appelant qui reçoit une valeur déjà traitée ne la dénature pas.
 */
export function empreinteIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const brut = ip.trim();
  if (brut.length === 0) return null;
  if (estEmpreinte(brut)) return brut;

  const k = cleEmpreinte();
  const condensat = k
    ? createHmac('sha256', k).update(brut).digest('base64url')
    : createHash('sha256').update(`opq.ip.v0|${brut}`).digest('base64url');

  return PREFIXE + condensat.slice(0, LONGUEUR);
}

/**
 * Forme courte pour l'affichage : assez pour reconnaître deux lignes qui
 * partagent une origine, pas de quoi transporter l'empreinte entière.
 */
export function abregerEmpreinte(valeur: string | null | undefined): string | null {
  if (!valeur) return null;
  if (!estEmpreinte(valeur)) return 'origine retirée';
  return `${valeur.slice(PREFIXE.length, PREFIXE.length + 8)}…`;
}
