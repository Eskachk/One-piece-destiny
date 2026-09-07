/*
 * Agent de service (« service worker ») de One Piece Quest.
 *
 * ## Pourquoi ce fichier existe
 *
 * Chrome refuse de déclarer un site installable s'il ne trouve pas d'agent de
 * service **qui intercepte réellement les requêtes** (un `fetch` enregistré et
 * utilisé). Sans ce critère, pas de bannière d'installation, et surtout pas
 * d'empaquetage possible pour le Play Store : Bubblewrap vérifie
 * l'installabilité avant de produire le paquet.
 *
 * ## Ce qu'il ne fait surtout pas
 *
 * Il ne met **aucune page HTML en cache**, et **aucune réponse d'API**. C'est
 * délibéré, et c'est le point où un agent de service mal écrit devient une
 * faille : les pages du jeu dépendent du cookie de session. Une page mise en
 * cache, c'est l'écran d'un joueur resservi tel quel — son équipage, ses
 * Berries, son pseudo — au joueur suivant sur le même appareil, et après une
 * déconnexion. Rien ne le signalerait ; la page paraîtrait simplement à jour.
 *
 * La règle appliquée ici est donc :
 *
 *   - navigation (une page)  → réseau uniquement, repli `/offline.html` ;
 *   - `/api/*`, `POST`, etc. → laissé au navigateur, jamais touché ;
 *   - fichiers versionnés    → cache d'abord (leur URL change à chaque build).
 *
 * ## Nom du cache
 *
 * Il porte une version. La faire avancer est le **seul** moyen de purger les
 * anciens fichiers : `activate` supprime tout cache dont le nom diffère.
 */

const CACHE = 'opq-static-v1';

/**
 * Le strict nécessaire pour afficher quelque chose sans réseau.
 *
 * `/offline.html` est un fichier statique, pas une route Next : une route
 * demanderait au serveur de la rendre, ce qui est exactement ce dont on ne
 * dispose pas quand on en a besoin.
 */
const PRECACHE = ['/offline.html', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      // `skipWaiting` évite qu'une version corrigée attende la fermeture de
      // tous les onglets pour prendre la main. Sans lui, un correctif publié
      // un dimanche soir n'atteindrait pas les joueurs déjà en train de jouer.
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((noms) =>
        Promise.all(noms.filter((nom) => nom !== CACHE).map((nom) => caches.delete(nom))),
      )
      .then(() => self.clients.claim()),
  );
});

/**
 * Ressources dont l'URL contient une empreinte de contenu.
 *
 * Next réécrit ces chemins à chaque build. Les mettre en cache sans limite est
 * donc sûr : une nouvelle version arrive sous une nouvelle URL, l'ancienne
 * n'est jamais resservie par erreur.
 */
function estRessourceVersionnee(url) {
  return url.pathname.startsWith('/_next/static/');
}

/** Images et icônes du site, stables entre deux déploiements. */
function estImageStatique(url) {
  return (
    url.pathname.startsWith('/icons/') ||
    /\.(png|jpg|jpeg|gif|svg|webp|avif|woff2?)$/i.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const requete = event.request;

  // Une écriture ne se met pas en cache, et ne se rejoue pas.
  if (requete.method !== 'GET') return;

  const url = new URL(requete.url);

  // Rien d'un autre domaine : la régie publicitaire et ses créations passent
  // directement au réseau. Les intercepter n'apporterait rien et fausserait
  // ses mesures.
  if (url.origin !== self.location.origin) return;

  // Les API portent des données de session ; elles ne sont jamais stockées.
  if (url.pathname.startsWith('/api/')) return;

  // Une page : le réseau, ou l'écran hors ligne. Jamais une page en cache.
  if (requete.mode === 'navigate') {
    event.respondWith(
      fetch(requete).catch(() => caches.match('/offline.html')),
    );
    return;
  }

  if (estRessourceVersionnee(url) || estImageStatique(url)) {
    event.respondWith(
      caches.match(requete).then((enCache) => {
        if (enCache) return enCache;

        return fetch(requete).then((reponse) => {
          // Une réponse partielle (206) ou une erreur ne se conserve pas :
          // `cache.put` la resservirait ensuite comme si elle était valide.
          if (reponse.ok && reponse.status === 200) {
            const copie = reponse.clone();
            caches.open(CACHE).then((cache) => cache.put(requete, copie));
          }
          return reponse;
        });
      }),
    );
  }
});
