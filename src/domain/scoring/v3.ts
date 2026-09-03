import { attributesOf } from '../collection/attributes';
import { RELATION_LABEL } from '../labels';
import type { Character, RelationKind } from '../types';
import type { CharacterScore, ScoringContext, TeamScore } from './v1';
import { riskFactorOf } from './prominence';

/**
 * Moteur de scoring v3.0.0 — le risque devient une vraie mesure.
 *
 * Le v2 reste inchangé et enregistré : les chapitres déjà publiés se
 * recalculent avec lui, comme l'exige le §78. Seuls les chapitres ouverts à
 * partir de maintenant utilisent le v3.
 *
 * ## Ce qui change, et pourquoi
 *
 * En v2, le bonus de risque ne lisait que deux choses : l'attendu de présence
 * — trois valeurs possibles — et le taux de sélection de la semaine. Deux
 * personnages notés « présence moyenne » rapportaient donc exactement le même
 * bonus, qu'il s'agisse d'un Mythique connu de tous ou d'un Commun que
 * personne ne sait situer. Le pari le plus audacieux et le plus timide
 * valaient pareil.
 *
 * Le v3 confie ce calcul à `prominence.ts`, qui croise **quatre** estimateurs :
 * l'attendu de présence, la rareté de la carte, la stature que décrivent ses
 * attributs, et le taux de sélection. C'est aussi la formule qu'affiche
 * désormais la jauge au moment de composer : les deux ne peuvent plus
 * diverger, et le joueur voit avant le chapitre ce qui sera compté après.
 *
 * ## La rareté, et le §25
 *
 * Le cahier interdit que la rareté rapporte des points — sinon acheter des
 * coffres achèterait du classement, ce que le §48 refuse. La règle tient, et
 * se trouve même renforcée : la rareté **abaisse** le bonus de risque. Une
 * Mythique est un choix sûr, donc peu payant ; une Commune est un pari, donc
 * généreuse si elle sort. Aligner trois Mythiques reste le jeu le plus
 * prudent, jamais le plus rentable.
 *
 * ## La synergie d'attributs
 *
 * Nouveauté du v3 : deux personnages **présents ensemble** qui partagent un
 * Haki, un type de fruit ou un équipage se renforcent. Le v2 ne connaissait
 * que les relations nommées et les affiliations textuelles ; les attributs
 * disent la même parenté d'une autre manière, et souvent là où le référentiel
 * n'a pas de lien explicite à offrir.
 *
 * Le découpage des points ne bouge pas :
 *
 *   BASE      0 ou 40   présent dans le chapitre
 *   SYNERGY   0–35      relations, affiliations, attributs partagés
 *   RISK      0–25      pari improbable qui a payé
 *   ───────────────────
 *   MAX       100       par personnage
 */

export const SCORING_VERSION = 'v3.0.0';

export const CAPS = { base: 40, synergy: 35, risk: 25, total: 100 } as const;

const RELATION_WEIGHTS: Record<RelationKind, number> = {
  ALLIANCE: 11,
  CREW: 9,
  RIVALRY: 8,
  MENTOR: 7,
  FAMILY: 7,
  FACTION: 5,
};

const AFFILIATION_POINTS = 4;
const AFFILIATION_CAP = 12;

/**
 * Familles d'attributs qui font synergie, et ce qu'elles valent.
 *
 * Ni le camp, ni le métier, ni l'espèce : la moitié du référentiel est
 * « pirate », et faire de cela un lien reviendrait à distribuer le bonus à
 * tout le monde. On ne garde que ce qui rapproche vraiment deux personnages.
 */
const SHARED_ATTRIBUTE_POINTS: Record<string, number> = {
  conqueror: 5,
  armament: 3,
  observation: 3,
};
const SHARED_CREW_POINTS = 4;
const SHARED_FRUIT_POINTS = 3;
const SHARED_ATTRIBUTE_CAP = 12;

const FRUIT_IDS = new Set([
  'logia',
  'zoan',
  'mythic-zoan',
  'ancient-zoan',
  'paramecia',
  'smile',
  'fruit',
]);

const clamp = (value: number, max: number) =>
  Math.max(0, Math.min(max, Math.round(value)));

/**
 * Un personnage figure-t-il au chapitre ?
 *
 * On lit `appearances > 0` plutôt qu'un booléen dédié : le stockage reste
 * celui du v1, et un chapitre saisi à l'ancienne se rejoue sans conversion.
 */
function isPresent(ctx: ScoringContext, characterId: string): boolean {
  const entry = ctx.appearances.find((a) => a.characterId === characterId);
  return entry !== undefined && entry.appearances > 0;
}

/** Les autres personnages présents au chapitre. */
function othersPresent(ctx: ScoringContext, characterId: string): Character[] {
  const out: Character[] = [];
  for (const appearance of ctx.appearances) {
    if (appearance.characterId === characterId || appearance.appearances === 0) continue;
    const other = ctx.roster.get(appearance.characterId);
    if (other) out.push(other);
  }
  return out;
}

