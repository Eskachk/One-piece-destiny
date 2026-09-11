import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { registerAction } from '@/app/actions/auth';
import { AuthForm } from '@/components/AuthForm';
import { GoogleButton } from '@/components/GoogleButton';
import { HarborScene, HarborTitle } from '@/components/HarborScene';
import { isGoogleEnabled } from '@/lib/auth/google';
import {
  getAuthenticatedSession,
  getMfaPendingSession,
} from '@/lib/auth/session-store';
import { traduire } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await traduire();
  return {
    title: t('auth.register.meta'),
    description: t('auth.register.description'),
    // Indexable, et c'était une contradiction à corriger : cette page portait
    // `noindex, nofollow` tout en figurant dans le sitemap. C'est la page
    // d'entrée du jeu, celle qu'on veut voir sortir sur « jeu de pronostics
    // One Piece ».
    alternates: { canonical: '/register' },
    openGraph: {
      title: t('auth.register.ogTitle'),
      description: t('auth.register.ogDescription'),
    },
  };
}

export default async function RegisterPage() {
  const { t } = await traduire();
  if (await getAuthenticatedSession()) redirect('/');
  // Défi en cours : le terminer plutôt que de redemander le mot de passe.
  if (await getMfaPendingSession()) redirect('/login/mfa');

  return (
    <HarborScene>
      <HarborTitle title={t('auth.register.title')} tagline={t('auth.register.tagline')} />
      <AuthForm mode="register" action={registerAction} />
      {isGoogleEnabled() && <GoogleButton />}
    </HarborScene>
  );
}
