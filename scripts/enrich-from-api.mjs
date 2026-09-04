#!/usr/bin/env node
/**
 * Reprend dans l'API tout ce que le premier import avait laissé de côté.
 *
 *   node scripts/enrich-from-api.mjs [--dry]
 *
 * ## Ce qui manquait
 *
 * `import-characters.mjs` ne lisait que deux champs pour remplir `abilities` :
 * le nom du fruit et le poste. Sur 524 personnages jouables, **101 n'affichent
 * qu'un seul symbole** sur leur carte, et vingt-quatre d'entre eux sont des
 * Épiques — la rareté où le joueur commence à regarder les détails.
 *
 * L'API en dit pourtant beaucoup plus, et rien de tout cela n'était lu :
 *
 *   - `job` est un **blob** : « Resident / Shandia tribe (chief) » comptait
 *     pour une seule capacité, alors qu'il en énonce deux. Vingt-six postes
 *     portent ainsi plusieurs rôles dans la même chaîne ;
 *   - `crew.is_yonko` distingue **267 personnages** — tout l'équipage de Big
 *     Mom, de Kaido, de Barbe Blanche, du Roux. Servait au seul calcul de
 *     l'attendu d'apparition, puis était jeté ;
 *   - `bounty` est renseignée sur **141 personnages** et n'entrait nulle part
 *     dans la carte ;
 *   - `size` est renseignée sur **368 personnages**. Quarante-huit dépassent
 *     cinq mètres, et la carte n'en disait rien.
 *
 * ## Ce que le script ne fait pas
 *
 * Il **n'écrit que dans `abilities`**. Ni identifiant, ni nom, ni rareté, ni
 * relation : ces champs sont référencés par les inventaires, les équipages et
 * les annonces du Marché déjà en base, et une régénération complète depuis
 * l'API les ferait bouger au gré des corrections du site source. Le
 * référentiel de production ne se réécrit pas pour ajouter un symbole.
 *
 * Il **ajoute, il ne remplace jamais** — même contrat que
 * `enrich-abilities.mjs` : deux passages donnent le même fichier.
 *
 * ⚠️ **Aucune image, aucune description de l'œuvre** (cahier §122). On lit des
 * faits — une taille, une prime, un poste, l'appartenance à un équipage
 * d'Empereur — jamais le texte narratif que l'API sert à côté.
 *
 * Les capacités ne servent que l'affichage et les synergies d'affiliation.
 * Elles n'entrent jamais dans le calcul du score (§25).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const TARGET = 'src/data/characters.ts';
const SOURCE = 'https://api.api-onepiece.com/v2/characters/en';

/**
 * Noms de l'API désignant un personnage déjà écrit à la main.
 * Reprise de `import-characters.mjs` : les deux scripts doivent apparier
 * exactement les mêmes personnes, sans quoi l'un enrichirait un doublon.
 */
const ALIASES = new Map([
  ['sanji', 'sanji'],
  ['eustass kidd', 'kid'],
  ['sakazuki akainu', 'akainu'],
]);

