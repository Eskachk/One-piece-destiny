'use client';

import { attempt } from './attempt';
import { useState, useTransition } from 'react';
import {
  buyListingAction,
  cancelListingAction,
  createListingAction,
} from '@/app/actions/market';
import { WatchToggle } from '@/components/Watchlist';
import { feeBreakdown } from '@/domain/market/pricing';
import { RARITY_LABEL } from '@/domain/collection/rarity';
import type { Rarity } from '@/domain/types';

/**
 * Carnet d'annonces et mise en vente (cahier §37).
 *
 * Les bornes de prix et la taxe sont affichées pendant la saisie : le joueur
 * doit savoir ce qu'il touchera avant de valider, pas après.
 */

interface ListingView {
  id: string;
  characterId: string;
  characterName: string;
  price: number;
  sellerHandle: string;
  isMine: boolean;
  watching: boolean;
  alreadyOwned: boolean;
}

interface SellableView {
  characterId: string;
  name: string;
  rarity: Rarity;
  floor: number;
  ceiling: number;
}

export function MarketBoard({
  listings,
  sellable,
  berries,
}: {
  listings: ListingView[];
  sellable: SellableView[];
  berries: number;
}) {
  const [selling, setSelling] = useState<SellableView | null>(null);
  const [price, setPrice] = useState('');
  const [message, setMessage] = useState<
    { kind: 'ok' | 'error'; text: string } | null
  >(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok: boolean } & Record<string, unknown>>) => {
    startTransition(async () => {
      const result = await attempt(action());
      setMessage(
        result.ok
          ? { kind: 'ok', text: 'C\'est fait.' }
          : { kind: 'error', text: String(result.error) },
      );
      if (result.ok) {
        setSelling(null);
        setPrice('');
      }
    });
  };

  const parsedPrice = Number(price);
  const priceIsNumber = Number.isInteger(parsedPrice) && parsedPrice > 0;
  const preview = priceIsNumber ? feeBreakdown(parsedPrice) : null;

  return (
    <div className="space-y-8">
      {message && (
        <p
          role="status"
          className={`text-sm ${message.kind === 'ok' ? 'hb-accent' : 'hb-ko'}`}
        >
          {message.text}
        </p>
      )}

      {/* Carnet d'annonces */}
      <section>
        <h2 className="text-sm uppercase tracking-widest hb-ink-soft">
          Annonces
        </h2>

        {listings.length === 0 ? (
          <p className="mt-3 text-sm hb-ink-soft">
            Aucune annonce. Le marché est calme.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {listings.map((listing) => {
              const tooPoor = listing.price > berries;
              return (
                <li
                  key={listing.id}
                  className="rounded-xl hb-surface p-4"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="flex items-center gap-2 hb-ink">
                      <WatchToggle
                        characterId={listing.characterId}
                        watching={listing.watching}
                      />
                      {listing.characterName}
                    </span>
                    <span className="font-mono hb-gold">
                      {listing.price} 🪙
                    </span>
                  </div>
                  {/* Le pseudo du vendeur est traité comme une identité, pas
                      comme une mention de bas de carte : c'est l'information
                      qui permet de reconnaître un habitué du Market. */}
                  <p className="mt-1 text-xs hb-ink-soft">
                    Vendu par <span className="hb-handle">{listing.sellerHandle}</span>
                  </p>

                  {listing.isMine ? (
                    <button
                      type="button"
                      disabled={pending}
                      aria-busy={pending}
                      onClick={() => run(() => cancelListingAction(listing.id))}
                      className="transition-quick mt-3 w-full rounded-lg border border-danger/40 px-3 py-2 text-sm hb-ko disabled:opacity-40"
                    >
                      Retirer mon annonce
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pending || tooPoor || listing.alreadyOwned}
                      aria-busy={pending}
                      onClick={() => run(() => buyListingAction(listing.id))}
                      className="transition-quick mt-3 w-full rounded-lg hb-goldfill px-3 py-2 text-sm font-semibold hb-on-gold disabled:opacity-50 disabled:hb-ink-soft"
                    >
                      {listing.alreadyOwned
                        ? 'Déjà dans ta collection'
                        : tooPoor
                          ? 'Berries insuffisantes'
                          : 'Acheter'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Mise en vente */}
      <section>
        <h2 className="text-sm uppercase tracking-widest hb-ink-soft">
          Vendre
        </h2>

        {sellable.length === 0 ? (
          <p className="mt-3 text-sm hb-ink-soft">
            Rien à vendre pour l&apos;instant.
          </p>
        ) : selling ? (
          <div className="mt-3 rounded-xl hb-surface p-4">
            <p className="hb-ink">{selling.name}</p>
            <p className="text-[11px] uppercase tracking-wider hb-accent">
              {RARITY_LABEL[selling.rarity]}
            </p>

            <label
              htmlFor="price"
              className="mt-3 block text-xs hb-ink-soft"
            >
              Prix entre {selling.floor} et {selling.ceiling} 🪙
            </label>
            <input
              id="price"
              type="number"
              min={selling.floor}
              max={selling.ceiling}
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className="mt-1 w-full rounded-lg border hb-border hb-input px-3 py-2 font-mono hb-ink"
            />

            {/* Ce que le vendeur touchera, avant de valider (§42). */}
            {preview && (
              <p className="mt-2 text-xs hb-ink-soft">
                Taxe {preview.fee} 🪙 · tu reçois{' '}
                <span className="hb-gold">{preview.sellerReceives} 🪙</span>
              </p>
            )}

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={pending || !priceIsNumber}
                aria-busy={pending}
                onClick={() =>
                  run(() =>
                    createListingAction({
                      characterId: selling.characterId,
                      price: parsedPrice,
                    }),
                  )
                }
                className="transition-quick flex-1 rounded-lg hb-goldfill px-3 py-2 text-sm font-semibold hb-on-gold disabled:opacity-40"
              >
                Mettre en vente
              </button>
              <button
                type="button"
                onClick={() => setSelling(null)}
                className="rounded-lg border hb-border px-3 py-2 text-sm hb-accent"
              >
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <ul className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
            {sellable.map((card) => (
              <li key={card.characterId}>
                <button
                  type="button"
                  onClick={() => setSelling(card)}
                  className="transition-quick w-full rounded-lg hb-surface p-3 text-left"
                >
                  <span className="block text-sm hb-ink">{card.name}</span>
                  <span className="mt-0.5 block text-[11px] uppercase tracking-wider hb-ink-soft">
                    {RARITY_LABEL[card.rarity]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
