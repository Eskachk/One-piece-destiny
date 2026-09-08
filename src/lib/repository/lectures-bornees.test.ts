import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Garde-fou : aucune lecture ne doit être laissée sans borne.
 *
 * ## Le défaut que ce test empêche de revenir
 *
 * PostgREST plafonne une réponse à mille lignes (`max-rows`). Une requête sans
 * `.limit`, `.range`, `.single` ni `count` ne renvoie donc pas « tout » : elle
 * renvoie le début, **sans erreur et sans avertissement**. Rien, dans le code
 * appelant, ne distingue une lecture complète d'une lecture tronquée.
 *
 * C'est la pire forme de bogue d'échelle — invisible tant que le jeu est
 * petit, déclenché le jour où il marche — et il s'est déjà produit ici : la
 * publication cessait de noter les joueurs au-delà du millier.
 *
 * ## Pourquoi un test sur la source
 *
 * Le défaut ne vit pas dans une fonction, il vit dans **l'absence** d'un
 * appel. Aucun test de comportement ne l'attrape sans mille lignes en base,
 * qu'on n'aura pas avant que ce soit trop tard. Lire la source est grossier,
 * et c'est le seul filet qui se déclenche à l'écriture plutôt qu'au succès.
 *
 * ## La liste d'exceptions
 *
 * Chaque entrée porte sa raison. Une lecture n'y entre que si elle est bornée
 * **par nature** — par un identifiant unique, ou par un plafond du domaine —
 * pas parce qu'elle est petite aujourd'hui.
 */

/** Lectures naturellement bornées, et ce qui les borne. */
const BORNEES_PAR_NATURE: Record<string, string> = {
  'src/app/actions/preferences.ts':
    'un compte, désigné par son identifiant',
  'src/app/actions/shop.ts':
    'les intentions de paiement d’un joueur, filtrées par état',
  'src/lib/antiabuse/provenance.ts':
    'la provenance d’une carte : un joueur, une carte',
  'src/lib/antiabuse/review.ts':
    'écran d’administration, borné par un joueur ou par une liste déjà limitée à 50',
  'src/lib/antiabuse/signals.ts':
    'borné par la liste de joueurs que l’appelant a déjà constituée',
  'src/lib/auth/mfa.ts':
    'les codes de secours d’un compte : dix au plus, fixés par le domaine',
  'src/lib/chapter/questions.ts':
    'les réponses d’un joueur à un chapitre : trois au plus (MAX_QUESTIONS)',
  'src/lib/league/repository.ts':
    'les membres d’une ligue : cinquante au plus (MAX_MEMBRES)',
  'src/lib/market/repository.ts':
    'borné par la liste de personnages ou de joueurs passée en argument',
  'src/lib/repository/postgres.ts':
    'un chapitre, un joueur, ou déjà paginé par readAllPages',
};

function fichiersSources(racine: string): string[] {
  const sortie: string[] = [];
  for (const entree of readdirSync(racine)) {
    const chemin = join(racine, entree);
    if (statSync(chemin).isDirectory()) {
      sortie.push(...fichiersSources(chemin));
    } else if (/\.tsx?$/.test(entree) && !entree.includes('.test.')) {
      sortie.push(chemin);
    }
  }
  return sortie;
}

/** Les marqueurs qui prouvent qu'une lecture est bornée. */
const BORNES = ['.limit(', '.range(', '.single(', '.maybeSingle(', 'count:'];

function lecturesSansBorne(source: string): string[] {
  const trouvees: string[] = [];
  // `.from('table')` suivi d'un `.select` : la chaîne s'arrête au `;`.
  const motif = /\.from\(\s*'([a-z_]+)'\s*\)([\s\S]{0,700}?);/g;

  for (const chaine of source.matchAll(motif)) {
    const corps = chaine[2];
    if (!corps.includes('.select(')) continue;
    if (BORNES.some((borne) => corps.includes(borne))) continue;
    trouvees.push(chaine[1]);
  }
  return trouvees;
}

describe('lectures de la base', () => {
  it('sont toutes bornées, ou justifiées comme bornées par nature', () => {
    const racine = join(__dirname, '..', '..');
    const coupables: string[] = [];

    for (const fichier of fichiersSources(racine)) {
      const chemin = relative(join(racine, '..'), fichier).split(sep).join('/');
      if (chemin in BORNEES_PAR_NATURE) continue;

      const tables = lecturesSansBorne(readFileSync(fichier, 'utf8'));
      for (const table of tables) coupables.push(`${chemin} → ${table}`);
    }

    /*
     * Si ce test échoue sur du code que tu viens d'écrire : la lecture
     * grandit-elle avec le nombre de joueurs ? Si oui, `readAllPages`. Si non,
     * ajoute le fichier à `BORNEES_PAR_NATURE` **avec ce qui le borne** — pas
     * « c'est petit », mais l'identifiant ou le plafond qui l'empêche de
     * grandir.
     */
    expect(coupables).toEqual([]);
  });

  it('documente ce qui borne chaque exception', () => {
    // Une exception sans raison redevient un oubli à la première relecture.
    for (const [fichier, raison] of Object.entries(BORNEES_PAR_NATURE)) {
      expect(raison.length, `${fichier} sans justification`).toBeGreaterThan(20);
    }
  });
});