/** Normalise un nom pour comparer « Monkey D Luffy » et « Monkey D. Luffy ». */
function normalise(name) {
  return String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Prime en nombre. Les valeurs de l'API sont du texte pointé. */
function bountyOf(raw) {
  if (!raw) return 0;
  const digits = String(raw).replace(/[^0-9]/g, '');
  const value = Number(digits);
  return digits && Number.isFinite(value) ? value : 0;
}

/** Taille en centimètres. « 174cm », « 2 200cm », parfois vide. */
function heightOf(raw) {
  if (!raw) return 0;
  const digits = String(raw).replace(/[^0-9]/g, '');
  const value = Number(digits);
  return digits && Number.isFinite(value) ? value : 0;
}

const NON_ROLES = new Set([
  // Des qualificatifs, pas des rôles : « Skypiea (exiled) » dit où le
  // personnage n'est plus, pas ce qu'il fait. Affichés seuls, ils
  // n'apprendraient rien et deviendraient un symbole de plus à déchiffrer.
  'exiled',
  'exile',
  'former',
  'ex',
  'unknown',
  'inconnu',
  'none',
  'n/a',
]);

/**
 * Découpe un poste en rôles.
 *
 * Le champ `job` de l'API n'est pas atomique. « Day Lord / Red Sheaths »,
 * « Owner and Chef », « Galley-La Company (head of coaters and blacksmiths) »
 * décrivent chacun deux appartenances ou deux métiers, et la carte n'en
 * montrait qu'un — celui que la première règle de `attributes.ts` attrapait.
 *
 * On coupe sur les séparateurs et on **garde les parenthèses comme un rôle à
 * part entière** : c'est souvent là qu'est le métier réel, le mot devant
 * n'étant que le nom de l'entreprise.
 */
function splitJob(job) {
  if (!job) return [];

  const parts = [];
  for (const bloc of String(job).split(/\s*[/;]\s*|\s*,\s*/)) {
    const parentheses = [...bloc.matchAll(/\(([^)]+)\)/g)].map((m) => m[1]);
    const tete = bloc.replace(/\([^)]*\)/g, '').trim();
    for (const morceau of [tete, ...parentheses]) {
      // « and » ne coupe qu'entre deux mots pleins : « Owner and Chef » donne
      // deux métiers, « Commander-in-chief » n'en donne qu'un.
      for (const role of morceau.split(/\s+(?:and|et|&)\s+/i)) {
        const propre = role.trim().replace(/^[-–—\s]+|[-–—\s]+$/g, '');
        if (propre.length > 1 && !NON_ROLES.has(propre.toLowerCase())) {
          parts.push(propre);
        }
      }
    }
  }

  // Doublons internes : « Skypiea (exiled) / Clan Ener (…) » répète des mots.
  return [...new Set(parts)];
}

/**
 * Palier de prime.
 *
 * Deux paliers, pas dix. Le nombre exact ne se lit pas d'un coup d'œil sur une
 * carte, et une échelle fine n'apprendrait rien : ce que le joueur retient,
 * c'est « celui-là est au milliard ».
 */
function bountyTier(bounty) {
  if (bounty >= 1_000_000_000) return 'Prime au milliard';
  if (bounty >= 100_000_000) return 'Prime importante';
  return null;
}

/**
 * Capacités déduites d'un personnage de l'API.
 *
 * Sur la taille : le seuil dit **« colosse »**, jamais « géant ». Cinq mètres
 * ne font pas une espèce — Kaido mesure 710 cm et n'est pas un géant, Gecko
 * Moria 692 cm non plus. La race reste écrite à la main dans
 * `src/data/abilities.json`, où elle est vraie ; la taille, elle, est un fait
 * mesuré que l'on peut énoncer sans rien conclure.
 */
export function derivedAbilities(character) {
  const abilities = [];

  if (character.fruit?.name) abilities.push(character.fruit.name);
  abilities.push(...splitJob(character.job));

  // L'équipage d'un des quatre Empereurs. C'est le trait le plus partagé de
  // tout le référentiel — et le seul qui range un second couteau dans une
  // puissance mondiale plutôt que dans une bande quelconque.
  if (character.crew?.is_yonko) abilities.push("Équipage d'Empereur");

  const prime = bountyTier(bountyOf(character.bounty));
  if (prime) abilities.push(prime);

  if (heightOf(character.size) >= 500) abilities.push('Colosse');

  return [...new Set(abilities)];
}

// ---------------------------------------------------------------------------

