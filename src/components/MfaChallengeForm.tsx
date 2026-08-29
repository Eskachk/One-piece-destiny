'use client';

import { useActionState } from 'react';
import { verifyMfaAction, type MfaFormState } from '@/app/actions/mfa';

/**
 * Saisie du second facteur (cahier §86).
 *
 * Le champ accepte aussi bien un code à 6 chiffres qu'un code de secours :
 * obliger l'utilisateur à choisir d'abord ajouterait une étape sans rien
 * apporter, le serveur essaie les deux.
 */
export function MfaChallengeForm() {
  const [state, formAction, pending] = useActionState<MfaFormState, FormData>(
    verifyMfaAction,
    { error: null },
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="code" className="block text-sm hb-ink-soft">
          Code de vérification
        </label>
        <input
          id="code"
          name="code"
          type="text"
          required
          inputMode="text"
          autoComplete="one-time-code"
          autoFocus
          placeholder="123456"
          className="mt-1 w-full rounded-lg border hb-border hb-input px-3 py-2 text-center font-mono text-xl tracking-[0.3em] hb-ink placeholder:tracking-normal placeholder:text-[#9aa8bf]"
        />
        <p className="mt-2 text-xs hb-ink-soft">
          Le code à 6 chiffres de ton application d&apos;authentification, ou
          l&apos;un de tes codes de secours.
        </p>
      </div>

      {state.error && (
        <p role="alert" className="text-sm hb-ko">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="transition-quick w-full rounded-xl hb-goldfill px-4 py-3 font-semibold hb-on-gold disabled:opacity-50"
      >
        {pending ? 'Vérification…' : 'Vérifier'}
      </button>
    </form>
  );
}
