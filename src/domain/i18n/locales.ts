/**
 * Langues de l'interface.
 *
 * ## Où en est la traduction, et pourquoi c'est écrit ici
 *
 * Le français est **complet** : c'est la langue d'écriture du produit. L'anglais
 * couvre la navigation, les paramètres, la visite guidée et les écrans
 * d'entrée — c'est-à-dire tout ce qu'un nouveau venu traverse avant de jouer.
 * Le reste (Poste de commandement, détail du calcul de score, textes de
 * conformité) est encore en français.
 *
 * Cette limite est **affichée au joueur** dans les paramètres. Une langue
 * proposée sans dire ce qu'elle couvre est un piège : on la choisit, et on
 * découvre au troisième écran que rien n'a changé.
 *
 * `COVERAGE` sert exactement à ça, et il est tenu à jour à la main. Une
 * mesure automatique dirait combien de clés existent, pas si les écrans
 * traversés sont lisibles — ce n'est pas la même question.
 */

export const LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'fr';

export const LOCALE_LABEL: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
};

/** Ce que chaque langue couvre réellement, en une phrase, dans sa langue. */
export const COVERAGE: Record<Locale, string | null> = {
  fr: null,
  en: 'Navigation, settings, tutorial and sign-in are translated. Score details and admin screens are still in French.',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * Langue déduite de l'en-tête `Accept-Language`.
 *
 * Sert uniquement au **premier** affichage, avant que le joueur n'ait choisi.
 * Une fois le choix fait, il l'emporte toujours : un réglage explicite ne doit
 * jamais être écrasé par une détection.
 *
 * L'analyse est volontairement grossière — on cherche le premier code de
 * langue reconnu, sans traiter les pondérations `q=`. Trier par poids ne
 * changerait le résultat que pour des configurations rares, et le coût en
 * complexité serait sans rapport avec le gain.
 */
export function localeFromHeader(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;

  for (const part of header.split(',')) {
    const tag = part.split(';')[0].trim().toLowerCase().slice(0, 2);
    if (isLocale(tag)) return tag;
  }

  return DEFAULT_LOCALE;
}

/**
 * Dictionnaire.
 *
 * Un objet plat par langue plutôt qu'un arbre : les clés sont préfixées
 * (`nav.`, `settings.`), ce qui donne le même regroupement à la lecture sans
 * la traversée d'arbre à l'écriture. Et une clé manquante se voit dans un
 * `Record<Locale, ...>` typé, alors qu'un arbre partiel compile sans rien dire.
 */
export type MessageKey = keyof (typeof MESSAGES)['fr'];

export const MESSAGES = {
  fr: {
    'nav.crew': 'Équipage',
    'nav.ranking': 'Classement',
    'nav.collection': 'Collection',
    'nav.market': 'Marché',
    'nav.shop': 'Boutique',
    'nav.profile': 'Profil',
    'nav.settings': 'Paramètres',
    'nav.admin': 'Admin',

    'settings.title': 'Paramètres',
    'settings.subtitle':
      'Ce que tu règles ici ne touche jamais au jeu : ni ton score, ni tes chances de tirage.',
    'settings.language': 'Langue',
    'settings.languageHint':
      'Change la langue de l’interface. Ton choix est retenu sur cet appareil.',
    'settings.identity': 'Pseudo',
    'settings.identityHint':
      'Il apparaît au classement et sur chaque annonce du Marché. Modifiable une fois par mois.',
    'settings.identitySave': 'Changer mon pseudo',
    'settings.comfort': 'Confort de lecture',
    'settings.motion': 'Réduire les animations',
    'settings.motionHint':
      'Coupe les fondus, la dérive des nuages et l’aura des cartes mythiques. Utile en cas de gêne au mouvement, ou sur un appareil lent.',
    'settings.spoiler': 'Bouclier anti-spoiler',
    'settings.spoilerHint':
      'Masque les résultats et les apparitions tant que tu ne les demandes pas. Rien ne s’affiche par surprise en ouvrant une page.',
    'settings.notifications': 'Notifications',
    'settings.security': 'Sécurité',
    'settings.securityHint':
      'Mot de passe, double authentification, appareils connectés.',
    'settings.saved': 'C’est enregistré.',
    'settings.on': 'Activé',
    'settings.off': 'Désactivé',
  },
  en: {
    'nav.crew': 'Crew',
    'nav.ranking': 'Ranking',
    'nav.collection': 'Collection',
    'nav.market': 'Market',
    'nav.shop': 'Shop',
    'nav.profile': 'Profile',
    'nav.settings': 'Settings',
    'nav.admin': 'Admin',

    'settings.title': 'Settings',
    'settings.subtitle':
      'Nothing here touches the game itself: not your score, not your draw odds.',
    'settings.language': 'Language',
    'settings.languageHint':
      'Changes the interface language. Your choice is kept on this device.',
    'settings.identity': 'Display name',
    'settings.identityHint':
      'Shown on the ranking and on every Market listing. Changeable once a month.',
    'settings.identitySave': 'Change my name',
    'settings.comfort': 'Reading comfort',
    'settings.motion': 'Reduce animations',
    'settings.motionHint':
      'Turns off page fades, drifting clouds and the mythic card aura. Useful if motion bothers you, or on a slow device.',
    'settings.spoiler': 'Spoiler shield',
    'settings.spoilerHint':
      'Hides results and appearances until you ask for them. Nothing surprises you when a page opens.',
    'settings.notifications': 'Notifications',
    'settings.security': 'Security',
    'settings.securityHint': 'Password, two-factor authentication, signed-in devices.',
    'settings.saved': 'Saved.',
    'settings.on': 'On',
    'settings.off': 'Off',
  },
} as const satisfies Record<Locale, Record<string, string>>;

/**
 * Traducteur pour une langue donnée.
 *
 * Repli sur le français plutôt que sur la clé brute : voir « settings.motion »
 * dans une page serait pire que de la voir en français, qui reste du texte
 * qu'un humain a écrit pour être lu.
 */
export function translator(locale: Locale): (key: MessageKey) => string {
  const table = MESSAGES[locale];
  return (key) => table[key] ?? MESSAGES.fr[key];
}
