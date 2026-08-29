import type { Rarity } from '../types';

/**
 * Prix et taxe du Grand Line Market (cahier §38, §42, §43).
 *
 * Deux principes du cahier gouvernent ce module :
 *
 *   §38  le prix est déterminé par l'offre et la demande des joueurs, mais
 *        **il n'entre jamais dans le calcul du score** ;
 *   §42  chaque transaction est taxée. Ce n'est pas une source de revenu :
 *        c'est un puits de monnaie contre l'inflation, et un frein aux
 *        transactions inutiles.
 */

/** 10 % prélevés au vendeur : sur 10 000, il reçoit 9 000 (exemple du §42). */
export const MARKET_FEE_RATE = 0.1;

/**
 * Bornes de prix (cahier §43).
 *
 * Le plancher empêche de brader une carte pour la transférer à un complice
 * sans que ça se voie. Le plafond empêche d'afficher un prix absurde pour
 * fausser l'historique et les statistiques de marché.
 */
export const PRICE_FLOOR: Record<Rarity, number> = {
  COMMON: 100,
  RARE: 400,
  EPIC: 1_200,
  LEGENDARY: 4_000,
  MYTHIC: 12_000,
};

/** Plafond : vingt fois le plancher de la rareté. */
export const PRICE_CEILING_MULTIPLIER = 20;

export function priceCeiling(rarity: Rarity): number {
  return PRICE_FLOOR[rarity] * PRICE_CEILING_MULTIPLIER;
}

export interface FeeBreakdown {
  price: number;
  fee: number;
  /** Ce que le vendeur touche réellement. */
  sellerReceives: number;
}

/**
 * Décomposition d'une vente. La taxe est arrondie au supérieur : elle ne doit
 * jamais tomber à zéro par arrondi sur les petites transactions, sinon le
 * puits de monnaie fuit.
 */
export function feeBreakdown(price: number): FeeBreakdown {
  const fee = Math.ceil(price * MARKET_FEE_RATE);
  return { price, fee, sellerReceives: price - fee };
}

export type PriceRefusal = 'BELOW_FLOOR' | 'ABOVE_CEILING' | 'NOT_INTEGER';

export type PriceVerdict =
  | { valid: true }
  | { valid: false; reason: PriceRefusal; floor: number; ceiling: number };

export function validatePrice(price: number, rarity: Rarity): PriceVerdict {
  const floor = PRICE_FLOOR[rarity];
  const ceiling = priceCeiling(rarity);

  if (!Number.isInteger(price) || price <= 0) {
    return { valid: false, reason: 'NOT_INTEGER', floor, ceiling };
  }
  if (price < floor) {
    return { valid: false, reason: 'BELOW_FLOOR', floor, ceiling };
  }
  if (price > ceiling) {
    return { valid: false, reason: 'ABOVE_CEILING', floor, ceiling };
  }
  return { valid: true };
}

export function describePriceRefusal(
  verdict: Extract<PriceVerdict, { valid: false }>,
): string {
  switch (verdict.reason) {
    case 'NOT_INTEGER':
      return 'Le prix doit être un nombre entier de Berries.';
    case 'BELOW_FLOOR':
      return `Prix minimum pour cette rareté : ${verdict.floor} 🪙.`;
    case 'ABOVE_CEILING':
      return `Prix maximum pour cette rareté : ${verdict.ceiling} 🪙.`;
  }
}

// ---------------------------------------------------------------------------
// Historique des prix (cahier §39)
// ---------------------------------------------------------------------------

export interface Sale {
  price: number;
  soldAt: Date;
}

export interface PriceStats {
  average: number;
  lowest: number;
  highest: number;
  sales: number;
  /** Variation sur la période, en pourcentage. `null` si trop peu de ventes. */
  weekChange: number | null;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Statistiques de marché d'un personnage.
 *
 * `weekChange` compare la moyenne des sept derniers jours à celle de la
 * semaine précédente. Comparer deux ventes isolées donnerait des variations
 * spectaculaires et fausses.
 */
export function priceStats(sales: Sale[], now: Date): PriceStats {
  if (sales.length === 0) {
    return { average: 0, lowest: 0, highest: 0, sales: 0, weekChange: null };
  }

  const prices = sales.map((sale) => sale.price);
  const average = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);

  const recent = sales.filter(
    (sale) => now.getTime() - sale.soldAt.getTime() <= WEEK_MS,
  );
  const previous = sales.filter((sale) => {
    const age = now.getTime() - sale.soldAt.getTime();
    return age > WEEK_MS && age <= WEEK_MS * 2;
  });

  let weekChange: number | null = null;
  if (recent.length > 0 && previous.length > 0) {
    const mean = (list: Sale[]) =>
      list.reduce((sum, sale) => sum + sale.price, 0) / list.length;
    const before = mean(previous);
    weekChange = Number((((mean(recent) - before) / before) * 100).toFixed(1));
  }

  return {
    average,
    lowest: Math.min(...prices),
    highest: Math.max(...prices),
    sales: sales.length,
    weekChange,
  };
}
