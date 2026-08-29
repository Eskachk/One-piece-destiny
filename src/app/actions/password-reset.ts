'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import {
  completePasswordReset,
  GENERIC_REQUEST_MESSAGE,
  requestPasswordReset,
} from '@/lib/auth/password-reset';
import {
  assertSameOrigin,
  getRequestContext,
} from '@/lib/auth/request-guard';

/**
 * Actions de réinitialisation (cahier §86).
 *
 * La demande répond toujours la même chose. Le formulaire ne doit pas devenir
 * un moyen de savoir qui possède un compte.
 */

export type RequestState = { message: string | null };

const EmailSchema = z.string().trim().toLowerCase().email().max(254);

export async function requestResetAction(
  _previous: RequestState,
  formData: FormData,
): Promise<RequestState> {
  await assertSameOrigin();

  const parsed = EmailSchema.safeParse(formData.get('email'));
  // Même une adresse mal formée reçoit la réponse générique : signaler
  // « adresse invalide » distinguerait déjà deux cas.
  if (!parsed.success) return { message: GENERIC_REQUEST_MESSAGE };

  const store = await headers();
  const host = store.get('host');
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';

  await requestPasswordReset(parsed.data, {
    ...(await getRequestContext()),
    origin: `${protocol}://${host}`,
  });

  return { message: GENERIC_REQUEST_MESSAGE };
}

export type ResetState = { error: string | null };

const ResetSchema = z.object({
  token: z.string().min(10).max(128),
  password: z.string().min(1).max(128),
});

export async function completeResetAction(
  _previous: ResetState,
  formData: FormData,
): Promise<ResetState> {
  await assertSameOrigin();

  const parsed = ResetSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: 'Lien ou mot de passe invalide.' };
  }

  const result = await completePasswordReset(
    parsed.data.token,
    parsed.data.password,
  );
  if (!result.ok) return { error: result.error };

  // Toutes les sessions ont été révoquées : on repasse par la connexion.
  redirect('/login?reset=1');
}
