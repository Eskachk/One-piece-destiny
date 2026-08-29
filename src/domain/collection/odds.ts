import type { Character, Rarity } from '../types';
import { CHEST_SLOTS } from './chest';
import { isAtLeast, RARITY_ORDER, RARITY_WEIGHTS } from './rarity';

/**
 * Probabilités annoncées d'un coffre (cahier §113).
 *
 * Le cahier impose d'annoncer la composition **avant** l'achat. Une valeur
 * saisie à la main dériverait du code au premier ajustement, et le joueur
 * lirait alors des chiffres faux — c'est exactement la pratique que
 * l'affichage des probabilités est censé empêcher.
 *
 * Ce module recalcule donc les probabilités à partir des **mêmes constantes
 * que le tirage** : `CHEST_SLOTS`, `RARITY_WEIGHTS` et le référentiel réel.
 * Elles ne peuvent pas mentir sans que le tirage change aussi.
 *
 * La garantie de pitié (§31) n'est volontairement pas fondue dans ces
 * chiffres : elle ne fait qu'améliorer le résultat, et l'annoncer séparément
 * est plus honnête que de la diluer dans une moyenne.
 */

export interface RarityOdds {
  rarity: Rarity;
  /** Probabilité qu'au moins une carte du coffre ait cette rareté, en %. */
  atLeastOnePercent: number;
  /** Nombre moyen de cartes de cette rareté par coffre. */
  expectedPerChest: number;
}

/** Probabilité de tirer chaque rareté sur un emplacement de minimum donné. */
function slotDistribution(
  roster: Character[],
  minimum: Rarity,
): Map<Rarity, number> {
  const eligible = roster.filter((character) =>
    isAtLeast(character.rarity, minimum),
  );

  // Référentiel trop pauvre pour honorer le minimum : le tirage redescend sur
  // tout le référentiel. On reproduit ce repli, sinon les chiffres annoncés
  // ne décriraient pas le tirage réel.
  const candidates = eligible.length > 0 ? eligible : roster;

  const total = candidates.reduce(
    (sum, character) => sum + RARITY_WEIGHTS[character.rarity],
    0,
  );

  const distribution = new Map<Rarity, number>();
  if (total === 0) return distribution;

  for (const character of candidates) {
    const weight = RARITY_WEIGHTS[character.rarity] / total;
    distribution.set(
      character.rarity,
      (distribution.get(character.rarity) ?? 0) + weight,
    );
  }

  return distribution;
}

/**
 * Probabilités du coffre standard.
 *
 * Les emplacements sont indépendants, ce qui permet de composer directement :
 * « au moins une » est le complément de « aucune sur les cinq ».
 *
 * Mémoïsation : le référentiel est figé au démarrage, et le calcul parcourt
 * des centaines de personnages pour chacun des cinq emplacements. Le refaire à
 * chaque affichage de la Collection est du travail pur perdu.
 *
 * La clé est le tableau lui-même : un référentiel différent — les tests en
 * fabriquent — recalcule normalement.
 */
const oddsCache = new WeakMap<Character[], RarityOdds[]>();

export function chestOdds(roster: Character[]): RarityOdds[] {
  const cached = oddsCache.get(roster);
  if (cached) return cached;

  const computed = computeChestOdds(roster);
  oddsCache.set(roster, computed);
  return computed;
}

function computeChestOdds(roster: Character[]): RarityOdds[] {
  const distributions = CHEST_SLOTS.map((minimum) =>
    slotDistribution(roster, minimum),
  );

  return RARITY_ORDER.map((rarity) => {
    let noneProbability = 1;
    let expected = 0;

    for (const distribution of distributions) {
      const p = distribution.get(rarity) ?? 0;
      noneProbability *= 1 - p;
      expected += p;
    }

    return {
      rarity,
      atLeastOnePercent: round((1 - noneProbability) * 100),
      expectedPerChest: round(expected),
    };
  });
}

function round(value: number): number {
  return Number(value.toFixed(2));
}
