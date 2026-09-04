/**
 * Importe le référentiel de personnages depuis api-onepiece.com.
 *
 *   node scripts/import-characters.mjs
 *
 * ⚠️ **Aucune image n'est importée** (cahier §122). L'API ne sert que des
 * données factuelles — nom, équipage, fruit, prime, poste — c'est-à-dire des
 * faits sur l'œuvre, pas de la reproduction d'œuvre. Rien de ce qui est écrit
 * ici ne stocke ni ne sert de planche, de visuel ou d'illustration.
 *
 * Deux principes gouvernent la conversion :
 *
 *   1. **les 24 personnages d'origine sont préservés tels quels.** Leurs
 *      identifiants sont référencés par les inventaires, les équipages et les
 *      annonces du Market déjà en base : les changer casserait des données
 *      réelles. Leurs relations narratives, écrites à la main, sont aussi de
 *      meilleure qualité que tout ce qu'on peut déduire (§9.2) ;
 *   2. **la rareté est dérivée, jamais inventée au hasard.** Elle vient de la
 *      prime et du statut de l'équipage — donc d'un fait, reproductible et
 *      explicable. La rareté ne touche jamais le score (§25).
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { derivedAbilities } from './enrich-from-api.mjs';

const root = path.resolve(import.meta.dirname, '..');
const SOURCE = 'https://api.api-onepiece.com/v2/characters/en';

/**
 * Noms de l'API désignant un personnage déjà écrit à la main.
 *
 * L'API distingue « Sanji » de « Vinsmoke Sanji » et « Eustass Kidd » de
 * « Eustass Kid » : ce sont les mêmes personnes. Sans cette table, l'import
 * créait des doublons — et « Sanji 5 » devenait ambigu à la saisie des
 * apparitions, cassant le travail hebdomadaire de l'administrateur.
 *
 * Clé : nom de l'API normalisé. Valeur : identifiant existant.
 */
const ALIASES = new Map([
  ['sanji', 'sanji'],
  ['eustass kidd', 'kid'],
  ['sakazuki akainu', 'akainu'],
]);

/** Nombre maximal de relations générées par personnage. */
const MAX_RELATIONS = 6;

/** Nombre maximal de coéquipiers retenus pour une affiliation d'équipage. */
const MIN_CREW_FOR_AFFILIATION = 2;

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

