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
  return {
    name: 'stripe',

    async createCheckout(request) {
      const body = new URLSearchParams({
        mode: 'payment',
        success_url: request.successUrl,
        cancel_url: request.cancelUrl,
        'line_items[0][price_data][currency]': request.product.currency.toLowerCase(),
        'line_items[0][price_data][unit_amount]': String(request.product.priceCents),
        'line_items[0][price_data][product_data][name]': request.product.label,
        'line_items[0][quantity]': '1',
        // Le joueur et l'intention voyagent en métadonnées : au retour du
        // webhook, on sait qui créditer sans faire confiance au navigateur.
        'metadata[player_id]': request.playerId,
        'metadata[intent_id]': request.intentId,
        'metadata[product_id]': request.product.id,
        client_reference_id: request.intentId,
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
        throw new Error(`Stripe checkout : HTTP ${response.status}`);
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
