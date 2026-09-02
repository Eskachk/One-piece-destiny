#!/usr/bin/env node
/**
 * Latence des lectures qu'une page connectée fait à chaque affichage.
 *
 *   node scripts/db-latency.mjs [--paliers 1,5,10,25,50] [--tours 20]
 *
 * ## Pourquoi cette mesure existe
 *
 * Le tir de charge (`scripts/load-test.mjs`) porte sur des pages anonymes :
 * elles ne touchent pas la base, et il a établi que le rendu coûte 6 ms par
 * page. Une page connectée y ajoute des **allers-retours réseau vers
 * Supabase**, qui ne se voient pas dans un profil de processeur — ils s'y
 * lisent comme de l'attente.
 *
 * Ce script les mesure directement, sans session ni cookie : mêmes requêtes que
 * l'application, même client, même machine.
 *
 * ## Pourquoi une rampe et pas une valeur
 *
 * Une seule concurrence ne dit rien. Une première version mesurait 540 ms à
 * 25 clients et donnait l'impression que la base est lente ; c'était un régime
 * **déjà saturé**. Seule la courbe distingue la latence d'un aller-retour de la
 * file d'attente qui se forme devant.
 *
 * ## Écriture : aucune
 *
 * Toutes les requêtes sont des lectures. Le script ne crée, ne modifie et ne
 * supprime rien.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

// ---------------------------------------------------------------------------
// Environnement
// ---------------------------------------------------------------------------

/**
 * `.env.local` lu à la main : ce script tourne hors de Next, qui est le seul à
 * charger ces fichiers. Analyse volontairement minimale — `CLE=valeur`, une par
 * ligne — parce qu'un analyseur complet de `.env` serait plus long que le reste
 * du script.
 */
