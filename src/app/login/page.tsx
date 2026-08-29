import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { loginAction } from '@/app/actions/auth';
import { AuthForm } from '@/components/AuthForm';
import { GoogleButton } from '@/components/GoogleButton';
import { HarborScene, HarborTitle } from '@/components/HarborScene';
import { isGoogleEnabled } from '@/lib/auth/google';
import {
  getAuthenticatedSession,
  getMfaPendingSession,
} from '@/lib/auth/session-store';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Connexion',
  // §85 : pas de mise en cache d'une page d'authentification.
  robots: { index: false, follow: false },
};

/**
 * Motifs d'échec renvoyés par le retour Google.
 *
 * Volontairement courts et non spécifiques : détailler l'état interne
 * offrirait un oracle pour tester l'existence d'un compte.
 */
const OAUTH_ERRORS: Record<string, string> = {
  annule: 'Connexion Google annulée.',
  etat: 'Requête expirée ou invalide. Réessaie.',
  incomplet: 'Réponse Google incomplète. Réessaie.',
  echange: 'Google n’a pas confirmé cette connexion.',
  compte: 'Impossible d’ouvrir ce compte.',
  indisponible: 'La connexion Google n’est pas configurée.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;

  if (await getAuthenticatedSession()) redirect('/');
  // Défi en cours : le terminer plutôt que de redemander le mot de passe.
  if (await getMfaPendingSession()) redirect('/login/mfa');

  return (
    <HarborScene>
      <HarborTitle title="Connexion" tagline="L’aube d’une aventure." />

      {erreur && (
        <p role="alert" className="harbor__alert" style={{ marginTop: '1.4rem' }}>
          {OAUTH_ERRORS[erreur] ?? 'Connexion impossible.'}
        </p>
      )}

      <AuthForm mode="login" action={loginAction} />
      {isGoogleEnabled() && <GoogleButton />}
    </HarborScene>
  );
}
