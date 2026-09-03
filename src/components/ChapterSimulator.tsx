'use client';

import { attempt } from './attempt';
import { useState, useTransition } from 'react';
import {
  simulateCurrentChapter,
  type SimulationSummary,
} from '@/app/actions/simulate';
import type { Severity } from '@/domain/admin/anomalies';

/**
 * Chapter Simulator (cahier §80, §81).
 *
 * Outil de décision : il montre à quoi ressemblerait le chapitre s'il était
 * publié maintenant, et signale ce qui mérite un second regard. Il ne publie
 * rien et ne bloque rien.
 */

const SEVERITY_STYLE: Record<Severity, string> = {
  INFO: 'hb-border hb-ink-soft',
  WARNING: 'border-orange/50 hb-warn',
  CRITICAL: 'border-danger/60 hb-ko',
};

export function ChapterSimulator() {
  const [summary, setSummary] = useState<SimulationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () => {
    startTransition(async () => {
      const result = await attempt(simulateCurrentChapter());
      if (result.ok) {
        setSummary(result.summary);
        setError(null);
      } else {
        setSummary(null);
        setError(result.error);
      }
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={pending}
        aria-busy={pending}
        className="transition-quick rounded-lg border hb-border px-4 py-2 text-sm hb-accent disabled:opacity-40"
      >
        {pending ? 'Simulation…' : 'Simuler le chapitre'}
      </button>

      {error && (
        <p role="alert" className="mt-3 text-sm hb-ko">
          {error}
        </p>
      )}

      {summary && (
        <div className="mt-4 space-y-4 text-sm">
          <section>
            <h3 className="text-xs uppercase tracking-widest hb-ink-soft">
              Meilleurs personnages
            </h3>
            <ul className="mt-2 space-y-1 font-mono">
              {summary.best.map((entry) => (
                <li
                  key={entry.characterId}
                  className="flex justify-between hb-ink"
                >
                  <span>{entry.name}</span>
                  <span className="hb-gold">{entry.total}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs hb-ink-soft">
              Meilleur trio possible : {summary.maxTeamScore} pts · synergie
              moyenne {Math.round(summary.averageSynergyShare * 100)} %
            </p>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <div className="rounded-lg hb-surface p-3">
              <p className="text-[11px] uppercase tracking-wider hb-ink-soft">
                Jackpot
              </p>
              <p className="hb-ink">
                {summary.jackpot
                  ? `${summary.jackpot.name} — ${summary.jackpot.total} pts`
                  : '—'}
              </p>
            </div>
            <div className="rounded-lg hb-surface p-3">
              <p className="text-[11px] uppercase tracking-wider hb-ink-soft">
                Piège
              </p>
              <p className="hb-ink">{summary.trap?.name ?? '—'}</p>
            </div>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-widest hb-ink-soft">
              Anomalies ({summary.anomalies.length})
            </h3>
            {summary.anomalies.length === 0 ? (
              <p className="mt-2 text-sm hb-accent">
                Rien à signaler sur ce chapitre.
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {summary.anomalies.map((anomaly, index) => (
                  <li
                    key={`${anomaly.kind}-${index}`}
                    className={`rounded-lg border-l-2 hb-surface px-3 py-2 ${SEVERITY_STYLE[anomaly.severity]}`}
                  >
                    <span className="font-mono text-[10px] uppercase tracking-wider">
                      {anomaly.severity}
                    </span>
                    <p className="text-sm">{anomaly.message}</p>
                  </li>
                ))}
              </ul>
            )}

            {/* §5.2 : l'outil éclaire, l'humain décide. */}
            <p className="mt-3 text-xs hb-ink-soft">
              La simulation n&apos;écrit rien et ne bloque pas la publication :
              elle éclaire la décision.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
