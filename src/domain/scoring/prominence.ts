import { CHARACTERS } from '../../data/characters';
import { isCanon } from '../../data/non-canon';
import { attributesOf } from '../collection/attributes';
import type { Character, PresenceExpectation, Rarity } from '../types';

/**
 * Improbabilité d'un pari (cahier §10, §11).
 *
 * ## Ce que ce module calcule
 *
 * Un nombre entre 0 et 1 : **à quel point choisir ce personnage était un
 * pari**. Zéro pour une évidence, un pour un coup de dés. C'est la même
 * grandeur que la jauge affichée au moment de composer, et elle sert
 * maintenant aux deux — la jauge et les points.
 *
 * Elles étaient calculées séparément, et divergeaient : la jauge ne lisait que
 * l'attendu de présence et le taux de sélection, le moteur de score faisait de
 * même de son côté. Deux formules pour une même question finissent toujours
 * par se contredire, et c'est le joueur qui découvre l'écart après coup.
 *
 * ## Les quatre estimateurs
 *
 * Aucun n'est fiable seul ; ensemble ils se corrigent.
 *
 *   — **l'attendu de présence**, saisi à la main dans le référentiel. Le plus
 *     direct, mais il ne connaît que trois valeurs ;
 *   — **la rareté**, qui suit d'assez près la notoriété : les Mythiques sont
 *     l'équipage au Chapeau de Paille, les Communs des figurants ;
 *   — **les attributs**, qui disent la stature. Trois Haki, un fruit et un
 *     équipage décrivent quelqu'un dont on entend parler chaque semaine ; un
 *     seul symbole de métier décrit un second couteau ;
 *   — **le taux de sélection** de la semaine, quand il est connu. C'est le
 *     seul qui mesure ce que la communauté croit, plutôt que ce que les
 *     données affirment.
 *
 * ## Sur la rareté, et le §25
 *
 * Le cahier interdit que la rareté **rapporte** des points : sans quoi acheter
 * des coffres achèterait du classement, ce que le §48 refuse. Cette règle est
 * respectée, et même renforcée : ici la rareté **abaisse** le bonus de risque.
 * Une carte Mythique est un choix sûr, donc peu payant ; une Commune est un
 * pari, donc généreuse si elle sort. Aligner trois Mythiques reste le jeu le
 * plus prudent — jamais le plus rentable.
 */

/** Attendu de présence, du plus sûr au plus incertain. */
const PRESENCE_RISK: Record<PresenceExpectation, number> = {
  HIGH: 0.15,
  MEDIUM: 0.5,
  LOW: 1,
};

/**
 * Rareté, du plus sûr au plus incertain.
 *
 * L'écart n'est pas linéaire : entre Commun et Rare la notoriété change peu,
 * entre Légendaire et Mythique elle change beaucoup.
 */
const RARITY_RISK: Record<Rarity, number> = {
  COMMON: 1,
  RARE: 0.82,
  EPIC: 0.6,
  LEGENDARY: 0.34,
  MYTHIC: 0.15,
};

/**
 * Ce que chaque famille d'attributs dit de la stature d'un personnage.
 *
 * Le Haki pèse le plus, et de loin : c'est le seul attribut que l'œuvre
 * réserve aux personnages de premier plan. Un métier ou une espèce ne disent
 * presque rien — un cuisinier peut être Sanji comme un figurant.
 */
const FAMILY_WEIGHT: Record<string, number> = {
  conqueror: 0.24,
  armament: 0.2,
  observation: 0.2,

  'mythic-zoan': 0.16,
  'ancient-zoan': 0.14,
  logia: 0.14,
  zoan: 0.1,
  paramecia: 0.1,
  smile: 0.06,
  fruit: 0.1,
};

/** Poids par défaut, par préfixe de famille, pour tout le reste. */
const DEFAULT_WEIGHT = 0.05;
const CREW_WEIGHT = 0.09;
const RANK_WEIGHT = 0.09;

/**
 * Notoriété tirée des attributs, entre 0 et 1.
 *
 * Exportée pour les tests et pour le Poste de commandement : c'est le chiffre
 * qui explique pourquoi tel personnage rapporte peu.
 */
export function attributeProminence(character: Character): number {
  let total = 0;

  for (const attribute of attributesOf(character)) {
    if (attribute.id.startsWith('crew-')) {
      total += CREW_WEIGHT;
      continue;
    }
    if (['royal', 'captain', 'officer', 'star'].includes(attribute.id)) {
      total += RANK_WEIGHT;
      continue;
    }
    total += FAMILY_WEIGHT[attribute.id] ?? DEFAULT_WEIGHT;
  }

  return Math.min(1, total);
}

