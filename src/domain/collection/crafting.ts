import type { Rarity } from '../types';
import { DUPLICATE_SHARDS } from './rarity';

/**
 * Fabrication par fragments (cahier §28, §29).
 *
 * C'est ce qui rend un doublon réellement utile : accumuler des fragments doit
 * mener quelque part. Sans dépense possible, le §28 ne serait qu'une
 * consolation cosmétique.
 *
 * ## Ce que la fabrication ne pouvait pas faire
 *
 * Les fragments étaient rangés **par personnage**, et n'étaient crédités que
 * sur un doublon — donc uniquement pour un personnage déjà possédé. Or
 * `evaluateCraft` refuse toute fabrication d'un personnage possédé. Les deux
 * conditions s'excluent : la fonction n'a jamais pu renvoyer `allowed: true`
 * en production, et la barre de progression affichée sous chaque personnage
 * « Recherché » valait zéro pour tout le monde, définitivement.
 *
 * Depuis la migration 0028, la réserve est **unique** : tout doublon la
 * remplit, quelle que soit sa rareté, et l'on dépense où l'on veut. C'est ce
 * que le §22 demande — « je veux CE personnage » — et la seule voie
 * déterministe vers un Mythique, que le tirage donne une fois sur deux cent
 * soixante-dix coffres.
 *
 * ## Le calibrage, mesuré plutôt que supposé
 *
 * Le coût vaut `DUPLICATES_PER_CRAFT` doublons de la rareté visée. La
 * constante est passée de six à quinze, sur simulation de 260 ouvertures —
 * cinq ans d'un joueur gratuit, qui reçoit un coffre par semaine :
 *
 *     après  52 coffres   1 450 fragments   un Épique
 *     après 104 coffres   4 330 fragments   un Légendaire, et de la marge
 *     après 260 coffres  19 990 fragments   deux Mythiques
 *
 * À six, un joueur d'un an s'offrait deux Légendaires et la fabrication
 * devenait le chemin normal plutôt que l'objectif. À quinze, viser un
 * Mythique reste un projet de plusieurs mois — ce qu'il doit être — sans
 * jamais être impossible, ce qu'il était.
 */

export const DUPLICATES_PER_CRAFT = 15;

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
  /** Réserve du joueur, toutes raretés confondues. */
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
