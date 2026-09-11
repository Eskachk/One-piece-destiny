'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import {
  completeResetAction,
  requestResetAction,
  type RequestState,
  type ResetState,
} from '@/app/actions/password-reset';
import { PASSWORD_MIN_LENGTH } from '@/domain/auth/password-policy';
import { useT } from '@/components/LocaleProvider';

/** Demande d'un lien de réinitialisation. */
export function RequestResetForm() {
  const { t, tradMessage } = useT();
  const [state, formAction, pending] = useActionState<RequestState, FormData>(
    requestResetAction,
    { message: null },
  );

  // Réponse envoyée, quelle que soit l'issue réelle : on n'affiche plus le
  // formulaire pour ne pas inviter à sonder d'autres adresses.
  if (state.message) {
    return (
      <div className="space-y-4">
        <p
          role="status"
          className="rounded-xl border hb-border bg-turquoise/10 p-4 text-sm hb-ink"
        >
          {tradMessage(state.message)}
        </p>
        <Link href="/login" className="block text-center text-sm hb-accent underline">
          {t('auth.action.backToLogin')}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm hb-ink-soft">
          {t('auth.field.email')}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-lg border hb-border hb-input px-3 py-2 hb-ink"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="transition-quick w-full rounded-xl hb-goldfill px-4 py-3 font-semibold hb-on-gold disabled:opacity-50"
      >
        {pending ? t('auth.action.sending') : t('auth.action.sendLink')}
      </button>

      <p className="text-center text-sm hb-ink-soft">
        <Link href="/login" className="hb-accent underline">
          {t('auth.action.backToLogin')}
        </Link>
      </p>
    </form>
  );
}

/** Choix du nouveau mot de passe, une fois le lien ouvert. */
export function CompleteResetForm({ token }: { token: string }) {
  const { t, tradMessage } = useT();
  const [state, formAction, pending] = useActionState<ResetState, FormData>(
    completeResetAction,
    { error: null },
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <div>
        <label htmlFor="password" className="block text-sm hb-ink-soft">
          {t('auth.field.newPassword')}
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={PASSWORD_MIN_LENGTH}
          autoComplete="new-password"
          autoFocus
          className="mt-1 w-full rounded-lg border hb-border hb-input px-3 py-2 hb-ink"
        />
        <p className="mt-1 text-xs hb-ink-soft">
          {t('auth.field.passwordMin', { min: PASSWORD_MIN_LENGTH })}
        </p>
      </div>

      {state.error && (
        <p role="alert" className="text-sm hb-ko">
          {tradMessage(state.error)}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="transition-quick w-full rounded-xl hb-goldfill px-4 py-3 font-semibold hb-on-gold disabled:opacity-50"
      >
        {pending ? t('auth.action.saving') : t('auth.action.changePassword')}
      </button>

      <p className="text-xs hb-ink-soft">
        {t('auth.reset.sessionsClosed')}
      </p>
    </form>
  );
}
