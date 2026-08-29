/**
 * Génère le code TOTP courant pour un secret base32.
 *
 *   node --experimental-strip-types scripts/totp.mjs <SECRET_BASE32>
 *
 * Outil de développement : il sert à tester le parcours MFA sans téléphone.
 * Il n'a aucune place en production.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const { base32Decode, generateTotp } = await import(
  pathToFileURL(path.join(root, 'src/domain/auth/totp.ts')).href
);

const secret = process.argv[2];
if (!secret) {
  console.error('Usage : node --experimental-strip-types scripts/totp.mjs <SECRET>');
  process.exit(1);
}

console.log(generateTotp(base32Decode(secret), new Date()));
