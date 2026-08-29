import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { cache } from 'react';
import { cookies } from 'next/headers';
import {
  evaluateSession,
  isRecentlyAuthenticated,
  sessionExpiresAt,
  type SessionState,
} from '@/domain/auth/session';
import { db, isDatabaseConfigured } from '@/lib/supabase-admin';

/**
 * Sessions serveur (cahier §85).
 *
 * Le cookie porte un jeton aléatoire de 256 bits ; la base ne stocke que son
 * empreinte SHA-256. Une fuite de la table `sessions` ne permet donc pas de
 * se faire passer pour un joueur.
 */

const COOKIE = 'opq_session';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const, // 'lax' laisse fonctionner les retours de lien
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface AuthenticatedSession {
  userId: string;
  playerId: string;
  email: string;
  role: 'PLAYER' | 'ADMIN';
  mfaEnabled: boolean;
  /** Vrai tant que le second facteur n'a pas été fourni. */
  mfaPending: boolean;
  state: SessionState;
}

/**
 * Ouvre une session et dépose le cookie.
 *
 * Le jeton est régénéré à chaque authentification (§85) : c'est ce qui
 * empêche la fixation de session.
 */
export async function createSession(
  userId: string,
  meta: { ip?: string; userAgent?: string } = {},
  { mfaPending = false }: { mfaPending?: boolean } = {},
): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  const now = new Date();

  const { error } = await db().from('sessions').insert({
    token_hash: hashToken(token),
    user_id: userId,
    created_at: now.toISOString(),
    last_seen_at: now.toISOString(),
    authenticated_at: now.toISOString(),
    ip: meta.ip ?? null,
    user_agent: meta.userAgent ?? null,
    mfa_pending: mfaPending,
  });
  if (error) throw new Error(`sessions.insert : ${error.message}`);

  const store = await cookies();
  store.set(COOKIE, token, {
    ...COOKIE_OPTIONS,
    expires: sessionExpiresAt({
      createdAt: now,
      lastSeenAt: now,
      authenticatedAt: now,
      revokedAt: null,
    }),
  });
}

/**
 * Lit la session courante, ou `null`.
 *
 * Une session expirée est révoquée en base au passage : on ne laisse pas
 * traîner des lignes utilisables.
 */
async function readSession(): Promise<AuthenticatedSession | null> {
  // Sans base, aucune session ne peut exister : on rend l'application
  // utilisable en mode mémoire plutôt que de la faire planter.
  if (!isDatabaseConfigured()) return null;

  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;

  const { data, error } = await db()
    .from('sessions')
    .select(
      'token_hash, created_at, last_seen_at, authenticated_at, revoked_at, mfa_pending, user_accounts!inner(id, email, role, player_id, mfa_enabled)',
    )
    .eq('token_hash', hashToken(token))
    .maybeSingle();

  if (error || !data) return null;

  const state: SessionState = {
    createdAt: new Date(data.created_at),
    lastSeenAt: new Date(data.last_seen_at),
    authenticatedAt: new Date(data.authenticated_at),
    revokedAt: data.revoked_at ? new Date(data.revoked_at) : null,
  };

  const now = new Date();
  const verdict = evaluateSession(state, now);
  if (!verdict.valid) {
    if (verdict.reason !== 'REVOKED') {
      await db()
        .from('sessions')
        .update({ revoked_at: now.toISOString() })
        .eq('token_hash', data.token_hash);
    }
    return null;
  }

  const account = data.user_accounts as unknown as {
    id: string;
    email: string;
    role: 'PLAYER' | 'ADMIN';
    player_id: string;
    mfa_enabled: boolean;
  };

  // Glissement de la fenêtre d'inactivité. Écriture limitée à une fois par
  // minute pour ne pas transformer chaque page vue en écriture.
  if (now.getTime() - state.lastSeenAt.getTime() > 60_000) {
    await db()
      .from('sessions')
      .update({ last_seen_at: now.toISOString() })
      .eq('token_hash', data.token_hash);
  }

  return {
    userId: account.id,
    playerId: account.player_id,
    email: account.email,
    role: account.role,
    mfaEnabled: account.mfa_enabled,
    mfaPending: data.mfa_pending,
    state,
  };
}

/**
 * Session courante, **mémorisée le temps de la requête**.
 *
 * Une page de jeu lit la session au moins deux fois : une fois pour son propre
 * contrôle d'accès (`requireSession`), une fois pour savoir s'il faut afficher
 * l'onglet d'administration (`<Nav />`). Certaines la lisent trois fois. Sans
 * mémorisation, c'était autant de requêtes `sessions ⨝ user_accounts` par
 * affichage — sur la page la plus visitée, un dimanche soir, à quatre chiffres
 * de joueurs simultanés.
 *
 * `cache()` de React mémorise **par requête serveur**, pas globalement : deux
 * joueurs différents ne partagent jamais de session, et la même requête ne
 * paie l'aller-retour qu'une fois. C'est exactement la portée qu'il faut ici —
 * un cache plus large serait une faille, un cache plus étroit ne servirait à
 * rien.
 *
 * Le glissement de la fenêtre d'inactivité reste dans `readSession` : il
 * n'écrit qu'une fois par minute, et se retrouve donc lui aussi dédoublonné.
 */
export const getSession = cache(readSession);

/**
 * Session authentifiée pour l'application.
 *
 * Une session en attente de second facteur n'authentifie personne : elle
 * n'ouvre que l'écran de saisie du code. C'est `getSession` qui fait ce tri,
 * de sorte qu'aucun appelant ne puisse l'oublier.
 */
export async function getAuthenticatedSession(): Promise<AuthenticatedSession | null> {
  const session = await getSession();
  return session && !session.mfaPending ? session : null;
}

/** Session issue du mot de passe seul, en attente du second facteur. */
export async function getMfaPendingSession(): Promise<AuthenticatedSession | null> {
  const session = await getSession();
  return session?.mfaPending ? session : null;
}

/**
 * Promeut une session en attente une fois le second facteur validé.
 * `authenticated_at` est remis à maintenant : la fenêtre de réauthentification
 * des actions critiques (§86) part de la validation complète, pas du mot de
 * passe seul.
 */
export async function completeMfaChallenge(tokenHash: string): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await db()
    .from('sessions')
    .update({ mfa_pending: false, authenticated_at: now, last_seen_at: now })
    .eq('token_hash', tokenHash);

  if (error) throw new Error(`sessions.update : ${error.message}`);
}

/** Empreinte de la session courante, pour la promouvoir après le défi MFA. */
export async function currentTokenHash(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  return token ? hashToken(token) : null;
}

/** Invalidation au logout (§85) : la ligne est révoquée, pas juste le cookie. */
export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;

  if (token) {
    await db()
      .from('sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('token_hash', hashToken(token));
  }

  store.delete(COOKIE);
}

/** Révoque toutes les sessions d'un compte (changement de mot de passe). */
export async function revokeAllSessions(userId: string): Promise<void> {
  await db()
    .from('sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('revoked_at', null);
}

export function requiresReauthentication(
  session: AuthenticatedSession,
  now: Date = new Date(),
): boolean {
  return !isRecentlyAuthenticated(session.state, now);
}
