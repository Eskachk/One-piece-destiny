import { describe, expect, it } from 'vitest';
import { CATALOG, productOf, verifyClaim, withinDailyCap } from './catalog';
import { CHARACTER_INDEX } from '../../data/characters';
import { CHEST_PRICE_BERRIES } from '../collection/rewards';
import { CHEST_SLOTS, ROYAL_CHEST_SLOTS } from '../collection/chest';
import {
  DUPLICATE_SHARDS,
  RARITY_WEIGHTS,
  isAtLeast,
} from '../collection/rarity';
import { CHARACTERS } from '../../data/characters';
import type { Rarity } from '../types';
import { restrictionsForBirthDate } from '../compliance/age';

const VALIDE = {
  productId: 'chest_pack_small',
  amountCents: CATALOG.chest_pack_small.priceCents,
  currency: 'EUR',
  status: 'paid',
  playerId: 'joueur-1',
  eventId: 'evt_1',
  expectedCents: null,
};

describe('vérification d’un paiement', () => {
  it('accepte un paiement conforme', () => {
    const verdict = verifyClaim(VALIDE);
    expect(verdict.ok).toBe(true);
  });

  it('accepte le prix remisé écrit dans l’intention', () => {
    // Offre de lancement : l'intention porte 239 centimes là où le catalogue
    // en affiche 299. Le webhook arrive parfois après la fin de l'offre —
    // comparer au prix courant refuserait un paiement légitime.
    const remise = Math.floor(CATALOG.chest_pack_small.priceCents * 0.8);
    const verdict = verifyClaim({
      ...VALIDE,
      amountCents: remise,
      expectedCents: remise,
    });

    expect(verdict.ok).toBe(true);
  });

  it('refuse un montant qui ne correspond pas à l’intention', () => {
    // La remise n'ouvre pas la porte à un montant libre : le serveur compare
    // à ce qu'il a lui-même écrit, jamais à ce que le prestataire annonce.
    const verdict = verifyClaim({ ...VALIDE, amountCents: 1, expectedCents: 239 });
    expect(verdict.ok).toBe(false);
  });

  it('refuse un montant manipulé', () => {
    // Le cas central : le client tente de payer 1 centime un produit à 2,99 €.
    const verdict = verifyClaim({ ...VALIDE, amountCents: 1 });
    expect(verdict.ok).toBe(false);
  });

  it('refuse un montant supérieur au prix', () => {
    // Aussi refusé : un montant inattendu signale un désaccord, pas un cadeau.
    expect(verifyClaim({ ...VALIDE, amountCents: 99_999 }).ok).toBe(false);
  });

  it('refuse une devise différente', () => {
    // 299 unités d'une devise faible ne valent pas 2,99 €.
    expect(verifyClaim({ ...VALIDE, currency: 'JPY' }).ok).toBe(false);
  });

  it('accepte la devise quelle que soit la casse', () => {
    expect(verifyClaim({ ...VALIDE, currency: 'eur' }).ok).toBe(true);
  });

  it('refuse un produit inconnu', () => {
    expect(verifyClaim({ ...VALIDE, productId: 'coffre_gratuit' }).ok).toBe(false);
  });

  it('refuse un paiement non abouti', () => {
    expect(verifyClaim({ ...VALIDE, status: 'unpaid' }).ok).toBe(false);
    expect(verifyClaim({ ...VALIDE, status: 'pending' }).ok).toBe(false);
  });

  it('refuse un paiement sans joueur associé', () => {
    // Sans joueur, on ne saurait pas qui créditer — et créditer au hasard
    // serait pire que refuser.
    expect(verifyClaim({ ...VALIDE, playerId: null }).ok).toBe(false);
  });

  it('expose des prix strictement positifs', () => {
    for (const product of Object.values(CATALOG)) {
      expect(product.priceCents).toBeGreaterThan(0);
      expect(product.description.length).toBeGreaterThan(10);
    }
  });

  it('ne trouve rien pour un identifiant inventé', () => {
    expect(productOf('__proto__')).toBeNull();
    expect(productOf('constructor')).toBeNull();
  });
});

