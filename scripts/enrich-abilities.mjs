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

/**
 * Les deux fichiers qui portent des personnages.
 *
 * `characters.ts` vient de l'import ; `characters.manquants.ts` est écrit à la
 * main pour ce que l'API ne sert pas. Le script ne visait que le premier, et
 * signalait donc les huit entrées manuelles comme « identifiants inconnus » —
 * leur Haki n'était jamais posé, alors que la table le déclarait.
 */
const TARGETS = ['src/data/characters.ts', 'src/data/characters.manquants.ts'];
const TABLE = 'src/data/abilities.json';

/** Libellé écrit dans le référentiel pour chaque clé de la table. */
const LABELS = {
  // Le fruit, pour les porteurs que l'API ne renseigne pas. Elle ne connaît
  // que 180 utilisateurs sur 790, et manque des cas où le fruit est un fait
  // établi de l'œuvre sans que la fiche source le porte — Imu en est
  // l'exemple : « souverain absolu du monde » et rien d'autre.
  fruit: 'Fruit du démon',
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
  pirate: 'Pirate',
  captain: 'Capitaine',
  resident: 'Résident',
  wano: 'Pays des Wa',
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

  const seen = new Set();
  let touched = 0;
  let added = 0;

  for (const TARGET of TARGETS) {
    const brut = readFileSync(TARGET, 'utf8');

    /*
     * Fins de ligne normalisées avant tout découpage.
     *
     * Le référentiel est en CRLF dès que Git le récupère sur Windows, et les
     * motifs ci-dessous cherchent `\\n  {`. Ils ne trouvaient alors **aucun**
     * personnage : le script annonçait « 0 enrichi » et listait les 149
     * identifiants de la table comme inconnus du référentiel. Sans erreur et
     * sans échec — il ne faisait simplement rien.
     *
     * On travaille en LF et on restitue la fin de ligne d'origine à
     * l'écriture, pour ne pas transformer tout le fichier en une seule ligne
     * de diff.
     */
    const crlf = brut.includes('\r\n');
    const source = crlf ? brut.replace(/\r\n/g, '\n') : brut;

    const blocks = source.split(/(?=\n  \{\n    id: ')/);

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

    if (!dry) {
      const sortie = rewritten.join('');
      writeFileSync(TARGET, crlf ? sortie.replace(/\n/g, '\r\n') : sortie);
    }
  }

  // Un identifiant de la table absent du référentiel est une faute de frappe
  // silencieuse : elle ne ferait jamais rien et personne ne le verrait.
  const unknownIds = [...wanted.keys()].filter((id) => !seen.has(id));
  if (unknownIds.length > 0) {
    console.warn(
      `\n⚠ ${unknownIds.length} identifiant(s) inconnu(s) du référentiel :\n  ${unknownIds.join(', ')}\n`,
    );
  }

  console.log(
    `${seen.size} personnages · ${touched} enrichis · ${added} capacités ajoutées${dry ? ' (simulation)' : ''}`,
  );
}

main();
