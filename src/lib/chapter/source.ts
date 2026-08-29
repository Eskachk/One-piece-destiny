import 'server-only';

import { proposeChapter, type ScheduleProposal } from '@/domain/chapter/schedule';

/**
 * Source externe du numéro de chapitre (cahier §4).
 *
 * Interroge api-onepiece.com — la même API que le référentiel de personnages —
 * pour connaître le dernier chapitre référencé et son titre.
 *
 * **Cette source ne décide de rien.** Le calendrier (`domain/chapter/schedule`)
 * donne le numéro ; l'API sert de contre-vérification et de titre. Un service
 * tiers qui tombe, qui renomme un champ ou qui prend un chapitre d'avance ne
 * doit pas pouvoir ouvrir les prédictions sur un chapitre déjà paru.
 *
 * Manga Plus n'a pas d'API publique et interdit l'analyse de ses pages : ce
 * n'est pas un oubli, c'est un choix. Voir `schedule.ts`.
 */

const ENDPOINT = 'https://api.api-onepiece.com/v2/chapters/fr';

/**
 * Délai court, et volontairement.
 *
 * Cet appel se fait dans la tâche hebdomadaire. S'il traîne, l'ouverture du
 * chapitre traîne avec lui — alors que le calendrier suffit à décider. Mieux
 * vaut se passer du titre que retarder l'ouverture.
 */
const TIMEOUT_MS = 8_000;

interface ApiChapter {
  id: number;
  title?: string;
}

/**
 * Dernier chapitre connu de la source, ou `null` si elle n'a rien donné
 * d'exploitable.
 *
 * `null` signifie « on ne sait pas », jamais « il n'y en a pas ». L'appelant
 * doit continuer avec le calendrier seul.
 */
export async function latestKnownChapter(): Promise<{
  number: number;
  title: string | null;
} | null> {
  try {
    const response = await fetch(ENDPOINT, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // La liste ne change qu'une fois par semaine : inutile de la retélécharger
      // à chaque exécution, et cela protège la source d'appels répétés.
      next: { revalidate: 3_600 },
    });

    if (!response.ok) {
      console.warn(`[chapter] SOURCE_HTTP_${response.status}`);
      return null;
    }

    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload) || payload.length === 0) return null;

    // On prend le **maximum**, pas le dernier élément : rien ne garantit que la
    // source rende sa liste triée, et se fier à l'ordre d'un tiers est le genre
    // d'hypothèse qui tient des mois puis casse un dimanche soir.
    let best: ApiChapter | null = null;
    for (const entry of payload as ApiChapter[]) {
      if (typeof entry?.id !== 'number') continue;
      if (!best || entry.id > best.id) best = entry;
    }

    if (!best) return null;
    return { number: best.id, title: best.title?.trim() || null };
  } catch (error) {
    // Réseau coupé, délai dépassé, JSON illisible : tous équivalents ici.
    console.warn('[chapter] SOURCE_UNAVAILABLE', (error as Error).message);
    return null;
  }
}

/** Proposition complète : calendrier confronté à la source. */
export async function proposeNextChapter(
  now: Date = new Date(),
): Promise<ScheduleProposal> {
  const known = await latestKnownChapter();
  return proposeChapter(now, known?.number ?? null, known?.title ?? null);
}
