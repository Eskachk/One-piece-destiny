import type { Metadata } from 'next';
import Link from 'next/link';
import { CompleteResetForm } from '@/components/PasswordResetForms';
import { isResetTokenUsable } from '@/lib/auth/password-reset';
import { traduire } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await traduire();
  return { title: t('auth.reset.meta'), robots: { index: false, follow: false } };
}

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
  const { t } = await traduire();
  const usable = token ? await isResetTokenUsable(token) : false;

  return (
    <main className="mx-auto w-full max-w-[430px] px-5 py-12">
      <p className="text-xs uppercase tracking-[0.25em] text-turquoise">
        {t('brand')}
      </p>
      <h1 className="mt-1 font-display text-3xl text-parchment">
        {t('auth.reset.title')}
      </h1>

      <div className="mt-8">
        {usable ? (
          <CompleteResetForm token={token!} />
        ) : (
          <div className="space-y-4">
            <p className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-parchment/80">
              {t('auth.reset.expired')}
            </p>
            <Link
              href="/forgot"
              className="transition-quick block w-full rounded-xl bg-treasure px-4 py-3 text-center font-semibold text-abyss"
            >
              {t('auth.action.newLink')}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
