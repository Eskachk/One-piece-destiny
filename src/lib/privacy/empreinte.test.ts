import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

/**
 * Le module met la clé en cache : chaque scénario le recharge pour partir
 * d'un environnement propre.
 */
async function charger() {
  vi.resetModules();
  return import('./empreinte');
}

describe('empreinteIp', () => {
  const env = process.env.MFA_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.MFA_ENCRYPTION_KEY = 'une-phrase-secrete-assez-longue';
  });
  afterEach(() => {
    if (env === undefined) delete process.env.MFA_ENCRYPTION_KEY;
    else process.env.MFA_ENCRYPTION_KEY = env;
  });

  it('ne ressemble jamais à une adresse', async () => {
    const { empreinteIp } = await charger();
    const e = empreinteIp('82.66.12.7');
    expect(e).toMatch(/^h:[A-Za-z0-9_-]{22}$/);
    expect(e).not.toContain('82.66');
  });

  it('conserve l’égalité, et rien d’autre', async () => {
    const { empreinteIp } = await charger();
    expect(empreinteIp('82.66.12.7')).toBe(empreinteIp(' 82.66.12.7 '));
    expect(empreinteIp('82.66.12.7')).not.toBe(empreinteIp('82.66.12.8'));
  });

  it('dépend de la clé : sans elle, une autre empreinte', async () => {
    const { empreinteIp: avec } = await charger();
    const a = avec('82.66.12.7');
    delete process.env.MFA_ENCRYPTION_KEY;
    const { empreinteIp: sans } = await charger();
    expect(sans('82.66.12.7')).not.toBe(a);
    expect(sans('82.66.12.7')).toMatch(/^h:/);
  });

  it('est idempotente et tolère l’absence', async () => {
    const { empreinteIp } = await charger();
    const e = empreinteIp('2001:db8::1')!;
    expect(empreinteIp(e)).toBe(e);
    expect(empreinteIp(null)).toBeNull();
    expect(empreinteIp(undefined)).toBeNull();
    expect(empreinteIp('   ')).toBeNull();
  });

  it('s’abrège pour l’affichage sans livrer l’empreinte entière', async () => {
    const { empreinteIp, abregerEmpreinte } = await charger();
    const e = empreinteIp('82.66.12.7')!;
    const court = abregerEmpreinte(e)!;
    expect(court).toHaveLength(9);
    expect(e).toContain(court.slice(0, 8));
    expect(abregerEmpreinte('82.66.12.7')).toBe('origine retirée');
    expect(abregerEmpreinte(null)).toBeNull();
  });
});
