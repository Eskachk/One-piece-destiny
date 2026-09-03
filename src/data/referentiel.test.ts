import { describe, expect, it } from 'vitest';
import { CHARACTERS } from './characters';
import { isCanon } from './non-canon';

/**
 * Invariants du référentiel de personnages.
 *
 * Ces trois règles ne relèvent d'aucun jugement sur l'œuvre : elles disent
 * seulement que la donnée est cohérente avec elle-même. Chacune a été violée,
 * et chacune faussait le calcul des points de façon invisible.
 */

const JOUABLES = CHARACTERS.filter((c) => isCanon(c.id));
const PAR_ID = new Map(CHARACTERS.map((c) => [c.id, c]));

describe('référentiel des personnages', () => {
  /**
   * ## La faute
   *
   * Le graphe de relations n'était réciproque qu'à 40,5 % : 3 557 arcs
   * déclarés, 1 440 seulement avec un retour. Zoro pointait vers Mihawk sans
   * que Mihawk pointe vers Zoro.
   *
   * Conséquence directe sur le score : la synergie se calcule en parcourant
   * **les relations du personnage choisi**. Un lien à sens unique rapportait
   * donc des points à l'un et rien à l'autre, pour exactement la même
   * situation narrative. C'est ce défaut qui faisait qu'Usopp marquait zéro
   * alors que Luffy était dans le chapitre : le lien Luffy→Usopp n'existait
   * pas.
   *
   * Un lien narratif est symétrique par nature. S'il ne l'est pas dans les
   * données, c'est l'import qui a perdu la moitié de l'information.
   */
  it('toute relation a son retour', () => {
    const boiteuses: string[] = [];

    for (const c of CHARACTERS) {
      for (const r of c.relations) {
        const autre = PAR_ID.get(r.to);
        if (!autre) continue; // les liens pendants ont leur propre test
        if (!autre.relations.some((x) => x.to === c.id)) {
          boiteuses.push(`${c.id} → ${r.to} (${r.kind}) sans retour`);
        }
      }
    }

    expect(
      boiteuses.slice(0, 10),
      `${boiteuses.length} relations à sens unique`,
    ).toEqual([]);
  });

  it('aucune relation ne pointe vers un personnage inexistant', () => {
    const pendantes: string[] = [];
    for (const c of CHARACTERS) {
      for (const r of c.relations) {
        if (!PAR_ID.has(r.to)) pendantes.push(`${c.id} → ${r.to}`);
      }
    }
    expect(pendantes.slice(0, 10)).toEqual([]);
  });

  it('personne n’est en relation avec soi-même', () => {
    const narcisses = CHARACTERS.filter((c) => c.relations.some((r) => r.to === c.id));
    expect(narcisses.map((c) => c.id)).toEqual([]);
  });

  /**
   * ## La faute
   *
   * « Paramecia », « Zoan », « Logia » et « Smile » figuraient parmi les
   * **affiliations** — 149 entrées. Or une affiliation est payée quatre points
   * par allié présent, au même tarif qu'un équipage ou qu'une alliance.
   *
   * Partager un type de fruit du démon avec quatre-vingt-dix autres
   * personnages rapportait donc autant que d'appartenir au même équipage. Et
   * la même information était déjà comptée une seconde fois, en attribut, où
   * elle est pondérée par sa rareté réelle.
   *
   * Un type de fruit n'est pas une appartenance : personne ne se bat aux côtés
   * de quelqu'un parce qu'ils ont mangé la même catégorie de fruit.
   */
  it('les types de fruit ne sont pas des affiliations', () => {
    const TYPES = ['Paramecia', 'Zoan', 'Logia', 'Smile', 'Ancient Zoan', 'Mythical Zoan'];
    const fautifs = CHARACTERS.filter((c) =>
      c.affiliations.some((a) => TYPES.includes(a)),
    );
    expect(fautifs.map((c) => c.id).slice(0, 10)).toEqual([]);
  });

  it('le référentiel jouable garde une taille plausible', () => {
    // Un import raté qui viderait le fichier passerait tous les tests
    // ci-dessus sans en casser un seul.
    expect(JOUABLES.length).toBeGreaterThan(700);
    expect(new Set(JOUABLES.map((c) => c.id)).size).toBe(JOUABLES.length);
  });
});
