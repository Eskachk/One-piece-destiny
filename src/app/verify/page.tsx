import type { Metadata } from 'next';
import Link from 'next/link';
import { confirmEmail } from '@/lib/auth/email-verification';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Confirmation d’adresse',
  robots: { index: false, follow: false },
};

/**
 * Confirmation d'adresse e-mail (cahier §86).
 *
 * La validation a lieu **au chargement**, sans bouton : le lien reçu par
 * e-mail est déjà l'intention du joueur, et lui demander de cliquer une
 * seconde fois n'ajoute aucune sécurité — le jeton reste à usage unique et
 * expire en 24 h.
 */
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token
    ? await confirmEmail(token)
    : { ok: false as const, error: 'Lien incomplet.' };

  return (
    <main className="mx-auto w-full max-w-[430px] px-5 py-16">
      <p className="text-xs uppercase tracking-[0.25em] text-turquoise">
        One Piece Quest
      </p>
      <h1 className="mt-1 font-display text-3xl text-parchment">
        {result.ok ? 'Adresse confirmée' : 'Confirmation impossible'}
      </h1>

      {result.ok ? (
        <p className="mt-4 rounded-xl border border-turquoise/25 bg-navy/40 p-4 text-sm text-parchment/80">
          <span className="text-parchment">{result.email}</span> est bien la
          tienne. C’est cette adresse qui recevra les liens de réinitialisation
          et les alertes de sécurité.
        </p>
      ) : (
        <p role="alert" className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-parchment/80">
          {result.error}
        </p>
      )}

      <nav className="mt-6 flex gap-4 text-sm text-turquoise">
        <Link href="/" className="underline">
          Retour au jeu
        </Link>
        <Link href="/profil" className="underline">
          Mon profil
        </Link>
      </nav>
    </main>
  );
}
