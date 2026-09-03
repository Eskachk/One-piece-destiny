'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { MARKET_TAG } from '@/lib/cache';
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
import {
  canBuyOnMarket,
  canEnterMarket,
} from '@/lib/antiabuse/restrictions';
import { recordEvent } from '@/lib/antiabuse/events';
import { recordTransfer } from '@/lib/antiabuse/provenance';
import { evaluatePlayer } from '@/lib/antiabuse/signals';
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
/**
 * Pose la surveillance d'un personnage.
 *
 * L'état voulu est un **paramètre**, pas une inversion de l'état courant.
 * C'est ce qui rend l'appel idempotent : marteler le bouton envoie dix fois
 * « surveille », et dix fois « surveille » valent une fois. Une bascule, elle,
 * dépendait de l'ordre d'arrivée des requêtes — l'étoile finissait par
 * contredire la base, dans un sens ou dans l'autre selon la course.
 */
export async function setWatchAction(
  characterId: unknown,
  watching: unknown,
): Promise<MarketResult> {
  await assertSameOrigin();
  const session = await requireSession();
  if (!market.isMarketAvailable()) return UNAVAILABLE;

  const parsed = z.string().min(1).max(64).safeParse(characterId);
  if (!parsed.success || !CHARACTER_INDEX.has(parsed.data)) {
    return { ok: false, error: 'Personnage inconnu.' };
  }

  const voulu = z.boolean().safeParse(watching);
  if (!voulu.success) return { ok: false, error: 'État de surveillance invalide.' };

  await market.setWatch(session.playerId, parsed.data, voulu.data);
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

  // Verrous anti-abus, **avant** les cooldowns : ils portent sur des faits
  // — l'origine de la carte, l'âge du compte — là où `canList` traite du
  // rythme. Un compte de dix minutes doit être refusé pour ce qu’il est,
  // pas pour la vitesse à laquelle il enchaîne.
  const gate = await canEnterMarket(session.playerId, character.id);
  if (!gate.allowed) {
    await audit({
      playerId: session.playerId,
      action: 'market.list',
      status: 'REFUSED',
      metadata: { reason: gate.reason, characterId: character.id },
    });
    return { ok: false, error: gate.message };
  }

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

  await recordEvent(session.playerId, 'MARKET_LISTED', {
    characterId: character.id,
    price: parsed.data.price,
  });

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

  /*
   * L'annonce et le droit d'acheter se lisent **ensemble** : l'une dépend de
   * l'identifiant reçu, l'autre du seul joueur. Les enchaîner faisait payer
   * deux allers-retours vers Supabase là où un seul suffit — et sur le chemin
   * d'un achat, chaque aller-retour est du temps pendant lequel l'annonce peut
   * partir chez quelqu'un d'autre.
   *
   * L'ordre des **refus** ne bouge pas : annonce introuvable d'abord, compte
   * restreint ensuite. Quand on lit n'est pas quand on décide.
   */
  const [listing, buyGate] = await Promise.all([
    market.getListing(parsed.data),
    // Un compte restreint ne peut pas acheter non plus : sans cela, la
    // restriction n'empêcherait que le sens sortant du transfert, et la
    // valeur continuerait de se concentrer — dans l’autre sens.
    canBuyOnMarket(session.playerId),
  ]);

  if (!listing) return { ok: false, error: 'Annonce introuvable ou déjà vendue.' };

  if (!buyGate.allowed) {
    await audit({
      playerId: session.playerId,
      action: 'market.purchase',
      status: 'REFUSED',
      metadata: { reason: buyGate.reason },
    });
    return { ok: false, error: buyGate.message };
  }

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

  // Nouveau maillon de la chaîne de propriété : la carte a changé de mains,
  // son code de série la suit, et l'on saura dans six mois d'où elle venait.
  await recordTransfer({
    playerId: session.playerId,
    characterId: listing.characterId,
    source: 'MARKET',
  });

  await recordEvent(session.playerId, 'MARKET_BOUGHT', {
    characterId: listing.characterId,
    from: listing.sellerId,
  });
  await recordEvent(listing.sellerId, 'MARKET_SOLD', {
    characterId: listing.characterId,
    to: session.playerId,
  });

  // Réévaluation **après** la transaction, jamais avant : le moteur ne
  // doit pas s’insérer dans le chemin critique d’un achat (§35). Un échec
  // ici ne remet pas en cause une vente déjà réglée en base.
  try {
    await Promise.all([
      evaluatePlayer(listing.sellerId),
      evaluatePlayer(session.playerId),
    ]);
  } catch (error) {
    console.warn('[antiabuse] évaluation impossible', (error as Error).message);
  }

  // La liste des ventes récentes est partagée par tout le monde et servie
  // depuis le cache : sans cette purge, l'acheteur ne verrait pas sa propre
  // transaction avant une minute — et c'est la première chose qu'il cherche.
  revalidateTag(MARKET_TAG);
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
