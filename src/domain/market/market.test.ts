import { describe, expect, it } from 'vitest';
import {
  feeBreakdown,
  MARKET_FEE_RATE,
  PRICE_FLOOR,
  priceCeiling,
  priceStats,
  validatePrice,
} from './pricing';
import {
  canList,
  canPurchase,
  CANCELLATION_WINDOW_MS,
  LISTING_COOLDOWN_MS,
  MAX_CANCELLATIONS,
  RESELL_COOLDOWN_MS,
  WASH_TRADE_THRESHOLD,
  type TradeRecord,
} from './anti-manipulation';

const now = new Date('2026-08-28T12:00:00Z');
const ago = (ms: number) => new Date(now.getTime() - ms);

describe('taxe de transaction (§42)', () => {
  it("reproduit l'exemple du cahier : 10 000 vendus, 9 000 reçus", () => {
    expect(feeBreakdown(10_000)).toEqual({
      price: 10_000,
      fee: 1_000,
      sellerReceives: 9_000,
    });
  });

  it('arrondit la taxe au supérieur pour ne pas fuir sur les petites ventes', () => {
    const { fee, sellerReceives } = feeBreakdown(101);
    expect(fee).toBe(11);
    expect(sellerReceives).toBe(90);
  });

  it('prélève toujours quelque chose', () => {
    for (const price of [1, 7, 99, 100, 12_345]) {
      expect(feeBreakdown(price).fee).toBeGreaterThan(0);
    }
  });

  it('conserve la somme : prix = taxe + part du vendeur', () => {
    for (const price of [100, 999, 10_000, 45_678]) {
      const { fee, sellerReceives } = feeBreakdown(price);
      expect(fee + sellerReceives).toBe(price);
    }
  });

  it('applique bien le taux annoncé', () => {
    expect(feeBreakdown(10_000).fee / 10_000).toBeCloseTo(MARKET_FEE_RATE);
  });
});

describe('bornes de prix (§43)', () => {
  it('accepte un prix dans les bornes', () => {
    expect(validatePrice(PRICE_FLOOR.EPIC, 'EPIC').valid).toBe(true);
    expect(validatePrice(priceCeiling('EPIC'), 'EPIC').valid).toBe(true);
  });

  it('refuse de brader sous le plancher', () => {
    const verdict = validatePrice(PRICE_FLOOR.LEGENDARY - 1, 'LEGENDARY');
    expect(verdict).toMatchObject({ valid: false, reason: 'BELOW_FLOOR' });
  });

  it('refuse un prix absurde au-dessus du plafond', () => {
    const verdict = validatePrice(priceCeiling('COMMON') + 1, 'COMMON');
    expect(verdict).toMatchObject({ valid: false, reason: 'ABOVE_CEILING' });
  });

  it('refuse un prix non entier ou négatif', () => {
    expect(validatePrice(1_500.5, 'EPIC').valid).toBe(false);
    expect(validatePrice(-1, 'EPIC').valid).toBe(false);
    expect(validatePrice(0, 'EPIC').valid).toBe(false);
  });

  it('durcit le plancher avec la rareté', () => {
    expect(PRICE_FLOOR.COMMON).toBeLessThan(PRICE_FLOOR.RARE);
    expect(PRICE_FLOOR.LEGENDARY).toBeLessThan(PRICE_FLOOR.MYTHIC);
  });
});

describe('historique des prix (§39)', () => {
  const sale = (price: number, daysAgo: number) => ({
    price,
    soldAt: ago(daysAgo * 24 * 60 * 60 * 1000),
  });

  it('calcule moyenne, minimum et maximum', () => {
    const stats = priceStats([sale(6_200, 1), sale(11_400, 2), sale(7_850, 3)], now);
    expect(stats.lowest).toBe(6_200);
    expect(stats.highest).toBe(11_400);
    expect(stats.sales).toBe(3);
  });

  it('compare la semaine écoulée à la précédente', () => {
    const stats = priceStats(
      [sale(10_000, 1), sale(10_000, 2), sale(5_000, 9), sale(5_000, 10)],
      now,
    );
    expect(stats.weekChange).toBe(100);
  });

  it('ne calcule pas de variation sans période de comparaison', () => {
    expect(priceStats([sale(8_000, 1)], now).weekChange).toBeNull();
  });

  it('gère un personnage jamais vendu', () => {
    expect(priceStats([], now)).toMatchObject({ sales: 0, weekChange: null });
  });
});

