'use client';

import { useEffect, useRef } from 'react';

/**
 * Emplacement publicitaire AdSense.
 *
 * ## Où il apparaît, et où il n'apparaît pas
 *
 * Les emplacements sont posés **page par page**, jamais dans la coquille.
 * Trois écrans en sont exclus par principe :
 *
 *   — la connexion et l'inscription : une régie qui charge à côté d'un champ
 *     de mot de passe est une mauvaise idée, et ces pages sont la première
 *     impression du produit ;
 *   — la boutique : mêler des annonces tierces à des achats réels brouille
 *     ce qui est vendu par le site et ce qui ne l'est pas ;
 *   — l'espace d'administration, qui n'a pas d'audience.
 *
 * ## Pourquoi la hauteur est réservée
 *
 * Le conteneur porte une hauteur minimale **avant** que l'annonce arrive. Sans
 * elle, le bloc apparaît une fraction de seconde plus tard et pousse tout le
 * contenu vers le bas — le joueur clique sur autre chose que ce qu'il visait.
 * C'est le défaut le plus courant des intégrations publicitaires, et le plus
 * simple à éviter.
 *
 * ## Consentement
 *
 * Le script AdSense gère lui-même le cadre européen (message de consentement
 * de Google). Aucun identifiant de joueur, aucune adresse et aucune donnée de
 * compte ne lui est transmis : l'emplacement ne reçoit que le format à
 * afficher.
 */

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdSlot({
  slot,
  label = 'Publicité',
  minHeight = 100,
}: {
  /** Identifiant d'emplacement AdSense (`data-ad-slot`). */
  slot: string;
  label?: string;
  minHeight?: number;
}) {
  const pushed = useRef(false);

  useEffect(() => {
    // Un seul `push` par emplacement. En développement, React monte les
    // composants deux fois : sans ce verrou, AdSense reçoit deux demandes pour
    // le même bloc et journalise une erreur à chaque rechargement.
    if (pushed.current) return;
    pushed.current = true;

    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {
      // Bloqueur de publicité, script non chargé, réseau coupé : l'annonce ne
      // s'affiche pas et c'est tout. Une exception ici casserait la page.
    }
  }, []);

  return (
    <aside className="hb-ad" style={{ minHeight }} aria-label={label}>
      <span className="hb-ad__label">{label}</span>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-9364111418812673"
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
