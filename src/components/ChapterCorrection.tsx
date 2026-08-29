'use client';

import { attempt } from './attempt';
import { useState, useTransition } from 'react';
import { correctPublishedChapter } from '@/app/actions/correction';

/**
 * Correction d'un chapitre publié (cahier §79).
 *
 * L'écran matérialise la règle « aucune correction silencieuse » : la raison
 * est obligatoire, elle sera lue par les joueurs notifiés, et l'état antérieur
 * est archivé avant toute écriture.
 */
export function ChapterCorrection({ chapterNumber }: { chapterNumber: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [appearances, setAppearances] = useState('');
  const [message, setMessage] = useState<
    { kind: 'ok' | 'error'; text: string } | null
  >(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const result = await attempt(correctPublishedChapter({ reason, appearances }));
      setMessage(
        result.ok
          ? { kind: 'ok', text: result.message }
          : { kind: 'error', text: result.error },
      );
      if (result.ok) {
        setOpen(false);
        setReason('');
        setAppearances('');
      }
    });
  };

  if (!open) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="transition-quick rounded-lg border hb-border px-4 py-2 text-sm hb-warn"
        >
          Corriger le chapitre {chapterNumber}
        </button>
        {message && (
          <p
            role="status"
            className={`mt-3 text-sm ${message.kind === 'ok' ? 'hb-accent' : 'hb-ko'}`}
          >
            {message.text}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="rounded-lg border hb-border hb-hi p-3 text-sm hb-ink">
        Le classement du chapitre {chapterNumber} est déjà publié. La correction
        archive l&apos;état actuel, recalcule les scores avec la version de
        score d&apos;origine, et notifie chaque joueur dont le total change.
      </p>

      <div>
        <label htmlFor="reason" className="block text-xs hb-ink-soft">
          Raison de la correction — elle sera lue par les joueurs
        </label>
        <input
          id="reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Apparitions de Koby recomptées après relecture des pages 12 à 15."
          className="mt-1 w-full rounded-lg border hb-border hb-input px-3 py-2 text-sm hb-ink placeholder:text-[#9aa8bf]"
        />
      </div>

      <div>
        <label htmlFor="corrected" className="block text-xs hb-ink-soft">
          Apparitions corrigées — remplacent intégralement les précédentes
        </label>
        <textarea
          id="corrected"
          value={appearances}
          onChange={(event) => setAppearances(event.target.value)}
          rows={6}
          spellCheck={false}
          placeholder={'Luffy 12\nZoro 7\nKoby 4'}
          className="mt-1 w-full rounded-lg border hb-border hb-input p-3 font-mono text-sm hb-ink placeholder:text-[#9aa8bf]"
        />
      </div>

      {message && (
        <p
          role="alert"
          className={`text-sm ${message.kind === 'ok' ? 'hb-accent' : 'hb-ko'}`}
        >
          {message.text}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending || reason.trim().length < 10 || !appearances.trim()}
          onClick={submit}
          className="transition-quick flex-1 rounded-lg bg-orange px-3 py-2 text-sm font-semibold hb-on-gold disabled:opacity-50 disabled:hb-ink-soft"
        >
          {pending ? 'Correction…' : 'Appliquer la correction'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border hb-border px-3 py-2 text-sm hb-accent"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
