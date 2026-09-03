import { describe, expect, it } from 'vitest';
import { CAPS, scoreCharacter, scoreTeam, SCORING_VERSION } from './v6';
import * as v5 from './v5';
import { getScoringEngine, CURRENT_SCORING_VERSION } from './index';
import { CHARACTER_INDEX, CHARACTERS } from '../../data/characters';
import { isCanon } from '../../data/non-canon';
import { riskRankOf } from './prominence';
import type { ScoringContext } from './v1';

/**
 * Le v6 corrige trois défauts **mesurés** sur le v5, chacun sur les sept
 * chapitres réellement publiés et sur les 737 personnages jouables :
 *
 *   1. le risque distribuait 87,7 % de tous les points, la synergie 11,0 % ;
 *   2. un absent inconnu rapportait 25,9 points pour n'avoir rien deviné ;
 *   3. le taux de sélection, seul garde-fou contre le choix unanime, ne
 *      changeait le score de Luffy que de 0,0 point.
 *
 * Chacun de ces tests reprend un de ces chiffres. Ils ne vérifient pas que le
 * code fait ce qu'il dit : ils vérifient qu'il ne refait pas ce qu'il faisait.
 */

const ROSTER = CHARACTER_INDEX;
const JOUABLES = CHARACTERS.filter((c) => isCanon(c.id));

function ctx(
  presents: string[],
  picked: string[],
  pickRates?: Map<string, number>,
): ScoringContext {
  return {
    appearances: presents.map((id) => ({ characterId: id, appearances: 1 })),
    picked: picked.map((id) => ROSTER.get(id)!),
    roster: ROSTER,
    pickRates,
  };
}

const perso = (id: string) => ROSTER.get(id)!;

