/**
 * Ligues privées : le classement entre gens qu'on connaît.
 *
 * ## Pourquoi elles existent
 *
 * Le classement mondial affiche cinquante lignes. À douze joueurs, tout le
 * monde y figure ; à mille, le joueur médian est quatre-centième, ne paraît
 * sur aucune liste, et le classement cesse de le concerner. Les divisions
 * adoucissent la chute mais restent une progression **solitaire** : on y monte
 * seul, contre un percentile.
 *
 * Or un jeu de pronostics vit de « je bats mes potes ». C'est la seule
 * compétition qui garde son sens quel que soit le nombre de joueurs, parce
 * qu'elle ne dépend pas du nombre de joueurs.
 *
 * ## Ce qu'une ligue ne change pas
 *
 * Rien au score. Une ligue **filtre** un classement déjà calculé : les points
 * sont ceux du chapitre, identiques au mondial. Elle ne distribue ni Berries,
 * ni coffres, ni avantage (§48, §72) — sans quoi il suffirait de créer une
 * ligue de deux pour y finir premier chaque semaine.
 *
 * C'est aussi ce qui la rend bon marché : aucune écriture au moment de la
 * publication, aucune ligne de plus par joueur et par semaine.
 */

/**
 * Alphabet des codes, repris du parrainage.
 *
 * Il retire `I` et `O`, qui se confondent avec `1` et `0` sur un écran comme à
 * l'oral — et le joueur qui s'y trompe conclut que la ligue n'existe pas, pas
 * qu'il a mal lu. Les voyelles, elles, **restent** : les retirer diviserait
 * l'espace par deux pour se prémunir d'un mot malheureux que six caractères
 * tirés au hasard ne forment quasiment jamais.
 */
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LENGTH = 6;

/**
 * Combien de membres au plus.
 *
 * Cinquante, et ce n'est pas une limite technique. Une ligue de trois cents
 * redevient un classement mondial en plus petit : on y cherche son nom dans
 * une liste, ce qui est exactement ce à quoi les ligues servent à échapper.
 * C'est aussi ce qui garantit que le classement d'une ligue tient en une
 * requête sans pagination.
 */
export const MAX_MEMBRES = 50;

/**
 * Combien de ligues par joueur.
 *
 * Cinq : les amis, la famille, le serveur Discord, le forum. Au-delà, la page
 * devient une liste et plus aucune ligue ne compte.
 */
export const MAX_LIGUES_PAR_JOUEUR = 5;

export const NOM_MIN = 3;
export const NOM_MAX = 30;

/**
 * Code d'invitation.
 *
 * Six caractères plutôt que huit : il se dit à voix haute, se recopie d'un
 * écran à l'autre, et il n'a pas à résister à une attaque — rejoindre une
 * ligue ne donne accès à rien d'autre qu'un classement de pseudonymes déjà
 * publics.
 *
 * Le rejet des valeurs hors du plus grand multiple de l'alphabet évite le
 * biais modulo : sans lui, les premières lettres sortiraient plus souvent.
 *
 * `crypto.getRandomValues` plutôt que `node:crypto` : ce module porte des
 * constantes lues par un composant client, et une dépendance Node y casserait
 * le bundle navigateur.
 */
export function genererCodeLigue(): string {
  const limite = Math.floor(256 / CODE_ALPHABET.length) * CODE_ALPHABET.length;
  let code = '';

  while (code.length < CODE_LENGTH) {
    const octets = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
    for (const octet of octets) {
      if (octet >= limite) continue;
      code += CODE_ALPHABET[octet % CODE_ALPHABET.length];
      if (code.length === CODE_LENGTH) break;
    }
  }

  return code;
}

/**
 * Forme canonique d'un code saisi.
 *
 * Majuscules, espaces et tirets retirés : le joueur recopie ce qu'il voit, et
 * ce qu'il voit peut avoir été collé dans un message, coupé par un retour à la
 * ligne ou embelli d'un tiret.
 */
export function normaliserCodeLigue(saisie: string): string {
  return saisie.trim().toUpperCase().replace(/[\s-]/g, '');
}

export type RefusNom = 'TROP_COURT' | 'TROP_LONG';

export type VerdictNom =
  | { valide: true; nom: string }
  | { valide: false; raison: RefusNom };

/**
 * Valide et normalise un nom de ligue.
 *
 * Les espaces intérieurs multiples sont réduits : « Les   Chapeaux » et « Les
 * Chapeaux » sont le même nom, et laisser passer les deux permet de fabriquer
 * deux ligues visuellement identiques.
 *
 * On n'interdit **pas** les caractères spéciaux. Le nom est affiché par React,
 * qui échappe tout ; interdire les emoji ou les accents priverait les joueurs
 * d'un nom qui leur ressemble pour se protéger d'un risque qui n'existe pas.
 */
export function validerNomLigue(saisie: string): VerdictNom {
  const nom = saisie.trim().replace(/\s+/g, ' ');

  if (nom.length < NOM_MIN) return { valide: false, raison: 'TROP_COURT' };
  if (nom.length > NOM_MAX) return { valide: false, raison: 'TROP_LONG' };

  return { valide: true, nom };
}

export function decrireRefusNom(raison: RefusNom): string {
  switch (raison) {
    case 'TROP_COURT':
      return `Le nom doit faire au moins ${NOM_MIN} caractères.`;
    case 'TROP_LONG':
      return `Le nom ne peut pas dépasser ${NOM_MAX} caractères.`;
  }
}

export type RefusAdhesion =
  | 'CODE_INCONNU'
  | 'DEJA_MEMBRE'
  | 'LIGUE_PLEINE'
  | 'TROP_DE_LIGUES';

export function decrireRefusAdhesion(raison: RefusAdhesion): string {
  switch (raison) {
    case 'CODE_INCONNU':
      return 'Aucune ligue ne porte ce code.';
    case 'DEJA_MEMBRE':
      return 'Tu fais déjà partie de cette ligue.';
    case 'LIGUE_PLEINE':
      return `Cette ligue est complète (${MAX_MEMBRES} membres).`;
    case 'TROP_DE_LIGUES':
      return `Tu ne peux pas rejoindre plus de ${MAX_LIGUES_PAR_JOUEUR} ligues.`;
  }
}

export interface LigneLigue {
  playerId: string;
  handle: string;
  total: number;
}

export interface RangLigue extends LigneLigue {
  /** Rang sportif : deux ex æquo partagent le même, le suivant saute. */
  rang: number;
}

/**
 * Classe les membres d'une ligue.
 *
 * **Classement sportif**, comme au mondial : deux joueurs à égalité partagent
 * le rang. Les départager sur autre chose que les points — l'ordre de la base,
 * l'ancienneté — inventerait une hiérarchie que rien ne justifie, et un joueur
 * verrait son rang changer d'une semaine à l'autre à score identique.
 *
 * Les membres **sans score** — inscrits mais qui n'ont pas joué ce
 * chapitre-là — sont rendus séparément par l'appelant : les classer derniers
 * à zéro point les confondrait avec ceux qui ont joué et raté.
 */
export function classer(lignes: readonly LigneLigue[]): RangLigue[] {
  const triees = [...lignes].sort(
    (a, b) => b.total - a.total || a.handle.localeCompare(b.handle, 'fr'),
  );

  return triees.map((ligne) => ({
    ...ligne,
    rang: triees.filter((autre) => autre.total > ligne.total).length + 1,
  }));
}
