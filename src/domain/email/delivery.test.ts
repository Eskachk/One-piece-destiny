import { describe, expect, it } from 'vitest';
import {
  backoffMs,
  classifyStatus,
  isSendableAddress,
  MAX_ATTEMPTS,
  MAX_DELAY_MS,
  nextStep,
} from './delivery';

describe('remise des e-mails', () => {
  it('réessaie après un échec temporaire', () => {
    const step = nextStep({ attempts: 1, failure: 'TRANSIENT' }, () => 0.5);
    expect(step.action).toBe('RETRY');
  });

  it('n’insiste jamais sur un échec définitif', () => {
    // Réessayer cinq fois une adresse refusée abîme la réputation d'envoi
    // sans aucune chance d'aboutir.
    const step = nextStep({ attempts: 1, failure: 'PERMANENT' });
    expect(step.action).toBe('DEAD_LETTER');
  });

  it('abandonne après le nombre maximal de tentatives', () => {
    const step = nextStep({ attempts: MAX_ATTEMPTS, failure: 'TRANSIENT' });
    expect(step.action).toBe('DEAD_LETTER');
  });

  it('espace les tentatives de plus en plus', () => {
    const sansAlea = () => 0.5; // jitter nul
    const delais = [1, 2, 3, 4].map((n) => backoffMs(n, sansAlea));
    for (let i = 1; i < delais.length; i += 1) {
      expect(delais[i]).toBeGreaterThan(delais[i - 1]);
    }
  });

  it('plafonne le délai', () => {
    expect(backoffMs(50, () => 0.5)).toBeLessThanOrEqual(MAX_DELAY_MS * 1.2);
  });

  it('classe les pannes serveur comme temporaires', () => {
    expect(classifyStatus(500)).toBe('TRANSIENT');
    expect(classifyStatus(503)).toBe('TRANSIENT');
    // 429 : le fournisseur est débordé, pas le message fautif.
    expect(classifyStatus(429)).toBe('TRANSIENT');
  });

  it('classe les refus de requête comme définitifs', () => {
    expect(classifyStatus(422)).toBe('PERMANENT');
    expect(classifyStatus(400)).toBe('PERMANENT');
  });
});

describe('validation d’adresse', () => {
  it('accepte une adresse ordinaire', () => {
    expect(isSendableAddress('zoro@example.com')).toBe(true);
    expect(isSendableAddress('marie.dupont+jeu@sous.domaine.fr')).toBe(true);
  });

  it('refuse une adresse porteuse d’un saut de ligne', () => {
    // C'est la porte d'entrée de l'injection d'en-tête : le destinataire
    // caché serait ajouté sans que personne le voie.
    expect(isSendableAddress('a@b.com\nBcc: victime@example.com')).toBe(false);
    expect(isSendableAddress('a@b.com\r\nBcc: victime@example.com')).toBe(false);
    expect(isSendableAddress('a@b.com\0')).toBe(false);
  });

  it('refuse les adresses manifestement invalides', () => {
    expect(isSendableAddress('sans-arobase')).toBe(false);
    expect(isSendableAddress('deux@@arobases.com')).toBe(false);
    expect(isSendableAddress('a@b')).toBe(false);
    expect(isSendableAddress('a'.repeat(250) + '@b.com')).toBe(false);
  });
});