/** Normalise un nom pour comparer « Monkey D Luffy » et « Monkey D. Luffy ». */
function normalise(name) {
  return String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slugify(name) {
  return normalise(name).replace(/\s+/g, '-').slice(0, 48);
}

/** Prime en nombre. Les valeurs de l'API sont du texte pointé (« 3.000.000.000 »). */
function bountyOf(raw) {
  if (!raw) return 0;
  const digits = String(raw).replace(/[^0-9]/g, '');
  if (!digits) return 0;
  const value = Number(digits);
  return Number.isFinite(value) ? value : 0;
}

/**
 * Table de notoriété : combien on voit chaque personnage dans l'œuvre.
 *
 * Lue depuis le même fichier que `scripts/rerank-rarity.mjs`, pour qu’un
 * import ne réintroduise pas l’ancienne règle. Les deux scripts doivent
 * classer un personnage exactement pareil, sans quoi le référentiel
 * changerait de rareté selon la commande lancée en dernier.
 */
const PROMINENCE = (() => {
  const table = JSON.parse(fs.readFileSync('src/data/prominence.json', 'utf8'));
  const tiers = new Map();
  for (const rarity of ['MYTHIC', 'LEGENDARY', 'EPIC']) {
    for (const id of table[rarity]) tiers.set(id, rarity);
  }
  return tiers;
})();

const NAMED_ROLE =
  /captain|capitaine|admiral|amiral|lieutenant|colonel|officer|king|queen|prince|princess|sovereign|doctor|samurai|shichibukai|vice-admiral|sub-admiral|rear admiral/i;

/**
 * Rareté = notoriété, jamais prime.
 *
 * La prime produisait une collection absurde : soixante-quinze enfants
 * Charlotte classés Épiques à égalité avec Nami, parce qu’ils portent une
 * prime. Le joueur, lui, mesure la valeur d’une carte au nombre de fois
 * qu’il a vu le personnage.
 *
 * Hors table : RARE si le personnage porte un grade ou un rôle nommé — il
 * existe alors en tant qu’individu — COMMON s’il fait partie du décor.
 */
function rarityOf(id, abilities) {
  const known = PROMINENCE.get(id);
  if (known) return known;
  return abilities.some((entry) => NAMED_ROLE.test(entry)) ? "RARE" : "COMMON";
}

/**
 * Attendu d'apparition (§12).
 *
 * Approximation assumée : la notoriété — prime, poste de capitaine, équipage
 * d'Empereur — corrèle avec la présence à l'écran. Le cahier prévoit que cette
 * valeur soit révisée à la main ; l'import ne fait que poser un point de
 * départ défendable plutôt qu'une valeur arbitraire.
 */
function expectationOf(character) {
  const bounty = bountyOf(character.bounty);
  const captain = /captain|capitaine/i.test(character.job ?? '');

  if (bounty >= 1_000_000_000 || (captain && bounty >= 100_000_000)) return 'HIGH';
  if (bounty >= 50_000_000 || character.crew?.is_yonko) return 'MEDIUM';
  return 'LOW';
}

/** Affiliations : équipage et type de fruit. Rien d'inventé. */
function affiliationsOf(character, crewSizes) {
  const affiliations = [];

  const crewName = character.crew?.name?.trim();
  // Un « équipage » d'une seule personne n'est pas une affiliation utile : il
  // ne peut produire aucune synergie.
  if (crewName && (crewSizes.get(crewName) ?? 0) >= MIN_CREW_FOR_AFFILIATION) {
    affiliations.push(crewName);
  }

  const fruitType = character.fruit?.type?.trim();
  if (fruitType) affiliations.push(fruitType);

  return affiliations;
}

/**
 * Capacités : des faits de l'API. Jamais de texte descriptif de l'œuvre.
 *
 * L'extraction est **partagée** avec `enrich-from-api.mjs`, et c'est
 * délibéré : les deux scripts écrivent dans le même champ, et deux règles
 * différentes feraient dépendre le contenu d'une carte de la commande lancée
 * en dernier. Cette fonction ne lisait que le fruit et le poste ; le poste
 * était pris en bloc — « Resident / Shandia tribe (chief) » comptait pour une
 * capacité — et `crew.is_yonko`, `bounty` et `size` étaient jetés.
 */
function abilitiesOf(character) {
  return derivedAbilities(character);
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

async function main() {
  process.stdout.write(`Récupération de ${SOURCE}\n`);
  const response = await fetch(SOURCE);
  if (!response.ok) throw new Error(`API : HTTP ${response.status}`);
  const raw = await response.json();
  process.stdout.write(`  ${raw.length} personnages reçus\n`);

  // --- Référentiel existant, à préserver -----------------------------------
  // On lit le fichier **curated**, jamais le résultat de l'import : sinon un
  // second passage prendrait ses propres sorties pour de la saisie manuelle et
  // ne corrigerait plus rien.
  const { CURATED_CHARACTERS: existing } = await import(
    pathToFileURL(path.join(root, 'src/data/characters.curated.ts')).href
  );
  const existingByName = new Map(existing.map((c) => [normalise(c.name), c]));
  const usedIds = new Set(existing.map((c) => c.id));
  process.stdout.write(`  ${existing.length} personnages existants préservés\n`);

  // --- Tailles d'équipage --------------------------------------------------
  const crewSizes = new Map();
  for (const character of raw) {
    const name = character.crew?.name?.trim();
    if (name) crewSizes.set(name, (crewSizes.get(name) ?? 0) + 1);
  }

  // --- Conversion ----------------------------------------------------------
  const imported = [];
  const idByApiId = new Map();

  for (const character of raw) {
    if (!character.name) continue;

    const key = normalise(character.name);
    const aliasId = ALIASES.get(key);
    const known = aliasId
      ? existing.find((c) => c.id === aliasId)
      : existingByName.get(key);

    if (known) {
      // Déjà présent : on garde l'entrée d'origine, relations comprises.
      idByApiId.set(character.id, known.id);
      continue;
    }

    let id = slugify(character.name);
    if (!id) continue;
    // Deux personnages peuvent porter le même nom normalisé.
    let suffix = 2;
    while (usedIds.has(id)) id = `${slugify(character.name)}-${suffix++}`;
    usedIds.add(id);
    idByApiId.set(character.id, id);

    const abilities = abilitiesOf(character);

    imported.push({
      id,
      name: character.name.trim(),
      rarity: rarityOf(id, abilities),
      affiliations: affiliationsOf(character, crewSizes),
      abilities,
      presenceExpectation: expectationOf(character),
      // Rempli au second passage : il faut tous les identifiants d'abord.
      relations: [],
      _crew: character.crew?.name?.trim() ?? null,
      _bounty: bountyOf(character.bounty),
    });
  }

  // --- Relations d'équipage ------------------------------------------------
  //
  // Seul lien déductible d'une donnée factuelle. Les liens de mentorat, de
  // rivalité ou de famille demandent une lecture de l'œuvre : ils restent
  // écrits à la main, sur les personnages d'origine.
  const byCrew = new Map();
  for (const character of imported) {
    if (!character._crew) continue;
    const list = byCrew.get(character._crew) ?? [];
    list.push(character);
    byCrew.set(character._crew, list);
  }

  for (const [, members] of byCrew) {
    if (members.length < 2) continue;
    // Les coéquipiers les plus notables d'abord : dans un équipage de
    // cinquante, relier tout le monde à tout le monde n'aurait aucun sens.
    const ranked = [...members].sort((a, b) => b._bounty - a._bounty);

    for (const character of members) {
      character.relations = ranked
        .filter((other) => other.id !== character.id)
        .slice(0, MAX_RELATIONS)
        .map((other) => ({ to: other.id, kind: 'CREW' }));
    }
  }

  // Une seule règle de rareté pour tout le monde, saisie manuelle comprise :
  // laisser les vingt-quatre entrées écrites à la main garder la leur ferait
  // cohabiter deux classements dans le même fichier.
  const all = [
    ...existing.map((c) => ({ ...c, rarity: rarityOf(c.id, c.abilities) })),
    ...imported.map(({ _crew, _bounty, ...rest }) => rest),
  ];

  // --- Contrôles -----------------------------------------------------------
  const ids = new Set();
  for (const character of all) {
    if (ids.has(character.id)) throw new Error(`Identifiant en double : ${character.id}`);
    ids.add(character.id);
  }
  for (const character of all) {
    for (const relation of character.relations) {
      if (!ids.has(relation.to)) {
        throw new Error(`Relation orpheline : ${character.id} → ${relation.to}`);
      }
    }
  }

  const distribution = {};
  for (const character of all) {
    distribution[character.rarity] = (distribution[character.rarity] ?? 0) + 1;
  }

  // --- Écriture ------------------------------------------------------------
  const quote = (value) => `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  const list = (values) => `[${values.map(quote).join(', ')}]`;

  const body = all
    .map(
      (c) => `  {
    id: ${quote(c.id)},
    name: ${quote(c.name)},
    rarity: '${c.rarity}',
    affiliations: ${list(c.affiliations)},
    relations: [${c.relations
      .map((r) => `{ to: ${quote(r.to)}, kind: '${r.kind}' }`)
      .join(', ')}],
    abilities: ${list(c.abilities)},
    presenceExpectation: '${c.presenceExpectation}',
  },`,
    )
    .join('\n');

  const header = `/**
 * Référentiel de personnages.
 *
 * Les ${existing.length} premières entrées sont saisies à la main : leurs liens narratifs
 * (mentorat, rivalité, famille) demandent une lecture de l'œuvre et ne se
 * déduisent d'aucune donnée. Les suivantes sont importées depuis
 * api-onepiece.com par \`scripts/import-characters.mjs\`.
 *
 * ⚠️ **Aucun visuel, aucune planche, aucune illustration** (cahier §122) : ce
 * fichier ne contient que du texte factuel — noms, équipages, fruits, postes.
 *
 * \`rarity\` est dérivée de la notoriété du personnage — de sa présence dans
 * l'œuvre — via src/data/prominence.json. Elle sert
 * uniquement la collection, **jamais le score** (§25) : le moteur de scoring
 * ne lit pas ce champ.
 *
 * Régénérer :  node scripts/import-characters.mjs
 */

import type { Character } from '../domain/types';
import { isCanon } from './non-canon';

const ALL_CHARACTERS: Character[] = [
${body}
];

/**
 * Personnages jouables : le manga seulement.
 *
 * Le tableau ci-dessus est le référentiel brut de l'import, films et
 * épisodes hors-série compris. \`CHARACTERS\` est ce que le jeu voit — et le
 * jeu se joue sur le chapitre hebdomadaire : un personnage qui n'apparaît que
 * dans un film ne peut jamais y figurer, donc jamais rapporter un point.
 *
 * Le filtrage est fait **ici, à l'export**, plutôt que dans l'import : la
 * liste des exclusions se relit et se corrige dans \`non-canon.ts\`, sans avoir
 * à régénérer 7 000 lignes pour changer d'avis sur un personnage.
 */
export const CHARACTERS: Character[] = ALL_CHARACTERS.filter((character) =>
  isCanon(character.id),
).map((character) => ({
  ...character,
  // Les liens vers un personnage retiré sont coupés. Ils ne fausseraient rien
  // — une synergie ne compte que si l'autre apparaît dans le chapitre, ce qui
  // n'arrivera jamais — mais ils resteraient affichés sur la fiche, à promettre
  // un bonus impossible.
  relations: character.relations.filter((relation) => isCanon(relation.to)),
}));

export const CHARACTER_INDEX: Map<string, Character> = new Map(
  CHARACTERS.map((character) => [character.id, character]),
);
`;

  fs.writeFileSync(path.join(root, 'src/data/characters.ts'), header, 'utf8');

  process.stdout.write(`\nÉcrit : ${all.length} personnages\n`);
  for (const [rarity, count] of Object.entries(distribution).sort()) {
    process.stdout.write(`  ${rarity.padEnd(10)} ${count}\n`);
  }
}

main().catch((error) => {
  process.stderr.write(`Échec : ${error.message}\n`);
  process.exit(1);
});
