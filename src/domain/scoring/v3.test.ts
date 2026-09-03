import { describe, expect, it } from 'vitest';
import { CAPS, scoreCharacter, SCORING_VERSION } from './v3';
import * as v2 from './v2';
import { getScoringEngine, CURRENT_SCORING_VERSION } from './index';
import { riskFactorOf, attributeProminence } from './prominence';
import { CHARACTER_INDEX } from '../../data/characters';
import type { ChapterAppearance, Character } from '../types';

const roster = CHARACTER_INDEX;
const pick = (id: string) => CHARACTER_INDEX.get(id)!;

const ctx = (
  appearances: ChapterAppearance[],
  picked: string[],
  pickRates?: Map<string, number>,
) => ({ appearances, picked: picked.map(pick), roster, pickRates });

const present = (...ids: string[]): ChapterAppearance[] =>
  ids.map((characterId) => ({ characterId, appearances: 1 }));

/** Personnage de laboratoire : on ne fait varier qu'un champ à la fois. */
const inventé = (partial: Partial<Character>): Character => ({
  id: 'test',
  name: 'Test',
  rarity: 'COMMON',
  affiliations: [],
  relations: [],
  abilities: [],
  presenceExpectation: 'MEDIUM',
  ...partial,
});

describe('moteur v3 — la règle qui surprend', () => {
  it('ne donne rien à un absent, même quand son capitaine est présent', () => {
    /*
     * Le cas rapporté : Luffy déclaré présent, Usopp aligné dans l'équipage,
     * zéro point pour Usopp.
     *
     * Ce n'est pas un défaut du comptage, c'est la règle du jeu : on
     * pronostique **qui apparaît**. Un personnage qui ne paraît pas vaut zéro,
     * même si son capitaine, son équipage entier et tous ses alliés y sont —
     * et même s'il partage un Haki avec eux.
     *
     * Sans cette garde, la meilleure stratégie deviendrait de choisir des
     * seconds couteaux liés à des vedettes : on parierait sur l'entourage
     * plutôt que sur le personnage, et le pronostic n'aurait plus d'objet.
     */
    const score = scoreCharacter(pick('usopp'), ctx(present('luffy'), ['usopp']));

    expect(score.total).toBe(0);
    expect(score.breakdown).toEqual(['Absent du chapitre → aucun point.']);
  });

  it('récompense le même Usopp dès qu’il est présent lui aussi', () => {
    // La différence tient au seul fait d'être là : base, liens d'équipage et
    // attributs partagés s'ajoutent d'un coup.
    const seul = scoreCharacter(pick('usopp'), ctx(present('usopp'), ['usopp']));
    const accompagné = scoreCharacter(
      pick('usopp'),
      ctx(present('usopp', 'luffy'), ['usopp']),
    );

    expect(accompagné.total).toBeGreaterThan(seul.total);
    expect(accompagné.synergy).toBeGreaterThan(0);
  });
});

describe('moteur v3 — le risque lit la rareté et les attributs', () => {
  it('paie moins un Mythique qu’un Commun à présence égale', () => {
    // Le §25 interdit que la rareté **rapporte**. Elle fait ici l'inverse :
    // une carte rare est un choix sûr, donc peu payant. Aligner des Mythiques
    // reste le jeu le plus prudent, jamais le plus rentable — ce qui protège
    // le §48, puisque acheter des coffres n'achète pas de classement.
    const commun = riskFactorOf(inventé({ rarity: 'COMMON' }));
    const mythique = riskFactorOf(inventé({ rarity: 'MYTHIC' }));

    expect(mythique.factor).toBeLessThan(commun.factor);
  });

  it('paie moins un personnage à trois Haki qu’un figurant', () => {
    const vedette = riskFactorOf(
      inventé({ abilities: ['Haki des Rois', 'Haki armement', 'Haki observation'] }),
    );
    const figurant = riskFactorOf(inventé({ abilities: ['Resident'] }));

    expect(vedette.factor).toBeLessThan(figurant.factor);
    expect(attributeProminence(inventé({ abilities: ['Haki des Rois'] }))).toBeGreaterThan(0);
  });

  it('distingue deux personnages que le v2 payait à l’identique', () => {
    /*
     * Le défaut corrigé. En v2, le risque ne lisait que l'attendu de présence
     * — trois valeurs — et le taux de sélection. Deux personnages notés
     * « présence moyenne » rapportaient donc exactement le même bonus, qu'il
     * s'agisse d'un Mythique connu de tous ou d'un Commun que personne ne sait
     * situer.
     */
    const chapitre = present('test');
    const vedette = inventé({
      rarity: 'MYTHIC',
      abilities: ['Haki des Rois', 'Haki armement', 'Fruit du démon'],
    });
    const obscur = inventé({ rarity: 'COMMON', abilities: ['Resident'] });

    const scoreDe = (c: Character) =>
      scoreCharacter(c, { appearances: chapitre, picked: [c], roster });

    expect(scoreDe(obscur).risk).toBeGreaterThan(scoreDe(vedette).risk);

    // Et en v2, les deux étaient rigoureusement égaux.
    const v2ScoreDe = (c: Character) =>
      v2.scoreCharacter(c, { appearances: chapitre, picked: [c], roster });
    expect(v2ScoreDe(obscur).risk).toBe(v2ScoreDe(vedette).risk);
  });

  it('ne dépasse jamais le plafond de risque', () => {
    const chapitre = present('test');
    const extrême = inventé({ rarity: 'COMMON', presenceExpectation: 'LOW' });
    const score = scoreCharacter(extrême, {
      appearances: chapitre,
      picked: [extrême],
      roster,
      pickRates: new Map([['test', 0]]),
    });

    expect(score.risk).toBeLessThanOrEqual(CAPS.risk);
    expect(score.total).toBeLessThanOrEqual(CAPS.total);
  });

  it('dit au joueur ce qui a fait le pari', () => {
    // « Pari moyen réussi » n'apprenait rien sur ce qui l'a rendu moyen, et
    // c'est précisément ce qu'un joueur veut comprendre pour la semaine
    // suivante.
    const score = scoreCharacter(pick('luffy'), ctx(present('luffy'), ['luffy']));
    const ligne = score.breakdown.find((l) => l.startsWith('Pari réussi'));

    expect(ligne).toBeDefined();
    expect(ligne).toContain('rareté');
    expect(ligne).toContain('attributs');
    expect(ligne).toContain('part de risque');
  });
});

describe('moteur v3 — les anciens chapitres ne bougent pas', () => {
  it('garde le v1 et le v2 rejouables', () => {
    // Un chapitre publié porte sa version en base. La retirer du registre
    // rendrait son classement irrecalculable, donc incontestable (§78).
    expect(getScoringEngine('v1.0.0').version).toBe('v1.0.0');
    expect(getScoringEngine(v2.SCORING_VERSION).version).toBe(v2.SCORING_VERSION);
    expect(getScoringEngine(SCORING_VERSION).version).toBe(SCORING_VERSION);
  });

  it('ouvre les nouveaux chapitres en v3', () => {
    expect(CURRENT_SCORING_VERSION).toBe(SCORING_VERSION);
  });
});
