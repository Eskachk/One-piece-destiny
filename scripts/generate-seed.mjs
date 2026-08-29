/**
 * Régénère la migration de seed à partir du référentiel TypeScript.
 *
 *   node --experimental-strip-types scripts/generate-seed.mjs
 *
 * Garder `src/data/characters.ts` comme source unique évite que le code et la
 * base divergent silencieusement.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const { CHARACTERS } = await import(
  pathToFileURL(path.join(root, 'src/data/characters.ts')).href
);

const quote = (value) => `'${String(value).replace(/'/g, "''")}'`;
const array = (values) => `ARRAY[${values.map(quote).join(',')}]::text[]`;

const characterRows = CHARACTERS.map(
  (c) =>
    '  (' +
    [
      quote(c.id),
      quote(c.name),
      quote(c.rarity),
      array(c.affiliations),
      array(c.abilities),
      quote(c.presenceExpectation),
    ].join(', ') +
    ')',
).join(',\n');

const relationRows = CHARACTERS.flatMap((c) =>
  c.relations.map(
    (r) => '  (' + [quote(c.id), quote(r.to), quote(r.kind)].join(', ') + ')',
  ),
).join(',\n');

const sql = [
  '-- Referentiel de personnages.',
  '-- GENERE — ne pas editer a la main.',
  '-- Source : src/data/characters.ts',
  '-- Regenerer : node --experimental-strip-types scripts/generate-seed.mjs',
  '--',
  '-- Re-applicable : les personnages sont mis a jour, jamais supprimes — des',
  '-- inventaires, des equipages et des annonces du Market les referencent.',
  '-- Les relations, elles, sont remplacees en bloc : ce sont des donnees',
  '-- derivees, que rien d autre ne reference.',
  '',
  'insert into characters (id, name, rarity, affiliations, abilities, presence_expectation) values',
  characterRows,
  'on conflict (id) do update set',
  '  name = excluded.name,',
  '  rarity = excluded.rarity,',
  '  affiliations = excluded.affiliations,',
  '  abilities = excluded.abilities,',
  '  presence_expectation = excluded.presence_expectation;',
  '',
  'delete from character_relations;',
  '',
  'insert into character_relations (from_id, to_id, kind) values',
  relationRows,
  'on conflict do nothing;',
  '',
].join('\n');

const target = path.join(root, 'supabase/migrations/0002_seed_characters.sql');
fs.writeFileSync(target, sql);

const relationCount = CHARACTERS.reduce((n, c) => n + c.relations.length, 0);
console.log(
  `${path.relative(root, target)} : ${CHARACTERS.length} personnages, ${relationCount} relations`,
);
