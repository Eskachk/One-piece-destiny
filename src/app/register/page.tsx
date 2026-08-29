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

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Inscription',
  robots: { index: false, follow: false },
};

export default async function RegisterPage() {
  if (await getAuthenticatedSession()) redirect('/');
  // Défi en cours : le terminer plutôt que de redemander le mot de passe.
  if (await getMfaPendingSession()) redirect('/login/mfa');

  return (
    <HarborScene>
      <HarborTitle
        title="Embarque"
        tagline="Le chapitre est le spectacle."
      />
      <AuthForm mode="register" action={registerAction} />
      {isGoogleEnabled() && <GoogleButton />}
    </HarborScene>
  );
}
