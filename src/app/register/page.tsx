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
  title: 'Embarque — crée ton équipage',
  description:
    'Rejoins One Piece Quest : choisis 3 personnages avant dimanche 23:59, marque des points quand ils apparaissent dans le chapitre, et grimpe au classement hebdomadaire. Gratuit.',
  /*
   * Indexable, et c'était une contradiction à corriger.
   *
   * Cette page portait `noindex, nofollow` **tout en figurant dans le
   * sitemap** : on demandait à Google de la parcourir et de l'ignorer. Or
   * c'est la page d'entrée du jeu — celle qu'on veut voir sortir sur « jeu de
   * pronostics One Piece ». Le `nofollow` bloquait en plus la transmission de
   * popularité vers le reste du site.
   */
  alternates: { canonical: '/register' },
  openGraph: {
    title: 'Embarque — One Piece Quest',
    description:
      'Choisis 3 personnages avant dimanche. Marque des points quand ils apparaissent.',
  },
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
