import 'server-only';

import type { Product } from '@/domain/payments/catalog';

/**
 * Abstraction du prestataire de paiement.
 *
 * ⚠️ **AUCUN PAIEMENT RÉEL N'EST ACTIVÉ.** L'architecture est en place pour
 * que le jour de l'activation soit un changement de configuration et non une
 * réécriture — mais l'activation reste suspendue à l'audit juridique du §122,
 * qui commande aussi les obligations du §114 sur les mineurs.
 *
 * Le verrou est explicite et à trois tours :
 *
 *   1. `PAYMENTS_ENABLED` doit valoir `true` ;
 *   2. une clé prestataire doit être configurée ;
 *   3. en production, `PAYMENT_MODE` doit valoir `live` — sinon
 *      `assertEnvironment` empêche le démarrage, pour qu'un paiement de test
 *      ne puisse jamais créditer un vrai compte.
 *
 * Aucune donnée bancaire ne transite ici : ni numéro de carte, ni CVV, ni
 * IBAN. Le prestataire héberge le formulaire, l'application ne voit que le
 * résultat signé.
 */

export interface CheckoutRequest {
  product: Product;
  /**
   * Montant à encaisser, en centimes.
   *
   * Distinct de `product.priceCents` : une offre de lancement fait payer moins
   * cher. Il est passé explicitement plutôt que recalculé ici, pour qu'il n'y
   * ait **qu'un seul endroit** où le prix effectif est décidé — sinon la
   * session de paiement, l'intention en base et l'affichage finissent par
   * diverger, et c'est le joueur qui découvre l'écart au moment de payer.
   */
  amountCents: number;
  playerId: string;
  intentId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  /** URL vers laquelle rediriger l'acheteur. */
  url: string;
  /** Référence du prestataire, conservée pour le rapprochement. */
  reference: string;
}

/** Charge utile d'un webhook, une fois la signature vérifiée. */
export interface VerifiedEvent {
  eventId: string;
  intentId: string | null;
  productId: string;
  amountCents: number;
  currency: string;
  status: string;
}

export interface PaymentProvider {
  readonly name: string;
  createCheckout(request: CheckoutRequest): Promise<CheckoutSession>;
  /** Vérifie la signature et renvoie l'événement, ou `null` si invalide. */
  verifyWebhook(rawBody: string, signature: string | null): Promise<VerifiedEvent | null>;
  retrievePayment(reference: string): Promise<VerifiedEvent | null>;
}

export type PaymentsState =
  | { enabled: false; reason: string }
  | { enabled: true; provider: PaymentProvider; mode: 'test' | 'live' };

/**
 * État du système de paiement.
 *
 * Par défaut désactivé, et le message dit pourquoi. Un système de paiement qui
 * échoue silencieusement serait pire qu'un système absent.
 */
export function paymentsState(): PaymentsState {
  if (process.env.PAYMENTS_ENABLED !== 'true') {
    return {
      enabled: false,
      reason:
        'Paiements désactivés : en attente de l’audit juridique (§122) et des obligations de protection des mineurs (§114).',
    };
  }

  const secret = process.env.PAYMENT_SECRET_KEY;
  const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;

  if (!secret || !webhookSecret) {
    return {
      enabled: false,
      reason:
        'PAYMENT_SECRET_KEY ou PAYMENT_WEBHOOK_SECRET absent : le webhook ne pourrait pas être vérifié.',
    };
  }

  const mode: 'test' | 'live' = process.env.PAYMENT_MODE === 'live' ? 'live' : 'test';

  // Garde-fou supplémentaire, indépendant de `assertEnvironment` : une clé
  // Stripe de test commence par `sk_test_`. La confondre avec une clé de
  // production créditerait de vrais comptes sur des paiements fictifs.
  if (mode === 'live' && secret.startsWith('sk_test_')) {
    return {
      enabled: false,
      reason: 'PAYMENT_MODE=live avec une clé de test : combinaison refusée.',
    };
  }

  return { enabled: true, provider: stripeProvider(secret, webhookSecret), mode };
}

/**
 * Les moyens de paiement à proposer, lus dans `PAYMENT_METHODS`.
 *
 * `card` par défaut, et seul : c'est le seul moyen qu'un compte Stripe possède
 * toujours. Tout autre doit d'abord être activé dans le tableau de bord, sinon
 * Stripe refuse la session entière.
 *
 * Le filtre sur l'alphabet n'est pas de la paranoïa : ces identifiants partent
 * dans le corps d'une requête, et une valeur mal recopiée dans la
 * configuration doit être écartée ici plutôt que produire un 400 obscur de
 * plus.
 */
function moyensDePaiement(): string[] {
  const brut = process.env.PAYMENT_METHODS;
  if (!brut) return ['card'];

  const lus = brut
    .split(',')
    .map((m) => m.trim().toLowerCase())
    .filter((m) => /^[a-z_]{2,30}$/.test(m));

  return lus.length > 0 ? lus : ['card'];
}

