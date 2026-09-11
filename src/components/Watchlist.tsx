'use client';

import { attempt } from './attempt';
import { useState, useTransition } from 'react';
import { setPriceAlertAction, setWatchAction } from '@/app/actions/market';
import { useT } from './LocaleProvider';

/**
 * Watchlist (cahier §41).
 *
 * Le cahier évoque des alertes (« Bartolomeo est passé sous 8 000 »). Le canal
 * e-mail existe désormais, donc l'alerte est réellement envoyée — par la tâche
 * `price-alerts`, pas par le navigateur.
 *
 * Le seuil est **choisi par le joueur** : on ne décide jamais à sa place qu'un
 * prix est intéressant. Sans seuil, aucune alerte ne part.
 */

export interface WatchedCharacter {
  characterId: string;
  name: string;
  lowestAsk: number | null;
  /** Seuil d'alerte choisi par le joueur, `null` si aucun. */
  alertBelow: number | null;
  averageSale: number;
  weekChange: number | null;
  sales: number;
}

export function Watchlist({ watched }: { watched: WatchedCharacter[] }) {
  const { t, tn, tradMessage } = useT();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const unwatch = (characterId: string) => {
    startTransition(async () => {
      const result = await attempt(setWatchAction(characterId, false));
      setError(result.ok ? null : result.error);
    });
  };

  if (watched.length === 0) {
    return (
      <p className="mt-3 text-sm hb-ink-soft">
        {t('mk.watch.empty')}
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {error && (
        <p role="alert" className="text-sm hb-ko">
          {tradMessage(error)}
        </p>
      )}

      {watched.map((entry) => (
        <div
          key={entry.characterId}
          className="rounded-lg hb-surface px-3 py-2"
        >
          <div className="flex items-baseline justify-between">
            <span className="text-sm hb-ink">{entry.name}</span>
            <span className="font-mono text-sm hb-gold">
              {entry.lowestAsk === null ? '—' : `${entry.lowestAsk} 🪙`}
            </span>
          </div>

          <div className="mt-1 flex items-baseline justify-between text-[11px] hb-ink-soft">
            <span>
              {entry.sales === 0
                ? t('mk.watch.never')
                : tn('mk.watch.avg', entry.sales, { avg: entry.averageSale })}
              {entry.weekChange !== null && (
                <span
                  className={
                    entry.weekChange >= 0 ? ' hb-accent' : ' hb-ko'
                  }
                >
                  {' '}
                  {entry.weekChange >= 0 ? '↑' : '↓'} {Math.abs(entry.weekChange)} %
                </span>
              )}
            </span>

            <button
              type="button"
              disabled={pending}
              aria-busy={pending}
              onClick={() => unwatch(entry.characterId)}
              className="underline disabled:opacity-40"
            >
              {t('mk.watch.remove')}
            </button>
          </div>

          <AlertThreshold
            characterId={entry.characterId}
            initial={entry.alertBelow}
          />
        </div>
      ))}
    </div>
  );
}

/** Bouton de surveillance, posé sur une annonce. */
export function WatchToggle({
  characterId,
  watching,
}: {
  characterId: string;
  watching: boolean;
}) {
  const { t } = useT();
  const [pending, startTransition] = useTransition();

  /*
   * L'étoile affichée est **locale**, et c'est ce qui rend le bouton
   * utilisable.
   *
   * Trois défauts se tenaient ensemble ici. Le premier : la transition était
   * lancée sur une fonction **synchrone** — `startTransition(() => void
   * action())` — qui rend la main aussitôt. React considérait donc la
   * transition terminée avant même que la requête ne parte, `pending`
   * retombait dans la milliseconde, et le `disabled` posé juste au-dessus ne
   * protégeait rien du tout.
   *
   * Le deuxième : rien ne changeait à l'écran avant le retour du serveur. Le
   * joueur cliquait, ne voyait rien, recliquait — le comportement qui produit
   * précisément le martèlement.
   *
   * Le troisième, le vrai : l'action était une **bascule**. Dix clics
   * envoyaient dix inversions, et l'état final dépendait de l'ordre d'arrivée.
   * Elle pose désormais un état voulu, calculé ici : dix fois « surveille »
   * valent une fois.
   */
  const [voulu, setVoulu] = useState(watching);

  return (
    <button
      type="button"
      disabled={pending}
      aria-busy={pending}
      aria-pressed={voulu}
      aria-label={
        voulu ? t('mk.watch.drop') : t('mk.watch.add')
      }
      onClick={() => {
        const cible = !voulu;
        setVoulu(cible);
        startTransition(async () => {
          const result = await attempt(setWatchAction(characterId, cible));
          // Le serveur a refusé : on revient à l'affichage précédent plutôt
          // que de laisser une étoile qui ment.
          if (!result.ok) setVoulu(!cible);
        });
      }}
      className={`transition-quick text-sm disabled:opacity-40 ${
        voulu ? 'hb-gold' : 'hb-ink-soft'
      }`}
    >
      {voulu ? '★' : '☆'}
    </button>
  );
}

/**
 * Seuil d'alerte d'un personnage surveillé (cahier §41).
 *
 * Volontairement dépouillé : un champ, un bouton. Pas de suggestion de seuil
 * « recommandé » — ce serait pousser à l'achat, exactement ce qu'il faut
 * éviter sur un marché.
 */
function AlertThreshold({
  characterId,
  initial,
}: {
  characterId: string;
  initial: number | null;
}) {
  const { t, tradMessage } = useT();
  const [value, setValue] = useState(initial === null ? '' : String(initial));
  const [saved, setSaved] = useState<number | null>(initial);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    const trimmed = value.trim();
    // Champ vidé = surveillance sans alerte. Le personnage reste dans la liste.
    const alertBelow = trimmed === '' ? null : Number(trimmed);

    if (alertBelow !== null && (!Number.isInteger(alertBelow) || alertBelow < 1)) {
      setMessage(t('mk.alert.integer'));
      return;
    }

    startTransition(async () => {
      const result = await attempt(setPriceAlertAction({ characterId, alertBelow }));
      if (result.ok) {
        setSaved(result.alertBelow);
        setMessage(
          result.alertBelow === null
            ? t('mk.alert.removed')
            : t('mk.alert.set', { n: result.alertBelow }),
        );
      } else {
        setMessage(tradMessage(result.error));
      }
    });
  };

  return (
    <div className="mt-2 border-t hb-border pt-2">
      <div className="flex items-center gap-2">
        <label
          htmlFor={`alert-${characterId}`}
          className="text-[11px] hb-ink-soft"
        >
          {t('mk.alert.label')}
        </label>
        <input
          id={`alert-${characterId}`}
          type="number"
          min={1}
          inputMode="numeric"
          value={value}
          disabled={pending}
          aria-busy={pending}
          onChange={(event) => setValue(event.target.value)}
          placeholder="—"
          className="w-24 rounded-md border hb-border hb-input px-2 py-1 text-right font-mono text-xs hb-ink"
        />
        <button
          type="button"
          onClick={save}
          disabled={pending || value.trim() === String(saved ?? '')}
          aria-busy={pending}
          className="text-[11px] hb-accent underline disabled:opacity-30"
        >
          {t('action.save')}
        </button>
      </div>

      {message && (
        <p role="status" className="mt-1 text-[11px] hb-ink-soft">
          {message}
        </p>
      )}
    </div>
  );
}
