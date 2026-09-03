import type { Rarity } from '../types';
import { rarityRank } from './rarity';

/**
 * Recherche et tri d'une liste de cartes.
 *
 * ## Pourquoi ce module existe séparément
 *
 * Les deux écrans qui montrent des personnages — la Collection et le
 * sélecteur d'équipage — avaient chacun leur liste, et aucun des deux n'avait
 * de quoi la parcourir. À sept cents personnages possibles, une grille sans
 * recherche ni tri se parcourt au doigt, écran par écran.
 *
 * La logique est ici, pure et testable, plutôt que dupliquée dans deux
 * composants : deux implémentations de « chercher un personnage » finiraient
 * par se comporter différemment, et c'est le joueur qui découvrirait l'écart
 * en passant d'un écran à l'autre.
 */

export type Tri = 'RARETE_DESC' | 'RARETE_ASC' | 'NOM';

/**
 * Libellés courts, et c'est délibéré : sur téléphone les deux listes se
 * partagent une ligne, et « Les plus rares d’abord » y était tronqué au
 * milieu d'un mot.
 */
export const TRI_LABEL: Record<Tri, string> = {
  RARETE_DESC: 'Plus rares d’abord',
  RARETE_ASC: 'Plus communs d’abord',
  NOM: 'Alphabétique',
};

/** `TOUTES` plutôt que `null` : la valeur circule dans un `<select>`. */
export type FiltreRarete = Rarity | 'TOUTES';

export interface Criteres {
  recherche: string;
  rarete: FiltreRarete;
  tri: Tri;
}

export const CRITERES_PAR_DEFAUT: Criteres = {
  recherche: '',
  rarete: 'TOUTES',
  tri: 'RARETE_DESC',
};

/**
 * Forme comparable d'un texte : sans accent, sans casse, sans ponctuation.
 *
 * Indispensable en français, et pas seulement par confort. Un joueur tape
 * « kinemon » sans accent, « Nico Robin » sans majuscule, « barbe blanche »
 * pour « Edward Newgate / Barbe Blanche ». Une comparaison littérale ne
 * trouverait aucun des trois, et le joueur en conclurait que le personnage
 * n'est pas dans le jeu.
 *
 * `normalize('NFD')` sépare la lettre de son accent, la plage Unicode
 * supprime ensuite les accents restés seuls.
 */
export function comparable(texte: string): string {
  return texte
    .normalize('NFD')
    // La plage des diacritiques combinants, écrite en points de code : le
    // caractère littéral serait invisible à la relecture et se perdrait au
    // premier outil qui ne respecte pas l'encodage du fichier.
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Le texte cherché est-il dans le nom ?
 *
 * Chaque mot de la recherche doit se trouver quelque part, mais pas dans
 * l'ordre : « robin nico » trouve « Nico Robin ». C'est ce qu'on attend d'une
 * recherche de nom propre, où l'ordre prénom/nom n'est jamais sûr.
 */
export function correspond(nom: string, recherche: string): boolean {
  const cible = comparable(nom);
  const mots = comparable(recherche).split(' ').filter(Boolean);
  if (mots.length === 0) return true;
  return mots.every((mot) => cible.includes(mot));
}

export interface Carte {
  id: string;
  name: string;
  rarity: Rarity;
}

/**
 * Applique les trois critères, dans l'ordre où ils se pensent : on réduit,
 * puis on ordonne.
 *
 * Le tri est **stable à égalité de rareté** : les ex æquo repassent en ordre
 * alphabétique plutôt que dans l'ordre d'arrivée. Sans cela, deux ouvertures
 * de coffre successives ne rangeraient pas la collection pareil, et le joueur
 * ne retrouverait pas une carte là où il l'a laissée.
 */
export function trier<T extends Carte>(cartes: readonly T[], criteres: Criteres): T[] {
  const { recherche, rarete, tri } = criteres;

  const retenues = cartes.filter(
    (c) =>
      (rarete === 'TOUTES' || c.rarity === rarete) && correspond(c.name, recherche),
  );

  const parNom = (a: T, b: T) => a.name.localeCompare(b.name, 'fr');

  return retenues.sort((a, b) => {
    if (tri === 'NOM') return parNom(a, b);
    const ecart =
      tri === 'RARETE_DESC'
        ? rarityRank(b.rarity) - rarityRank(a.rarity)
        : rarityRank(a.rarity) - rarityRank(b.rarity);
    return ecart !== 0 ? ecart : parNom(a, b);
  });
}

/** Nombre de cartes par rareté, pour annoncer ce que chaque filtre contient. */
export function compterParRarete<T extends Carte>(
  cartes: readonly T[],
): Record<Rarity, number> {
  const out = { COMMON: 0, RARE: 0, EPIC: 0, LEGENDARY: 0, MYTHIC: 0 } as Record<
    Rarity,
    number
  >;
  for (const c of cartes) out[c.rarity] += 1;
  return out;
}
