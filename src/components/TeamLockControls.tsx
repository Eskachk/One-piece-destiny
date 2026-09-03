'use client';

import { useState, useTransition } from 'react';
import { attempt } from './attempt';
import { migrateOpenChapterEngine, setTeamLockAt } from '@/app/actions/admin';

/**
 * Verrouillage des équipages, à la main (cahier §2.2, §76).
 *
 * ## Pourquoi ce levier existe
 *
 * L'échéance est posée à l'ouverture du chapitre — « le prochain dimanche
 * 23:59:59 » — et plus rien ne la déplaçait ensuite. Un chapitre ouvert la
 * semaine précédente portait donc une échéance déjà passée : les équipages
 * étaient verrouillés un mercredi, alors que le dimanche n'était pas arrivé.
 *
 * Et le seul réglage qui en avait l'air, l'ancrage du calendrier, n'y touche
 * pas — il ne sert qu'à déduire des **numéros**. On posait la bonne date, on
 * revenait sur l'Équipage, et tout restait verrouillé sans que rien ne
 * l'explique.
 *
 * ## Ce que la règle reste
 *
 * La règle du produit ne change pas : dimanche 23:59:59, heure de Paris, et la
 * sortie du chapitre n'y fait rien. Ceci n'est pas une dérogation, c'est le
 * moyen de **remettre** l'échéance là où la règle la veut quand elle a dérivé —
 * plus le verrou immédiat, qui sert à figer les équipes avant une publication
 * anticipée.
 */

function Message({ message }: { message: { ok: boolean; text: string } | null }) {
  if (!message) return null;
  return (
    <p
      role="status"
      className={`mt-3 text-sm ${message.ok ? 'text-turquoise' : 'text-danger'}`}
    >
      {message.text}
    </p>
  );
}

