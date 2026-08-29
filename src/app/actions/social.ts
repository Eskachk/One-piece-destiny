'use server';

import { revalidatePath } from 'next/cache';
import { requireSession } from '@/lib/auth/guards';
import { assertSameOrigin } from '@/lib/auth/request-guard';
import * as social from '@/lib/social/repository';

/**
 * Actions sociales — notifications (cahier §108).
 *
 * La discussion de chapitre a été retirée : elle n'existe plus ni ici, ni dans
 * le classement, ni dans le domaine. Le parrainage (§71), lui, ne passe plus
 * par une action : il se joue entièrement sur le lien d'invitation et sur
 * l'inscription, côté serveur, où rien n'est à la main du client.
 */

export type SocialResult = { ok: true } | { ok: false; error: string };

export async function markNotificationsReadAction(): Promise<SocialResult> {
  await assertSameOrigin();
  const session = await requireSession();
  if (!social.isSocialAvailable()) {
    return { ok: false, error: 'Fonction indisponible sans base de données.' };
  }

  await social.markAllRead(session.playerId);
  revalidatePath('/profil');
  return { ok: true };
}
