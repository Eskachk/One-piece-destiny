'use client';

import { attempt } from './attempt';
import { useState, useTransition } from 'react';
import { openChapter } from '@/app/actions/admin';

/**
 * Ouverture d'un chapitre (cahier §4.1).
 *
 * Le numéro proposé est pré-rempli mais **modifiable** : c'est le point du
 * cahier. « Précédent + 1 » est une suggestion, pas une vérité — un hiatus ou
 * une renumérotation doivent rester possibles.
 */
export function OpenChapterForm({ proposed }: { proposed: number }) {
  const [value, setValue] = useState(String(proposed));
  const [message, setMessage] = useState<
    { kind: 'ok' | 'error'; text: string } | null
  >(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const result = await attempt(openChapter(Number(value)));
      setMessage(
        result.ok
          ? { kind: 'ok', text: result.message }
          : { kind: 'error', text: result.error },
      );
    });
  };

  return (
    <div>
      <label htmlFor="chapter" className="block text-sm hb-ink-soft">
        Numéro du chapitre
      </label>
      <input
        id="chapter"
        type="number"
        min={1}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className="mt-1 w-full rounded-lg border hb-border hb-input px-3 py-2 font-mono hb-ink"
      />
      <p className="mt-1 text-xs hb-ink-soft">
        Proposé : {proposed}. Corrige-le si le calendrier réel diffère.
      </p>

      {message && (
        <p
          role="status"
          className={`mt-3 text-sm ${message.kind === 'ok' ? 'hb-accent' : 'hb-ko'}`}
        >
          {message.text}
        </p>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={pending || !value}
        className="transition-quick mt-3 w-full rounded-xl hb-goldfill px-4 py-3 font-semibold hb-on-gold disabled:opacity-50"
      >
        {pending ? 'Ouverture…' : 'Ouvrir le chapitre'}
      </button>
    </div>
  );
}
