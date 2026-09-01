'use server';

import { z } from 'zod';
import { productOf, withinDailyCap } from '@/domain/payments/catalog';
import { effectivePriceCents } from '@/domain/payments/promotion';
import { restrictionsForBirthDate } from '@/domain/compliance/age';
import { requireSession } from '@/lib/auth/guards';
import { assertSameOrigin } from '@/lib/auth/request-guard';
import { audit } from '@/lib/audit';
import { paymentsState } from '@/lib/payments/provider';
import { baseUrl } from '@/lib/email/templates';
import { db } from '@/lib/supabase-admin';

/**
 * Achat en argent réel (cahier §113, §114).
 *
 * Rien de ce qui touche à l'argent ne vient du client. Le navigateur envoie un
 * **identifiant de produit** ; le montant, la devise et ce qui est accordé
 * sont lus dans le catalogue côté serveur. Un prix transmis par le client
 * serait un prix négociable par lui.
 *
 * Ordre des contrôles, du plus bloquant au plus fin :
 *
 *   paiements activés → produit connu → âge → plafond journalier → intention
 *
 * L'âge passe **avant** le plafond, et ce n'est pas indifférent : un compte
 * mineur ou sans date de naissance a un plafond nul, et doit recevoir un
 * message qui explique pourquoi plutôt qu'un « plafond atteint » incompréhensible.
 */

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

const ProductSchema = z.string().min(1).max(64);

export async function startCheckoutAction(
  productId: unknown,
): Promise<CheckoutResult> {
  await assertSameOrigin();
  const session = await requireSession();

  const state = paymentsState();
  if (!state.enabled) {
    // Le message dit la vérité plutôt que d'inventer une panne : le joueur
    // n'a rien fait de mal, et la fonction n'est pas cassée — elle n'est pas
    // encore ouverte.
    return {
      ok: false,
      error:
        'La boutique en argent réel n’est pas encore ouverte. Les Berries gagnées en jeu donnent accès aux mêmes coffres.',
    };
  }

  const parsed = ProductSchema.safeParse(productId);
  if (!parsed.success) return { ok: false, error: 'Produit inconnu.' };

  const product = productOf(parsed.data);
  if (!product) return { ok: false, error: 'Produit inconnu.' };

  // Prix effectif : le catalogue donne le prix courant, l'offre de lancement
  // peut le réduire. Il est calculé **une fois**, ici, et sert ensuite à la
  // fois au plafond journalier, à l'intention en base et à la session de
  // paiement — trois calculs séparés finiraient par diverger, et c'est le
  // joueur qui découvrirait l'écart au moment de payer.
  const priceCents = effectivePriceCents(product, new Date());

  // §114 : protection des mineurs. La restriction est recalculée ici, côté
  // serveur, à partir de la date de naissance en base — jamais à partir de ce
  // que le navigateur affirme.
  const { data: account } = await db()
    .from('user_accounts')
    .select('birth_date')
    .eq('player_id', session.playerId)
    .maybeSingle();

  const restrictions = restrictionsForBirthDate(
    account?.birth_date ? new Date(`${account.birth_date}T00:00:00Z`) : null,
    new Date(),
  );

  if (restrictions.dailySpendCapCents <= 0) {
    await audit({
      playerId: session.playerId,
      action: 'shop.checkout',
      status: 'REFUSED',
      metadata: { reason: 'AGE_RESTRICTION', productId: product.id },
    });
    return { ok: false, error: restrictions.reason ?? 'Achat indisponible.' };
  }

  // Dépense du jour, sur les intentions réellement payées.
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const { data: today } = await db()
    .from('payment_intents')
    .select('amount_cents')
    .eq('player_id', session.playerId)
    .eq('status', 'PAID')
    .gte('created_at', startOfDay.toISOString());

  const spent = ((today ?? []) as { amount_cents: number }[]).reduce(
    (sum, row) => sum + row.amount_cents,
    0,
  );

  if (!withinDailyCap(spent, priceCents, restrictions.dailySpendCapCents)) {
    return {
      ok: false,
      error: 'Plafond de dépense journalier atteint. Réessaie demain.',
    };
  }

  // L'intention est créée **avant** la redirection : sans elle, un paiement
  // qui aboutit n'aurait aucune ligne à rapprocher, et le webhook ne saurait
  // pas à qui créditer.
  const { data: intent, error } = await db()
    .from('payment_intents')
    .insert({
      player_id: session.playerId,
      product_id: product.id,
      amount_cents: priceCents,
      currency: product.currency,
      provider: state.provider.name,
    })
    .select('id')
    .single();

  if (error || !intent) {
    return { ok: false, error: 'Impossible d’ouvrir le paiement.' };
  }

  try {
    const checkout = await state.provider.createCheckout({
      product,
      amountCents: priceCents,
      playerId: session.playerId,
      intentId: intent.id,
      successUrl: `${baseUrl()}/boutique?paiement=ok`,
      cancelUrl: `${baseUrl()}/boutique?paiement=annule`,
    });

    await db()
      .from('payment_intents')
      .update({ provider_ref: checkout.reference })
      .eq('id', intent.id);

    await audit({
      playerId: session.playerId,
      action: 'shop.checkout',
      status: 'SUCCESS',
      metadata: { productId: product.id, intentId: intent.id, amountCents: priceCents },
    });

    return { ok: true, url: checkout.url };
  } catch (caught) {
    await db()
      .from('payment_intents')
      .update({ status: 'FAILED' })
      .eq('id', intent.id);

    console.warn('[shop] CHECKOUT_FAILED', (caught as Error).message);
    return { ok: false, error: 'Le prestataire de paiement est injoignable.' };
  }
}
