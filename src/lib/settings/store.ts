import 'server-only';

import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import {
  DEFAULT_LOCALE,
  isLocale,
  localeFromHeader,
  type Locale,
} from '@/domain/i18n/locales';

/**
 * Réglages d'affichage du joueur.
 *
 * ## Pourquoi un cookie et pas une colonne
 *
 * Ces trois réglages — langue, animations, bouclier anti-spoiler — décrivent
 * **l'appareil**, pas le compte :
 *
 *   — ils doivent s'appliquer **avant** toute lecture de session, y compris sur
 *     la page de connexion. Une langue rangée en base ne peut pas décider de
 *     la langue de l'écran où l'on se connecte ;
 *   — ils sont lus à **chaque rendu de page**. Une requête de plus par page
 *     pour trois booléens serait payée par tous les joueurs, tout le temps,
 *     alors qu'on vise mille sessions simultanées ;
 *   — ils sont légitimement différents d'un appareil à l'autre : on peut
 *     vouloir couper les animations sur un vieux téléphone et les garder sur
 *     son ordinateur.
 *
 * Le pseudo, lui, est une identité publique : il est en base, pas ici.
 *
 * ## Ce que ce cookie n'est pas
 *
 * Il ne sert **à rien d'autre** qu'à l'affichage : ni identification, ni
 * mesure, ni publicité. Il ne demande donc pas de consentement — c'est un
 * cookie strictement nécessaire au service demandé. Il ne contient aucune
 * donnée personnelle, ce qui est aussi pourquoi il n'est pas signé : le
 * falsifier ne donne accès à rien, il change seulement l'apparence de ses
 * propres pages.
 */

const COOKIE = 'opq_display';

/** Un an. Un réglage d'affichage n'a aucune raison d'expirer plus tôt. */
const MAX_AGE = 365 * 24 * 60 * 60;

export interface DisplaySettings {
  locale: Locale;
  /** Animations réduites, au-delà de ce que demande le système. */
  reducedMotion: boolean;
  /** Résultats masqués jusqu'à demande explicite (§3). */
  spoilerShield: boolean;
}

/**
 * Lecture.
 *
 * Format volontairement minuscule — `fr|1|0` — et non du JSON : le cookie part
 * dans **chaque** requête, y compris celles des images et des scripts. Vingt
 * octets contre cent vingt, multipliés par le nombre de requêtes d'une page,
 * finissent par se voir.
 *
 * Toute valeur illisible retombe sur les valeurs par défaut. Un cookie
 * corrompu ne doit pas faire échouer une page.
 */
async function loadDisplaySettings(): Promise<DisplaySettings> {
  const raw = (await cookies()).get(COOKIE)?.value;

  if (raw) {
    const [locale, motion, spoiler] = raw.split('|');
    if (isLocale(locale)) {
      return {
        locale,
        reducedMotion: motion === '1',
        spoilerShield: spoiler === '1',
      };
    }
  }

  // Première visite : on part de la langue du navigateur. C'est une
  // supposition, jamais un choix — le premier réglage explicite l'emporte.
  return {
    locale: localeFromHeader((await headers()).get('accept-language')),
    reducedMotion: false,
    spoilerShield: false,
  };
}

/**
 * Réglages d'affichage de la requête en cours.
 *
 * `cache()` de React mémorise **par requête serveur**, pas globalement : la
 * mise en page, la barre d'onglets et la page elle-même appellent tous cette
 * fonction, et sans lui chaque rendu relirait trois fois les mêmes en-têtes.
 *
 * Ce n'est pas un cache partagé — il ne peut donc pas servir les réglages d'un
 * joueur à un autre, ce qui serait la faute à ne pas commettre ici.
 */
export const readDisplaySettings = cache(loadDisplaySettings);

export function serializeDisplaySettings(settings: DisplaySettings): string {
  return [
    settings.locale,
    settings.reducedMotion ? '1' : '0',
    settings.spoilerShield ? '1' : '0',
  ].join('|');
}

export async function writeDisplaySettings(
  settings: DisplaySettings,
): Promise<void> {
  (await cookies()).set(COOKIE, serializeDisplaySettings(settings), {
    maxAge: MAX_AGE,
    path: '/',
    sameSite: 'lax',
    // Pas de `httpOnly` : c'est le seul cookie que le navigateur a de bonnes
    // raisons de lire lui-même — pour appliquer un réglage sans attendre un
    // aller-retour serveur. Il ne porte aucun secret.
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
  });
}

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  locale: DEFAULT_LOCALE,
  reducedMotion: false,
  spoilerShield: false,
};
