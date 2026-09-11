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
import { traduire } from '@/lib/i18n';
import type { MessageKey } from '@/domain/i18n/locales';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await traduire();
  return {
    title: t('auth.login.meta'),
    // §85 : pas de mise en cache d'une page d'authentification.
    robots: { index: false, follow: false },
  };
}

/**
 * Motifs d'échec renvoyés par le retour Google.
 *
 * Volontairement courts et non spécifiques : détailler l'état interne
 * offrirait un oracle pour tester l'existence d'un compte.
 */
const OAUTH_ERRORS = new Set(['annule', 'etat', 'incomplet', 'echange', 'compte', 'indisponible']);

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { erreur } = await searchParams;
  const { t } = await traduire();

  if (await getAuthenticatedSession()) redirect('/');
  // Défi en cours : le terminer plutôt que de redemander le mot de passe.
  if (await getMfaPendingSession()) redirect('/login/mfa');

  return (
    <HarborScene>
      <HarborTitle title={t('auth.login.title')} tagline={t('auth.login.tagline')} />

      {erreur && (
        <p role="alert" className="harbor__alert" style={{ marginTop: '1.4rem' }}>
          {OAUTH_ERRORS.has(erreur)
            ? t(`auth.google.${erreur}` as MessageKey)
            : t('auth.google.generic')}
        </p>
      )}

      <AuthForm mode="login" action={loginAction} />
      {isGoogleEnabled() && <GoogleButton />}
    </HarborScene>
  );
}
