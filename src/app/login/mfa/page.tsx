import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { logoutAction } from '@/app/actions/auth';
import { MfaChallengeForm } from '@/components/MfaChallengeForm';
import { getMfaPendingSession } from '@/lib/auth/session-store';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Vérification',
  robots: { index: false, follow: false },
};

export default async function MfaChallengePage() {
  // Sans session en attente, il n'y a rien à vérifier : on repart du début.
  // Cette page ne doit jamais être un moyen de contourner le mot de passe.
  const session = await getMfaPendingSession();
  if (!session) redirect('/login');

  return (
    <main className="mx-auto w-full max-w-[430px] px-5 py-12">
      <p className="text-xs uppercase tracking-[0.25em] text-turquoise">
        Grand Line Weekly
      </p>
      <h1 className="mt-1 font-display text-3xl text-parchment">
        Vérification en deux étapes
      </h1>
      <p className="mt-2 text-sm text-parchment/60">
        Compte administrateur — <span className="text-parchment">{session.email}</span>
      </p>

      <div className="mt-8">
        <MfaChallengeForm />
      </div>

      {/* Sortie de secours.
          Sans elle, cette page était un cul-de-sac : quiconque commençait une
          connexion sans pouvoir fournir son code y restait indéfiniment, et
          toute navigation l'y ramenait — la session en attente survivait. Il
          n'y avait littéralement aucun moyen de repartir, pas même en allant
          sur /login.

          Le bouton révoque la session en attente, ce qui est aussi la bonne
          chose à faire du point de vue de la sécurité : une session laissée
          ouverte à mi-authentification n'a aucune raison de traîner. */}
      <form action={logoutAction} className="mt-6">
        <button type="submit" className="text-xs text-turquoise underline">
          Utiliser un autre compte
        </button>
      </form>
    </main>
  );
}
