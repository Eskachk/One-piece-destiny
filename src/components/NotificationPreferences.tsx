'use client';

import { useState, useTransition } from 'react';
import { updatePreferencesAction } from '@/app/actions/preferences';
import type { NotificationPreferences as Preferences } from '@/domain/notifications/preferences';
import { attempt } from './attempt';

/**
 * Réglage des notifications (cahier §108).
 *
 * Les alertes de sécurité n'apparaissent pas comme un interrupteur : elles ne
 * sont pas désactivables, et afficher une case grisée laisserait croire
 * qu'elle pourrait s'ouvrir. Une phrase l'explique à la place.
 */
const ROWS: { key: keyof Preferences; label: string; hint?: string }[] = [
  { key: 'weeklyInApp', label: 'Rendez-vous hebdomadaire — dans l’application' },
  { key: 'weeklyEmail', label: 'Rendez-vous hebdomadaire — par e-mail', hint: 'Verrouillage, résultats publiés.' },
  { key: 'rewardsInApp', label: 'Récompenses — dans l’application' },
  { key: 'rewardsEmail', label: 'Récompenses — par e-mail' },
  { key: 'marketingEmail', label: 'Nouveautés et annonces', hint: 'Désactivé par défaut. Aucun envoi sans ton accord.' },
];

export function NotificationPreferences({ initial }: { initial: Preferences }) {
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
        setMessage({ kind: 'ok', text: 'Préférences enregistrées.' });
      } else {
        setPreferences(preferences);
        setMessage({ kind: 'error', text: result.error });
      }
    });
  };

  return (
    <section className="rounded-xl hb-surface p-5">
      <h2 className="font-display text-xl hb-ink">Notifications</h2>

      <ul className="mt-4 space-y-3">
        {ROWS.map((row) => (
          <li key={row.key} className="flex items-start justify-between gap-4">
            <label htmlFor={row.key} className="text-sm hb-ink">
              {row.label}
              {row.hint && (
                <span className="block text-xs hb-ink-soft">{row.hint}</span>
              )}
            </label>
            <input
              id={row.key}
              type="checkbox"
              checked={preferences[row.key]}
              disabled={pending}
              onChange={() => toggle(row.key)}
              className="mt-1 h-5 w-5 shrink-0 accent-[#f5c542]"
            />
          </li>
        ))}
      </ul>

      <p className="mt-4 border-t hb-border pt-3 text-xs hb-ink-soft">
        Les alertes de sécurité — mot de passe, double authentification — sont
        toujours envoyées. Elles protègent l’accès à ton compte et ne peuvent
        pas être désactivées.
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
