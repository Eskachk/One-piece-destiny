/**
 * Import rapide des apparitions (cahier §6.3).
 *
 * L'administrateur colle **une liste de noms**, un par ligne :
 *
 *     Luffy
 *     Zoro
 *     Bartolomeo
 *
 * Depuis le moteur de score v2, seule la présence compte : compter les cases
 * d'un personnage était long, discutable au bord — une silhouette au fond
 * compte-t-elle ? — et impossible à contester sereinement. « Apparaît ou
 * n'apparaît pas » se vérifie en une seconde.
 *
 * Un nombre reste **accepté** en fin de ligne et simplement ignoré : les
 * anciennes notes collées telles quelles continuent de fonctionner, et les
 * chapitres calculés en v1 gardent leur comptage d'origine en base.
 *
 * Le système mappe automatiquement les personnages connus et ne signale que
 * les anomalies. La publication reste humaine (§7) : ce parseur ne décide
 * jamais seul, il prépare une proposition à valider.
 */

import type { Character, ChapterAppearance } from '../types';

export type ImportIssueKind =
  | 'UNKNOWN_CHARACTER'
  | 'AMBIGUOUS_CHARACTER'
  | 'MISSING_COUNT'
  | 'INVALID_COUNT'
  | 'DUPLICATE';

export interface ImportIssue {
  line: number;
  raw: string;
  kind: ImportIssueKind;
  message: string;
  /** Suggestions de personnages quand le nom est ambigu. */
  candidates?: string[];
}

export interface ImportResult {
  appearances: ChapterAppearance[];
  issues: ImportIssue[];
}

/** Normalise pour comparer : minuscules, sans accents ni ponctuation. */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    // Diacritiques combinatoires (echappements explicites : le fichier peut
    // etre relu dans un autre encodage).
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

/**
 * Index de recherche : chaque personnage est atteignable par son identifiant,
 * son nom complet et chacun des mots de son nom (« Luffy » → Monkey D. Luffy).
 */
function buildLookup(roster: Character[]): Map<string, Character[]> {
  const lookup = new Map<string, Character[]>();

  const add = (key: string, character: Character) => {
    const normalized = normalize(key);
    if (!normalized) return;
    const existing = lookup.get(normalized);
    if (existing) {
      if (!existing.includes(character)) existing.push(character);
    } else {
      lookup.set(normalized, [character]);
    }
  };

  for (const character of roster) {
    add(character.id, character);
    add(character.name, character);
    for (const word of character.name.split(/\s+/)) {
      // « D. » n'identifie personne : on ignore les fragments trop courts.
      if (normalize(word).length >= 3) add(word, character);
    }
  }

  return lookup;
}

const LINE_PATTERN = /^(.*?)[\s×x]*(-?\d+)?$/;

/**
 * Analyse un bloc collé par l'administrateur.
 * Accepte « Luffy 12 », « Luffy ×12 », « Luffy x12 ».
 */
export function parseAppearanceImport(
  input: string,
  roster: Character[],
): ImportResult {
  const lookup = buildLookup(roster);
  const appearances: ChapterAppearance[] = [];
  const issues: ImportIssue[] = [];
  const seen = new Map<string, number>();

  const lines = input.split(/\r?\n/);

  lines.forEach((raw, index) => {
    const line = index + 1;
    const trimmed = raw.trim();
    if (!trimmed) return;

    const match = LINE_PATTERN.exec(trimmed);
    const namePart = (match?.[1] ?? trimmed).trim();
    const countPart = match?.[2];

    // Le nombre est **facultatif** : sans lui, la présence vaut 1.
    //
    // Depuis le moteur v2, seule la présence compte. Un nombre reste accepté
    // et relu — les anciennes notes collées telles quelles continuent de
    // fonctionner — mais il n'est plus exigé, et le moteur ne lira de toute
    // façon que « > 0 ».
    const count = countPart === undefined ? 1 : Number(countPart);

    if (!Number.isInteger(count) || count < 0) {
      issues.push({
        line,
        raw: trimmed,
        kind: 'INVALID_COUNT',
        message: `« ${countPart} » n'est pas un nombre d'apparitions valide.`,
      });
      return;
    }

    const matches = lookup.get(normalize(namePart));

    if (!matches || matches.length === 0) {
      issues.push({
        line,
        raw: trimmed,
        kind: 'UNKNOWN_CHARACTER',
        message: `Personnage inconnu : « ${namePart} ».`,
      });
      return;
    }

    if (matches.length > 1) {
      issues.push({
        line,
        raw: trimmed,
        kind: 'AMBIGUOUS_CHARACTER',
        message: `« ${namePart} » correspond à plusieurs personnages.`,
        candidates: matches.map((c) => c.id),
      });
      return;
    }

    const character = matches[0];
    const previousLine = seen.get(character.id);
    if (previousLine !== undefined) {
      issues.push({
        line,
        raw: trimmed,
        kind: 'DUPLICATE',
        message: `${character.name} est déjà renseigné ligne ${previousLine}.`,
      });
      return;
    }

    seen.set(character.id, line);
    appearances.push({ characterId: character.id, appearances: count });
  });

  return { appearances, issues };
}
