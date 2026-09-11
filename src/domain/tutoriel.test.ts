import { describe, expect, it } from 'vitest';
import { CHIFFRES, EXEMPLE, TUTORIELS, type PageTutoriel } from './tutoriel';
import { CAPS, CONSENSUS, scoreCharacter } from './scoring/v6';
import { CURRENT_SCORING_VERSION } from './scoring';
import { SCORING_VERSION } from './scoring/v6';
import { BONUS_PAR_BONNE_REPONSE, MAX_QUESTIONS } from './chapter/pronostics';
import { REFERRAL_BERRIES_REFERRER } from './social/referral';
import { CHARACTER_INDEX } from '../data/characters';
import type { ScoringContext } from './scoring/v1';

/**
 * Ce fichier existe à cause d'un bug réel, et pas d'un principe.
 *
 * Le tutoriel précédent annonçait aux nouveaux joueurs « 40 points de
 * présence », « jusqu'à 35 » de synergie, « jusqu'à 25 » de risque. C'étaient
 * les plafonds du moteur **v2**. Le jeu tournait en v6 depuis longtemps, où
 * ils valent 34, 34 et 32. Le premier écran qu'un joueur voyait du jeu lui
 * mentait donc sur la seule chose qui décide de son classement, et rien — ni
 * type, ni test, ni revue — ne pouvait le dire.
 *
 * Ces tests attachent chaque nombre affiché à la constante qui le produit.
 */

describe('les chiffres du tutoriel sont ceux du jeu', () => {
  it('reprend les plafonds du moteur en service', () => {
    // Si cette ligne casse, c'est que le moteur courant a changé : les
    // attentes ci-dessous décrivent le v6 et devront être relues, pas
    // recalées à la va-vite.
    expect(CURRENT_SCORING_VERSION).toBe(SCORING_VERSION);

    expect(CHIFFRES.base).toBe(CAPS.base);
    expect(CHIFFRES.synergie).toBe(CAPS.synergy);
    expect(CHIFFRES.risque).toBe(CAPS.risk);
    expect(CHIFFRES.total).toBe(CAPS.total);
  });

  it('annonce la bonne part emportée par l’unanimité', () => {
    expect(CHIFFRES.consensus).toBe(Math.round(CONSENSUS * 100));
  });

  it('annonce les bons pronostics secondaires', () => {
    expect(CHIFFRES.questions).toBe(MAX_QUESTIONS);
    expect(CHIFFRES.bonusQuestion).toBe(BONUS_PAR_BONNE_REPONSE);
  });

  it('annonce la bonne prime de parrainage', () => {
    expect(CHIFFRES.parrainage).toBe(REFERRAL_BERRIES_REFERRER);
  });
});

/**
 * L'exemple chiffré, recalculé.
 *
 * C'est l'étape la plus importante du tutoriel — celle qui affirme qu'une
 * carte sans valeur bat une vedette — et c'est la seule qui demande au joueur
 * de nous croire. Elle ne doit donc pas reposer sur des nombres écrits à la
 * main : ils sont rejoués ici sur le moteur, avec exactement le chapitre
 * décrit dans `EXEMPLE`.
 */
