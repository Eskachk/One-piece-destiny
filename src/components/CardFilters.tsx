'use client';

import { useId } from 'react';
import { RARITY_LABEL, RARITY_ORDER } from '@/domain/collection/rarity';
import {
  TRI_LABEL,
  type Criteres,
  type FiltreRarete,
  type GroupeAttributs,
  type Tri,
} from '@/domain/collection/tri';
import type { Rarity } from '@/domain/types';

/**
 * Barre de recherche et de tri, commune à la Collection et au sélecteur
 * d'équipage.
 *
 * ## Ce qu'elle affiche, et pourquoi
 *
 * Le compte par rareté est **écrit dans chaque option** du filtre. Sans lui,
 * choisir « Mythique » quand on n'en possède aucun donne une grille vide et
 * l'impression d'une panne. Avec, on lit « Mythique (0) » avant de cliquer, et
 * l'on sait que c'est une collection incomplète et non une erreur.
 *
 * ## Sur l'absence de bouton « chercher »
 *
 * La recherche s'applique à la frappe. C'est du filtrage local sur une liste
 * déjà en mémoire : rien n'est demandé au serveur, il n'y a donc rien à
 * déclencher, et un bouton n'ajouterait qu'un geste.
 *
 * Le champ est en `type="search"` : le navigateur y ajoute sa croix
 * d'effacement, que les joueurs connaissent déjà, plutôt qu'un bouton dessiné
 * ici qui ferait la même chose moins bien.
 */
