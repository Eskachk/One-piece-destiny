/**
 * Textes communs à tout le produit : navigation, boutons, états, paramètres.
 *
 * Voir `../locales.ts` pour la règle d'écriture des dictionnaires.
 */
export const COMMUN = {
  fr: {
    'nav.crew': 'Équipage',
    'nav.ranking': 'Classement',
    'nav.collection': 'Collection',
    'nav.market': 'Marché',
    'nav.shop': 'Boutique',
    'nav.profile': 'Profil',
    'nav.settings': 'Paramètres',
    'nav.admin': 'Admin',
    'nav.aria': 'Navigation principale',

    'brand': 'One Piece Quest',
    'brand.tagline': 'le jeu de pronostics du chapitre hebdomadaire',

    'action.next': 'Suivant',
    'action.skip': 'Passer',
    'action.understood': 'J’ai compris',
    'action.cancel': 'Annuler',
    'action.save': 'Enregistrer',
    'action.confirm': 'Confirmer',
    'action.back': 'Retour',
    'action.close': 'Fermer',
    'action.retry': 'Réessayer',
    'action.show': 'Afficher',
    'action.hide': 'Masquer',
    'action.copy': 'Copier',
    'action.copied': 'Copié',
    'action.signOut': 'Déconnexion',
    'action.loading': 'Chargement…',

    'state.saved': 'C’est enregistré.',
    'state.on': 'Activé',
    'state.off': 'Désactivé',
    'state.error': 'Une erreur est survenue. Réessaie dans un moment.',
    'state.offline': 'Hors connexion',
    'state.loadingPage': 'Chargement de la page…',

    'unit.berries': 'Berries',
    'unit.points': 'pts',
    'unit.chapter': 'Chapitre',

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
    'settings.securityHint': 'Mot de passe, double authentification, appareils connectés.',
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
    'nav.aria': 'Main navigation',

    'brand': 'One Piece Quest',
    'brand.tagline': 'the weekly chapter prediction game',

    'action.next': 'Next',
    'action.skip': 'Skip',
    'action.understood': 'Got it',
    'action.cancel': 'Cancel',
    'action.save': 'Save',
    'action.confirm': 'Confirm',
    'action.back': 'Back',
    'action.close': 'Close',
    'action.retry': 'Try again',
    'action.show': 'Show',
    'action.hide': 'Hide',
    'action.copy': 'Copy',
    'action.copied': 'Copied',
    'action.signOut': 'Sign out',
    'action.loading': 'Loading…',

    'state.saved': 'Saved.',
    'state.on': 'On',
    'state.off': 'Off',
    'state.error': 'Something went wrong. Try again in a moment.',
    'state.offline': 'Offline',
    'state.loadingPage': 'Loading the page…',

    'unit.berries': 'Berries',
    'unit.points': 'pts',
    'unit.chapter': 'Chapter',

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
} as const;
