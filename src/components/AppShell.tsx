'use client';

import { usePathname } from 'next/navigation';
import { islandOf } from '@/domain/islands';

/**
 * Enveloppe de toutes les pages : île courante et fondu de transition.
 *
 * ## Une île par page
 *
 * Chaque destination emprunte la direction artistique d'une île de l'œuvre.
 * Ce n'est pas de la décoration gratuite : jusqu'ici les six onglets avaient
 * exactement le même fond, et le joueur ne savait où il se trouvait qu'en
 * lisant le titre. Une couleur d'ambiance se reconnaît avant le texte.
 *
 *   Équipage    → le port de départ, à l'aube
 *   Classement  → Dressrosa, ses ors et ses confettis
 *   Collection  → l'Île des hommes-poissons, sous la mer
 *   Market      → Wano, laque et fleurs de cerisier
 *   Boutique    → Logue Town, pierre et tuiles du crépuscule
 *   Profil      → Sabaody, ses mangroves et ses bulles
 *
 * **Toutes les palettes restent claires.** Le texte des pages intérieures est
 * en encre marine ; une île sombre — l'Île des hommes-poissons est à dix mille
 * mètres de fond — le rendrait illisible. L'identité passe donc par la teinte
 * et par un motif de décor, jamais par l'assombrissement du fond.
 *
 * ## Le fondu
 *
 * `key={pathname}` remonte le contenu à chaque changement d'adresse, ce qui
 * relance l'animation d'entrée. C'est volontairement plus simple qu'une
 * transition de vue : celles-ci demandent de coordonner sortie et entrée, et
 * une page qui n'a pas fini de charger laisserait l'écran vide au milieu du
 * fondu. Ici l'ancienne page reste affichée jusqu'à ce que la nouvelle soit
 * prête, puis la nouvelle apparaît.
 *
 * L'animation est déclarée en CSS et neutralisée par
 * `prefers-reduced-motion` (§60).
 */

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      data-island={islandOf(pathname)}
      className="app-shell"
    >
      {children}
    </div>
  );
}
