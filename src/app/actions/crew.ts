'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { CHARACTER_INDEX } from '@/data/characters';
import { isTeamEditable } from '@/domain/chapter/lock';
import { requireSession } from '@/lib/auth/guards';
import { assertSameOrigin } from '@/lib/auth/request-guard';
import { getRepository } from '@/lib/repository';
import { payReferrerOnFirstCrew } from '@/lib/social/referral-payout';
import { recordEvent } from '@/lib/antiabuse/events';

/**
 * Enregistrement de l'équipage.
 *
 * C'est le chemin critique du cahier §99 : le client n'est jamais source de
 * vérité. Trois vérifications, dans cet ordre, toutes côté serveur :
 *
 *   1. le corps de la requête est validé par un schéma (§88) ;
 *   2. les personnages existent réellement dans le référentiel ;
 *   3. l'échéance est comparée à l'horloge serveur (§76).
 *
 * Une requête tardive est rejetée, quoi qu'affiche le client.
 */

const CrewSchema = z
  .array(z.string().min(1))
  .length(3, 'Un équipage compte exactement 3 personnages.')
  .refine((ids) => new Set(ids).size === 3, {
    message: 'Un personnage ne peut pas être sélectionné deux fois.',
  })
  .refine((ids) => ids.every((id) => CHARACTER_INDEX.has(id)), {
    message: 'Personnage inconnu.',
  });

export type SaveCrewResult =
  | { ok: true; lockedAt: string }
  | { ok: false; error: string };

export async function saveCrew(characterIds: unknown): Promise<SaveCrewResult> {
  await assertSameOrigin();
  const session = await requireSession();

  const parsed = CrewSchema.safeParse(characterIds);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const repository = getRepository();
  const chapter = await repository.getCurrentChapter();
  if (!chapter) {
    return { ok: false, error: 'Aucun chapitre n\'est ouvert aux prédictions.' };
  }

  // L'heure vient de l'horloge serveur, jamais du client.
  const now = new Date();
  if (!isTeamEditable(chapter, now)) {
    return {
      ok: false,
      error: 'Les équipages sont verrouillés pour ce chapitre.',
    };
  }

  const ids = parsed.data as [string, string, string];

  // Propriété vérifiée **côté serveur**. La liste affichée par le navigateur
  // n'est qu'un confort : une requête forgée peut nommer n'importe quel
  // personnage du référentiel, et seul ce contrôle l'en empêche.
  const owned = new Set(await repository.getOwnedCharacterIds(session.playerId));
  const notOwned = ids.filter((id) => !owned.has(id));

  if (notOwned.length > 0) {
    return {
      ok: false,
      error:
        notOwned.length === 1
          ? `Tu ne possèdes pas ${CHARACTER_INDEX.get(notOwned[0])?.name ?? 'ce personnage'}.`
          : 'Tu ne possèdes pas tous ces personnages.',
    };
  }

  await repository.saveTeam(session.playerId, chapter.id, ids);

  // Le parrain est payé **ici**, pas à l'inscription (§71). Verrouiller un
  // équipage est la première chose qu'un joueur fait qu'un compte fabriqué ne
  // fera pas : c'est donc le bon moment pour récompenser celui qui l'a amené.
  // L'échec de ce versement n'a rien à voir avec l'enregistrement de
  // l'équipage, qui est déjà acquis — il ne doit pas le faire échouer.
  await recordEvent(session.playerId, 'FIRST_CREW_LOCKED', {
    chapterId: chapter.id,
  });

  try {
    await payReferrerOnFirstCrew(session.playerId);
  } catch (error) {
    console.warn('[referral] PAYOUT_FAILED', (error as Error).message);
  }

  revalidatePath('/');
  return { ok: true, lockedAt: now.toISOString() };
}
