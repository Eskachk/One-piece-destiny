import type { Rarity } from '../types';

/**
 * Raretés (cahier §24, §25).
 *
 * **Rareté = valeur de collection. Elle n'entre jamais dans le score.**
 * Le moteur de scoring ne lit pas ce champ : un personnage commun peut être
 * excellent en jeu, un légendaire peut être médiocre. C'est ce qui empêche la
 * collection de se réduire à « les plus rares sont les meilleurs ».
 */

/** Du plus commun au plus rare. L'ordre sert aux garanties de coffre. */
export const RARITY_ORDER: readonly Rarity[] = [
  'COMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
  'MYTHIC',
] as const;

export function rarityRank(rarity: Rarity): number {
  return RARITY_ORDER.indexOf(rarity);
}

export function isAtLeast(rarity: Rarity, minimum: Rarity): boolean {
  return rarityRank(rarity) >= rarityRank(minimum);
}

/**
 * Poids de tirage. Volontairement peu écrasés : un légendaire doit rester un
 * événement sans rendre la collection inatteignable.
 */
export const RARITY_WEIGHTS: Record<Rarity, number> = {
  COMMON: 600,
  RARE: 280,
  EPIC: 95,
  LEGENDARY: 22,
  MYTHIC: 3,
};

/**
 * Fragments accordés pour un doublon (cahier §28).
 * Un doublon ne doit jamais être inutile.
 */
export const DUPLICATE_SHARDS: Record<Rarity, number> = {
  COMMON: 10,
  RARE: 30,
  EPIC: 80,
  LEGENDARY: 200,
  MYTHIC: 500,
};

/** Identité visuelle des raretés (cahier §24). */
export const RARITY_LABEL: Record<Rarity, string> = {
  COMMON: 'Commun',
  RARE: 'Rare',
  EPIC: 'Épique',
  LEGENDARY: 'Légendaire',
  MYTHIC: 'Mythique',
};
