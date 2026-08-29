#!/usr/bin/env node
/**
 * Réévalue la rareté de tout le référentiel selon la notoriété narrative.
 *
 *   node scripts/rerank-rarity.mjs [--dry]
 *
 * La rareté était dérivée de la **prime**. Le résultat était incohérent avec
 * ce qu'un lecteur attend : soixante-quinze enfants Charlotte classés Épiques
 * parce qu'ils portent une prime, à égalité avec Nami ; des figurants d'une
 * seule case au même rang que des personnages de tous les arcs.
 *
 * Elle est désormais dérivée du **nombre d'apparitions**, approché par une
 * table de notoriété écrite à la main (`src/data/prominence.json`). Personne
 * n'a compté les cases : c'est une estimation éditoriale, et elle se corrige
 * en éditant la table plutôt qu'en touchant au code.
 *
 * Repli pour les absents de la table :
 *   — RARE   s'ils portent un grade ou un rôle nommé (capitaine, amiral,
 *            officier, roi…), c'est-à-dire s'ils existent en tant que
 *            personnage plutôt qu'en tant que foule ;
 *   — COMMON sinon.
 *
 * Le script ne réécrit **que** les lignes `rarity:`. Il ne touche ni aux
 * relations narratives, ni aux affiliations, ni à `presenceExpectation` —
 * cette dernière alimente le score (§25), et la déplacer changerait
 * l'équilibre du jeu sans que personne l'ait demandé.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const TARGET = 'src/data/characters.ts';
const TABLE = 'src/data/prominence.json';

/** Rôles qui font d'un personnage autre chose qu'un figurant. */
const NAMED_ROLE =
  /captain|capitaine|admiral|amiral|lieutenant|colonel|officer|king|queen|prince|princess|sovereign|doctor|samurai|shichibukai|vice-admiral|sub-admiral|rear admiral/i;

function main() {
  const dry = process.argv.includes('--dry');

  const table = JSON.parse(readFileSync(TABLE, 'utf8'));
  const tiers = new Map();
  for (const rarity of ['MYTHIC', 'LEGENDARY', 'EPIC']) {
    for (const id of table[rarity]) {
      if (tiers.has(id)) {
        console.warn(`  ⚠ ${id} apparaît dans deux paliers ; ${rarity} l'emporte.`);
      }
      tiers.set(id, rarity);
    }
  }

  const source = readFileSync(TARGET, 'utf8');

  // Un personnage = un bloc `{ id: '…', … }`. On découpe sur `    id: '` plutôt
  // que de tenter d'analyser du TypeScript : le fichier est généré, sa forme
  // est stable, et un vrai analyseur serait ici une machine à vapeur.
  const blocks = source.split(/(?=\n  \{\n    id: ')/);

  const seen = new Set();
  const distribution = {};
  let changed = 0;

  const rewritten = blocks.map((block) => {
    const id = /^\n  \{\n    id: '([^']+)'/.exec(block)?.[1];
    if (!id) return block;

    seen.add(id);

    const abilities = /abilities: \[([^\]]*)\]/.exec(block)?.[1] ?? '';
    const rarity =
      tiers.get(id) ?? (NAMED_ROLE.test(abilities) ? 'RARE' : 'COMMON');

    distribution[rarity] = (distribution[rarity] ?? 0) + 1;

    return block.replace(/(\n    rarity: ')[A-Z]+(')/, (match, before, after) => {
      if (!match.includes(`'${rarity}'`)) changed += 1;
      return `${before}${rarity}${after}`;
    });
  });

  // Une entrée de la table qui ne correspond à personne est une faute de
  // frappe silencieuse : elle ne ferait jamais rien et personne ne le verrait.
  const unknown = [...tiers.keys()].filter((id) => !seen.has(id));
  if (unknown.length > 0) {
    console.warn(`\n⚠ ${unknown.length} identifiant(s) inconnu(s) du référentiel :`);
    console.warn(`  ${unknown.join(', ')}\n`);
  }

  if (!dry) writeFileSync(TARGET, rewritten.join(''));

  console.log(`${seen.size} personnages · ${changed} raretés modifiées${dry ? ' (simulation)' : ''}`);
  for (const rarity of ['MYTHIC', 'LEGENDARY', 'EPIC', 'RARE', 'COMMON']) {
    console.log(`  ${rarity.padEnd(10)} ${distribution[rarity] ?? 0}`);
  }
}

main();
