'use client';

import { useState, useTransition } from 'react';
import { attempt } from './attempt';
import {
  addQuestionAction,
  answerQuestionAdminAction,
  removeQuestionAction,
} from '@/app/actions/admin';
import {
  BONUS_PAR_BONNE_REPONSE,
  MAX_OPTIONS,
  MAX_QUESTIONS,
} from '@/domain/chapter/pronostics';

/**
 * Pronostics secondaires, côté administration.
 *
 * Deux gestes, à deux moments de la semaine :
 *
 *   — à l'ouverture du chapitre, écrire les questions ;
 *   — avant la publication, trancher chaque bonne réponse.
 *
 * Les deux sont sur le même écran, et c'est délibéré : séparés, on oublierait
 * le second. Une question sans réponse tranchée ne rapporte rien à personne —
 * et ne coûte rien non plus, ce que le domaine garantit.
 */

export interface QuestionAdmin {
  id: string;
  prompt: string;
  options: string[];
  answer: number | null;
  /** Combien de joueurs ont répondu, pour savoir si la question a pris. */
  reponses: number;
}

export function QuestionEditor({ questions }: { questions: QuestionAdmin[] }) {
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState(['Oui', 'Non']);
  const [message, setMessage] = useState<
    { kind: 'ok' | 'error'; text: string } | null
  >(null);
  const [pending, startTransition] = useTransition();

  const lancer = (
    action: () => Promise<{ ok: true; message: string } | { ok: false; error: string }>,
    apres?: () => void,
  ) => {
    setMessage(null);
    startTransition(async () => {
      const resultat = await attempt(action());
      if (resultat.ok) {
        setMessage({ kind: 'ok', text: resultat.message });
        apres?.();
      } else {
        setMessage({ kind: 'error', text: resultat.error });
      }
    });
  };

  const complet = questions.length >= MAX_QUESTIONS;
  const sansReponse = questions.filter((q) => q.answer === null).length;

  return (
    <section className="mt-8">
      <h2 className="font-display text-lg text-parchment">
        Pronostics secondaires
      </h2>
      <p className="mt-1 text-xs text-parchment/60">
        {BONUS_PAR_BONNE_REPONSE} Berries par bonne réponse, versés pendant la
        publication. Aucun point au classement.
      </p>

      {/* L'avertissement compte plus que la liste : c'est l'oubli le plus
          probable de la semaine, et il est silencieux. */}
      {sansReponse > 0 && (
        <p className="mt-2 rounded-lg border border-gold/40 bg-gold/10 p-2 text-xs text-parchment">
          ⚠️ {sansReponse} pronostic{sansReponse > 1 ? 's' : ''} sans bonne
          réponse. Tranche-{sansReponse > 1 ? 'les' : 'la'} avant de publier,
          sinon {sansReponse > 1 ? 'ils ne rapporteront' : 'il ne rapportera'}{' '}
          rien.
        </p>
      )}

      {questions.map((question) => (
        <article
          key={question.id}
          className="mt-3 rounded-lg border border-turquoise/25 bg-navy/40 p-3"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-sm text-parchment">{question.prompt}</span>
            <span className="text-xs text-parchment/50">
              {question.reponses} réponse{question.reponses > 1 ? 's' : ''}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            {question.options.map((option, index) => (
              <button
                key={index}
                type="button"
                onClick={() =>
                  lancer(() => answerQuestionAdminAction(question.id, index))
                }
                disabled={pending}
                aria-pressed={question.answer === index}
                className={`hb-pastille${question.answer === index ? ' hb-pastille--on' : ''}`}
              >
                {option}
              </button>
            ))}
          </div>

          <p className="mt-2 text-xs text-parchment/50">
            {question.answer === null
              ? 'Bonne réponse : pas encore tranchée.'
              : `Bonne réponse : ${question.options[question.answer]}`}
          </p>

          <button
            type="button"
            onClick={() => lancer(() => removeQuestionAction(question.id))}
            disabled={pending}
            className="hb-link mt-2 text-xs"
          >
            Retirer
          </button>
        </article>
      ))}

      {!complet && (
        <div className="mt-3 rounded-lg border border-turquoise/25 bg-navy/40 p-3">
          <label className="hb-filtres__label" htmlFor="q-prompt">
            Nouvelle question
          </label>
          <input
            id="q-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Y aura-t-il un flashback dans ce chapitre ?"
            className="hb-filtres__saisie mt-1"
          />

          <div className="mt-2 flex flex-wrap gap-2">
            {options.map((option, index) => (
              <input
                key={index}
                value={option}
                onChange={(e) =>
                  setOptions((actuels) =>
                    actuels.map((o, i) => (i === index ? e.target.value : o)),
                  )
                }
                aria-label={`Choix ${index + 1}`}
                className="hb-filtres__saisie"
                style={{ maxWidth: '10rem' }}
              />
            ))}
            {options.length < MAX_OPTIONS && (
              <button
                type="button"
                onClick={() => setOptions((actuels) => [...actuels, ''])}
                className="hb-link text-xs"
              >
                + un choix
              </button>
            )}
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => setOptions((actuels) => actuels.slice(0, -1))}
                className="hb-link text-xs"
              >
                − un choix
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() =>
              lancer(
                () => addQuestionAction(prompt, options),
                () => {
                  setPrompt('');
                  setOptions(['Oui', 'Non']);
                },
              )
            }
            disabled={pending || prompt.trim().length === 0}
            className="hb-btn mt-3"
          >
            Ajouter
          </button>
        </div>
      )}

      {message && (
        <p
          role={message.kind === 'error' ? 'alert' : 'status'}
          className="mt-2 text-xs text-parchment/80"
        >
          {message.text}
        </p>
      )}
    </section>
  );
}
