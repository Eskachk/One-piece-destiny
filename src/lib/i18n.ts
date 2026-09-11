import 'server-only';

import { euros, nombre, pluriel, traduireMessage, translator } from '@/domain/i18n/locales';
import { readDisplaySettings } from '@/lib/settings/store';

/**
 * Le traducteur de la requête en cours, pour les composants et actions serveur.
 *
 * `readDisplaySettings` est mémorisé par requête : appeler `traduire()` dans
 * la page, dans la barre et dans trois composants ne relit le cookie qu'une
 * fois. Chaque appelant peut donc le demander sans se soucier des autres.
 *
 * Les actions serveur y ont recours pour leurs messages d'erreur : un joueur
 * qui lit le site en anglais doit lire ses refus en anglais aussi — « plafond
 * atteint » en français au milieu d'une boutique traduite est précisément le
 * genre d'écran qui fait douter de tout le reste.
 */
export async function traduire() {
  const { locale } = await readDisplaySettings();
  return {
    locale,
    t: translator(locale),
    tn: pluriel(locale),
    nombre: nombre(locale),
    euros: euros(locale),
    tradMessage: (message: string) => traduireMessage(locale, message),
  };
}
