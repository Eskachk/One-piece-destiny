import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

/**
 * Domaines d'AdSense.
 *
 * Une régie publicitaire ne tient pas sur un seul nom : le script d'amorçage
 * arrive de `googlesyndication`, les créations de `doubleclick`, le cadre de
 * l'annonce de `tpc`, et la vérification de qualité de `adtrafficquality`.
 * Les omettre ne produit **aucune erreur visible** — les annonces
 * disparaissent, simplement, et le revenu avec.
 */
const ADSENSE_SCRIPTS = [
  'https://pagead2.googlesyndication.com',
  'https://partner.googleadservices.com',
  'https://tpc.googlesyndication.com',
  'https://www.googletagservices.com',
  'https://adservice.google.com',
  'https://googleads.g.doubleclick.net',
  'https://ep2.adtrafficquality.google',
  'https://fundingchoicesmessages.google.com',
];

/**
 * Domaines autorisés à ouvrir un cadre.
 *
 * ⚠️ **Vérifié dans un navigateur, et corrigé sur ce qu'il a dit.** La
 * première version de cette liste omettait `pagead2.googlesyndication.com` —
 * il n'y figurait qu'au titre du script. La console a répondu six fois :
 * « Framing 'https://pagead2.googlesyndication.com/' violates the following
 * Content Security Policy directive: frame-src ». Aucune annonce ne se serait
 * affichée, et **rien ne l'aurait montré côté joueur** : une annonce absente
 * ressemble à une annonce non vendue.
 *
 * D'où la règle : tout domaine qui sert un script de la régie peut aussi
 * ouvrir un cadre. La régie décide seule de la répartition, et elle la change
 * sans prévenir.
 */
const ADSENSE_FRAMES = [
  ...ADSENSE_SCRIPTS,
  'https://www.google.com',
  'https://googleads.g.doubleclick.net',
];

/**
 * Domaines que la régie peut appeler.
 *
 * ⚠️ **Deuxième correction dictée par un navigateur, celle-ci en production.**
 * La liste énumérée à la main omettait `fundingchoicesmessages.google.com` —
 * c'est le service du **bandeau de consentement** de Google. La console
 * répondait :
 *
 *     Connecting to 'https://fundingchoicesmessages.google.com/el/…' violates
 *     the following Content Security Policy directive: "connect-src …".
 *
 * Un bandeau de consentement qui ne peut pas enregistrer la réponse du joueur
 * n'est pas seulement une annonce en moins : c'est une obligation légale qui
 * ne s'exécute pas, sur un site qui diffuse de la publicité en Europe.
 *
 * Deux fois de suite, une énumération manuelle des domaines de la régie s'est
 * révélée incomplète. On s'aligne donc sur la même règle que pour les cadres :
 * **tout domaine qui sert un script de la régie peut aussi la joindre.** La
 * répartition appartient à Google et change sans préavis ; la deviner à la
 * main coûte des annonces muettes, et rien ne les signale.
 */
const ADSENSE_CONNECT = [
  ...ADSENSE_SCRIPTS,
  'https://ep1.adtrafficquality.google',
  'https://csi.gstatic.com',
  'https://googleads.g.doubleclick.net',
];

