#!/usr/bin/env node
/**
 * Tir de charge.
 *
 *   node scripts/load-test.mjs [--url http://localhost:3100] [--seconds 20]
 *                              [--paliers 50,200,500] [--chemins /classement,/login]
 *
 * ## Ce que ce script mesure, et ce qu'il ne mesure pas
 *
 * Il mesure **le coût du rendu de l'application** : combien de requêtes par
 * seconde un processus Next.js soutient, et avec quelle latence, avant de
 * saturer. C'est la partie sur laquelle le code a prise.
 *
 * Il ne mesure **pas** la tenue du déploiement. Sur Vercel, chaque instance
 * traite une fraction du trafic et la plateforme en ajoute sous la charge ; le
 * réseau, lui, ajoute une latence que localhost n'a pas. Un chiffre obtenu
 * ici dit « une instance encaisse X », jamais « le site encaisse X ».
 *
 * Le générateur de charge tourne sur la **même machine** que le serveur : au
 * palier haut, les deux se disputent le processeur, et la latence mesurée
 * inclut cette contention. C'est une borne pessimiste, ce qui est le bon sens
 * de l'erreur pour un test de capacité.
 *
 * ## Pourquoi `node:http` et pas `fetch`
 *
 * `fetch` (undici) gère son pool de connexions lui-même et ne laisse pas fixer
 * le nombre de sockets simultanées. Or c'est précisément la variable qu'on
 * veut piloter : sans elle, on mesure la file d'attente du client au lieu de
 * la capacité du serveur.
 *
 * ## Pourquoi aucune dépendance
 *
 * `autocannon` ferait le même travail en mieux. Ajouter une dépendance de
 * développement pour une mesure ponctuelle coûte plus cher que quatre-vingts
 * lignes qu'on relit — et une dépendance de plus est une dépendance de plus à
 * auditer.
 */

import http from 'node:http';
import { performance } from 'node:perf_hooks';

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

