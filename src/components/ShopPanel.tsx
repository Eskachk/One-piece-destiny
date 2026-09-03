'use client';

import { useState, useTransition } from 'react';
import { attempt } from './attempt';
import { startCheckoutAction } from '@/app/actions/shop';
import {
  IconChest,
  IconCharacter,
  IconPouch,
  IconRoyalChest,
} from './ShopIcons';

/**
 * Boutique en argent réel (cahier §113, §114).
 *
 * Trois règles de présentation, et elles viennent toutes du §113 :
 *
 *   — **le prix est affiché en euros, en toutes lettres**, jamais masqué
 *     derrière une monnaie intermédiaire. « 14,99 € » se comprend ;
 *     « 1 500 gemmes » ne se compare à rien ;
 *   — **ce qu'on reçoit est écrit avant l'achat**, pas après ;
 *   — **aucune urgence fabriquée.** Pas de « plus que 2 en stock », pas de
 *     minuterie qui redémarre à chaque visite, pas de rabais permanent
 *     présenté comme exceptionnel : ce sont des procédés qui poussent à
 *     acheter vite plutôt qu'à acheter en connaissance de cause.
 *
 * L'offre de lancement ne relève pas de ce dernier point, et la distinction
 * mérite d'être posée : elle a une **date de fin réelle**, la même pour tout le
 * monde, écrite en toutes lettres et lisible sans acheter. Un prix barré
 * accompagné d'une échéance vérifiable est une information ; un prix barré
 * permanent est un mensonge. C'est pourquoi le prix d'origine n'est affiché
 * que pendant la fenêtre, et jamais reconstitué après coup.
 */

export interface ShopProduct {
  id: string;
  category: string;
  label: string;
  price: string;
  description: string;
  /** Couleur de rareté du personnage vendu, résolue côté serveur. */
  rarityColor: string | null;
  rarityLabel: string | null;
  /**
   * Prix avant remise, seulement si le produit est remisé en ce moment.
   *
   * `null` le reste du temps : le composant ne sait pas reconstituer un prix
   * barré, et c'est voulu — il ne peut donc pas en afficher un par erreur.
   */
  fullPrice: string | null;
}

/**
 * Emblème d'un produit.
 *
 * Le coffre royal a le sien : c'est le seul dont l'apparence en jeu diffère,
 * et la fiche doit le montrer avant l'achat plutôt qu'après.
 */
function ProductIcon({ product }: { product: ShopProduct }) {
  if (product.category === 'CHARACTER') {
    return <IconCharacter className="hb-shop__icon" />;
  }
  if (product.category === 'COINS') {
    return <IconPouch className="hb-shop__icon" />;
  }
  return product.id === 'royal_chest' ? (
    <IconRoyalChest className="hb-shop__icon" />
  ) : (
    <IconChest className="hb-shop__icon" />
  );
}

/**
 * Rayons, dans leur ordre d'affichage.
 *
 * Les coffres d'abord : c'est le produit que le joueur connaît déjà, celui
 * qu'il ouvre chaque semaine. Les personnages en dernier, parce que c'est le
 * seul achat qui court-circuite la collection — on ne le met pas en vitrine.
 */
const SECTIONS: { key: string; title: string; blurb: string }[] = [
  {
    key: 'CHEST',
    title: 'Coffres',
    blurb:
      'Mêmes probabilités que les coffres gagnés en jeu. Le coffre royal ajoute une garantie et sa propre cérémonie.',
  },
  {
    key: 'COINS',
    title: 'Berries',
    blurb:
      'La monnaie du jeu. Elle n’ouvre que de la collection : aucun bonus de score n’est en vente.',
  },
  {
    key: 'CHARACTER',
    title: 'Personnages',
    blurb:
      'Des Légendaires nommés, tous obtenables gratuitement en coffre. L’achat abrège, il n’ouvre rien d’exclusif.',
  },
];

