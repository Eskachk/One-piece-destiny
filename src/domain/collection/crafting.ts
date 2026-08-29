import type { Rarity } from '../types';
import { DUPLICATE_SHARDS } from './rarity';

/**
 * Fabrication par fragments (cahier §29).
 *
 * C'est ce qui rend un doublon réellement utile : accumuler des fragments doit
 * mener quelque part. Sans dépense possible, le §28 ne serait qu'une
 * consolation cosmétique.
 *
 * Le coût est calibré comme un multiple du rendement d'un doublon : il faut
 * l'équivalent de `DUPLICATES_PER_CRAFT` exemplaires pour fabriquer la carte.
 * Ainsi la progression reste lisible — « il me manque trois doublons » — et
 * l'équilibrage tient en une constante.
 */

export const DUPLICATES_PER_CRAFT = 6;

export const CRAFT_COST: Record<Rarity, number> = {
  COMMON: DUPLICATE_SHARDS.COMMON * DUPLICATES_PER_CRAFT,
  RARE: DUPLICATE_SHARDS.RARE * DUPLICATES_PER_CRAFT,
  EPIC: DUPLICATE_SHARDS.EPIC * DUPLICATES_PER_CRAFT,
  LEGENDARY: DUPLICATE_SHARDS.LEGENDARY * DUPLICATES_PER_CRAFT,
  MYTHIC: DUPLICATE_SHARDS.MYTHIC * DUPLICATES_PER_CRAFT,
};

export type CraftRefusal =
  | 'ALREADY_OWNED'
  | 'NOT_ENOUGH_SHARDS'
  | 'UNKNOWN_CHARACTER';

export type CraftDecision =
  | { allowed: true; cost: number; remainingShards: number }
  | { allowed: false; reason: CraftRefusal; cost: number; missing: number };

export interface CraftInput {
  rarity: Rarity | null;
  owned: boolean;
  shards: number;
}

/**
 * Décide si une fabrication est possible.
 *
 * Fonction pure : la décision est reproductible et testable, l'écriture
 * atomique reste au dépôt.
 */
export function evaluateCraft(input: CraftInput): CraftDecision {
  if (input.rarity === null) {
    return {
      allowed: false,
      reason: 'UNKNOWN_CHARACTER',
      cost: 0,
      missing: 0,
    };
  }

  const cost = CRAFT_COST[input.rarity];

  // Fabriquer un personnage déjà possédé ne produirait rien : on refuse
  // plutôt que de laisser dépenser des fragments pour rien.
  if (input.owned) {
    return { allowed: false, reason: 'ALREADY_OWNED', cost, missing: 0 };
  }

  if (input.shards < cost) {
    return {
      allowed: false,
      reason: 'NOT_ENOUGH_SHARDS',
      cost,
      missing: cost - input.shards,
    };
  }

  return { allowed: true, cost, remainingShards: input.shards - cost };
}

export function describeCraftRefusal(reason: CraftRefusal): string {
  switch (reason) {
    case 'ALREADY_OWNED':
      return 'Tu possèdes déjà ce personnage.';
    case 'NOT_ENOUGH_SHARDS':
      return 'Fragments insuffisants.';
    case 'UNKNOWN_CHARACTER':
      return 'Personnage inconnu.';
  }
}
