import { attributesOf } from '../collection/attributes';
import { RELATION_LABEL } from '../labels';
import type { Character, RelationKind } from '../types';
import type { CharacterScore, ScoringContext, TeamScore } from './v1';
import { riskFactorOf, riskRankOf } from './prominence';
import { sharedAttributeValue } from './shared-attributes';

/**
 * Moteur de scoring v6.0.0 — le risque redevient un risque.
 *
 * ## Ce que l'audit du v5 a montré
 *
 * Trois mesures sur les sept chapitres réellement publiés, tout le
 * référentiel passé en revue :
 *
 *   — **le risque distribuait 87,7 % de tous les points** ; la base 1,2 %, la
 *     synergie 11,0 % ;
 *   — sa valeur moyenne était de 20,1 sur un plafond de 25, avec une médiane
 *     de facteur à 0,84 et un plafond atteint dans 16,8 % des cas ;
 *   — un personnage Commun de présence basse **qui n'apparaissait pas**
 *     rapportait 25,9 points. Trois d'entre eux, 78 points, sans rien deviner.
 *
 * Autrement dit le « bonus de risque » n'était pas un bonus de risque : c'était
 * une prime forfaitaire d'environ vingt points versée à quiconque n'est pas
 * célèbre, gagnée qu'on ait vu juste ou non. Le commentaire du v5 affirmait
 * pourtant l'inverse — « un pari raté rapporte 0, sans quoi le risque serait
 * gratuit et tout le monde jouerait les inconnus ». Le code faisait exactement
 * ce que son commentaire interdisait : `present` n'y changeait que le libellé.
 *
 * ## Les trois corrections
 *
 * **1. Le risque devient un rang, pas une note.** La formule du v5 est une
 * moyenne pondérée de quatre grandeurs qui valent presque toutes 1 sur ce
 * référentiel — 428 personnages sur 737 sont en présence basse, 358 sont
 * Communs. La moyenne de valeurs hautes est haute : tout le monde était
 * « risqué ». On garde la formule mais on la lit comme un **classement** :
 * le facteur retenu est la place du personnage parmi tous les autres. La
 * distribution est alors uniforme par construction — médiane 0,5 — et le
 * risque recommence à distinguer.
 *
 * **2. Un pari raté ne se paie qu'à hauteur de ce qu'il avait vu juste.** Le
 * risque entier pour un présent ; pour un absent, le risque **multiplié par sa
 * synergie relative**. Celui qui a misé sur un inconnu solidement lié à ce qui
 * est arrivé gardait presque raison, et garde presque tout ; celui qui a tiré
 * un nom au hasard n'a rien vu et ne touche rien. C'est la règle demandée —
 * « le risque et les attributs comptent pour tout le monde, **par rapport aux
 * personnages qui apparaissent** » — appliquée à la lettre, y compris la
 * seconde moitié de la phrase, que le v5 ignorait.
 *
 * **3. L'unanimité ne décide de rien.** Le score est multiplié par
 * `1 − 0,45 × taux de sélection`. Ce n'est pas une punition visant un
 * personnage : c'est la constatation qu'un choix que tout le monde a fait
 * n'apprend rien sur celui qui l'a fait. Luffy, choisi par 85 % des joueurs,
 * ne vaut plus que 55 % de sa valeur ; choisi par 20 %, il en vaut 91 %.
 *
 * Ce levier existait déjà au v5 — le taux de sélection y était le quatrième
 * estimateur du risque — mais il était **inopérant sur le seul cas qui
 * comptait**. Mesuré : passer Luffy de taux inconnu à 85 % de sélection
 * changeait sa moyenne de 0,0 point. La raison est mécanique : son risque
 * valait déjà 3,9 sur 25, on ne pouvait pas lui en retirer davantage. Le
 * mécanisme anti-consensus ne pouvait pas atteindre le consensus. Il porte
 * maintenant sur le total.
 *
 *   BASE      0 ou 34   présent dans le chapitre
 *   SYNERGY   0–34      liens avec ceux qui sont apparus
 *   RISK      0–32      improbabilité, payée à hauteur de ce qu'on avait vu
 *   ────────────────────
 *   × (1 − 0,45 × taux de sélection)
 *   MAX       100       pour une trouvaille que personne d'autre n'avait vue
 */

export const SCORING_VERSION = 'v6.0.0';

export const CAPS = { base: 34, synergy: 34, risk: 32, total: 100 } as const;

