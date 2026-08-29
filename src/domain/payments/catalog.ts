/**
 * Catalogue des produits payants (cahier §113, §114).
 *
 * ⚠️ **Aucun paiement réel n'est activé.** Le module décrit ce qui pourrait
 * être vendu et sert de source de vérité aux montants ; l'activation reste
 * suspendue à l'audit juridique du §122. Voir `src/lib/payments/`.
 *
 * Règle structurante : **le prix ne circule jamais depuis le client.** Le
 * navigateur envoie un identifiant de produit, le serveur lit le montant ici.
 * Un montant transmis par le client serait un montant négociable par lui.
 */

export type ProductId = 'chest_pack_small' | 'chest_pack_large' | 'berries_pouch';

export interface Product {
  id: ProductId;
  label: string;
  /** En centimes, pour éviter toute arithmétique en virgule flottante. */
  priceCents: number;
  currency: 'EUR';
  /** Ce que le compte reçoit une fois le paiement vérifié. */
  grants: { berries: number; chests: number };
  /** Description affichée avant l'achat (§113). */
  description: string;
}

export const CATALOG: Record<ProductId, Product> = {
  chest_pack_small: {
    id: 'chest_pack_small',
    label: 'Petite cale',
    priceCents: 299,
    currency: 'EUR',
    grants: { berries: 0, chests: 3 },
    description: '3 coffres. Composition et probabilités identiques aux coffres gagnés en jeu.',
  },
  chest_pack_large: {
    id: 'chest_pack_large',
    label: 'Grande cale',
    priceCents: 999,
    currency: 'EUR',
    grants: { berries: 0, chests: 12 },
    description: '12 coffres. Composition et probabilités identiques aux coffres gagnés en jeu.',
  },
  berries_pouch: {
    id: 'berries_pouch',
    label: 'Bourse de Berries',
    priceCents: 499,
    currency: 'EUR',
    grants: { berries: 6_000, chests: 0 },
    description: '6 000 Berries. Les Berries n’achètent que de la collection, jamais un avantage de score.',
  },
};

/**
 * Résout un identifiant de produit.
 *
 * `Object.hasOwn` plutôt qu'un accès direct : sans lui, `productOf('__proto__')`
 * renvoie `Object.prototype`, un objet bien réel dont `priceCents` vaut
 * `undefined`. L'identifiant vient d'un webhook — donc de l'extérieur — et ne
 * doit jamais pouvoir atteindre la chaîne de prototypes.
 */
export function productOf(id: string): Product | null {
  if (!Object.hasOwn(CATALOG, id)) return null;
  return (CATALOG as Record<string, Product>)[id];
}

/**
 * Contrôles qu'un webhook doit passer avant d'accorder quoi que ce soit.
 *
 * Fonction **pure** : elle décide sans réseau ni base, donc chaque refus est
 * testable. Le prompt de départ le formule bien — on n'accorde jamais une
 * récompense parce que le client affirme avoir payé.
 */
export interface WebhookClaim {
  productId: string;
  amountCents: number;
  currency: string;
  status: string;
  playerId: string | null;
  /** Identifiant d'événement du prestataire, pour l'idempotence. */
  eventId: string;
}

export type ClaimVerdict =
  | { ok: true; product: Product; playerId: string }
  | { ok: false; reason: string };

export function verifyClaim(claim: WebhookClaim): ClaimVerdict {
  if (claim.status !== 'paid') {
    return { ok: false, reason: `Statut non payé : ${claim.status}.` };
  }

  if (!claim.playerId) {
    return { ok: false, reason: 'Aucun joueur associé au paiement.' };
  }

  const product = productOf(claim.productId);
  if (!product) {
    return { ok: false, reason: `Produit inconnu : ${claim.productId}.` };
  }

  // Le montant est comparé au catalogue, pas accepté tel quel : c'est ce qui
  // rend inopérante la manipulation du prix côté client.
  if (claim.amountCents !== product.priceCents) {
    return {
      ok: false,
      reason: `Montant inattendu : ${claim.amountCents} au lieu de ${product.priceCents}.`,
    };
  }

  if (claim.currency.toUpperCase() !== product.currency) {
    return {
      ok: false,
      reason: `Devise inattendue : ${claim.currency} au lieu de ${product.currency}.`,
    };
  }

  return { ok: true, product, playerId: claim.playerId };
}

/**
 * Un achat reste-t-il sous le plafond journalier ?
 *
 * Le plafond vient des restrictions d'âge (`src/domain/compliance/age.ts`).
 * Un plafond nul interdit tout achat — c'est le cas des comptes mineurs et
 * des comptes sans date de naissance.
 */
export function withinDailyCap(
  alreadySpentCents: number,
  priceCents: number,
  capCents: number,
): boolean {
  if (capCents <= 0) return false;
  return alreadySpentCents + priceCents <= capCents;
}
