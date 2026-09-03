'use client';

import { useState, useTransition } from 'react';
import { attempt } from './attempt';
import {
  liftRestrictionAction,
  markFalsePositiveAction,
  reevaluateAction,
  restrictAccountAction,
} from '@/app/actions/antiabuse';

/**
 * File d'examen du Fraud Center (cahier §43 ; cadrage §26, §27).
 *
 * Trois partis pris d'interface, et chacun répond à un travers connu de ce
 * genre d'outil :
 *
 *   — **les signaux sont affichés avant le score.** Un tableau qui met le
 *     chiffre en avant pousse à trancher sur le chiffre. Ici on lit d'abord
 *     ce qui est reproché ;
 *   — **« faux positif » est aussi accessible que « restreindre ».** Un outil
 *     qui rend la sanction plus facile que l'absolution produit des sanctions ;
 *   — **aucune action n'est irréversible.** La restriction est bornée dans le
 *     temps, et se lève en un geste.
 */

export interface SuspiciousView {
  playerId: string;
  handle: string;
  email: string | null;
  createdAt: string;
  score: number;
  level: string;
  signals: { name: string; detail: string }[];
  restricted: boolean;
}

const LEVEL_COLOR: Record<string, string> = {
  REVIEW: '#f5c542',
  RESTRICTED: '#f58a32',
  HIGH_RISK: '#e94e4e',
};

export function FraudCenter({ accounts }: { accounts: SuspiciousView[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) => {
    startTransition(async () => {
      const result = await attempt(action() as Promise<{ ok: true } | { ok: false; error: string }>);
      setMessage(result.ok ? 'Fait.' : result.error);
    });
  };

  if (accounts.length === 0) {
    return (
      <p className="mt-4 text-sm text-parchment/60">
        Aucun compte en attente d’examen. Les évaluations sont recalculées à
        chaque transaction ; il n’y a rien à faire tant que cette liste est
        vide.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {message && (
        <p role="status" className="text-sm text-turquoise">
          {message}
        </p>
      )}

      {accounts.map((account) => (
        <article
          key={account.playerId}
          className="rounded-xl border border-turquoise/20 bg-navy/40 p-4"
        >
          <header className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <p className="font-semibold text-parchment">{account.handle}</p>
              <p className="text-[11px] text-parchment/50">
                {account.email ?? 'sans adresse'} · créé le {account.createdAt}
              </p>
            </div>
            <span
              className="rounded-full px-2 py-0.5 font-mono text-xs"
              style={{
                color: LEVEL_COLOR[account.level] ?? '#f5e8c8',
                border: `1px solid ${LEVEL_COLOR[account.level] ?? '#f5e8c8'}`,
              }}
            >
              {account.level} · {account.score}
            </span>
          </header>

          {/* Les motifs d'abord : c'est sur eux qu'on décide, pas sur le score. */}
          <ul className="mt-3 space-y-1">
            {account.signals.map((signal) => (
              <li key={signal.name} className="text-sm text-parchment/80">
                <span className="font-mono text-[11px] text-turquoise">
                  {signal.name}
                </span>{' '}
                — {signal.detail}
              </li>
            ))}
          </ul>

          {account.restricted && (
            <p className="mt-3 text-xs text-orange">
              Ce compte est actuellement restreint.
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              value={reasons[account.playerId] ?? ''}
              onChange={(event) =>
                setReasons((current) => ({
                  ...current,
                  [account.playerId]: event.target.value,
                }))
              }
              placeholder="Motif (obligatoire pour restreindre)"
              className="min-w-[14rem] flex-1 rounded-lg border border-turquoise/25 bg-abyss/60 px-3 py-2 text-sm text-parchment placeholder:text-parchment/35"
            />

            {(['24h', '7j', '30j'] as const).map((duration) => (
              <button
                key={duration}
                type="button"
                disabled={
                  pending || (reasons[account.playerId] ?? '').trim().length < 3
                }
                aria-busy={pending}
                onClick={() =>
                  run(() =>
                    restrictAccountAction({
                      playerId: account.playerId,
                      duration,
                      reason: reasons[account.playerId],
                    }),
                  )
                }
                className="rounded-lg border border-orange/50 px-3 py-2 text-xs text-orange disabled:opacity-30"
              >
                Restreindre {duration}
              </button>
            ))}
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              aria-busy={pending}
              onClick={() => run(() => markFalsePositiveAction(account.playerId))}
              className="rounded-lg border border-turquoise/40 px-3 py-2 text-xs text-turquoise disabled:opacity-30"
            >
              Faux positif
            </button>
            <button
              type="button"
              disabled={pending}
              aria-busy={pending}
              onClick={() => run(() => reevaluateAction(account.playerId))}
              className="rounded-lg border border-parchment/25 px-3 py-2 text-xs text-parchment/70 disabled:opacity-30"
            >
              Réévaluer
            </button>
            {account.restricted && (
              <button
                type="button"
                disabled={pending}
                aria-busy={pending}
                onClick={() => run(() => liftRestrictionAction(account.playerId))}
                className="rounded-lg border border-turquoise/40 px-3 py-2 text-xs text-turquoise disabled:opacity-30"
              >
                Lever la restriction
              </button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