/**
 * Politique de sécurité du contenu (cahier §84.2).
 *
 * **Ce que ce fichier disait, et ce qu'il faisait.** Le commentaire d'origine
 * décrivait une CSP « volontairement stricte » et l'arbitrage retenu pour
 * `unsafe-inline`. Le tableau qui suivait ne contenait **aucune** ligne
 * `Content-Security-Policy` : la politique n'avait jamais été écrite. Quiconque
 * relisait ce fichier en concluait qu'elle était en place.
 *
 * ## Ce que la politique ci-dessous protège réellement
 *
 * `script-src` ne peut pas se passer de `unsafe-inline` ni de `unsafe-eval` :
 * Next injecte son amorçage en ligne, et la régie publicitaire compile ses
 * créations à l'exécution. La valeur défensive est donc ailleurs, et elle est
 * réelle :
 *
 *   - `frame-ancestors 'none'` interdit l'enchâssement du site — c'est
 *     `X-Frame-Options` en version qui fait autorité ;
 *   - `form-action 'self'` empêche qu'une injection réoriente l'envoi d'un
 *     formulaire — mot de passe compris — vers un domaine tiers ;
 *   - `base-uri 'self'` bloque la réécriture de `<base>`, qui détournerait
 *     d'un coup **toutes** les URL relatives de la page ;
 *   - `object-src 'none'` ferme les greffons ;
 *   - `connect-src` limite l'exfiltration : un script hostile ne peut pas
 *     poster ce qu'il a lu vers un serveur de son choix.
 *
 * Un nonce sur `script-src` reste l'étape suivante. Elle demande de passer le
 * nonce depuis le `middleware` jusqu'à la balise AdSense écrite à la main, et
 * de vérifier que la régie l'accepte — ce n'est pas une valeur à changer sans
 * regarder les annonces après coup.
 *
 * ## `dev`
 *
 * Le serveur de développement recharge par WebSocket et évalue les modules à
 * chaud. Sans `ws:` dans `connect-src`, le rechargement automatique meurt en
 * silence et l'on croit à un plantage du serveur.
 */
function contentSecurityPolicy(dev: boolean): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'base-uri': ["'self'"],
    'object-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'form-action': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", ...ADSENSE_SCRIPTS],
    'style-src': ["'self'", "'unsafe-inline'"],
    // `next/font` héberge les polices localement : aucun domaine tiers.
    'font-src': ["'self'", 'data:'],
    // Les créations publicitaires viennent d'un grand nombre de domaines que
    // Google ne publie pas. `https:` est le seul choix tenable, et une image
    // ne peut ni s'exécuter ni exfiltrer.
    'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    'frame-src': ["'self'", ...ADSENSE_FRAMES],
    'connect-src': ["'self'", ...ADSENSE_CONNECT, ...(dev ? ['ws:', 'wss:'] : [])],
    'media-src': ["'self'"],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
  };

  const lignes = Object.entries(directives).map(
    ([nom, sources]) => `${nom} ${sources.join(' ')}`,
  );
  // Hors développement seulement : en local, le site est en clair sur
  // `http://localhost`, et cette directive y casserait toutes les ressources.
  if (!dev) lignes.push('upgrade-insecure-requests');

  return lignes.join('; ');
}

/** En-têtes de sécurité (cahier §84.2). */
const securityHeaders = (dev: boolean) => [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy(dev) },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  /*
   * Aucune de ces trois interfaces n'est utilisée par le jeu. Les refuser
   * explicitement empêche qu'un script tiers — une régie publicitaire en
   * pratique — les demande au joueur en notre nom.
   */
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
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

    /**
     * Pastille d'outils de développement de Next, retirée.
     *
     * Elle flottait en bas à gauche de chaque page et se retrouvait sur les
     * captures d'écran. Deux précisions honnêtes :
     *
     *   — elle **n'apparaissait déjà pas en production** : c'est une pastille
     *     du serveur de développement, invisible pour les joueurs ;
     *   — elle **ne peut pas être réservée à l'administrateur.** Next la pose
     *     à la compilation, sans rien savoir de la session : il n'existe
     *     aucun réglage « visible pour ce compte seulement ».
     *
     * Les outils réservés à l'administrateur sont donc ailleurs, dans le
     * Chapter HQ (`/admin`), où le contrôle d'accès est réel.
     */
    devIndicators: false,
    distDir:
      process.env.VERCEL || phase === PHASE_DEVELOPMENT_SERVER
        ? '.next'
        : '.next-build',
    async headers() {
      return [
        {
          source: '/:path*',
          headers: securityHeaders(phase === PHASE_DEVELOPMENT_SERVER),
        },
      ];
    },
  };
}
