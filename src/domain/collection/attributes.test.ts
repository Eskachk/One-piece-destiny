import { describe, expect, it } from 'vitest';
import { attributesOf, MAX_ATTRIBUTES } from './attributes';
import { CHARACTERS, CHARACTER_INDEX } from '../../data/characters';
import type { Character } from '../types';

const character = (partial: Partial<Character>): Character => ({
  id: 'x',
  name: 'X',
  rarity: 'COMMON',
  affiliations: [],
  relations: [],
  abilities: [],
  presenceExpectation: 'LOW',
  ...partial,
});

describe('attributs de carte', () => {
  it('lit le Haki dans les capacités', () => {
    const found = attributesOf(
      character({ abilities: ['Haki des Rois', 'Fruit du démon'] }),
    );
    expect(found.map((a) => a.id)).toContain('conqueror');
    expect(found.map((a) => a.id)).toContain('fruit');
  });

  it('lit le type de fruit dans les affiliations', () => {
    // L'import range le type de fruit en affiliation, pas en capacité : la
    // détection doit regarder les deux listes indifféremment.
    const found = attributesOf(
      character({ affiliations: ["Big Mom's crew", 'Paramecia'] }),
    );
    expect(found.map((a) => a.id)).toContain('paramecia');
    expect(found.map((a) => a.id)).toContain('pirate');
  });

  it('reconnaît la Marine', () => {
    const found = attributesOf(character({ affiliations: ['Marine'] }));
    expect(found.map((a) => a.id)).toContain('marine');
  });

  it('ne rend rien pour un personnage sans donnée', () => {
    expect(attributesOf(character({}))).toEqual([]);
  });

  it('plafonne le nombre de symboles', () => {
    // Sans plafond, un personnage richement décrit couvrirait sa propre carte.
    const found = attributesOf(
      character({
        abilities: [
          'Haki des Rois',
          'Haki armement',
          'Haki observation',
          'Fruit du démon',
          'Captain',
          'Doctor',
          'Navigation',
        ],
        affiliations: ['Marine', 'Logia'],
      }),
    );
    expect(found.length).toBeLessThanOrEqual(MAX_ATTRIBUTES);
  });

  it('donne au moins un symbole aux personnages écrits à la main', () => {
    // Ces vingt-quatre entrées sont la vitrine du jeu : une carte sans aucun
    // symbole y signalerait une règle de détection cassée.
    for (const id of ['luffy', 'zoro', 'nami', 'akainu', 'mihawk']) {
      const found = attributesOf(CHARACTER_INDEX.get(id)!);
      expect(found.length, id).toBeGreaterThan(0);
    }
  });

  it('couvre la quasi-totalité du référentiel', () => {
    // Garde-fou de régression, pas d'objectif esthétique. La première version
    // des règles laissait 211 personnages sur 740 sans le moindre symbole :
    // leur seule donnée était un poste écrit en anglais que rien ne
    // reconnaissait. Une carte muette se lit comme un personnage vide.
    //
    // Il reste sept entrées sans aucune donnée dans la source — ni poste, ni
    // équipage, ni fruit. Rien ne peut en être déduit, et inventer un attribut
    // serait pire que de n'en afficher aucun.
    const muettes = CHARACTERS.filter((c) => attributesOf(c).length === 0);

    expect(muettes.length).toBeLessThanOrEqual(10);
  });

  it('montre le grade de la Marine à côté du camp, pas à sa place', () => {
    /*
     * « Vice-Admiral » n'était attrapé que par la règle de camp : un
     * vice-amiral affichait ⚓ et rien d'autre, exactement comme un matelot
     * sans nom. C'est le plus gros groupe du référentiel — vingt-quatre
     * vice-amiraux, sept amiraux, trente-deux lieutenants.
     */
    const grades: [string, string][] = [
      ['Admiral', 'admiral'],
      ['Vice-Admiral', 'vice-admiral'],
      ['Rear Admiral', 'vice-admiral'],
      ['Colonel', 'navy-officer'],
      ['Lieutenant', 'navy-junior'],
    ];

    for (const [poste, attendu] of grades) {
      const ids = attributesOf(
        character({ abilities: [poste], affiliations: ['Marine'] }),
      ).map((a) => a.id);
      expect(ids, poste).toContain('marine');
      expect(ids, poste).toContain(attendu);
    }
  });

  it('n’appelle pas « lieutenant de Doflamingo » un grade de la Marine', () => {
    // Les motifs de grade sont ancrés pour cette raison précise : le mot
    // « lieutenant » désigne aussi un bras droit, qui n'est pas un officier.
    const ids = attributesOf(
      character({ abilities: ['Lieutenant of Doflamingo'] }),
    ).map((a) => a.id);
    expect(ids).not.toContain('navy-junior');
  });

  it('affiche l’équipage d’Empereur et la prime ensemble', () => {
    // Deux faits distincts, et c'est pourquoi la famille en admet deux : être
    // d'un équipage d'Empereur ne dit pas qu'on vaut un milliard.
    const ids = attributesOf(
      character({
        abilities: ["Équipage d'Empereur", 'Prime au milliard'],
      }),
    ).map((a) => a.id);
    expect(ids).toContain('emperor-crew');
    expect(ids).toContain('bounty-billion');
  });

  it('ne fait pas d’un colosse une espèce', () => {
    /*
     * Cinq mètres ne font pas un géant : Kaido en mesure sept et n'en est pas
     * un. « Colosse » ne doit donc jamais l'emporter sur une race écrite à la
     * main, et ne paraître que lorsqu'on ne sait rien d'autre.
     */
    const seul = attributesOf(character({ abilities: ['Colosse'] }));
    expect(seul.map((a) => a.id)).toContain('colossus');

    const avecRace = attributesOf(
      character({ abilities: ['Colosse', 'Homme-poisson'] }),
    ).map((a) => a.id);
    expect(avecRace).toContain('fishman');
    expect(avecRace).not.toContain('colossus');
  });

  it('rend des identifiants uniques : ils servent de clé de rendu', () => {
    const found = attributesOf(
      character({
        abilities: ['Haki armement', 'sabre'],
        affiliations: ["Le Roux crew", 'Zoan'],
      }),
    );
    expect(new Set(found.map((a) => a.id)).size).toBe(found.length);
  });
});