function chargerEnv(chemin = '.env.local') {
  let contenu;
  try {
    contenu = readFileSync(chemin, 'utf8');
  } catch {
    return;
  }

  for (const ligne of contenu.split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(ligne);
    if (!m) continue;
    if (process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

chargerEnv();

const ADRESSE = process.env.SUPABASE_URL;
const CLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!ADRESSE || !CLE) {
  process.stderr.write('SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (.env.local).\n');
  process.exit(1);
}

const db = createClient(ADRESSE, CLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function arg(nom, defaut) {
  const i = process.argv.indexOf(`--${nom}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : defaut;
}

const TOURS = Number(arg('tours', '20'));
const CONCURRENCE = Number(arg('concurrence', '10'));
const PALIERS = arg('paliers', '1,5,10,25,50').split(',').map(Number);

// ---------------------------------------------------------------------------
// Les requêtes réellement faites par les pages
// ---------------------------------------------------------------------------

const REQUETES = (playerId, tokenHash) => [
  {
    nom: 'session (jointure comptes)',
    note: 'Sur CHAQUE page connectée, une fois par requête (mémorisée).',
    executer: () =>
      db
        .from('sessions')
        .select(
          'token_hash, created_at, last_seen_at, authenticated_at, revoked_at, mfa_pending, user_accounts!inner(id, email, role, player_id, mfa_enabled)',
        )
        .eq('token_hash', tokenHash)
        .maybeSingle(),
  },
  {
    nom: 'portefeuille',
    note: 'Accueil, collection, Marché, boutique.',
    executer: () =>
      db
        .from('wallets')
        .select('berries, pending_berries, royal_chests, version')
        .eq('player_id', playerId)
        .maybeSingle(),
  },
  {
    nom: 'inventaire',
    note: 'Collection, Marché, composition d’équipage.',
    executer: () =>
      db.from('inventory').select('character_id').eq('player_id', playerId).limit(500),
  },
  {
    nom: 'compte (jointure joueurs)',
    note: 'Profil et paramètres.',
    executer: () =>
      db
        .from('user_accounts')
        .select('email_verified_at, birth_date, players!inner(handle)')
        .eq('player_id', playerId)
        .maybeSingle(),
  },
  {
    nom: 'historique hebdomadaire',
    note: 'Profil : division, saison, style de jeu.',
    executer: () =>
      db.from('weekly_profiles').select('chapter_id, total').eq('player_id', playerId).limit(60),
  },
  {
    nom: 'notifications non lues',
    note: 'Profil.',
    executer: () =>
      db
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('player_id', playerId)
        .is('read_at', null),
  },
];

// ---------------------------------------------------------------------------
// Mesure
// ---------------------------------------------------------------------------

async function mesurer(requete, concurrence, tours) {
  const latences = [];
  let erreurs = 0;
  let dernierMessage = null;

  const client = async () => {
    for (let i = 0; i < tours; i += 1) {
      const debut = performance.now();
      const { error } = await requete.executer();
      latences.push(performance.now() - debut);
      if (error) {
        erreurs += 1;
        dernierMessage = error.message;
      }
    }
  };

  const debut = performance.now();
  await Promise.all(Array.from({ length: concurrence }, client));
  const ecoule = (performance.now() - debut) / 1000;

  latences.sort((a, b) => a - b);
  const q = (p) => latences[Math.min(latences.length - 1, Math.floor(latences.length * p))];

  return {
    nom: requete.nom,
    note: requete.note,
    n: latences.length,
    parSeconde: latences.length / ecoule,
    p50: q(0.5),
    p90: q(0.9),
    p99: q(0.99),
    erreurs,
    dernierMessage,
  };
}

const ms = (v) => `${v.toFixed(0).padStart(6)} ms`;

async function main() {
  const { data: joueurs, error } = await db.from('players').select('id').limit(1);
  if (error || !joueurs?.length) {
    process.stderr.write('Aucun joueur en base : rien à mesurer.\n');
    process.exit(1);
  }

  const playerId = joueurs[0].id;

  // Empreinte quelconque : la requête doit **chercher**, pas trouver. C'est le
  // même index et le même aller-retour ; seul le résultat diffère, et on ne
  // mesure pas le résultat. Aucune session réelle n'est lue.
  const tokenHash = 'a'.repeat(64);

  process.stdout.write(`Base : ${new URL(ADRESSE).host}\n\n`);

  // --- 1. La lecture de session, en rampe ----------------------------------
  //
  // C'est la seule requête que **toute** page connectée fait, quelle qu'elle
  // soit. Sa courbe donne le plafond de l'ensemble.
  process.stdout.write(`Lecture de session — une par page connectée (${TOURS} req/client)\n`);
  process.stdout.write('clients        n      req/s         p50         p90         p99   err\n');
  process.stdout.write('-'.repeat(70) + '\n');

  const [session] = REQUETES(playerId, tokenHash);
  const rampe = [];
  for (const concurrence of PALIERS) {
    const r = await mesurer(session, concurrence, TOURS);
    rampe.push({ concurrence, ...r });
    process.stdout.write(
      `${String(concurrence).padStart(7)} ${String(r.n).padStart(8)} ` +
        `${r.parSeconde.toFixed(0).padStart(10)} ${ms(r.p50)} ${ms(r.p90)} ${ms(r.p99)} ` +
        `${String(r.erreurs).padStart(5)}\n`,
    );
  }

  // --- 2. Les autres lectures, à concurrence fixe ---------------------------
  process.stdout.write(`\nAutres lectures — ${CONCURRENCE} clients x ${TOURS} requêtes\n`);
  process.stdout.write(
    'requête                        n      req/s         p50         p90         p99   err\n',
  );
  process.stdout.write('-'.repeat(92) + '\n');

  const resultats = [];
  for (const requete of REQUETES(playerId, tokenHash)) {
    const r = await mesurer(requete, CONCURRENCE, TOURS);
    resultats.push(r);
    process.stdout.write(
      `${r.nom.padEnd(28)} ${String(r.n).padStart(5)} ${r.parSeconde.toFixed(0).padStart(10)} ` +
        `${ms(r.p50)} ${ms(r.p90)} ${ms(r.p99)} ${String(r.erreurs).padStart(5)}\n`,
    );
  }

  // --- Lecture --------------------------------------------------------------
  const base = rampe[0];
  const plafond = rampe.reduce((a, b) => (b.parSeconde > a.parSeconde ? b : a));

  process.stdout.write(
    `\nAller-retour seul (1 client) : ${base.p50.toFixed(0)} ms\n` +
      `Débit maximal de la base     : ${plafond.parSeconde.toFixed(0)} req/s ` +
      `a ${plafond.concurrence} clients\n`,
  );

  const enErreur = resultats.filter((r) => r.erreurs > 0);
  if (enErreur.length > 0) {
    process.stdout.write('\nRequêtes en erreur — ne rien conclure de ces lignes :\n');
    for (const r of enErreur) {
      process.stdout.write(`  ${r.nom} : ${r.dernierMessage}\n`);
    }
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exit(1);
});
