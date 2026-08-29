import type { Character } from '../types';

/**
 * Attributs lisibles d'un personnage.
 *
 * Une carte ne portait jusqu'ici qu'un nom et une rareté. Or ce qui distingue
 * deux personnages en jeu — Haki, fruit du démon, camp, arme — était déjà dans
 * les données, mais illisible : `abilities` et `affiliations` sont des listes
 * de texte brut importées d'une API, en anglais et en français mélangés.
 *
 * Ce module les **traduit en symboles**. Il ne stocke rien de nouveau : tout
 * est dérivé du référentiel, donc un import ultérieur met les symboles à jour
 * sans travail supplémentaire.
 *
 * Contrainte §122 : aucun visuel de l'œuvre. Ce sont des pictogrammes Unicode,
 * pas des illustrations.
 */

export interface Attribute {
  /** Identifiant stable, utilisé comme clé de rendu. */
  id: string;
  /** Pictogramme affiché sur la carte. */
  symbol: string;
  /** Nom lisible — le symbole seul ne suffit pas (lecteurs d'écran, §111). */
  label: string;
}

/**
 * Règles de détection, **dans l'ordre de priorité**.
 *
 * L'ordre compte : une carte n'affiche que quelques symboles, et il vaut mieux
 * montrer « Haki des Rois » que « Résident ». Les motifs couvrent les deux
 * langues parce que le référentiel mélange saisie manuelle en français et
 * import en anglais.
 */
const RULES: {
  id: string;
  symbol: string;
  label: string;
  match: RegExp;
}[] = [
  { id: 'conqueror', symbol: '👑', label: 'Haki des Rois', match: /haki des rois|conqueror/i },
  { id: 'armament', symbol: '✊', label: 'Haki de l’armement', match: /haki (de l.)?armement|armament/i },
  { id: 'observation', symbol: '👁', label: 'Haki de l’observation', match: /haki (de l.)?observation|observation haki/i },
  { id: 'logia', symbol: '🌪', label: 'Fruit Logia', match: /\blogia\b/i },
  { id: 'zoan', symbol: '🐾', label: 'Fruit Zoan', match: /\bzoan\b/i },
  { id: 'paramecia', symbol: '🌀', label: 'Fruit Paramecia', match: /\bparamecia\b/i },
  { id: 'smile', symbol: '😈', label: 'SMILE', match: /\bsmile\b/i },
  { id: 'fruit', symbol: '🍎', label: 'Fruit du démon', match: /fruit du d.mon|devil fruit/i },
  { id: 'sword', symbol: '⚔️', label: 'Épéiste', match: /sabre|samurai|swordsman|épée|epee|sword/i },
  { id: 'marine', symbol: '⚓', label: 'Marine', match: /^marine$|admiral|amiral|vice-admiral|colonel|lieutenant/i },
  { id: 'captain', symbol: '🎖', label: 'Capitaine', match: /^captain$|capitaine/i },
  { id: 'doctor', symbol: '⚕️', label: 'Médecin', match: /doctor|m.decin/i },
  { id: 'navigator', symbol: '🧭', label: 'Navigation', match: /navigation|navigator/i },
  { id: 'shipwright', symbol: '🛠', label: 'Charpentier', match: /carpenter|charpentier|shipwright/i },
  { id: 'cook', symbol: '🍳', label: 'Cuisinier', match: /^cook$|cuisinier|chef/i },
  { id: 'sniper', symbol: '🎯', label: 'Tireur', match: /sniper|tireur|musketeer/i },
  { id: 'royal', symbol: '🏰', label: 'Royauté', match: /^(king|queen|prince|princess|sovereign|roi|reine)$/i },
  { id: 'giant', symbol: '🗿', label: 'Géant', match: /giant|g.ant/i },
  { id: 'fishman', symbol: '🐟', label: 'Homme-poisson', match: /homme|fishman|merfolk|poisson/i },
  { id: 'pirate', symbol: '🏴', label: 'Pirate', match: /\bcrew\b|pirate|équipage|equipage/i },
];

/** Nombre de symboles affichés sur une carte. Au-delà, la carte devient une soupe. */
export const MAX_ATTRIBUTES = 4;

/**
 * Attributs d'un personnage, du plus signifiant au moins signifiant.
 *
 * Fonction pure et sans dépendance : elle peut tourner côté serveur comme
 * dans le navigateur, et se teste sans base.
 */
export function attributesOf(character: Character): Attribute[] {
  // Un seul corpus : peu importe qu'une information soit rangée en
  // `abilities` ou en `affiliations`, l'import n'est pas cohérent là-dessus.
  const haystack = [...character.abilities, ...character.affiliations];

  const found: Attribute[] = [];
  for (const rule of RULES) {
    if (found.length >= MAX_ATTRIBUTES) break;
    if (haystack.some((entry) => rule.match.test(entry))) {
      found.push({ id: rule.id, symbol: rule.symbol, label: rule.label });
    }
  }

  return found;
}
