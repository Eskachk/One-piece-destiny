'use client';

import { useState, useTransition } from 'react';
import { attempt } from './attempt';
import { startCheckoutAction } from '@/app/actions/shop';

/**
 * Boutique en argent réel (cahier §113, §114).
 *
 * Trois règles de présentation, et elles viennent toutes du §113 :
 *
 *   — **le prix est affiché en euros, en toutes lettres**, jamais masqué
 *     derrière une monnaie intermédiaire. « 14,99 € » se comprend ;
 *     « 1 500 gemmes » ne se compare à rien ;
 *   — **ce qu'on reçoit est écrit avant l'achat**, pas après ;
 *   — **aucune urgence fabriquée.** Pas de compte à rebours, pas de « plus que
 *     2 en stock », pas de prix barré : ce sont des procédés qui poussent à
 *     acheter vite plutôt qu'à acheter en connaissance de cause.
 */

export interface ShopProduct {
  id: string;
  label: string;
  price: string;
  description: string;
}

export function ShopPanel({
  products,
  enabled,
  disabledReason,
}: {
  products: ShopProduct[];
  /** Les paiements réels sont-ils ouverts ? */
  enabled: boolean;
  disabledReason: string;
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

      <ul className="mt-5 space-y-3">
        {products.map((product) => (
          <li key={product.id} className="hb-card">
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-display text-lg hb-ink">{product.label}</span>
              <span className="hb-num text-lg whitespace-nowrap">
                {product.price}
              </span>
            </div>

            <p className="hb-muted mt-2 text-sm">{product.description}</p>

            <button
              type="button"
              disabled={pending || !enabled}
              onClick={() => buy(product.id)}
              className="hb-btn mt-3 disabled:opacity-40"
            >
              {pending ? 'Un instant…' : 'Acheter'}
            </button>
          </li>
        ))}
      </ul>

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
