#!/usr/bin/env node
/**
 * Ajoute les capacités éditoriales au référentiel.
 *
 *   node scripts/enrich-abilities.mjs [--dry]
 *
 * L'import d'api-onepiece.com donne le poste et l'équipage — « Officer »,
 * « Captain », le type de fruit. Il ne dit rien du Haki, de l'arme ni du rôle
 * réel : treize personnages sur 790 portaient une mention de Haki, et Zoro
 * n'était pas décrit comme épéiste. Les symboles de carte s'en ressentaient.
 *
 * Ce script **ajoute**, il ne remplace jamais : les capacités importées sont
 * conservées telles quelles, celles de `src/data/abilities.json` s'y ajoutent
 * sans doublon. Relancer le script deux fois donne le même fichier.
 *
 * Les capacités ne servent que l'affichage et les synergies d'affiliation.
 * Elles n'entrent jamais dans le calcul du score (§25).
 */

import { readFileSync, writeFileSync } from 'node:fs';

const TARGET = 'src/data/characters.ts';
const TABLE = 'src/data/abilities.json';

/** Libellé écrit dans le référentiel pour chaque clé de la table. */
const LABELS = {
  conqueror: 'Haki des Rois',
  armament: 'Haki armement',
  observation: 'Haki observation',
  sword: 'Épéiste',
  cook: 'Cuisinier',
  doctor: 'Médecin',
  navigator: 'Navigation',
  sniper: 'Tireur',
  shipwright: 'Charpentier',
  musician: 'Musicien',
  archaeologist: 'Archéologue',
  helmsman: 'Barreur',
  giant: 'Géant',
  fishman: 'Homme-poisson',
  royal: 'Royauté',
  revolutionary: 'Révolutionnaire',
  marine: 'Marine',
};

function main() {
  const dry = process.argv.includes('--dry');

  const table = JSON.parse(readFileSync(TABLE, 'utf8'));

  // Index inverse : identifiant → libellés à ajouter.
  const wanted = new Map();
  const unknownKeys = [];

  for (const [key, ids] of Object.entries(table)) {
    if (key.startsWith('_')) continue;
    const label = LABELS[key];
    if (!label) {
      unknownKeys.push(key);
      continue;
    }
    for (const id of ids) {
      const list = wanted.get(id) ?? [];
      if (!list.includes(label)) list.push(label);
      wanted.set(id, list);
    }
  }

  if (unknownKeys.length > 0) {
    // Une clé sans libellé n'ajouterait rien et ne se verrait jamais.
    console.warn(`⚠ clés sans libellé : ${unknownKeys.join(', ')}`);
  }

  const source = readFileSync(TARGET, 'utf8');
  const blocks = source.split(/(?=\n  \{\n    id: ')/);

  const seen = new Set();
  let touched = 0;
  let added = 0;

  const rewritten = blocks.map((block) => {
    const id = /^\n  \{\n    id: '([^']+)'/.exec(block)?.[1];
    if (!id) return block;
    seen.add(id);

    const extras = wanted.get(id);
    if (!extras || extras.length === 0) return block;

    return block.replace(/abilities: \[([^\]]*)\]/, (whole, inner) => {
      const current = inner
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);

      // Comparaison sur la valeur littérale, apostrophes comprises : c'est ce
      // qui rend le script idempotent.
      const missing = extras
        .map((label) => `'${label.replace(/'/g, "\\'")}'`)
        .filter((quoted) => !current.includes(quoted));

      if (missing.length === 0) return whole;

      touched += 1;
      added += missing.length;
      return `abilities: [${[...current, ...missing].join(', ')}]`;
    });
  });

  // Un identifiant de la table absent du référentiel est une faute de frappe
  // silencieuse : elle ne ferait jamais rien et personne ne le verrait.
  const unknownIds = [...wanted.keys()].filter((id) => !seen.has(id));
  if (unknownIds.length > 0) {
    console.warn(
      `\n⚠ ${unknownIds.length} identifiant(s) inconnu(s) du référentiel :\n  ${unknownIds.join(', ')}\n`,
    );
  }

  if (!dry) writeFileSync(TARGET, rewritten.join(''));

  console.log(
    `${seen.size} personnages · ${touched} enrichis · ${added} capacités ajoutées${dry ? ' (simulation)' : ''}`,
  );
}

main();