function arg(nom, defaut) {
  const index = process.argv.indexOf(`--${nom}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : defaut;
}

const BASE = new URL(arg('url', 'http://localhost:3100'));
const SECONDES = Number(arg('seconds', '15'));
const PALIERS = arg('paliers', '50,200,500').split(',').map(Number);
const CHEMINS = arg('chemins', '/classement').split(',');

/** Palier d'échauffement : remplir les caches avant de mesurer quoi que ce soit. */
const ECHAUFFEMENT_MS = 3_000;

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/**
 * Une requête.
 *
 * Le corps est **lu et jeté**. Ne pas le consommer laisse la connexion en
 * suspens et fausse tout : on chronomètre alors l'en-tête au lieu de la
 * réponse, et le serveur paraît plus rapide qu'il ne l'est.
 */
function requete(agent, chemin) {
  return new Promise((resolve) => {
    const debut = performance.now();

    const req = http.request(
      {
        agent,
        host: BASE.hostname,
        port: BASE.port,
        path: chemin,
        method: 'GET',
        headers: { 'accept-encoding': 'identity' },
      },
      (res) => {
        let octets = 0;
        res.on('data', (chunk) => {
          octets += chunk.length;
        });
        res.on('end', () =>
          resolve({ ms: performance.now() - debut, status: res.statusCode, octets }),
        );
      },
    );

    req.on('error', (error) =>
      resolve({ ms: performance.now() - debut, status: 0, octets: 0, error: error.code }),
    );

    req.setTimeout(30_000, () => {
      req.destroy();
      resolve({ ms: performance.now() - debut, status: 0, octets: 0, error: 'TIMEOUT' });
    });

    req.end();
  });
}

/**
 * Un palier : `concurrence` clients qui bouclent en continu pendant `dureeMs`.
 *
 * Chaque client enchaîne ses requêtes **en série** — il en relance une dès que
 * la précédente est rendue. C'est le modèle « quelqu'un qui navigue », pas
 * celui d'une rafale : cette dernière mesure la taille d'une file d'attente
 * plutôt qu'un débit soutenu.
 */
async function palier(concurrence, dureeMs, chemins) {
  const agent = new http.Agent({
    keepAlive: true,
    maxSockets: concurrence,
    maxFreeSockets: concurrence,
  });

  // Deux comptages séparés, et la distinction est le cœur de la mesure : une
  // connexion refusée revient en une fraction de milliseconde. Mélangée aux
  // réponses réelles, elle fait **monter** le débit apparent et **baisser** la
  // latence médiane — un serveur saturé paraît alors plus rapide qu'un serveur
  // sain. Une première version de ce script annonçait 1 860 req/s là où le
  // serveur en servait 130 et en refusait 35 000.
  const latences = [];
  const statuts = new Map();
  let echecs = 0;
  let octetsTotal = 0;
  const fin = performance.now() + dureeMs;

  const client = async (index) => {
    let i = index;
    while (performance.now() < fin) {
      const chemin = chemins[i % chemins.length];
      i += 1;
      const r = await requete(agent, chemin);

      const cle = r.error ?? String(r.status);
      statuts.set(cle, (statuts.get(cle) ?? 0) + 1);

      if (r.error || r.status === 0 || r.status >= 500) {
        echecs += 1;
        // Un refus revient instantanément : sans cette pause, la boucle
        // repartirait aussitôt et saturerait le processeur du générateur au
        // lieu de celui du serveur.
        await new Promise((resolve) => setTimeout(resolve, 50));
        continue;
      }

      latences.push(r.ms);
      octetsTotal += r.octets;
    }
  };

  const debut = performance.now();
  await Promise.all(Array.from({ length: concurrence }, (_, i) => client(i)));
  const ecoule = (performance.now() - debut) / 1000;

  agent.destroy();

  latences.sort((a, b) => a - b);
  const q = (p) =>
    latences.length === 0
      ? 0
      : latences[Math.min(latences.length - 1, Math.floor(latences.length * p))];

  return {
    concurrence,
    servies: latences.length,
    echecs,
    rps: latences.length / ecoule,
    p50: q(0.5),
    p90: q(0.9),
    p99: q(0.99),
    max: latences.length ? latences[latences.length - 1] : 0,
    statuts,
    ko: octetsTotal / 1024 / Math.max(1, latences.length),
  };
}

// ---------------------------------------------------------------------------
// Exécution
// ---------------------------------------------------------------------------

const ms = (v) => `${v.toFixed(0).padStart(6)} ms`;

async function main() {
  process.stdout.write(`Cible   : ${BASE.origin}\n`);
  process.stdout.write(`Chemins : ${CHEMINS.join(', ')}\n`);
  process.stdout.write(`Paliers : ${PALIERS.join(', ')} clients · ${SECONDES} s chacun\n\n`);

  // Échauffement. Le premier rendu remplit les caches partagés (chapitre
  // courant, classement, analyse) : le mesurer reviendrait à imputer au
  // serveur le coût d'un cache vide, qui n'arrive qu'une fois.
  process.stdout.write('Échauffement…\n');
  await palier(8, ECHAUFFEMENT_MS, CHEMINS);

  process.stdout.write(
    '\nclients   servies   échecs      rps         p50         p90         p99         max   statuts\n',
  );
  process.stdout.write('-'.repeat(104) + '\n');

  const resultats = [];
  for (const concurrence of PALIERS) {
    const r = await palier(concurrence, SECONDES * 1000, CHEMINS);
    resultats.push(r);

    const statuts = [...r.statuts.entries()].map(([cle, n]) => `${cle}:${n}`).join(' ');

    process.stdout.write(
      `${String(r.concurrence).padStart(7)} ${String(r.servies).padStart(9)} ` +
        `${String(r.echecs).padStart(8)} ${r.rps.toFixed(0).padStart(8)} ` +
        `${ms(r.p50)} ${ms(r.p90)} ${ms(r.p99)} ${ms(r.max)}   ${statuts}\n`,
    );

    // Respiration entre deux paliers : sans elle, le suivant démarre pendant
    // que le précédent vide ses files, et les deux mesures se contaminent.
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }

  // --- Lecture -------------------------------------------------------------
  //
  // Le débit retenu est celui du meilleur palier **sans aucun échec**. Un
  // palier qui refuse des connexions n'a pas de débit : il a un point de
  // rupture, ce qui est une autre information et se dit autrement.
  const sains = resultats.filter((r) => r.echecs === 0);
  const rompus = resultats.filter((r) => r.echecs > 0);

  process.stdout.write('\n');

  if (sains.length === 0) {
    process.stdout.write('Aucun palier n’a tenu sans échec.\n');
    return;
  }

  const meilleur = sains.reduce((a, b) => (b.rps > a.rps ? b : a));
  process.stdout.write(
    `Débit soutenu sans échec : ${meilleur.rps.toFixed(0)} req/s ` +
      `à ${meilleur.concurrence} clients (p90 ${meilleur.p90.toFixed(0)} ms, ` +
      `${meilleur.ko.toFixed(0)} Ko par page).\n`,
  );

  if (rompus.length > 0) {
    process.stdout.write(
      `Point de rupture : dès ${rompus[0].concurrence} clients, ${rompus[0].echecs} requêtes ` +
        `refusées.\nC'est la file d'acceptation du processus qui déborde, pas l'application ` +
        `qui échoue —\nle remède est d'ajouter des instances, pas d'optimiser le rendu.\n`,
    );
  }

  process.stdout.write(
    `\nÀ ${meilleur.rps.toFixed(0)} pages/s, une vague de 1 000 joueurs ouvrant la même page\n` +
      `est absorbée en ${(1000 / meilleur.rps).toFixed(1)} s par une seule instance.\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exit(1);
});
