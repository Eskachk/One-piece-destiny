import 'server-only';

import { unstable_cache } from 'next/cache';
import type { ChapterEvent } from '@/domain/types';
import { getRepository } from '@/lib/repository';

/**
 * Lectures partagées, mises en cache.
 *
 * Le principe : **ne mettre en cache que ce qui est identique pour tout le
 * monde.** Le classement d'un chapitre publié, l'analyse et les distinctions
 * ne dépendent pas du spectateur — mille joueurs le dimanche soir faisaient
 * mille fois la même requête. La position personnelle, elle, est calculée à
 * partir du classement déjà chargé : aucune requête supplémentaire.
 *
 * Rien de personnel n'entre ici. Un cache partagé qui contiendrait une donnée
 * propre à un joueur la servirait à un autre — c'est la faute classique de
 * cette mécanique, et la raison pour laquelle inventaire, portefeuille,
 * notifications et préférences n'y figurent pas.
 *
 * L'invalidation est **explicite**, par étiquette : publier ou corriger un
 * chapitre purge son classement immédiatement. Le délai de revalidation n'est
 * qu'un filet, pas le mécanisme principal.
 */

/**
 * Restaure les `Date` d'un chapitre sorti du cache.
 *
 * ⚠️ **`unstable_cache` sérialise en JSON.** Les `Date` reviennent donc en
 * chaînes de caractères, et tout appel à `.getTime()` échoue — pas au moment
 * de la mise en cache, mais à la première page qui manipule l'échéance.
 *
 * Le défaut est resté invisible un temps : le classement ne lit que le numéro
 * et l'identifiant du chapitre. C'est l'accueil, qui calcule le compte à
 * rebours, qui l'a révélé.
 */
function reviveChapter(chapter: ChapterEvent | null): ChapterEvent | null {
  if (!chapter) return null;

  return {
    ...chapter,
    teamLockAt: new Date(chapter.teamLockAt),
    officialReleaseAt: chapter.officialReleaseAt
      ? new Date(chapter.officialReleaseAt)
      : null,
    resultsPublishedAt: chapter.resultsPublishedAt
      ? new Date(chapter.resultsPublishedAt)
      : null,
  };
}

/** Étiquette d'un chapitre : classement, analyse, distinctions. */
export function chapterTag(chapterId: string): string {
  return `chapter:${chapterId}`;
}

/** Étiquette du chapitre courant, qui change à l'ouverture et à la publication. */
export const CURRENT_CHAPTER_TAG = 'chapter:current';

/**
 * Chapitre courant.
 *
 * Lu à **chaque page** du produit. Il change quelques fois par semaine, mais
 * était relu à chaque requête de chaque joueur.
 *
 * Revalidation courte malgré l'invalidation explicite : si une écriture directe
 * en base contourne l'application — une correction manuelle, une migration —
 * le site se remet à jour tout seul en moins d'une minute au lieu de servir un
 * état figé jusqu'au prochain déploiement.
 */
const readCurrentChapter = unstable_cache(
  async () => getRepository().getCurrentChapter(),
  ['current-chapter'],
  { tags: [CURRENT_CHAPTER_TAG], revalidate: 30 },
);

export async function getCachedCurrentChapter(): Promise<ChapterEvent | null> {
  return reviveChapter(await readCurrentChapter());
}

const readLatestPublishedChapter = unstable_cache(
  async () => getRepository().getLatestPublishedChapter(),
  ['latest-published-chapter'],
  { tags: [CURRENT_CHAPTER_TAG], revalidate: 30 },
);

export async function getCachedLatestPublishedChapter(): Promise<ChapterEvent | null> {
  return reviveChapter(await readLatestPublishedChapter());
}

/**
 * Classement d'un chapitre.
 *
 * Une fois publié, il ne bouge plus — sauf correction (§79), qui purge
 * l'étiquette. C'est la lecture la plus concurrente du produit : tout le monde
 * consulte le classement dans la même heure.
 */
export function getCachedLeaderboard(chapterId: string) {
  return unstable_cache(
    async () => getRepository().getLeaderboard(chapterId),
    ['leaderboard', chapterId],
    { tags: [chapterTag(chapterId)], revalidate: 300 },
  )();
}

export function getCachedChapterAnalysis(chapterId: string) {
  return unstable_cache(
    async () => getRepository().getChapterAnalysis(chapterId),
    ['chapter-analysis', chapterId],
    { tags: [chapterTag(chapterId)], revalidate: 300 },
  )();
}

export function getCachedChapterAwards(chapterId: string) {
  return unstable_cache(
    async () => getRepository().getChapterAwards(chapterId),
    ['chapter-awards', chapterId],
    { tags: [chapterTag(chapterId)], revalidate: 300 },
  )();
}
