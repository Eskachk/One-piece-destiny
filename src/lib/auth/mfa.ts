import 'server-only';

import { randomBytes, randomInt } from 'node:crypto';
import { base32Decode, otpauthUri, verifyTotp } from '@/domain/auth/totp';
import { db } from '@/lib/supabase-admin';
import { hashPassword, verifyPassword } from './password';
import { isSealed, open, seal } from './secret-box';
import { notifySecurityEvent } from '@/lib/notifications/security';

/**
 * Double authentification administrateur (cahier §86).
 *
 * Le facteur retenu est le TOTP : aucune dépendance opérateur, aucun coût par
 * message, et pas d'exposition au détournement de carte SIM.
 */

export const ISSUER = 'One Piece Quest';

/** 20 octets = 160 bits, la taille recommandée par la RFC 4226. */
const SECRET_BYTES = 20;

const RECOVERY_CODE_COUNT = 10;

/**
 * Codes de secours en base32 sans voyelles ni caractères ambigus, pour
 * qu'ils restent recopiables à la main sans confondre 0/O ou 1/I.
 */
const RECOVERY_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function generateRecoveryCode(): string {
  let code = '';
  for (let i = 0; i < 10; i += 1) {
    code += RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)];
  }
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

export interface MfaEnrollment {
  /** À encoder en QR code. */
  uri: string;
  /** Secret base32, pour la saisie manuelle si le QR ne passe pas. */
  secret: string;
}

/**
 * Prépare une inscription à la MFA.
 *
 * Le secret est enregistré mais `mfa_enabled` reste faux : tant qu'un premier
 * code n'a pas été vérifié, on ne verrouille pas le compte sur un secret qui
 * aurait pu être mal recopié.
 */
export async function beginEnrollment(
  userId: string,
  email: string,
): Promise<MfaEnrollment> {
  const { base32Decode, base32Encode } = await import('@/domain/auth/totp');

  // Le secret ne doit surtout PAS être régénéré à chaque appel : la page
  // d'inscription est rendue à chaque visite, et un nouveau secret rendrait
  // caduc celui que l'utilisateur vient de scanner. On réutilise donc le
  // secret en attente tant que la MFA n'est pas activée.
  const { data: account } = await db()
    .from('user_accounts')
    .select('mfa_secret, mfa_enabled')
    .eq('id', userId)
    .maybeSingle();

  if (account?.mfa_secret && !account.mfa_enabled) {
    const pending = open(account.mfa_secret);
    return {
      uri: otpauthUri(base32Decode(pending), ISSUER, email),
      secret: pending,
    };
  }

  // **Refus si le second facteur est déjà actif.**
  //
  // Sans ce garde-fou, la suite de la fonction écrasait le secret en place et
  // repassait `mfa_enabled` à `false` : il suffisait d'ouvrir la page
  // d'inscription pour **désactiver silencieusement** la double
  // authentification d'un administrateur, et rendre inutilisable son
  // application d'authentification. La page appelante teste déjà le cas, mais
  // une garde qui ne tient que dans l'appelant finit par sauter — celle-ci est
  // au bon endroit.
  //
  // Régénérer un second facteur actif est une opération de récupération, pas
  // une consultation de page : elle passe par `scripts/reset-mfa.mjs`, avec un
  // accès à la base.
  if (account?.mfa_enabled) {
    throw new Error(
      'Le second facteur est déjà actif : la réinscription passe par une réinitialisation explicite.',
    );
  }

  const secret = new Uint8Array(randomBytes(SECRET_BYTES));
  const encoded = base32Encode(secret);

  const { error } = await db()
    .from('user_accounts')
    .update({ mfa_secret: seal(encoded), mfa_enabled: false, mfa_last_step: null })
    .eq('id', userId);

  if (error) throw new Error(`user_accounts.update : ${error.message}`);

  return { uri: otpauthUri(secret, ISSUER, email), secret: encoded };
}

export type ActivationResult =
  | { ok: true; recoveryCodes: string[] }
  | { ok: false; error: string };

/**
 * Active la MFA après vérification d'un premier code.
 * Retourne les codes de secours **en clair, une seule fois** : la base n'en
 * conserve que des empreintes.
 */
export async function activateMfa(
  userId: string,
  code: string,
): Promise<ActivationResult> {
  const { data: account } = await db()
    .from('user_accounts')
    .select('mfa_secret, mfa_enabled')
    .eq('id', userId)
    .maybeSingle();

  if (!account?.mfa_secret) {
    return { ok: false, error: "Aucune inscription en cours." };
  }
  if (account.mfa_enabled) {
    return { ok: false, error: 'La double authentification est déjà active.' };
  }

  const result = verifyTotp(base32Decode(open(account.mfa_secret)), code, new Date());
  if (!result.valid) {
    return { ok: false, error: 'Code incorrect.' };
  }

  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, generateRecoveryCode);

  // Anciennes empreintes supprimées : réactiver la MFA invalide les codes
  // distribués précédemment.
  await db().from('mfa_recovery_codes').delete().eq('user_id', userId);

  const hashed = await Promise.all(
    codes.map(async (value) => ({
      user_id: userId,
      code_hash: await hashPassword(value),
    })),
  );

  const inserted = await db().from('mfa_recovery_codes').insert(hashed);
  if (inserted.error) {
    return { ok: false, error: 'Génération des codes de secours impossible.' };
  }

  const { error } = await db()
    .from('user_accounts')
    .update({
      mfa_enabled: true,
      mfa_last_step: result.step,
      mfa_activated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) return { ok: false, error: 'Activation impossible.' };

  await notifySecurityEvent(userId, 'MFA_ENABLED');

  return { ok: true, recoveryCodes: codes };
}

