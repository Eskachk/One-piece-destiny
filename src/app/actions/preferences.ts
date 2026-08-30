'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { isPlausibleBirthDate } from '@/domain/compliance/age';
import type { NotificationPreferences } from '@/domain/notifications/preferences';
import { assertSameOrigin, getRequestContext } from '@/lib/auth/request-guard';
import { sendVerificationEmail } from '@/lib/auth/email-verification';
import { requireSession } from '@/lib/auth/guards';
import { savePreferences } from '@/lib/notifications/dispatch';
import { db } from '@/lib/supabase-admin';
import { audit } from '@/lib/audit';

/**
 * Préférences de notification et date de naissance.
 *
 * Deux protections contre l'IDOR, et elles tiennent au même choix : **le
 * joueur visé n'est jamais un paramètre.** Il vient de la session. Aucune
 * requête ne peut donc désigner le compte d'autrui, quoi qu'elle contienne.
 */

export type PreferencesResult =
  | { ok: true; preferences: NotificationPreferences }
  | { ok: false; error: string };

const PreferencesSchema = z.object({
  weeklyEmail: z.boolean(),
  rewardsEmail: z.boolean(),
  marketingEmail: z.boolean(),
  weeklyInApp: z.boolean(),
  rewardsInApp: z.boolean(),
});

export async function updatePreferencesAction(
  input: unknown,
): Promise<PreferencesResult> {
  await assertSameOrigin();
  const session = await requireSession();

  const parsed = PreferencesSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Préférences invalides.' };
  }

  // `savePreferences` refiltre les clés : la validation Zod protège la forme,
  // le filtre du domaine protège le contenu écrit en base.
  const preferences = await savePreferences(session.playerId, parsed.data);

  revalidatePath('/profil');
  return { ok: true, preferences };
}

export type BirthDateResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * Enregistre la date de naissance déclarée (§114).
 *
 * Déclarative, jamais vérifiée — le cahier ne prévoit aucun contrôle
 * d'identité, et prétendre le contraire serait mentir sur le niveau de
 * protection réel. Elle sert à appliquer les restrictions d'achat, calculées
 * côté serveur à chaque fois.
 */
export async function setBirthDateAction(input: unknown): Promise<BirthDateResult> {
  await assertSameOrigin();
  const session = await requireSession();

  const parsed = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: 'Indique une date au format JJ/MM/AAAA.' };
  }

  const date = new Date(`${parsed.data}T00:00:00Z`);
  if (!isPlausibleBirthDate(date, new Date())) {
    return { ok: false, error: 'Cette date de naissance n’est pas plausible.' };
  }

  // **Écrit une seule fois.**
  //
  // Sans le `is('birth_date', null)`, la date se réécrivait à volonté : un
  // compte bloqué parce que mineur n'avait qu'à se déclarer majeur, et la
  // protection du §114 ne protégeait plus rien du tout. La date reste
  // déclarative — on ne vérifie l'identité de personne — mais on ne la déclare
  // qu'une fois.
  //
  // `select` renvoie les lignes réellement touchées : zéro ligne signifie que
  // la date était déjà posée. Une correction passe alors par le support, ce
  // qui est le bon niveau de friction pour une donnée qui ouvre des achats.
  const { data, error } = await db()
    .from('user_accounts')
    .update({ birth_date: parsed.data })
    .eq('player_id', session.playerId)
    .is('birth_date', null)
    .select('id');

  if (error) {
    return { ok: false, error: 'Enregistrement impossible.' };
  }

  if (!data || data.length === 0) {
    return {
      ok: false,
      error:
        'Ta date de naissance est déjà enregistrée et ne peut pas être modifiée.',
    };
  }

  // Journalisé sans la date : c'est une donnée personnelle, et savoir que le
  // champ a été renseigné suffit à la traçabilité (§100).
  await audit({
    playerId: session.playerId,
    action: 'account.birthdate_set',
    status: 'SUCCESS',
    metadata: {},
  });

  revalidatePath('/profil');
  return { ok: true, message: 'Date de naissance enregistrée.' };
}

export type ResendResult = { ok: true; message: string } | { ok: false; error: string };

/**
 * Renvoie le lien de confirmation d'adresse (cahier §86).
 *
 * Réponse toujours identique, qu'un message parte ou non. Distinguer
 * « déjà vérifié » de « renvoyé » offrirait un oracle pour tester l'état d'un
 * compte — et la limitation de débit protège du reste.
 */
export async function resendVerificationAction(): Promise<ResendResult> {
  await assertSameOrigin();
  const session = await requireSession();

  const context = await getRequestContext();
  const origin = context.origin ?? process.env.APP_URL;

  if (!origin) {
    return { ok: false, error: 'Origine inconnue : lien impossible à construire.' };
  }

  const { data: account } = await db()
    .from('user_accounts')
    .select('id, email, email_verified_at')
    .eq('player_id', session.playerId)
    .maybeSingle();

  // Déjà vérifié : rien à envoyer, mais la réponse ne le dit pas.
  if (account && !account.email_verified_at) {
    await sendVerificationEmail(account.id, account.email, origin);
  }

  return {
    ok: true,
    message: 'Si ton adresse n’est pas encore confirmée, un lien vient d’être envoyé.',
  };
}
