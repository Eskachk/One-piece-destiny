import type { Character } from '../types';

/**
 * Comptage assisté (cahier §7).
 *
 * ⚠️ **Ce n'est pas de la reconnaissance d'image.** Aucun modèle ne lit les
 * pages du manga : le cahier §122 interdit d'ailleurs d'héberger les scans.
 *
 * L'assistance est statistique : à partir de l'historique des chapitres
 * précédents, on propose une liste de personnages probables avec un indice de
 * confiance, pour que l'administrateur parte d'une base plutôt que d'une page
 * blanche. **Il corrige, il valide, et c'est sa saisie qui fait foi** (§5.2).
 *
 * L'indice de confiance mesure la régularité d'apparition, rien d'autre. Il ne
 * prétend pas savoir ce que contient le chapitre.
 */

export interface HistoricalAppearance {
  chapterNumber: number;
  characterId: string;
  appearances: number;
}

export interface Suggestion {
  characterId: string;
  /** Nombre d'apparitions proposé, arrondi. */
  suggested: number;
  /** 0–1 : part des chapitres récents où le personnage était présent. */
  confidence: number;
  /** Chapitres observés pour cette suggestion. */
  observed: number;
}

/** Chapitres récents pris en compte. Au-delà, la méta a trop changé. */
export const HISTORY_WINDOW = 8;

/** En dessous, on ne propose rien : deux chapitres ne font pas une tendance. */
export const MIN_OBSERVATIONS = 2;

/**
 * Propose un comptage de départ à partir de l'historique.
 *
 * @param history      apparitions des chapitres précédents
 * @param roster       référentiel, pour ignorer les identifiants inconnus
 * @param latestNumber numéro du chapitre le plus récent connu
 */
export function suggestCounts(
  history: HistoricalAppearance[],
  roster: Character[],
  latestNumber: number,
): Suggestion[] {
  const known = new Set(roster.map((c) => c.id));
  const window = history.filter(
    (entry) =>
      known.has(entry.characterId) &&
      entry.chapterNumber > latestNumber - HISTORY_WINDOW,
  );

  // Nombre de chapitres distincts réellement observés dans la fenêtre.
  const chapters = new Set(window.map((entry) => entry.chapterNumber));
  const chapterCount = chapters.size;
  if (chapterCount === 0) return [];

  const byCharacter = new Map<string, number[]>();
  for (const entry of window) {
    const list = byCharacter.get(entry.characterId) ?? [];
    // Une apparition à zéro n'est pas une présence.
    if (entry.appearances > 0) list.push(entry.appearances);
    byCharacter.set(entry.characterId, list);
  }

  const suggestions: Suggestion[] = [];

  for (const [characterId, counts] of byCharacter) {
    if (counts.length < MIN_OBSERVATIONS) continue;

    const average = counts.reduce((a, b) => a + b, 0) / counts.length;

    suggestions.push({
      characterId,
      suggested: Math.max(1, Math.round(average)),
      confidence: Number((counts.length / chapterCount).toFixed(2)),
      observed: counts.length,
    });
  }

  // Les plus sûrs d'abord : c'est ce que l'administrateur validera le plus vite.
  return suggestions.sort(
    (a, b) => b.confidence - a.confidence || b.suggested - a.suggested,
  );
}

/**
 * Rend les suggestions au format de l'import rapide (§6.3), pour que
 * l'administrateur les colle et les corrige dans le même champ que d'habitude.
 */
export function suggestionsAsImportText(
  suggestions: Suggestion[],
  roster: Character[],
): string {
  const names = new Map(roster.map((c) => [c.id, c.name]));

  // Des noms seuls, sans nombre. Depuis le moteur v2, seule la présence
  // compte et la zone de saisie attend une liste : recracher un comptage
  // aurait remis dans le champ ce qu'on vient d'en retirer.
  return suggestions
    .map((suggestion) => names.get(suggestion.characterId) ?? suggestion.characterId)
    .join('\n');
}
