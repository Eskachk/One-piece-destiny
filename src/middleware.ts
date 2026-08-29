import { NextResponse, type NextRequest } from 'next/server';
import { INACTIVITY_TIMEOUT_MS } from '@/domain/auth/session';

/**
 * Prolongation du cookie de session (cahier §85).
 *
 * **Le défaut corrigé ici.** À la connexion, le cookie recevait une date
 * d'expiration figée : `min(création + 7 jours, dernière activité + 2 heures)`
 * — c'est-à-dire deux heures. La base, elle, fait bien glisser la fenêtre
 * d'inactivité à chaque page vue. Les deux horloges divergeaient donc dès la
 * première minute de jeu : au bout de deux heures, le navigateur jetait un
 * cookie dont la session était parfaitement valide côté serveur.
 *
 * Le joueur, lui, voyait ceci : il rafraîchissait une page, et se retrouvait
 * sur l'écran de connexion. Rien ne l'annonçait, et rien ne le distinguait
 * d'une déconnexion sauvage. C'était le symptôme, pas la cause.
 *
 * Le `middleware` est le seul endroit qui peut le réparer : un composant
 * serveur ne peut pas écrire de cookie pendant son rendu, et c'est là que la
 * session est lue.
 *
 * **Il n'interroge pas la base**, volontairement. Reconduire le cookie
 * n'accorde aucun droit : la validité reste décidée par `sessions` à chaque
 * lecture, où l'inactivité et la durée absolue sont réellement appliquées. Un
 * cookie prolongé qui pointe vers une session périmée ne vaut rien. Faire une
 * requête ici, en revanche, ajouterait un aller-retour de base à **chaque
 * navigation de chaque joueur** — exactement ce qu'on ne peut pas se permettre
 * un dimanche soir.
 */

const COOKIE = 'opq_session';

export function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE)?.value;
  const response = NextResponse.next();

  if (token) {
    response.cookies.set({
      name: COOKIE,
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      // La même fenêtre que la base : les deux horloges avancent désormais du
      // même pas. La borne des sept jours reste appliquée côté serveur, où
      // elle est vérifiable — un cookie ne peut pas s'en souvenir seul.
      maxAge: Math.floor(INACTIVITY_TIMEOUT_MS / 1000),
    });
  }

  return response;
}

export const config = {
  /**
   * Tout sauf les ressources statiques et les images.
   *
   * Les exclure n'est pas une optimisation de confort : sans cela, le
   * middleware s'exécuterait pour chaque police, chaque feuille de style et
   * chaque appel de préchargement, soit plusieurs dizaines de fois par page.
   */
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
