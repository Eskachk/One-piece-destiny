'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdminForEnrollment } from '@/lib/auth/guards';
import {
  activateMfa,
  disableMfa,
  regenerateRecoveryCodes,
  verifySecondFactor,
} from '@/lib/auth/mfa';
import { assertSameOrigin } from '@/lib/auth/request-guard';
import {
  completeMfaChallenge,
  currentTokenHash,
  getMfaPendingSession,
  requiresReauthentication,
} from '@/lib/auth/session-store';

/**
 * Actions de double authentification (cahier §86).
 *
 * Le code saisi est validé côté serveur contre le secret stocké ; le
 * navigateur ne connaît jamais le secret après l'inscription.
 */

const CodeSchema = z
  .string()
  .trim()
  .min(6)
  .max(16)
  .transform((value) => value.replace(/\s/g, ''));

export type MfaFormState = { error: string | null };

/** Étape 2 de la connexion : promouvoir une session en attente. */
export async function verifyMfaAction(
  _previous: MfaFormState,
  formData: FormData,
): Promise<MfaFormState> {
  await assertSameOrigin();

  const session = await getMfaPendingSession();
  // Pas de session en attente : rien à valider, on repart du début.
  if (!session) redirect('/login');

  const parsed = CodeSchema.safeParse(formData.get('code'));
  if (!parsed.success) return { error: 'Code invalide.' };

  if (!(await verifySecondFactor(session.userId, parsed.data))) {
    // Message unique : ne pas distinguer un code TOTP faux d'un code de
    // secours faux, cela renseignerait sur ce que possède le compte.
    return { error: 'Code invalide.' };
  }

  const tokenHash = await currentTokenHash();
  if (!tokenHash) return { error: 'Session introuvable.' };

  await completeMfaChallenge(tokenHash);
  redirect('/admin');
}

/**
 * Régénération des codes de secours (cahier §86).
 *
 * Exige mot de passe **et** second facteur récents : c'est une opération que
 * ferait aussi un intrus disposant d'une session volée.
 */
export async function regenerateRecoveryCodesAction(
  _previous: ActivationState,
  formData: FormData,
): Promise<ActivationState> {
  await assertSameOrigin();
  const session = await requireAdminForEnrollment();

  if (requiresReauthentication(session)) {
    return {
      status: 'error',
      error: 'Reconnecte-toi avant de régénérer tes codes de secours.',
    };
  }

  const parsed = CodeSchema.safeParse(formData.get('code'));
  if (!parsed.success) return { status: 'error', error: 'Code invalide.' };

  // Un code valide est exigé même si la session est fraîche : on vérifie que
  // la personne a bien l'appareil, pas seulement le cookie.
  if (!(await verifySecondFactor(session.userId, parsed.data))) {
    return { status: 'error', error: 'Code invalide.' };
  }

  const result = await regenerateRecoveryCodes(session.userId);
  if (!result.ok) return { status: 'error', error: result.error };

  return {
    status: 'activated',
    error: null,
    recoveryCodes: result.recoveryCodes,
  };
}

export type DisableState = { error: string | null; done: boolean };

/** Désactivation de la MFA (cahier §86). */
export async function disableMfaAction(
  _previous: DisableState,
  formData: FormData,
): Promise<DisableState> {
  await assertSameOrigin();
  const session = await requireAdminForEnrollment();

  if (requiresReauthentication(session)) {
    return {
      error: 'Reconnecte-toi avant de désactiver la double authentification.',
      done: false,
    };
  }

  const parsed = CodeSchema.safeParse(formData.get('code'));
  if (!parsed.success) return { error: 'Code invalide.', done: false };

  if (!(await verifySecondFactor(session.userId, parsed.data))) {
    return { error: 'Code invalide.', done: false };
  }

  if (!(await disableMfa(session.userId))) {
    return { error: 'Désactivation impossible.', done: false };
  }

  // Un administrateur sans MFA est immédiatement redirigé vers l'inscription
  // par `requireAdmin` : la désactivation ne rouvre donc pas le HQ.
  redirect('/admin/mfa');
}

export type ActivationState =
  | { status: 'idle'; error: null }
  | { status: 'error'; error: string }
  | { status: 'activated'; error: null; recoveryCodes: string[] };

/** Confirme l'inscription à la MFA et délivre les codes de secours. */
export async function activateMfaAction(
  _previous: ActivationState,
  formData: FormData,
): Promise<ActivationState> {
  await assertSameOrigin();
  const session = await requireAdminForEnrollment();

  const parsed = CodeSchema.safeParse(formData.get('code'));
  if (!parsed.success) return { status: 'error', error: 'Code invalide.' };

  const result = await activateMfa(session.userId, parsed.data);
  if (!result.ok) return { status: 'error', error: result.error };

  return {
    status: 'activated',
    error: null,
    recoveryCodes: result.recoveryCodes,
  };
}
