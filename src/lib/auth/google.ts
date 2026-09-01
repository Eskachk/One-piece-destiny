import 'server-only';

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { db, isDatabaseConfigured } from '@/lib/supabase-admin';
import { baseUrl } from '@/lib/email/templates';
import { grantSignupBonus } from '@/lib/social/signup-grant';
import { fallbackHandle } from '@/domain/player/handle';

/**
 * Connexion par Google (OpenID Connect, flux « authorization code »).
 *
 * Trois protections, et aucune n'est décorative :
 *
 *   1. **`state`** — jeton aléatoire posé en cookie et renvoyé par Google.
 *      Sans lui, un attaquant peut faire aboutir *son* code d'autorisation
 *      dans *votre* navigateur et lier son compte Google au vôtre ;
 *   2. **PKCE** — le code d'autorisation ne vaut rien sans le vérificateur,
 *      qui n'a jamais transité par l'URL. Il protège si le code fuite par un
 *      journal de serveur ou un en-tête `Referer` ;
 *   3. **`email_verified`** — Google doit affirmer que l'adresse lui
 *      appartient. Sans ce contrôle, quiconque crée un compte Google avec une
 *      adresse arbitraire prendrait la main sur le compte du même e-mail.
 *
 * Le jeton d'identité est lu **sans revérifier sa signature** : il vient
 * d'être obtenu directement de Google, en TLS, sur un canal authentifié par le
 * secret client. C'est ce que prévoit la spécification OpenID Connect (§3.1.3.7)
 * pour ce flux. Un jeton reçu autrement devrait, lui, être vérifié.
 */

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

export const STATE_COOKIE = 'glw_oauth_state';
export const VERIFIER_COOKIE = 'glw_oauth_verifier';

/** Durée de vie du départ : au-delà, l'utilisateur recommence. */
export const HANDSHAKE_TTL_SECONDS = 600;

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/** `null` quand la connexion Google n'est pas configurée. */
export function googleConfig(): GoogleConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  return {
    clientId,
    clientSecret,
    redirectUri: `${baseUrl()}/api/auth/google/callback`,
  };
}

export function isGoogleEnabled(): boolean {
  return googleConfig() !== null && isDatabaseConfigured();
}

export interface Handshake {
  url: string;
  state: string;
  verifier: string;
}

function base64url(buffer: Buffer): string {
  return buffer.toString('base64url');
}

/** Prépare la redirection vers Google. */
export function beginGoogleSignIn(config: GoogleConfig): Handshake {
  const state = base64url(randomBytes(32));
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash('sha256').update(verifier).digest());

  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email');
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  // Force le choix du compte : sans cela, un poste partagé reconnecte
  // silencieusement le compte précédent.
  url.searchParams.set('prompt', 'select_account');

  return { url: url.toString(), state, verifier };
}

/** Comparaison en temps constant du `state`. */
export function stateMatches(received: string, expected: string): boolean {
  if (!received || !expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export interface GoogleIdentity {
  subject: string;
  email: string;
  emailVerified: boolean;
}

export type ExchangeResult =
  | { ok: true; identity: GoogleIdentity }
  | { ok: false; error: string };

/** Échange le code d'autorisation contre l'identité. */
export async function exchangeGoogleCode(
  config: GoogleConfig,
  code: string,
  verifier: string,
): Promise<ExchangeResult> {
  let payload: { id_token?: string };

  try {
    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: verifier,
      }),
    });

    if (!response.ok) {
      // Le corps peut contenir le code d'autorisation : on ne le journalise
      // pas et on ne le renvoie pas.
      console.warn(`[auth] GOOGLE_TOKEN_FAILED HTTP ${response.status}`);
      return { ok: false, error: 'Échange impossible avec Google.' };
    }

    payload = (await response.json()) as { id_token?: string };
  } catch {
    return { ok: false, error: 'Google est injoignable.' };
  }

  if (!payload.id_token) {
    return { ok: false, error: 'Réponse Google incomplète.' };
  }

  const claims = decodeIdToken(payload.id_token);
  if (!claims) return { ok: false, error: 'Jeton Google illisible.' };

  if (!claims.sub || !claims.email) {
    return { ok: false, error: 'Google n’a pas fourni d’adresse.' };
  }

  // Verrou central : une adresse non vérifiée par Google ne prouve rien.
  if (claims.email_verified !== true) {
    return {
      ok: false,
      error: 'Cette adresse Google n’est pas vérifiée. Utilise un mot de passe.',
    };
  }

  return {
    ok: true,
    identity: {
      subject: claims.sub,
      email: claims.email.trim().toLowerCase(),
      emailVerified: true,
    },
  };
}

