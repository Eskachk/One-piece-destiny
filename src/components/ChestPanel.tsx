'use client';

import { attempt } from './attempt';
import { useState, useTransition } from 'react';
import {
  buyChestAction,
  openOwnedChestAction,
  type OpenStarterResult,
} from '@/app/actions/collection';
import { ChestOpening } from '@/components/chest3d/ChestOpening';
import { ChestOdds } from '@/components/ChestOdds';
import type { RarityOdds } from '@/domain/collection/odds';
import { PITY_THRESHOLD } from '@/domain/collection/chest';
import { CHEST_PRICE_BERRIES } from '@/domain/collection/rewards';

/**
 * Coffres possédés et boutique (cahier §26, §31, §36, §113).
 *
 * La règle de pitié est affichée en permanence, pas cachée dans des
 * conditions générales : le cahier §31 demande qu'elle soit transparente
 * avant l'ouverture.
 */
export function ChestPanel({
  unopenedChests,
  pityCounter,
  berries,
  odds,
}: {
  unopenedChests: number;
  pityCounter: number;
  berries: number;
  /** Calculées côté serveur depuis les constantes du tirage (§113). */
  odds: RarityOdds[];
}) {
  const [result, setResult] = useState<OpenStarterResult | null>(null);
  const [shopError, setShopError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const open = () => {
    startTransition(async () => {
      setShopError(null);
      setResult(await attempt(openOwnedChestAction()));
    });
  };

  const buy = () => {
    startTransition(async () => {
      setResult(null);
      const outcome = await attempt(buyChestAction());
      setShopError(outcome.ok ? null : outcome.error);
    });
  };

  const remainingToPity = Math.max(0, PITY_THRESHOLD - pityCounter);

  return (
    <section className="rounded-xl hb-surface p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl hb-ink">Coffres</h2>
        <span className="font-mono text-sm hb-gold">🪙 {berries}</span>
      </div>

      <p className="mt-2 text-sm hb-ink-soft">
        {unopenedChests > 0
          ? `${unopenedChests} coffre${unopenedChests > 1 ? 's' : ''} à ouvrir.`
          : 'Aucun coffre en réserve.'}
      </p>

      {/* §31 : la garantie est annoncée, jamais découverte après coup. */}
      <p className="mt-1 text-xs hb-ink-soft">
        {remainingToPity === 0
          ? '✨ Ton prochain coffre garantit un légendaire.'
          : `Légendaire garanti dans ${remainingToPity} coffre${remainingToPity > 1 ? 's' : ''} au plus tard.`}
      </p>

      {result?.ok && (
        <div className="mt-4">
          <ChestOpening cards={result.cards} />
        </div>
      )}

      {result && !result.ok && (
        <p role="alert" className="mt-3 text-sm hb-ko">
          {result.error}
        </p>
      )}
      {shopError && (
        <p role="alert" className="mt-3 text-sm hb-ko">
          {shopError}
        </p>
      )}

      <div className="mt-4 space-y-2">
        <button
          type="button"
          onClick={open}
          disabled={pending || unopenedChests === 0}
          className="transition-quick w-full rounded-xl hb-goldfill px-4 py-3 font-semibold hb-on-gold disabled:opacity-50 disabled:hb-ink-soft"
        >
          {pending ? 'Un instant…' : 'Ouvrir un coffre'}
        </button>

        <button
          type="button"
          onClick={buy}
          disabled={pending || berries < CHEST_PRICE_BERRIES}
          className="transition-quick w-full rounded-xl border hb-border px-4 py-2 text-sm hb-accent disabled:opacity-40"
        >
          Acheter un coffre — {CHEST_PRICE_BERRIES} 🪙
        </button>
      </div>

      <p className="mt-3 text-[11px] hb-ink-soft">
        Les Berries n&apos;achètent que de la collection : aucun bonus de score
        n&apos;est en vente.
      </p>

      {/* §113 : la composition et les taux sont annoncés avant l'achat. */}
      <ChestOdds odds={odds} />
    </section>
  );
}
