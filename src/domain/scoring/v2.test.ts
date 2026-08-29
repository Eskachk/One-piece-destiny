import { describe, expect, it } from 'vitest';
import { CAPS, scoreCharacter, scoreTeam, SCORING_VERSION } from './v2';
import * as v1 from './v1';
import { CHARACTERS, CHARACTER_INDEX } from '../../data/characters';
import type { ChapterAppearance } from '../types';

const roster = CHARACTER_INDEX;
const pick = (id: string) => CHARACTER_INDEX.get(id)!;

const ctx = (
  appearances: ChapterAppearance[],
  picked: string[],
  pickRates?: Map<string, number>,
) => ({
  appearances,
  picked: picked.map(pick),
  roster,
  pickRates,
});

const present = (...ids: string[]): ChapterAppearance[] =>
  ids.map((characterId) => ({ characterId, appearances: 1 }));

describe('moteur v2 — la présence seule compte', () => {
  it('donne la même base à un personnage vu une fois et à un personnage omniprésent', () => {
    // C'est tout l'objet du v2. En v1, Luffy à 12 apparitions écrasait
    // mécaniquement un personnage vu une seule fois ; le comptage décidait de
    // la partie avant toute stratégie.
    const rare = scoreCharacter(pick('koby'), ctx([{ characterId: 'koby', appearances: 1 }], ['koby']));
    const massif = scoreCharacter(pick('koby'), ctx([{ characterId: 'koby', appearances: 40 }], ['koby']));

    expect(rare.base).toBe(massif.base);
    expect(rare.total).toBe(massif.total);
  });

  it('ne donne rien à un absent, même très bien entouré', () => {
    // La synergie est un bonus sur une présence, pas une récompense autonome.
    const score = scoreCharacter(
      pick('zoro'),
      ctx(present('luffy', 'nami', 'sanji'), ['zoro']),
    );
    expect(score.total).toBe(0);
    expect(score.breakdown).toEqual(['Absent du chapitre → aucun point.']);
  });

  it('récompense les liens réellement activés', () => {
    const seul = scoreCharacter(pick('luffy'), ctx(present('luffy'), ['luffy']));
    const entoure = scoreCharacter(
      pick('luffy'),
      ctx(present('luffy', 'zoro', 'nami', 'sanji'), ['luffy']),
    );

    expect(entoure.synergy).toBeGreaterThan(seul.synergy);
    expect(entoure.total).toBeGreaterThan(seul.total);
  });

  it('paie davantage un pari improbable', () => {
    // Deux personnages présents, même base : seul le risque les sépare.
    const attendu = scoreCharacter(pick('luffy'), ctx(present('luffy'), ['luffy']));
    const improbable = scoreCharacter(
      pick('helmeppo'),
      ctx(present('helmeppo'), ['helmeppo']),
    );

    expect(attendu.base).toBe(improbable.base);
    expect(improbable.risk).toBeGreaterThan(attendu.risk);
  });

  it('majore le pari sur un personnage peu choisi par la communauté', () => {
    const populaire = scoreCharacter(
      pick('koby'),
      ctx(present('koby'), ['koby'], new Map([['koby', 0.9]])),
    );
    const delaisse = scoreCharacter(
      pick('koby'),
      ctx(present('koby'), ['koby'], new Map([['koby', 0.02]])),
    );

    expect(delaisse.risk).toBeGreaterThan(populaire.risk);
  });

  it('respecte le plafond de 100 par personnage', () => {
    // Tout le référentiel présent : la synergie est saturée au maximum.
    const tous = CHARACTERS.map((c) => ({ characterId: c.id, appearances: 1 }));
    for (const id of ['luffy', 'zoro', 'nami']) {
      expect(scoreCharacter(pick(id), ctx(tous, [id])).total).toBeLessThanOrEqual(
        CAPS.total,
      );
    }
  });

  it('somme les trois personnages et porte sa version', () => {
    const team = scoreTeam(ctx(present('luffy', 'zoro', 'nami'), ['luffy', 'zoro', 'nami']));

    expect(team.scoringVersion).toBe(SCORING_VERSION);
    expect(team.characters).toHaveLength(3);
    expect(team.total).toBe(
      team.characters.reduce((sum, c) => sum + c.total, 0),
    );
  });

  it('ne plante pas sur un chapitre sans aucune apparition', () => {
    const team = scoreTeam(ctx([], ['luffy', 'zoro', 'nami']));
    expect(team.total).toBe(0);
  });
});

describe('cohabitation des deux moteurs (§78)', () => {
  it('le v1 reste disponible et continue de compter les apparitions', () => {
    // Un chapitre publié en v1 doit se rejouer à l'identique. Si le v1 se
    // mettait à ignorer les comptes, tous les classements déjà publiés
    // changeraient rétroactivement.
    const peu = v1.scoreCharacter(
      pick('koby'),
      ctx([{ characterId: 'koby', appearances: 1 }], ['koby']),
    );
    const beaucoup = v1.scoreCharacter(
      pick('koby'),
      ctx([{ characterId: 'koby', appearances: 20 }], ['koby']),
    );

    expect(beaucoup.base).toBeGreaterThan(peu.base);
  });

  it('les deux versions se distinguent par leur identifiant', () => {
    expect(SCORING_VERSION).not.toBe(v1.SCORING_VERSION);
  });
});
