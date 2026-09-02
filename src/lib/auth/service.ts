import 'server-only';

import {
  checkAccountRateLimit,
  checkIpRateLimit,
  ATTEMPT_WINDOW_MS,
  LOCKOUT_MS,
  type AttemptRecord,
} from '@/domain/auth/rate-limit';
import { checkPassword, describePasswordIssue } from '@/domain/auth/password-policy';
import {
  canonicalHandle,
  checkHandle,
  describeHandleIssue,
  normalizeHandle,
} from '@/domain/player/handle';
import { db, isDatabaseConfigured } from '@/lib/supabase-admin';
import { grantSignupBonus } from '@/lib/social/signup-grant';
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

/**
 * Le pseudo est-il déjà pris ?
 *
 * La comparaison se fait sur la **forme canonique** — sans accents, sans
 * ponctuation, sans casse : `Sh_anks` ne doit pas pouvoir se faire passer pour
 * `Shanks` sur une annonce du Marché.
 *
 * Recherche par **égalité sur index** (`players.handle_canonical`, colonne
 * générée, migration 0025). Une première version faisait un `ilike '%…%'` puis
 * comparait côté application : un balayage de table à chaque inscription, qui
 * ne se voit pas sur mille lignes et se voit beaucoup à l'échelle visée.
 *
 * Ce contrôle sert à **nommer** le problème au joueur ; il ne le garantit pas.
 * Deux inscriptions simultanées le passeraient toutes les deux. La garantie est
 * l'index unique, dont l'échec est traité plus bas.
 */
async function handleIsTaken(handle: string): Promise<boolean> {
  const { data } = await db()
    .from('players')
    .select('id')
    .eq('handle_canonical', canonicalHandle(handle))
    .maybeSingle();

  return data !== null;
}

export async function register(
  rawEmail: string,
  password: string,
  rawHandle: string,
  meta: RequestMeta = {},
): Promise<AuthResult> {
  if (!isDatabaseConfigured()) return databaseUnavailable();

  const email = normalizeEmail(rawEmail);
  const handle = normalizeHandle(rawHandle);

  const naming = checkHandle(handle);
  if (!naming.valid) {
    return { ok: false, error: describeHandleIssue(naming.issue!) };
  }

  const policy = checkPassword(password, email);
  if (!policy.valid) {
    return { ok: false, error: describePasswordIssue(policy.issues[0]) };
  }

  if (await handleIsTaken(handle)) {
    return { ok: false, error: 'Ce pseudo est déjà pris.' };
  }

  // Le joueur porte la collection et les équipes ; le compte porte l'identité.
  //
  // Le pseudo vient du joueur, jamais de son adresse : le pseudo est public,
  // l'adresse ne l'est pas.
  const player = await db()
    .from('players')
    .insert({ handle })
    .select('id')
    .single();

  if (player.error) {
    // Course perdue sur la contrainte d'unicité : c'est le seul cas où l'on
    // sait dire précisément quoi corriger, et le dire ne révèle rien de privé.
    if (player.error.code === '23505') {
      return { ok: false, error: 'Ce pseudo est déjà pris.' };
    }
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

  // Dotation d'arrivee et parrainage eventuel (§71). Le compte existe deja :
  // un echec ici prive du bonus, il ne doit pas annuler l'inscription.
  await grantSignupBonus(player.data.id);

  // Message de confirmation mis en file. Il ne bloque pas l'entree : le joueur
  // accede au jeu immediatement, et la verification conditionne les operations
  // sensibles (voir email-verification.ts).
  // Envoyé sans condition. Il l'était « si `meta.origin` » — c'est-à-dire si
  // la requête portait un en-tête `Origin` — parce que le lien se construisait
  // dessus. Le lien vient maintenant de la configuration du serveur, donc plus
  // rien ne justifie de sauter l'envoi : une adresse non confirmée, c'est un
  // parrainage jamais payé.
  await sendVerificationEmail(account.data.id, email);

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
