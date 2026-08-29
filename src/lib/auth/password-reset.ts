import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import {
  checkPassword,
  describePasswordIssue,
} from '@/domain/auth/password-policy';
import {
  checkResetRateLimit,
  evaluateResetToken,
  MAX_RESETS_PER_ACCOUNT,
  MAX_RESETS_PER_IP,
  RESET_WINDOW_MS,
  resetTokenExpiry,
} from '@/domain/auth/password-reset';
import { db, isDatabaseConfigured } from '@/lib/supabase-admin';
import { queueEmail } from '@/lib/email/outbox';
import { passwordResetEmail } from '@/lib/email/templates';
import { notifySecurityEvent } from '@/lib/notifications/security';
import { hashPassword } from './password';
import { revokeAllSessions } from './session-store';

/**
 * Réinitialisation de mot de passe (cahier §86).
 *
 * Règle transverse : **la réponse ne dépend jamais de l'existence du compte.**
 * Une adresse inconnue, une adresse connue et une adresse ayant atteint sa
 * limite de demandes reçoivent le même message. Sinon le formulaire devient
 * un annuaire des comptes du site.
 */

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Réponse unique, quelle que soit l'issue réelle. */
export const GENERIC_REQUEST_MESSAGE =
  "Si un compte existe pour cette adresse, un lien de réinitialisation vient d'être envoyé.";

async function recentRequests(
  column: 'email' | 'requested_ip',
  value: string,
): Promise<Date[]> {
  const since = new Date(Date.now() - RESET_WINDOW_MS);

  const { data } = await db()
    .from('password_reset_tokens')
    .select('created_at')
    .eq(column, value)
    .gte('created_at', since.toISOString())
    .limit(50);

  return (data ?? []).map((row) => new Date(row.created_at));
}

export interface RequestMeta {
  ip?: string;
  origin: string;
}

/**
 * Demande de réinitialisation.
 *
 * Ne renvoie jamais d'information exploitable : le résultat est le même que
 * l'adresse existe ou non. Les limites de débit s'appliquent silencieusement.
 */
export async function requestPasswordReset(
  rawEmail: string,
  meta: RequestMeta,
): Promise<void> {
  if (!isDatabaseConfigured()) return;

  const email = rawEmail.trim().toLowerCase();

  const perAccount = checkResetRateLimit(
    await recentRequests('email', email),
    new Date(),
    MAX_RESETS_PER_ACCOUNT,
  );
  if (!perAccount.allowed) return;

  if (meta.ip) {
    const perIp = checkResetRateLimit(
      await recentRequests('requested_ip', meta.ip),
      new Date(),
      MAX_RESETS_PER_IP,
    );
    if (!perIp.allowed) return;
  }

  const { data: account } = await db()
    .from('user_accounts')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  // Adresse inconnue : on s'arrête ici, mais l'appelant renverra le même
  // message que pour un compte existant.
  if (!account) return;

  const token = randomBytes(32).toString('base64url');
  const now = new Date();

  const { error } = await db().from('password_reset_tokens').insert({
    token_hash: hashToken(token),
    user_id: account.id,
    email,
    requested_ip: meta.ip ?? null,
    expires_at: resetTokenExpiry(now).toISOString(),
  });
  if (error) return;

  const link = `${meta.origin}/reset?token=${token}`;

  // La clé de déduplication porte le jeton : chaque demande produit un
  // nouveau jeton, donc un nouveau message — mais un même envoi rejoué
  // (double clic, réessai réseau) n'en produit qu'un.
  await queueEmail(passwordResetEmail(email, link), `reset:${hashToken(token)}`, {
    // Le lien vaut une heure : attendre la tache planifiee le rendrait
    // inutilisable sur un hebergement a passage quotidien.
    urgent: true,
  });
}

export type ResetOutcome =
  | { ok: true }
  | { ok: false; error: string };

/** Message unique pour tout jeton inutilisable. */
const INVALID_TOKEN =
  'Ce lien est invalide ou a expiré. Demande une nouvelle réinitialisation.';

/** Le jeton est-il exploitable ? Utilisé pour afficher le formulaire. */
export async function isResetTokenUsable(token: string): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  const { data } = await db()
    .from('password_reset_tokens')
    .select('expires_at, used_at, revoked_at')
    .eq('token_hash', hashToken(token))
    .maybeSingle();

  if (!data) return false;

  return evaluateResetToken(
    {
      expiresAt: new Date(data.expires_at),
      usedAt: data.used_at ? new Date(data.used_at) : null,
      revokedAt: data.revoked_at ? new Date(data.revoked_at) : null,
    },
    new Date(),
  ).valid;
}

/**
 * Consomme le jeton et remplace le mot de passe.
 *
 * Trois effets, indissociables :
 *   1. le jeton est marqué consommé — il ne resservira pas ;
 *   2. les autres jetons du compte sont révoqués ;
 *   3. toutes les sessions sont fermées (§85), y compris celle d'un
 *      éventuel intrus déjà connecté.
 */
export async function completePasswordReset(
  token: string,
  newPassword: string,
): Promise<ResetOutcome> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: 'Base de données non configurée.' };
  }

  const tokenHash = hashToken(token);

  const { data: row } = await db()
    .from('password_reset_tokens')
    .select('user_id, email, expires_at, used_at, revoked_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (!row) return { ok: false, error: INVALID_TOKEN };

  const verdict = evaluateResetToken(
    {
      expiresAt: new Date(row.expires_at),
      usedAt: row.used_at ? new Date(row.used_at) : null,
      revokedAt: row.revoked_at ? new Date(row.revoked_at) : null,
    },
    new Date(),
  );
  if (!verdict.valid) return { ok: false, error: INVALID_TOKEN };

  const policy = checkPassword(newPassword, row.email);
  if (!policy.valid) {
    return { ok: false, error: describePasswordIssue(policy.issues[0]) };
  }

  const now = new Date().toISOString();

  // Consommation d'abord, et seulement si le jeton est encore libre : deux
  // requêtes simultanées avec le même lien ne peuvent pas aboutir toutes deux.
  const consumed = await db()
    .from('password_reset_tokens')
    .update({ used_at: now })
    .eq('token_hash', tokenHash)
    .is('used_at', null)
    .select('token_hash')
    .maybeSingle();

  if (!consumed.data) return { ok: false, error: INVALID_TOKEN };

  const updated = await db()
    .from('user_accounts')
    .update({
      password_hash: await hashPassword(newPassword),
      password_changed_at: now,
    })
    .eq('id', row.user_id);

  if (updated.error) {
    return { ok: false, error: 'Mise à jour impossible.' };
  }

  // Les autres liens en circulation ne valent plus rien.
  await db()
    .from('password_reset_tokens')
    .update({ revoked_at: now })
    .eq('user_id', row.user_id)
    .is('used_at', null)
    .is('revoked_at', null);

  // Déconnexion totale : si quelqu'un d'autre était entré, il sort aussi.
  await revokeAllSessions(row.user_id);

  // Alerte après coup, jamais avant : le compte est déjà sécurisé quand le
  // message part, et l'échec de l'envoi ne remet pas en cause la
  // réinitialisation elle-même.
  await notifySecurityEvent(row.user_id, 'PASSWORD_RESET');

  return { ok: true };
}