/**
 * Part du score qu'emporte l'unanimité.
 *
 * 0,45 : à 85 % de sélection — ce qu'atteint Luffy dans une communauté qui
 * connaît l'œuvre — il reste 62 % de la valeur. En dessous de 0,3 l'écart ne
 * se voit pas dans un classement ; au-delà de 0,6 le choix évident devient
 * perdant, ce qui pousserait à jouer contre son propre pronostic. On veut
 * qu'il reste correct, pas qu'il devienne une faute.
 */
const CONSENSUS = 0.45;

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
 * 18 et non 14 : les attributs sont la seule source de synergie qui se
 * déclenche souvent — 36 % des cas, contre 5 % pour les relations nommées et
 * 8 % pour les affiliations. Les plafonner bas revenait à plafonner la
 * synergie tout court.
 */
const SHARED_ATTRIBUTE_CAP = 18;

const clamp = (value: number, max: number) =>
  Math.max(0, Math.min(max, Math.round(value)));


function isPresent(ctx: ScoringContext, characterId: string): boolean {
  const entry = ctx.appearances.find((a) => a.characterId === characterId);
  return entry !== undefined && entry.appearances > 0;
}

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

  const mine = attributesOf(character);
  const autres = othersPresent(ctx, character.id);
  let attributeTotal = 0;

  for (const attribute of mine) {
    const partage = autres.some((other) =>
      attributesOf(other).some((a) => a.id === attribute.id),
    );
    if (!partage) continue;
    const points = sharedAttributeValue(attribute.id);
    if (points === 0) continue;
    attributeTotal += points;
    breakdown.push(`${attribute.label} partagé → +${points}`);
  }

  return clamp(
    total +
      Math.min(AFFILIATION_CAP, affiliationTotal) +
      Math.min(SHARED_ATTRIBUTE_CAP, attributeTotal),
    CAPS.synergy,
  );
}

function riskScore(
  character: Character,
  ctx: ScoringContext,
  breakdown: string[],
  present: boolean,
  synergy: number,
): number {
  const rang = riskRankOf(character);
  const plein = CAPS.risk * rang;

  // Ce qu'on avait vu juste, entre 0 et 1. Pour un présent, tout.
  const justesse = present ? 1 : synergy / CAPS.synergy;
  const score = clamp(plein * justesse, CAPS.risk);

  if (score > 0 || plein > 0) {
    const brut = riskFactorOf(character);
    const detail = [
      `présence ${Math.round(brut.presence * 100)}`,
      `rareté ${Math.round(brut.rarity * 100)}`,
      `attributs ${Math.round(brut.attributes * 100)}`,
    ].join(', ');

    if (present) {
      breakdown.push(
        `Pari réussi — plus improbable que ${Math.round(rang * 100)} % du référentiel ` +
          `(${detail}) → +${score}`,
      );
    } else if (score > 0) {
      breakdown.push(
        `Pari manqué mais bien vu — ${Math.round(rang * 100)} % d'improbabilité, ` +
          `payée à ${Math.round(justesse * 100)} % pour ses liens avec le chapitre → +${score}`,
      );
    } else {
      breakdown.push(
        `Pari manqué et sans lien avec le chapitre → +0 ` +
          `(l'improbabilité seule ne rapporte rien)`,
      );
    }
  }
  return score;
}

export function scoreCharacter(
  character: Character,
  ctx: ScoringContext,
): CharacterScore {
  const breakdown: string[] = [];

  const present = isPresent(ctx, character.id);
  const base = present ? CAPS.base : 0;
  breakdown.push(
    present
      ? `Présent dans le chapitre → +${base}`
      : 'Absent du chapitre → pas de base.',
  );

  const synergy = synergyScore(character, ctx, breakdown);
  const risk = riskScore(character, ctx, breakdown, present, synergy);

  // --- L'escompte d'unanimité ---------------------------------------------
  const taux = ctx.pickRates?.get(character.id);
  const brut = base + synergy + risk;
  let total = brut;

  if (taux !== undefined && taux > 0) {
    const facteur = 1 - CONSENSUS * taux;
    total = brut * facteur;
    breakdown.push(
      `Choisi par ${Math.round(taux * 100)} % des joueurs → ` +
        `× ${facteur.toFixed(2)} (un choix que tout le monde fait ne départage personne)`,
    );
  }

  return {
    characterId: character.id,
    appearances: present ? 1 : 0,
    base,
    synergy,
    risk,
    total: clamp(total, CAPS.total),
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
