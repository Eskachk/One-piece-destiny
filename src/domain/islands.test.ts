import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { islandOf, ISLANDS, type IslandId } from './islands';

/**
 * Le décor dessiné doit être celui de la route. Rien de plus, mais ce « rien
 * de plus » a été tenu en échec pendant plusieurs jours.
 *
 * ## Ce qui s'est passé
 *
 * Il existait **deux** sources de vérité. `islandOf()` décidait de la palette
 * de ciel et de l'ambiance, posées sur la coquille depuis le chemin. Et chaque
 * page passait en plus un `island="…"` écrit en dur à `HarborScene`, qui
 * décidait, lui, de la silhouette.
 *
 * Le jour où la table des routes a changé — Elbaf sur l'accueil, Alabasta sur
 * le classement — les littéraux des pages sont restés à leur ancienne valeur.
 * Résultat : l'accueil dessinait le palais d'Alabasta sous le ciel d'Elbaf,
 * avec la brume et les feuilles d'Elbaf. Le classement dessinait le colisée de
 * Dressrosa sous le ciel d'Alabasta. Personne ne l'a vu venir parce que rien
 * ne reliait les deux endroits.
 *
 * Le commentaire de `ROUTES` annonçait exactement ce piège — « deux tables
 * auraient fini par diverger, et l'on aurait vu Wano avec le ciel de
 * Dressrosa » — sans que rien ne l'empêche.
 *
 * ## Ce que ce test garantit
 *
 * Les pages ne portent plus de littéral : elles appellent `islandOf()` avec
 * leur propre chemin. Ce test lit leur source et le vérifie. Un test qui lit du
 * source est inhabituel, mais c'est le seul moyen d'attraper cette faute-là :
 * elle ne vit pas dans une fonction, elle vit dans un attribut JSX, et aucune
 * exécution de `islandOf` ne peut la révéler.
 */

/** Pages qui rendent une scène, et le chemin sous lequel elles sont servies. */
const PAGES: readonly (readonly [string, string])[] = [
  ['src/app/page.tsx', '/'],
  ['src/app/classement/page.tsx', '/classement'],
  ['src/app/collection/page.tsx', '/collection'],
  ['src/app/market/page.tsx', '/market'],
  ['src/app/boutique/page.tsx', '/boutique'],
  ['src/app/profil/page.tsx', '/profil'],
  ['src/app/parametres/page.tsx', '/parametres'],
];

describe('île d’une route', () => {
  it('attribue à chaque onglet l’île attendue', () => {
    expect(islandOf('/')).toBe('elbaf');
    expect(islandOf('/classement')).toBe('alabasta');
    expect(islandOf('/collection')).toBe('fishman');
    expect(islandOf('/market')).toBe('wano');
    expect(islandOf('/boutique')).toBe('logue');
    expect(islandOf('/profil')).toBe('sabaody');
    expect(islandOf('/parametres')).toBe('dressrosa');
    expect(islandOf('/admin')).toBe('hq');
  });

  it('retombe sur le port pour tout chemin sans île', () => {
    expect(islandOf('/login')).toBe('harbor');
    expect(islandOf('/register')).toBe('harbor');
    expect(islandOf('/verify')).toBe('harbor');
  });

  it('tient compte des sous-chemins', () => {
    expect(islandOf('/classement/2026')).toBe('alabasta');
    expect(islandOf('/admin/mfa')).toBe('hq');
  });

  it('nomme toutes les îles qu’elle attribue', () => {
    const attribuees = PAGES.map(([, route]) => islandOf(route));
    for (const id of attribuees) {
      expect(ISLANDS[id as IslandId]?.name).toBeTruthy();
    }
  });
});

describe('les pages ne décident pas de leur île', () => {
  it.each(PAGES)('%s passe islandOf(%s), jamais un littéral', (fichier, route) => {
    const source = readFileSync(fichier, 'utf8');

    // La faute exacte qui a produit le défaut : un nom d'île écrit en dur.
    expect(source).not.toMatch(/island="[a-z]+"/);

    // Et chaque scène est bien nourrie par la table, avec le chemin de la page.
    const scenes = source.match(/<HarborScene[^>]*island=\{[^}]*\}/g) ?? [];
    expect(scenes.length).toBeGreaterThan(0);
    for (const scene of scenes) {
      expect(scene).toContain(`islandOf('${route}')`);
    }
  });
});
