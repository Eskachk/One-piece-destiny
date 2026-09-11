/**
 * Pages hors jeu : erreur, introuvable, carte de partage, métadonnées du site.
 */
export const DIVERS = {
  fr: {
    'site.description':
      'Le chapitre est le spectacle. Ta prédiction est le jeu. Choisis 3 personnages avant dimanche 23:59:59 et affronte le classement hebdomadaire.',
    'site.og': 'Devine qui apparaîtra dans le prochain chapitre.',
    'err.title': 'Le pont a tangué',
    'err.body':
      'Quelque chose s’est mal passé pendant le chargement de cette page. Rien n’est perdu : ton équipage, ta collection et tes Berries sont enregistrés.',
    'err.retry': 'Réessayer',
    'err.back': 'Retour à l’équipage',
    'err.code': 'Code de l’incident :',
    'nf.meta.title': 'Page introuvable',
    'nf.eyebrow': 'Erreur 404',
    'nf.title': 'Cette île n’est pas sur la carte',
    'nf.body':
      'L’adresse demandée n’existe pas, ou n’existe plus. Un lien de partage vers un équipage supprimé finit ici, par exemple.',
    'nf.back': 'Retour à l’équipage',
    'nf.leaderboard': 'Voir le classement',
    'share.meta.title': 'Ma prédiction — Chapitre {n}',
    'share.meta.title.none': 'Ma prédiction',
    'share.meta.description': 'Le chapitre est le spectacle. Ta prédiction est le jeu.',
    'share.chapter': 'Chapitre {n}',
    'share.risk': 'Risque {n} / 100 · {band}',
    'share.cta': 'Faire ma propre prédiction',
    'share.locked': '🔒 Prédiction verrouillée',
    'island.elbaf': 'Elbaf',
    'island.dressrosa': 'Dressrosa',
    'island.fishman': 'L’Île des hommes-poissons',
    'island.wano': 'Le Pays des Wa',
    'island.logue': 'Logue Town',
    'island.sabaody': 'L’archipel de Sabaody',
    'island.alabasta': 'Alabasta',
    'island.drum': 'Le royaume de Drum',
    'privacy.meta.title': 'Politique de confidentialité',
    'privacy.meta.description':
      'Quelles données One Piece Quest enregistre, pourquoi, combien de temps, et comment les faire supprimer.',
  },
  en: {
    'site.description':
      'The chapter is the show. Your prediction is the game. Pick 3 characters before Sunday 23:59:59 and take on the weekly leaderboard.',
    'site.og': 'Guess who will appear in the next chapter.',
    'err.title': 'The deck lurched',
    'err.body':
      'Something went wrong while loading this page. Nothing is lost: your crew, your collection and your Berries are saved.',
    'err.retry': 'Try again',
    'err.back': 'Back to the crew',
    'err.code': 'Incident code:',
    'nf.meta.title': 'Page not found',
    'nf.eyebrow': 'Error 404',
    'nf.title': 'This island is not on the map',
    'nf.body':
      'The requested address does not exist, or no longer does. A share link to a deleted crew ends up here, for instance.',
    'nf.back': 'Back to the crew',
    'nf.leaderboard': 'See the leaderboard',
    'share.meta.title': 'My prediction — Chapter {n}',
    'share.meta.title.none': 'My prediction',
    'share.meta.description': 'The chapter is the show. Your prediction is the game.',
    'share.chapter': 'Chapter {n}',
    'share.risk': 'Risk {n} / 100 · {band}',
    'share.cta': 'Make my own prediction',
    'share.locked': '🔒 Prediction locked',
    'island.elbaf': 'Elbaf',
    'island.dressrosa': 'Dressrosa',
    'island.fishman': 'Fish-Man Island',
    'island.wano': 'Wano Country',
    'island.logue': 'Loguetown',
    'island.sabaody': 'Sabaody Archipelago',
    'island.alabasta': 'Alabasta',
    'island.drum': 'Drum Kingdom',
    'privacy.meta.title': 'Privacy policy',
    'privacy.meta.description':
      'What data One Piece Quest stores, why, for how long, and how to have it deleted.',
  },
} as const;
