import type { Character } from '../types';

/**
 * Collections par sets (cahier §33).
 *
 * Les récompenses de set sont **cosmétiques**. Le cahier est explicite : elles
 * ne doivent pas créer d'avantage compétitif, sinon un ancien joueur écrase
 * un nouveau sans que la prédiction y soit pour quelque chose (§34, §48).
 */

export interface CollectionSet {
  id: string;
  name: string;
  /** Affiliation qui définit l'appartenance au set. */
  affiliation: string;
  /** Récompense cosmétique, jamais un bonus de score. */
  reward: string;
}

export const COLLECTION_SETS: CollectionSet[] = [
  {
    id: 'mugiwara',
    name: 'Mugiwara',
    affiliation: 'Mugiwara',
    reward: "Pavillon du capitaine — cosmétique",
  },
  {
    id: 'marine',
    name: 'Marine',
    affiliation: 'Marine',
    reward: 'Cachet officiel — cosmétique',
  },
  {
    id: 'cross-guild',
    name: 'Cross Guild',
    affiliation: 'Cross Guild',
    reward: 'Sceau du Cross Guild — cosmétique',
  },
  {
    id: 'worst-generation',
    name: 'Pire Génération',
    affiliation: 'Worst Generation',
    reward: 'Avis de recherche doré — cosmétique',
  },
  {
    id: 'revolutionnaires',
    name: 'Révolutionnaires',
    affiliation: 'Révolutionnaires',
    reward: 'Braise révolutionnaire — cosmétique',
  },
];

export interface SetProgress {
  set: CollectionSet;
  owned: string[];
  missing: string[];
  total: number;
  complete: boolean;
}

/** Avancement d'un set pour une collection donnée. */
export function setProgress(
  set: CollectionSet,
  roster: Character[],
  owned: ReadonlySet<string>,
): SetProgress {
  const members = roster.filter((character) =>
    character.affiliations.includes(set.affiliation),
  );

  const ownedMembers = members.filter((character) => owned.has(character.id));
  const missingMembers = members.filter((character) => !owned.has(character.id));

  return {
    set,
    owned: ownedMembers.map((c) => c.id),
    missing: missingMembers.map((c) => c.id),
    total: members.length,
    // Un set sans membre n'est pas « complet » : ce serait une récompense
    // offerte pour rien.
    complete: members.length > 0 && missingMembers.length === 0,
  };
}

export function allSetsProgress(
  roster: Character[],
  owned: ReadonlySet<string>,
): SetProgress[] {
  return COLLECTION_SETS.map((set) => setProgress(set, roster, owned));
}

export interface CollectionSummary {
  owned: number;
  total: number;
  /** Pourcentage entier, pour l'affichage. */
  percent: number;
}

export function collectionSummary(
  roster: Character[],
  owned: ReadonlySet<string>,
): CollectionSummary {
  const ownedCount = roster.filter((c) => owned.has(c.id)).length;
  return {
    owned: ownedCount,
    total: roster.length,
    percent: roster.length === 0 ? 0 : Math.round((ownedCount / roster.length) * 100),
  };
}
