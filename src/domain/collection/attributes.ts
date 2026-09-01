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
 * ## Couverture
 *
 * La première version ne connaissait qu'une vingtaine de motifs, presque tous
 * francophones. Sur 740 personnages, **211 n'affichaient aucun attribut** et
 * 187 n'en affichaient qu'un seul — « Pirate » — parce que leur seule donnée
 * était un poste écrit en anglais : `Officer`, `Resident`, `Tangerine grower`,
 * `Bestial Guard`. Une carte sans attribut n'est pas neutre : elle donne
 * l'impression d'un personnage vide, alors que la donnée existait.
 *
 * Les règles couvrent donc maintenant le vocabulaire réellement présent dans
 * l'import, dans les deux langues, y compris les postes civils. Une carte finit
 * toujours par dire quelque chose de son personnage.
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
 * L'ordre compte, et il n'est pas alphabétique : une carte n'affiche que
 * quelques symboles, et il vaut mieux montrer « Haki des Rois » que
 * « Résident ». Les familles se succèdent du plus au moins distinctif :
 *
 *   1. le Haki — ce qui sépare un combattant de premier plan des autres ;
 *   2. le type de fruit du démon ;
 *   3. le métier ou l'arme, c'est-à-dire ce que le personnage sait faire ;
 *   4. l'espèce ;
 *   5. le camp ;
 *   6. le grade ;
 *   7. le rôle civil, en dernier recours — mais affiché, parce qu'une carte
 *      vide vaut moins qu'une carte qui dit « aubergiste ».
 *
 * Les motifs couvrent les deux langues : le référentiel mélange saisie
 * manuelle en français et import en anglais, et cette incohérence-là ne se
 * corrigera pas — elle vient de la source.
 */