export function CardFilters({
  criteres,
  onChange,
  comptes,
  total,
  affiches,
  /** Rappelle ce qu'on filtre : « cartes », « personnages »… */
  nom = 'carte',
  attributs = [],
  comptesAttributs,
}: {
  criteres: Criteres;
  onChange: (criteres: Criteres) => void;
  comptes: Record<Rarity, number>;
  total: number;
  affiches: number;
  nom?: string;
  /** Pastilles proposées, groupées et ordonnées par le serveur. */
  attributs?: GroupeAttributs[];
  /** Ce que donnerait chaque pastille si on la cochait maintenant. */
  comptesAttributs?: Map<string, number>;
}) {
  const id = useId();
  const filtre =
    criteres.rarete !== 'TOUTES' ||
    criteres.recherche.trim() !== '' ||
    criteres.attributs.length > 0;

  /**
   * Cocher, décocher.
   *
   * On ne retire pas une pastille devenue vide de la liste : elle disparaîtrait
   * sous le doigt au moment du clic suivant, et le joueur perdrait le moyen de
   * revenir en arrière. Elle est simplement désactivée, en gardant sa place.
   */
  const basculer = (attribut: string) => {
    const actifs = criteres.attributs;
    onChange({
      ...criteres,
      attributs: actifs.includes(attribut)
        ? actifs.filter((a) => a !== attribut)
        : [...actifs, attribut],
    });
  };

  return (
    <div className="hb-filtres">
      <div className="hb-filtres__ligne">
        <div className="hb-filtres__champ">
          <label htmlFor={`${id}-q`} className="hb-filtres__label">
            Chercher
          </label>
          <input
            id={`${id}-q`}
            type="search"
            value={criteres.recherche}
            onChange={(e) => onChange({ ...criteres, recherche: e.target.value })}
            placeholder="Un nom…"
            autoComplete="off"
            className="hb-filtres__saisie"
          />
        </div>

        <div className="hb-filtres__champ">
          <label htmlFor={`${id}-r`} className="hb-filtres__label">
            Rareté
          </label>
          <select
            id={`${id}-r`}
            value={criteres.rarete}
            onChange={(e) =>
              onChange({ ...criteres, rarete: e.target.value as FiltreRarete })
            }
            className="hb-filtres__saisie"
          >
            {/*
              « Toutes » compte la **somme des options**, pas le total brut.

              Les comptes par rareté sont contextuels depuis qu'un attribut
              peut être coché : laisser « Toutes (60) » au-dessus de
              « Épique (0), Rare (0), Commun (0) » ferait dire à la liste deux
              choses incompatibles dans le même déroulé.
            */}
            <option value="TOUTES">
              Toutes (
              {RARITY_ORDER.reduce((somme, r) => somme + comptes[r], 0)})
            </option>
            {/* Du plus rare au plus commun : c'est l'ordre dans lequel on
                cherche une carte, pas l'ordre de la table interne. */}
            {[...RARITY_ORDER].reverse().map((r) => (
              <option key={r} value={r}>
                {RARITY_LABEL[r]} ({comptes[r]})
              </option>
            ))}
          </select>
        </div>

        <div className="hb-filtres__champ">
          <label htmlFor={`${id}-t`} className="hb-filtres__label">
            Trier
          </label>
          <select
            id={`${id}-t`}
            value={criteres.tri}
            onChange={(e) => onChange({ ...criteres, tri: e.target.value as Tri })}
            className="hb-filtres__saisie"
          >
            {(Object.keys(TRI_LABEL) as Tri[]).map((t) => (
              <option key={t} value={t}>
                {TRI_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/*
        Les attributs, repliés par défaut.

        Une collection complète en compte une quarantaine : dépliés, ils
        pousseraient la grille de cartes hors de l'écran sur téléphone, pour
        un filtre dont on ne se sert pas à chaque visite. `<details>` est
        l'élément natif pour cela — il se replie au clavier, s'annonce aux
        lecteurs d'écran, et ne coûte pas une ligne d'état.

        Le nombre de critères actifs est écrit dans le résumé : replié, le
        panneau doit dire s'il filtre. Sinon on cherche pourquoi la grille est
        vide sans penser à le rouvrir.
      */}
      {attributs.length > 0 && (
        <details className="hb-filtres__attributs" open={criteres.attributs.length > 0}>
          <summary className="hb-filtres__resume">
            Attributs
            {criteres.attributs.length > 0 && (
              <span className="hb-filtres__badge">{criteres.attributs.length}</span>
            )}
          </summary>

          <p className="hb-filtres__aide">
            Cumulables : chaque attribut ajouté restreint la liste.
          </p>

          {attributs.map((groupe) => (
            <div key={groupe.famille} className="hb-filtres__groupe">
              <span className="hb-filtres__famille">{groupe.titre}</span>
              <div className="hb-filtres__pastilles">
                {groupe.attributs.map((attribut) => {
                  const actif = criteres.attributs.includes(attribut.id);
                  const compte = comptesAttributs?.get(attribut.id) ?? 0;
                  return (
                    <button
                      key={attribut.id}
                      type="button"
                      onClick={() => basculer(attribut.id)}
                      // Une pastille qui ne rendrait rien reste visible mais
                      // ne se clique pas — sauf si elle est déjà cochée, pour
                      // qu'on puisse toujours la décocher.
                      disabled={compte === 0 && !actif}
                      aria-pressed={actif}
                      className={`hb-pastille${actif ? ' hb-pastille--on' : ''}`}
                    >
                      <span aria-hidden="true">{attribut.symbol}</span>
                      <span>{attribut.label}</span>
                      <span className="hb-pastille__n">{compte}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </details>
      )}

      {/*
        Le compte est annoncé aux lecteurs d'écran (`role="status"`) : sans
        cela, taper dans le champ ne produit aucun retour audible, et rien ne
        dit si la recherche a trouvé quelque chose.
      */}
      <p role="status" className="hb-filtres__compte">
        {affiches === total
          ? `${total} ${nom}${total > 1 ? 's' : ''}`
          : `${affiches} ${nom}${affiches > 1 ? 's' : ''} sur ${total}`}
        {filtre && (
          <button
            type="button"
            onClick={() =>
              onChange({
                ...criteres,
                recherche: '',
                rarete: 'TOUTES',
                attributs: [],
              })
            }
            className="hb-link ml-2 text-xs"
          >
            Tout afficher
          </button>
        )}
      </p>
    </div>
  );
}
