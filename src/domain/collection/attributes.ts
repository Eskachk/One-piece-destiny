import type { Character } from '../types';
import { signatureOf } from './signatures';

/**
 * Attributs lisibles d'un personnage.
 *
 * Une carte ne portait qu'un nom et une rareté. Or ce qui distingue deux
 * personnages en jeu — Haki, fruit du démon, camp, arme, équipage — est déjà
 * dans les données, mais illisible : `abilities` et `affiliations` sont des
 * listes de texte brut importées d'une API, en anglais et en français
 * mélangés. Ce module les **traduit en symboles**, sans rien stocker de
 * nouveau : un import ultérieur met les symboles à jour tout seul.
 *
 * ## Le défaut corrigé ici : une liste plate et un plafond de quatre
 *
 * Les règles étaient rangées par ordre de priorité, et l'on gardait les quatre
 * premières qui s'appliquaient. Conséquence mécanique : un personnage à trois
 * Haki affichait ses trois Haki, son type de fruit, **et plus rien**. Ni son
 * camp, ni son arme, ni son équipage — alors que la donnée était là.
 * Autrement dit, plus un personnage était riche, moins sa carte en disait sur
 * ce qu'il est.
 *
 * Les règles sont donc groupées en **familles**, et la sélection prend le
 * meilleur de chaque famille avant de compléter. Une carte dit maintenant, au
 * mieux : ce qu'il maîtrise, ce qu'il a mangé, ce qu'il tient, pour qui il se
 * bat, et avec qui il navigue.
 *
 * ## L'arme vient de deux sources
 *
 * L'import ne dit presque rien des armes — « Épéiste » et « Tireur », guère
 * plus. Mais `signatures.ts` décrit l'arme de cent vingt-cinq personnages, au
 * détail près : hache, massue, faux, canne-épée, sabre géant. Cette table
 * était écrite pour le dessin ; elle sert ici aussi. Une donnée saisie une
 * fois doit servir partout où elle est vraie.
 *
 * Contrainte §122 : aucun visuel de l'œuvre. Ce sont des pictogrammes Unicode.
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
 * Familles d'attributs, **dans l'ordre d'affichage**.
 *
 * L'ordre est celui de ce qu'on regarde en premier sur une carte : ce que le
 * personnage maîtrise, puis ce qu'il est, puis où il se range.
 */
export type Family =
  | 'haki'
  | 'fruit'
  | 'weapon'
  | 'crew'
  | 'camp'
  | 'rank'
  | 'species'
  | 'role';

const FAMILY_ORDER: readonly Family[] = [
  'haki',
  'fruit',
  'weapon',
  'crew',
  'camp',
  'rank',
  'species',
  'role',
];

/**
 * Combien d'attributs au plus par famille.
 *
 * Le Haki en admet trois : ce sont trois maîtrises distinctes, et les fondre
 * en un seul symbole effacerait justement ce qui sépare un capitaine d'un
 * second couteau. Partout ailleurs, un seul — deux grades ou deux métiers sur
 * la même carte n'apprennent rien de plus que le premier.
 */
const PER_FAMILY: Partial<Record<Family, number>> = { haki: 3 };

interface Rule {
  id: string;
  symbol: string;
  label: string;
  family: Family;
  match: RegExp;
}

/**
 * Règles de détection, par famille et par ordre de précision décroissante.
 *
 * Les motifs couvrent les deux langues : le référentiel mélange saisie
 * manuelle en français et import en anglais, et cette incohérence-là ne se
 * corrigera pas — elle vient de la source.
 */
