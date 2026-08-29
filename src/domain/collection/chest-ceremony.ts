import type { Rarity } from '../types';
import { rarityRank } from './rarity';
import type { ChestCard } from './chest';

/**
 * Mise en scène de l'ouverture (cahier §56, §60, §61).
 *
 * La logique de scénographie est isolée ici, en pur calcul : quelle est la
 * meilleure carte, quelle durée, quelle intensité. Le composant 3D ne fait
 * qu'exécuter ce plan — ce qui le rend testable sans WebGL.
 *
 * §60 est la contrainte structurante : les animations longues sont réservées
 * aux coffres et aux nouveaux personnages. Tout le reste doit rester dans les
 * 150–250 ms.
 */

export type CeremonyTier = 'STANDARD' | 'PREMIUM';

export interface CeremonyPlan {
  tier: CeremonyTier;
  /** Rareté la plus élevée du coffre, celle qui dicte la mise en scène. */
  highlight: Rarity;
  /** Secondes de tremblement avant ouverture. */
  shakeSeconds: number;
  /**
   * Silence avant la révélation (cahier §61). Le silence qui précède une
   * grosse récompense fait la tension ; sans lui, tout se vaut.
   */
  suspenseSeconds: number;
  /** Nombre de particules. 0 pour un coffre ordinaire. */
  particles: number;
  /** Durée totale, utilisée pour enchaîner sur la liste des cartes. */
  totalSeconds: number;
}

/** À partir de Légendaire, la cérémonie passe en version premium. */
const PREMIUM_FROM: Rarity = 'LEGENDARY';

const STANDARD: Omit<CeremonyPlan, 'highlight' | 'tier' | 'totalSeconds'> = {
  shakeSeconds: 0.9,
  suspenseSeconds: 0.25,
  particles: 0,
};

const PREMIUM: Omit<CeremonyPlan, 'highlight' | 'tier' | 'totalSeconds'> = {
  shakeSeconds: 1.6,
  suspenseSeconds: 0.9,
  particles: 140,
};

export function bestRarity(cards: ChestCard[]): Rarity {
  return cards.reduce<Rarity>(
    (best, card) => (rarityRank(card.rarity) > rarityRank(best) ? card.rarity : best),
    'COMMON',
  );
}

export function ceremonyPlan(cards: ChestCard[]): CeremonyPlan {
  const highlight = bestRarity(cards);
  const premium = rarityRank(highlight) >= rarityRank(PREMIUM_FROM);
  const base = premium ? PREMIUM : STANDARD;

  return {
    ...base,
    tier: premium ? 'PREMIUM' : 'STANDARD',
    highlight,
    // Ouverture du couvercle + révélation, en plus du tremblement.
    totalSeconds: base.shakeSeconds + base.suspenseSeconds + 0.8,
  };
}

/**
 * Plan dégradé pour `prefers-reduced-motion` (cahier §111).
 *
 * On ne supprime pas la révélation — le joueur doit voir ce qu'il a obtenu —
 * mais on retire tremblement, particules et attente.
 */
export function reducedMotionPlan(cards: ChestCard[]): CeremonyPlan {
  return {
    ...ceremonyPlan(cards),
    shakeSeconds: 0,
    suspenseSeconds: 0,
    particles: 0,
    totalSeconds: 0.2,
  };
}
