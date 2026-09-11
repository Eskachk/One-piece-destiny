/**
 * La coquille des visites guidées. Le contenu des étapes vit dans
 * `domain/tutoriel.ts`, avec ses deux langues et ses tests.
 */
export const TUTORIEL = {
  fr: {
    'tuto.step': 'Étape {n} sur {total}',
    'tuto.never': 'Ne plus afficher les visites guidées',
  },
  en: {
    'tuto.step': 'Step {n} of {total}',
    'tuto.never': 'Don’t show guided tours again',
  },
} as const;
