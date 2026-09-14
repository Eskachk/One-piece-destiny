import type { Metadata } from 'next';
import { HarborScene } from '@/components/HarborScene';
import { islandOf } from '@/domain/islands';
import { Nav } from '@/components/Nav';
import { Tutorial } from '@/components/Tutorial';
import { ShopPanel } from '@/components/ShopPanel';
import { CATALOG } from '@/domain/payments/catalog';
import { CHARACTERS } from '@/data/characters';
import { chestOdds } from '@/domain/collection/odds';
import { RARITY_COLOR, RARITY_TEXT } from '@/domain/collection/rarity';
import { requireSession } from '@/lib/auth/guards';
import { traduire } from '@/lib/i18n';
import { libelleRarete } from '@/domain/i18n/libelles';
import type { MessageKey } from '@/domain/i18n/locales';
import { paymentsState } from '@/lib/payments/provider';
import { rapprocherRetour } from '@/lib/payments/rapprochement';
import {
  LAUNCH_DISCOUNT,
  effectivePriceCents,
  launchWindow,
} from '@/domain/payments/promotion';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await traduire();
  return { title: t('shop.meta.title'), robots: { index: false, follow: false } };
}

/**
 * Boutique en argent réel (cahier §36, §113, §114).
 *
 * L'état des paiements est lu **côté serveur** et transmis au panneau : le
 * navigateur ne décide pas si la boutique est ouverte, il l'affiche. Un
 * client qui forcerait le booléen n'obtiendrait qu'un bouton actif et un refus
 * de l'action serveur, qui revérifie.
 */
export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ paiement?: string }>;
}) {
  const [session, { t, tn, locale, euros }, { paiement }] = await Promise.all([
    requireSession(),
    traduire(),
    searchParams,
  ]);

  const state = paymentsState();

  /*
   * Rapprochement **avant** de rendre la page.
   *
   * Le prestataire est interrogé sur les sessions ouvertes par ce joueur, et
   * une session payée est créditée ici même, sans attendre le webhook. C'est
   * fait à chaque visite de la boutique, pas seulement au retour de la caisse
   * (`?paiement=ok`) : un joueur qui a payé puis fermé l'onglet avant la
   * redirection doit retrouver son achat à sa prochaine visite, webhook ou
   * pas. Sans session ouverte, cela ne coûte qu'une lecture.
   *
   * Le message, lui, dépend d'où l'on vient : « confirmation en cours » n'a de
   * sens qu'au retour de la caisse — sur une visite ordinaire, une session
   * abandonnée la veille n'a rien à annoncer.
   */
  const retour = state.enabled ? await rapprocherRetour(session.playerId) : { etat: 'rien' as const };

  const bandeau =
    retour.etat === 'credite'
      ? { ton: 'ok' as const, texte: t('shop.retour.credite', { produit: t(`product.${retour.productId}` as MessageKey) }) }
      : paiement === 'ok' && retour.etat === 'attente'
        ? { ton: 'info' as const, texte: t('shop.retour.attente') }
        : paiement === 'annule'
          ? { ton: 'info' as const, texte: t('shop.retour.annule') }
          : null;

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
      label: t(`product.${product.id}` as MessageKey),
      price: euros(priceCents),
      // Le prix d'origine n'est transmis que s'il y a réellement une remise :
      // le panneau ne sait pas en reconstituer un, donc il ne peut pas en
      // afficher un par erreur.
      fullPrice:
        priceCents < product.priceCents ? euros(product.priceCents) : null,
      // Le prix à l'unité se calcule sur le prix **effectivement payé**, pas
      // sur celui du catalogue : pendant l'offre de lancement, afficher
      // 2,50 € le coffre alors qu'il en coûte 2,00 serait un mensonge à
      // rebours, et le seul chiffre que le joueur vérifierait.
      lot: product.lot
        ? t('shop.lot', {
            n: product.lot.quantite,
            unit: t(product.id === 'royal_chest' ? 'shop.unit.royalChests' : 'shop.unit.chests'),
            each: euros(Math.round(priceCents / product.lot.quantite)),
          })
        : null,
      description: t(`product.${product.id}.desc` as MessageKey),
      rarityColor: product.rarity ? RARITY_COLOR[product.rarity] : null,
      rarityText: product.rarity ? RARITY_TEXT[product.rarity] : null,
      rarityLabel: product.rarity ? libelleRarete(t, product.rarity) : null,
    };
  });

  return (
    <HarborScene variant="page" island={islandOf('/boutique')}>
      <p className="hb-eyebrow">{t('brand')}</p>
      <h1 className="hb-title mt-1">{t('shop.title')}</h1>

      <p className="hb-muted mt-3 text-sm">{t('shop.intro')}</p>

      <ShopPanel
        retour={bandeau}
        products={products}
        // Calculées à partir des mêmes constantes que le tirage du serveur :
        // elles ne peuvent pas diverger de ce qu'il fait réellement.
        chestOdds={chestOdds(CHARACTERS)}
        promotion={
          promo.active && promo.endsAt
            ? {
                discount: Math.round(LAUNCH_DISCOUNT * 100),
                daysLeft: promo.daysLeft,
                body: tn('shop.promo.body', promo.daysLeft, {
                  date: promo.endsAt.toLocaleDateString(locale === 'en' ? 'en-GB' : 'fr-FR', {
                    day: 'numeric',
                    month: 'long',
                  }),
                }),
                endsOn: promo.endsAt.toLocaleDateString(locale === 'en' ? 'en-GB' : 'fr-FR', {
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
              `${state.reason} ${t('shop.closed.meanwhile')}`
        }
      />

      <Tutorial page="boutique" />
      <Nav />
    </HarborScene>
  );
}
