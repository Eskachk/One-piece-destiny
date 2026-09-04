import type { MetadataRoute } from 'next';
import { baseUrl } from '@/lib/email/templates';

/**
 * Plan du site (cahier §106).
 *
 * **Volontairement court.** L'essentiel du produit est derrière
 * l'authentification : `/collection`, `/profil`, `/market`, `/parametres` ne
 * renvoient rien d'indexable à un robot, et les annoncer ferait perdre du
 * temps d'exploration sur des pages qui redirigent toutes vers `/login`.
 *
 * Ne figurent ici que les trois adresses qui ont un contenu public et un sens
 * pour quelqu'un qui découvre le jeu. Elles recoupent volontairement ce que
 * `public/robots.txt` autorise — les deux fichiers doivent dire la même chose,
 * faute de quoi le robot lit une contradiction et tranche seul.
 *
 * `baseUrl()` est la même source que celle des liens d'e-mail : une adresse
 * écrite en dur ici serait fausse dès le premier changement de domaine, et
 * personne ne le remarquerait avant une chute de trafic.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = baseUrl().replace(/\/$/, '');

  return [
    {
      // L'accueil : la seule page qui explique la règle du jeu.
      url: `${base}/`,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      // Le classement change une fois par semaine, à la publication.
      url: `${base}/classement`,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${base}/register`,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ];
}
