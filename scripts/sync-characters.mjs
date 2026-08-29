/**
 * Synchronise le référentiel de personnages vers Supabase.
 *
 *   node --experimental-strip-types scripts/sync-characters.mjs
 *
 * Passe par l'API REST plutôt que par du SQL brut : la migration de seed fait
 * 240 Ko, ce qui est lourd à transporter, et l'upsert par lots est de toute
 * façon la bonne façon de pousser des milliers de lignes.
 *
 * ⚠️ Le script lit `SUPABASE_SERVICE_ROLE_KEY` depuis `.env.local` **et ne
 * l'affiche jamais** — ni en clair, ni tronquée, ni dans un message d'erreur.
 *
 * Les personnages sont mis à jour, **jamais supprimés** : des inventaires, des
 * équipages et des annonces du Market les référencent. Les relations, elles,
 * sont remplacées en bloc — ce sont des données dérivées que rien d'autre ne
 * référence.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = path.resolve(import.meta.dirname, '..');
const BATCH = 200;

function loadEnv() {
  const file = path.join(root, '.env.local');
  if (!fs.existsSync(file)) throw new Error('.env.local introuvable.');

  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) env[match[1]] = match[2];
  }
  return env;
}

async function main() {
  const env = loadEnv();
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    // On nomme la variable manquante, jamais sa valeur.
    throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absente de .env.local.');
  }

  const db = createClient(url, key, { auth: { persistSession: false } });

  const { CHARACTERS } = await import(
    pathToFileURL(path.join(root, 'src/data/characters.ts')).href
  );
  process.stdout.write(`${CHARACTERS.length} personnages à synchroniser\n`);

  // --- Personnages ---------------------------------------------------------
  const rows = CHARACTERS.map((c) => ({
    id: c.id,
    name: c.name,
    rarity: c.rarity,
    affiliations: c.affiliations,
    abilities: c.abilities,
    presence_expectation: c.presenceExpectation,
  }));

  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const { error } = await db.from('characters').upsert(slice, { onConflict: 'id' });
    if (error) throw new Error(`characters.upsert : ${error.message}`);
    process.stdout.write(`  personnages ${i + slice.length}/${rows.length}\r`);
  }
  process.stdout.write('\n');

  // --- Relations -----------------------------------------------------------
  const relations = CHARACTERS.flatMap((c) =>
    c.relations.map((r) => ({ from_id: c.id, to_id: r.to, kind: r.kind })),
  );

  // Remplacement en bloc. `neq` sur une valeur impossible cible toutes les
  // lignes : PostgREST refuse un DELETE sans filtre, par sécurité.
  const cleared = await db.from('character_relations').delete().neq('from_id', '');
  if (cleared.error) throw new Error(`character_relations.delete : ${cleared.error.message}`);

  for (let i = 0; i < relations.length; i += BATCH) {
    const slice = relations.slice(i, i + BATCH);
    const { error } = await db.from('character_relations').insert(slice);
    if (error) throw new Error(`character_relations.insert : ${error.message}`);
    process.stdout.write(`  relations ${i + slice.length}/${relations.length}\r`);
  }
  process.stdout.write('\n');

  const { count } = await db
    .from('characters')
    .select('id', { count: 'exact', head: true });
  process.stdout.write(`Terminé — ${count} personnages en base.\n`);
}

main().catch((error) => {
  process.stderr.write(`Échec : ${error.message}\n`);
  process.exit(1);
});
