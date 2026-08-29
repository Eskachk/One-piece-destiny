'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Navigation principale (cahier §109).
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
 * `prefetch` est laissé au comportement par défaut de Next : les quatre
 * destinations sont préchargées quand le lien entre dans le champ de vision,
 * ce qui rend la navigation quasi instantanée.
 */

const LINKS = [
  { href: '/', label: 'Équipage', icon: '🏴' },
  { href: '/classement', label: 'Classement', icon: '🏆' },
  { href: '/collection', label: 'Collection', icon: '🗺️' },
  { href: '/market', label: 'Market', icon: '⚓' },
  { href: '/profil', label: 'Profil', icon: '📜' },
] as const;

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
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
