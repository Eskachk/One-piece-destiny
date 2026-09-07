/*
 * FILET DE SÉCURITÉ — agent de service qui se désinstalle lui-même.
 *
 * ## Quand s'en servir
 *
 * Si l'agent de service (`public/sw.js`) se révélait fautif en production —
 * une page qui ne se rafraîchit plus, un fichier périmé resservi — un
 * *rollback* Vercel **ne suffirait pas** : revenir à un déploiement antérieur
 * remet le site en arrière, mais l'agent déjà installé sur le téléphone des
 * joueurs, lui, reste actif. C'est la propriété qui rend cette technologie
 * utile, et c'est aussi ce qui la rend la seule pièce du lot qu'on n'annule
 * pas d'un clic.
 *
 * Ce fichier est la sortie de secours.
 *
 * ## Comment s'en servir
 *
 *   1. copier ce fichier PAR-DESSUS `public/sw.js` ;
 *   2. déployer (`npx vercel --prod`).
 *
 * ## Pourquoi cela fonctionne
 *
 * `/sw.js` est servi avec `Cache-Control: no-store` (voir `next.config.ts`).
 * Le navigateur va donc rechercher le fichier **à chaque navigation**, sans
 * jamais se contenter d'une copie locale. Il trouve cette version, la voit
 * différente de celle installée, l'installe — et cette version-ci, pour tout
 * travail, se supprime elle-même et vide les caches.
 *
 * Un joueur récupère un site propre au premier chargement suivant. Sans
 * l'en-tête `no-store`, ce fichier pourrait mettre jusqu'à 24 heures à
 * l'atteindre ; c'est précisément la raison d'être de cet en-tête.
 *
 * ## Ensuite
 *
 * Laisser cette version en ligne au moins une semaine, le temps que tous les
 * appareils repassent. Ne remettre un vrai agent de service qu'après, et
 * seulement une fois la cause comprise.
 */

self.addEventListener('install', () => {
  // Ne pas attendre la fermeture des onglets : le but est justement de
  // reprendre la main le plus vite possible.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Tous les caches, sans exception : on ne cherche pas à préserver quoi
      // que ce soit, on nettoie.
      const noms = await caches.keys();
      await Promise.all(noms.map((nom) => caches.delete(nom)));

      await self.registration.unregister();

      // Recharger les pages ouvertes : sans cela, l'onglet courant continue
      // de tourner sous l'ancien agent jusqu'à sa prochaine navigation.
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) client.navigate(client.url);
    })(),
  );
});

/*
 * Aucun `fetch` intercepté : chaque requête part directement au réseau, comme
 * si aucun agent de service n'existait.
 */