function synergyScore(
  character: Character,
  ctx: ScoringContext,
  breakdown: string[],
): number {
  let total = 0;

  // --- Relations nommées ---------------------------------------------------
  for (const relation of character.relations) {
    if (!isPresent(ctx, relation.to)) continue;
    const weight = RELATION_WEIGHTS[relation.kind];
    total += weight;
    const otherName = ctx.roster.get(relation.to)?.name ?? relation.to;
    breakdown.push(`${RELATION_LABEL[relation.kind]} avec ${otherName} → +${weight}`);
  }

  // --- Affiliations textuelles --------------------------------------------
  let affiliationTotal = 0;
  for (const affiliation of character.affiliations) {
    const presentAllies = ctx.appearances.filter((a) => {
      if (a.characterId === character.id || a.appearances === 0) return false;
      return ctx.roster.get(a.characterId)?.affiliations.includes(affiliation);
    }).length;

    if (presentAllies > 0) {
      const points = Math.min(AFFILIATION_CAP, presentAllies * AFFILIATION_POINTS);
      affiliationTotal += points;
      breakdown.push(`Affiliation ${affiliation} (${presentAllies} présents) → +${points}`);
    }
  }

  // --- Attributs partagés --------------------------------------------------
  //
  // Comptés **une fois par attribut**, pas une fois par personnage : trois
  // Haki de l'armement présents ne valent pas trois fois le bonus, sinon un
  // chapitre chargé en ferait exploser le total.
  const mine = attributesOf(character);
  const autres = othersPresent(ctx, character.id);
  let attributeTotal = 0;

  for (const attribute of mine) {
    const points = attribute.id.startsWith('crew-')
      ? SHARED_CREW_POINTS
      : FRUIT_IDS.has(attribute.id)
        ? SHARED_FRUIT_POINTS
        : SHARED_ATTRIBUTE_POINTS[attribute.id];
    if (points === undefined) continue;

    const partage = autres.some((other) =>
      attributesOf(other).some((a) => a.id === attribute.id),
    );
    if (!partage) continue;

    attributeTotal += points;
    breakdown.push(`${attribute.label} partagé → +${points}`);
  }

  return clamp(
    total + Math.min(AFFILIATION_CAP, affiliationTotal) + Math.min(SHARED_ATTRIBUTE_CAP, attributeTotal),
    CAPS.synergy,
  );
}

/**
 * Bonus de risque.
 *
 * Le facteur vient de `prominence.ts`, partagé avec la jauge affichée au
 * moment de composer. Un pari raté rapporte 0 : sans quoi le risque serait
 * gratuit, et tout le monde jouerait les inconnus.
 */
function riskScore(
  character: Character,
  ctx: ScoringContext,
  breakdown: string[],
): number {
  const detail = riskFactorOf(character, ctx.pickRates?.get(character.id));
  const score = clamp(CAPS.risk * detail.factor, CAPS.risk);

  if (score > 0) {
    /*
     * Le détail est dit au joueur : « pari moyen réussi » ne lui apprenait
     * rien sur ce qui l'a rendu moyen, et c'est précisément ce qu'il veut
     * comprendre pour composer la semaine suivante.
     *
     * Les quatre nombres sont tous des **parts de risque** : zéro pour une
     * évidence, cent pour un coup de dés. Le dire explicitement n'est pas du
     * zèle — une première version affichait « stature 81 » pour Nami, ce qui
     * se lit « grande stature » alors que le nombre signifie exactement
     * l'inverse : peu d'attributs, donc pari plus fort. Un chiffre juste
     * accompagné d'un mot qui le retourne vaut moins que pas de chiffre.
     */
    const parts = [
      `présence ${Math.round(detail.presence * 100)}`,
      `rareté ${Math.round(detail.rarity * 100)}`,
      `attributs ${Math.round(detail.attributes * 100)}`,
    ];
    if (detail.pickRate !== null) {
      parts.push(`peu choisi ${Math.round((1 - detail.pickRate) * 100)}`);
    }
    breakdown.push(`Pari réussi (part de risque — ${parts.join(', ')}) → +${score}`);
  }
  return score;
}

export function scoreCharacter(
  character: Character,
  ctx: ScoringContext,
): CharacterScore {
  const breakdown: string[] = [];

  /*
   * Un personnage absent ne rapporte rien, quelles que soient les relations
   * autour de lui.
   *
   * C'est la règle du jeu, pas un oubli, et elle mérite d'être dite ici parce
   * qu'elle surprend : on pronostique **qui apparaît**. Un personnage qu'on a
   * aligné et qui ne paraît pas dans le chapitre vaut zéro, même si son
   * capitaine, son équipage entier et tous ses alliés y sont. La synergie est
   * un bonus posé sur une présence, jamais une récompense autonome — sans
   * cette garde, parier sur un absent bien entouré rapporterait des points, et
   * la meilleure stratégie deviendrait de choisir des seconds couteaux liés à
   * des vedettes.
   */
  if (!isPresent(ctx, character.id)) {
    return {
      characterId: character.id,
      appearances: 0,
      base: 0,
      synergy: 0,
      risk: 0,
      total: 0,
      breakdown: ['Absent du chapitre → aucun point.'],
    };
  }

  const base = CAPS.base;
  breakdown.push(`Présent dans le chapitre → +${base}`);

  const synergy = synergyScore(character, ctx, breakdown);
  const risk = riskScore(character, ctx, breakdown);

  return {
    characterId: character.id,
    appearances: 1,
    base,
    synergy,
    risk,
    total: clamp(base + synergy + risk, CAPS.total),
    breakdown,
  };
}

export function scoreTeam(ctx: ScoringContext): TeamScore {
  const characters = ctx.picked.map((character) => scoreCharacter(character, ctx));

  return {
    scoringVersion: SCORING_VERSION,
    characters,
    total: characters.reduce((sum, score) => sum + score.total, 0),
  };
}
