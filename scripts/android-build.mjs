#!/usr/bin/env node
/**
 * Construit et signe l'application Android (APK + AAB).
 *
 *   node scripts/android-build.mjs
 *
 * ## Pourquoi ce script existe, plutôt que `bubblewrap build`
 *
 * `bubblewrap build` échoue sur ce projet, et le message ne dit pas pourquoi :
 *
 *     ERROR Command failed: gradlew.bat assembleRelease --stacktrace
 *     'gradlew.bat' n'est pas reconnu en tant que commande interne
 *
 * L'outil lance `gradlew.bat` par un shell en concaténant les arguments sans
 * les protéger — il le signale lui-même par un `DeprecationWarning`. Le chemin
 * de ce projet contient des espaces (« op quest-… »), la ligne de commande est
 * coupée au premier, et Windows cherche une commande qui n'existe pas. Rien
 * dans le message ne mentionne les espaces ; on croit à un Gradle mal installé.
 *
 * ## Et pourquoi il n'appelle aucun fichier `.bat`
 *
 * Le réflexe — relancer `gradlew.bat` soi-même en passant les arguments dans
 * un tableau — échoue autrement :
 *
 *     spawnSync …ndroid\gradlew.bat EINVAL
 *
 * Depuis Node 18 (correctif CVE-2024-27980), Windows refuse de lancer un
 * `.bat` ou un `.cmd` sans `shell: true`. Or `shell: true` nous ramènerait
 * exactement au problème d'origine : la ligne de commande repasserait par
 * `cmd`, qui la recouperait sur les espaces du chemin.
 *
 * La sortie est de sauter l'enveloppe : `gradlew.bat` et `apksigner.bat` ne
 * font rien d'autre que lancer un `.jar` avec `java`. On lance donc
 * `java.exe` — un vrai exécutable, que Node accepte sans shell — avec ce que
 * ces scripts auraient passé. `zipalign.exe` et `jarsigner.exe` sont déjà de
 * vrais exécutables et s'appellent tels quels.
 *
 * Ce script fait donc les deux étapes que `bubblewrap build` enchaîne, mais en
 * appelant chaque outil directement, avec les arguments passés en tableau —
 * jamais concaténés dans une chaîne :
 *
 *   1. Gradle : `assembleRelease` et `bundleRelease` ;
 *   2. signature : `zipalign` puis `apksigner` pour l'APK, `jarsigner` pour
 *      l'AAB, avec les mêmes algorithmes que Bubblewrap (SHA256withRSA,
 *      empreinte SHA-256).
 *
 * L'ordre `zipalign` **avant** `apksigner` n'est pas négociable : aligner un
 * paquet déjà signé invalide la signature, et Android refuse l'installation
 * avec un message qui ne parle pas d'alignement.
 *
 * ## Deux autres pièges de cette machine, réglés ici
 *
 * Le JDK 17 que Bubblewrap télécharge est un binaire **32 bits**
 * (`OpenJDK Client VM … emulated-client`). Son espace d'adressage plafonne
 * bien en dessous des 1536 Mo que `gradle.properties` réclame par défaut, et
 * Gradle meurt sur « Could not reserve enough space for 1572864KB object
 * heap » — y compris avec 18 Go de mémoire libre. Le message désigne l'espace
 * d'adressage du processus, pas la RAM ; c'est ce qui rend le diagnostic
 * trompeur. `android/gradle.properties` est donc réglé sur 1024 Mo.
 *
 * Les licences du SDK Android doivent avoir été acceptées une fois :
 *
 *   "$ANDROID_HOME/tools/bin/sdkmanager.bat" --sdk_root="$ANDROID_HOME" --licenses
 *
 * ## Mot de passe de la clé
 *
 * Lu dans `BUBBLEWRAP_KEYSTORE_PASSWORD`, ou à défaut dans
 * `android/CLE-A-CONSERVER.txt`. Il n'est jamais écrit dans la ligne de
 * commande — celle-ci est visible dans la liste des processus du système.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ANDROID = join(RACINE, 'android');

function lireConfigBubblewrap() {
  const fichier = join(homedir(), '.bubblewrap', 'config.json');
  if (!existsSync(fichier)) {
    throw new Error(
      "Bubblewrap n'est pas configuré (~/.bubblewrap/config.json absent).\n" +
        'Lance d\'abord : npm run android:init',
    );
  }
  return JSON.parse(readFileSync(fichier, 'utf8'));
}

function motDePasse() {
  if (process.env.BUBBLEWRAP_KEYSTORE_PASSWORD) {
    return process.env.BUBBLEWRAP_KEYSTORE_PASSWORD;
  }
  const memo = join(ANDROID, 'CLE-A-CONSERVER.txt');
  if (existsSync(memo)) {
    const trouve = readFileSync(memo, 'utf8').match(/Mot de passe\s*:\s*(\S+)/);
    if (trouve) return trouve[1];
  }
  throw new Error(
    'Mot de passe de la clé introuvable.\n' +
      'Renseigne BUBBLEWRAP_KEYSTORE_PASSWORD, ou garde android/CLE-A-CONSERVER.txt.',
  );
}

/**
 * Lance un exécutable en passant les arguments **en tableau**.
 *
 * C'est tout l'enjeu : un tableau est transmis au processus tel quel, sans
 * passer par un shell qui recouperait sur les espaces. C'est exactement ce
 * que `bubblewrap build` ne fait pas, et la raison de son échec ici.
 */
