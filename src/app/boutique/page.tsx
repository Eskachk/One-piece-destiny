import type { Metadata } from 'next';
import { HarborScene } from '@/components/HarborScene';
import { Nav } from '@/components/Nav';
import { ShopPanel } from '@/components/ShopPanel';
import { CATALOG } from '@/domain/payments/catalog';
import { RARITY_COLOR, RARITY_LABEL } from '@/domain/collection/rarity';
import { requireSession } from '@/lib/auth/guards';
import { paymentsState } from '@/lib/payments/provider';
import {
  LAUNCH_DISCOUNT,
  effectivePriceCents,
  launchWindow,
} from '@/domain/payments/promotion';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Boutique',
  robots: { index: false, follow: false },
};

const euros = (cents: number) =>
  (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

/**
 * Boutique en argent réel (cahier §36, §113, §114).
 *
 * L'état des paiements est lu **côté serveur** et transmis au panneau : le
 * navigateur ne décide pas si la boutique est ouverte, il l'affiche. Un
 * client qui forcerait le booléen n'obtiendrait qu'un bouton actif et un refus
 * de l'action serveur, qui revérifie.
 */
export default async function ShopPage() {
  await requireSession();

  const state = paymentsState();

  // L'offre est décidée **ici**, côté serveur, à partir de l'horloge du
  // serveur. La calculer dans le navigateur la rendrait dépendante de
  // l'horloge du téléphone : reculer sa date suffirait à ressusciter une
  // remise expirée à l'affichage — et le paiement, lui, la refuserait.
  const now = new Date();
  const promo = launchWindow(now);

  // La couleur est résolue **ici**, côté serveur : le panneau reçoit une
  // valeur toute faite plutôt que la table des raretés, qu'il faudrait sinon
  // embarquer dans le bundle client.
  const products = Object.values(CATALOG).map((product) => {
    const priceCents = effectivePriceCents(product, now, promo);

    return {
      id: product.id,
      category: product.category,
      label: product.label,
      price: euros(priceCents),
      // Le prix d'origine n'est transmis que s'il y a réellement une remise :
      // le panneau ne sait pas en reconstituer un, donc il ne peut pas en
      // afficher un par erreur.
      fullPrice:
        priceCents < product.priceCents ? euros(product.priceCents) : null,
      description: product.description,
      rarityColor: product.rarity ? RARITY_COLOR[product.rarity] : null,
      rarityLabel: product.rarity ? RARITY_LABEL[product.rarity] : null,
    };
  });

  return (
    <HarborScene variant="page" island="logue">
      <p className="hb-eyebrow">Grand Line Weekly</p>
      <h1 className="hb-title mt-1">Boutique</h1>

      <p className="hb-muted mt-3 text-sm">
        Des coffres et des Berries, en argent réel. Tout ce qui est ici
        s’obtient aussi en jouant — c’est du raccourci, jamais de l’exclusivité.
      </p>

      <ShopPanel
        products={products}
        promotion={
          promo.active && promo.endsAt
            ? {
                discount: Math.round(LAUNCH_DISCOUNT * 100),
                daysLeft: promo.daysLeft,
                endsOn: promo.endsAt.toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'long',
                }),
              }
            : null
        }
        enabled={state.enabled}
        disabledReason={
          state.enabled
            ? ''
            : // Le message du système explique la cause réelle (audit juridique
              // en attente, clé manquante, mode test) plutôt que d'inventer une
              // panne. Un joueur qui lit « bientôt » sans raison suppose un bug.
              `${state.reason} En attendant, les Berries gagnées chaque semaine ouvrent exactement les mêmes coffres.`
        }
      />

      <Nav />
    </HarborScene>
  );
}