/**
 * Prestataire Stripe.
 *
 * Stripe est retenu parce qu'il est déjà envisagé dans l'outillage du projet
 * et qu'il porte nativement ce dont le §114 aura besoin : Checkout hébergé (le
 * formulaire de carte ne touche jamais l'application), signature de webhook,
 * et remboursement.
 *
 * Implémenté en HTTP direct, sans SDK : une dépendance de plus pour un système
 * qui n'est pas activé serait prématurée.
 */
function stripeProvider(secretKey: string, webhookSecret: string): PaymentProvider {
  const methodes = moyensDePaiement();

  return {
    name: 'stripe',

    async createCheckout(request) {
      const body = new URLSearchParams({
        mode: 'payment',
        success_url: request.successUrl,
        cancel_url: request.cancelUrl,
        'line_items[0][price_data][currency]': request.product.currency.toLowerCase(),
        'line_items[0][price_data][unit_amount]': String(request.amountCents),
        'line_items[0][price_data][product_data][name]': request.product.label,
        'line_items[0][quantity]': '1',
        // Le joueur et l'intention voyagent en métadonnées : au retour du
        // webhook, on sait qui créditer sans faire confiance au navigateur.
        'metadata[player_id]': request.playerId,
        'metadata[intent_id]': request.intentId,
        'metadata[product_id]': request.product.id,
        client_reference_id: request.intentId,
      });

      /*
       * Moyens de paiement proposés.
       *
       * PayPal est un **moyen de paiement de Stripe Checkout**, pas un second
       * prestataire : la page hébergée affiche le bouton, Stripe encaisse, et
       * le même webhook signé remonte le résultat.
       *
       * ## Pourquoi ils ne sont plus écrits en dur
       *
       * `paypal` l'était, et il a mis la boutique entière hors service. Un
       * moyen de paiement doit être activé dans le tableau de bord Stripe ; en
       * demander un qui ne l'est pas fait refuser **toute la session** par un
       * HTTP 400. Le résultat n'était pas « PayPal manque » mais « aucun achat
       * n'est possible », carte comprise.
       *
       * L'ancien commentaire affirmait que ce cas remonterait « une erreur
       * explicite ». C'était faux : l'erreur jetée ne portait que le code HTTP,
       * et le message de Stripe — qui nomme précisément le moyen fautif —
       * était jeté avec le corps de la réponse.
       *
       * La liste reste lisible dans le code, avec `card` pour seul défaut :
       * c'est le seul moyen qu'un compte Stripe possède toujours. PayPal
       * s'ajoute par `PAYMENT_METHODS=card,paypal` **une fois activé** dans le
       * tableau de bord, jamais avant.
       */
      methodes.forEach((methode, i) => {
        body.append(`payment_method_types[${i}]`, methode);
      });

      const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });

      if (!response.ok) {
        // Le corps de Stripe dit *quoi* est refusé. Sans lui, on ne sait que
        // « 400 », ce qui a coûté un diagnostic entier.
        const detail = await response
          .json()
          .then((c: { error?: { message?: string } }) => c.error?.message ?? '')
          .catch(() => '');
        throw new Error(
          `Stripe checkout : HTTP ${response.status}${detail ? ` — ${detail}` : ''}`,
        );
      }

      const session = (await response.json()) as { id: string; url: string };
      return { url: session.url, reference: session.id };
    },

    async verifyWebhook(rawBody, signature) {
      const { verifyStripeSignature } = await import('./stripe-signature');
      if (!verifyStripeSignature(rawBody, signature, webhookSecret)) return null;

      const event = JSON.parse(rawBody) as {
        id: string;
        type: string;
        data: {
          object: {
            amount_total?: number;
            currency?: string;
            payment_status?: string;
            metadata?: Record<string, string>;
          };
        };
      };

      if (event.type !== 'checkout.session.completed') return null;

      const object = event.data.object;
      return {
        eventId: event.id,
        intentId: object.metadata?.intent_id ?? null,
        productId: object.metadata?.product_id ?? '',
        amountCents: object.amount_total ?? 0,
        currency: object.currency ?? '',
        status: object.payment_status === 'paid' ? 'paid' : 'unpaid',
      };
    },

    async retrievePayment(reference) {
      const response = await fetch(
        `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${secretKey}` } },
      );
      if (!response.ok) return null;

      const session = (await response.json()) as {
        id: string;
        amount_total?: number;
        currency?: string;
        payment_status?: string;
        metadata?: Record<string, string>;
      };

      return {
        eventId: session.id,
        intentId: session.metadata?.intent_id ?? null,
        productId: session.metadata?.product_id ?? '',
        amountCents: session.amount_total ?? 0,
        currency: session.currency ?? '',
        status: session.payment_status === 'paid' ? 'paid' : 'unpaid',
      };
    },
  };
}
