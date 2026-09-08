import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * Configuration des tests.
 *
 * Elle n'existait pas : vitest tournait sur ses réglages par défaut, ce qui
 * suffisait tant que les tests ne portaient que sur le domaine — des modules
 * qui s'importent entre eux par chemin relatif.
 *
 * Le jour où l'on veut tester un composant, cela ne suffit plus : les
 * composants s'importent avec l'alias `@/`, que Next résout par `tsconfig` et
 * que vitest ignore. L'alias est donc déclaré ici, à l'identique.
 */
export default defineConfig({
  // Les composants sont écrits en JSX sans importer React : c'est la
  // transformation automatique de Next. Vitest ne la fait pas par défaut, et
  // le JSX compilé appelle alors un `React` qui n'existe pas.
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  /*
   * Couverture.
   *
   * L'outil manquait entièrement : six cent dix-huit tests passaient sans que
   * personne ne sache ce qu'ils touchaient. Un chiffre absent se lit
   * facilement comme « c'est couvert ».
   *
   * ## Ce qui est mesuré, et pourquoi pas tout
   *
   * Seul `src/domain` entre dans le calcul. C'est le code de **décision** —
   * score, raretés, économie, cérémonies, échéances — celui qu'un test peut
   * exercer entièrement, sans base ni réseau, et celui dont une erreur coûte
   * le plus cher.
   *
   * `src/lib` en est exclu : ces modules ne font qu'un aller-retour vers
   * Supabase, et les tester sans base reviendrait à tester des simulacres —
   * beaucoup de lignes vertes qui ne prouvent rien. Ils se vérifient par des
   * sondes réelles contre la base, pas par de la couverture.
   *
   * ## Les seuils
   *
   * Ils sont posés **au niveau atteint aujourd'hui**, pas à un objectif rond.
   * Un seuil qu'on n'atteint pas se désactive au premier échec ; un seuil
   * calé sur l'existant transforme chaque régression en échec de build, ce
   * qui est le seul usage utile d'un seuil.
   */
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/domain/**/*.ts'],
      exclude: ['**/*.test.ts', 'src/domain/**/types.ts'],
      reporter: ['text-summary', 'json-summary'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 80,
      },
    },
  },
});
