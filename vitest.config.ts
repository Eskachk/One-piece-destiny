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
});
