import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  beginGoogleSignIn,
  googleConfig,
  HANDSHAKE_TTL_SECONDS,
  STATE_COOKIE,
  VERIFIER_COOKIE,
} from '@/lib/auth/google';

/**
 * Départ de la connexion Google.
 *
 * `state` et le vérificateur PKCE sont posés en cookies **httpOnly** : le
 * navigateur les renverra au retour, mais aucun script de page ne peut les
 * lire — c'est ce qui rend la protection CSRF effective plutôt que décorative.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const config = googleConfig();
  if (!config) {
    return NextResponse.json(
      { error: 'Connexion Google non configurée.' },
      { status: 503 },
    );
  }

  const handshake = beginGoogleSignIn(config);
  const store = await cookies();

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: HANDSHAKE_TTL_SECONDS,
  };

  store.set(STATE_COOKIE, handshake.state, options);
  store.set(VERIFIER_COOKIE, handshake.verifier, options);

  return NextResponse.redirect(handshake.url);
}