const RULES: readonly Rule[] = [
  // --- Haki ----------------------------------------------------------------
  { id: 'conqueror', symbol: '👑', label: 'Haki des Rois', family: 'haki', match: /haki des rois|conqueror/i },
  { id: 'armament', symbol: '✊', label: 'Haki de l’armement', family: 'haki', match: /haki (de l.)?armement|armament/i },
  { id: 'observation', symbol: '👁', label: 'Haki de l’observation', family: 'haki', match: /haki (de l.)?observation|observation haki/i },

  // --- Fruits du démon -----------------------------------------------------
  { id: 'mythic-zoan', symbol: '🐉', label: 'Zoan mythique', family: 'fruit', match: /zoan mythique|mythical zoan/i },
  { id: 'ancient-zoan', symbol: '🦕', label: 'Zoan antique', family: 'fruit', match: /zoan antique|ancient zoan/i },
  { id: 'logia', symbol: '🌪', label: 'Fruit Logia', family: 'fruit', match: /\blogia\b/i },
  { id: 'zoan', symbol: '🐾', label: 'Fruit Zoan', family: 'fruit', match: /\bzoan\b/i },
  { id: 'paramecia', symbol: '🌀', label: 'Fruit Paramecia', family: 'fruit', match: /\bparamecia\b/i },
  { id: 'smile', symbol: '😈', label: 'SMILE', family: 'fruit', match: /\bsmile\b/i },
  // Attrape-tout : l'import écrit le nom du fruit sans jamais dire « fruit du
  // démon » — « Armo-Fruit », « Horse Fruit », « Fruit de la Couture ». Sans
  // cette règle, un utilisateur de fruit passait pour un combattant ordinaire.
  { id: 'fruit', symbol: '🍎', label: 'Fruit du démon', family: 'fruit', match: /fruit du d.mon|devil fruit|[- ]fruit\b|\bfruit\b/i },

  // --- Armes ---------------------------------------------------------------
  //
  // L'import n'en dit presque rien ; l'essentiel vient des signatures
  // physiques, plus bas. Ces motifs ne servent qu'aux personnages qui n'en ont
  // pas.
  { id: 'sword', symbol: '⚔️', label: 'Épéiste', family: 'weapon', match: /sabre|samura|swordsman|épéiste|epeiste|escrime|épée|epee|sword|dojo|kenjutsu/i },
  { id: 'gun', symbol: '🔫', label: 'Armes à feu', family: 'weapon', match: /sniper|tireur|marksman|gunner|pistol|rifle|fusil|mousquet|musketeer/i },
  { id: 'axe', symbol: '🪓', label: 'Hache', family: 'weapon', match: /\baxe\b|hache|halberd|hallebarde/i },
  { id: 'polearm', symbol: '🔱', label: 'Arme d’hast', family: 'weapon', match: /trident|spear|lance|naginata|bisento|glaive/i },
  { id: 'club', symbol: '🏏', label: 'Masse', family: 'weapon', match: /kanabo|massue|\bclub\b|\bmace\b|gourdin/i },
  { id: 'fists', symbol: '🥊', label: 'Corps à corps', family: 'weapon', match: /fighter|combat|combattant|martial|karat|boxe|lutteur|wrestler|gladiat|jujutsu|taekwondo/i },

  // --- Camps ---------------------------------------------------------------
  { id: 'marine', symbol: '⚓', label: 'Marine', family: 'camp', match: /^marine$|\bmarine\b|admiral|amiral|colonel|lieutenant|commodore|ensign|private|rear.admiral|commander-in-chief/i },
  { id: 'cipher-pol', symbol: '🕶', label: 'Cipher Pol', family: 'camp', match: /cipher pol|special agent|\bcp\d|\bsword\b(?! ?(?:man|s))/i },
  { id: 'revolutionary', symbol: '🔥', label: 'Armée révolutionnaire', family: 'camp', match: /r.volutionnaire|revolutionary|arm.e r.volutionnaire/i },
  { id: 'celestial', symbol: '🕊', label: 'Dragon Céleste', family: 'camp', match: /dragon c.leste|celestial dragon|tenryubito|doyen|council of five/i },
  { id: 'world-gov', symbol: '⚖️', label: 'Gouvernement Mondial', family: 'camp', match: /god of |absolute ruler|divine knight|chevalier divin|gorosei|world government|gouvernement mondial|enies lobby/i },
  { id: 'warden', symbol: '⛓', label: 'Impel Down', family: 'camp', match: /impel down|guard|gardien|geôlier|geolier|warden|jailer/i },
  { id: 'samurai-land', symbol: '🎌', label: 'Pays des Wa', family: 'camp', match: /pays des wa|wano|shogun|kozuki|kurozumo|shimotsuki|red sheaths|oniwabanshu/i },
  { id: 'pirate', symbol: '🏴', label: 'Pirate', family: 'camp', match: /\bcrew\b|pirate|équipage|equipage|\bbande\b|armarda|armada/i },

  // --- Grades --------------------------------------------------------------
  { id: 'royal', symbol: '🏰', label: 'Royauté', family: 'rank', match: /^(king|queen|prince|princess|sovereign|roi|reine|royaut.)$|royaut.|\bking\b|\bqueen\b|\bprince(ss)?\b|souverain|monarque/i },
  { id: 'captain', symbol: '🎖', label: 'Capitaine', family: 'rank', match: /^captain$|capitaine|co-captain|vice-captain|second-in-command|commander|chief|g.n.ral|general/i },
  { id: 'officer', symbol: '🏅', label: 'Officier', family: 'rank', match: /officer|officier|tobi roppo|all star|gifters|numbers|lieutenant of|advisor|manager|director|chairman/i },
  { id: 'star', symbol: '⭐', label: 'Vedette', family: 'rank', match: /vedette|superstar|star\b|idol/i },

  // --- Espèces -------------------------------------------------------------
  { id: 'giant', symbol: '🗿', label: 'Géant', family: 'species', match: /\bgiant\b|g.ant/i },
  { id: 'fishman', symbol: '🐟', label: 'Homme-poisson', family: 'species', match: /homme-poisson|fishman|merfolk|sir.ne|mermaid|poisson/i },
  { id: 'mink', symbol: '🦁', label: 'Mink', family: 'species', match: /\bmink\b|fourrure|musketeer unit|\bzo\b/i },
  { id: 'skypiean', symbol: '☁️', label: 'Habitant du ciel', family: 'species', match: /skypiea|shandia|birka|ciel/i },
  { id: 'cyborg', symbol: '🤖', label: 'Corps modifié', family: 'species', match: /cyborg|pacifista|seraph|s.raphin|homie|clone|robot/i },

  // --- Métiers et rôles civils ---------------------------------------------
  { id: 'doctor', symbol: '⚕️', label: 'Médecin', family: 'role', match: /doctor|m.decin|m.decine|medical|surgeon|chirurgien/i },
  { id: 'navigator', symbol: '🧭', label: 'Navigation', family: 'role', match: /navigation|navigator|barreur|helmsman|climat/i },
  { id: 'shipwright', symbol: '🛠', label: 'Charpentier', family: 'role', match: /carpenter|charpentier|shipwright/i },
  { id: 'cook', symbol: '🍳', label: 'Cuisinier', family: 'role', match: /^cook$|cuisinier|\bchef\b|cook\b|baker|p.tissier/i },
  { id: 'musician', symbol: '🎵', label: 'Musicien', family: 'role', match: /musicien|musician|chanteu|singer/i },
  { id: 'archaeologist', symbol: '📜', label: 'Archéologue', family: 'role', match: /arch.olog/i },
  { id: 'scientist', symbol: '⚗️', label: 'Scientifique', family: 'role', match: /scientist|scientifique|savant|chercheur|researcher|vegapunk/i },
  { id: 'assassin', symbol: '🗡', label: 'Assassin', family: 'role', match: /assassin|tueur|hitman/i },
  { id: 'craftsman', symbol: '🔨', label: 'Artisan', family: 'role', match: /armurier|blacksmith|forgeron|smith|galley-la|cabinetmaker|sailmaker|coater/i },
  { id: 'explorer', symbol: '🗺', label: 'Explorateur', family: 'role', match: /explorer|explorat|nomad|voyageur|lighthouse|phare|stationmaster|conductor/i },
  { id: 'strategist', symbol: '♟', label: 'Stratège', family: 'role', match: /strategist|strat.g|tactic/i },
  { id: 'merchant', symbol: '🪙', label: 'Commerce', family: 'role', match: /owner|marchand|merchant|store|shop|bartender|barman|grower|farmer|fisherman|p.cheur|vendeur|trader|butler|majordome|loan|usurier|banquier/i },
  { id: 'mayor', symbol: '🏛', label: 'Notable', family: 'role', match: /mayor|maire|sheriff|noble|advis|conseiller|ministre|minister|dean/i },
  { id: 'civilian', symbol: '🏘', label: 'Habitant', family: 'role', match: /resident|r.sident|habitant|villager|student|.tudiant|subordinate|citoyen|employee|employ.|squadron|escadron|yeti/i },
];

