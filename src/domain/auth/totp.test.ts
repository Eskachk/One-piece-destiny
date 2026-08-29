import { describe, expect, it } from 'vitest';
import {
  base32Decode,
  base32Encode,
  DIGITS,
  generateTotp,
  otpauthUri,
  timeStep,
  verifyTotp,
} from './totp';

/**
 * Vecteurs de test de la RFC 6238 (annexe B), SHA-1.
 * Le secret est la chaîne ASCII « 12345678901234567890 ».
 * La RFC publie des codes à 8 chiffres ; on compare donc sur 8 chiffres,
 * puis on vérifie que la troncature à 6 correspond bien aux 6 derniers.
 */
const RFC_SECRET = new TextEncoder().encode('12345678901234567890');

const RFC_VECTORS: { seconds: number; code8: string }[] = [
  { seconds: 59, code8: '94287082' },
  { seconds: 1111111109, code8: '07081804' },
  { seconds: 1111111111, code8: '14050471' },
  { seconds: 1234567890, code8: '89005924' },
  { seconds: 2000000000, code8: '69279037' },
  { seconds: 20000000000, code8: '65353130' },
];

describe('conformité RFC 6238', () => {
  it.each(RFC_VECTORS)(
    'produit $code8 à T=$seconds',
    ({ seconds, code8 }) => {
      const at = new Date(seconds * 1000);
      expect(generateTotp(RFC_SECRET, at, 8)).toBe(code8);
    },
  );

  it('la version 6 chiffres correspond aux 6 derniers', () => {
    for (const { seconds, code8 } of RFC_VECTORS) {
      const at = new Date(seconds * 1000);
      expect(generateTotp(RFC_SECRET, at, 6)).toBe(code8.slice(-6));
    }
  });
});

describe('base32', () => {
  it('fait un aller-retour sans perte', () => {
    const secret = Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 250, 255, 0]);
    expect(base32Decode(base32Encode(secret))).toEqual(secret);
  });

  it('tolère minuscules, espaces et remplissage', () => {
    const encoded = base32Encode(RFC_SECRET);
    const messy = encoded.toLowerCase().replace(/(.{4})/g, '$1 ') + '==';
    expect(base32Decode(messy)).toEqual(RFC_SECRET);
  });

  it('rejette un caractère hors alphabet', () => {
    expect(() => base32Decode('ABC1')).toThrow(/invalide/);
  });
});

describe('verifyTotp', () => {
  const now = new Date(1_700_000_000_000);

  it('accepte le code courant', () => {
    const code = generateTotp(RFC_SECRET, now);
    expect(verifyTotp(RFC_SECRET, code, now).valid).toBe(true);
  });

  it('tolère une horloge décalée d\'un pas', () => {
    const past = new Date(now.getTime() - 30_000);
    const future = new Date(now.getTime() + 30_000);
    expect(verifyTotp(RFC_SECRET, generateTotp(RFC_SECRET, past), now).valid).toBe(true);
    expect(verifyTotp(RFC_SECRET, generateTotp(RFC_SECRET, future), now).valid).toBe(true);
  });

  it('refuse au-delà de la tolérance', () => {
    const tooOld = new Date(now.getTime() - 120_000);
    expect(verifyTotp(RFC_SECRET, generateTotp(RFC_SECRET, tooOld), now).valid).toBe(
      false,
    );
  });

  it('refuse le rejeu d\'un code déjà consommé', () => {
    const code = generateTotp(RFC_SECRET, now);
    const first = verifyTotp(RFC_SECRET, code, now);
    expect(first.valid).toBe(true);

    const replay = verifyTotp(RFC_SECRET, code, now, first.step);
    expect(replay.valid).toBe(false);
  });

  it('accepte le code suivant après une consommation', () => {
    const code = generateTotp(RFC_SECRET, now);
    const used = verifyTotp(RFC_SECRET, code, now).step!;

    const later = new Date(now.getTime() + 30_000);
    const nextCode = generateTotp(RFC_SECRET, later);
    expect(verifyTotp(RFC_SECRET, nextCode, later, used).valid).toBe(true);
  });

  it('rejette un format invalide sans consulter le secret', () => {
    for (const bad of ['', '12345', '1234567', 'abcdef', '12 34 56 78']) {
      expect(verifyTotp(RFC_SECRET, bad, now).valid).toBe(false);
    }
  });

  it('tolère les espaces dans un code par ailleurs valide', () => {
    const code = generateTotp(RFC_SECRET, now);
    const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
    expect(verifyTotp(RFC_SECRET, spaced, now).valid).toBe(true);
  });

  it('refuse un code produit par un autre secret', () => {
    const other = new TextEncoder().encode('09876543210987654321');
    expect(verifyTotp(RFC_SECRET, generateTotp(other, now), now).valid).toBe(false);
  });
});

describe('otpauthUri', () => {
  it('produit une URI exploitable par une application d\'authentification', () => {
    const uri = otpauthUri(RFC_SECRET, 'Grand Line Weekly', 'admin@example.com');
    expect(uri.startsWith('otpauth://totp/')).toBe(true);
    expect(uri).toContain(`digits=${DIGITS}`);
    expect(uri).toContain('period=30');
    expect(uri).toContain(`secret=${base32Encode(RFC_SECRET)}`);
  });
});

describe('timeStep', () => {
  it('avance d\'une unité toutes les 30 secondes', () => {
    const base = new Date(1_700_000_000_000);
    const later = new Date(base.getTime() + 30_000);
    expect(timeStep(later) - timeStep(base)).toBe(1);
  });
});