export interface RiskBreakdown {
  /** Le facteur retenu, entre 0 et 1. */
  factor: number;
  presence: number;
  rarity: number;
  attributes: number;
  /** `null` quand la semaine n'a pas encore de taux de sélection. */
  pickRate: number | null;
}

/**
 * Poids des quatre estimateurs.
 *
 * L'attendu de présence et le taux de sélection pèsent le plus : le premier
 * est une évaluation humaine explicite, le second une mesure réelle. La rareté
 * et les attributs sont des indices — bons, mais indirects.
 */
const WEIGHTS = { presence: 3, rarity: 2, attributes: 2, pickRate: 3 } as const;

/**
 * Improbabilité du choix d'un personnage, avec le détail de son calcul.
 *
 * @param pickRate part des joueurs ayant choisi ce personnage cette semaine
 *                 (0–1), ou `undefined` si la semaine ne l'a pas encore.
 */
export function riskFactorOf(
  character: Character,
  pickRate?: number,
): RiskBreakdown {
  const presence = PRESENCE_RISK[character.presenceExpectation];
  const rarity = RARITY_RISK[character.rarity];
  const attributes = 1 - attributeProminence(character);

  let somme =
    presence * WEIGHTS.presence +
    rarity * WEIGHTS.rarity +
    attributes * WEIGHTS.attributes;
  let poids = WEIGHTS.presence + WEIGHTS.rarity + WEIGHTS.attributes;

  if (pickRate !== undefined) {
    somme += (1 - pickRate) * WEIGHTS.pickRate;
    poids += WEIGHTS.pickRate;
  }

  return {
    factor: somme / poids,
    presence,
    rarity,
    attributes,
    pickRate: pickRate ?? null,
  };
}


/* ===========================================================================
   L'improbabilité, lue comme un rang
   ---------------------------------------------------------------------------
   `riskFactorOf` renvoie une moyenne pondérée de quatre grandeurs. Sur ce
   référentiel-ci, elles valent presque toutes 1 : 428 personnages sur 737 sont
   en présence basse, 358 sont Communs, et la plupart n'ont qu'un ou deux
   attributs. La moyenne de valeurs hautes est haute — mesuré, la médiane du
   facteur est de **0,84**, et 17 % des personnages sont au maximum.

   Autrement dit, le nombre était juste et inutilisable : il déclarait tout le
   monde risqué, donc ne distinguait personne. Une prime versée à tous n'est
   plus une prime, c'est un socle.

   On garde la formule — ses quatre estimateurs restent le bon jugement — mais
   on la lit comme un **classement**. Le rang d'un personnage parmi tous les
   autres est uniformément réparti par construction : médiane 0,5, autant de
   personnages au-dessus qu'en dessous. Le risque recommence à trier.

   Deuxième vertu, moins visible : le barème s'ajuste tout seul. Si le
   référentiel s'enrichit de deux cents figurants, la médiane reste 0,5 au lieu
   de dériver vers 1.
   =========================================================================== */

let rangs: Map<string, number> | null = null;

function construireRangs(): Map<string, number> {
  const jouables = CHARACTERS.filter((c) => isCanon(c.id));
  const classes = jouables
    .map((c) => ({ id: c.id, f: riskFactorOf(c).factor }))
    .sort((a, b) => a.f - b.f);

  const out = new Map<string, number>();
  const n = classes.length;

  for (let i = 0; i < n; i += 1) {
    // Les ex æquo reçoivent le même rang. Sans cela, deux personnages aux
    // données identiques n'auraient pas la même improbabilité, et l'écart
    // dépendrait de leur ordre dans le fichier — c'est-à-dire de rien.
    let j = i;
    while (j + 1 < n && classes[j + 1].f === classes[i].f) j += 1;
    const rang = n > 1 ? (i + j) / 2 / (n - 1) : 0.5;
    for (let k = i; k <= j; k += 1) out.set(classes[k].id, rang);
    i = j;
  }
  return out;
}

/**
 * Place d'un personnage dans le classement de l'improbabilité, entre 0 et 1.
 *
 * Zéro pour le choix le plus évident du référentiel, un pour le plus obscur.
 *
 * La table est construite une fois, à la première demande : le référentiel est
 * figé à la compilation, et la reconstruire à chaque joueur coûterait sept
 * cents tris au moment de publier, pour un résultat identique.
 *
 * Un personnage hors référentiel — un test, une carte retirée après coup —
 * retombe sur son facteur brut. Mieux vaut une valeur approchée qu'une
 * exception au milieu d'une publication de classement.
 */
export function riskRankOf(character: Character): number {
  rangs ??= construireRangs();
  return rangs.get(character.id) ?? riskFactorOf(character).factor;
}
