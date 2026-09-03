import { CHARACTERS } from '../../data/characters';
import { attributesOf } from '../collection/attributes';

/**
 * Ce que vaut un attribut **partagé** entre deux personnages.
 *
 * ## Le problème d'une liste écrite à la main
 *
 * Le v3 décidait par une petite table : le Haki comptait, l'équipage comptait,
 * le fruit comptait, et le reste était écarté d'un bloc — « la moitié du
 * référentiel est pirate, en faire un lien reviendrait à distribuer le bonus à
 * tout le monde ».
 *
 * Le raisonnement était juste pour « pirate », et faux pour tout ce qu'il
 * emportait avec lui. Écarter la famille entière des camps écartait aussi
 * « Pays des Wa », que trente-huit personnages partagent — soit cinq pour
 * cent, ce qui est un lien parfaitement significatif. Kinémon et Denjirô sont
 * tous deux samouraïs de Wano et tous deux sabreurs : deux points communs
 * francs, que le moteur ne voyait pas parce qu'ils étaient rangés dans les
 * mauvaises familles.
 *
 * ## Ce qui remplace la liste
 *
 * La **rareté mesurée** de l'attribut dans le référentiel. Un attribut que
 * quatre cents personnages portent n'apprend rien ; un attribut que dix-sept
 * personnages portent est une vraie parenté. Le barème s'ajuste donc tout seul
 * quand le référentiel change, et aucune famille n'est exclue par principe.
 *
 * Sur les fréquences réelles, la courbe donne :
 *
 *   pirate                41 %  →  0   (aucun lien : ils le sont tous)
 *   officier              16 %  →  2
 *   Marine                14 %  →  2
 *   équipage de Big Mom   12 %  →  3   (un grand équipage informe moins)
 *   épéiste                7 %  →  4
 *   Pays des Wa            5 %  →  4
 *   Chapeau de Paille      5 %  →  4
 *   Haki de l'observation  3 %  →  5
 *   Haki des Rois          2 %  →  5
 */

/** Ce que vaut le partage d'un attribut que personne d'autre ne porte. */
const MAX_POINTS = 6;

/**
 * Raideur de la courbe.
 *
 * Six : c'est la valeur qui fait tomber « pirate » à zéro tout en laissant
 * « épéiste », à sept pour cent, valoir quatre points. Plus bas, les attributs
 * omniprésents rapportent encore ; plus haut, les attributs simplement
 * courants cessent de compter.
 */
const EXPONENT = 6;

/**
 * Barème, calculé une fois à la première demande.
 *
 * Le référentiel est figé à la compilation : recompter à chaque appel
 * coûterait sept cents parcours par joueur au moment de la publication, pour
 * un résultat identique.
 */
let bareme: Map<string, number> | null = null;

function construire(): Map<string, number> {
  const compte = new Map<string, number>();
  for (const character of CHARACTERS) {
    for (const attribute of attributesOf(character)) {
      compte.set(attribute.id, (compte.get(attribute.id) ?? 0) + 1);
    }
  }

  const total = CHARACTERS.length || 1;
  const out = new Map<string, number>();
  for (const [id, n] of compte) {
    const frequence = n / total;
    out.set(id, Math.round(MAX_POINTS * (1 - frequence) ** EXPONENT));
  }
  return out;
}

/**
 * Points accordés pour un attribut partagé. Zéro pour un attribut si répandu
 * qu'il ne distingue personne.
 */
export function sharedAttributeValue(attributeId: string): number {
  bareme ??= construire();
  // Un attribut absent du barème n'existe sur aucun personnage du référentiel :
  // il vaut donc le maximum, faute d'être commun à quiconque.
  return bareme.get(attributeId) ?? MAX_POINTS;
}
