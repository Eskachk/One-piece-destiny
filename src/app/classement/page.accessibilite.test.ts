import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Garde-fou : les ligues privées doivent rester joignables.
 *
 * La page du classement sort par deux retours anticipés — aucun chapitre, et
 * verrou anti-spoiler — avant son rendu principal. Une première version ne
 * rendait le panneau que dans ce dernier : tant qu'aucun chapitre n'était
 * publié, la fonctionnalité était **inaccessible**, c'est-à-dire précisément
 * pendant la semaine où l'on crée sa ligue.
 *
 * Le test lit la source. C'est grossier, et c'est assumé : le défaut n'était
 * pas dans une fonction, il était dans la forme du composant, et rien de plus
 * fin ne l'aurait attrapé. Il ne vérifie qu'une chose, celle qui a manqué :
 * chaque `return` de la page rend le panneau.
 */
describe('page du classement', () => {
  it('rend le panneau des ligues dans chacune de ses branches', () => {
    const source = readFileSync(join(__dirname, 'page.tsx'), 'utf8');

    // Une branche = une scène rendue. Compter les `return` serait fragile ;
    // ce marqueur-là est la racine visuelle de chaque sortie de la page.
    const retours = source.split('<HarborScene variant="page"').length - 1;
    const rendus = source.split('{panneauLigues}').length - 1;

    expect(retours).toBeGreaterThanOrEqual(3);
    expect(rendus).toBe(retours);
  });

  it('charge les ligues avant le premier retour anticipé', () => {
    // Chargées après, elles ne pourraient pas être rendues avant.
    const source = readFileSync(join(__dirname, 'page.tsx'), 'utf8');
    expect(source.indexOf('const ligues =')).toBeLessThan(
      source.indexOf('  return ('),
    );
  });
});
