'use client';

import { attempt } from './attempt';
import { useEffect, useState, useTransition } from 'react';
import {
  previewAppearances,
  publishResults,
  validateAppearances,
  type AppearancePreview,
} from '@/app/actions/admin';
import { suggestAppearances } from '@/app/actions/simulate';

/**
 * Import rapide + prévisualisation (cahier §6.3, §7).
 *
 * Le parseur est pur : on l'exécute côté navigateur pour un retour immédiat.
 * La validation refait le même travail côté serveur — cet aperçu n'engage
 * rien.
 */
export function AppearanceImportForm({
  teamsLocked,
  alreadyPublished,
}: {
  teamsLocked: boolean;
  alreadyPublished: boolean;
}) {
  const [raw, setRaw] = useState('');
  const [feedback, setFeedback] = useState<
    { kind: 'ok' | 'error'; message: string } | null
  >(null);
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  // Comptage assisté (§7) : une proposition statistique, pas une lecture du
  // chapitre. Elle pré-remplit le champ, l'administrateur corrige.
  const suggest = () => {
    startTransition(async () => {
      const result = await attempt(suggestAppearances());
      if (result.ok) {
        setRaw(result.text);
        setNote(result.note);
        setFeedback(null);
      } else {
        setNote(null);
        setFeedback({ kind: 'error', message: result.error });
      }
    });
  };

  // Prévisualisation calculée **côté serveur**.
  //
  // Elle se faisait dans le navigateur, ce qui imposait d'embarquer les 790
  // personnages dans le bundle client (235 Ko) et de reparcourir tout le
  // référentiel à chaque frappe. Un délai de 400 ms évite un aller-retour par
  // caractère tout en gardant la saisie réactive.
  const [preview, setPreview] = useState<AppearancePreview>({
    appearances: [],
    issues: [],
  });

  useEffect(() => {
    if (raw.trim() === '') {
      setPreview({ appearances: [], issues: [] });
      return;
    }

    const timer = setTimeout(() => {
      void previewAppearances(raw)
        .then(setPreview)
        // Un échec de prévisualisation n'est pas bloquant : la validation
        // reparse de toute façon côté serveur.
        .catch(() => setPreview({ appearances: [], issues: [] }));
    }, 400);

    return () => clearTimeout(timer);
  }, [raw]);

  const run = (action: () => Promise<{ ok: boolean } & Record<string, unknown>>) => {
    startTransition(async () => {
      const result = await attempt(action());
      setFeedback(
        result.ok
          ? { kind: 'ok', message: String(result.message) }
          : { kind: 'error', message: String(result.error) },
      );
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <label
          htmlFor="import"
          className="block text-xs uppercase tracking-widest hb-ink-soft"
        >
          Personnages présents
        </label>
        <p className="mt-1 text-[11px] hb-ink-soft">
          Un nom par ligne. Seule la présence compte — inutile de compter les
          cases.
        </p>
        <button
          type="button"
          onClick={suggest}
          disabled={pending}
          className="mt-1 text-xs hb-accent underline disabled:opacity-40"
        >
          Proposer une liste d'après l'historique
        </button>
        {note && (
          <p className="mt-1 text-[11px] hb-ink-soft">{note}</p>
        )}
        <textarea
          id="import"
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          rows={8}
          spellCheck={false}
          // Un nom par ligne, sans nombre : depuis le moteur v2, seule la
          // présence compte. Un nombre reste toléré et ignoré, pour que
          // d'anciennes notes se collent encore telles quelles.
          placeholder={'Luffy\nZoro\nSanji\nBartolomeo'}
          className="mt-2 w-full rounded-lg border hb-border hb-input p-3 font-mono text-sm hb-ink placeholder:text-[#9aa8bf]"
        />
      </div>

      {raw.trim() && (
        <div className="grid gap-4 sm:grid-cols-2">
          <section>
            <h3 className="text-xs uppercase tracking-widest hb-accent">
              Reconnus ({preview.appearances.length})
            </h3>
            <ul className="mt-2 space-y-1 font-mono text-sm">
              {preview.appearances.map((appearance) => (
                <li
                  key={appearance.characterId}
                  className="flex justify-between hb-ink"
                >
                  <span>
                    {appearance.name}
                  </span>
                  {/* Une coche, pas un nombre : le v2 ne compte plus, et
                      afficher « 1 » partout ferait croire à un comptage. */}
                  <span className="hb-accent" aria-label="présent">✓</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="text-xs uppercase tracking-widest hb-warn">
              Anomalies ({preview.issues.length})
            </h3>
            {preview.issues.length === 0 ? (
              <p className="mt-2 text-sm hb-ink-soft">Aucune.</p>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {preview.issues.map((issue) => (
                  <li key={`${issue.line}-${issue.kind}`} className="hb-ko">
                    <span className="font-mono hb-ink-soft">
                      L{issue.line}
                    </span>{' '}
                    {issue.message}
                    {issue.candidates && (
                      <span className="block text-xs hb-ink-soft">
                        Candidats : {issue.candidates.join(', ')}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending || preview.appearances.length === 0}
          onClick={() => run(() => validateAppearances(raw))}
          className="transition-quick rounded-lg border hb-border px-4 py-2 text-sm hb-accent disabled:opacity-40"
        >
          Valider les présences
        </button>

        <button
          type="button"
          disabled={pending || !teamsLocked || alreadyPublished}
          onClick={() => run(publishResults)}
          className="transition-quick rounded-lg hb-goldfill px-4 py-2 text-sm font-semibold hb-on-gold disabled:opacity-50 disabled:hb-ink-soft"
          title={
            alreadyPublished
              ? 'Résultats déjà publiés'
              : teamsLocked
                ? undefined
                : 'Les équipages ne sont pas encore verrouillés'
          }
        >
          Publier les résultats
        </button>
      </div>

      {feedback && (
        <p
          role="status"
          className={`text-sm ${
            feedback.kind === 'ok' ? 'hb-accent' : 'hb-ko'
          }`}
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
}
