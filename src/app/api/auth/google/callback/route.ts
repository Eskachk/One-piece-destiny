import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { audit } from '@/lib/audit';
import {
  exchangeGoogleCode,
  googleConfig,
  resolveGoogleAccount,
  stateMatches,
  STATE_COOKIE,
  VERIFIER_COOKIE,
} from '@/lib/auth/google';
import { createSession } from '@/lib/auth/session-store';
import { baseUrl } from '@/lib/email/templates';
import { db } from '@/lib/supabase-admin';

/**
 * Retour de Google.
 *
 * L'ordre des contrôles n'est pas indifférent : le `state` est vérifié
 * **avant** tout échange de code. Un attaquant qui déclenche ce retour dans le
 * navigateur d'un tiers doit être arrêté avant qu'on ne parle à Google — sinon
 * son identité serait liée au compte de la victime.
 *
 * Les erreurs renvoient vers `/login` avec un motif court. Aucune ne détaille
 * l'état interne : « ce compte existe », « cette adresse est prise » seraient
 * autant d'oracles.
 */
export const dynamic = 'force-dynamic';

/**
 * Retour à l'écran de connexion, avec un motif court.
 *
 * La base vient de `baseUrl()`, pas de `APP_URL` seule : `APP_URL` n'est pas
 * renseignée sur l'hébergement, et le repli codé en dur envoyait donc chaque
 * échec de connexion Google vers `http://localhost:3000` — une page qui
 * n'existe pas pour le joueur. `baseUrl()` retombe sur l'URL de production
 * que la plateforme expose elle-même.
 */
function back(reason: string): NextResponse {
  return NextResponse.redirect(
    new URL(`/login?erreur=${encodeURIComponent(reason)}`, baseUrl()),
  );
}

export async function GET(request: Request) {
  const config = googleConfig();
  if (!config) return back('indisponible');

  const url = new URL(request.url);
  const store = await cookies();

  // Le départ a posé ces deux cookies ; on les retire quoi qu'il arrive, pour
  // qu'un échange ne puisse jamais être rejoué.
  const expectedState = store.get(STATE_COOKIE)?.value ?? '';
  const verifier = store.get(VERIFIER_COOKIE)?.value ?? '';
  store.delete(STATE_COOKIE);
  store.delete(VERIFIER_COOKIE);

  // Google signale un refus de l'utilisateur.
  if (url.searchParams.get('error')) return back('annule');

  const state = url.searchParams.get('state') ?? '';
  if (!stateMatches(state, expectedState)) {
    console.warn('[auth] GOOGLE_STATE_MISMATCH');
    return back('etat');
  }

  const code = url.searchParams.get('code');
  if (!code || !verifier) return back('incomplet');

  const exchange = await exchangeGoogleCode(config, code, verifier);
  if (!exchange.ok) return back('echange');

  const resolved = await resolveGoogleAccount(exchange.identity);
  if (!resolved.ok) return back('compte');

  // La MFA reste due : un compte administrateur protégé par TOTP ne doit pas
  // pouvoir la contourner en passant par Google.
  const { data: account } = await db()
    .from('user_accounts')
    .select('mfa_enabled, player_id')
    .eq('id', resolved.userId)
    .maybeSingle();

  const requestHeaders = await headers();
  await createSession(
    resolved.userId,
    {
      ip: requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined,
      userAgent: requestHeaders.get('user-agent') ?? undefined,
    },
    { mfaPending: Boolean(account?.mfa_enabled) },
  );

  await audit({
    playerId: account?.player_id ?? null,
    action: resolved.created ? 'auth.google_signup' : 'auth.google_login',
    status: 'SUCCESS',
    metadata: {},
  });

  const destination = account?.mfa_enabled ? '/login/mfa' : '/';
  return NextResponse.redirect(new URL(destination, url.origin));
}
