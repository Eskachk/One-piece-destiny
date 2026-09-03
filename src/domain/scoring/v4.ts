import { attributesOf } from '../collection/attributes';
import { RELATION_LABEL } from '../labels';
import type { Character, RelationKind } from '../types';
import type { CharacterScore, ScoringContext, TeamScore } from './v1';
import { riskFactorOf } from './prominence';
import { sharedAttributeValue } from './shared-attributes';

/**
 * Moteur de scoring v4.0.0 — un absent bien lié n'est plus tout à fait nul.
 *
 * Le v1, le v2 et le v3 restent enregistrés et rejouables : un chapitre publié
 * porte sa version en base et continue d'être jugé selon les règles affichées
 * quand les joueurs ont composé (§78).
 *
 * ## Ce qui change
 *
 * Jusqu'ici, un personnage absent du chapitre valait zéro, sans appel. La
 * règle avait sa logique — on pronostique qui apparaît — mais elle produisait
 * un résultat que personne ne trouve juste : aligner Usopp la semaine où
 * Luffy, Zoro et tout l'équipage paraissent rapportait exactement autant
 * qu'aligner un figurant sans le moindre rapport avec le chapitre. Deux
 * pronostics d'une qualité très différente, notés pareil.
 *
 * Un absent touche donc désormais un **écho** : la fraction `ECHO` de la
 * synergie qu'il aurait eue s'il avait paru. Ni base, ni bonus de risque —
 * le pari n'a pas abouti, et il ne faut pas prétendre le contraire.
 *
 * ## Pourquoi cela ne casse pas le jeu
 *
 * La crainte était qu'on se mette à jouer des seconds couteaux bien
 * entourés plutôt que des personnages qu'on croit voir paraître. L'arithmétique
 * l'interdit : l'écho plafonne à `35 × 0,4 ≈ 14` points, quand la seule
 * présence en vaut déjà 40. **Un absent, si bien lié soit-il, ne rattrapera
 * jamais un présent, même isolé.** L'écho départage deux pronostics ratés ; il
 * ne concurrence pas un pronostic réussi.
 *
 * ## Les attributs partagés, pesés et non plus triés
 *
 * Le v3 décidait par une liste écrite à la main : Haki, équipage et fruit
 * comptaient, le reste était écarté. Le raisonnement — « la moitié du
 * référentiel est pirate » — était juste pour « pirate » et faux pour tout ce
 * qu'il emportait : il écartait aussi « Pays des Wa », que cinq pour cent des
 * personnages partagent. Kinémon et Denjirô sont tous deux samouraïs de Wano
 * et tous deux sabreurs, et le moteur ne voyait ni l'un ni l'autre.
 *
 * Le barème vient maintenant de la **rareté mesurée** de chaque attribut
 * (`shared-attributes.ts`) : « pirate » tombe à zéro tout seul, « Haki des
 * Rois » vaut cinq. Aucune famille n'est exclue par principe.
 *
 * Le découpage des points :
 *
 *   BASE      0 ou 40   présent dans le chapitre
 *   SYNERGY   0–35      relations, affiliations, attributs partagés
 *   RISK      0–25      pari improbable qui a payé
 *   ÉCHO      0–14      pour un absent : 40 % de sa synergie, rien d'autre
 *   ───────────────────
 *   MAX       100       par personnage
 */

export const SCORING_VERSION = 'v4.0.0';

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

/**
 * Part de la synergie qu'un absent conserve.
 *
 * Quarante pour cent : assez pour que « Usopp la semaine de l'équipage » se
 * distingue nettement d'un pronostic sans rapport, trop peu pour approcher les
 * quarante points que vaut la seule présence.
 */
const ECHO = 0.4;

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
   * L'absent ne touche que l'écho de ses liens.
   *
   * Ni base, ni bonus de risque : il n'a pas paru, et le pari n'a pas abouti.
   * Mais il n'est plus à zéro pour autant, parce que zéro mettait sur le même
   * plan deux pronostics de qualité très différente — celui qui aligne Usopp
   * la semaine où tout l'équipage paraît, et celui qui aligne un figurant sans
   * rapport avec le chapitre.
   *
   * L'écho plafonne à quatorze points quand la seule présence en vaut quarante :
   * un absent, si bien lié soit-il, ne rattrape jamais un présent. Il départage
   * deux pronostics ratés, il ne concurrence pas un pronostic réussi.
   */
  if (!isPresent(ctx, character.id)) {
    const liens: string[] = [];
    const synergiePleine = synergyScore(character, ctx, liens);
    const echo = clamp(synergiePleine * ECHO, Math.round(CAPS.synergy * ECHO));

    if (echo === 0) {
      return {
        characterId: character.id,
        appearances: 0,
        base: 0,
        synergy: 0,
        risk: 0,
        total: 0,
        breakdown: ['Absent du chapitre, et sans lien avec ceux qui y sont → aucun point.'],
      };
    }

    return {
      characterId: character.id,
      appearances: 0,
      base: 0,
      synergy: echo,
      risk: 0,
      total: echo,
      breakdown: [
        'Absent du chapitre → ni base, ni bonus de risque.',
        ...liens,
        `Écho de ses liens (${Math.round(ECHO * 100)} % de ${synergiePleine}) → +${echo}`,
      ],
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
