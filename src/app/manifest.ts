import type { MetadataRoute } from 'next';

/**
 * Manifeste d'application web (`/manifest.webmanifest`).
 *
 * C'est **le seul fichier qui décide si le jeu peut devenir une application
 * Android**. Sans lui, Chrome ne propose pas l'installation, et Bubblewrap —
 * l'outil de Google qui empaquette un site en `.aab` pour le Play Store — n'a
 * rien à lire : il part de cette URL, et de rien d'autre.
 *
 * Trois champs ne sont pas décoratifs, et une erreur sur l'un d'eux ne produit
 * aucun message :
 *
 *   - `display: 'standalone'` retire la barre d'adresse. En `browser`, le
 *     Play Store refuse le paquet : ce n'est plus une application, c'est un
 *     signet.
 *   - les icônes **192 et 512** sont exigées toutes les deux. Une seule des
 *     deux, et le critère d'installabilité de Chrome échoue en silence — la
 *     bannière « Ajouter à l'écran d'accueil » ne paraît simplement jamais.
 *   - `purpose: 'maskable'` sur un jeu d'icônes séparé. Android **rogne**
 *     jusqu'à 20 % de chaque bord pour adapter l'icône à la forme du lanceur
 *     (cercle, goutte, écusson selon le constructeur). Une icône « any »
 *     servie comme masquable se fait donc amputer de ses bords ; les icônes
 *     `icon-maskable-*` gardent le chapeau dans le cercle de sûreté.
 *
 * `start_url` reste la racine : c'est l'écran de pronostic, et un joueur non
 * connecté y est redirigé vers `/login` par le serveur. Pointer directement
 * `/login` figerait l'application sur l'écran d'authentification pour un
 * joueur déjà connecté.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    // `id` fige l'identité de l'application côté Play Store et côté Chrome.
    // Sans lui, l'identifiant est déduit de `start_url` : le jour où celle-ci
    // change, l'application installée est considérée comme une **autre**
    // application, et le joueur se retrouve avec deux icônes.
    id: '/',
    name: 'One Piece Quest',
    short_name: 'OP Quest',
    description:
      'Le chapitre est le spectacle. Ta prédiction est le jeu. Choisis 3 personnages avant dimanche 23:59:59 et affronte le classement hebdomadaire.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    lang: 'fr-FR',
    dir: 'ltr',
    categories: ['games', 'entertainment'],
    /*
     * Les deux surfaces que le système peint lui-même, et qui prennent
     * désormais le noir de l'icône (#0a090c, relevé au pixel sur la source) :
     *
     *   — `theme_color` teinte la barre d'état d'Android, au-dessus de la
     *     page. Elle **doit** rester identique à `viewport.themeColor` du
     *     gabarit racine : les désaccorder donne une bande de couleur
     *     différente au-dessus de la page, au lancement ;
     *   — `background_color` est le fond de l'écran de démarrage, derrière
     *     l'icône, avant que la page ait peint quoi que ce soit.
     *
     * Le contenu du jeu reste, lui, au bleu nuit du port. La barre d'état est
     * donc un cran plus sombre que la page qu'elle surplombe — c'est un choix
     * assumé : l'identité vue depuis le lanceur et l'écran de démarrage
     * l'emporte ici sur la continuité avec le haut de la page.
     */
    theme_color: '#0a090c',
    background_color: '#0a090c',
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    // Raccourcis de l'appui long sur l'icône, dans le lanceur Android.
    shortcuts: [
      {
        name: 'Mon équipage',
        short_name: 'Équipage',
        description: 'Choisir les 3 personnages de la semaine',
        url: '/',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Classement',
        short_name: 'Classement',
        description: 'Voir le classement hebdomadaire',
        url: '/classement',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Ma collection',
        short_name: 'Collection',
        description: 'Consulter les cartes obtenues',
        url: '/collection',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
    ],
  };
}
