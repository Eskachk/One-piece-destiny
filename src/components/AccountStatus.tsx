'use client';

import { useState, useTransition } from 'react';
import { resendVerificationAction, setBirthDateAction } from '@/app/actions/preferences';
import { attempt } from './attempt';

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
      <h2 className="font-display text-xl hb-ink">Compte</h2>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm hb-ink">Adresse e-mail</p>
          <p className="text-xs hb-ink-soft">
            {verified
              ? 'Confirmée. C’est elle qui reçoit les alertes de sécurité.'
              : 'Non confirmée. Confirme-la pour sécuriser la récupération de ton compte.'}
          </p>
        </div>
        {verified ? (
          <span className="shrink-0 text-sm hb-accent">✓</span>
        ) : (
          <button
            type="button"
            onClick={resend}
            disabled={pending}
            className="shrink-0 text-xs hb-accent underline disabled:opacity-40"
          >
            Renvoyer le lien
          </button>
        )}
      </div>

      <div className="mt-4 border-t hb-border pt-4">
        <label htmlFor="birthDate" className="text-sm hb-ink">
          Date de naissance
        </label>
        <p className="text-xs hb-ink-soft">{restrictionReason}</p>

        <div className="mt-2 flex items-center gap-2">
          <input
            id="birthDate"
            type="date"
            value={date}
            disabled={pending || birthDate !== null}
            onChange={(event) => setDate(event.target.value)}
            className="rounded-md border hb-border hb-input px-2 py-1 font-mono text-xs hb-ink"
          />
          <button
            type="button"
            onClick={saveDate}
            disabled={pending || date === '' || birthDate !== null}
            className="text-xs hb-accent underline disabled:opacity-30"
          >
            Enregistrer
          </button>
        </div>

        <p className="mt-2 text-[11px] hb-ink-soft">
          {birthDate === null
            ? 'Déclarative : elle n’est pas vérifiée. Elle sert à appliquer les restrictions d’âge, et ne se saisit qu’une fois.'
            : 'Enregistrée, et non modifiable. Sans cela, un compte restreint n’aurait qu’à se redéclarer majeur.'}
        </p>
      </div>

      {message && (
        <p role="status" className="mt-3 text-sm hb-accent">
          {message}
        </p>
      )}
    </section>
  );
}
