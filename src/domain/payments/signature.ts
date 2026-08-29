
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Vérification de la signature d'un webhook Stripe.
 *
 * C'est la seule chose qui distingue un paiement réel d'une requête forgée.
 * Sans elle, n'importe qui pourrait envoyer un `checkout.session.completed`
 * et se créditer — c'est précisément ce que le prompt interdit : ne jamais
 * accorder une récompense parce que l'appelant l'affirme.
 *
 * Trois protections :
 *
 *   1. HMAC-SHA256 sur `timestamp.corps` avec le secret du webhook ;
 *   2. comparaison en temps constant ;
 *   3. **fenêtre temporelle** : une signature valide mais ancienne est
 *      refusée, sinon un webhook légitime capté une fois pourrait être rejoué
 *      indéfiniment.
 */

/** Au-delà, l'événement est considéré comme un rejeu. */
export const TOLERANCE_SECONDS = 300;

export function verifyStripeSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  now: Date = new Date(),
): boolean {
  if (!header || !secret) return false;

  // Format : « t=1712345678,v1=abc...,v1=def... »
  const parts = new Map<string, string[]>();
  for (const segment of header.split(',')) {
    const [key, value] = segment.split('=');
    if (!key || !value) continue;
    parts.set(key.trim(), [...(parts.get(key.trim()) ?? []), value.trim()]);
  }

  const timestamp = parts.get('t')?.[0];
  const signatures = parts.get('v1') ?? [];
  if (!timestamp || signatures.length === 0) return false;

  const sentAt = Number(timestamp);
  if (!Number.isFinite(sentAt)) return false;

  const ageSeconds = Math.abs(Math.floor(now.getTime() / 1000) - sentAt);
  if (ageSeconds > TOLERANCE_SECONDS) return false;

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  // Stripe peut envoyer plusieurs signatures pendant une rotation de secret :
  // une seule correspondance suffit.
  return signatures.some((candidate) => constantTimeEquals(candidate, expected));
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