/**
 * Vérifie un second facteur : d'abord un code TOTP, sinon un code de secours.
 *
 * Le pas de temps consommé est mémorisé pour interdire le rejeu, et un code
 * de secours est marqué comme utilisé — il ne sert qu'une fois.
 */
export async function verifySecondFactor(
  userId: string,
  code: string,
): Promise<boolean> {
  const { data: account } = await db()
    .from('user_accounts')
    .select('mfa_secret, mfa_enabled, mfa_last_step')
    .eq('id', userId)
    .maybeSingle();

  if (!account?.mfa_enabled || !account.mfa_secret) return false;

  const totp = verifyTotp(
    base32Decode(open(account.mfa_secret)),
    code,
    new Date(),
    account.mfa_last_step,
  );

  if (totp.valid) {
    // Migration opportuniste : un secret encore en clair est scellé au
    // premier usage réussi, sans intervention et sans coupure.
    const update: Record<string, unknown> = { mfa_last_step: totp.step };
    if (!isSealed(account.mfa_secret)) {
      update.mfa_secret = seal(account.mfa_secret);
    }

    await db().from('user_accounts').update(update).eq('id', userId);
    return true;
  }

  return consumeRecoveryCode(userId, code);
}

/** Consomme un code de secours. Chaque code ne vaut qu'une fois. */
async function consumeRecoveryCode(
  userId: string,
  candidate: string,
): Promise<boolean> {
  const normalized = candidate.trim().toUpperCase().replace(/\s/g, '');
  if (normalized.length < 8) return false;

  const { data: codes } = await db()
    .from('mfa_recovery_codes')
    .select('id, code_hash')
    .eq('user_id', userId)
    .is('used_at', null);

  for (const row of codes ?? []) {
    if (await verifyPassword(row.code_hash, normalized)) {
      await db()
        .from('mfa_recovery_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', row.id)
        // Garde contre une double consommation concurrente du même code.
        .is('used_at', null);
      return true;
    }
  }

  return false;
}

/**
 * Régénère les codes de secours (cahier §86).
 *
 * Les anciens sont détruits : après cette opération, seuls les nouveaux
 * fonctionnent. C'est le but — un joueur qui régénère le fait souvent parce
 * qu'il craint que les précédents aient fuité.
 */
export async function regenerateRecoveryCodes(
  userId: string,
): Promise<ActivationResult> {
  const { data: account } = await db()
    .from('user_accounts')
    .select('mfa_enabled')
    .eq('id', userId)
    .maybeSingle();

  if (!account?.mfa_enabled) {
    return { ok: false, error: 'La double authentification n\'est pas active.' };
  }

  const codes = Array.from({ length: RECOVERY_CODE_COUNT }, generateRecoveryCode);

  await db().from('mfa_recovery_codes').delete().eq('user_id', userId);

  const hashed = await Promise.all(
    codes.map(async (value) => ({
      user_id: userId,
      code_hash: await hashPassword(value),
    })),
  );

  const { error } = await db().from('mfa_recovery_codes').insert(hashed);
  if (error) {
    return { ok: false, error: 'Génération impossible.' };
  }

  // Les anciens codes viennent d'être invalidés : si le titulaire n'est pas à
  // l'origine du geste, il doit l'apprendre avant de découvrir que ses codes
  // ne fonctionnent plus.
  await notifySecurityEvent(userId, 'RECOVERY_CODES_REGENERATED');

  return { ok: true, recoveryCodes: codes };
}

/**
 * Désactive la double authentification.
 *
 * Le secret et les codes de secours sont effacés : réactiver plus tard
 * repartira d'un secret neuf. Laisser l'ancien traîner en base n'apporterait
 * rien et l'exposerait pour rien.
 *
 * L'appelant doit avoir vérifié le mot de passe **et** un second facteur :
 * désactiver la MFA est exactement ce que ferait un intrus qui a volé une
 * session.
 */
export async function disableMfa(userId: string): Promise<boolean> {
  await db().from('mfa_recovery_codes').delete().eq('user_id', userId);

  const { error } = await db()
    .from('user_accounts')
    .update({
      mfa_enabled: false,
      mfa_secret: null,
      mfa_last_step: null,
      mfa_activated_at: null,
    })
    .eq('id', userId);

  // Désactiver la MFA est exactement ce que ferait un attaquant disposant
  // d'une session volée : c'est le moment où l'alerte compte le plus.
  if (!error) await notifySecurityEvent(userId, 'MFA_DISABLED');

  return !error;
}

/** Nombre de codes de secours encore utilisables. */
export async function remainingRecoveryCodes(userId: string): Promise<number> {
  const { count } = await db()
    .from('mfa_recovery_codes')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('used_at', null);

  return count ?? 0;
}
