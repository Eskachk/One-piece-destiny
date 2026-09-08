import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { cache } from 'react';
import { revalidateTag, unstable_cache } from 'next/cache';
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

/**
 * Durée de vie du cache de session, en secondes.
 *
 * ## Pourquoi ce cache existe
 *
 * La lecture de session est **la** requête que fait toute page connectée, et
 * la seule qu'aucune parallélisation ne peut supprimer : tout le reste en
 * dépend. Depuis la plateforme, elle coûte de 70 à 145 ms. C'était le dernier
 * aller-retour incompressible du produit.
 *
 * ## Pourquoi quinze secondes, et pas plus
 *
 * Un cache de session est un compromis avec la révocation : tant qu'une
 * entrée vit, une session révoquée ailleurs continue d'être servie. Toutes les
 * voies de révocation invalident explicitement l'entrée (voir plus bas), donc
 * ce délai ne s'applique qu'à ce qu'on aurait oublié. Quinze secondes est la
 * borne de cet oubli, et c'est court devant les deux heures de la fenêtre
 * d'inactivité.
 *
 * ## Ce qui rend la déconnexion immédiate sans rien invalider
 *
 * `destroySession` **supprime le cookie**. La requête suivante n'a donc plus
 * de jeton, ne calcule aucune clé de cache et ne lit rien du tout. Le cas le
 * plus fréquent — se déconnecter soi-même — est instantané par construction.
 */
const SESSION_TTL = 15;

/** L'étiquette d'une session, pour pouvoir la purger. */
function etiquetteSession(tokenHash: string): string {
  return `session:${tokenHash}`;
}

/**
 * Purge l'entrée de cache d'une session.
 *
 * Appelée par **toutes** les voies qui rendent une session invalide ou qui
 * changent ce qu'elle contient. Sans cela, un changement de mot de passe ne
 * déconnecterait plus les autres appareils avant quinze secondes, et une
 * promotion après second facteur laisserait le joueur bloqué sur l'écran de
 * saisie.
 *
 * `revalidateTag` n'est utilisable que depuis une action serveur ou un
 * gestionnaire de route. Toutes les révocations en viennent — mais l'échec est
 * avalé plutôt que propagé : rater une purge doit dégrader la fraîcheur, pas
 * faire échouer une déconnexion.
 */
