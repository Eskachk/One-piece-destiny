import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

/**
 * En-têtes de sécurité (cahier §84.2). La CSP est volontairement stricte ;
 * `unsafe-inline` sur les styles est nécessaire au runtime de Next et devra
 * être remplacé par un nonce avant la mise en production.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

/**
 * `next build` et `next dev` écrivaient tous deux dans `.next`. Lancer un
 * build pendant que le serveur de développement tourne effaçait les feuilles
 * de style que celui-ci servait : le site restait fonctionnel mais **arrivait
 * entièrement sans CSS**, sans la moindre erreur pour l'expliquer. Le cas
 * s'est produit en vrai.
 *
 * On sépare donc les deux répertoires **en local uniquement** : le
 * développement garde `.next`, un build local écrit `.next-build`.
 *
 * Sur Vercel, on revient au `.next` par défaut. La collision n'y existe pas —
 * aucun serveur de développement ne tourne pendant le build — et la
 * plateforme cherche `.next` à un emplacement figé : un premier déploiement a
 * échoué sur « output directory .next was not found », le build ayant réussi
 * mais écrit ailleurs. Un correctif local ne doit pas déborder sur
 * l'hébergement.
 */
export default function config(phase: string): NextConfig {
  return {
    poweredByHeader: false, // §84.2 : supprimer X-Powered-By
    distDir:
      process.env.VERCEL || phase === PHASE_DEVELOPMENT_SERVER
        ? '.next'
        : '.next-build',
    async headers() {
      return [{ source: '/:path*', headers: securityHeaders }];
    },
  };
}