export function ShopPanel({
  products,
  enabled,
  disabledReason,
  promotion,
}: {
  products: ShopProduct[];
  /** Les paiements réels sont-ils ouverts ? */
  enabled: boolean;
  disabledReason: string;
  /** Offre de lancement en cours, ou `null`. Décidée côté serveur. */
  promotion: { discount: number; daysLeft: number; endsOn: string } | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const buy = (productId: string) => {
    startTransition(async () => {
      setError(null);
      const result = await attempt(startCheckoutAction(productId));
      if (result.ok) {
        // Redirection vers le prestataire. La page de paiement est la sienne :
        // aucune donnée bancaire ne transite par ce site.
        window.location.href = result.url;
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div>
      {/*
        Bandeau d'offre, tout en haut de la page.

        Il dit trois choses et s'arrête là : la remise, ce qu'elle couvre, et
        quand elle finit. Pas de minuterie à la seconde — elle donnerait à une
        offre d'une semaine l'allure d'une vente flash, et pousserait à décider
        vite là où il n'y a aucune raison de se presser.
      */}
      {promotion && (
        <p className="hb-promo" role="status">
          <span className="hb-promo__badge">−{promotion.discount} %</span>
          <span>
            <strong>Offre de lancement sur les coffres.</strong>{' '}
            La première semaine seulement — jusqu&apos;au {promotion.endsOn}, soit{' '}
            {promotion.daysLeft} jour{promotion.daysLeft > 1 ? 's' : ''} restant
            {promotion.daysLeft > 1 ? 's' : ''}. Les Berries et les personnages
            restent au prix habituel, et les probabilités des coffres ne
            changent pas.
          </span>
        </p>
      )}

      {!enabled && (
        <p className="hb-card mt-4 text-sm">
          <strong>La boutique n’est pas encore ouverte.</strong>
          <span className="hb-muted mt-1 block">{disabledReason}</span>
        </p>
      )}

      {error && (
        <p role="alert" className="hb-card mt-4 text-sm hb-ko">
          {error}
        </p>
      )}

      {SECTIONS.map((section) => {
        const items = products.filter((p) => p.category === section.key);
        if (items.length === 0) return null;

        return (
          <section key={section.key} className="mt-7">
            <h2 className="hb-legend">{section.title}</h2>
            <p className="hb-muted mt-1 text-xs">{section.blurb}</p>

            <ul className="mt-3 space-y-3">
              {items.map((product) => (
                <li
                  key={product.id}
                  className={[
                    'hb-card',
                    // Le coffre royal porte sa propre parure : c'est le seul
                    // produit dont l'apparence en jeu diffère, autant que la
                    // fiche le montre avant l'achat plutôt qu'après.
                    product.id === 'royal_chest' ? 'hb-card--royal' : '',
                    product.rarityColor ? 'hb-card--rarity' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={
                    product.rarityColor
                      ? ({ ['--rarity' as string]: product.rarityColor })
                      : undefined
                  }
                >
                  <div className="flex items-start gap-3">
                    <ProductIcon product={product} />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-display text-lg hb-ink">
                          {product.label}
                        </span>
                        <span className="hb-num whitespace-nowrap text-lg">
                          {product.fullPrice && (
                            <s className="hb-price-was">{product.fullPrice}</s>
                          )}
                          {product.price}
                        </span>
                      </div>

                      {/* La rareté est écrite **et** colorée : la couleur seule
                          n'est pas lisible par un joueur daltonien, et c'est la
                          même règle que sur les cartes de collection. */}
                      {product.rarityLabel && (
                        <span className="hb-shop__rarity">
                          {product.rarityLabel}
                        </span>
                      )}

                      <p className="hb-muted mt-2 text-sm">
                        {product.description}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={pending || !enabled}
                    aria-busy={pending}
                    onClick={() => buy(product.id)}
                    className="hb-btn mt-3 disabled:opacity-40"
                  >
                    {pending ? 'Un instant…' : 'Acheter'}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <div className="hb-card mt-6">
        <p className="hb-legend">Ce que l’argent n’achète pas</p>
        <p className="mt-2 text-sm">
          Aucun produit de cette page ne donne de points, ne modifie un score,
          ni n’avantage au classement. La rareté d’un personnage est une valeur
          de collection : un Commun peut être excellent une semaine donnée, un
          Légendaire peut ne rien rapporter.
        </p>
        <p className="hb-muted mt-2 text-xs">
          Les probabilités des coffres achetés sont exactement celles des
          coffres gagnés en jeu, et restent consultables sur la page Collection.
          Les achats sont réservés aux comptes majeurs et plafonnés par jour.
        </p>
      </div>
    </div>
  );
}