describe('mise en vente (§43)', () => {
  const base = {
    lastListingAt: null,
    cancellations: [],
    purchasedAt: null,
    now,
  };

  it('autorise une première mise en vente', () => {
    expect(canList(base).allowed).toBe(true);
  });

  it('impose un délai entre deux mises en vente', () => {
    const decision = canList({
      ...base,
      lastListingAt: ago(LISTING_COOLDOWN_MS - 1_000),
    });
    expect(decision).toMatchObject({ allowed: false, reason: 'COOLDOWN' });
  });

  it('rouvre après le délai', () => {
    expect(
      canList({ ...base, lastListingAt: ago(LISTING_COOLDOWN_MS + 1_000) })
        .allowed,
    ).toBe(true);
  });

  it('bloque les annulations répétées', () => {
    const cancellations = Array.from({ length: MAX_CANCELLATIONS }, () =>
      ago(60_000),
    );
    expect(canList({ ...base, cancellations })).toMatchObject({
      allowed: false,
      reason: 'TOO_MANY_CANCELLATIONS',
    });
  });

  it('ignore les annulations sorties de la fenêtre', () => {
    const cancellations = Array.from({ length: 20 }, () =>
      ago(CANCELLATION_WINDOW_MS + 60_000),
    );
    expect(canList({ ...base, cancellations }).allowed).toBe(true);
  });

  it('interdit la revente immédiate d\'une carte achetée', () => {
    // Sans cette règle, faire circuler une carte entre comptes complices
    // permettrait de fabriquer un historique de prix.
    const decision = canList({ ...base, purchasedAt: ago(60 * 60 * 1000) });
    expect(decision).toMatchObject({
      allowed: false,
      reason: 'RECENTLY_PURCHASED',
    });
  });

  it('autorise la revente passé 24 h', () => {
    expect(
      canList({ ...base, purchasedAt: ago(RESELL_COOLDOWN_MS + 1_000) }).allowed,
    ).toBe(true);
  });
});

describe('achat (§43)', () => {
  const base = {
    buyerId: 'acheteur',
    sellerId: 'vendeur',
    buyerOwnsCharacter: false,
    tradesBetween: [] as TradeRecord[],
    linkedAccount: false,
    now,
  };

  it('autorise un achat ordinaire', () => {
    expect(canPurchase(base).allowed).toBe(true);
  });

  it('refuse d\'acheter sa propre annonce', () => {
    expect(canPurchase({ ...base, sellerId: 'acheteur' })).toMatchObject({
      allowed: false,
      reason: 'OWN_LISTING',
    });
  });

  it('refuse un personnage déjà possédé', () => {
    expect(canPurchase({ ...base, buyerOwnsCharacter: true })).toMatchObject({
      allowed: false,
      reason: 'ALREADY_OWNED',
    });
  });

  it('refuse un compte lié', () => {
    expect(canPurchase({ ...base, linkedAccount: true })).toMatchObject({
      allowed: false,
      reason: 'LINKED_ACCOUNT',
    });
  });

  it('détecte le wash trading entre deux mêmes comptes', () => {
    const tradesBetween = Array.from({ length: WASH_TRADE_THRESHOLD }, () => ({
      buyerId: 'acheteur',
      sellerId: 'vendeur',
      at: ago(24 * 60 * 60 * 1000),
    }));
    expect(canPurchase({ ...base, tradesBetween })).toMatchObject({
      allowed: false,
      reason: 'WASH_TRADING',
    });
  });

  it('ignore les échanges anciens', () => {
    const tradesBetween = Array.from({ length: 10 }, () => ({
      buyerId: 'acheteur',
      sellerId: 'vendeur',
      at: ago(30 * 24 * 60 * 60 * 1000),
    }));
    expect(canPurchase({ ...base, tradesBetween }).allowed).toBe(true);
  });

  it('tolère quelques échanges légitimes', () => {
    const tradesBetween = Array.from({ length: WASH_TRADE_THRESHOLD - 1 }, () => ({
      buyerId: 'acheteur',
      sellerId: 'vendeur',
      at: ago(60 * 60 * 1000),
    }));
    expect(canPurchase({ ...base, tradesBetween }).allowed).toBe(true);
  });
});
