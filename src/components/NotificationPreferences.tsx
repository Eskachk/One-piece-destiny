'use client';

import { useState, useTransition } from 'react';
import { updatePreferencesAction } from '@/app/actions/preferences';
import type { NotificationPreferences as Preferences } from '@/domain/notifications/preferences';
import type { MessageKey } from '@/domain/i18n/locales';
import { attempt } from './attempt';
import { useT } from './LocaleProvider';

/**
 * Réglage des notifications (cahier §108).
 *
 * Les alertes de sécurité n'apparaissent pas comme un interrupteur : elles ne
 * sont pas désactivables, et afficher une case grisée laisserait croire
 * qu'elle pourrait s'ouvrir. Une phrase l'explique à la place.
 */
const ROWS: { key: keyof Preferences; hint?: boolean }[] = [
  { key: 'weeklyInApp' },
  { key: 'weeklyEmail', hint: true },
  { key: 'rewardsInApp' },
  { key: 'rewardsEmail' },
  { key: 'marketingEmail', hint: true },
];

export function NotificationPreferences({ initial }: { initial: Preferences }) {
  const { t, tradMessage } = useT();
  const [preferences, setPreferences] = useState(initial);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (key: keyof Preferences) => {
    const next = { ...preferences, [key]: !preferences[key] };
    // Optimiste, puis corrigé si le serveur refuse : le serveur reste la
    // source de vérité, l'interface n'anticipe que l'affichage.
    setPreferences(next);

    startTransition(async () => {
      const result = await attempt(updatePreferencesAction(next));
      if (result.ok) {
        setPreferences(result.preferences);
        setMessage({ kind: 'ok', text: t('pref.saved') });
      } else {
        setPreferences(preferences);
        setMessage({ kind: 'error', text: tradMessage(result.error) });
      }
    });
  };

  return (
    <section className="rounded-xl hb-surface p-5">
      <h2 className="font-display text-xl hb-ink">{t('pref.title')}</h2>

      <ul className="mt-4 space-y-3">
        {ROWS.map((row) => (
          <li key={row.key} className="flex items-start justify-between gap-4">
            <label htmlFor={row.key} className="text-sm hb-ink">
              {t(`pref.${row.key}`)}
              {row.hint && (
                <span className="block text-xs hb-ink-soft">
                  {t(`pref.${row.key}.hint` as MessageKey)}
                </span>
              )}
            </label>
            <input
              id={row.key}
              type="checkbox"
              checked={preferences[row.key]}
              disabled={pending}
              aria-busy={pending}
              onChange={() => toggle(row.key)}
              className="mt-1 h-5 w-5 shrink-0 accent-[#f5c542]"
            />
          </li>
        ))}
      </ul>

      <p className="mt-4 border-t hb-border pt-3 text-xs hb-ink-soft">
        {t('pref.security')}
      </p>

      {message && (
        <p
          role="status"
          className={`mt-3 text-sm ${message.kind === 'ok' ? 'hb-accent' : 'hb-ko'}`}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}