/** `datetime-local` attend « AAAA-MM-JJTHH:MM », en heure locale. */
function pourChamp(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

export function TeamLockControls({
  lockAt,
  nextSunday,
  locked,
  chapterNumber,
  scoringVersion,
  currentScoringVersion,
}: {
  /** Échéance actuelle du chapitre ouvert, en ISO. */
  lockAt: string;
  /** Le prochain dimanche 23:59:59 heure de Paris, calculé par le serveur. */
  nextSunday: string;
  /** Les équipages sont-ils verrouillés à cet instant ? */
  locked: boolean;
  chapterNumber: number;
  /** Moteur avec lequel ce chapitre sera jugé. */
  scoringVersion: string;
  /** Moteur qu'utiliseraient les chapitres ouverts maintenant. */
  currentScoringVersion: string;
}) {
  const [personnalise, setPersonnalise] = useState(() => pourChamp(lockAt));
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const executer = (
    action: () => Promise<{ ok: boolean; message?: string; error?: string }>,
  ) => {
    startTransition(async () => {
      const r: { ok: boolean; message?: string; error?: string } = await attempt(action());
      setMessage(
        r.ok && r.message
          ? { ok: true, text: r.message }
          : { ok: false, text: String(r.error ?? 'Échec.') },
      );
    });
  };

  const lancer = (iso: string) => {
    startTransition(async () => {
      const r: { ok: boolean; message?: string; error?: string } = await attempt(
        setTeamLockAt(iso),
      );
      setMessage(
        r.ok && r.message
          ? { ok: true, text: r.message }
          : { ok: false, text: String(r.error ?? 'Échec.') },
      );
    });
  };

  const dejaBonne = new Date(lockAt).getTime() === new Date(nextSunday).getTime();

  return (
    <div>
      <p className="text-sm text-parchment/75">
        Chapitre {chapterNumber} —{' '}
        {locked ? (
          <strong className="text-orange">équipages verrouillés</strong>
        ) : (
          <strong className="text-turquoise">équipages ouverts</strong>
        )}
        , échéance au{' '}
        <span className="font-mono text-parchment/90">
          {new Date(lockAt).toLocaleString('fr-FR', {
            dateStyle: 'full',
            timeStyle: 'short',
            timeZone: 'Europe/Paris',
          })}
        </span>{' '}
        (Paris).
      </p>

      <Message message={message} />

      {/*
        Le cas courant, mis en avant : l'échéance a dérivé d'une semaine ou
        plus, et on veut la remettre où la règle la place. Un seul clic, et le
        bouton dit la date qu'il va poser — pas « corriger », qui n'apprend
        rien à celui qui hésite.
      */}
      <button
        type="button"
        disabled={pending || dejaBonne}
        aria-busy={pending}
        onClick={() => lancer(nextSunday)}
        className="transition-quick mt-4 w-full rounded-lg bg-treasure px-3 py-2 text-sm font-semibold text-abyss disabled:opacity-40"
      >
        {dejaBonne
          ? 'Déjà calée sur le prochain dimanche'
          : `Rouvrir jusqu’au dimanche ${new Date(nextSunday).toLocaleDateString(
              'fr-FR',
              { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' },
            )} à 23:59`}
      </button>

      <button
        type="button"
        disabled={pending || locked}
        aria-busy={pending}
        onClick={() => lancer(new Date().toISOString())}
        className="transition-quick mt-2 w-full rounded-lg border border-orange/50 px-3 py-2 text-sm text-orange disabled:opacity-40"
      >
        {locked ? 'Déjà verrouillé' : 'Verrouiller maintenant'}
      </button>

      {/* --- Échéance libre ------------------------------------------------ */}
      <div className="mt-5 border-t border-turquoise/10 pt-4">
        <label
          htmlFor="verrou-libre"
          className="block text-xs uppercase tracking-widest text-parchment/60"
        >
          Échéance précise
        </label>
        <p className="mt-1 text-xs text-parchment/50">
          Pour les cas que les deux boutons ne couvrent pas : une pause
          annoncée, un report. Heure de ce navigateur.
        </p>
        <input
          id="verrou-libre"
          type="datetime-local"
          value={personnalise}
          onChange={(event) => setPersonnalise(event.target.value)}
          className="mt-2 w-full rounded-lg border border-turquoise/25 bg-navy/60 px-3 py-2 font-mono text-parchment"
        />
        <button
          type="button"
          disabled={pending || !personnalise}
          aria-busy={pending}
          onClick={() => {
            const d = new Date(personnalise);
            if (Number.isNaN(d.getTime())) {
              setMessage({ ok: false, text: 'Date illisible.' });
              return;
            }
            lancer(d.toISOString());
          }}
          className="transition-quick mt-2 w-full rounded-lg border border-turquoise/40 px-3 py-2 text-sm text-turquoise disabled:opacity-40"
        >
          Poser cette échéance
        </button>
      </div>

      {/* --- Moteur de score --------------------------------------------- */}
      {scoringVersion !== currentScoringVersion && (
        <div className="mt-5 rounded-lg border border-orange/50 bg-orange/10 p-3">
          <p className="text-sm text-parchment/85">
            Ce chapitre sera jugé en <strong>{scoringVersion}</strong>, alors
            que le moteur courant est le <strong>{currentScoringVersion}</strong>.
            Un chapitre garde à vie sa version — c’est ce qui permet de
            recalculer un classement des mois plus tard avec les règles qui
            étaient affichées quand les joueurs ont composé.
          </p>
          <button
            type="button"
            disabled={pending}
            aria-busy={pending}
            onClick={() => executer(migrateOpenChapterEngine)}
            className="transition-quick mt-2 w-full rounded-lg bg-treasure px-3 py-2 text-sm font-semibold text-abyss disabled:opacity-40"
          >
            Passer ce chapitre en {currentScoringVersion}
          </button>
          <p className="mt-2 text-xs text-parchment/50">
            Refusé si le chapitre est publié, ou s’il porte déjà des scores
            calculés par l’ancien moteur : les garder à côté d’une nouvelle
            version promettrait un recalcul qui ne rendrait pas les mêmes
            chiffres.
          </p>
        </div>
      )}

      <p className="mt-4 text-xs text-parchment/45">
        Aucune équipe n’est touchée : rouvrir laisse les joueurs modifier la
        leur, verrouiller la fige telle qu’elle est. Un chapitre déjà publié
        refuse tout déplacement — rouvrir des équipes derrière un classement
        figé serait le moyen le plus simple de fabriquer un tricheur.
      </p>
    </div>
  );
}
