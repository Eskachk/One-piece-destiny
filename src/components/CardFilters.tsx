'use client';

import { useId } from 'react';
import { RARITY_LABEL, RARITY_ORDER } from '@/domain/collection/rarity';
import {
  TRI_LABEL,
  type Criteres,
  type FiltreRarete,
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
}: {
  criteres: Criteres;
  onChange: (criteres: Criteres) => void;
  comptes: Record<Rarity, number>;
  total: number;
  affiches: number;
  nom?: string;
}) {
  const id = useId();
  const filtre = criteres.rarete !== 'TOUTES' || criteres.recherche.trim() !== '';

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
            <option value="TOUTES">Toutes ({total})</option>
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
              onChange({ ...criteres, recherche: '', rarete: 'TOUTES' })
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
