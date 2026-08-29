'use client';

import { attempt } from './attempt';
import { useState, useTransition } from 'react';
import { craftCharacterAction } from '@/app/actions/collection';

/**
 * Fabrication d'un personnage par fragments (cahier §29).
 *
 * Le coût et le manque sont affichés en permanence : le joueur doit pouvoir
 * viser un personnage précis (« je veux CE personnage », §22) plutôt que
 * d'espérer un tirage.
 */
export function CraftButton({
  characterId,
  shards,
  cost,
}: {
  characterId: string;
  shards: number;
  cost: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const craft = () => {
    startTransition(async () => {
      const result = await attempt(craftCharacterAction(characterId));
      setError(result.ok ? null : result.error);
    });
  };

  const missing = Math.max(0, cost - shards);
  const ready = missing === 0;

  return (
    <div className="mt-2">
      <div className="h-1 overflow-hidden rounded-full hb-gauge-bg">
        <div
          className={`h-full rounded-full ${ready ? 'hb-goldfill' : 'bg-turquoise/60'}`}
          style={{ width: `${Math.min(100, (shards / cost) * 100)}%` }}
        />
      </div>

      <p className="mt-1 text-[10px] hb-ink-soft">
        ✨ {shards} / {cost}
      </p>

      {ready && (
        <button
          type="button"
          onClick={craft}
          disabled={pending}
          className="transition-quick mt-1 w-full rounded hb-goldfill px-2 py-1 text-[11px] font-semibold hb-on-gold disabled:opacity-50"
        >
          {pending ? '…' : 'Fabriquer'}
        </button>
      )}

      {error && (
        <p role="alert" className="mt-1 text-[10px] hb-ko">
          {error}
        </p>
      )}
    </div>
  );
}
