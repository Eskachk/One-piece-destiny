'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { login, register } from '@/lib/auth/service';
import { destroySession } from '@/lib/auth/session-store';
import {
  assertSameOrigin,
  getRequestContext,
} from '@/lib/auth/request-guard';

/**
 * Actions d'authentification.
 *
 * Chaque action commence par vérifier l'origine (§87) puis valide ses entrées
 * par un schéma (§88). Les erreurs renvoyées au client restent génériques.
 */

const CredentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(128),
});

export type AuthFormState = { error: string | null };

function readCredentials(formData: FormData) {
  return CredentialsSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
}

export async function loginAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  await assertSameOrigin();

  const parsed = readCredentials(formData);
  // Même message qu'un mot de passe faux : une erreur de format ne doit pas
  // renseigner l'attaquant davantage.
  if (!parsed.success) return { error: 'Identifiants invalides.' };

  const result = await login(
    parsed.data.email,
    parsed.data.password,
    await getRequestContext(),
  );

  if (!result.ok) return { error: result.error };

  // Mot de passe correct mais second facteur requis : la session ouverte
  // n'authentifie pas encore, elle ne donne accès qu'à l'écran de saisie.
  redirect(result.mfaRequired ? '/login/mfa' : '/');
}

export async function registerAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  await assertSameOrigin();

  const parsed = readCredentials(formData);
  if (!parsed.success) {
    return { error: 'Adresse e-mail ou mot de passe invalide.' };
  }

  const result = await register(
    parsed.data.email,
    parsed.data.password,
    await getRequestContext(),
  );

  if (!result.ok) return { error: result.error };
  redirect('/');
}

export async function logoutAction(): Promise<void> {
  await assertSameOrigin();
  await destroySession();
  redirect('/login');
}
