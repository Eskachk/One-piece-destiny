'use client';

import { useEffect } from 'react';

/**
 * Enregistrement de l'agent de service (`/sw.js`).
 *
 * Le fichier `sw.js` peut être parfait : tant que personne ne l'enregistre, il
 * n'existe pas. C'est ce composant qui fait la différence entre « le site a un
 * agent de service » et « Chrome propose l'installation », et donc entre un
 * site et une application publiable sur le Play Store.
 *
 * ## Pourquoi seulement en production
 *
 * En développement, Next sert des modules recompilés à chaque frappe. Un agent
 * de service qui met des ressources en cache y resservirait du code périmé :
 * on modifie un fichier, l'écran ne change pas, et rien n'indique que la cause
 * est un cache — c'est plusieurs heures perdues à chercher un bug qui n'existe
 * pas. On l'enregistre donc uniquement dans la version déployée.
 *
 * ## Pourquoi après `load`
 *
 * L'enregistrement déclenche le téléchargement de l'agent **et** de tout ce
 * qu'il précharge à l'installation. Lancé pendant le rendu initial, cela entre
 * en concurrence avec les ressources dont la première image de la page dépend.
 * Après `load`, la page est déjà utilisable.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const enregistrer = () => {
      // Un échec ici n'est pas une panne du jeu : le site fonctionne
      // exactement pareil sans agent de service. On l'avale donc, plutôt que
      // de laisser une promesse rejetée remonter dans la console du joueur.
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
    };

    if (document.readyState === 'complete') {
      enregistrer();
      return;
    }

    window.addEventListener('load', enregistrer);
    return () => window.removeEventListener('load', enregistrer);
  }, []);

  return null;
}
