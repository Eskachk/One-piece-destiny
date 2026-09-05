import { describe, expect, it } from 'vitest';
import { decrireRecurrence, recurrences } from './recurrence';
import type { HistoricalAppearance } from '../admin/assisted-count';

/**
 * La récurrence est la seule donnée du jeu qui serve à **décider**.
 *
 * Le reste — rareté, illustration, attributs — sert à collectionner. Ces
 * tests fixent donc surtout ce qu'elle ne doit pas raconter : un dénominateur
 * inventé, une absence confondue avec une non-observation.
 */

const ligne = (
  chapterNumber: number,
  characterId: string,
  appearances: number,
): HistoricalAppearance => ({ chapterNumber, characterId, appearances });

describe('récurrence', () => {
  it('compte les chapitres où le personnage a été vu', () => {
    const out = recurrences([
      ligne(1, 'luffy', 12),
      ligne(2, 'luffy', 8),
      ligne(3, 'luffy', 4),
      ligne(1, 'vivi', 1),
    ]);

    expect(out.get('luffy')).toEqual({ vus: 3, observes: 3, moyenne: 8 });
    expect(out.get('vivi')?.vus).toBe(1);
  });

  it('prend pour dénominateur les chapitres observés, pas la fenêtre demandée', () => {
    /*
     * Sur un jeu qui démarre, trois chapitres existent. Afficher « 3 des 10
     * derniers » laisserait croire à sept absences qui n'ont jamais eu lieu —
     * et ferait passer un habitué pour un figurant.
     */
    const out = recurrences([
      ligne(1, 'zoro', 5),
      ligne(2, 'zoro', 5),
      ligne(3, 'zoro', 5),
    ]);
    expect(out.get('zoro')?.observes).toBe(3);
  });

  it('ne compte pas une absence constatée comme une présence', () => {
    // La saisie de l'administrateur peut porter un zéro explicite : c'est une
    // absence vérifiée, pas une apparition.
    const out = recurrences([
      ligne(1, 'nami', 3),
      ligne(2, 'nami', 0),
      ligne(3, 'nami', 0),
    ]);

    expect(out.get('nami')?.vus).toBe(1);
    expect(out.get('nami')?.observes).toBe(3);
  });

  it('ne compte pas deux fois un personnage vu deux fois dans un chapitre', () => {
    // Deux lignes pour le même chapitre ne devraient pas exister, mais une
    // correction (§79) peut en produire. La récurrence compte des chapitres,
    // pas des lignes.
    const out = recurrences([ligne(1, 'law', 2), ligne(1, 'law', 3)]);
    expect(out.get('law')?.vus).toBe(1);
  });

  it('ne rend rien quand aucun chapitre n’est publié', () => {
    expect(recurrences([]).size).toBe(0);
  });

  it('décrit en toutes lettres, pour qui écoute la page', () => {
    expect(decrireRecurrence({ vus: 7, observes: 10, moyenne: 5 })).toContain(
      '7 des 10',
    );
    expect(decrireRecurrence({ vus: 0, observes: 10, moyenne: 0 })).toContain(
      'Jamais vu',
    );
    expect(decrireRecurrence(undefined)).toContain('Aucun chapitre');
  });
});
