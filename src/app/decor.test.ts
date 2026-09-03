import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ISLANDS, islandOf, type IslandId } from '../domain/islands';

/**
 * Chaque île habitée doit avoir une atmosphère.
 *
 * ## La faute que ce fichier attrape
 *
 * Les ambiances (`.isl-fx`) et les jeux de lumière (`.isl-lux`) sont déclarés
 * en CSS, île par île, dans `globals.css`. Le code, lui, ne les connaît pas :
 * il pose une classe et un attribut `data-island`, et laisse la feuille de
 * style décider du reste.
 *
 * C'est la bonne architecture — mais elle échoue **en silence**. Quand une
 * route a été déplacée sur Dressrosa, personne n'a remarqué que Dressrosa
 * n'avait aucune règle `.isl-fx` : il n'y a ni erreur, ni avertissement, ni
 * classe manquante. La page s'affiche, simplement rien n'y bouge. Le défaut a
 * survécu plusieurs semaines, sur la page des paramètres, et il a fallu qu'un
 * joueur dise « il n'y a rien qui bouge » pour qu'on le trouve.
 *
 * Le port avait exactement le même trou.
 *
 * ## Pourquoi lire la feuille de style
 *
 * Parce que la faute vit là et nulle part ailleurs. Aucune fonction ne peut la
 * révéler : `islandOf('/parametres')` renvoyait `dressrosa`, ce qui était juste.
 * Le lien manquant était entre cette valeur et un sélecteur CSS, et le seul
 * moyen de le vérifier est de regarder les deux.
 */

const CSS = readFileSync('src/app/globals.css', 'utf8');

/** Les îles réellement atteignables par une route du produit. */
const ROUTES = [
  '/',
  '/classement',
  '/collection',
  '/market',
  '/boutique',
  '/profil',
  '/parametres',
  '/admin',
  // N'est dans aucune table : c'est le repli, celui des pages d'authentification.
  '/login',
] as const;

const HABITEES: IslandId[] = [...new Set(ROUTES.map((r) => islandOf(r)))];

function declare(propriete: string, ile: IslandId): boolean {
  return CSS.includes(`[data-island='${ile}'] .${propriete}`);
}

describe('atmosphère des îles', () => {
  it('toute route mène à une île connue', () => {
    for (const ile of HABITEES) {
      expect(ISLANDS[ile], `île « ${ile} » absente du référentiel`).toBeDefined();
    }
    // Le port et le QG compris : neuf routes, et pas une qui retombe sur rien.
    expect(HABITEES.length).toBeGreaterThanOrEqual(8);
  });

  it.each(HABITEES)('%s a des jeux de lumière', (ile) => {
    expect(
      declare('isl-lux', ile),
      `aucune teinte « .isl-lux » pour ${ile} : la page garderait la lumière ` +
        'du port, qui est celle de l’aube — au fond de la mer comme en plein ' +
        'désert.',
    ).toBe(true);
  });

  it.each(HABITEES)('%s a une ambiance', (ile) => {
    // Le QG est la seule exception, et elle est voulue : on doit voir qu'on a
    // quitté le jeu. Il garde en revanche ses jeux de lumière, testés ci-dessus.
    if (ile === 'hq') return;

    expect(
      declare('isl-fx', ile),
      `aucune ambiance « .isl-fx » pour ${ile} : rien ne bougerait sur cette ` +
        'page hormis les nuages.',
    ).toBe(true);
  });

  it('chaque ambiance et chaque lumière est animée', () => {
    // Une règle sans animation, c'est un motif figé : le défaut se voit encore
    // moins qu'une règle absente, puisque quelque chose est bien dessiné.
    const anime = CSS.slice(CSS.indexOf('prefers-reduced-motion: no-preference'));

    for (const ile of HABITEES) {
      if (ile !== 'hq') {
        expect(anime, `ambiance de ${ile} jamais animée`).toContain(
          `[data-island='${ile}'] .isl-fx`,
        );
      }
    }

    // Les jeux de lumière sont animés par une règle unique, qui vaut pour
    // toutes les îles : ce sont les teintes qui varient, pas le mouvement.
    expect(CSS).toContain('animation: fx-lux-nappes');
    expect(CSS).toContain('animation: fx-lux-rais');
  });

  it('le mouvement reste conditionné à « animations réduites » (§60)', () => {
    // Chaque `animation:` du décor doit tomber dans un bloc
    // `prefers-reduced-motion: no-preference`. On le vérifie sur les règles
    // ajoutées avec les jeux de lumière, qui sont les plus étendues du site :
    // elles sont sur toutes les pages, y compris les téléphones que le réglage
    // cherche justement à ménager.
    const bloc = CSS.match(
      /@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*?\n\}/g,
    );
    expect(bloc).not.toBeNull();
    expect(bloc!.some((b) => b.includes('fx-lux-nappes'))).toBe(true);
    expect(bloc!.some((b) => b.includes('pavillon-onde'))).toBe(true);
  });
});

/**
 * Le pavillon du mât.
 *
 * Son mouvement repose sur une correspondance entre deux fichiers : le nombre
 * de lés est décidé en TypeScript (`LES`), et l'animation qui les décale est
 * décrite en CSS. Si l'un change sans l'autre, l'onde se casse — soit des lés
 * sans animation, soit des délais qui ne couvrent plus toute l'étoffe.
 */
describe('pavillon pirate', () => {
  const TSX = readFileSync('src/components/HarborScene.tsx', 'utf8');

  it('les lés sont découpés et animés', () => {
    expect(TSX).toMatch(/const LES = \d+;/);
    expect(TSX).toContain('harbor__flagLe');
    expect(CSS).toContain('@keyframes pavillon-onde');
    expect(CSS).toContain('@keyframes pavillon-pli');
  });

  it('le décalage de phase est proportionnel au rang du lé', () => {
    // Sans `--i`, les douze lés montent et descendent ensemble : on obtient un
    // panneau qui monte, pas une étoffe qui claque.
    expect(TSX).toContain("'--i': i");
    expect(CSS).toContain('calc(var(--i) * -0.085s)');
  });

  it('l’amplitude part de zéro au guindant', () => {
    // Le premier lé est cousu sur la drisse : s'il bouge, le drapeau se détache
    // visiblement du mât.
    const LES = Number(TSX.match(/const LES = (\d+);/)![1]);
    const amplitude = (i: number) => (i / (LES - 1)) ** 1.4 * 5.5;

    expect(amplitude(0)).toBe(0);
    expect(amplitude(LES - 1)).toBeCloseTo(5.5, 5);
    // Croissante : l'étoffe est de plus en plus libre à mesure qu'on s'éloigne.
    for (let i = 1; i < LES; i += 1) {
      expect(amplitude(i)).toBeGreaterThan(amplitude(i - 1));
    }
  });
});
