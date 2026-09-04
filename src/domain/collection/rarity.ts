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
  // Relevés en même temps que la réévaluation des raretés : le référentiel
  // ne compte plus quelques centaines de légendaires hérités des primes, mais
  // une quarantaine de personnages réellement omniprésents dans l'œuvre. À
  // poids constants, la chance annoncée d'en tirer un aurait été divisée par
  // cinq du jour au lendemain, sans que le joueur ait rien demandé.
  LEGENDARY: 45,
  /*
   * Relevé de 9 à 18, et c'est le seul poids qui bouge.
   *
   * À 9, un Mythique sortait **0,37 % du temps** : un coffre sur deux cent
   * soixante-dix. Un joueur gratuit, qui en ouvre un par semaine, avait 17 %
   * de chances d'en voir un seul dans l'année — autrement dit, quatre joueurs
   * sur cinq n'en croisaient jamais.
   *
   * Or les dix Mythiques sont l'équipage au complet : ce sont les personnages
   * que tout le monde vient chercher. Les rendre statistiquement absents est
   * le contraire de ce qu'une rareté doit faire — elle doit se mériter, pas
   * disparaître.
   *
   * À 18, le taux passe à environ 0,75 % et un tiers des joueurs en voit un
   * dans l'année. La voie sûre reste la fabrication (§29), désormais
   * praticable.
   */
  MYTHIC: 18,
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

/**
 * Couleur de chaque rareté (cahier §24).
 *
 * **Une seule source pour toute l'application** : carte de collection,
 * cérémonie d'ouverture, Market. Recopiée à trois endroits, la teinte du
 * Légendaire finirait par différer d'un écran à l'autre et le joueur perdrait
 * le repère le plus rapide dont il dispose.
 *
 * Les couleurs viennent de la palette du port. Elles ne portent jamais
 * l'information **seules** : chaque affichage montre aussi le libellé, faute
 * de quoi la rareté serait invisible pour un joueur daltonien.
 */
export const RARITY_COLOR: Record<Rarity, string> = {
  COMMON: '#8ea3bd', // cordage gris-bleu
  RARE: '#2fa8a4', // turquoise du lagon
  EPIC: '#9a5cd8', // améthyste
  LEGENDARY: '#f5c542', // or du trésor
  MYTHIC: '#ff5d47', // braise
};

/** Encre lisible **sur** la couleur de rareté (contraste vérifié). */
export const RARITY_INK: Record<Rarity, string> = {
  COMMON: '#16283d',
  RARE: '#04302f',
  EPIC: '#ffffff',
  LEGENDARY: '#3a2a05',
  MYTHIC: '#ffffff',
};
