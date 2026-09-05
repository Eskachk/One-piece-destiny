import { describe, expect, it } from 'vitest';
import {
  BONUS_PAR_BONNE_REPONSE,
  MAX_QUESTIONS,
  bonusDe,
  sansReponse,
  validerQuestion,
  type Question,
} from './pronostics';
import { PARTICIPATION_BERRIES, RANK_TIERS } from '../collection/rewards';

const question = (
  id: string,
  answer: number | null,
  options = ['Oui', 'Non'],
): Question => ({ id, prompt: `Question ${id} ?`, options, answer });

describe('pronostics secondaires', () => {
  describe('le bonus', () => {
    it('paie chaque bonne réponse, et rien d’autre', () => {
      const bonus = bonusDe(
        [
          { questionId: 'a', choice: 0 },
          { questionId: 'b', choice: 1 },
          { questionId: 'c', choice: 0 },
        ],
        [question('a', 0), question('b', 0), question('c', 0)],
      );

      expect(bonus).toBe(2 * BONUS_PAR_BONNE_REPONSE);
    });

    it('ne paie ni ne pénalise une question laissée sans réponse tranchée', () => {
      /*
       * L'administrateur peut oublier d'en trancher une : ce n'est pas au
       * joueur de le payer. Elle ne rapporte rien, et n'enlève rien.
       */
      const bonus = bonusDe(
        [{ questionId: 'a', choice: 0 }],
        [question('a', null)],
      );
      expect(bonus).toBe(0);
    });

    it('ignore une réponse à une question qui n’est pas du chapitre', () => {
      // La réponse peut survivre à la suppression d'une question. Elle ne doit
      // pas payer pour une question qui n'existe plus.
      const bonus = bonusDe(
        [{ questionId: 'fantome', choice: 0 }],
        [question('a', 0)],
      );
      expect(bonus).toBe(0);
    });

    it('ne rapporte rien à qui n’a pas répondu', () => {
      expect(bonusDe([], [question('a', 0)])).toBe(0);
    });

    it('reste un à-côté, jamais le jeu principal', () => {
      /*
       * **Le garde-fou d'équilibrage.**
       *
       * Le maximum atteignable sur les pronostics ne doit pas dépasser le
       * socle de participation hebdomadaire. Au-delà, un joueur qui répond
       * bien mais joue mal gagnerait davantage qu'un Top 100, et l'à-côté
       * deviendrait le jeu.
       */
      const maximum = MAX_QUESTIONS * BONUS_PAR_BONNE_REPONSE;
      const top100 = RANK_TIERS[RANK_TIERS.length - 1].berries;

      expect(maximum).toBeLessThanOrEqual(PARTICIPATION_BERRIES);
      expect(maximum).toBeLessThan(top100);
    });
  });

  describe('anti-spoiler', () => {
    it('retire la bonne réponse avant l’envoi au navigateur', () => {
      /*
       * Elle est **retirée**, pas masquée à l'affichage : ce qui part dans la
       * charge d'une page rendue par le serveur est lisible par quiconque
       * ouvre les outils de développement (§3).
       */
      const publiques = sansReponse([question('a', 1), question('b', 0)]);
      expect(publiques.every((q) => q.answer === null)).toBe(true);
      // Le reste survit : l'intitulé et les choix ne sont pas des spoilers.
      expect(publiques[0].options).toEqual(['Oui', 'Non']);
    });
  });

  describe('validation', () => {
    it('accepte une question ordinaire et normalise les espaces', () => {
      const verdict = validerQuestion('  Y aura-t-il   un flashback ? ', [
        ' Oui ',
        'Non',
      ]);
      expect(verdict).toEqual({
        valide: true,
        prompt: 'Y aura-t-il un flashback ?',
        options: ['Oui', 'Non'],
      });
    });

    it('refuse deux choix identiques', () => {
      // Deux choix identiques ne sont pas une liste plus courte : c'est une
      // question mal écrite, et la raccourcir en silence la laisserait passer.
      const verdict = validerQuestion('Une vraie question ?', ['Oui', 'oui']);
      expect(verdict).toEqual({ valide: false, raison: 'OPTIONS_IDENTIQUES' });
    });

    it('refuse un choix vide, un seul choix, ou plus de quatre', () => {
      expect(validerQuestion('Une vraie question ?', ['Oui', ' ']).valide).toBe(false);
      expect(validerQuestion('Une vraie question ?', ['Oui']).valide).toBe(false);
      expect(
        validerQuestion('Une vraie question ?', ['a', 'b', 'c', 'd', 'e']).valide,
      ).toBe(false);
    });

    it('refuse un intitulé trop court', () => {
      expect(validerQuestion('Bof ?', ['Oui', 'Non']).valide).toBe(false);
    });
  });
});