describe('l’exemple « une carte nulle rapporte plus » est vrai', () => {
  const ROSTER = CHARACTER_INDEX;
  const perso = (id: string) => ROSTER.get(id)!;

  const CHAPITRE = ['luffy', 'toto', 'nefertari-vivi', 'chaka', 'crocodile'];
  const ALIGNES = ['luffy', 'toto', 'nefertari-vivi'];

  const taux = new Map<string, number>([
    ['luffy', EXEMPLE.tauxVedette / 100],
    ['toto', EXEMPLE.tauxInconnu / 100],
  ]);

  const contexte = (presents: readonly string[]): ScoringContext => ({
    appearances: presents.map((id) => ({ characterId: id, appearances: 1 })),
    picked: ALIGNES.map((id) => perso(id)),
    roster: ROSTER,
    pickRates: taux,
  });

  it('les personnages de l’exemple existent toujours', () => {
    for (const id of [...CHAPITRE, ...ALIGNES]) {
      expect(ROSTER.get(id), `${id} a disparu du référentiel`).toBeDefined();
    }
  });

  it('donne bien les scores annoncés', () => {
    const ctx = contexte(CHAPITRE);
    expect(scoreCharacter(perso('luffy'), ctx).total).toBe(EXEMPLE.vedette);
    expect(scoreCharacter(perso('toto'), ctx).total).toBe(EXEMPLE.inconnu);
  });

  it('le Commun l’emporte largement, ce qui est tout le propos', () => {
    // Sans cet écart, l'étape reste vraie à la lettre et fausse dans l'esprit :
    // « un peu plus » ne justifie pas de dire au joueur de délaisser ses
    // meilleures cartes.
    expect(EXEMPLE.inconnu).toBeGreaterThan(EXEMPLE.vedette * 2);
  });

  it('le pari manqué garde ce qu’il avait vu juste', () => {
    const sansToto = contexte(CHAPITRE.filter((id) => id !== 'toto'));
    expect(scoreCharacter(perso('toto'), sansToto).total).toBe(EXEMPLE.inconnuAbsent);
  });
});

describe('forme des visites guidées', () => {
  const PAGES: PageTutoriel[] = [
    'accueil',
    'classement',
    'collection',
    'market',
    'boutique',
    'profil',
  ];

  const LANGUES = Object.keys(TUTORIELS) as (keyof typeof TUTORIELS)[];

  it('existe dans chaque langue de l’interface', () => {
    expect(LANGUES.sort()).toEqual(['en', 'fr']);
  });

  it.each(LANGUES)('%s couvre les six onglets de la barre', (langue) => {
    // Une page ajoutée à la navigation sans visite guidée est précisément le
    // trou que ce travail vient combler.
    expect(Object.keys(TUTORIELS[langue]).sort()).toEqual([...PAGES].sort());
  });

  it('a le même nombre d’étapes dans chaque langue', () => {
    // Une étape ajoutée en français et oubliée en anglais ne casserait rien :
    // le joueur anglophone aurait simplement une visite plus courte, sans que
    // personne ne le sache.
    for (const page of PAGES) {
      expect(TUTORIELS.en[page].length, page).toBe(TUTORIELS.fr[page].length);
    }
  });

  it.each(LANGUES)('%s reste court partout', (langue) => {
    for (const page of PAGES) {
      const etapes = TUTORIELS[langue][page];
      expect(etapes.length, `${page} : trop peu d’étapes`).toBeGreaterThanOrEqual(3);
      expect(etapes.length, `${page} : trop d’étapes`).toBeLessThanOrEqual(7);

      for (const etape of etapes) {
        expect(etape.titre.length, `${page} — titre trop long : ${etape.titre}`).toBeLessThanOrEqual(52);
        // Deux à trois phrases. Au-delà, le joueur passe — et une visite qu'on
        // passe ne vaut pas mieux que pas de visite du tout.
        expect(etape.corps.length, `${page} — corps trop long : ${etape.titre}`).toBeLessThanOrEqual(300);
        expect(etape.corps.length, `${page} — corps trop court : ${etape.titre}`).toBeGreaterThan(30);
        if (etape.repere) {
          expect(etape.repere.length, `${page} — repère trop long : ${etape.titre}`).toBeLessThanOrEqual(180);
        }
      }
    }
  });

  it.each(LANGUES)('%s n’emploie que des apostrophes typographiques', (langue) => {
    // Le reste du produit en emploie partout ; une apostrophe droite au milieu
    // d'un texte soigné se voit immédiatement.
    for (const page of PAGES) {
      for (const etape of TUTORIELS[langue][page]) {
        const texte = `${etape.titre} ${etape.corps} ${etape.repere ?? ''}`;
        expect(texte.includes("'"), `${page} — ${etape.titre}`).toBe(false);
      }
    }
  });
});
