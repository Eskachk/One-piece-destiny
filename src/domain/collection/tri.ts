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
  /**
   * Attributs exigés, **tous ensemble**.
   *
   * Le cumul se fait en ET, jamais en OU, et c'est le point de la
   * fonctionnalité : on cherche « un épéiste **qui a aussi** le Haki des
   * Rois », pas « un épéiste ou un porteur du Haki des Rois ». La seconde
   * lecture élargirait la liste à chaque clic — l'inverse de ce qu'on attend
   * d'un filtre, où ajouter un critère doit réduire.
   *
   * Vide = aucune contrainte, comme `TOUTES` pour la rareté.
   */
  attributs: readonly string[];
  tri: Tri;
}

export const CRITERES_PAR_DEFAUT: Criteres = {
  recherche: '',
  rarete: 'TOUTES',
  attributs: [],
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

/** Une pastille de filtre : ce qu'il faut pour l'afficher et la cocher. */
export interface OptionAttribut {
  id: string;
  symbol: string;
  label: string;
}

/**
 * Les pastilles, groupées par famille et déjà ordonnées.
 *
 * Le regroupement est fait **par le serveur**, qui connaît l'ordre des
 * familles. Le client se contente d'afficher : lui faire retrouver cet ordre
 * l'obligerait à importer `attributes.ts`, et avec lui la table des signatures
 * physiques.
 */
export interface GroupeAttributs {
  famille: string;
  titre: string;
  attributs: OptionAttribut[];
}

export interface Carte {
  id: string;
  name: string;
  rarity: Rarity;
  /**
   * Identifiants des attributs de la carte, calculés **par le serveur**.
   *
   * Ils traversent sous forme de chaînes courtes — `conqueror`, `armament` —
   * et non d'objets complets. Le libellé et le pictogramme voyagent une seule
   * fois, dans le catalogue passé au filtre, plutôt qu'une fois par carte.
   *
   * Ils ne sont pas recalculés ici : `attributesOf` tire la table des
   * signatures physiques, trois mille lignes qu'un composant client n'a aucune
   * raison de recevoir.
   */
  attributs?: readonly string[];
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

  const exiges = criteres.attributs;

  const retenues = cartes.filter(
    (c) =>
      (rarete === 'TOUTES' || c.rarity === rarete) &&
      correspond(c.name, recherche) &&
      // Tous les attributs demandés, pas au moins un : ajouter un critère
      // doit réduire la liste.
      exiges.every((attribut) => c.attributs?.includes(attribut)),
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

/**
 * Combien de cartes porteraient chaque attribut **si on l'ajoutait aux
 * critères courants**.
 *
 * Pas un simple comptage global : le nombre affiché sur chaque pastille doit
 * dire ce qu'un clic donnerait. Sinon « ⚔️ Épéiste (27) » resterait à 27 après
 * avoir coché « Haki des Rois », et le joueur cliquerait sur une combinaison
 * vide en croyant l'inverse.
 *
 * Un attribut déjà coché est compté sur les critères **sans lui** : sa
 * pastille annonce alors ce qu'on perd en le décochant, ce qui est la seule
 * lecture utile d'un critère déjà actif.
 */
export function comptesParAttribut<T extends Carte>(
  cartes: readonly T[],
  criteres: Criteres,
): Map<string, number> {
  const comptes = new Map<string, number>();

  // L'ensemble des attributs présents, toutes cartes confondues : on ne
  // propose jamais un filtre qui ne rendrait rien.
  const connus = new Set<string>();
  for (const carte of cartes) {
    for (const attribut of carte.attributs ?? []) connus.add(attribut);
  }

  for (const attribut of connus) {
    const autres = criteres.attributs.filter((a) => a !== attribut);
    const base = trier(cartes, { ...criteres, attributs: autres });
    comptes.set(
      attribut,
      base.filter((c) => c.attributs?.includes(attribut)).length,
    );
  }

  return comptes;
}

/**
 * Nombre de cartes par rareté, pour annoncer ce que chaque option contient.
 *
 * `criteres` est optionnel, et quand il est fourni le compte est **contextuel**
 * : il dit ce que choisir cette rareté donnerait, les autres critères restant
 * en place. La rareté elle-même est retirée du calcul — c'est une liste à
 * choix unique, chaque option remplace la précédente.
 *
 * Sans cela, les deux contrôles se contrediraient. Les pastilles d'attributs
 * annoncent déjà ce qu'un clic donnerait ; laisser « Épique (25) » à côté de
 * deux attributs cochés qui ne laissent aucun Épique produirait exactement le
 * défaut que le compte par rareté avait été écrit pour éviter — une grille
 * vide qui ressemble à une panne.
 */
export function compterParRarete<T extends Carte>(
  cartes: readonly T[],
  criteres?: Criteres,
): Record<Rarity, number> {
  const out = { COMMON: 0, RARE: 0, EPIC: 0, LEGENDARY: 0, MYTHIC: 0 } as Record<
    Rarity,
    number
  >;

  const base = criteres
    ? trier(cartes, { ...criteres, rarete: 'TOUTES' })
    : cartes;

  for (const c of base) out[c.rarity] += 1;
  return out;
}
