'use client';

import Link from 'next/link';
import { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Navigation principale (cahier §55, §109).
 *
 * Auparavant : des liens soulignés séparés par des points, différents sur
 * chaque page. Trois problèmes, tous corrigés ici :
 *
 *   — **cible tactile trop petite.** Un lien de texte fait une quinzaine de
 *     pixels de haut ; les recommandations d'accessibilité demandent 44. Sur
 *     mobile — la cible du produit (§55) — on rate la moitié des appuis ;
 *   — **aucune indication de la page courante.** Le joueur ne savait pas où il
 *     se trouvait ;
 *   — **une navigation différente par page**, donc une position qui bouge.
 *
 * Sur mobile, la barre est ancrée en bas de l'écran (voir `.hb-nav` dans
 * globals.css) : le pouce l'atteint sans faire défiler.
 *
 * **`prefetch` est laissé au réglage par défaut, délibérément.** Toutes ces
 * pages sont en `force-dynamic` ; forcer `prefetch` les ferait toutes rendre
 * côté serveur dès qu'un joueur voit la barre, soit cinq rendus complets pour
 * un clic. Avec quelques milliers de joueurs simultanés, on paierait cinq fois
 * la charge pour gagner quelques dizaines de millisecondes. Le comportement
 * par défaut précharge l'écran d'attente (`app/loading.tsx`), ce qui suffit à
 * rendre la transition immédiate à l'œil — la page réelle se substitue au
 * squelette dès son arrivée.
 */

const LINKS = [
  { href: '/', label: 'Équipage', icon: '🏴' },
  { href: '/classement', label: 'Classement', icon: '🏆' },
  { href: '/collection', label: 'Collection', icon: '🗺️' },
  { href: '/market', label: 'Market', icon: '⚓' },
  { href: '/profil', label: 'Profil', icon: '📜' },
] as const;

/**
 * Voyant d'attente propre au lien cliqué.
 *
 * `useLinkStatus` ne fonctionne qu'à l'intérieur d'un `<Link>` : ce composant
 * doit donc rester enfant du lien, il ne peut pas remonter dans la boucle.
 * Il ne s'affiche qu'au-delà d'un délai — sur une navigation instantanée,
 * un voyant qui apparaît et disparaît en 50 ms ne se lit pas comme du
 * mouvement, mais comme un défaut d'affichage.
 */
function PendingDot() {
  const { pending } = useLinkStatus();
  return pending ? <span className="hb-nav__pending" aria-hidden="true" /> : null;
}

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigation principale" className="hb-nav">
      <ul>
        {LINKS.map((link) => {
          const active =
            link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);

          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`hb-nav__item${active ? ' hb-nav__item--active' : ''}`}
              >
                <span aria-hidden="true">{link.icon}</span>
                <span>{link.label}</span>
                <PendingDot />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
