'use client';

import { useState, useTransition } from 'react';
import { attempt } from './attempt';
import { answerQuestionAction } from '@/app/actions/pronostics';
import { BONUS_PAR_BONNE_REPONSE } from '@/domain/chapter/pronostics';

/**
 * Pronostics secondaires de la semaine.
 *
 * ## Ce que ce composant ne reçoit pas
 *
 * **La bonne réponse.** Elle est retirée côté serveur avant l'envoi, pas
 * masquée à l'affichage : ce qui part dans la charge d'une page rendue par le
 * serveur est lisible par quiconque ouvre les outils de développement (§3).
 *
 * ## Pourquoi chaque choix s'enregistre seul
 *
 * Pas de bouton « valider ». Chaque clic écrit la réponse, comme le
 * verrouillage d'équipage écrit l'équipage — et pour la même raison : un
 * formulaire qu'on remplit sans l'envoyer est un formulaire perdu au premier
 * onglet fermé. On peut changer d'avis jusqu'au verrouillage.
 */

export interface QuestionVue {
  id: string;
  prompt: string;
  options: string[];
  /** Le choix déjà enregistré, s'il y en a un. */
  choix: number | null;
}

export function PronosticPanel({
  questions,
  ouvert,
}: {
  questions: QuestionVue[];
  /** Le chapitre accepte-t-il encore des réponses ? */
  ouvert: boolean;
}) {
  const [reponses, setReponses] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(questions.map((q) => [q.id, q.choix])),
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (questions.length === 0) return null;

  const repondre = (questionId: string, choix: number) => {
    if (!ouvert) return;
    const precedent = reponses[questionId] ?? null;

    // Optimiste : la pastille se remplit tout de suite. Attendre le serveur
    // pour un choix parmi trois donne l'impression d'un clic qui n'a pas pris.
    setReponses((actuel) => ({ ...actuel, [questionId]: choix }));
    setErreur(null);

    startTransition(async () => {
      const resultat = await attempt(answerQuestionAction(questionId, choix));
      if (!resultat.ok) {
        // Retour à l'état précédent : une réponse affichée mais non
        // enregistrée est pire que pas de réponse du tout.
        setReponses((actuel) => ({ ...actuel, [questionId]: precedent }));
        setErreur(resultat.error);
      }
    });
  };

  const repondues = questions.filter((q) => reponses[q.id] !== null).length;

  return (
    <section className="mt-8">
      <h2 className="hb-legend">Pronostics de la semaine</h2>
      <p className="hb-muted mt-1 text-xs">
        {BONUS_PAR_BONNE_REPONSE} Berries par bonne réponse, versés à la
        publication. Ces questions ne rapportent aucun point au classement.
      </p>

      {questions.map((question) => (
        <fieldset key={question.id} className="hb-card mt-3">
          <legend className="text-sm font-semibold">{question.prompt}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {question.options.map((option, index) => {
              const choisi = reponses[question.id] === index;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => repondre(question.id, index)}
                  disabled={!ouvert || pending}
                  aria-pressed={choisi}
                  className={`hb-pastille${choisi ? ' hb-pastille--on' : ''}`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <p role="status" className="hb-muted mt-2 text-xs">
        {ouvert
          ? `${repondues} sur ${questions.length} répondue${repondues > 1 ? 's' : ''}. Tu peux changer d’avis jusqu’au verrouillage.`
          : 'Les pronostics sont fermés. Réponses et bonus à la publication.'}
      </p>

      {erreur && (
        <p role="alert" className="hb-card mt-2 text-sm">
          {erreur}
        </p>
      )}
    </section>
  );
}
