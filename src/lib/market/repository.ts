import 'server-only';

import type { Rarity } from '@/domain/types';
import type { Sale } from '@/domain/market/pricing';
import type { TradeRecord } from '@/domain/market/anti-manipulation';
import { db, isDatabaseConfigured } from '@/lib/supabase-admin';

/**
 * Accès au Grand Line Market.
 *
 * **Postgres uniquement.** Le Market repose sur `purchase_listing`, une
 * fonction SQL qui débite, crédite, transfère la carte et clôt l'annonce en
 * une seule transaction verrouillée. Reproduire ça en mémoire donnerait une
 * fausse assurance : l'atomicité est justement ce qui empêche de vendre deux
 * fois la même carte. Sans base, le Market est donc annoncé indisponible
 * plutôt que simulé.
 */

export function isMarketAvailable(): boolean {
  return isDatabaseConfigured();
}

export interface Listing {
  id: string;
  sellerId: string;
  sellerHandle: string;
  characterId: string;
  price: number;
  listedAt: Date;
}

export async function listActiveListings(limit = 50): Promise<Listing[]> {
  const { data, error } = await db()
    .from('market_listings')
    .select('id, seller_id, character_id, price, listed_at, players!inner(handle)')
    .eq('status', 'ACTIVE')
    .order('listed_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`market_listings.select : ${error.message}`);

  return (data ?? []).map((row): Listing => {
    const seller = row.players as unknown as { handle: string };
    return {
      id: row.id,
      sellerId: row.seller_id,
      sellerHandle: seller.handle,
      characterId: row.character_id,
      price: row.price,
      listedAt: new Date(row.listed_at),
    };
  });
}

export async function getListing(listingId: string): Promise<Listing | null> {
  const { data } = await db()
    .from('market_listings')
    .select('id, seller_id, character_id, price, listed_at, players!inner(handle)')
    .eq('id', listingId)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (!data) return null;
  const seller = data.players as unknown as { handle: string };
  return {
    id: data.id,
    sellerId: data.seller_id,
    sellerHandle: seller.handle,
    characterId: data.character_id,
    price: data.price,
    listedAt: new Date(data.listed_at),
  };
}

/** Contexte anti-manipulation d'une mise en vente (§43). */
export async function listingContext(
  playerId: string,
  characterId: string,
): Promise<{
  lastListingAt: Date | null;
  cancellations: Date[];
  purchasedAt: Date | null;
}> {
  const [last, cancellations, item] = await Promise.all([
    db()
      .from('market_listings')
      .select('listed_at')
      .eq('seller_id', playerId)
      .order('listed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    db()
      .from('market_cancellations')
      .select('at')
      .eq('player_id', playerId)
      .order('at', { ascending: false })
      .limit(50),
    db()
      .from('inventory')
      .select('acquired_from_market_at')
      .eq('player_id', playerId)
      .eq('character_id', characterId)
      .maybeSingle(),
  ]);

  return {
    lastListingAt: last.data ? new Date(last.data.listed_at) : null,
    cancellations: (cancellations.data ?? []).map((row) => new Date(row.at)),
    purchasedAt: item.data?.acquired_from_market_at
      ? new Date(item.data.acquired_from_market_at)
      : null,
  };
}

/** Échanges passés entre deux comptes, pour la détection de wash trading. */
export async function tradesBetween(
  buyerId: string,
  sellerId: string,
): Promise<TradeRecord[]> {
  const { data } = await db()
    .from('market_transactions')
    .select('buyer_id, seller_id, sold_at')
    .or(
      `and(buyer_id.eq.${buyerId},seller_id.eq.${sellerId}),and(buyer_id.eq.${sellerId},seller_id.eq.${buyerId})`,
    )
    .order('sold_at', { ascending: false })
    .limit(50);

  return (data ?? []).map((row) => ({
    buyerId: row.buyer_id,
    sellerId: row.seller_id,
    at: new Date(row.sold_at),
  }));
}

/**
 * Deux comptes partagent-ils une empreinte d'inscription ? (cahier §43)
 *
 * ⚠️ Signal **faible** : un foyer, une université ou un opérateur mobile
 * produisent la même IP pour des personnes différentes. Il ne sert donc qu'à
 * refuser une transaction, jamais à sanctionner un compte.
 */
export async function looksLinked(
  playerA: string,
  playerB: string,
): Promise<boolean> {
  const { data } = await db()
    .from('user_accounts')
    .select('player_id, signup_ip')
    .in('player_id', [playerA, playerB]);

  const ips = (data ?? [])
    .map((row) => row.signup_ip)
    .filter((ip): ip is string => Boolean(ip));

  // Il faut deux empreintes connues et identiques pour conclure.
  return ips.length === 2 && ips[0] === ips[1];
}

export async function ownsCharacter(
  playerId: string,
  characterId: string,
): Promise<boolean> {
  const { data } = await db()
    .from('inventory')
    .select('id')
    .eq('player_id', playerId)
    .eq('character_id', characterId)
    .maybeSingle();
  return data !== null;
}

export async function createListing(
  sellerId: string,
  characterId: string,
  price: number,
): Promise<'created' | 'duplicate'> {
  const { error } = await db().from('market_listings').insert({
    seller_id: sellerId,
    character_id: characterId,
    price,
  });

  if (error) {
    // Index unique partiel : une seule annonce active par personnage.
    if (error.code === '23505') return 'duplicate';
    throw new Error(`market_listings.insert : ${error.message}`);
  }
  return 'created';
}

export async function cancelListing(
  sellerId: string,
  listingId: string,
): Promise<boolean> {
  const { data } = await db()
    .from('market_listings')
    .update({ status: 'CANCELLED', closed_at: new Date().toISOString() })
    .eq('id', listingId)
    .eq('seller_id', sellerId)
    .eq('status', 'ACTIVE')
    .select('id')
    .maybeSingle();

  if (!data) return false;

  // Trace pour la limitation des annulations répétées (§43).
  await db()
    .from('market_cancellations')
    .insert({ player_id: sellerId, listing_id: listingId });

  return true;
}

/**
 * Achat. Retourne l'identifiant de transaction, ou `null` si l'opération n'a
 * pas eu lieu — annonce déjà vendue, solde insuffisant, ou course perdue.
 */
export async function purchase(
  listingId: string,
  buyerId: string,
  fee: number,
): Promise<string | null> {
  const { data, error } = await db().rpc('purchase_listing', {
    p_listing_id: listingId,
    p_buyer_id: buyerId,
    p_fee: fee,
  });

  if (error) throw new Error(`purchase_listing : ${error.message}`);
  return (data as string | null) ?? null;
}

/**
 * Dernières ventes conclues, avec le pseudo des deux joueurs (§37, §39).
 *
 * Le carnet d'annonces nommait le vendeur, mais **une vente conclue ne nommait
 * personne** : le personnage disparaissait de la liste, et rien ne disait qui
 * l'avait acheté ni à qui. Un marché où les transactions sont anonymes ne se
 * lit pas — le joueur ne sait pas si un prix est un prix de marché ou un
 * arrangement entre deux comptes.
 *
 * C'est aussi ce qui rend le wash trading visible à l'œil nu : deux pseudos
 * qui reviennent en boucle sur la même carte se remarquent bien avant qu'une
 * règle automatique ne les attrape.
 *
 * Les deux jointures sont nommées explicitement (`seller:players!...`) : sans
 * cela, PostgREST ne sait pas laquelle des deux clés étrangères vers `players`
 * suivre, et refuse la requête.
 */
export interface RecentSale {
  id: string;
  characterId: string;
  price: number;
  soldAt: Date;
  sellerHandle: string;
  buyerHandle: string;
}

/**
 * Forme d'une ligne rendue par la requête ci-dessous.
 *
 * Elle est déclarée à la main parce que le client Supabase n'infère les types
 * que d'un `select` écrit **en une seule chaîne littérale**. Celui-ci est
 * assemblé — les deux jointures nommées ne tiendraient pas sur une ligne
 * lisible — et l'inférence retombe alors sur `GenericStringError`, c'est-à-dire
 * sur rien d'exploitable.
 */
interface SaleRow {
  id: string;
  character_id: string;
  price: number;
  sold_at: string;
  seller: { handle: string } | null;
  buyer: { handle: string } | null;
}

export async function recentSales(limit = 12): Promise<RecentSale[]> {
  const { data, error } = await db()
    .from('market_transactions')
    .select(
      'id, character_id, price, sold_at, ' +
        'seller:players!market_transactions_seller_id_fkey(handle), ' +
        'buyer:players!market_transactions_buyer_id_fkey(handle)',
    )
    .order('sold_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`market_transactions.select : ${error.message}`);

  const rows = (data ?? []) as unknown as SaleRow[];

  return rows.map((row): RecentSale => ({
    id: row.id,
    characterId: row.character_id,
    price: row.price,
    soldAt: new Date(row.sold_at),
    // Un compte supprimé laisse sa transaction derrière lui. Afficher un tiret
    // vaut mieux que faire échouer toute la section.
    sellerHandle: row.seller?.handle ?? '—',
    buyerHandle: row.buyer?.handle ?? '—',
  }));
}

/** Ventes d'un personnage, pour l'historique des prix (§39). */
export async function salesFor(characterId: string): Promise<Sale[]> {
  const { data } = await db()
    .from('market_transactions')
    .select('price, sold_at')
    .eq('character_id', characterId)
    .order('sold_at', { ascending: false })
    .limit(200);

  return (data ?? []).map((row) => ({
    price: row.price,
    soldAt: new Date(row.sold_at),
  }));
}

export interface SellableCard {
  characterId: string;
  rarity: Rarity;
}

// ---------------------------------------------------------------------------
// Watchlist (cahier §41)
// ---------------------------------------------------------------------------

export async function getWatchlist(playerId: string): Promise<string[]> {
  const { data, error } = await db()
    .from('market_watchlist')
    .select('character_id')
    .eq('player_id', playerId)
    .order('added_at', { ascending: false });

  if (error) throw new Error(`market_watchlist.select : ${error.message}`);
  return (data ?? []).map((row) => row.character_id);
}

/** Seuils d'alerte du joueur, indexes par personnage (cahier §41). */
export async function getAlertThresholds(
  playerId: string,
): Promise<Map<string, number | null>> {
  const { data, error } = await db()
    .from('market_watchlist')
    .select('character_id, alert_below')
    .eq('player_id', playerId);

  if (error) throw new Error(`market_watchlist.select : ${error.message}`);
  return new Map((data ?? []).map((row) => [row.character_id, row.alert_below]));
}

/** Ajoute ou retire de la watchlist. Retourne le nouvel état. */
/**
 * Pose l'état de surveillance d'un personnage — **sans le basculer**.
 *
 * ## Le défaut corrigé
 *
 * La fonction s'appelait `toggleWatch` et faisait exactement ce que son nom
 * disait : elle lisait la ligne, puis l'insérait ou la supprimait selon
 * qu'elle existait. Deux problèmes, et le second est le vrai.
 *
 * D'abord trois allers-retours vers la base pour un clic — un `select`, puis
 * un `delete` ou un `insert` — là où un seul suffit.
 *
 * Ensuite, et surtout : une bascule est **intrinsèquement racée**. Deux clics
 * rapprochés lisent tous deux le même état de départ, et l'état final dépend
 * de l'ordre dans lequel la base applique les deux écritures. En martelant le
 * bouton, on obtenait une étoile qui n'était plus d'accord avec la base — et
 * le sens de l'écart changeait d'une fois sur l'autre. Aucune protection côté
 * navigateur ne rattrape cela : deux onglets suffisent à le reproduire.
 *
 * En posant un **état voulu** plutôt qu'une inversion, l'opération devient
 * idempotente : dix appels « surveille » concurrents donnent le même résultat
 * qu'un seul.
 */
export async function setWatch(
  playerId: string,
  characterId: string,
  watching: boolean,
): Promise<void> {
  if (!watching) {
    await db()
      .from('market_watchlist')
      .delete()
      .eq('player_id', playerId)
      .eq('character_id', characterId);
    return;
  }

  const { error } = await db()
    .from('market_watchlist')
    .insert({ player_id: playerId, character_id: characterId });

  // 23505 : la ligne existait déjà. C'est le résultat demandé, pas une erreur.
  if (error && error.code !== '23505') {
    throw new Error(`market_watchlist.insert : ${error.message}`);
  }
}


/** Prix demandé le plus bas actuellement, par personnage. */
export async function lowestAsks(
  characterIds: string[],
): Promise<Map<string, number>> {
  if (characterIds.length === 0) return new Map();

  const { data, error } = await db()
    .from('market_listings')
    .select('character_id, price')
    .eq('status', 'ACTIVE')
    .in('character_id', characterIds)
    .order('price', { ascending: true });

  if (error) throw new Error(`market_listings.select : ${error.message}`);

  const lowest = new Map<string, number>();
  for (const row of data ?? []) {
    // Trié par prix croissant : la première occurrence est la moins chère.
    if (!lowest.has(row.character_id)) lowest.set(row.character_id, row.price);
  }
  return lowest;
}

/** Ventes récentes pour plusieurs personnages, en une requête. */
export async function salesForMany(
  characterIds: string[],
): Promise<Map<string, Sale[]>> {
  if (characterIds.length === 0) return new Map();

  const { data, error } = await db()
    .from('market_transactions')
    .select('character_id, price, sold_at')
    .in('character_id', characterIds)
    .order('sold_at', { ascending: false })
    .limit(500);

  if (error) throw new Error(`market_transactions.select : ${error.message}`);

  const byCharacter = new Map<string, Sale[]>();
  for (const row of data ?? []) {
    const list = byCharacter.get(row.character_id) ?? [];
    list.push({ price: row.price, soldAt: new Date(row.sold_at) });
    byCharacter.set(row.character_id, list);
  }
  return byCharacter;
}
