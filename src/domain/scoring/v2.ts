/**
 * Moteur de scoring v2.0.0 — **présence seule** (cahier §8, §9, §10, §78).
 *
 * Différence unique mais structurante avec le v1 : le nombre d'apparitions ne
 * compte plus. Un personnage est présent ou absent, point.
 *
 * Ce que ça change, et pourquoi c'est mieux :
 *
 *   — **le comptage disparaît.** Compter les cases d'un personnage est une
 *     tâche longue, subjective au bord (une silhouette au fond compte-t-elle ?)
 *     et impossible à contester sereinement. « Apparaît / n'apparaît pas » se
 *     vérifie en une seconde et deux personnes tombent d'accord ;
 *   — **le jeu se déplace vers la stratégie.** En v1, aligner Luffy rapportait
 *     presque toujours le maximum, parce qu'il est partout et souvent. En v2
 *     tous les présents valent la même base : la différence se fait sur les
 *     **liens** qu'on active et sur l'**improbabilité** du pari. Choisir trois
 *     personnages qui apparaîtront ensemble devient le vrai exercice.
 *
 * Le découpage des points suit ce déplacement :
 *
 *   BASE      0 ou 40   présent dans le chapitre
 *   SYNERGY   0–35      relations narratives réellement activées
 *   RISK      0–25      pari improbable qui a payé
 *   ───────────────────
 *   MAX       100       par personnage
 *
 * La base pèse moins qu'en v1 (40 au lieu de 50) et la synergie plus (35 au
 * lieu de 30) : puisque la base ne distingue plus personne, il faut que le
 * reste puisse le faire.
 *
 * Comme le v1, ce moteur n'utilise jamais la rareté (§25) ni le niveau (§34).
 */

import { EXPECTATION_LABEL, RELATION_LABEL } from '../labels';
import type { Character, PresenceExpectation, RelationKind } from '../types';
import type { CharacterScore, ScoringContext, TeamScore } from './v1';

export const SCORING_VERSION = 'v2.0.0';

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

const PRESENCE_RISK: Record<PresenceExpectation, number> = {
  LOW: 1,
  MEDIUM: 0.5,
  HIGH: 0.15,
};

const clamp = (value: number, max: number) =>
  Math.max(0, Math.min(max, Math.round(value)));

/**
 * Un personnage figure-t-il au chapitre ?
 *
 * On lit `appearances > 0` plutôt qu'un booléen dédié : le stockage reste
 * celui du v1, et un chapitre saisi à l'ancienne — avec des comptes — se
 * rejoue donc sans conversion. Migrer le schéma pour changer une règle de
 * calcul aurait rendu les anciens chapitres illisibles.
 */
function isPresent(ctx: ScoringContext, characterId: string): boolean {
  const entry = ctx.appearances.find((a) => a.characterId === characterId);
  return entry !== undefined && entry.appearances > 0;
}

/**
 * Synergie : uniquement les liens dont les deux extrémités sont présentes.
 * Une alliance dont le partenaire n'apparaît pas ne rapporte rien — c'est ce
 * qui donne au bonus son sens narratif.
 */
function synergyScore(
  character: Character,
  ctx: ScoringContext,
  breakdown: string[],
): number {
  let total = 0;

  for (const relation of character.relations) {
    if (!isPresent(ctx, relation.to)) continue;

    const weight = RELATION_WEIGHTS[relation.kind];
    total += weight;
    const otherName = ctx.roster.get(relation.to)?.name ?? relation.to;
    breakdown.push(`${RELATION_LABEL[relation.kind]} avec ${otherName} → +${weight}`);
  }

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

  return clamp(total + Math.min(AFFILIATION_CAP, affiliationTotal), CAPS.synergy);
}

/**
 * Bonus de risque (cahier §10).
 *
 * En v1 il était proportionnel au **rendement** du personnage : peu
 * d'apparitions, peu de bonus. Sans compte d'apparitions, cette pondération
 * n'a plus de sens — le bonus dépend maintenant de la seule improbabilité du
 * choix, et n'est versé que si le pari a abouti.
 *
 * Un pari raté rapporte 0. Sinon le risque serait gratuit, et tout le monde
 * jouerait les inconnus.
 */
function riskScore(
  character: Character,
  ctx: ScoringContext,
  breakdown: string[],
): number {
  let riskFactor = PRESENCE_RISK[character.presenceExpectation];

  // Un personnage délaissé par la communauté est un pari plus fort.
  const pickRate = ctx.pickRates?.get(character.id);
  if (pickRate !== undefined) {
    riskFactor = (riskFactor + (1 - pickRate)) / 2;
  }

  const score = clamp(CAPS.risk * riskFactor, CAPS.risk);

  if (score > 0) {
    breakdown.push(
      `Pari ${EXPECTATION_LABEL[character.presenceExpectation]} réussi → +${score}`,
    );
  }
  return score;
}

export function scoreCharacter(
  character: Character,
  ctx: ScoringContext,
): CharacterScore {
  const breakdown: string[] = [];

  // Un personnage absent ne rapporte rien, quelles que soient les relations
  // autour de lui. La synergie est un bonus sur une présence, pas une
  // récompense autonome : sans cette garde, parier sur un absent bien
  // connecté rapporterait des points.
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
    // Conservé à 1 pour la compatibilité de l'affichage : le v2 ne compte
    // plus, mais le replay de performance lit ce champ.
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
    // La version voyage avec le score : c'est elle qui garantit qu'un chapitre
    // calculé en v1 se rejouera en v1, même des mois plus tard (§78).
    scoringVersion: SCORING_VERSION,
    characters,
    total: characters.reduce((sum, score) => sum + score.total, 0),
  };
}