const RULES: {
  id: string;
  symbol: string;
  label: string;
  match: RegExp;
}[] = [
  // --- 1. Haki -------------------------------------------------------------
  { id: 'conqueror', symbol: '👑', label: 'Haki des Rois', match: /haki des rois|conqueror/i },
  { id: 'armament', symbol: '✊', label: 'Haki de l’armement', match: /haki (de l.)?armement|armament/i },
  { id: 'observation', symbol: '👁', label: 'Haki de l’observation', match: /haki (de l.)?observation|observation haki/i },

  // --- 2. Fruits du démon --------------------------------------------------
  { id: 'logia', symbol: '🌪', label: 'Fruit Logia', match: /\blogia\b/i },
  { id: 'mythic-zoan', symbol: '🐉', label: 'Zoan mythique', match: /zoan mythique|mythical zoan/i },
  { id: 'ancient-zoan', symbol: '🦕', label: 'Zoan antique', match: /zoan antique|ancient zoan/i },
  { id: 'zoan', symbol: '🐾', label: 'Fruit Zoan', match: /\bzoan\b/i },
  { id: 'paramecia', symbol: '🌀', label: 'Fruit Paramecia', match: /\bparamecia\b/i },
  { id: 'smile', symbol: '😈', label: 'SMILE', match: /\bsmile\b/i },
  // Attrape-tout : l'import écrit le nom du fruit sans jamais dire « fruit du
  // démon » — « Armo-Fruit », « Horse Fruit », « Ramollo fruit », « Fruit de
  // la Couture ». Sans cette règle, un utilisateur de fruit passait pour un
  // combattant ordinaire.
  { id: 'fruit', symbol: '🍎', label: 'Fruit du démon', match: /fruit du d.mon|devil fruit|[- ]fruit\b|\bfruit\b/i },

  // --- 3. Métiers et armes -------------------------------------------------
  { id: 'sword', symbol: '⚔️', label: 'Épéiste', match: /sabre|samura|swordsman|épéiste|epeiste|escrime|épée|epee|sword|dojo/i },
  { id: 'doctor', symbol: '⚕️', label: 'Médecin', match: /doctor|m.decin|m.decine|medical|surgeon|chirurgien/i },
  { id: 'navigator', symbol: '🧭', label: 'Navigation', match: /navigation|navigator|barreur|helmsman|climat/i },
  { id: 'shipwright', symbol: '🛠', label: 'Charpentier', match: /carpenter|charpentier|shipwright/i },
  { id: 'cook', symbol: '🍳', label: 'Cuisinier', match: /^cook$|cuisinier|\bchef\b|cook\b|baker|p.tissier/i },
  { id: 'sniper', symbol: '🎯', label: 'Tireur', match: /sniper|tireur|musketeer|mousquetaire|\btir\b|marksman/i },
  { id: 'musician', symbol: '🎵', label: 'Musicien', match: /musicien|musician|chanteu|singer/i },
  { id: 'archaeologist', symbol: '📜', label: 'Archéologue', match: /arch.olog/i },
  { id: 'scientist', symbol: '⚗️', label: 'Scientifique', match: /scientist|scientifique|savant|chercheur|researcher/i },
  { id: 'assassin', symbol: '🗡', label: 'Assassin', match: /assassin|tueur|hitman/i },
  { id: 'fighter', symbol: '🥊', label: 'Combattant', match: /fighter|combat|combattant|martial|karat|boxe|lutteur|wrestler|gladiat/i },

  // --- 4. Espèces ----------------------------------------------------------
  { id: 'giant', symbol: '🗿', label: 'Géant', match: /\bgiant\b|g.ant/i },
  { id: 'fishman', symbol: '🐟', label: 'Homme-poisson', match: /homme-poisson|fishman|merfolk|sir.ne|mermaid|poisson/i },
  { id: 'mink', symbol: '🦁', label: 'Mink', match: /\bmink\b|fourrure|musketeer unit|\bzo\b/i },
  { id: 'skypiean', symbol: '☁️', label: 'Habitant du ciel', match: /skypiea|shandia|birka|ciel/i },
  { id: 'cyborg', symbol: '🤖', label: 'Corps modifié', match: /cyborg|pacifista|seraph|s.raphin|homie|clone|robot/i },

  // --- 5. Camps ------------------------------------------------------------
  { id: 'marine', symbol: '⚓', label: 'Marine', match: /^marine$|\bmarine\b|admiral|amiral|colonel|lieutenant|commodore|ensign|private|rear.admiral|commander-in-chief/i },
  { id: 'cipher-pol', symbol: '🕶', label: 'Cipher Pol', match: /cipher pol|special agent|\bcp\d|sword/i },
  { id: 'revolutionary', symbol: '🔥', label: 'Armée révolutionnaire', match: /r.volutionnaire|revolutionary|arm.e r.volutionnaire/i },
  { id: 'celestial', symbol: '🕊', label: 'Dragon Céleste', match: /dragon c.leste|celestial dragon|tenryubito|doyen|council of five/i },
  // Les Cinq Doyens et les Chevaliers Divins n'ont pour toute donnée qu'une
  // formule — « God of justice », « Absolute ruler of the world ». Sans cette
  // règle, les personnages les plus haut placés de l'œuvre étaient aussi les
  // seules cartes entièrement muettes.
  { id: 'world-gov', symbol: '⚔', label: 'Gouvernement Mondial', match: /god of |absolute ruler|divine knight|chevalier divin|gorosei|world government|gouvernement mondial/i },
  { id: 'warden', symbol: '⛓', label: 'Impel Down', match: /impel down|guard|gardien|geôlier|geolier|warden|jailer/i },
  { id: 'samurai-land', symbol: '🎌', label: 'Pays des Wa', match: /pays des wa|wano|shogun|kozuki|kurozumo|shimotsuki|red sheaths|oniwabanshu/i },

  // --- 6. Grades -----------------------------------------------------------
  { id: 'royal', symbol: '🏰', label: 'Royauté', match: /^(king|queen|prince|princess|sovereign|roi|reine|royaut.)$|royaut.|\bking\b|\bqueen\b|\bprince(ss)?\b|souverain|monarque/i },
  { id: 'captain', symbol: '🎖', label: 'Capitaine', match: /^captain$|capitaine|co-captain|vice-captain|second-in-command|commander|chief|g.n.ral|general/i },
  { id: 'officer', symbol: '🏅', label: 'Officier', match: /officer|officier|tobi roppo|all star|gifters|numbers|lieutenant of|advisor|manager|director|chairman/i },
  { id: 'star', symbol: '⭐', label: 'Vedette', match: /vedette|superstar|star\b|idol/i },

  // --- 7. Rôles civils -----------------------------------------------------
  { id: 'craftsman', symbol: '🔨', label: 'Artisan', match: /armurier|blacksmith|forgeron|smith|galley-la|cabinetmaker|sailmaker|coater/i },
  { id: 'explorer', symbol: '🗺', label: 'Explorateur', match: /explorer|explorat|nomad|voyageur|lighthouse|phare|stationmaster|conductor/i },
  { id: 'strategist', symbol: '♟', label: 'Stratège', match: /strategist|strat.g|tactic/i },
  { id: 'merchant', symbol: '🪙', label: 'Commerce', match: /owner|marchand|merchant|store|shop|bartender|barman|grower|farmer|fisherman|p.cheur|vendeur|trader|butler|majordome|loan|usurier|banquier/i },
  { id: 'mayor', symbol: '🏛', label: 'Notable', match: /mayor|maire|sheriff|noble|advis|conseiller|ministre|minister|dean/i },
  { id: 'civilian', symbol: '🏘', label: 'Habitant', match: /resident|r.sident|habitant|villager|student|.tudiant|subordinate|citoyen|employee|employ.|squadron|escadron|yeti|vegapunk/i },

  // --- 8. Repli ------------------------------------------------------------
  //
  // Deux replis, dans cet ordre. Les noms d'équipages de l'import ne
  // contiennent pas tous le mot « crew » : « Armarda du Chapeau de Paille »,
  // « Baggy's Delivery » et « Primate League » n'en portent aucun, et leurs
  // membres se retrouvaient sans le moindre symbole alors que ce sont des
  // pirates ou des alliés.
  { id: 'ally', symbol: '🤝', label: 'Grande Flotte', match: /armarda|armada|grand fleet|grande flotte|alliance|primate league|delivery|enies lobby/i },
  { id: 'pirate', symbol: '🏴', label: 'Pirate', match: /\bcrew\b|pirate|équipage|equipage|\bbande\b/i },
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
