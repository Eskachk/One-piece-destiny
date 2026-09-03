import { describe, expect, it } from 'vitest';
import { CAPS, scoreCharacter, SCORING_VERSION } from './v5';
import * as v4 from './v4';
import { getScoringEngine, CURRENT_SCORING_VERSION } from './index';
import { CHARACTER_INDEX } from '../../data/characters';
import type { ChapterAppearance } from '../types';

const roster = CHARACTER_INDEX;
const pick = (id: string) => CHARACTER_INDEX.get(id)!;
const present = (...ids: string[]): ChapterAppearance[] =>
  ids.map((characterId) => ({ characterId, appearances: 1 }));
const scoreDe = (id: string, chapitre: ChapterAppearance[]) =>
  scoreCharacter(pick(id), { appearances: chapitre, picked: [pick(id)], roster });

const CHAPITRE = present('luffy', 'loki', 'zoro', 'kinemon', 'im-sama');

describe('moteur v5 — risque et attributs pour tout le monde', () => {
  it('donne un bonus de risque à un personnage absent', () => {
    // C'est la demande, répétée : le risque compte pour **tous** les
    // personnages, pas seulement pour ceux qui apparaissent. Le v4 le mettait
    // encore à zéro sur les absents.
    for (const id of ['usopp', 'perona', 'denjiro']) {
      expect(v4.scoreCharacter(pick(id), { appearances: CHAPITRE, picked: [pick(id)], roster }).risk, id).toBe(0);
      expect(scoreDe(id, CHAPITRE).risk, id).toBeGreaterThan(0);
    }
  });

  it('donne la synergie entière à un absent, sans la réduire', () => {
    // Le v4 n'en laissait que quarante pour cent.
    const v5Usopp = scoreDe('usopp', CHAPITRE);
    const v4Usopp = v4.scoreCharacter(pick('usopp'), { appearances: CHAPITRE, picked: [pick('usopp')], roster });
    expect(v5Usopp.synergy).toBeGreaterThan(v4Usopp.synergy);
  });

  it('compte les attributs partagés de Denjirô avec Kinémon', () => {
    const score = scoreDe('denjiro', CHAPITRE);
    const detail = score.breakdown.join(' ');
    expect(detail).toContain('Pays des Wa');
    expect(detail).toContain('Épéiste partagé');
  });

  it('réserve la base de quarante points à la présence', () => {
    // C'est la seule chose qui distingue encore un présent d'un absent.
    expect(scoreDe('usopp', CHAPITRE).base).toBe(0);
    expect(scoreDe('luffy', CHAPITRE).base).toBe(CAPS.base);
  });

  it('n’annonce pas un pari « réussi » pour un absent', () => {
    expect(scoreDe('usopp', CHAPITRE).breakdown.join(' ')).toContain('Pari tenté');
    expect(scoreDe('luffy', CHAPITRE).breakdown.join(' ')).toContain('Pari réussi');
  });

  it('laisse à zéro un absent sans lien ni risque mesurable', () => {
    // L'ouverture n'est pas une distribution : un personnage attendu, banal et
    // sans rapport avec le chapitre ne gagne toujours presque rien.
    const score = scoreDe('luffy', present('t-bone'));
    expect(score.base).toBe(0);
    expect(score.synergy).toBe(0);
  });
});

describe('moteur v5 — les anciens chapitres ne bougent pas', () => {
  it('garde toutes les versions rejouables', () => {
    for (const v of ['v1.0.0', 'v2.0.0', 'v3.0.0', 'v4.0.0', SCORING_VERSION]) {
      expect(getScoringEngine(v).version).toBe(v);
    }
  });

  it('ouvre les nouveaux chapitres en v5', () => {
    expect(CURRENT_SCORING_VERSION).toBe(SCORING_VERSION);
  });
});
