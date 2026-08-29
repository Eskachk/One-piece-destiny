import type { Metadata } from 'next';
import { HarborScene } from '@/components/HarborScene';
import { Nav } from '@/components/Nav';
import { ShopPanel } from '@/components/ShopPanel';
import { CATALOG } from '@/domain/payments/catalog';
import { requireSession } from '@/lib/auth/guards';
import { paymentsState } from '@/lib/payments/provider';

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

  const products = Object.values(CATALOG).map((product) => ({
    id: product.id,
    category: product.category,
    label: product.label,
    price: euros(product.priceCents),
    description: product.description,
  }));

  return (
    <HarborScene variant="page">
      <p className="hb-eyebrow">Grand Line Weekly</p>
      <h1 className="hb-title mt-1">Boutique</h1>

      <p className="hb-muted mt-3 text-sm">
        Des coffres et des Berries, en argent réel. Tout ce qui est ici
        s’obtient aussi en jouant — c’est du raccourci, jamais de l’exclusivité.
      </p>

      <ShopPanel
        products={products}
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
