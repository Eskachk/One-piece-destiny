import type { Product } from './catalog';

/**
 * Offre de lancement (cahier §113).
 *
 * **−20 % sur les coffres pendant la première semaine.** Une seule promotion,
 * un seul rayon, une seule fenêtre : une remise permanente n'est pas une
 * remise, c'est un prix. Et une remise qui s'empile avec d'autres devient
 * impossible à expliquer sur la fiche produit.
 *
 * ## La date de lancement vient de l'environnement
 *
 * `LAUNCH_AT` porte la date d'ouverture au public, au format ISO. Elle est
 * dans l'environnement et non dans le code pour une raison précise : la date
 * réelle d'ouverture n'est pas connue à l'écriture, et une valeur écrite en
 * dur obligerait à redéployer pour la corriger — probablement le jour même,
 * dans l'urgence.
 *
 * Sans `LAUNCH_AT`, **il n'y a pas de promotion**. C'est le bon défaut : mieux
 * vaut ne rien annoncer que d'annoncer une remise dont on ne sait pas quand
 * elle finit.
 *
 * ## Ce que la promotion ne fait pas
 *
 * Elle ne change **rien** au contenu : les coffres remisés tirent avec les
 * mêmes probabilités que les autres (§48). On vend le même objet moins cher
 * pendant sept jours, pas un objet différent.
 */

/** Remise appliquée, en fraction du prix. */
export const LAUNCH_DISCOUNT = 0.2;

/** Durée de l'offre à compter du lancement. */
export const LAUNCH_PROMO_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Date de lancement, ou `null` si elle n'est pas configurée.
 *
 * Une valeur illisible est traitée comme absente : une promotion pilotée par
 * une date invalide s'appliquerait à des instants imprévisibles, ce qui est
 * pire que pas de promotion du tout.
 */
export function launchDate(): Date | null {
  const raw = process.env.LAUNCH_AT;
  if (!raw) return null;

  const at = new Date(raw);
  return Number.isNaN(at.getTime()) ? null : at;
}

export interface PromotionWindow {
  active: boolean;
  /** Fin de l'offre, pour l'afficher au joueur. */
  endsAt: Date | null;
  /** Jours entiers restants, arrondis au supérieur. Zéro le dernier jour. */
  daysLeft: number;
}

export function launchWindow(
  now: Date,
  launch: Date | null = launchDate(),
): PromotionWindow {
  if (!launch) return { active: false, endsAt: null, daysLeft: 0 };

  const endsAt = new Date(launch.getTime() + LAUNCH_PROMO_DAYS * DAY_MS);
  const active = now >= launch && now < endsAt;

  return {
    active,
    endsAt,
    daysLeft: active ? Math.ceil((endsAt.getTime() - now.getTime()) / DAY_MS) : 0,
  };
}

/**
 * Prix effectif d'un produit à un instant donné.
 *
 * Les Berries et les personnages ne sont pas remisés : l'offre porte sur les
 * coffres, qui sont le produit d'appel. Étendre la remise à tout le catalogue
 * en ferait un solde général, ce qui n'est pas ce qu'on annonce.
 *
 * L'arrondi est **à l'entier de centime inférieur**. Un prix promotionnel doit
 * être inférieur ou égal au prix annoncé, jamais l'inverse d'un centime à
 * cause d'un arrondi au plus proche.
 */
export function effectivePriceCents(
  product: Product,
  now: Date,
  window: PromotionWindow = launchWindow(now),
): number {
  if (!window.active || product.category !== 'CHEST') return product.priceCents;
  return Math.floor(product.priceCents * (1 - LAUNCH_DISCOUNT));
}

/** Le produit est-il remisé en ce moment ? */
export function isDiscounted(
  product: Product,
  now: Date,
  window: PromotionWindow = launchWindow(now),
): boolean {
  return effectivePriceCents(product, now, window) < product.priceCents;
}
