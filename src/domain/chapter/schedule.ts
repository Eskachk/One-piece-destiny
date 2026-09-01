/**
 * Calendrier de parution (cahier §4, §76).
 *
 * Le numéro du chapitre jugé cette semaine n'a plus à être saisi : le site le
 * déduit seul.
 *
 * ## Pourquoi pas Manga Plus
 *
 * Manga Plus n'expose **aucune API publique**. La seule façon d'en tirer le
 * numéro du chapitre serait d'analyser leurs pages — ce que leurs conditions
 * d'utilisation interdisent, et qui casserait à la première refonte de leur
 * site, un dimanche soir, sans prévenir.
 *
 * ## Ce qu'on fait à la place
 *
 * Deux sources, dans cet ordre :
 *
 *   1. **le calendrier**, calculé ici. La parution est hebdomadaire et
 *      remarquablement régulière ; il suffit d'un point d'ancrage et de la
 *      liste des pauses annoncées. Aucune dépendance réseau, donc rien qui
 *      puisse tomber ;
 *   2. **l'API api-onepiece.com** (déjà utilisée pour le référentiel), qui
 *      donne le titre du chapitre et sert de contre-vérification. Si elle
 *      diverge du calendrier, on **signale** au lieu de la suivre : une API
 *      tierce en avance d'un chapitre ne doit pas ouvrir les prédictions sur
 *      un chapitre déjà paru.
 *
 * L'administrateur garde la main : il peut corriger le numéro proposé.
 */

/** Ancrage. Chapitre connu, et la semaine où il a été jugé. */
export const ANCHOR = {
  chapterNumber: 1182,
  /** Dimanche de verrouillage de ce chapitre, en UTC. */
  weekOf: new Date('2026-08-30T21:59:59.000Z'),
} as const;

/**
 * Pauses annoncées, en dates de verrouillage sautées.
 *
 * Une pause décale tous les chapitres suivants d'une semaine. La liste est
 * courte et se met à jour à la main : c'est la seule information que le
 * calendrier ne peut pas déduire, et elle est publiée des semaines à l'avance.
 */
export const BREAKS: readonly string[] = [
  // Exemple de forme : '2026-10-04'. Vide tant qu'aucune pause n'est annoncée.
];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Nombre de pauses tombées entre deux instants.
 *
 * Comparaison sur la **date seule** : une pause est annoncée pour une semaine,
 * pas pour une seconde précise, et comparer des horodatages ferait dépendre le
 * résultat de l'heure à laquelle on pose la question.
 */
function breaksBetween(from: Date, to: Date): number {
  const start = from.getTime();
  const end = to.getTime();

  return BREAKS.filter((day) => {
    const at = new Date(`${day}T00:00:00.000Z`).getTime();
    return at > start && at <= end;
  }).length;
}

/**
 * Chapitre attendu à une date donnée.
 *
 * Renvoie le chapitre dont les prédictions sont **ouvertes** : celui qui sera
 * jugé au prochain verrouillage.
 */
export function expectedChapterNumber(now: Date): number {
  const elapsed = now.getTime() - ANCHOR.weekOf.getTime();

  // Avant l'ancrage, on ne remonte pas le temps : le calendrier sert à ouvrir
  // les chapitres à venir, pas à réécrire le passé.
  if (elapsed <= 0) return ANCHOR.chapterNumber;

  const weeks = Math.ceil(elapsed / WEEK_MS);
  const skipped = breaksBetween(ANCHOR.weekOf, now);

  return ANCHOR.chapterNumber + weeks - skipped;
}

export type ScheduleConfidence =
  | 'CONFIRMED'
  | 'AHEAD'
  | 'BEHIND'
  | 'STALE'
  | 'UNKNOWN';

/**
 * Écart au-delà duquel la source externe est déclarée **figée**.
 *
 * api-onepiece.com s'arrête au chapitre 1085 : son jeu de données n'est plus
 * alimenté, alors que la parution, elle, continue. L'écart n'est donc pas
 * « une pause non déclarée » comme le disait l'ancien message — c'est une
 * source morte, et le dire autrement envoyait l'administrateur vérifier une
 * liste de pauses qui n'a rien à se reprocher.
 *
 * Quatre chapitres : au-delà d'un mois d'écart, aucune explication de
 * calendrier ne tient. En deçà, une pause réellement oubliée reste l'hypothèse
 * la plus probable, et le message doit continuer à la proposer.
 */
export const STALE_SOURCE_GAP = 4;

export interface ScheduleProposal {
  /** Numéro retenu — toujours celui du calendrier. */
  chapterNumber: number;
  /** Ce que dit l'API tierce, si elle a répondu. */
  latestKnown: number | null;
  /** Titre du chapitre, si l'API le connaît. */
  title: string | null;
  confidence: ScheduleConfidence;
  /** Explication destinée à l'administrateur. */
  note: string;
}

/**
 * Confronte le calendrier à ce que sait l'API.
 *
 * **Le calendrier gagne toujours.** L'API est un témoin, pas une autorité :
 * elle référence des chapitres déjà parus, parfois avec de l'avance sur les
 * annonces, et suivre son numéro ouvrirait les prédictions sur un chapitre que
 * les joueurs peuvent déjà lire — ce que le §3 interdit.
 */
export function proposeChapter(
  now: Date,
  latestKnown: number | null,
  title: string | null = null,
): ScheduleProposal {
  const chapterNumber = expectedChapterNumber(now);

  if (latestKnown === null) {
    return {
      chapterNumber,
      latestKnown: null,
      title,
      confidence: 'UNKNOWN',
      note: 'Source externe injoignable : numéro déduit du calendrier seul.',
    };
  }

  const gap = latestKnown - chapterNumber;

  if (gap === 0) {
    return {
      chapterNumber,
      latestKnown,
      title,
      confidence: 'CONFIRMED',
      note: 'Le calendrier et la source externe concordent.',
    };
  }

  if (gap > 0) {
    return {
      chapterNumber,
      latestKnown,
      title,
      confidence: 'AHEAD',
      note:
        `La source externe connaît déjà le chapitre ${latestKnown}, soit ${gap} ` +
        `de plus que le calendrier. Si des chapitres sont réellement parus, ` +
        `corrige l'ancrage — mais n'ouvre pas les prédictions sur un chapitre ` +
        `déjà lisible.`,
    };
  }

  if (-gap > STALE_SOURCE_GAP) {
    return {
      chapterNumber,
      latestKnown,
      // Le titre d'une source figée porte sur un chapitre vieux de plusieurs
      // mois : l'afficher à côté du numéro du calendrier serait un mensonge.
      title: null,
      confidence: 'STALE',
      note:
        `Source externe figée : elle s'arrête au chapitre ${latestKnown}, soit ` +
        `${-gap} de retard. Son jeu de données n'est plus alimenté — le ` +
        `calendrier fait foi, et le titre du chapitre doit être saisi à la main.`,
    };
  }

  return {
    chapterNumber,
    latestKnown,
    title,
    confidence: 'BEHIND',
    note:
      `La source externe s'arrête au chapitre ${latestKnown}. Une pause non ` +
      `déclarée décalerait le calendrier : vérifie la liste des pauses.`,
  };
}
