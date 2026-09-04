'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { login, register } from '@/lib/auth/service';
import { destroySession } from '@/lib/auth/session-store';
import {
  assertSameOrigin,
  getRequestContext,
} from '@/lib/auth/request-guard';
import {
  consumeQuotaByIp,
  throttleMessage,
} from '@/lib/auth/action-throttle';

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

/**
 * Inscription : le pseudo s'ajoute aux identifiants.
 *
 * La validation de forme est faite par `checkHandle` dans le service, qui sait
 * dire *ce qui* ne va pas. Ici on borne seulement la taille reçue — un champ
 * de 10 Mo n'a pas à traverser la couche métier.
 */
const RegistrationSchema = CredentialsSchema.extend({
  handle: z.string().trim().min(1).max(64),
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

  const parsed = RegistrationSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    handle: formData.get('handle'),
  });
  if (!parsed.success) {
    return { error: 'Pseudo, adresse e-mail ou mot de passe invalide.' };
  }

  /*
   * Le quota le plus important du produit. Chaque inscription ouvre un coffre
   * de départ et peut déclencher un versement de parrainage : c'est de la
   * valeur créée, et la seule chose qui en gardait le rythme était le moteur
   * anti-abus — qui détecte après coup au lieu de freiner.
   *
   * Compté **après** la validation du formulaire : un champ mal rempli est une
   * faute d'humain, pas une tentative, et la consommer punirait une faute de
   * frappe.
   */
  const cadence = await consumeQuotaByIp('inscription');
  if (!cadence.autorise) return { error: throttleMessage(cadence) };

  const result = await register(
    parsed.data.email,
    parsed.data.password,
    parsed.data.handle,
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
