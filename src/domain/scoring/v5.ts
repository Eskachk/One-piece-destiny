import { attributesOf } from '../collection/attributes';
import { RELATION_LABEL } from '../labels';
import type { Character, RelationKind } from '../types';
import type { CharacterScore, ScoringContext, TeamScore } from './v1';
import { riskFactorOf } from './prominence';
import { sharedAttributeValue } from './shared-attributes';

/**
 * Moteur de scoring v5.0.0 — risque et attributs comptent pour **tout le monde**.
 *
 * Les versions précédentes réservaient une partie du calcul aux seuls
 * personnages présents dans le chapitre : le v2 et le v3 mettaient les absents
 * à zéro sec, le v4 leur laissait quarante pour cent de leur synergie et
 * toujours aucun bonus de risque.
 *
 * Ici, plus d'exception : pour chaque personnage aligné, présent ou non, on
 * compte **sa synergie entière** avec ceux qui sont apparus et **son bonus de
 * risque entier**. Seule la base de quarante points reste réservée à la
 * présence.
 *
 *   BASE      0 ou 40   présent dans le chapitre
 *   SYNERGY   0–35      relations, affiliations et attributs partagés avec
 *                       ceux qui sont apparus — pour tous
 *   RISK      0–25      improbabilité du choix — pour tous
 *   ───────────────────
 *   MAX       100       par personnage
 *
 * Conséquence à connaître : un absent très lié et improbable peut désormais
 * dépasser un présent isolé et attendu — soixante points contre quarante.
 * C'est le résultat voulu de la règle, pas un effet de bord.
 */

export const SCORING_VERSION = 'v5.0.0';

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
const SHARED_ATTRIBUTE_CAP = 14;

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
    const partage = autres.some((other) =>
      attributesOf(other).some((a) => a.id === attribute.id),
    );
    if (!partage) continue;

    // Le barème vient de la rareté mesurée de l'attribut : « pirate » vaut
    // zéro parce que quatre cents personnages le portent, « Haki des Rois »
    // vaut cinq parce que dix-sept le portent.
    const points = sharedAttributeValue(attribute.id);
    if (points === 0) continue;

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
  present: boolean,
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
    // « Pari réussi » serait faux sur un absent : le pari n'a pas abouti, même
    // si le choix comptait. Le libellé le dit.
    breakdown.push(
      `${present ? 'Pari réussi' : 'Pari tenté'} (part de risque — ${parts.join(', ')}) → +${score}`,
    );
  }
  return score;
}

export function scoreCharacter(
  character: Character,
  ctx: ScoringContext,
): CharacterScore {
  const breakdown: string[] = [];

  /*
   * Aucune branche séparée pour les absents.
   *
   * La synergie se mesure déjà « par rapport à ceux qui apparaissent » — elle
   * ne compte que les liens dont l'autre extrémité est présente — et le risque
   * ne dépend que du personnage choisi. Les deux se calculent donc de la même
   * façon pour tout le monde, et seule la base distingue un présent d'un
   * absent.
   */
  const present = isPresent(ctx, character.id);
  const base = present ? CAPS.base : 0;
  breakdown.push(
    present
      ? `Présent dans le chapitre → +${base}`
      : 'Absent du chapitre → pas de base, mais ses liens et son pari comptent.',
  );

  const synergy = synergyScore(character, ctx, breakdown);
  const risk = riskScore(character, ctx, breakdown, present);

  return {
    characterId: character.id,
    appearances: present ? 1 : 0,
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
