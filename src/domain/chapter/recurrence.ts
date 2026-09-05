import type { HistoricalAppearance } from '../admin/assisted-count';

/**
 * Récurrence d'un personnage : dans combien des derniers chapitres l'a-t-on vu.
 *
 * ## Pourquoi cette information doit être publique
 *
 * Le jeu demande de **prédire** qui paraîtra dans le chapitre de la semaine.
 * Jusqu'ici, le joueur choisissait sans aucune donnée : rien ne lui disait que
 * Luffy figure dans neuf chapitres sur dix et Vivi dans aucun. L'historique
 * existait pourtant — il servait au comptage assisté de l'administrateur (§7),
 * et à lui seul.
 *
 * Sans lui, ce n'est pas un jeu de prédiction : c'est un tirage au sort avec
 * une jolie collection par-dessus. Avec lui, choisir devient une compétence —
 * et une compétence est ce qui donne envie de revenir.
 *
 * ## Ce que la récurrence n'est pas
 *
 * Ce n'est pas une probabilité, et le libellé ne doit jamais le laisser
 * croire. « Vu dans 7 des 10 derniers chapitres » est un **fait passé**. Un
 * arc peut changer de décor et laisser un habitué sur le banc pendant vingt
 * semaines ; c'est même ce qui fait l'intérêt du pari (§64, le « piège de la
 * semaine »).
 *
 * ## L'anti-spoiler (§3)
 *
 * Cette fenêtre ne porte **que sur des chapitres publiés**. Le filtre est
 * appliqué à la source, dans le dépôt : inclure le chapitre courant
 * révélerait qui y figure dès que l'administrateur a saisi ses apparitions,
 * c'est-à-dire avant la publication — exactement ce que le §3 interdit.
 */

export interface Recurrence {
  /** Chapitres où le personnage a été vu au moins une fois. */
  vus: number;
  /** Chapitres observés dans la fenêtre. */
  observes: number;
  /** Apparitions moyennes par chapitre observé, décimale. */
  moyenne: number;
}

/**
 * Récurrence de chaque personnage, sur la fenêtre fournie.
 *
 * Fonction pure : elle ne connaît ni la base ni le cache, et se teste sur un
 * tableau littéral.
 *
 * **Le dénominateur est le nombre de chapitres réellement observés**, pas la
 * taille demandée de la fenêtre. Sur un jeu qui démarre, trois chapitres
 * existent : afficher « 3 des 10 derniers » laisserait croire à sept absences
 * qui n'ont jamais eu lieu.
 */
export function recurrences(
  history: readonly HistoricalAppearance[],
): Map<string, Recurrence> {
  const chapitres = new Set(history.map((ligne) => ligne.chapterNumber));
  const observes = chapitres.size;

  const parPersonnage = new Map<string, { vus: Set<number>; total: number }>();

  for (const ligne of history) {
    // Une ligne à zéro apparition est une absence **constatée**, pas une
    // présence : la saisie de l'administrateur peut porter un zéro explicite.
    if (ligne.appearances <= 0) continue;

    const entree = parPersonnage.get(ligne.characterId) ?? {
      vus: new Set<number>(),
      total: 0,
    };
    entree.vus.add(ligne.chapterNumber);
    entree.total += ligne.appearances;
    parPersonnage.set(ligne.characterId, entree);
  }

  const out = new Map<string, Recurrence>();
  if (observes === 0) return out;

  for (const [characterId, entree] of parPersonnage) {
    out.set(characterId, {
      vus: entree.vus.size,
      observes,
      moyenne: entree.total / observes,
    });
  }

  return out;
}

/**
 * Phrase complète, pour les lecteurs d'écran et l'infobulle.
 *
 * Le pictogramme et le rapport « 7/10 » suffisent à l'œil ; ils ne disent rien
 * à qui écoute la page (§111).
 */
export function decrireRecurrence(recurrence: Recurrence | undefined): string {
  if (!recurrence || recurrence.observes === 0) {
    return 'Aucun chapitre publié pour l’instant';
  }
  if (!recurrence.vus) {
    return `Jamais vu sur les ${recurrence.observes} derniers chapitres`;
  }
  return `Vu dans ${recurrence.vus} des ${recurrence.observes} derniers chapitres`;
}
