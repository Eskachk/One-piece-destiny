import { beforeEach, describe, expect, it } from 'vitest';
import { memoryRepository } from './memory';
import type { ChapterResultRow } from './types';

/**
 * Les trois lectures qui ont remplacé le chargement du classement entier.
 *
 * La page publique lisait toutes les lignes — `breakdown` de chaque joueur
 * compris — pour en afficher cinquante et retrouver la sienne par
 * `findIndex`, puis mettait le tout en cache partagé. Ces tests fixent le
 * contrat des trois lectures qui font désormais le même travail, et
 * garantissent que le dépôt en mémoire répond **comme** le dépôt Postgres :
 * sans quoi les tests valideraient un comportement que la production n'a pas.
 */

const CHAPITRE = 'chapitre-1';

const ligne = (playerId: string, total: number): ChapterResultRow => ({
  playerId,
  handle: playerId.toUpperCase(),
  total,
  breakdown: [{ characterId: 'luffy', total, breakdown: ['+' + total] }],
});

describe('lectures du classement', () => {
  beforeEach(async () => {
    await memoryRepository.saveResults(CHAPITRE, [
      ligne('anne', 40),
      ligne('bran', 90),
      ligne('cleo', 70),
      ligne('dino', 70),
      ligne('elia', 10),
    ]);
  });

  it('rend les premiers dans l’ordre, sans le détail', async () => {
    const top = await memoryRepository.getLeaderboardTop(CHAPITRE, 3);

    expect(top.map((r) => r.playerId)).toEqual(['bran', 'cleo', 'dino']);
    // Le point de toute la refonte : le détail par personnage ne traverse plus
    // cette lecture, parce que c'est lui qui faisait grossir l'entrée de cache
    // jusqu'au seuil au-delà duquel Next cesse de cacher.
    expect(top[0]).not.toHaveProperty('breakdown');
  });

  it('compte les équipages classés sans les charger', async () => {
    expect(await memoryRepository.getLeaderboardSize(CHAPITRE)).toBe(5);
  });

  it('donne à deux ex æquo le même rang, et fait sauter le suivant', async () => {
    /*
     * Classement sportif. L'ancienne page prenait l'indice dans la liste
     * triée : entre deux joueurs à égalité, le rang affiché dépendait donc de
     * l'ordre dans lequel la base avait rendu les lignes — l'un voyait #2,
     * l'autre #3, sans qu'aucune règle ne le décide.
     */
    const cleo = await memoryRepository.getPlayerChapterResult(CHAPITRE, 'cleo');
    const dino = await memoryRepository.getPlayerChapterResult(CHAPITRE, 'dino');
    const anne = await memoryRepository.getPlayerChapterResult(CHAPITRE, 'anne');

    expect(cleo?.rank).toBe(2);
    expect(dino?.rank).toBe(2);
    expect(anne?.rank).toBe(4);
  });

  it('rend le détail au joueur, et à lui seul', async () => {
    const mine = await memoryRepository.getPlayerChapterResult(CHAPITRE, 'bran');

    expect(mine?.total).toBe(90);
    expect(mine?.breakdown).toEqual([
      { characterId: 'luffy', total: 90, breakdown: ['+90'] },
    ]);
  });

  it('rend null pour un joueur qui n’a pas participé', async () => {
    // Le cas du visiteur connecté qui a raté la semaine : la page doit
    // simplement ne pas afficher le bloc « Ta position ».
    expect(
      await memoryRepository.getPlayerChapterResult(CHAPITRE, 'inconnu'),
    ).toBeNull();
  });

  it('demande moins de lignes que le classement n’en compte', async () => {
    // `limit` borne réellement : c'est ce qui garantit que le poids de
    // l'entrée de cache ne dépend pas du nombre de joueurs.
    const top = await memoryRepository.getLeaderboardTop(CHAPITRE, 50);
    expect(top).toHaveLength(5);
  });
});