async function main() {
  const dry = process.argv.includes('--dry');

  process.stdout.write(`Récupération de ${SOURCE}\n`);
  const response = await fetch(SOURCE);
  if (!response.ok) throw new Error(`API : HTTP ${response.status}`);
  const api = await response.json();
  process.stdout.write(`  ${api.length} personnages reçus\n`);

  const brut = readFileSync(TARGET, 'utf8');
  const crlf = brut.includes('\r\n');
  const source = crlf ? brut.replace(/\r\n/g, '\n') : brut;

  const blocks = source.split(/(?=\n  \{\n    id: ')/);

  // Index du référentiel : nom normalisé → identifiants, dans l'ordre du
  // fichier. Deux personnages peuvent porter le même nom normalisé — l'import
  // les a suffixés « -2 », « -3 » dans l'ordre de l'API, et on apparie dans ce
  // même ordre plutôt que de deviner.
  const parNom = new Map();
  const idsConnus = new Set();
  for (const block of blocks) {
    const id = /^\n {2}\{\n {4}id: '([^']+)'/.exec(block)?.[1];
    if (!id) continue;
    idsConnus.add(id);
    const nom = /\n {4}name: '((?:[^'\\]|\\.)*)'/.exec(block)?.[1];
    if (!nom) continue;
    const cle = normalise(nom.replace(/\\'/g, "'"));
    const liste = parNom.get(cle) ?? [];
    liste.push(id);
    parNom.set(cle, liste);
  }

  // Appariement API → référentiel.
  const voulu = new Map();
  const restants = new Map([...parNom].map(([cle, ids]) => [cle, [...ids]]));
  let apparies = 0;
  const orphelins = [];

  for (const character of api) {
    if (!character.name) continue;
    const cle = normalise(character.name);
    const alias = ALIASES.get(cle);

    let id = null;
    if (alias && idsConnus.has(alias)) {
      id = alias;
    } else {
      const file = restants.get(cle);
      if (file && file.length > 0) id = file.shift();
    }

    if (!id) {
      orphelins.push(character.name);
      continue;
    }

    apparies += 1;
    const liste = voulu.get(id) ?? [];
    for (const capacite of derivedAbilities(character)) {
      if (!liste.includes(capacite)) liste.push(capacite);
    }
    voulu.set(id, liste);
  }

  process.stdout.write(`  ${apparies} appariés au référentiel\n`);
  if (orphelins.length > 0) {
    // Un personnage de l'API absent du référentiel n'est pas une faute : le
    // site source en ajoute, et le référentiel de production ne se régénère
    // pas pour autant. On le signale sans échouer.
    process.stdout.write(
      `  ${orphelins.length} présents dans l'API mais absents du référentiel (ignorés)\n`,
    );
  }

  let touched = 0;
  let added = 0;
  const parCapacite = new Map();

  const rewritten = blocks.map((block) => {
    const id = /^\n {2}\{\n {4}id: '([^']+)'/.exec(block)?.[1];
    if (!id) return block;

    const extras = voulu.get(id);
    if (!extras || extras.length === 0) return block;

    return block.replace(/abilities: \[([^\]]*)\]/, (whole, inner) => {
      const current = inner
        .split(/(?<='),\s*(?=')/)
        .map((entry) => entry.trim())
        .filter(Boolean);

      // Comparaison sur la valeur littérale, apostrophes échappées comprises :
      // c'est ce qui rend le script idempotent.
      const manquantes = extras
        .map((label) => `'${label.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`)
        .filter((quoted) => !current.includes(quoted));

      if (manquantes.length === 0) return whole;

      touched += 1;
      added += manquantes.length;
      for (const q of manquantes) {
        parCapacite.set(q, (parCapacite.get(q) ?? 0) + 1);
      }
      return `abilities: [${[...current, ...manquantes].join(', ')}]`;
    });
  });

  if (!dry) {
    const sortie = rewritten.join('');
    writeFileSync(TARGET, crlf ? sortie.replace(/\n/g, '\r\n') : sortie);
  }

  process.stdout.write(
    `\n${touched} personnages enrichis · ${added} capacités ajoutées${dry ? ' (simulation)' : ''}\n`,
  );
  const top = [...parCapacite].sort((a, b) => b[1] - a[1]).slice(0, 15);
  for (const [label, count] of top) {
    process.stdout.write(`  ${String(count).padStart(4)}  ${label}\n`);
  }
}

/*
 * `import-characters.mjs` importe `derivedAbilities` de ce module, pour que
 * l'import complet et l'enrichissement additif appliquent la **même** règle
 * d'extraction. Sans cette garde, importer la fonction déclencherait aussi
 * l'enrichissement : les deux scripts écriraient dans le même fichier au cours
 * de la même commande, et le contenu d'une carte dépendrait de l'ordre.
 */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write(`Échec : ${error.message}\n`);
    process.exit(1);
  });
}
