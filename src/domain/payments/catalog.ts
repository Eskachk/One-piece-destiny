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

import type { Rarity } from '../types';

export type ProductId =
  | 'chest_pack_small'
  | 'chest_pack_large'
  | 'royal_chest'
  | 'berries_pouch'
  | 'berries_hold'
  | 'character_shanks'
  | 'character_mihawk'
  | 'character_luffy';

/**
 * Rayons de la boutique.
 *
 * Trois intentions d'achat distinctes, et les mélanger rendait la page
 * illisible : on ne compare pas un coffre à une pièce de monnaie.
 */
export type ProductCategory = 'CHEST' | 'COINS' | 'CHARACTER';

export interface Product {
  id: ProductId;
  category: ProductCategory;
  label: string;
  /** En centimes, pour éviter toute arithmétique en virgule flottante. */
  priceCents: number;
  currency: 'EUR';
  /**
   * Ce que le compte reçoit une fois le paiement vérifié.
   *
   * `royalChests` sont des coffres à mise en scène particulière, réservés aux
   * raretés hautes. `characterId` accorde un personnage nommé — c'est le seul
   * produit qui touche directement la collection, et c'est pour cela qu'il est
   * lu ici, dans le catalogue serveur, jamais transmis par le client.
   */
  grants: {
    berries: number;
    chests: number;
    royalChests?: number;
    characterId?: string;
  };
  /**
   * Rareté du personnage vendu, pour la mise en couleur de la fiche.
   *
   * Recopiée ici plutôt que relue dans le référentiel : la boutique est rendue
   * côté serveur, mais la fiche passe au navigateur — aller chercher la rareté
   * dans `CHARACTER_INDEX` depuis le client réimporterait les 790 personnages
   * pour trois couleurs.
   */
  rarity?: Rarity;
  /** Description affichée avant l'achat (§113). */
  description: string;
}

