import { isAllowedAdmin } from '@/lib/auth/guards';
import { readDisplaySettings } from '@/lib/settings/store';
import { MainNav } from './MainNav';

/**
 * Enveloppe serveur de la navigation.
 *
 * `MainNav` est un composant client — il lui faut `usePathname` pour marquer
 * l'onglet courant — et un composant client ne peut pas lire la session. Cette
 * enveloppe la lit côté serveur et lui transmet le seul booléen dont il a
 * besoin.
 *
 * Le détour évite deux mauvaises solutions : appeler une action serveur depuis
 * le navigateur au montage de chaque page, ou répéter `await isAllowedAdmin()`
 * dans les sept pages qui affichent la barre — où il aurait fini par manquer à
 * l'une d'elles.
 */
export async function Nav() {
  // La langue vient elle aussi du serveur : un composant client ne peut lire
  // ni la session ni les cookies au rendu initial, et une barre qui change de
  // langue après coup clignote sous les yeux du joueur.
  const [admin, display] = await Promise.all([
    isAllowedAdmin(),
    readDisplaySettings(),
  ]);

  return <MainNav admin={admin} locale={display.locale} />;
}
