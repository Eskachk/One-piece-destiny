'use client';

import { useState, useTransition } from 'react';
import { attempt } from './attempt';
import {
  createLeagueAction,
  joinLeagueAction,
  leaveLeagueAction,
} from '@/app/actions/league';
import {
  MAX_LIGUES_PAR_JOUEUR,
  MAX_MEMBRES,
  NOM_MAX,
  type RangLigue,
} from '@/domain/league/league';

/**
 * Ligues privées, sur la page du classement.
 *
 * ## Pourquoi ici, et pas dans un onglet à part
 *
 * La barre de navigation en compte déjà six ; une septième les réduirait tous
 * sur téléphone. Et surtout, une ligue **est** un classement : le joueur qui
 * la cherche vient là.
 *
 * ## Ce que ce composant ne fait pas
 *
 * Il ne calcule aucun rang. Les classements arrivent déjà ordonnés du serveur,
 * où le score a été lu ; il ne fait qu'afficher et poster trois actions. Le
 * client ne doit jamais être le lieu où l'on décide qui a gagné.
 */

export interface LigueVue {
  id: string;
  nom: string;
  code: string;
  membres: number;
  proprietaire: boolean;
  /** Membres classés pour le chapitre publié, dans l'ordre. */
  classement: RangLigue[];
  /** Membres qui n'ont pas joué ce chapitre. */
  absents: { playerId: string; handle: string }[];
}

export function LeaguePanel({
  ligues,
  moi,
  chapitre,
}: {
  ligues: LigueVue[];
  /** Identifiant du visiteur, pour surligner sa ligne. */
  moi: string | null;
  /** Numéro du chapitre classé, ou `null` si aucun n'est publié. */
  chapitre: number | null;
}) {
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [nouveauCode, setNouveauCode] = useState<string | null>(null);
  const [nom, setNom] = useState('');
  const [code, setCode] = useState('');

  const complet = ligues.length >= MAX_LIGUES_PAR_JOUEUR;

  /*
   * Union discriminée plutôt qu'un objet à champs optionnels.
   *
   * Avec `{ ok: boolean; error?: string }`, TypeScript ne rétrécit rien après
   * le test : `error` reste peut-être absent dans la branche d'échec, et l'on
   * finit par afficher `undefined`. La forme ci-dessous est celle que les
   * actions renvoient réellement.
   */
  const lancer = (
    action: () => Promise<
      { ok: true; code?: string } | { ok: false; error: string }
    >,
  ) => {
    setErreur(null);
    startTransition(async () => {
      const resultat = await attempt(action());
      if (!resultat.ok) {
        setErreur(resultat.error);
        return;
      }
      // Le code d'une ligue tout juste créée est montré une fois, en clair :
      // c'est la seule chose à partager, et le retrouver ensuite demande de
      // dérouler la liste.
      setNouveauCode(resultat.code ?? null);
      setNom('');
      setCode('');
    });
  };

  return (
    <section className="mt-8">
      <h2 className="hb-legend">Tes ligues</h2>
      <p className="hb-muted mt-1 text-xs">
        Le même classement, entre gens que tu connais. Une ligue ne rapporte ni
        Berries ni coffres — seulement un rang.
      </p>

      {ligues.length === 0 && (
        <p className="hb-card mt-3 text-sm">
          Tu n’as pas encore de ligue. Crée la tienne et partage son code, ou
          entre celui qu’on t’a donné.
        </p>
      )}

      {ligues.map((ligue) => (
        <article key={ligue.id} className="hb-card mt-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-semibold">{ligue.nom}</span>
            <span className="hb-legend">
              {ligue.membres}/{MAX_MEMBRES} membres
            </span>
          </div>

          <p className="hb-muted mt-1 text-xs">
            Code d’invitation <span className="hb-num">{ligue.code}</span>
          </p>

          {chapitre === null ? (
            <p className="hb-muted mt-3 text-sm">
              Aucun chapitre publié : le classement de la ligue apparaîtra après
              la première publication.
            </p>
          ) : ligue.classement.length === 0 ? (
            <p className="hb-muted mt-3 text-sm">
              Personne n’a joué le chapitre {chapitre} dans cette ligue.
            </p>
          ) : (
            <ol className="mt-3 space-y-1">
              {ligue.classement.map((ligne) => (
                <li
                  key={ligne.playerId}
                  className={`flex items-baseline justify-between rounded-lg px-3 py-1.5 ${
                    ligne.playerId === moi ? 'hb-row hb-row--mine' : 'hb-row'
                  }`}
                >
                  <span className="text-sm">
                    <span className="hb-muted mr-2 font-mono">#{ligne.rang}</span>
                    {ligne.handle}
                  </span>
                  <span className="hb-num text-sm">{ligne.total}</span>
                </li>
              ))}
            </ol>
          )}

          {/* Les absents sont nommés plutôt que classés derniers à zéro : ils
              n'ont pas joué, ce qui n'est pas la même chose qu'avoir raté. */}
          {ligue.absents.length > 0 && (
            <p className="hb-muted mt-2 text-xs">
              N’ont pas joué :{' '}
              {ligue.absents.map((a) => a.handle).join(', ')}
            </p>
          )}

          <button
            type="button"
            onClick={() => lancer(() => leaveLeagueAction(ligue.id))}
            disabled={pending}
            className="hb-link mt-3 text-xs"
          >
            Quitter cette ligue
          </button>
        </article>
      ))}

      {!complet && (
        <div className="hb-card mt-3">
          <label className="hb-filtres__label" htmlFor="ligue-nom">
            Créer une ligue
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="ligue-nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              maxLength={NOM_MAX}
              placeholder="Les Chapeaux de Paille"
              className="hb-filtres__saisie"
            />
            <button
              type="button"
              onClick={() => lancer(() => createLeagueAction(nom))}
              disabled={pending || nom.trim().length === 0}
              className="hb-btn"
            >
              Créer
            </button>
          </div>

          <label className="hb-filtres__label mt-4 block" htmlFor="ligue-code">
            Rejoindre avec un code
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="ligue-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={16}
              placeholder="A7K2M9"
              // `characters` plutôt qu'un clavier numérique : le code mêle
              // chiffres et lettres.
              autoCapitalize="characters"
              autoComplete="off"
              className="hb-filtres__saisie"
            />
            <button
              type="button"
              onClick={() => lancer(() => joinLeagueAction(code))}
              disabled={pending || code.trim().length === 0}
              className="hb-btn"
            >
              Rejoindre
            </button>
          </div>
        </div>
      )}

      {complet && (
        <p className="hb-muted mt-3 text-xs">
          Tu appartiens à {MAX_LIGUES_PAR_JOUEUR} ligues, le maximum. Quittes-en
          une pour en rejoindre une autre.
        </p>
      )}

      {nouveauCode && (
        <p role="status" className="hb-card mt-3 text-sm">
          Ligue créée. Son code est <span className="hb-num">{nouveauCode}</span>{' '}
          — partage-le pour qu’on te rejoigne.
        </p>
      )}

      {erreur && (
        <p role="alert" className="hb-card mt-3 text-sm">
          {erreur}
        </p>
      )}
    </section>
  );
}