describe('plafond de dépense', () => {
  it('refuse tout achat quand le plafond est nul', () => {
    expect(withinDailyCap(0, 299, 0)).toBe(false);
  });

  it('autorise sous le plafond', () => {
    expect(withinDailyCap(1_000, 299, 5_000)).toBe(true);
  });

  it('refuse au-delà du plafond', () => {
    expect(withinDailyCap(4_900, 299, 5_000)).toBe(false);
  });

  it('interdit tout achat à un compte mineur', () => {
    const naissance = new Date('2012-01-01T00:00:00Z');
    const maintenant = new Date('2026-08-29T00:00:00Z');
    const restrictions = restrictionsForBirthDate(naissance, maintenant);

    expect(restrictions.mayPurchase).toBe(false);
    expect(withinDailyCap(0, 299, restrictions.dailySpendCapCents)).toBe(false);
  });
});

/**
 * Le rayon personnages.
 *
 * Trois cartes, pas quatre, et une composition arrêtée : un Mythique et deux
 * Légendaires. Ce n'est pas une préférence d'affichage — c'est la limite qui
 * empêche le rayon de devenir un catalogue où chaque personnage a son prix.
 */
describe('rayon personnages', () => {
  const personnages = Object.values(CATALOG).filter((p) => p.category === 'CHARACTER');

  it('vend exactement trois personnages', () => {
    expect(personnages).toHaveLength(3);
  });

  it('propose un Mythique et deux Légendaires', () => {
    const parRarete = personnages.reduce<Record<string, number>>((acc, p) => {
      acc[p.rarity ?? '?'] = (acc[p.rarity ?? '?'] ?? 0) + 1;
      return acc;
    }, {});
    expect(parRarete).toEqual({ MYTHIC: 1, LEGENDARY: 2 });
  });

  it('annonce la rareté que le référentiel donne au personnage', () => {
    // Le catalogue déclare une rareté pour l'affichage et le prix ; le
    // référentiel en tient une autre pour le jeu. Rien ne les reliait : une
    // carte pouvait être vendue « Légendaire » et arriver Épique dans la
    // collection, sans qu'aucune erreur ne le signale.
    for (const p of personnages) {
      const id = p.grants.characterId;
      expect(id, `${p.id} n’accorde aucun personnage`).toBeDefined();
      const reel = CHARACTER_INDEX.get(id!);
      expect(reel, `${id} est absent du référentiel jouable`).toBeDefined();
      expect(reel!.rarity, `${id} annoncé ${p.rarity}`).toBe(p.rarity);
    }
  });

  it('ne vend jamais l’unité plus cher à qui achète plus', () => {
    /*
     * ## Le défaut que ce test attrape
     *
     * Rapporté au coffre — la seule chose que les Berries achètent — le
     * catalogue était **inversé** :
     *
     *     Petite cale     2,99 €   →  1,00 € le coffre
     *     Grande cale     9,99 €   →  0,83 €
     *     Bourse          4,99 €   →  1,25 €   ← le pire du magasin
     *     Cale pleine    19,99 €   →  1,00 €   ← le produit le plus cher
     *
     * La forme classique du piège : celui qui dépense le plus paie l'unité
     * le plus cher, et rien à l'écran ne le lui dit. Ce test impose la règle
     * inverse — dépenser davantage ne doit jamais coûter plus cher l'unité.
     */
    const parCoffre = Object.values(CATALOG)
      .map((p) => {
        const coffres = p.grants.chests + p.grants.berries / CHEST_PRICE_BERRIES;
        return coffres > 0
          ? { id: p.id, prix: p.priceCents, unite: p.priceCents / coffres }
          : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => a.prix - b.prix);

    /*
     * Un pour cent de tolérance, et c'est de l'arithmétique, pas de la
     * complaisance : les prix se terminent tous en « ,99 » et les dotations
     * sont rondes. 4,99 € pour 5 coffres font 99,80 centimes l'unité, 2,99 €
     * pour 3 en font 99,67 — treize centièmes de centime d'écart, qu'aucun
     * joueur ne peut ressentir et qu'on ne corrigerait qu'en donnant 7 600
     * Berries au lieu de 7 500.
     *
     * Le piège qu'on traque était d'un tout autre ordre : vingt-cinq pour
     * cent.
     */
    const TOLERANCE = 1.01;

    for (let i = 1; i < parCoffre.length; i += 1) {
      const petit = parCoffre[i - 1];
      const grand = parCoffre[i];
      expect(
        grand.unite,
        `${grand.id} (${(grand.unite / 100).toFixed(2)} €/coffre) coûte plus cher l'unité que ${petit.id} (${(petit.unite / 100).toFixed(2)} €)`,
      ).toBeLessThanOrEqual(petit.unite * TOLERANCE);
    }
  });

  it('place le produit phare en tête sur les trois axes à la fois', () => {
    /*
     * ## Le défaut que ce test attrape
     *
     * Le coffre du Yonko a partagé son prix avec le coffre de Nami — 9,99 €
     * tous les deux — pour des contenus incomparables :
     *
     *     Coffre de Nami    12 coffres      valeur 1 790   179 par euro
     *     Coffre du Yonko    1 coffre royal   valeur 466    47 par euro
     *
     * Le produit haut de gamme donnait **3,8 fois moins** que son voisin, au
     * centime près du même prix.
     *
     * ## Les trois axes, et pourquoi il les faut tous
     *
     * Un produit phare doit être le plus cher, donner le plus, **et** offrir
     * le meilleur rapport à l'euro. Les deux premiers sans le troisième
     * recréent exactement le piège corrigé sur la Bourse de Berries : payer
     * davantage pour une unité plus chère.
     *
     * ## La mesure
     *
     * La valeur d'une carte est estimée par ce que le jeu lui-même en dit :
     * les fragments qu'elle rend en double. C'est un étalon interne, pas un
     * prix de marché — il ne sert qu'à comparer deux produits entre eux, ce
     * qui est précisément la question posée.
     */
    const valeurDe = (slots: readonly Rarity[]) => {
      let total = 0;
      for (const minimum of slots) {
        const eligibles = CHARACTERS.filter((c) => isAtLeast(c.rarity, minimum));
        const poids = eligibles.reduce((s, c) => s + RARITY_WEIGHTS[c.rarity], 0);
        for (const c of eligibles) {
          total += (RARITY_WEIGHTS[c.rarity] / poids) * DUPLICATE_SHARDS[c.rarity];
        }
      }
      return total;
    };

    const parCoffreNormal = valeurDe(CHEST_SLOTS);
    const parCoffreRoyal = valeurDe(ROYAL_CHEST_SLOTS);

    const produits = Object.values(CATALOG)
      .filter((p) => p.category !== 'CHARACTER')
      .map((p) => {
        const valeur =
          (p.grants.chests + p.grants.berries / CHEST_PRICE_BERRIES) * parCoffreNormal +
          (p.grants.royalChests ?? 0) * parCoffreRoyal;
        return { id: p.id, cents: p.priceCents, valeur, parEuro: valeur / p.priceCents };
      });

    const phare = produits.find((p) => p.id === 'royal_chest')!;
    const autres = produits.filter((p) => p.id !== 'royal_chest');

    for (const autre of autres) {
      expect(phare.cents, `${autre.id} coûte autant ou plus que le phare`).toBeGreaterThan(
        autre.cents,
      );
      expect(phare.valeur, `${autre.id} donne autant ou plus que le phare`).toBeGreaterThan(
        autre.valeur,
      );
      expect(
        phare.parEuro,
        `${autre.id} offre un meilleur rapport que le phare`,
      ).toBeGreaterThanOrEqual(autre.parEuro);
    }
  });

  it('ne fait pas payer le hasard plus cher que la certitude', () => {
    /*
     * Le coffre royal — un Légendaire ou mieux **tiré au sort** — coûtait
     * 14,99 € l'unité, contre 12,99 € pour Luffy en personne, garanti et
     * Mythique. Un produit aléatoire vendu au-dessus du produit certain dit au
     * joueur que le prix ne suit aucune logique.
     *
     * La comparaison se fait désormais **à l'unité** : le produit phare est un
     * lot de dix coffres royaux, et opposer son prix total à celui d'une carte
     * ne voudrait rien dire. C'est le prix d'un coffre qui doit rester sous
     * celui d'un Mythique nommé.
     */
    const royal = CATALOG.royal_chest;
    const parCoffre = royal.priceCents / (royal.grants.royalChests ?? 1);
    const mythique = Object.values(CATALOG).find((p) => p.rarity === 'MYTHIC')!;

    expect(parCoffre).toBeLessThan(mythique.priceCents);
  });

  it('fait payer le Mythique plus cher que les Légendaires', () => {
    // Il est dix fois plus rare au coffre. Un même prix pour deux raretés
    // dirait au joueur que la rareté ne veut rien dire.
    const mythique = personnages.find((p) => p.rarity === 'MYTHIC')!;
    for (const legendaire of personnages.filter((p) => p.rarity === 'LEGENDARY')) {
      expect(mythique.priceCents).toBeGreaterThan(legendaire.priceCents);
    }
  });
});
