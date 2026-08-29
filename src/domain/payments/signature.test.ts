import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { TOLERANCE_SECONDS, verifyStripeSignature } from './signature';

const SECRET = 'whsec_test_1234567890abcdef';
const CORPS = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed' });
const MAINTENANT = new Date('2026-08-29T12:00:00Z');

function signe(corps: string, secret: string, at: Date): string {
  const t = Math.floor(at.getTime() / 1000);
  const v1 = createHmac('sha256', secret).update(`${t}.${corps}`).digest('hex');
  return `t=${t},v1=${v1}`;
}

describe('signature de webhook', () => {
  it('accepte une signature valide', () => {
    const entete = signe(CORPS, SECRET, MAINTENANT);
    expect(verifyStripeSignature(CORPS, entete, SECRET, MAINTENANT)).toBe(true);
  });

  it('refuse une signature forgée', () => {
    // Le cas qui compte : sans ce refus, n'importe qui pourrait se créditer
    // en envoyant un « paiement réussi ».
    const entete = signe(CORPS, 'mauvais_secret', MAINTENANT);
    expect(verifyStripeSignature(CORPS, entete, SECRET, MAINTENANT)).toBe(false);
  });

  it('refuse un corps modifié après signature', () => {
    const entete = signe(CORPS, SECRET, MAINTENANT);
    const falsifie = CORPS.replace('evt_1', 'evt_2');
    expect(verifyStripeSignature(falsifie, entete, SECRET, MAINTENANT)).toBe(false);
  });

  it('refuse un rejeu au-delà de la tolérance', () => {
    // Une signature reste valable indéfiniment sans fenêtre temporelle : un
    // webhook légitime capté une fois pourrait être renvoyé sans fin.
    const vieux = new Date(MAINTENANT.getTime() - (TOLERANCE_SECONDS + 60) * 1000);
    const entete = signe(CORPS, SECRET, vieux);
    expect(verifyStripeSignature(CORPS, entete, SECRET, MAINTENANT)).toBe(false);
  });

  it('accepte dans la fenêtre de tolérance', () => {
    const recent = new Date(MAINTENANT.getTime() - 60_000);
    const entete = signe(CORPS, SECRET, recent);
    expect(verifyStripeSignature(CORPS, entete, SECRET, MAINTENANT)).toBe(true);
  });

  it('refuse une signature datée du futur au-delà de la tolérance', () => {
    const futur = new Date(MAINTENANT.getTime() + (TOLERANCE_SECONDS + 60) * 1000);
    const entete = signe(CORPS, SECRET, futur);
    expect(verifyStripeSignature(CORPS, entete, SECRET, MAINTENANT)).toBe(false);
  });

  it('refuse un en-tête absent ou malformé', () => {
    expect(verifyStripeSignature(CORPS, null, SECRET, MAINTENANT)).toBe(false);
    expect(verifyStripeSignature(CORPS, '', SECRET, MAINTENANT)).toBe(false);
    expect(verifyStripeSignature(CORPS, 'nimportequoi', SECRET, MAINTENANT)).toBe(false);
    expect(verifyStripeSignature(CORPS, 't=abc,v1=def', SECRET, MAINTENANT)).toBe(false);
    // Horodatage sans signature.
    expect(verifyStripeSignature(CORPS, 't=1772280000', SECRET, MAINTENANT)).toBe(false);
  });

  it('refuse quand le secret est absent', () => {
    // Un secret vide ne doit jamais valider : ce serait une porte ouverte.
    const entete = signe(CORPS, SECRET, MAINTENANT);
    expect(verifyStripeSignature(CORPS, entete, '', MAINTENANT)).toBe(false);
  });

  it('accepte plusieurs signatures pendant une rotation de secret', () => {
    const t = Math.floor(MAINTENANT.getTime() / 1000);
    const bonne = createHmac('sha256', SECRET).update(`${t}.${CORPS}`).digest('hex');
    const autre = createHmac('sha256', 'ancien').update(`${t}.${CORPS}`).digest('hex');

    expect(
      verifyStripeSignature(CORPS, `t=${t},v1=${autre},v1=${bonne}`, SECRET, MAINTENANT),
    ).toBe(true);
  });
});
