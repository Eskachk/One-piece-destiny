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

  /*
   * Le chapitre et l'inventaire partent **ensemble**.
   *
   * Ils étaient enchaînés, séparés par les contrôles de verrouillage. Or aucun
   * des deux ne dépend de l'autre : le chapitre vient du cache partagé,
   * l'inventaire ne dépend que de `session.playerId`, connu depuis la ligne
   * précédente. En série, la page paie la somme des latences ; en parallèle, le
   * maximum — et un aller-retour vers Supabase coûte bien plus que tout le
   * reste de cette fonction.
   *
   * L'ordre des **contrôles** ne bouge pas : chapitre ouvert, puis verrouillage,
   * puis propriété. Ce sont deux choses distinctes — quand on lit n'est pas
   * quand on décide.
   */
  const [chapter, ownedIds] = await Promise.all([
    repository.getCurrentChapter(),
    repository.getOwnedCharacterIds(session.playerId),
  ]);

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
  const owned = new Set(ownedIds);
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
  /*
   * Journal anti-abus et versement du parrain : **en parallèle**, et après
   * l'enregistrement.
   *
   * Après, parce que la maturité du filleul se mesure au nombre de chapitres
   * joués : compter avant l'écriture manquerait celui qu'on vient de faire.
   *
   * En parallèle l'un de l'autre, parce qu'ils ne se lisent pas entre eux — le
   * journal enregistre un fait, le versement lit un état.
   *
   * Ni l'un ni l'autre ne doit faire échouer la réponse : l'équipage est déjà
   * enregistré en base, et un joueur à qui l'on répond « échec » sur un
   * équipage bien verrouillé le rejouerait — ou pire, croirait l'avoir perdu.
   */
  const [journal, versement] = await Promise.allSettled([
    recordEvent(session.playerId, 'FIRST_CREW_LOCKED', { chapterId: chapter.id }),
    payReferrerOnFirstCrew(session.playerId),
  ]);

  if (journal.status === 'rejected') {
    console.warn('[antiabuse] EVENT_FAILED', String(journal.reason));
  }
  if (versement.status === 'rejected') {
    console.warn('[referral] PAYOUT_FAILED', String(versement.reason));
  }

  revalidatePath('/');
  return { ok: true, lockedAt: now.toISOString() };
}