/* ---------------------------------------------------------------------------
   L'équipage.

   C'est ce qui manquait le plus : un pirate affichait « 🏴 Pirate », ce qui ne
   dit rien — ils le sont tous. Or l'affiliation porte le nom de l'équipage,
   et c'est l'information que le joueur cherche quand il compose : deux
   personnages du même équipage se croisent dans les mêmes chapitres.

   Les noms de l'import sont irréguliers — « Big Mom's crew », « The Hundred
   Beasts crew », « Le Roux crew », « Armarda du Chapeau de Paille » — et
   souvent en anglais sur un site français. La table les normalise ; le repli
   nettoie ce qu'elle ne connaît pas plutôt que de l'écarter.
   --------------------------------------------------------------------------- */

const CREWS: readonly { match: RegExp; symbol: string; label: string }[] = [
  { match: /mugiwara|chapeau de paille/i, symbol: '👒', label: 'Chapeau de Paille' },
  { match: /hundred beasts|cent b.tes|kaido/i, symbol: '🐲', label: 'Cent Bêtes' },
  { match: /big mom|charlotte/i, symbol: '🍰', label: 'Big Mom' },
  { match: /whitebeard|barbe blanche/i, symbol: '⚪', label: 'Barbe Blanche' },
  { match: /blackbeard|barbe noire/i, symbol: '⚫', label: 'Barbe Noire' },
  { match: /pirates roger|roger crew/i, symbol: '🗺', label: 'Équipage de Roger' },
  { match: /le roux|red hair/i, symbol: '🟥', label: 'Équipage du Roux' },
  { match: /don quixote|donquixote|dressrosa/i, symbol: '🕶', label: 'Famille Don Quichotte' },
  { match: /hearth crew|heart pirates/i, symbol: '💛', label: 'Heart Pirates' },
  { match: /fire tank/i, symbol: '🔥', label: 'Firetank' },
  { match: /kuja/i, symbol: '🐍', label: 'Kuja' },
  { match: /new fishmen|nouveaux hommes/i, symbol: '🦈', label: 'Nouveaux Hommes-Poissons' },
  { match: /baggy|buggy|cross guild/i, symbol: '🤡', label: 'Cross Guild' },
  { match: /black cat|chat noir/i, symbol: '🐈', label: 'Chat Noir' },
  { match: /foxy/i, symbol: '🦊', label: 'Foxy' },
  { match: /krieg/i, symbol: '🛡', label: 'Armada de Krieg' },
  { match: /lion d.or|shiki/i, symbol: '🦁', label: 'Lion d’Or' },
  { match: /trump/i, symbol: '🃏', label: 'Trump Pirates' },
  { match: /gasparde/i, symbol: '🍬', label: 'Gasparde' },
  { match: /germa/i, symbol: '🧪', label: 'Germa 66' },
  { match: /armarda|armada|grand fleet|grande flotte/i, symbol: '⛵', label: 'Grande Flotte' },
  { match: /baroque works/i, symbol: '🐊', label: 'Baroque Works' },
  { match: /primate league/i, symbol: '🐒', label: 'Primate League' },
];

