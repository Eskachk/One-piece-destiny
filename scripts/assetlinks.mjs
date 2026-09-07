#!/usr/bin/env node
/**
 * Écrit `public/.well-known/assetlinks.json` à partir d'empreintes de clé.
 *
 *   node scripts/assetlinks.mjs <SHA256:…> [<SHA256:…> …]
 *   node scripts/assetlinks.mjs --package com.opquest.app <SHA256:…>
 *
 * ## À quoi sert ce fichier, et ce qui casse sans lui
 *
 * L'application Android publiée sur le Play Store est une **TWA** : elle
 * n'embarque pas le jeu, elle ouvre le site dans un onglet Chrome sans
 * habillage. Pour qu'Android accepte de masquer la barre d'adresse, il faut
 * qu'il puisse vérifier que le site et l'application appartiennent bien à la
 * même personne. Il le fait en téléchargeant
 * `https://<domaine>/.well-known/assetlinks.json` et en y cherchant
 * l'empreinte de la clé qui a signé l'APK installé.
 *
 * Si le fichier est absent, mal formé, ou porte la mauvaise empreinte,
 * **l'application se lance quand même** — avec l'URL affichée en haut de
 * l'écran. C'est le seul symptôme, et il est facile de croire à un choix de
 * Chrome plutôt qu'à un fichier oublié.
 *
 * ## Il faut souvent DEUX empreintes, pas une
 *
 * C'est le piège du Play Store, et il ne se manifeste qu'après publication :
 *
 *   1. l'empreinte de la clé locale créée par Bubblewrap (`android.keystore`)
 *      — c'est elle qui signe les APK que l'on installe à la main pour
 *      tester ;
 *   2. l'empreinte de la clé de **signature d'application Google Play**, que
 *      Google génère de son côté et applique aux paquets distribués depuis la
 *      boutique. On la lit dans la console Play, section
 *      « Intégrité de l'application » → « Signature d'application ».
 *
 * Les deux sont différentes. Ne poser que la première donne une application
 * parfaite en test local et une barre d'adresse pour tous les joueurs venus du
 * Play Store. On met donc les deux dans le tableau.
 *
 * ## Où trouver l'empreinte locale
 *
 *   keytool -list -v -keystore android.keystore -alias android
 *
 * On copie la ligne « SHA256: » — les deux-points entre les octets compris.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CIBLE = resolve(RACINE, 'public/.well-known/assetlinks.json');

/** Nom de paquet par défaut : celui d'`android/twa-manifest.json`. */
const PAQUET_DEFAUT = 'app.opquest.twa';

/**
 * Une empreinte SHA-256 valide, et rien d'autre.
 *
 * La vérifier ici plutôt que sur l'appareil change la nature de l'erreur :
 * une faute de frappe devient un message immédiat, au lieu d'un déploiement
 * qui réussit et d'une barre d'adresse inexpliquée trois jours plus tard.
 */
const EMPREINTE = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/;

function normaliser(valeur) {
  const nettoyee = valeur.trim().replace(/^SHA-?256:\s*/i, '').toUpperCase();
  if (!EMPREINTE.test(nettoyee)) {
    throw new Error(
      `Empreinte invalide : « ${valeur} ».\n` +
        'Attendu : 32 octets hexadécimaux séparés par des deux-points, ' +
        'tels que les affiche `keytool -list -v`.',
    );
  }
  return nettoyee;
}

async function principal() {
  const args = process.argv.slice(2);
  let paquet = PAQUET_DEFAUT;
  const brutes = [];

  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--package') {
      paquet = args[i + 1];
      i += 1;
      if (!paquet) throw new Error('--package attend un nom de paquet.');
      continue;
    }
    brutes.push(args[i]);
  }

  if (brutes.length === 0) {
    throw new Error(
      'Aucune empreinte fournie.\n\n' +
        '  node scripts/assetlinks.mjs <SHA256> [<SHA256> …]\n\n' +
        'Empreinte locale :\n' +
        '  keytool -list -v -keystore android/android.keystore -alias android\n' +
        'Empreinte Play : console Play → Test et publication → Intégrité de ' +
        "l'application → Signature d'application.",
    );
  }

  const empreintes = [...new Set(brutes.map(normaliser))];

  const contenu = [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: paquet,
        sha256_cert_fingerprints: empreintes,
      },
    },
  ];

  await mkdir(dirname(CIBLE), { recursive: true });
  await writeFile(CIBLE, `${JSON.stringify(contenu, null, 2)}\n`, 'utf8');

  console.log(`Écrit : ${CIBLE}`);
  console.log(`Paquet : ${paquet}`);
  console.log(`Empreintes : ${empreintes.length}`);
  console.log(
    '\nIl reste à déployer le site : Android lit ce fichier en ligne, pas ' +
      'sur ta machine.\nVérification :\n' +
      '  https://developers.google.com/digital-asset-links/tools/generator',
  );
}

principal().catch((erreur) => {
  console.error(erreur.message);
  process.exitCode = 1;
});