function purgerSession(tokenHash: string): void {
  try {
    revalidateTag(etiquetteSession(tokenHash));
  } catch {
    // Hors contexte de requête : l'entrée expirera d'elle-même.
  }
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
/**
 * Forme sérialisable d'une session.
 *
 * `unstable_cache` passe par JSON : les `Date` en ressortent en chaînes. On
 * traverse donc le cache en ISO, et on réhydrate au sortir — plutôt que de
 * laisser un `Date` de façade qui serait en réalité une chaîne, ce qui casse
 * au premier `.getTime()` et très loin d'ici.
 */
interface SessionSerialisee {
  userId: string;
  playerId: string;
  email: string;
  role: 'PLAYER' | 'ADMIN';
  mfaEnabled: boolean;
  mfaPending: boolean;
  createdAt: string;
  lastSeenAt: string;
  authenticatedAt: string;
  revokedAt: string | null;
}

/**
 * Lit la session en base, l'évalue, et révoque celle qui a expiré.
 *
 * Prend l'empreinte en argument plutôt que de lire le cookie : cette fonction
 * passe par le cache, et une fonction mise en cache ne peut pas dépendre de
 * quelque chose de propre à la requête.
 */
async function chargerSession(
  tokenHash: string,
): Promise<SessionSerialisee | null> {
  const { data, error } = await db()
    .from('sessions')
    .select(
      'token_hash, created_at, last_seen_at, authenticated_at, revoked_at, mfa_pending, user_accounts!inner(id, email, role, player_id, mfa_enabled)',
    )
    .eq('token_hash', tokenHash)
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

  /*
   * Glissement de la fenêtre d'inactivité.
   *
   * Il vit **dans** la fonction mise en cache, donc il ne s'exécute qu'au
   * moment où l'on va réellement en base — au plus une fois toutes les quinze
   * secondes. Placé au-dessus du cache, il aurait tiré à chaque page vue en
   * lisant une date figée, et se serait déclenché en boucle.
   *
   * Non attendu, et l'échec est avalé : personne n'attend son résultat, et une
   * session valide ne doit pas devenir invalide parce que son horodatage n'a
   * pas pu être rafraîchi. Un échec la fait expirer un peu plus tôt, jamais
   * plus tard.
   */
  if (now.getTime() - state.lastSeenAt.getTime() > 60_000) {
    void db()
      .from('sessions')
      .update({ last_seen_at: now.toISOString() })
      .eq('token_hash', data.token_hash)
      .then(undefined, () => {});
  }

  return {
    userId: account.id,
    playerId: account.player_id,
    email: account.email,
    role: account.role,
    mfaEnabled: account.mfa_enabled,
    mfaPending: data.mfa_pending,
    createdAt: state.createdAt.toISOString(),
    lastSeenAt: state.lastSeenAt.toISOString(),
    authenticatedAt: state.authenticatedAt.toISOString(),
    revokedAt: state.revokedAt ? state.revokedAt.toISOString() : null,
  };
}

/**
 * La même lecture, mise en cache quinze secondes et purgeable par étiquette.
 *
 * La clé et l'étiquette portent l'empreinte du jeton, jamais le jeton :
 * l'empreinte est déjà ce que la base stocke, et c'est ce qui rend deux
 * joueurs incapables de partager une entrée.
 */
function chargerSessionEnCache(
  tokenHash: string,
): Promise<SessionSerialisee | null> {
  return unstable_cache(() => chargerSession(tokenHash), ['session', tokenHash], {
    tags: [etiquetteSession(tokenHash)],
    revalidate: SESSION_TTL,
  })();
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

  const brute = await chargerSessionEnCache(hashToken(token));
  if (!brute) return null;

  return {
    userId: brute.userId,
    playerId: brute.playerId,
    email: brute.email,
    role: brute.role,
    mfaEnabled: brute.mfaEnabled,
    mfaPending: brute.mfaPending,
    state: {
      createdAt: new Date(brute.createdAt),
      lastSeenAt: new Date(brute.lastSeenAt),
      authenticatedAt: new Date(brute.authenticatedAt),
      revokedAt: brute.revokedAt ? new Date(brute.revokedAt) : null,
    },
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

  // Sans cette purge, l'entrée en cache dirait encore « second facteur en
  // attente » : le joueur validerait son code et retomberait sur l'écran de
  // saisie, pendant quinze secondes, sans rien comprendre.
  purgerSession(tokenHash);
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
    const empreinte = hashToken(token);
    await db()
      .from('sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('token_hash', empreinte);

    // La suppression du cookie suffit déjà à rendre la déconnexion immédiate
    // pour **cet** appareil. On purge quand même : l'entrée n'a plus aucune
    // raison d'occuper le cache, et le jeton pourrait avoir été recopié.
    purgerSession(empreinte);
  }

  store.delete(COOKIE);
}

/**
 * Révoque toutes les sessions d'un compte (changement de mot de passe).
 *
 * **Le cas qui rend la purge obligatoire.** Les autres appareils gardent leur
 * cookie : sans invalidation, ils continueraient d'être servis depuis le cache
 * pendant quinze secondes après un changement de mot de passe. C'est
 * exactement le geste qu'on fait quand on croit son compte compromis, et
 * exactement le moment où quinze secondes sont de trop.
 *
 * On relève donc les empreintes **avant** de révoquer, puis on purge chacune.
 * Le coût est d'une lecture supplémentaire sur une opération rare.
 */
export async function revokeAllSessions(userId: string): Promise<void> {
  const { data } = await db()
    .from('sessions')
    .select('token_hash')
    .eq('user_id', userId)
    .is('revoked_at', null);

  await db()
    .from('sessions')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('revoked_at', null);

  for (const ligne of data ?? []) purgerSession(ligne.token_hash);
}

export function requiresReauthentication(
  session: AuthenticatedSession,
  now: Date = new Date(),
): boolean {
  return !isRecentlyAuthenticated(session.state, now);
}
