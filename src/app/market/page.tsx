import type { Metadata } from 'next';
import { HarborScene } from '@/components/HarborScene';
import { islandOf } from '@/domain/islands';
import { Nav } from '@/components/Nav';
import Link from 'next/link';
import { MarketBoard } from '@/components/MarketBoard';
import { Watchlist } from '@/components/Watchlist';
import { CHARACTER_INDEX } from '@/data/characters';
import {
  MARKET_FEE_RATE,
  PRICE_FLOOR,
  priceCeiling,
  priceStats,
} from '@/domain/market/pricing';
import { requireSession } from '@/lib/auth/guards';
import * as market from '@/lib/market/repository';
import { getRepository } from '@/lib/repository';
import { getCachedRecentSales } from '@/lib/cache';
import { AdBanner } from '@/components/AdBanner';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Marché de la Grand Line',
  robots: { index: false, follow: false },
};

/**
 * Grand Line Market (cahier §35, §37).
 *
 * Le cahier insiste : ce ne doit pas ressembler à une page e-commerce froide.
 * D'où le carnet d'annonces présenté comme un marché, et les règles du jeu
 * affichées plutôt que cachées.
 */
export default async function MarketPage() {
  const session = await requireSession();

  if (!market.isMarketAvailable()) {
    return (
      <HarborScene variant="page" island={islandOf('/market')}>
        <h1 className="hb-title">
          Marché de la Grand Line
        </h1>
        <p className="hb-card mt-5 text-sm">
          Le Marché repose sur des transactions atomiques en base. Sans
          configuration Postgres, il est indisponible — plutôt que simulé en
          mémoire, ce qui donnerait une fausse assurance sur les doubles ventes.
        </p>
        <Link
          href="/"
          className="hb-link mt-5 block text-center text-sm"
        >
          Retour à l&apos;équipage
        </Link>
        {/* La barre manquait sur cette branche : sans base configurée, le
            joueur se retrouvait sur un écran sans aucune sortie autre que le
            lien de bas de page. */}
        <Nav />
      </HarborScene>
    );
  }

  const repository = getRepository();
  const [listings, wallet, ownedIds, watchedIds, sold] = await Promise.all([
    market.listActiveListings(),
    repository.getWallet(session.playerId),
    repository.getOwnedCharacterIds(session.playerId),
    market.getWatchlist(session.playerId),
    getCachedRecentSales(),
  ]);

  const owned = new Set(ownedIds);
  const watching = new Set(watchedIds);

  // Statistiques de marché des personnages surveillés (§39, §41).
  const [asks, sales, thresholds] = await Promise.all([
    market.lowestAsks(watchedIds),
    market.salesForMany(watchedIds),
    market.getAlertThresholds(session.playerId),
  ]);

  const now = new Date();
  const watched = watchedIds.map((characterId) => {
    const stats = priceStats(sales.get(characterId) ?? [], now);
    return {
      characterId,
      name: CHARACTER_INDEX.get(characterId)?.name ?? characterId,
      lowestAsk: asks.get(characterId) ?? null,
      averageSale: stats.average,
      weekChange: stats.weekChange,
      sales: stats.sales,
      alertBelow: thresholds.get(characterId) ?? null,
    };
  });

  // Ce que le joueur peut mettre en vente : ce qu'il possède et qui n'est pas
  // déjà en vente par lui.
  const alreadyListed = new Set(
    listings.filter((l) => l.sellerId === session.playerId).map((l) => l.characterId),
  );
  const sellable = ownedIds
    .map((id) => CHARACTER_INDEX.get(id))
    .filter((character) => character !== undefined && !alreadyListed.has(character.id))
    .map((character) => ({
      characterId: character!.id,
      name: character!.name,
      rarity: character!.rarity,
      floor: PRICE_FLOOR[character!.rarity],
      ceiling: priceCeiling(character!.rarity),
    }));

  return (
    <HarborScene variant="page" island={islandOf('/market')}>
      <div className="flex items-baseline justify-between">
        <p className="hb-eyebrow">
          🏴 Grand Line
        </p>
        <span className="hb-num text-sm">
          🪙 {wallet.berries}
        </span>
      </div>
      <h1 className="hb-title mt-1">Marché</h1>

      <p className="hb-muted mt-3 text-xs">
        {Math.round(MARKET_FEE_RATE * 100)} % de taxe sur chaque vente. Les
        Berries n&apos;achètent que de la collection : le prix d&apos;un
        personnage n&apos;influence jamais son score.
      </p>

      <div className="mt-6">
        <MarketBoard
          listings={listings.map((listing) => ({
            id: listing.id,
            characterId: listing.characterId,
            characterName:
              CHARACTER_INDEX.get(listing.characterId)?.name ?? listing.characterId,
            price: listing.price,
            sellerHandle: listing.sellerHandle,
            isMine: listing.sellerId === session.playerId,
            watching: watching.has(listing.characterId),
            alreadyOwned: owned.has(listing.characterId),
          }))}
          sellable={sellable}
          berries={wallet.berries}
        />
      </div>

      {/*
        Ventes conclues.

        Le carnet nomme le vendeur d'une annonce ; une vente, elle, ne nommait
        personne — le personnage disparaissait simplement de la liste. On voit
        maintenant qui a vendu quoi, à qui, et à quel prix : c'est ce qui
        distingue un prix de marché d'un arrangement entre deux comptes.
      */}
      {sold.length > 0 && (
        <section className="mt-8">
          <h2 className="hb-legend">Ventes récentes</h2>
          <ul className="mt-3 space-y-2">
            {sold.map((sale) => (
              <li key={sale.id} className="rounded-xl hb-surface px-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="hb-ink text-sm">
                    {CHARACTER_INDEX.get(sale.characterId)?.name ??
                      sale.characterId}
                  </span>
                  <span className="hb-num text-sm">{sale.price} 🪙</span>
                </div>
                <p className="mt-0.5 text-xs hb-ink-soft">
                  <span className="hb-handle">{sale.sellerHandle}</span>
                  {' → '}
                  <span className="hb-handle">{sale.buyerHandle}</span>
                  {' · '}
                  {/* `fr-FR` en dur : la date est rendue côté serveur, où la
                      langue du navigateur n'existe pas. Laisser la valeur par
                      défaut donnerait un format américain à tout le monde. */}
                  {sale.soldAt.toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="hb-legend">
          Liste de surveillance
        </h2>
        <Watchlist watched={watched} />
      </section>
      <AdBanner />
      <Nav />
    </HarborScene>
  );
}
