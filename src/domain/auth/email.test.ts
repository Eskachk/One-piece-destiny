import { describe, expect, it } from 'vitest';
import { canonicalEmail } from './email';

describe('forme canonique d’une adresse (§43)', () => {
  it('ignore la casse et les espaces', () => {
    expect(canonicalEmail('  Luffy@Example.FR ')).toBe('luffy@example.fr');
  });

  it('retire l’étiquette « +… » de la partie locale', () => {
    expect(canonicalEmail('luffy+opq@example.fr')).toBe('luffy@example.fr');
    expect(canonicalEmail('luffy+1+2@example.fr')).toBe('luffy@example.fr');
  });

  it('ne touche pas aux points hors Gmail', () => {
    expect(canonicalEmail('monkey.d.luffy@example.fr')).toBe('monkey.d.luffy@example.fr');
  });

  it('confond ce que Gmail confond : points, étiquette, googlemail', () => {
    const attendu = 'monkeydluffy@gmail.com';
    expect(canonicalEmail('monkey.d.luffy@gmail.com')).toBe(attendu);
    expect(canonicalEmail('MonkeyDLuffy+mugiwara@gmail.com')).toBe(attendu);
    expect(canonicalEmail('monkeydluffy@googlemail.com')).toBe(attendu);
  });

  it('rend une chaîne sans arobase telle quelle, en minuscules', () => {
    expect(canonicalEmail('PasUneAdresse')).toBe('pasuneadresse');
    expect(canonicalEmail('+bizarre@example.fr')).toBe('+bizarre@example.fr');
  });
});
