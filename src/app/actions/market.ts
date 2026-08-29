'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { CHARACTER_INDEX } from '@/data/characters';
import {
  canList,
  canPurchase,
  describeListingRefusal,
  describePurchaseRefusal,
} from '@/domain/market/anti-manipulation';
import {
  describePriceRefusal,
  feeBreakdown,
  validatePrice,
} from '@/domain/market/pricing';
import { requireSession } from '@/lib/auth/guards';
import { assertSameOrigin } from '@/lib/auth/request-guard';
import * as market from '@/lib/market/repository';
import { audit } from '@/lib/audit';
import { db } from '@/lib/supabase-admin';

/**
 * Actions du Grand Line Market (cahier §35 à §43).
 *
 * Toutes les vérifications anti-manipulation sont refaites ici, côté serveur.
 * L'interface ne fait que les anticiper pour éviter un aller-retour inutile.
 */

export type MarketResult = { ok: true } | { ok: false; error: string };

/**
 * Surveillance d'un personnage (cahier §41).
 *
 * Pas d'alerte poussée ici : sans service de notification, promettre une
 * alerte serait mentir. La watchlist affiche le prix le plus bas et la
 * tendance ; le joueur revient les consulter.
 */
export async function toggleWatchAction(
  characterId: unknown,
): Promise<MarketResult> {
  await assertSameOrigin();
  const session = await requireSession();
  if (!market.isMarketAvailable()) return UNAVAILABLE;

  const parsed = z.string().min(1).max(64).safeParse(characterId);
  if (!parsed.success || !CHARACTER_INDEX.has(parsed.data)) {
    return { ok: false, error: 'Personnage inconnu.' };
  }

  await market.toggleWatch(session.playerId, parsed.data);
  revalidatePath('/market');
  return { ok: true };
}

const UNAVAILABLE: MarketResult = {
  ok: false,
  error: 'Le Market nécessite une base de données configurée.',
};

const ListingSchema = z.object({
  characterId: z.string().min(1).max(64),
  price: z.number().int().positive().max(10_000_000),
});

/** Mise en vente à prix fixe (§45 : pas d'enchères pour l'instant). */
export async function createListingAction(
  input: unknown,
): Promise<MarketResult> {
  await assertSameOrigin();
  const session = await requireSession();
  if (!market.isMarketAvailable()) return UNAVAILABLE;

  const parsed = ListingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Annonce invalide.' };

  const character = CHARACTER_INDEX.get(parsed.data.characterId);
  if (!character) return { ok: false, error: 'Personnage inconnu.' };

  // On ne vend que ce qu'on possède.
  if (!(await market.ownsCharacter(session.playerId, character.id))) {
    return { ok: false, error: 'Tu ne possèdes pas ce personnage.' };
  }

  const price = validatePrice(parsed.data.price, character.rarity);
  if (!price.valid) return { ok: false, error: describePriceRefusal(price) };

  const context = await market.listingContext(session.playerId, character.id);
  const decision = canList({ ...context, now: new Date() });
  if (!decision.allowed) {
    return { ok: false, error: describeListingRefusal(decision.reason) };
  }

  const created = await market.createListing(
    session.playerId,
    character.id,
    parsed.data.price,
  );
  if (created === 'duplicate') {
    return { ok: false, error: 'Ce personnage est déjà en vente.' };
  }

  revalidatePath('/market');
  return { ok: true };
}

export async function cancelListingAction(
  listingId: unknown,
): Promise<MarketResult> {
  await assertSameOrigin();
  const session = await requireSession();
  if (!market.isMarketAvailable()) return UNAVAILABLE;

  const parsed = z.string().uuid().safeParse(listingId);
  if (!parsed.success) return { ok: false, error: 'Annonce introuvable.' };

  const cancelled = await market.cancelListing(session.playerId, parsed.data);
  if (!cancelled) {
    return { ok: false, error: 'Annonce introuvable ou déjà close.' };
  }

  revalidatePath('/market');
  return { ok: true };
}

/**
 * Achat d'une annonce.
 *
 * Les contrôles anti-manipulation précèdent la transaction ; l'atomicité du
 * paiement est assurée par `purchase_listing` côté base (§93).
 */
export async function buyListingAction(
  listingId: unknown,
): Promise<MarketResult> {
  await assertSameOrigin();
  const session = await requireSession();
  if (!market.isMarketAvailable()) return UNAVAILABLE;

  const parsed = z.string().uuid().safeParse(listingId);
  if (!parsed.success) return { ok: false, error: 'Annonce introuvable.' };

  const listing = await market.getListing(parsed.data);
  if (!listing) return { ok: false, error: 'Annonce introuvable ou déjà vendue.' };

  const [owns, trades, linked] = await Promise.all([
    market.ownsCharacter(session.playerId, listing.characterId),
    market.tradesBetween(session.playerId, listing.sellerId),
    market.looksLinked(session.playerId, listing.sellerId),
  ]);

  const decision = canPurchase({
    buyerId: session.playerId,
    sellerId: listing.sellerId,
    buyerOwnsCharacter: owns,
    tradesBetween: trades,
    linkedAccount: linked,
    now: new Date(),
  });

  if (!decision.allowed) {
    // Un refus anti-manipulation mérite une trace : c'est ce qui permettra
    // de distinguer un faux positif d'une vraie tentative (§101).
    await audit({
      playerId: session.playerId,
      action: 'market.purchase',
      status: 'REFUSED',
      metadata: { reason: decision.reason, listingId: listing.id },
    });
    return { ok: false, error: describePurchaseRefusal(decision.reason) };
  }

  const { fee } = feeBreakdown(listing.price);
  const transactionId = await market.purchase(listing.id, session.playerId, fee);

  if (!transactionId) {
    // Solde insuffisant, ou quelqu'un a acheté avant nous : la base a
    // tranché, on ne devine pas laquelle des deux raisons.
    return {
      ok: false,
      error: 'Achat impossible : annonce déjà vendue ou Berries insuffisantes.',
    };
  }

  await audit({
    playerId: session.playerId,
    action: 'market.purchase',
    status: 'SUCCESS',
    metadata: { listingId: listing.id, price: listing.price, fee },
  });

  revalidatePath('/market');
  revalidatePath('/collection');
  return { ok: true };
}

const ThresholdSchema = z.object({
  characterId: z.string().min(1).max(64),
  // `null` retire le seuil sans retirer le personnage de la watchlist.
  alertBelow: z.number().int().min(1).max(1_000_000).nullable(),
});

export type ThresholdResult =
  | { ok: true; alertBelow: number | null }
  | { ok: false; error: string };

/**
 * Fixe le seuil d'alerte d'un personnage surveillé (cahier §41).
 *
 * Le joueur choisit son seuil : on ne décide jamais à sa place qu'un prix est
 * intéressant. La ligne visée est identifiée par la **session**, jamais par un
 * paramètre — personne ne peut donc modifier la surveillance d'autrui.
 */
export async function setPriceAlertAction(
  input: unknown,
): Promise<ThresholdResult> {
  await assertSameOrigin();
  const session = await requireSession();

  const parsed = ThresholdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Seuil invalide.' };
  }

  const { error } = await db()
    .from('market_watchlist')
    .update({
      alert_below: parsed.data.alertBelow,
      // Réarmement : changer le seuil doit pouvoir déclencher à nouveau.
      alerted_at: null,
    })
    .eq('player_id', session.playerId)
    .eq('character_id', parsed.data.characterId);

  if (error) return { ok: false, error: 'Enregistrement impossible.' };

  revalidatePath('/market');
  return { ok: true, alertBelow: parsed.data.alertBelow };
}