describe('moteur v6 — le risque redevient un risque', () => {
  it('ouvre les nouveaux chapitres', () => {
    expect(CURRENT_SCORING_VERSION).toBe(SCORING_VERSION);
    expect(getScoringEngine(SCORING_VERSION).version).toBe(SCORING_VERSION);
  });

  it('garde toutes les versions antérieures rejouables (§78)', () => {
    for (const v of ['v1.0.0', 'v2.0.0', 'v3.0.0', 'v4.0.0', v5.SCORING_VERSION]) {
      expect(getScoringEngine(v).version).toBe(v);
    }
  });

  it('les plafonds somment à cent', () => {
    expect(CAPS.base + CAPS.synergy + CAPS.risk).toBe(CAPS.total);
  });

  /* --- 1. Le rang, pas la note ------------------------------------------ */

  it('l’improbabilité est répartie uniformément, pas tassée en haut', () => {
    const rangs = JOUABLES.map((c) => riskRankOf(c)).sort((a, b) => a - b);
    const mediane = rangs[Math.floor(rangs.length / 2)];

    // Le v5 avait une médiane de facteur à 0,84 : tout le monde était
    // « risqué », donc plus personne ne l'était.
    expect(mediane).toBeGreaterThan(0.42);
    expect(mediane).toBeLessThan(0.58);
    expect(rangs[0]).toBeLessThan(0.05);
    expect(rangs[rangs.length - 1]).toBeGreaterThan(0.95);
  });

  it('les personnages aux mêmes données ont le même rang', () => {
    // Sans traitement des ex æquo, l'écart entre deux personnages identiques
    // dépendrait de leur ordre dans le fichier, c'est-à-dire de rien.
    const parFacteur = new Map<number, string[]>();
    for (const c of JOUABLES) {
      const r = riskRankOf(c);
      parFacteur.set(r, [...(parFacteur.get(r) ?? []), c.id]);
    }
    const groupes = [...parFacteur.values()].filter((g) => g.length > 1);
    expect(groupes.length).toBeGreaterThan(0);
    for (const g of groupes) {
      const rangs = g.map((id) => riskRankOf(perso(id)));
      expect(new Set(rangs).size).toBe(1);
    }
  });

  /* --- 2. Un pari raté ne se paie qu'à hauteur de ce qu'il avait vu ------ */

  it('un absent sans le moindre lien ne touche rien', () => {
    // Le défaut central du v5 : ce cas rapportait ~26 points, soit 78 pour une
    // équipe de trois inconnus qui n'avaient rien deviné.
    const isole = JOUABLES.find(
      (c) =>
        c.rarity === 'COMMON' &&
        c.presenceExpectation === 'LOW' &&
        c.relations.length === 0 &&
        c.affiliations.length === 0,
    );
    expect(isole, 'aucun personnage isolé dans le référentiel').toBeDefined();

    const s = scoreCharacter(isole!, ctx(['luffy', 'zoro'], [isole!.id]));
    expect(s.base).toBe(0);
    expect(s.synergy).toBe(0);
    expect(s.risk).toBe(0);
    expect(s.total).toBe(0);
  });

  it('un absent bien lié garde une part de son pari', () => {
    // Sanji n'apparaît pas, mais tout son équipage est là : il avait lu la
    // bonne scène sans nommer la bonne personne.
    const s = scoreCharacter(perso('sanji'), ctx(['luffy', 'zoro', 'nami'], ['sanji']));
    expect(s.base).toBe(0);
    expect(s.synergy).toBeGreaterThan(0);
    // Sa part de risque est faible — il est célèbre — mais sa synergie porte.
    expect(s.total).toBeGreaterThan(20);
  });

  it('la part de risque payée croît avec la synergie', () => {
    const seul = scoreCharacter(perso('sanji'), ctx(['crocodile'], ['sanji']));
    const entoure = scoreCharacter(
      perso('sanji'),
      ctx(['luffy', 'zoro', 'nami', 'usopp'], ['sanji']),
    );
    expect(entoure.risk).toBeGreaterThanOrEqual(seul.risk);
    expect(entoure.total).toBeGreaterThan(seul.total);
  });

  it('la présence paie toujours plus que la seule improbabilité', () => {
    const present = scoreCharacter(perso('luffy'), ctx(['luffy'], ['luffy']));
    expect(present.base).toBe(CAPS.base);
    expect(present.total).toBeGreaterThanOrEqual(CAPS.base);
  });

  /* --- 3. L'unanimité ne décide de rien --------------------------------- */

  it('le choix unanime perd une part de sa valeur', () => {
    const sans = scoreCharacter(perso('luffy'), ctx(['luffy', 'zoro'], ['luffy']));
    const avec = scoreCharacter(
      perso('luffy'),
      ctx(['luffy', 'zoro'], ['luffy'], new Map([['luffy', 0.85]])),
    );
    // Au v5, cet écart valait exactement 0 : le taux de sélection n'agissait
    // qu'à l'intérieur du risque, terme sur lequel Luffy était déjà au plancher.
    expect(avec.total).toBeLessThan(sans.total);
    expect(sans.total - avec.total).toBeGreaterThan(15);
  });

  it('un choix rare ne perd presque rien', () => {
    const c = perso('kawamatsu');
    const sans = scoreCharacter(c, ctx(['kawamatsu'], ['kawamatsu']));
    const avec = scoreCharacter(
      c,
      ctx(['kawamatsu'], ['kawamatsu'], new Map([['kawamatsu', 0.08]])),
    );
    expect(sans.total - avec.total).toBeLessThan(sans.total * 0.05);
  });

  it('l’escompte ne descend jamais à zéro', () => {
    // Même choisi par tout le monde, un personnage garde plus de la moitié de
    // sa valeur : on veut que le choix évident reste correct, pas qu'il
    // devienne une faute qui pousserait à jouer contre son pronostic.
    const total = scoreCharacter(
      perso('luffy'),
      ctx(['luffy', 'zoro'], ['luffy'], new Map([['luffy', 1]])),
    ).total;
    const brut = scoreCharacter(perso('luffy'), ctx(['luffy', 'zoro'], ['luffy'])).total;
    expect(total).toBeGreaterThan(brut * 0.5);
  });

  /* --- L'équilibre d'ensemble ------------------------------------------- */

  it('la synergie pèse plus que le risque dans les points distribués', () => {
    // C'est l'inversion recherchée. Au v5 : risque 87,7 %, synergie 11,0 %.
    const CHAPITRES = [
      ['bartolomeo', 'bonney', 'koby', 'luffy', 'usopp', 'zoro'],
      ['imu-neronna', 'kinemon', 'loki', 'luffy', 'zoro'],
      ['crocodile', 'luffy', 'nami', 'usopp'],
    ];
    let syn = 0;
    let risk = 0;
    for (const c of JOUABLES) {
      for (const ch of CHAPITRES) {
        const s = scoreCharacter(c, ctx(ch, [c.id]));
        syn += s.synergy;
        risk += s.risk;
      }
    }
    expect(syn).toBeGreaterThan(risk);
  });

  it('aligner trois Mythiques ne peut pas être la stratégie la plus payante (§25, §48)', () => {
    // La rareté abaisse l'improbabilité, donc le bonus de risque. Acheter des
    // coffres ne doit jamais acheter du classement.
    const mythiques = JOUABLES.filter((c) => c.rarity === 'MYTHIC');
    const communs = JOUABLES.filter((c) => c.rarity === 'COMMON');
    const moy = (l: typeof mythiques) =>
      l.reduce((s, c) => s + riskRankOf(c), 0) / l.length;
    expect(moy(mythiques)).toBeLessThan(moy(communs));
  });

  it('un total d’équipe reste dans les bornes', () => {
    const t = scoreTeam(ctx(['luffy', 'zoro', 'nami'], ['luffy', 'zoro', 'usopp']));
    expect(t.scoringVersion).toBe(SCORING_VERSION);
    expect(t.total).toBeGreaterThanOrEqual(0);
    expect(t.total).toBeLessThanOrEqual(3 * CAPS.total);
    expect(t.characters).toHaveLength(3);
  });

  it('chaque personnage reçoit une explication lisible', () => {
    const t = scoreTeam(ctx(['luffy', 'zoro'], ['luffy', 'sanji', 'kawamatsu']));
    for (const c of t.characters) {
      expect(c.breakdown.length).toBeGreaterThan(0);
      for (const ligne of c.breakdown) expect(ligne.trim()).not.toBe('');
    }
  });

  it('le v5 rend toujours ses anciens résultats', () => {
    // Le v6 ne doit rien changer aux chapitres déjà publiés.
    const c = ctx(['luffy', 'zoro'], ['usopp']);
    const ancien = v5.scoreCharacter(perso('usopp'), c);
    expect(ancien.total).toBeGreaterThan(0);
    expect(v5.SCORING_VERSION).toBe('v5.0.0');
  });
});
