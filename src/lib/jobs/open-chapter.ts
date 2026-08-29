import 'server-only';

import { nextSundayLockInstant } from '@/domain/chapter/lock';
import { proposeNextChapter } from '@/lib/chapter/source';
import { audit } from '@/lib/audit';
import { getRepository } from '@/lib/repository';
import { revalidateTag } from 'next/cache';
import { CURRENT_CHAPTER_TAG } from '@/lib/cache';

/**
 * Ouverture automatique du chapitre de la semaine (cahier §4, §76).
 *
 * L'administrateur n'a plus à saisir le numéro : la tâche hebdomadaire le
 * calcule et ouvre le chapitre seule.
 *
 * Trois garde-fous, parce qu'une tâche qui ouvre des chapitres toute seule peut
 * aussi en ouvrir de travers :
 *
 *   1. **elle n'ouvre jamais deux chapitres.** Si un chapitre est déjà ouvert,
 *      elle ne fait rien. Vercel prévient qu'un cron peut être invoqué deux
 *      fois : rejouer doit rester anodin ;
 *   2. **elle ne recule jamais.** Un numéro inférieur ou égal au dernier
 *      chapitre connu est refusé — un calendrier mal ancré ne doit pas
 *      réouvrir un chapitre déjà jugé ;
 *   3. **elle trace ce qu'elle fait**, y compris ses refus. Une ouverture
 *      automatique dont personne ne peut dire pourquoi elle a eu lieu est pire
 *      qu'une saisie manuelle.
 */

export type OpenChapterOutcome =
  | { opened: true; chapterNumber: number; title: string | null; note: string }
  | { opened: false; reason: string };

export async function runChapterOpening(
  now: Date = new Date(),
): Promise<OpenChapterOutcome> {
  const repository = getRepository();

  // Un chapitre est déjà en cours : rien à faire. C'est le cas le plus
  // fréquent, la tâche tournant toutes les heures.
  const current = await repository.getCurrentChapter();
  if (current) {
    return {
      opened: false,
      reason: `Chapitre ${current.chapterNumber} déjà ouvert.`,
    };
  }

  const proposal = await proposeNextChapter(now);

  // Anti-retour. `proposeNextChapterNumber` rend « dernier connu + 1 » ; si le
  // calendrier propose moins, c'est que l'ancrage a dérivé.
  const floor = await repository.proposeNextChapterNumber();
  if (proposal.chapterNumber < floor) {
    await audit({
      action: 'chapter.auto_open',
      status: 'REFUSED',
      metadata: {
        proposed: proposal.chapterNumber,
        floor,
        confidence: proposal.confidence,
      },
    });
    return {
      opened: false,
      reason:
        `Le calendrier propose le chapitre ${proposal.chapterNumber}, ` +
        `inférieur au prochain attendu (${floor}). Ancrage à corriger.`,
    };
  }

  const chapter = await repository.createChapter(
    proposal.chapterNumber,
    nextSundayLockInstant(now),
  );

  // Le chapitre courant est lu par toutes les pages : sans purge, elles
  // continueraient d'afficher « aucun chapitre » pendant la durée du cache.
  revalidateTag(CURRENT_CHAPTER_TAG);

  await audit({
    action: 'chapter.auto_open',
    status: 'SUCCESS',
    metadata: {
      chapterNumber: chapter.chapterNumber,
      confidence: proposal.confidence,
      latestKnown: proposal.latestKnown,
    },
  });

  return {
    opened: true,
    chapterNumber: chapter.chapterNumber,
    title: proposal.title,
    note: proposal.note,
  };
}