export const CATALOG: Record<ProductId, Product> = {
  chest_pack_small: {
    id: 'chest_pack_small',
    category: 'CHEST',
    // Gaimon vit dans un coffre sur une île de Grand Line, et n'en sort pas.
    // Le plus petit coffre de la boutique porte son nom.
    label: 'Coffre de Gaimon',
    priceCents: 299,
    currency: 'EUR',
    grants: { berries: 0, chests: 3 },
    description: '3 coffres. Composition et probabilités identiques aux coffres gagnés en jeu.',
  },
  chest_pack_large: {
    id: 'chest_pack_large',
    category: 'CHEST',
    // Nami tient la caisse de l'équipage : le gros lot lui revient.
    label: 'Coffre de Nami',
    priceCents: 999,
    currency: 'EUR',
    grants: { berries: 0, chests: 12 },
    description: '12 coffres. Composition et probabilités identiques aux coffres gagnés en jeu.',
  },
  /**
   * Le coffre du Yonko — le produit phare, et il doit se comporter comme tel.
   *
   * ## Ce qui n'allait pas
   *
   * Il a d'abord coûté 14,99 € pour **une** carte garantie, soit plus cher
   * qu'un Mythique nommé. Ramené à 9,99 €, il s'est retrouvé au même prix que
   * le coffre de Nami — et là, mesuré, le verdict était sans appel :
   *
   *     Coffre de Nami   9,99 €   12 coffres     valeur 1 790   179 par euro
   *     Coffre du Yonko  9,99 €    1 coffre royal  valeur  466    47 par euro
   *
   * Le produit haut de gamme donnait **3,8 fois moins** que son voisin, au
   * centime près du même prix. Deux étiquettes identiques pour deux contenus
   * incomparables : le joueur ne peut pas choisir, il peut seulement se
   * tromper.
   *
   * ## La règle retenue
   *
   * Le coffre du Yonko est le **haut de l'étagère**, et il doit l'être sur les
   * trois axes à la fois — sinon on remplace un piège par un autre :
   *
   *   1. le plus cher ;
   *   2. celui qui donne le plus, en valeur absolue ;
   *   3. **et le meilleur rapport à l'euro**. C'est le point qu'on oublie
   *      toujours : un produit phare qui coûte plus cher l'unité est
   *      exactement la forme de piège corrigée sur la Bourse de Berries.
   *
   * Dix coffres royaux le placent à 186 de valeur par euro, contre 179 pour le
   * coffre de Nami et le Sac de Berries. Il gagne partout, et c'est ce qui
   * rend son prix défendable.
   *
   * ## Ce qu'il reste
   *
   * Chaque coffre royal garantit un Légendaire ou mieux et n'admet aucune
   * carte commune. Dix ouvertures, dix cérémonies. Le §25 tient toujours : un
   * Légendaire est une carte de collection, il ne donne aucun point. On vend
   * de la rareté et un moment, jamais de la victoire (§48).
   */
  royal_chest: {
    id: 'royal_chest',
    category: 'CHEST',
    label: 'Coffre du Yonko',
    priceCents: 2_499,
    currency: 'EUR',
    grants: { berries: 0, chests: 0, royalChests: 10 },
    description:
      '10 coffres royaux : Légendaire ou mieux garanti dans chacun, aucune carte commune, ouverture en cérémonie dédiée. La rareté est une valeur de collection, elle ne donne aucun point au classement.',
  },
  berries_pouch: {
    id: 'berries_pouch',
    category: 'COINS',
    label: 'Bourse de Berries',
    priceCents: 499,
    currency: 'EUR',
    grants: { berries: 7_500, chests: 0 },
    description: '7 500 Berries, soit 5 coffres à la boutique du jeu. Les Berries n’achètent que de la collection, jamais un avantage de score.',
  },
  berries_hold: {
    id: 'berries_hold',
    category: 'COINS',
    label: 'Sac de Berries',
    priceCents: 1_999,
    currency: 'EUR',
    grants: { berries: 36_000, chests: 0 },
    description:
      '36 000 Berries, soit 24 coffres à la boutique du jeu. Les Berries n’achètent que de la collection.',
  },
  /**
   * Rayon personnages.
   *
   * **Trois personnages nommés, et seulement trois : un Mythique et deux
   * Légendaires.** Un catalogue complet reviendrait à mettre un prix sur
   * chaque personnage de l'œuvre, ce qui transformerait la collection en
   * boutique. Ceux-ci restent obtenables en coffre, gratuitement — l'achat
   * abrège, il n'ouvre rien d'exclusif.
   *
   * La composition est vérifiée par un test : elle décide de ce que la
   * boutique promet, et une quatrième carte ajoutée sans y penser ferait
   * glisser le rayon vers le catalogue qu'on refuse.
   *
   * Le personnage accordé est lu **ici**, côté serveur. Un identifiant venu du
   * client serait un personnage choisi par le client.
   */
  character_shanks: {
    id: 'character_shanks',
    category: 'CHARACTER',
    label: 'Shanks',
    priceCents: 899,
    currency: 'EUR',
    grants: { berries: 0, chests: 0, characterId: 'shanks' },
    rarity: 'LEGENDARY',
    description:
      'Ajoute Shanks à ta collection. Légendaire — valeur de collection, aucun point au classement.',
  },
  character_mihawk: {
    id: 'character_mihawk',
    category: 'CHARACTER',
    label: 'Dracule Mihawk',
    priceCents: 899,
    currency: 'EUR',
    grants: { berries: 0, chests: 0, characterId: 'mihawk' },
    rarity: 'LEGENDARY',
    description:
      'Ajoute Mihawk à ta collection. Légendaire — valeur de collection, aucun point au classement.',
  },
  /**
   * Le Mythique du rayon.
   *
   * Un seul, et c'est délibéré : les dix Mythiques sont l'équipage au complet,
   * et le tirage en donne un pour mille. En vendre plusieurs ferait de la
   * boutique le chemin normal pour les obtenir, alors qu'elle doit rester un
   * raccourci.
   *
   * Il coûte plus cher qu'un Légendaire parce qu'il est dix fois plus rare au
   * coffre — 0,1 % contre 1,2 %. Un même prix pour deux raretés différentes
   * dirait au joueur que la rareté ne veut rien dire.
   *
   * §25 et §48 restent tenus : la rareté est une valeur de collection. Le
   * moteur de score ne la lit jamais pour accorder des points, et l'y voir
   * **abaisser** le bonus de risque signifie qu'aligner des Mythiques est le
   * jeu le plus prudent, jamais le plus rentable. Acheter Luffy n'achète donc
   * pas une place au classement — d'autant qu'au v6, un personnage que tout le
   * monde choisit vaut moins.
   */
  character_luffy: {
    id: 'character_luffy',
    category: 'CHARACTER',
    label: 'Monkey D. Luffy',
    priceCents: 1299,
    currency: 'EUR',
    grants: { berries: 0, chests: 0, characterId: 'luffy' },
    rarity: 'MYTHIC',
    description:
      'Ajoute Luffy à ta collection. Mythique — valeur de collection, aucun point au classement.',
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
  /**
   * Montant attendu, tel que le serveur l'a écrit dans l'intention de paiement.
   *
   * Il ne peut pas être relu dans le catalogue : une offre de lancement fait
   * payer un coffre moins cher, et le webhook arrive parfois **après** la fin
   * de l'offre. Comparer au prix courant refuserait alors un paiement
   * parfaitement légitime.
   *
   * Ce montant reste une valeur **serveur** — écrite par nous à l'ouverture du
   * paiement, jamais transmise par le navigateur. La garantie du §113 tient
   * donc toujours : le prix n'est pas négociable par le client.
   *
   * `null` quand aucune intention n'a été retrouvée : on retombe alors sur le
   * prix du catalogue, ce qui refuse tout paiement qui ne s'y rattache pas.
   */
  expectedCents: number | null;
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

  // Le montant est comparé à ce que **le serveur** attendait, pas accepté tel
  // quel : c'est ce qui rend inopérante la manipulation du prix côté client.
  const expected = claim.expectedCents ?? product.priceCents;
  if (claim.amountCents !== expected) {
    return {
      ok: false,
      reason: `Montant inattendu : ${claim.amountCents} au lieu de ${expected}.`,
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
