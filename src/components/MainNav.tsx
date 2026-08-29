'use client';

import Link from 'next/link';
import { useLinkStatus } from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconAdmin,
  IconCollection,
  IconCrew,
  IconMarket,
  IconProfile,
  IconRanking,
  IconShop,
} from './NavIcons';

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
 * La barre est ancrée en bas de l'écran sur **tous** les formats. Sur un
 * ordinateur, il fallait auparavant faire défiler jusqu'en bas pour changer
 * d'onglet : la navigation d'un jeu se cherchait.
 *
 * Les symboles sont **dessinés** (`NavIcons.tsx`), pas des emoji. Un emoji est
 * rendu par le système : le drapeau noir était un rectangle sur Windows et
 * l'ancre changeait de forme d'un téléphone à l'autre.
 *
 * **`prefetch` est laissé au réglage par défaut, délibérément.** Toutes ces
 * pages sont en `force-dynamic` ; forcer `prefetch` les ferait toutes rendre
 * côté serveur dès qu'un joueur voit la barre, soit six rendus complets pour
 * un clic. Le défaut précharge l'écran d'attente (`app/loading.tsx`), ce qui
 * suffit à rendre la transition immédiate à l'œil.
 */

const LINKS = [
  { href: '/', label: 'Équipage', Icon: IconCrew },
  { href: '/classement', label: 'Classement', Icon: IconRanking },
  { href: '/collection', label: 'Collection', Icon: IconCollection },
  { href: '/market', label: 'Market', Icon: IconMarket },
  { href: '/boutique', label: 'Boutique', Icon: IconShop },
  { href: '/profil', label: 'Profil', Icon: IconProfile },
] as const;

const ADMIN_LINK = {
  href: '/admin',
  label: 'Admin',
  Icon: IconAdmin,
} as const;

/**
 * Voyant d'attente propre au lien cliqué.
 *
 * `useLinkStatus` ne fonctionne qu'à l'intérieur d'un `<Link>` : ce composant
 * doit donc rester enfant du lien, il ne peut pas remonter dans la boucle.
 */
function PendingDot() {
  const { pending } = useLinkStatus();
  return pending ? <span className="hb-nav__pending" aria-hidden="true" /> : null;
}

export function MainNav({ admin = false }: { admin?: boolean }) {
  const pathname = usePathname();

  // L'onglet d'administration n'est **qu'un raccourci d'affichage**. Le
  // contrôle réel est sur la route : `requireAdmin` exige le rôle en base et
  // l'adresse de la liste d'autorisation, et répond 404 sinon. Un joueur qui
  // forcerait ce booléen dans son navigateur gagnerait un bouton, pas un accès.
  const links = admin ? [...LINKS, ADMIN_LINK] : LINKS;

  return (
    <nav
      aria-label="Navigation principale"
      className={`hb-nav${admin ? ' hb-nav--admin' : ''}`}
    >
      <ul>
        {links.map((link) => {
          const active =
            link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);

          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`hb-nav__item${active ? ' hb-nav__item--active' : ''}`}
              >
                <link.Icon className="hb-nav__icon" />
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