function executer(commande, args, options = {}) {
  const r = spawnSync(commande, args, {
    cwd: ANDROID,
    stdio: options.silencieux ? 'pipe' : 'inherit',
    encoding: 'utf8',
    ...options,
  });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    if (options.silencieux) process.stderr.write(`${r.stdout ?? ''}${r.stderr ?? ''}`);
    throw new Error(`Échec : ${commande} (code ${r.status})`);
  }
  return r;
}

async function principal() {
  const config = lireConfigBubblewrap();
  const jdk = config.jdkPath;
  const sdk = config.androidSdkPath;
  const { readdirSync } = await import('node:fs');
  const base = join(sdk, 'build-tools');
  if (!existsSync(base)) {
    throw new Error(
      `Build-tools absents (${base}).\nAccepte les licences puis relance :\n` +
        `  "${join(sdk, 'tools', 'bin', 'sdkmanager.bat')}" --sdk_root="${sdk}" --licenses`,
    );
  }
  const bt = join(base, readdirSync(base).sort().pop());
  const mdp = motDePasse();
  const env = { ...process.env, JAVA_HOME: jdk, ANDROID_HOME: sdk, ANDROID_SDK_ROOT: sdk };

  const java = join(jdk, 'bin', 'java.exe');

  console.log('→ Gradle : assembleRelease + bundleRelease');
  // Ce que `gradlew.bat` exécute, sans passer par `gradlew.bat`.
  executer(
    java,
    ['-Dorg.gradle.appname=gradlew', '-classpath',
     join(ANDROID, 'gradle/wrapper/gradle-wrapper.jar'),
     'org.gradle.wrapper.GradleWrapperMain',
     'assembleRelease', 'bundleRelease', '--no-daemon'],
    { env },
  );

  const apkNu = join(ANDROID, 'app/build/outputs/apk/release/app-release-unsigned.apk');
  const aabNu = join(ANDROID, 'app/build/outputs/bundle/release/app-release.aab');
  const aligne = join(ANDROID, 'app-release-aligned.apk');
  const apk = join(ANDROID, 'app-release-signed.apk');
  const aab = join(ANDROID, 'app-release-bundle.aab');

  console.log('→ zipalign (avant signature, jamais après)');
  rmSync(aligne, { force: true });
  executer(join(bt, 'zipalign.exe'), ['-f', '-p', '4', apkNu, aligne], { env, silencieux: true });

  console.log('→ apksigner');
  rmSync(apk, { force: true });
  executer(
    java,
    ['-jar', join(bt, 'lib', 'apksigner.jar'), 'sign', '--ks', join(ANDROID, 'android.keystore'), '--ks-key-alias', 'android',
     '--ks-pass', `pass:${mdp}`, '--key-pass', `pass:${mdp}`, '--out', apk, aligne],
    { env, silencieux: true },
  );
  rmSync(aligne, { force: true });
  rmSync(`${aligne}.idsig`, { force: true });

  console.log('→ jarsigner (AAB)');
  rmSync(aab, { force: true });
  executer(
    join(jdk, 'bin', 'jarsigner.exe'),
    ['-sigalg', 'SHA256withRSA', '-digestalg', 'SHA-256',
     '-keystore', join(ANDROID, 'android.keystore'), '-storepass', mdp, '-keypass', mdp,
     '-signedjar', aab, aabNu, 'android'],
    { env, silencieux: true },
  );

  console.log('→ vérification de la signature');
  const v = executer(
    java,
    ['-jar', join(bt, 'lib', 'apksigner.jar'), 'verify', '--print-certs', apk],
    { env, silencieux: true },
  );
  const empreinte = (v.stdout.match(/SHA-256 digest:\s*([0-9a-f]{64})/i) ?? [])[1];

  console.log('\nTerminé.');
  console.log(`  APK (téléphone)   : ${apk}`);
  console.log(`  AAB (Play Store)  : ${aab}`);
  if (empreinte) {
    const formatee = empreinte.toUpperCase().match(/../g).join(':');
    console.log(`\nEmpreinte de la clé locale :\n  ${formatee}`);
    console.log(
      '\nElle ne suffit pas seule : ajoute aussi celle de la signature Play\n' +
        '(console Play → Intégrité de l\'application), puis :\n' +
        `  node scripts/assetlinks.mjs "${formatee}" "<empreinte Play>"`,
    );
  }
}

principal().catch((erreur) => {
  console.error(`\n${erreur.message}`);
  process.exitCode = 1;
});
