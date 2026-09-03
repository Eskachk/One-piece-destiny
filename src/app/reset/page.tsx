import type { Metadata } from 'next';
import Link from 'next/link';
import { CompleteResetForm } from '@/components/PasswordResetForms';
import { isResetTokenUsable } from '@/lib/auth/password-reset';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Nouveau mot de passe',
  robots: { index: false, follow: false },
};

/**
 * Le jeton arrive en paramètre d'URL — c'est inhérent à un lien par e-mail.
 * Il est donc court-vécu (une heure), à usage unique, et sa consommation
 * ferme toutes les sessions (cahier §85, §86).
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const usable = token ? await isResetTokenUsable(token) : false;

  return (
    <main className="mx-auto w-full max-w-[430px] px-5 py-12">
      <p className="text-xs uppercase tracking-[0.25em] text-turquoise">
        One Piece Quest
      </p>
      <h1 className="mt-1 font-display text-3xl text-parchment">
        Nouveau mot de passe
      </h1>

      <div className="mt-8">
        {usable ? (
          <CompleteResetForm token={token!} />
        ) : (
          <div className="space-y-4">
            <p className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-parchment/80">
              Ce lien est invalide ou a expiré. Les liens ne valent qu&apos;une
              heure et ne servent qu&apos;une fois.
            </p>
            <Link
              href="/forgot"
              className="transition-quick block w-full rounded-xl bg-treasure px-4 py-3 text-center font-semibold text-abyss"
            >
              Demander un nouveau lien
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
