import type { Character } from '../domain/types';

/**
 * Personnages absents de l'API, écrits à la main.
 *
 * ## Le manque était très surestimé
 *
 * Une note de travail annonçait « soixante-neuf noms absents du référentiel ».
 * La vérification, nom par nom et graphie par graphie, en trouve **huit**. Les
 * autres étaient là depuis le début, sous une orthographe ou sous un état
 * civil que la recherche ne rapprochait pas du nom français :
 *
 *   Enel → `Ener`            Wyper → `Wiper`         Gan Fall → `Gan Forr`
 *   Kohza → `Koza`           Bon Clay → `Bentham`    Daz Bones → `Das Bones`
 *   Bell-mère → `Belmer`     Brogy → `Broggy`        Dalton → `Dolton`
 *   Ohm → `Om`               Vivi → `Nefertari Vivi`
 *
 * Les cinq agents numérotés de Baroque Works étaient les mieux cachés : l'API
 * les sert sous leur **état civil**, jamais sous leur nom de code.
 *
 *   Mr. 5 → `Gemme`   Miss Valentine → `Mikita`   Mr. 4 → `Babe`
 *   Miss Merry Christmas → `Drophy`               Miss Goldenweek → `Marianne`
 *
 * Cette liste-là est la vraie leçon du travail : **chercher un personnage par
 * le nom qu'on lui donne en français ne prouve rien.** Le test qui accompagne
 * ce fichier vérifie qu'aucune entrée écrite ici ne double une entrée
 * importée — deux cartes pour la même personne donneraient deux lignes à la
 * saisie des apparitions et un comptage hebdomadaire faux.
 *
 * ## La règle d'écriture
 *
 * Rien que des faits établis de l'œuvre — un camp, un poste, une espèce, une
 * arme. Aucune description narrative, aucun visuel (§122). Les capacités ne
 * servent que l'affichage et les synergies, jamais le score (§25).
 *
 * Les relations restent rares et sûres : seuls les liens qu'un lecteur
 * nommerait sans hésiter. Un lien inventé se voit sur la fiche et promet une
 * synergie qui n'aura pas lieu.
 */
export const MISSING_CHARACTERS: Character[] = [
  // --- Ohara ----------------------------------------------------------------
  {
    id: 'jaguar-d-saul',
    name: 'Jaguar D. Saul',
    rarity: 'EPIC',
    affiliations: ['Elbaf', 'Marine'],
    relations: [{ to: 'robin', kind: 'MENTOR' }],
    abilities: ['Géant', 'Colosse', 'Vice-Admiral', 'Marine'],
    presenceExpectation: 'LOW',
  },

  // --- Chevaliers de Dieu ---------------------------------------------------
  //
  // Le corps le plus haut placé du Gouvernement Mondial, et le référentiel
  // n'en portait qu'un membre — Figarland Shamrock. Ils sont en activité dans
  // l'arc en cours : de tout ce fichier, ce sont ceux qui ont la plus forte
  // chance de paraître dans un chapitre, d'où l'attendu relevé à MEDIUM.
  {
    id: 'figarland-garling',
    name: 'Figarland Garling',
    rarity: 'EPIC',
    affiliations: ['Chevaliers de Dieu', 'Gouvernement Mondial', 'Dragons Célestes'],
    relations: [{ to: 'figarland-shamrock', kind: 'FAMILY' }],
    abilities: [
      'Chevalier de Dieu',
      'Dragon Céleste',
      'Épéiste',
      'Haki armement',
      'Capitaine',
    ],
    presenceExpectation: 'MEDIUM',
  },
  {
    id: 'gunko',
    name: 'Gunko',
    rarity: 'EPIC',
    affiliations: ['Chevaliers de Dieu', 'Gouvernement Mondial', 'Dragons Célestes'],
    relations: [{ to: 'figarland-garling', kind: 'FACTION' }],
    abilities: ['Chevalier de Dieu', 'Dragon Céleste', 'Fruit du démon', 'Tireur'],
    presenceExpectation: 'MEDIUM',
  },
  {
    id: 'killingham',
    name: 'Killingham',
    rarity: 'EPIC',
    affiliations: ['Chevaliers de Dieu', 'Gouvernement Mondial', 'Dragons Célestes'],
    relations: [{ to: 'figarland-garling', kind: 'FACTION' }],
    abilities: ['Chevalier de Dieu', 'Dragon Céleste', 'Fruit du démon', 'Colosse'],
    presenceExpectation: 'MEDIUM',
  },
  {
    /*
     * ⚠️ **Le seul nom de ce fichier dont la graphie complète mérite d'être
     * confirmée sur la planche.** Le personnage existe et le poste est certain
     * — Chevalier de Dieu en activité — mais le prénom d'usage se lit aussi
     * « Sommers » seul selon les traductions. Le corriger ne coûte que ce
     * champ : rien d'autre ne dépend du libellé, l'identifiant est stable.
     */
    id: 'shepherd-sommers',
    name: 'Shepherd Sommers',
    rarity: 'EPIC',
    affiliations: ['Chevaliers de Dieu', 'Gouvernement Mondial', 'Dragons Célestes'],
    relations: [{ to: 'figarland-garling', kind: 'FACTION' }],
    abilities: ['Chevalier de Dieu', 'Dragon Céleste', 'Fruit du démon'],
    presenceExpectation: 'MEDIUM',
  },

  // --- Équipage d'Arlong ----------------------------------------------------
  //
  // Kuroobi était là, ses deux camarades d'officier non.
  {
    id: 'hatchan',
    name: 'Hatchan',
    rarity: 'EPIC',
    affiliations: ['Équipage d’Arlong'],
    relations: [
      { to: 'arlong', kind: 'CREW' },
      { to: 'kuroobi', kind: 'CREW' },
    ],
    abilities: ['Homme-poisson', 'Épéiste', 'Cuisinier', 'Officer'],
    presenceExpectation: 'LOW',
  },
  {
    id: 'chew',
    name: 'Chew',
    rarity: 'RARE',
    affiliations: ['Équipage d’Arlong'],
    relations: [
      { to: 'arlong', kind: 'CREW' },
      { to: 'kuroobi', kind: 'CREW' },
    ],
    abilities: ['Homme-poisson', 'Officer', 'Tireur'],
    presenceExpectation: 'LOW',
  },

  // --- Chasseurs de primes d'East Blue --------------------------------------
  //
  // Yosaku était au référentiel, Johnny non — alors qu'ils ne se séparent
  // jamais.
  {
    id: 'johnny',
    name: 'Johnny',
    rarity: 'RARE',
    affiliations: ['Chasseurs de primes'],
    relations: [
      { to: 'yosaku', kind: 'FACTION' },
      { to: 'zoro', kind: 'FACTION' },
    ],
    abilities: ['Épéiste', 'Chasseur de primes'],
    presenceExpectation: 'LOW',
  },
];
