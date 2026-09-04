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
/**
 * Nombre de lignes de classement affichées sur la page.
 *
 * Exporté pour que la page et le cache s'accordent : la clé de cache contient
 * cette valeur, et deux appelants qui demanderaient des tailles différentes
 * garderaient chacun leur entrée au lieu de se croiser.
 */
export const LEADERBOARD_ROWS = 50;

/**
 * Les cinquante premières lignes du classement.
 *
 * **Le défaut corrigé ici.** Cette fonction mettait en cache le classement
 * *entier*, `breakdown` de chaque joueur compris — le détail par personnage du
 * replay de performance — alors que la page n'affiche que cinquante lignes et
 * la position du visiteur.
 *
 * Or `unstable_cache` refuse les entrées au-delà d'environ deux méga-octets :
 * il ne les conserve pas, et ne le signale que dans les journaux du serveur. À
 * un kilo-octet de détail par équipage, le seuil tombait vers **deux mille
 * joueurs**. Passé ce cap, chaque consultation aurait refait la requête
 * complète — précisément le dimanche soir, quand tout le monde arrive en même
 * temps. L'optimisation principale de `docs/charge.md` se serait annulée
 * d'elle-même, sans erreur et sans que rien ne le montre.
 *
 * L'entrée pèse maintenant quelques kilo-octets, quel que soit le nombre de
 * joueurs : cinquante pseudos et cinquante entiers.
 */
export function getCachedLeaderboardTop(chapterId: string, limit = LEADERBOARD_ROWS) {
  return unstable_cache(
    async () => getRepository().getLeaderboardTop(chapterId, limit),
    ['leaderboard-top', chapterId, String(limit)],
    { tags: [chapterTag(chapterId)], revalidate: 300 },
  )();
}

/**
 * Nombre d'équipages classés.
 *
 * Un entier, partagé par tout le monde — c'est le dénominateur du percentile.
 * Il était jusqu'ici obtenu en lisant le classement complet puis en comptant
 * les lignes, ce qui est la façon la plus coûteuse d'obtenir un nombre.
 */
export function getCachedLeaderboardSize(chapterId: string) {
  return unstable_cache(
    async () => getRepository().getLeaderboardSize(chapterId),
    ['leaderboard-size', chapterId],
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

/** Étiquette du Marché, purgée dès qu'une vente aboutit. */
export const MARKET_TAG = 'market:sales';

/**
 * Ventes récentes du Marché.
 *
 * Identique pour tout le monde : les douze dernières transactions ne dépendent
 * pas du spectateur. Sans cache, chaque ouverture du Marché refaisait une
 * jointure sur `market_transactions` — soit, à mille joueurs, mille fois la
 * même requête pour le même résultat.
 *
 * Soixante secondes, et pas plus : une vente qui met une minute à apparaître
 * passe inaperçue, cinq minutes se remarquent — un joueur qui vient d'acheter
 * cherche sa transaction dans la liste. L'achat purge l'étiquette de toute
 * façon ; le délai n'est qu'un filet.
 *
 * Aucune donnée personnelle n'y entre : les pseudos sont publics, c'est
 * précisément ce que la section affiche.
 *
 * ⚠️ Les `Date` reviennent du cache en chaînes de caractères — même piège que
 * `reviveChapter` plus haut. `soldAt` est reconstruite ici, sans quoi
 * `toLocaleDateString` échouerait à la première page servie depuis le cache,
 * et pas avant : le défaut n'apparaît qu'à la deuxième visite.
 */
export async function getCachedRecentSales() {
  const rows = await unstable_cache(
    async () => {
      const { recentSales } = await import('@/lib/market/repository');
      return recentSales();
    },
    ['market-recent-sales'],
    { tags: [MARKET_TAG], revalidate: 60 },
  )();

  return rows.map((sale) => ({ ...sale, soldAt: new Date(sale.soldAt) }));
}
