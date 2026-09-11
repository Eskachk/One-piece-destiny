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
import { ChestOdds } from '@/components/ChestOdds';
import type { RarityOdds } from '@/domain/collection/odds';
import { useT } from './LocaleProvider';
import type { MessageKey } from '@/domain/i18n/locales';

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
  /**
   * Quantité du lot et prix à l'unité, déjà mis en forme par le serveur.
   *
   * `null` pour les produits vendus à l'unité — un « prix unitaire » y
   * répéterait le prix affiché juste à côté.
   */
  lot: string | null;
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
const SECTIONS = ['CHEST', 'COINS', 'CHARACTER'] as const;

export function ShopPanel({
  products,
  enabled,
  disabledReason,
  promotion,
  chestOdds,
}: {
  products: ShopProduct[];
  /**
   * Probabilités des coffres, affichées **sur cette page**.
   *
   * Elles étaient auparavant renvoyées vers la page Collection par une
   * phrase en bas d'écran. C'était insuffisant : la règle du Play Store sur
   * les achats intégrés demande que les taux d'un objet aléatoire soient
   * annoncés **avant l'achat**, et une référence à un autre écran n'annonce
   * rien — c'est là que se conclut la vente.
   */
  chestOdds: RarityOdds[];
  /** Les paiements réels sont-ils ouverts ? */
  enabled: boolean;
  disabledReason: string;
  /** Offre de lancement en cours, ou `null`. Décidée côté serveur. */
  promotion: { discount: number; daysLeft: number; endsOn: string; body: string } | null;
}) {
  const { t, tradMessage } = useT();
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
        setError(tradMessage(result.error));
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
            <strong>{t('shop.promo.title')}</strong> {promotion.body}
          </span>
        </p>
      )}

      {!enabled && (
        <p className="hb-card mt-4 text-sm">
          <strong>{t('shop.closed')}</strong>
          <span className="hb-muted mt-1 block">{disabledReason}</span>
        </p>
      )}

      {error && (
        <p role="alert" className="hb-card mt-4 text-sm hb-ko">
          {error}
        </p>
      )}

      {SECTIONS.map((section) => {
        const items = products.filter((p) => p.category === section);
        if (items.length === 0) return null;

        return (
          <section key={section} className="mt-7">
            <h2 className="hb-legend">{t(`shop.section.${section}`)}</h2>
            <p className="hb-muted mt-1 text-xs">{t(`shop.section.${section}.blurb` as MessageKey)}</p>

            {/*
              Les taux, là où l'achat se conclut. Voir la prop `chestOdds`.
            */}
            {section === 'CHEST' && <ChestOdds odds={chestOdds} />}

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

                      {/* La quantité, juste sous le nom et au-dessus de tout le
                          reste. C'est la ligne qui manquait : « Coffre du Yonko,
                          24,99 € » se lit comme un seul coffre, et le magasin
                          paraît alors incohérent à côté d'un Mythique à 12,99 €.
                          Enterrée dans le paragraphe de description, l'information
                          arrivait après la comparaison de prix — donc trop tard. */}
                      {product.lot && (
                        <p className="hb-shop__lot">{product.lot}</p>
                      )}

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
                    {pending ? t('shop.wait') : t('shop.buy')}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <div className="hb-card mt-6">
        <p className="hb-legend">{t('shop.limits.title')}</p>
        <p className="mt-2 text-sm">{t('shop.limits.body')}</p>
        <p className="hb-muted mt-2 text-xs">{t('shop.limits.note')}</p>
      </div>
    </div>
  );
}