/** Le mot « crew » et ses variantes, retirés pour ne garder que le nom. */
const CREW_NOISE = /^(the|le|la|les)\s+|\s*'?s?\s*(crew|pirates?|équipage|equipage)\s*$/gi;

function crewOf(character: Character): Attribute | null {
  for (const entry of character.affiliations) {
    for (const crew of CREWS) {
      if (crew.match.test(entry)) {
        return { id: `crew-${crew.label}`, symbol: crew.symbol, label: crew.label };
      }
    }
  }

  // Repli : toute affiliation qui se présente comme un équipage. Mieux vaut un
  // nom brut qu'un pirate anonyme.
  for (const entry of character.affiliations) {
    if (!/crew|pirates?|équipage|equipage|armada|armarda|fleet|flotte/i.test(entry)) continue;
    const label = entry.replace(CREW_NOISE, '').trim();
    if (label.length > 1) {
      return { id: `crew-${label}`, symbol: '🏴‍☠️', label };
    }
  }

  return null;
}

/* ---------------------------------------------------------------------------
   L'arme, tirée de la description physique quand il y en a une.
   --------------------------------------------------------------------------- */

const PROP_ATTRIBUTES: Record<string, Attribute> = {
  sword: { id: 'sword', symbol: '⚔️', label: 'Épéiste' },
  katana3: { id: 'katana3', symbol: '⚔️', label: 'Trois sabres' },
  greatsword: { id: 'greatsword', symbol: '🗡', label: 'Lame géante' },
  staff: { id: 'staff', symbol: '🪄', label: 'Bâton' },
  axe: { id: 'axe', symbol: '🪓', label: 'Hache' },
  club: { id: 'club', symbol: '🏏', label: 'Masse' },
  gun: { id: 'gun', symbol: '🔫', label: 'Armes à feu' },
  knives: { id: 'knives', symbol: '🔪', label: 'Lames courtes' },
  cane: { id: 'cane', symbol: '🦯', label: 'Canne-épée' },
  hook: { id: 'hook', symbol: '🪝', label: 'Crochet' },
};

