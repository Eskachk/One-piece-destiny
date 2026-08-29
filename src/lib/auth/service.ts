import 'server-only';

import {
  checkAccountRateLimit,
  checkIpRateLimit,
  ATTEMPT_WINDOW_MS,
  LOCKOUT_MS,
  type AttemptRecord,
} from '@/domain/auth/rate-limit';
import { checkPassword, describePasswordIssue } from '@/domain/auth/password-policy';
import { db, isDatabaseConfigured } from '@/lib/supabase-admin';
import { getDummyHash, hashPassword, verifyPassword } from './password';
import { createSession, revokeAllSessions } from './session-store';
import { sendVerificationEmail } from './email-verification';

/**
 * Service d'authentification (cahier §86).
 *
 * Règle transverse : **les messages d'erreur sont génériques**. « Identifiants
 * invalides » couvre aussi bien l'adresse inconnue que le mauvais mot de
 * passe. Distinguer les deux offrirait un oracle pour énumérer les comptes.
 */

export type AuthResult =
  | { ok: true; mfaRequired?: boolean }
  | { ok: false; error: string };

/** Message unique pour tous les échecs de connexion. */
const GENERIC_FAILURE = 'Identifiants invalides.';

/**
 * L'authentification exige la base : sans elle il n'y a ni compte ni session.
 * On le dit franchement plutôt que de laisser remonter une erreur 500.
 */
function databaseUnavailable(): AuthResult {
  return {
    ok: false,
    error:
      "Base de données non configurée : l'authentification est indisponible.",
  };
}

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
  /** Origine de la requete, pour construire un lien absolu verifiable. */
  origin?: string;
}

/** Journalisation des tentatives (§86) — sans jamais stocker le mot de passe. */
async function recordAttempt(
  email: string,
  meta: RequestMeta,
  successful: boolean,
): Promise<void> {
  await db().from('login_attempts').insert({
    email,
    ip: meta.ip ?? null,
    successful,
    at: new Date().toISOString(),
  });
}

async function loadAttempts(
  column: 'email' | 'ip',
  value: string,
): Promise<AttemptRecord[]> {
  const since = new Date(Date.now() - ATTEMPT_WINDOW_MS - LOCKOUT_MS);

  const { data } = await db()
    .from('login_attempts')
    .select('at, successful')
    .eq(column, value)
    .gte('at', since.toISOString())
    .order('at', { ascending: true })
    .limit(200);

  return (data ?? []).map((row) => ({
    at: new Date(row.at),
    successful: row.successful,
  }));
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function register(
  rawEmail: string,
  password: string,
  meta: RequestMeta = {},
): Promise<AuthResult> {
  if (!isDatabaseConfigured()) return databaseUnavailable();

  const email = normalizeEmail(rawEmail);

  const policy = checkPassword(password, email);
  if (!policy.valid) {
    return { ok: false, error: describePasswordIssue(policy.issues[0]) };
  }

  // Le joueur porte la collection et les équipes ; le compte porte l'identité.
  const player = await db()
    .from('players')
    .insert({ handle: email.split('@')[0].slice(0, 24) + '-' + Date.now().toString(36).slice(-4) })
    .select('id')
    .single();

  if (player.error) {
    return { ok: false, error: 'Création du compte impossible.' };
  }

  const account = await db()
    .from('user_accounts')
    .insert({
      email,
      password_hash: await hashPassword(password),
      player_id: player.data.id,
      // Empreinte d'inscription, pour la détection de comptes liés (§43).
      signup_ip: meta.ip ?? null,
    })
    .select('id')
    .single();

  if (account.error) {
    // Nettoyage : pas de joueur orphelin si l'adresse est déjà prise.
    await db().from('players').delete().eq('id', player.data.id);

    // Message identique quelle que soit la cause : une réponse « adresse déjà
    // utilisée » révélerait qui possède un compte.
    return {
      ok: false,
      error: 'Impossible de créer ce compte. Essaie une autre adresse.',
    };
  }

  // Message de confirmation mis en file. Il ne bloque pas l'entree : le joueur
  // accede au jeu immediatement, et la verification conditionne les operations
  // sensibles (voir email-verification.ts).
  if (meta.origin) {
    await sendVerificationEmail(account.data.id, email, meta.origin);
  }

  await createSession(account.data.id, meta);
  return { ok: true };
}

export async function login(
  rawEmail: string,
  password: string,
  meta: RequestMeta = {},
): Promise<AuthResult> {
  if (!isDatabaseConfigured()) return databaseUnavailable();

  const email = normalizeEmail(rawEmail);
  const now = new Date();

  // Deux verrous : par compte (force brute ciblée) et par IP (balayage).
  const accountLimit = checkAccountRateLimit(await loadAttempts('email', email), now);
  const ipLimit = meta.ip
    ? checkIpRateLimit(await loadAttempts('ip', meta.ip), now)
    : { allowed: true, retryAt: null, remaining: 0 };

  if (!accountLimit.allowed || !ipLimit.allowed) {
    await recordAttempt(email, meta, false);
    return {
      ok: false,
      error: 'Trop de tentatives. Réessaie dans quelques minutes.',
    };
  }

  const { data: account } = await db()
    .from('user_accounts')
    .select('id, password_hash, mfa_enabled')
    .eq('email', email)
    .maybeSingle();

  // Compte inconnu : on vérifie quand même une empreinte, pour que le temps
  // de réponse ne trahisse pas l'existence du compte.
  const valid = await verifyPassword(
    account?.password_hash ?? (await getDummyHash()),
    password,
  );

  if (!account || !valid) {
    await recordAttempt(email, meta, false);
    return { ok: false, error: GENERIC_FAILURE };
  }

  await recordAttempt(email, meta, true);

  // Jeton régénéré à chaque authentification : pas de fixation de session.
  // Si un second facteur est requis, la session ouverte ici n'authentifie
  // personne : elle ne donne accès qu'à l'écran de saisie du code (§86).
  await createSession(account.id, meta, { mfaPending: account.mfa_enabled });
  return { ok: true, mfaRequired: account.mfa_enabled };
}

/**
 * Changement de mot de passe : révoque toutes les sessions existantes, puis
 * en ouvre une neuve (§85).
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  meta: RequestMeta = {},
): Promise<AuthResult> {
  const { data: account } = await db()
    .from('user_accounts')
    .select('id, email, password_hash')
    .eq('id', userId)
    .maybeSingle();

  if (!account) return { ok: false, error: GENERIC_FAILURE };

  if (!(await verifyPassword(account.password_hash, currentPassword))) {
    return { ok: false, error: GENERIC_FAILURE };
  }

  const policy = checkPassword(newPassword, account.email);
  if (!policy.valid) {
    return { ok: false, error: describePasswordIssue(policy.issues[0]) };
  }

  const { error } = await db()
    .from('user_accounts')
    .update({
      password_hash: await hashPassword(newPassword),
      password_changed_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) return { ok: false, error: 'Mise à jour impossible.' };

  await revokeAllSessions(userId);
  await createSession(userId, meta);
  return { ok: true };
}
