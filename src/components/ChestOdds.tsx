'use client';

import { useState } from 'react';
import type { RarityOdds } from '@/domain/collection/odds';
import { useT } from './LocaleProvider';
import { libelleRarete } from '@/domain/i18n/libelles';

/**
 * Probabilités annoncées d'un coffre (cahier §113).
 *
 * Repliées par défaut, mais **toujours accessibles avant l'achat** et en un
 * seul geste : les enfouir derrière plusieurs écrans reviendrait à ne pas les
 * annoncer.
 *
 * Les chiffres viennent de `chestOdds()`, recalculé à partir des mêmes
 * constantes que le tirage. Ils ne peuvent pas diverger de ce que fait
 * réellement le serveur.
 */
export function ChestOdds({ odds }: { odds: RarityOdds[] }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="text-xs hb-accent underline"
      >
        {open ? t('chest.odds.hide') : t('chest.odds.show')}
      </button>

      {open && (
        <div className="mt-2 rounded-lg border hb-border hb-input p-3">
          <table className="w-full text-xs">
            <caption className="pb-2 text-left hb-ink-soft">
              {t('chest.odds.caption')}
            </caption>
            <tbody>
              {odds.map((entry) => (
                <tr key={entry.rarity}>
                  <th scope="row" className="py-0.5 text-left font-normal hb-ink">
                    {libelleRarete(t, entry.rarity)}
                  </th>
                  <td className="py-0.5 text-right font-mono hb-gold">
                    {entry.atLeastOnePercent.toFixed(2)} %
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-2 border-t hb-border pt-2 text-[11px] leading-relaxed hb-ink-soft">
            {t('chest.odds.note')}
          </p>
        </div>
      )}
    </div>
  );
}