/** Nombre de symboles affichés sur une carte. Au-delà, la carte devient une soupe. */
export const MAX_ATTRIBUTES = 6;

/**
 * Attributs d'un personnage, du plus signifiant au moins signifiant.
 *
 * Fonction pure : elle tourne côté serveur comme dans le navigateur, et se
 * teste sans base.
 */
export function attributesOf(character: Character): Attribute[] {
  // Un seul corpus : peu importe qu'une information soit rangée en
  // `abilities` ou en `affiliations`, l'import n'est pas cohérent là-dessus.
  const haystack = [...character.abilities, ...character.affiliations];

  const byFamily = new Map<Family, Attribute[]>();
  const ajouter = (family: Family, attribute: Attribute) => {
    const list = byFamily.get(family) ?? [];
    const limit = PER_FAMILY[family] ?? 1;
    if (list.length >= limit) return;
    if (list.some((a) => a.id === attribute.id)) return;
    list.push(attribute);
    byFamily.set(family, list);
  };

  for (const rule of RULES) {
    if (haystack.some((entry) => rule.match.test(entry))) {
      ajouter(rule.family, { id: rule.id, symbol: rule.symbol, label: rule.label });
    }
  }

  // L'arme décrite l'emporte sur celle déduite : « hache » vaut mieux que
  // « combattant », et c'est une donnée saisie plutôt que devinée.
  const prop = signatureOf(character.id)?.prop;
  if (prop && prop !== 'none') {
    const attribute = PROP_ATTRIBUTES[prop];
    if (attribute) byFamily.set('weapon', [attribute]);
  }

  const crew = crewOf(character);
  if (crew) ajouter('crew', crew);

  // La sélection prend famille par famille, dans l'ordre d'affichage. C'est ce
  // qui garantit qu'un personnage à trois Haki montre quand même son camp et
  // son équipage — le défaut de la version plate.
  const found: Attribute[] = [];
  for (const family of FAMILY_ORDER) {
    for (const attribute of byFamily.get(family) ?? []) {
      if (found.length >= MAX_ATTRIBUTES) return found;
      found.push(attribute);
    }
  }

  return found;
}
