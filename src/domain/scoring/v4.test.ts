import { describe, expect, it } from 'vitest';
import { CAPS, scoreCharacter, SCORING_VERSION } from './v4';
import * as v3 from './v3';
import { getScoringEngine, CURRENT_SCORING_VERSION } from './index';
import { sharedAttributeValue } from './shared-attributes';
import { CHARACTER_INDEX } from '../../data/characters';
import type { ChapterAppearance } from '../types';

const roster = CHARACTER_INDEX;
const pick = (id: string) => CHARACTER_INDEX.get(id)!;
const present = (...ids: string[]): ChapterAppearance[] =>
  ids.map((characterId) => ({ characterId, appearances: 1 }));
const scoreDe = (id: string, chapitre: ChapterAppearance[]) =>
  scoreCharacter(pick(id), { appearances: chapitre, picked: [pick(id)], roster });

describe('moteur v4 — l’écho des absents', () => {
  const chapitre = present('luffy', 'loki', 'zoro', 'kinemon', 'im-sama');

  it('récompense Usopp la semaine où son équipage paraît', () => {
    // Le cas rapporté. En v3 il valait zéro, exactement comme un figurant sans
    // le moindre rapport avec le chapitre — deux pronostics de qualité très
    // différente notés pareil.
    expect(v3.scoreCharacter(pick('usopp'), { appearances: chapitre, picked: [pick('usopp')], roster }).total).toBe(0);
    expect(scoreDe('usopp', chapitre).total).toBeGreaterThan(0);
  });

  it('récompense Denjirô pour ses liens de Wano avec Kinémon', () => {
    // Tous deux samouraïs du Pays des Wa et tous deux sabreurs. Le v3 ne
    // voyait ni l'un ni l'autre : sa liste d'attributs comptant retenait le
    // Haki, l'équipage et le fruit, et écartait les camps et les armes.
    const score = scoreDe('denjiro', chapitre);
    expect(score.total).toBeGreaterThan(0);
    expect(score.breakdown.join(' ')).toContain('Pays des Wa');
  });

  it('laisse à zéro un absent sans aucun lien', () => {
    // L'écho n'est pas une consolation distribuée à tous : sans lien avec le
    // chapitre, le pronostic ne vaut toujours rien.
    const chapitreIsole = present('luffy');
    expect(scoreDe('t-bone', chapitreIsole).total).toBe(0);
  });

  it('ne donne à un absent ni base ni bonus de risque', () => {
    const score = scoreDe('usopp', chapitre);
    expect(score.base).toBe(0);
    expect(score.risk).toBe(0);
  });

  it('garantit qu’un absent ne dépasse jamais un présent isolé', () => {
    /*
     * La crainte, en ouvrant les points aux absents, était qu'on se mette à
     * jouer des seconds couteaux bien entourés plutôt que des personnages
     * qu'on croit voir paraître. L'arithmétique l'interdit : l'écho plafonne à
     * 40 % de la synergie, quand la seule présence vaut déjà 40 points.
     */
    const plafondEcho = Math.round(CAPS.synergy * 0.4);
    expect(plafondEcho).toBeLessThan(CAPS.base);

    const absentTresLie = scoreDe('usopp', present('luffy', 'zoro', 'nami', 'sanji', 'robin'));
    const presentIsole = scoreDe('t-bone', present('t-bone'));
    expect(absentTresLie.total).toBeLessThan(presentIsole.total);
  });
});

describe('moteur v4 — le barème des attributs partagés', () => {
  it('n’accorde rien pour « pirate », que quatre cents personnages portent', () => {
    // C'était le motif de la liste écrite à la main du v3. La rareté mesurée
    // produit le même refus, sans avoir à écarter les familles voisines.
    expect(sharedAttributeValue('pirate')).toBe(0);
  });

  it('accorde beaucoup pour un Haki, que dix-sept personnages portent', () => {
    expect(sharedAttributeValue('conqueror')).toBeGreaterThanOrEqual(4);
    expect(sharedAttributeValue('observation')).toBeGreaterThanOrEqual(4);
  });

  it('classe un grand équipage sous un petit', () => {
    // Partager Big Mom, c'est être l'un de quatre-vingt-onze ; partager le
    // Chapeau de Paille, l'un de trente-huit. Le second informe davantage.
    expect(sharedAttributeValue('crew-Chapeau de Paille')).toBeGreaterThan(
      sharedAttributeValue('crew-Big Mom'),
    );
  });
});

describe('moteur v4 — les anciens chapitres ne bougent pas', () => {
  it('garde toutes les versions rejouables', () => {
    for (const v of ['v1.0.0', 'v2.0.0', 'v3.0.0', SCORING_VERSION]) {
      expect(getScoringEngine(v).version).toBe(v);
    }
  });

  it('ouvre les nouveaux chapitres en v4', () => {
    expect(CURRENT_SCORING_VERSION).toBe(SCORING_VERSION);
  });
});
