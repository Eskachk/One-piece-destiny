/**
 * Moteur de scoring v1.0.0 (cahier §8, §9, §10).
 *
 * Le score est découpé en trois catégories bornées pour éviter les scores
 * explosifs et rendre l'équilibrage lisible :
 *
 *   BASE SCORE     0–50   présence brute du personnage
 *   SYNERGY SCORE  0–30   relations narratives réellement activées
 *   RISK BONUS     0–20   récompense d'un pari improbable qui a payé
 *   ────────────────────
 *   MAX            100    par personnage
 *
 * Le moteur n'utilise jamais la rareté (cahier §25 : rareté = valeur de
 * collection, pas puissance) ni le niveau du personnage (§34).
 */

import { EXPECTATION_LABEL, RELATION_LABEL } from '../labels';
import type {
  Character,
  ChapterAppearance,
  PresenceExpectation,
  RelationKind,
} from '../types';

export const SCORING_VERSION = 'v1.0.0';

export const CAPS = { base: 50, synergy: 30, risk: 20, total: 100 } as const;

/** Points par apparition (cahier §9.1 : 12 apparitions × 2 = 24 points). */
const POINTS_PER_APPEARANCE = 2;

/**
 * Poids des liens narratifs. Volontairement resserré : un bonus ne se
 * déclenche que sur une relation identifiée entre deux personnages, jamais
 * sur un simple tag partagé (cahier §9.3).
 */
const RELATION_WEIGHTS: Record<RelationKind, number> = {
  ALLIANCE: 10,
  CREW: 8,
  RIVALRY: 7,
  MENTOR: 6,
  FAMILY: 6,
  FACTION: 5,
};

/** Bonus d'affiliation, plafonné pour ne pas dominer la synergie. */
const AFFILIATION_POINTS = 3;
const AFFILIATION_CAP = 9;

/**
 * Facteur de risque déduit de l'attendu d'apparition. Plus le personnage
 * était improbable, plus le pari vaut cher s'il aboutit.
 */
const PRESENCE_RISK: Record<PresenceExpectation, number> = {
  LOW: 1,
  MEDIUM: 0.5,
  HIGH: 0.15,
};

export interface ScoringContext {
  /** Apparitions validées pour ce chapitre, tous personnages confondus. */
  appearances: ChapterAppearance[];
  /** Les 3 personnages sélectionnés par le joueur. */
  picked: Character[];
  /** Référentiel des personnages, pour résoudre les affiliations présentes. */
  roster: Map<string, Character>;
  /**
   * Taux de sélection observé (0–1) par personnage, si connu.
   * Un personnage peu choisi est plus risqué (cahier §13).
   */
  pickRates?: Map<string, number>;
}

export interface CharacterScore {
  characterId: string;
  appearances: number;
  base: number;
  synergy: number;
  risk: number;
  total: number;
  /** Détail lisible, réutilisé par le replay de performance (cahier §65). */
  breakdown: string[];
}

const clamp = (value: number, max: number) =>
  Math.max(0, Math.min(max, Math.round(value)));

function appearancesOf(ctx: ScoringContext, characterId: string): number {
  return ctx.appearances.find((a) => a.characterId === characterId)?.appearances ?? 0;
}

/** Score de présence pure. */
function baseScore(appearances: number): number {
  return clamp(appearances * POINTS_PER_APPEARANCE, CAPS.base);
}

/**
 * Synergie : uniquement les liens dont les deux extrémités sont présentes
 * dans le chapitre. Une alliance dont le partenaire n'apparaît pas ne
 * rapporte rien — c'est ce qui donne du sens narratif au bonus.
 */
function synergyScore(
  character: Character,
  ctx: ScoringContext,
  breakdown: string[],
): number {
  let total = 0;

  for (const relation of character.relations) {
    const otherAppearances = appearancesOf(ctx, relation.to);
    if (otherAppearances === 0) continue;

    const weight = RELATION_WEIGHTS[relation.kind];
    total += weight;
    const otherName = ctx.roster.get(relation.to)?.name ?? relation.to;
    breakdown.push(`${RELATION_LABEL[relation.kind]} avec ${otherName} → +${weight}`);
  }

  // Affiliation : le personnage évolue dans un groupe fortement présent.
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
 * Bonus de risque (cahier §10). Deux principes :
 *
 *  1. le bonus est proportionnel à l'improbabilité du choix ;
 *  2. il n'est versé que si le personnage a réellement performé.
 *
 * Un pari raté rapporte 0 — sinon le risque serait gratuit.
 */
function riskScore(
  character: Character,
  ctx: ScoringContext,
  base: number,
  breakdown: string[],
): number {
  if (base === 0) return 0;

  let riskFactor = PRESENCE_RISK[character.presenceExpectation];

  // Un personnage délaissé par la communauté est un pari plus fort.
  const pickRate = ctx.pickRates?.get(character.id);
  if (pickRate !== undefined) {
    riskFactor = (riskFactor + (1 - pickRate)) / 2;
  }

  const payoff = base / CAPS.base;
  const score = clamp(CAPS.risk * riskFactor * payoff, CAPS.risk);

  if (score > 0) {
    breakdown.push(`Pari ${EXPECTATION_LABEL[character.presenceExpectation]} réussi → +${score}`);
  }
  return score;
}

/** Score complet d'un personnage sélectionné. */
export function scoreCharacter(
  character: Character,
  ctx: ScoringContext,
): CharacterScore {
  const breakdown: string[] = [];
  const appearances = appearancesOf(ctx, character.id);

  // Un personnage absent du chapitre ne rapporte rien, quelles que soient les
  // relations activées autour de lui. La synergie est un bonus sur une
  // présence, pas une récompense autonome : sans cette garde, parier sur un
  // personnage absent mais bien connecté rapporterait des points.
  if (appearances === 0) {
    return {
      characterId: character.id,
      appearances: 0,
      base: 0,
      synergy: 0,
      risk: 0,
      total: 0,
      breakdown: ["Absent du chapitre → aucun point."],
    };
  }

  const base = baseScore(appearances);
  breakdown.push(`${appearances} apparition(s) × ${POINTS_PER_APPEARANCE} → +${base}`);

  const synergy = synergyScore(character, ctx, breakdown);
  const risk = riskScore(character, ctx, base, breakdown);

  return {
    characterId: character.id,
    appearances,
    base,
    synergy,
    risk,
    total: clamp(base + synergy + risk, CAPS.total),
    breakdown,
  };
}

export interface TeamScore {
  scoringVersion: string;
  characters: CharacterScore[];
  total: number;
}

/** Score d'une équipe de 3 personnages. */
export function scoreTeam(ctx: ScoringContext): TeamScore {
  const characters = ctx.picked.map((character) => scoreCharacter(character, ctx));
  return {
    scoringVersion: SCORING_VERSION,
    characters,
    total: characters.reduce((sum, c) => sum + c.total, 0),
  };
}
