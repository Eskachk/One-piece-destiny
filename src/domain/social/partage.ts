/**
 * Lecture des paramètres d'un lien de partage (cahier §69).
 *
 * ## Pourquoi ces bornes existent
 *
 * `/share/<chapitre>/<équipage>` est un **espace d'URL infini** : n'importe
 * quelle chaîne fait une adresse valide, et chacune déclenche la génération
 * d'une image de 1200 × 630 — mesurée entre 0,45 s à chaud et 1,8 s à froid de
 * calcul serveur. Deux conséquences, et aucune n'est théorique :
 *
 *   — un robot d'indexation qui suit ces liens explore un espace sans fond, et
 *     chaque exploration coûte une génération ;
 *   — le cache de la plateforme est indexé sur l'URL, donc trivialement
 *     contournable : il suffit de changer un caractère pour forcer un nouveau
 *     calcul, indéfiniment.
 *
 * On ne peut pas empêcher qu'on demande ces adresses. On peut garantir que
 * **le travail par requête reste borné**, ce que fait ce module : la chaîne
 * est coupée avant d'être découpée, et le découpage s'arrête à trois.
 *
 * La page, elle, porte `noindex` : les robots des réseaux sociaux continuent
 * de lire la carte — c'est tout l'intérêt du partage — mais les moteurs de
 * recherche cessent d'entretenir un index de permutations.
 */

/**
 * Longueur maximale de la portion « équipage » de l'URL.
 *
 * Trois identifiants séparés par des virgules ; le plus long du référentiel
 * fait une trentaine de caractères, et l'encodage d'URL peut tripler certains
 * signes. Cent vingt laisse une marge confortable et rend impossible le
 * découpage d'une chaîne d'un mégaoctet — un million d'éléments alloués avant
 * qu'on n'en garde trois.
 */
export const CREW_MAX = 120;

/** Un équipage compte trois personnages (cahier §1). */
export const CREW_TAILLE = 3;

/**
 * Identifiants d'un équipage, lus depuis l'URL.
 *
 * Le découpage est **borné avant** d'être fait, jamais après : `split` puis
 * `slice` alloue d'abord le tableau entier, ce qui est précisément le travail
 * qu'on cherche à éviter.
 */
export function lireEquipage(crew: string): string[] {
  let decode: string;
  try {
    decode = decodeURIComponent(crew.slice(0, CREW_MAX));
  } catch {
    // Un `%` isolé fait jeter `decodeURIComponent`. Une URL malformée n'est
    // pas une panne : c'est un lien tronqué par un client de messagerie, et
    // il ne doit pas rendre 500.
    decode = crew.slice(0, CREW_MAX);
  }

  return decode
    .split(',', CREW_TAILLE)
    .map((id) => id.trim())
    .filter(Boolean);
}

/**
 * Numéro de chapitre lu depuis l'URL, ou `null`.
 *
 * Il n'est utilisé que pour être **réaffiché**. Sans contrôle, tout le contenu
 * du chemin se retrouvait dans le titre de la page et dans l'image — de quoi
 * faire dire n'importe quoi à une carte de partage qui porte le nom du jeu.
 */
export function lireChapitre(chapter: string): number | null {
  if (!/^\d{1,5}$/.test(chapter)) return null;
  const numero = Number(chapter);
  return numero > 0 ? numero : null;
}
