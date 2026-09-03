'use client';

import { useState, useTransition } from 'react';
import { attempt } from './attempt';
import { renumberOpenChapter, setChapterAnchorAction } from '@/app/actions/admin';

/**
 * Maîtrise du numéro de chapitre (cahier §4).
 *
 * Deux gestes distincts, et les confondre serait une faute :
 *
 *   — **renuméroter le chapitre ouvert** corrige une erreur de saisie sur la
 *     semaine en cours. Effet immédiat, visible par tous les joueurs ;
 *   — **poser l'ancrage** corrige le *calendrier*, donc toutes les semaines à
 *     venir. Aucun effet sur le chapitre déjà ouvert ni sur un classement
 *     publié.
 *
 * Le second est le seul remède quand le calendrier a dérivé — une pause non
 * annoncée, une renumérotation de l'éditeur. Il était jusqu'ici dans le code :
 * le corriger exigeait un redéploiement, un dimanche soir. Et la source
 * externe ne rattrape rien, elle est figée au chapitre 1085.
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

export function ChapterNumberControls({
  openChapterNumber,
  calendarNumber,
  anchor,
  anchorIsStored,
}: {
  /** Chapitre ouvert, ou `null` s'il n'y en a pas. */
  openChapterNumber: number | null;
  /**
   * Ce que le calendrier déduit de l'ancrage, aujourd'hui.
   *
   * C'est le chiffre qui manquait : poser un ancrage ne change **pas** le
   * chapitre déjà ouvert, et rien ne le disait assez fort. On posait un
   * ancrage, on retournait sur l'onglet Équipage, et le numéro n'avait pas
   * bougé — sans comprendre pourquoi.
   */
  calendarNumber: number;
  anchor: { chapterNumber: number; weekOf: string };
  /** L'ancrage vient-il de la base, ou du repli codé en dur ? */
  anchorIsStored: boolean;
}) {
  const [numero, setNumero] = useState(String(openChapterNumber ?? ''));
  const [ancreNumero, setAncreNumero] = useState(String(anchor.chapterNumber));
  const [ancreJour, setAncreJour] = useState(anchor.weekOf);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const lancer = (
    action: () => Promise<{ ok: boolean; message?: string; error?: string }>,
  ) => {
    startTransition(async () => {
      const r = await attempt(action());
      setMessage(
        r.ok && r.message
          ? { ok: true, text: r.message }
          : { ok: false, text: String(r.error ?? 'Échec.') },
      );
    });
  };

  return (
    <div className="space-y-6">
      <Message message={message} />

      {/*
        L'écart entre ce que le calendrier déduit et ce qui est réellement
        ouvert. C'est le seul endroit où les deux réglages se rencontrent, et
        le bouton fait en un clic ce que la lecture de deux paragraphes
        laissait deviner.
      */}
      {openChapterNumber !== null && calendarNumber !== openChapterNumber && (
        <div className="rounded-lg border border-orange/50 bg-orange/10 p-3">
          <p className="text-sm text-parchment/85">
            Le calendrier en est au <strong>chapitre {calendarNumber}</strong>,
            mais le chapitre ouvert est le{' '}
            <strong>{openChapterNumber}</strong>. Poser un ancrage ne touche
            jamais à un chapitre déjà ouvert — c’est ce bouton qui le corrige,
            et c’est lui que voient les joueurs.
          </p>
          <button
            type="button"
            disabled={pending}
            aria-busy={pending}
            onClick={() => lancer(() => renumberOpenChapter(calendarNumber))}
            className="transition-quick mt-2 w-full rounded-lg bg-treasure px-3 py-2 text-sm font-semibold text-abyss disabled:opacity-40"
          >
            Passer le chapitre ouvert au {calendarNumber}
          </button>
        </div>
      )}

      {/* --- Chapitre ouvert -------------------------------------------- */}
      <section>
        <h3 className="text-xs uppercase tracking-widest text-parchment/60">
          Chapitre ouvert
        </h3>

        {openChapterNumber === null ? (
          <p className="mt-2 text-sm text-parchment/60">
            Aucun chapitre ouvert. Le numéro se saisit à l’ouverture.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-parchment/70">
              Actuellement le <strong>chapitre {openChapterNumber}</strong>.
              Corrige-le si c’est le mauvais — les joueurs le voient tout de
              suite.
            </p>
            <input
              type="number"
              min={1}
              max={9999}
              value={numero}
              onChange={(event) => setNumero(event.target.value)}
              aria-label="Nouveau numéro du chapitre ouvert"
              className="mt-2 w-full rounded-lg border border-turquoise/25 bg-navy/60 px-3 py-2 font-mono text-parchment"
            />
            <button
              type="button"
              disabled={pending || !numero || Number(numero) === openChapterNumber}
              aria-busy={pending}
              onClick={() => lancer(() => renumberOpenChapter(Number(numero)))}
              className="transition-quick mt-2 w-full rounded-lg border border-turquoise/40 px-3 py-2 text-sm text-turquoise disabled:opacity-40"
            >
              Renuméroter le chapitre ouvert
            </button>
          </>
        )}
      </section>

      {/* --- Ancrage du calendrier --------------------------------------- */}
      <section className="border-t border-turquoise/10 pt-5">
        <h3 className="text-xs uppercase tracking-widest text-parchment/60">
          Ancrage du calendrier
        </h3>

        <p className="mt-2 text-sm text-parchment/70">
          « Le chapitre N a été verrouillé le dimanche D. » Le site en déduit
          tous les numéros suivants, une semaine à la fois.
        </p>

        <p className="mt-2 text-xs text-parchment/50">
          {anchorIsStored
            ? 'Ancrage enregistré en base.'
            : 'Aucun ancrage enregistré : le site utilise celui du code. Pose-en un pour reprendre la main.'}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label
              htmlFor="ancre-numero"
              className="block text-xs text-parchment/60"
            >
              Chapitre
            </label>
            <input
              id="ancre-numero"
              type="number"
              min={1}
              max={9999}
              value={ancreNumero}
              onChange={(event) => setAncreNumero(event.target.value)}
              className="mt-1 w-full rounded-lg border border-turquoise/25 bg-navy/60 px-3 py-2 font-mono text-parchment"
            />
          </div>
          <div>
            <label htmlFor="ancre-jour" className="block text-xs text-parchment/60">
              Dimanche de verrouillage
            </label>
            <input
              id="ancre-jour"
              type="date"
              value={ancreJour}
              onChange={(event) => setAncreJour(event.target.value)}
              className="mt-1 w-full rounded-lg border border-turquoise/25 bg-navy/60 px-3 py-2 font-mono text-parchment"
            />
          </div>
        </div>

        <p className="mt-2 text-xs text-parchment/50">
          L’heure n’est pas demandée : le verrouillage tombe chaque semaine à
          23:59:59, heure de Paris.
        </p>

        <button
          type="button"
          disabled={pending || !ancreNumero || !ancreJour}
          aria-busy={pending}
          onClick={() =>
            lancer(() => setChapterAnchorAction(Number(ancreNumero), ancreJour))
          }
          className="transition-quick mt-3 w-full rounded-lg bg-treasure px-3 py-2 text-sm font-semibold text-abyss disabled:opacity-40"
        >
          Poser l’ancrage
        </button>

        <p className="mt-2 text-xs text-parchment/45">
          <strong>Sans effet immédiat sur ce que voient les joueurs.</strong>{' '}
          L’ancrage sert à déduire les numéros à venir ; il ne touche ni au
          chapitre déjà ouvert ni à un classement publié — une correction de
          calendrier ne doit pas pouvoir réécrire un résultat. Pour changer le
          numéro affiché maintenant, utilise « Renuméroter » ci-dessus.
        </p>
      </section>
    </div>
  );
}
