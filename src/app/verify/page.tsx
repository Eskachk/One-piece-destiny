import type { Metadata } from 'next';
import Link from 'next/link';
import { confirmEmail } from '@/lib/auth/email-verification';
import { traduire } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await traduire();
  return { title: t('auth.verify.meta'), robots: { index: false, follow: false } };
}

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
  const { t, tradMessage } = await traduire();
  const result = token
    ? await confirmEmail(token)
    : { ok: false as const, error: t('auth.verify.incomplete') };

  return (
    <main className="mx-auto w-full max-w-[430px] px-5 py-16">
      <p className="text-xs uppercase tracking-[0.25em] text-turquoise">
        {t('brand')}
      </p>
      <h1 className="mt-1 font-display text-3xl text-parchment">
        {result.ok ? t('auth.verify.ok') : t('auth.verify.ko')}
      </h1>

      {result.ok ? (
        <p className="mt-4 rounded-xl border border-turquoise/25 bg-navy/40 p-4 text-sm text-parchment/80">
          {t('auth.verify.body', { email: result.email })}
        </p>
      ) : (
        <p role="alert" className="mt-4 rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-parchment/80">
          {tradMessage(result.error)}
        </p>
      )}

      <nav className="mt-6 flex gap-4 text-sm text-turquoise">
        <Link href="/" className="underline">
          {t('auth.action.backToGame')}
        </Link>
        <Link href="/profil" className="underline">
          {t('auth.action.myProfile')}
        </Link>
      </nav>
    </main>
  );
}
