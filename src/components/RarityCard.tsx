import type { ReactNode } from 'react';
import type { Rarity } from '@/domain/types';
import type { Attribute } from '@/domain/collection/attributes';
import { RARITY_COLOR, RARITY_LABEL } from '@/domain/collection/rarity';

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
 * §122 : aucun visuel de l'œuvre. Les attributs sont des pictogrammes
 * Unicode dérivés des données factuelles du personnage, pas des illustrations.
 */
export function RarityCard({
  name,
  rarity,
  attributes,
  serial,
  footer,
}: {
  name: string;
  rarity: Rarity;
  attributes: Attribute[];
  /** Identité de l'exemplaire, si la carte en possède une. */
  serial?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <article
      className="hb-rcard"
      style={{ ['--rarity' as string]: RARITY_COLOR[rarity] }}
    >
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

      {serial}
      {footer}
    </article>
  );
}