interface IdTokenClaims {
  sub?: string;
  email?: string;
  email_verified?: boolean;
}

function decodeIdToken(token: string): IdTokenClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export type ResolveResult =
  | { ok: true; userId: string; created: boolean }
  | { ok: false; error: string };

/**
 * Retrouve ou crée le compte correspondant à une identité Google.
 *
 * Trois cas, dans cet ordre :
 *
 *   1. l'identité est déjà liée → on l'utilise ;
 *   2. un compte existe avec la même adresse → on **lie**. Sûr uniquement
 *      parce que Google a vérifié l'adresse ; sans cette garantie, ce serait
 *      une prise de contrôle offerte ;
 *   3. aucun compte → on en crée un, sans mot de passe. L'utilisateur pourra
 *      en définir un plus tard par « mot de passe oublié ».
 */
export async function resolveGoogleAccount(
  identity: GoogleIdentity,
): Promise<ResolveResult> {
  const linked = await db()
    .from('oauth_identities')
    .select('user_id')
    .eq('provider', 'google')
    .eq('subject', identity.subject)
    .maybeSingle();

  if (linked.data) {
    await db()
      .from('oauth_identities')
      .update({ last_used_at: new Date().toISOString(), email: identity.email })
      .eq('provider', 'google')
      .eq('subject', identity.subject);
    return { ok: true, userId: linked.data.user_id, created: false };
  }

  const existing = await db()
    .from('user_accounts')
    .select('id')
    .eq('email', identity.email)
    .maybeSingle();

  if (existing.data) {
    const { error } = await db().from('oauth_identities').insert({
      provider: 'google',
      subject: identity.subject,
      user_id: existing.data.id,
      email: identity.email,
      last_used_at: new Date().toISOString(),
    });
    if (error) return { ok: false, error: 'Liaison impossible.' };

    // L'adresse est désormais prouvée par Google.
    await db()
      .from('user_accounts')
      .update({ email_verified_at: new Date().toISOString() })
      .eq('id', existing.data.id)
      .is('email_verified_at', null);

    return { ok: true, userId: existing.data.id, created: false };
  }

  // --- Création ------------------------------------------------------------
  // Pseudo de repli, tiré au sort. Il ne reprend rien de l'adresse : le pseudo
  // s'affiche au classement et sur le Market, l'adresse n'a pas à y arriver.
  // Le joueur le change ensuite dans ses paramètres.
  //
  // Jusqu'à cinq tentatives : la collision est improbable (15 mots × 10 000),
  // mais une contrainte d'unicité qui échoue ne doit pas coûter un compte.
  let playerId: string | null = null;
  for (let attempt = 0; attempt < 5 && playerId === null; attempt += 1) {
    const inserted = await db()
      .from('players')
      .insert({ handle: fallbackHandle() })
      .select('id')
      .single();

    if (!inserted.error) {
      playerId = inserted.data.id;
      break;
    }
    // Toute erreur autre qu'une collision de pseudo est définitive :
    // réessayer ne ferait que répéter le même échec.
    if (inserted.error.code !== '23505') break;
  }

  if (playerId === null) {
    return { ok: false, error: 'Création du compte impossible.' };
  }

  const account = await db()
    .from('user_accounts')
    .insert({
      email: identity.email,
      // Pas de mot de passe : ce compte s'ouvre par Google.
      password_hash: null,
      player_id: playerId,
      email_verified_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (account.error) {
    await db().from('players').delete().eq('id', playerId);
    return { ok: false, error: 'Création du compte impossible.' };
  }

  const { error } = await db().from('oauth_identities').insert({
    provider: 'google',
    subject: identity.subject,
    user_id: account.data.id,
    email: identity.email,
    last_used_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: 'Liaison impossible.' };

  // Même dotation d'arrivée que par formulaire (§71) : un lien d'invitation
  // suivi d'une connexion Google est le chemin le plus court qui soit, il
  // serait absurde qu'il soit le seul à ne rien donner.
  await grantSignupBonus(playerId);

  return { ok: true, userId: account.data.id, created: true };
}
