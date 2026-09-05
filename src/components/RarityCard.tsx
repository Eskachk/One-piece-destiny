import type { ReactNode } from 'react';
import type { Rarity } from '@/domain/types';
import type { Attribute } from '@/domain/collection/attributes';
import {
  decrireRecurrence,
  type Recurrence,
} from '@/domain/chapter/recurrence';
import { RARITY_COLOR, RARITY_LABEL } from '@/domain/collection/rarity';
import { CharacterArt } from './CharacterArt';

/**
 * Carte de personnage (cahier §24, §111, §122).
 *
 * Une seule carte pour toute l'application — collection, ouverture de coffre,
 * Market. Trois rendus différents auraient fini par diverger, et la couleur
 * d'une rareté est précisément le genre de repère qui ne supporte pas de
 * varier d'un écran à l'autre.
 *
 * La rareté est portée **trois fois** : par la couleur du liseré, par le
 * halo, et par le libellé écrit en toutes lettres. La redondance est
 * volontaire : un joueur daltonien lit la carte aussi bien qu'un autre.
 *
 * L'illustration monte avec la rareté — rien pour un Commun, un pictogramme
 * pour un Rare, un portrait en pixels pour un Épique, une figurine pour un
 * Légendaire, la même avec ses effets pour un Mythique. C'est ce qui donne au
 * tirage un contenu visible : deux cartes ne se distinguaient jusqu'ici que
 * par la couleur de leur liseré.
 *
 * §122 : aucun visuel de l'œuvre. Les attributs sont des pictogrammes
 * Unicode et l'illustration est **générée** à partir de l'identifiant du
 * personnage (`domain/collection/portrait.ts`) — aucune planche, aucun
 * décalque.
 */
export function RarityCard({
  characterId,
  name,
  rarity,
  attributes,
  recurrence,
  serial,
  footer,
}: {
  /** Sert de graine à l'illustration : le même personnage donne la même image. */
  characterId: string;
  name: string;
  rarity: Rarity;
  attributes: Attribute[];
  /**
   * Présence du personnage dans les derniers chapitres publiés.
   *
   * C'est la seule information de la carte qui serve à **décider** plutôt qu'à
   * admirer : le jeu demande de prédire qui paraîtra, et jusqu'ici le joueur
   * choisissait sans rien savoir de qui paraît d'habitude.
   */
  recurrence?: Recurrence;
  /** Identité de l'exemplaire, si la carte en possède une. */
  serial?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <article
      className="hb-rcard"
      style={{ ['--rarity' as string]: RARITY_COLOR[rarity] }}
    >
      <CharacterArt
        characterId={characterId}
        rarity={rarity}
        attributes={attributes}
      />

      <div className="hb-rcard__head">
        <span className="hb-rcard__name">{name}</span>
        <span className="hb-rcard__rarity">{RARITY_LABEL[rarity]}</span>
      </div>

      {attributes.length > 0 && (
        <ul className="hb-rcard__attrs">
          {attributes.map((attribute) => (
            <li key={attribute.id} className="hb-attr" title={attribute.label}>
              <span aria-hidden="true">{attribute.symbol}</span>
              {/* Le symbole seul n'est pas lisible par un lecteur d'écran, et
                  ne survit pas à une police dépourvue d'emoji. Le nom est
                  donc toujours présent dans le document. */}
              <span className="hb-attr__label">{attribute.label}</span>
            </li>
          ))}
        </ul>
      )}

      {/*
        La récurrence, en bas de carte.

        Un rapport suffit à l'œil — « 7/10 » se lit sans phrase — mais il ne
        dit rien à qui écoute la page. La phrase complète est donc présente
        pour les lecteurs d'écran et en infobulle (§111).

        On l'affiche **aussi quand elle vaut zéro** : « jamais vu sur les dix
        derniers » est une information, et souvent la plus utile de la carte.
      */}
      {recurrence && recurrence.observes > 0 && (
        <p
          className={`hb-recurrence${recurrence.vus === 0 ? ' hb-recurrence--nulle' : ''}`}
          title={decrireRecurrence(recurrence)}
        >
          <span aria-hidden="true">
            📖 {recurrence.vus}/{recurrence.observes}
          </span>
          <span className="sr-only">{decrireRecurrence(recurrence)}</span>
        </p>
      )}

      {serial}
      {footer}
    </article>
  );
}
