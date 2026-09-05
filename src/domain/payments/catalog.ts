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
   * Coffre royal.
   *
   * Mise en scène et apparence propres — coffre noir et or, cérémonie plus
   * longue, éclairs qui ne redescendent jamais sous le Légendaire. C'est ce
   * qu'on vend : un moment, pas un avantage.
   *
   * Le §25 tient toujours : un Légendaire est une carte de collection, il ne
   * donne aucun point. On vend de la rareté, jamais de la victoire (§48).
   */
  royal_chest: {
    id: 'royal_chest',
    category: 'CHEST',
    label: 'Coffre du Yonko',
    /*
     * Ramené de 14,99 € à 9,99 €.
     *
     * Il coûtait **plus cher qu'un Mythique nommé** — 14,99 € pour un
     * Légendaire ou mieux tiré au hasard, contre 12,99 € pour Luffy en
     * personne. Un produit aléatoire vendu au-dessus du produit garanti dit au
     * joueur que le prix ne suit aucune logique.
     *
     * Neuf euros quatre-vingt-dix-neuf, c'est ce que vaut la chance qu'il
     * remplace : un Légendaire sort une fois sur 12,8 coffres, et douze
     * coffres coûtent 9,99 €. On vend la certitude et la cérémonie au prix de
     * l'espérance, ce qui est défendable ; au-dessus, on vendait moins pour
     * plus cher.
     */
    priceCents: 999,
    currency: 'EUR',
    grants: { berries: 0, chests: 0, royalChests: 1 },
    description:
      '1 coffre royal : Légendaire ou mieux garanti, ouverture en cérémonie dédiée. La rareté est une valeur de collection, elle ne donne aucun point au classement.',
  },
  /**
   * Les deux produits en Berries, réévalués.
   *
   * ## Ce que la boutique disait sans le dire
   *
   * Rapporté au coffre — la seule chose que les Berries achètent — le
   * catalogue était **inversé** :
   *
   *     Coffre de Gaimon    2,99 €    3 coffres      1,00 € le coffre
   *     Coffre de Nami      9,99 €   12 coffres      0,83 € le coffre
   *     Bourse de Berries   4,99 €    4 coffres      1,25 € le coffre  ← le pire
   *     Sac de Berries     19,99 €   20 coffres      1,00 € le coffre
   *
   * La bourse était le plus mauvais achat du magasin, et le produit le plus
   * cher — vingt euros — revenait plus cher au coffre que celui à dix. C'est
   * la forme classique du piège : celui qui dépense le plus paie le plus
   * cher l'unité, et rien à l'écran ne le lui dit.
   *
   * ## La règle retenue
   *
   * **À palier égal, les Berries valent le même prix au coffre que les
   * coffres.** Ils sont déjà plus souples — ils achètent aussi au Marché — et
   * cette souplesse suffit à les distinguer ; la payer d'une surtaxe de 25 %
   * invisible ne se défend pas.
   *
   *     Bourse de Berries   4,99 €    7 500 B  =  5 coffres    1,00 €
   *     Sac de Berries     19,99 €   36 000 B  = 24 coffres    0,83 €
   *
   * La courbe redevient monotone : plus on prend, moins l'unité coûte.
   */
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
