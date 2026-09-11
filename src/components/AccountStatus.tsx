'use client';

import { useState, useTransition } from 'react';
import { resendVerificationAction, setBirthDateAction } from '@/app/actions/preferences';
import { attempt } from './attempt';
import { useT } from './LocaleProvider';

/**
 * État du compte : adresse confirmée et date de naissance (cahier §86, §114).
 *
 * Deux éléments réunis parce qu'ils répondent à la même question — que
 * manque-t-il à ce compte pour être complet ? — et parce qu'aucun des deux ne
 * mérite un écran à lui seul.
 *
 * La date de naissance est **déclarative** et le dit : la présenter comme une
 * vérification serait mentir sur le niveau de protection réel.
 */
export function AccountStatus({
  verified,
  birthDate,
  restrictionReason,
}: {
  verified: boolean;
  birthDate: string | null;
  restrictionReason: string;
}) {
  const { t, tradMessage } = useT();
  const [message, setMessage] = useState<string | null>(null);
  const [date, setDate] = useState(birthDate ?? '');
  const [pending, startTransition] = useTransition();

  const resend = () => {
    startTransition(async () => {
      const result = await attempt(resendVerificationAction());
      setMessage(result.ok ? result.message : result.error);
    });
  };

  const saveDate = () => {
    startTransition(async () => {
      const result = await attempt(setBirthDateAction(date));
      setMessage(result.ok ? result.message : result.error);
    });
  };

  return (
    <section className="rounded-xl hb-surface p-5">
      <h2 className="font-display text-xl hb-ink">{t('pf.account')}</h2>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm hb-ink">{t('pf.account.email')}</p>
          <p className="text-xs hb-ink-soft">
            {verified ? t('pf.account.email.ok') : t('pf.account.email.ko')}
          </p>
        </div>
        {verified ? (
          <span className="shrink-0 text-sm hb-accent">✓</span>
        ) : (
          <button
            type="button"
            onClick={resend}
            disabled={pending}
            aria-busy={pending}
            className="shrink-0 text-xs hb-accent underline disabled:opacity-40"
          >
            {t('pf.account.resend')}
          </button>
        )}
      </div>

      <div className="mt-4 border-t hb-border pt-4">
        <label htmlFor="birthDate" className="text-sm hb-ink">
          {t('pf.account.birth')}
        </label>
        <p className="text-xs hb-ink-soft">{restrictionReason}</p>

        <div className="mt-2 flex items-center gap-2">
          <input
            id="birthDate"
            type="date"
            value={date}
            disabled={pending || birthDate !== null}
            aria-busy={pending}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-md border hb-border hb-input px-2 py-1 font-mono text-xs hb-ink"
          />
          <button
            type="button"
            onClick={saveDate}
            disabled={pending || date === '' || birthDate !== null}
            aria-busy={pending}
            className="text-xs hb-accent underline disabled:opacity-30"
          >
            {t('action.save')}
          </button>
        </div>

        <p className="mt-2 text-[11px] hb-ink-soft">
          {birthDate === null ? t('pf.account.birth.new') : t('pf.account.birth.set')}
        </p>
      </div>

      {message && (
        <p role="status" className="mt-3 text-sm hb-accent">
          {tradMessage(message)}
        </p>
      )}
    </section>
  );
}
