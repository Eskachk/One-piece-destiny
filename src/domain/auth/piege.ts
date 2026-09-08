/**
 * Piège à robots sur l'inscription (cahier §98).
 *
 * ## Ce qu'il attrape, et ce qu'il n'attrape pas
 *
 * Un champ que le formulaire cache et qu'aucun humain ne peut remplir. Les
 * robots d'inscription remplissent tout ce qu'ils trouvent dans le document :
 * s'il porte une valeur, la requête ne vient pas d'un navigateur conduit par
 * quelqu'un.
 *
 * Ce n'est pas une protection contre un attaquant qui lit la page — il lui
 * suffit de laisser le champ vide. C'est une protection contre le **volume**,
 * c'est-à-dire contre l'immense majorité : les robots génériques qui ratissent
 * les formulaires d'inscription sans regarder à quoi ils servent.
 *
 * ## Pourquoi il passe avant le quota d'adresse
 *
 * Sans cela, une rafale de robots consommerait les trois inscriptions horaires
 * d'une adresse partagée, et **les vrais joueurs derrière cette adresse**
 * seraient bloqués. Le piège doit refuser avant de compter, sinon il devient
 * l'outil du déni de service qu'il est censé arrêter.
 *
 * ## Le nom du champ
 *
 * `company` : les robots aiment les champs qu'ils reconnaissent, et un
 * `champ_piege_ne_pas_remplir` se contourne à la lecture du document. Le jeu
 * ne demande évidemment aucune société.
 */

export const PIEGE_CHAMP = 'company';

/**
 * La soumission vient-elle d'un robot ?
 *
 * Toute valeur non vide condamne. Un navigateur n'envoie rien pour un champ
 * caché que personne n'a rempli ; un remplissage automatique de gestionnaire
 * de mots de passe ne s'intéresse pas à un champ hors du flux de saisie, sans
 * étiquette et hors tabulation.
 */
export function estUnRobot(valeur: FormDataEntryValue | null): boolean {
  return typeof valeur === 'string' && valeur.trim().length > 0;
}
