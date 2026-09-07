# One Piece Quest sur le Play Store

Ce document décrit comment le site devient une application Android publiable,
et **pourquoi** chaque étape existe. Les étapes qui échouent en silence sont
signalées : ce sont celles qui coûtent une journée quand on les découvre après
publication.

---

## 1. Ce qu'on construit, et ce qu'on ne construit pas

One Piece Quest est un Next.js avec des routes serveur, une base Supabase, des
sessions par cookie et des tâches planifiées. **Il ne peut pas devenir une
application hors ligne** : sans serveur, il n'y a ni équipage, ni classement,
ni coffre. Toute approche qui prétendrait « compiler le jeu en application »
compilerait en réalité une coquille vide.

L'application publiée est donc une **TWA** (*Trusted Web Activity*), la voie
officielle de Google pour publier un site :

- l'application pèse environ 1 Mo — elle ne contient pas le jeu, elle l'ouvre ;
- elle affiche le site **plein écran, sans barre d'adresse**, avec l'icône et
  l'écran de démarrage d'une vraie application ;
- **elle se met à jour toute seule.** Un déploiement sur Vercel change ce que
  voient les joueurs, sans passer par la validation du Play Store. On ne
  republie l'application que pour changer son icône, son nom ou ses
  permissions.

Ce que la TWA n'apporte pas : accès natif aux capteurs, notifications push
(elles passent par les notifications web), fonctionnement hors ligne réel.

---

## 2. Ce qui a été ajouté au site

Tout est déjà en place dans le dépôt. Récapitulatif, pour savoir quoi
retoucher :

| Fichier | Rôle |
| --- | --- |
| `src/app/manifest.ts` | Le manifeste (`/manifest.webmanifest`). C'est la **seule** source dont part Bubblewrap. |
| `public/icons/` | Icônes 192 et 512, en version normale et *maskable*. |
| `public/sw.js` | Agent de service. Sans lui, Chrome ne déclare pas le site installable. |
| `public/offline.html` | Écran affiché quand le réseau manque. |
| `src/components/ServiceWorkerRegistration.tsx` | Enregistre l'agent, en production uniquement. |
| `public/.well-known/assetlinks.json` | Preuve que l'application et le site sont au même propriétaire. Porte l'empreinte locale ; **il manque celle de Google, voir §5.** |
| `android/twa-manifest.json` | Configuration Bubblewrap (nom du paquet, couleurs, raccourcis). |
| `scripts/assetlinks.mjs` | Écrit `assetlinks.json` à partir des empreintes de clé. |
| `scripts/android-build.mjs` | Compile et signe l'APK et l'AAB (voir §4). |
| `scripts/sw-desinstallation.js` | Filet de secours : désinstalle l'agent de service partout. |

### Vérifier que le site est bien installable

Après déploiement, sur Chrome desktop : `F12` → onglet **Application** →
**Manifest**. La page doit afficher le nom, les icônes, et **aucune** ligne
rouge. Sur mobile, le menu Chrome doit proposer « Installer l'application ».

Si Chrome propose « Ajouter à l'écran d'accueil » plutôt qu'« Installer », un
critère manque — le plus souvent l'agent de service, ou une icône absente.
Bubblewrap produira quand même un paquet, mais le Play Store est susceptible
de le refuser.

---

## 3. État actuel : l'application est déjà construite

Les étapes 3 et 4 de ce guide **ont été exécutées**. Sur cette machine se
trouvent déjà :

| Fichier | Usage |
| --- | --- |
| `android/app-release-signed.apk` | À installer directement sur un téléphone (1,8 Mo) |
| `android/app-release-bundle.aab` | À envoyer au Play Store (2,0 Mo) |
| `android/android.keystore` | La clé de signature. **Irremplaçable.** |
| `android/CLE-A-CONSERVER.txt` | Son mot de passe, à mettre à l'abri puis supprimer |

Identité du paquet, lue dans l'APK lui-même :

```
package: name='app.opquest.twa' versionCode='1' versionName='1.0.0'
application-label: 'One Piece Quest'
Verified using v1 scheme (JAR signing): true
Verified using v2 scheme (APK Signature Scheme v2): true
Verified using v3 scheme (APK Signature Scheme v3): true
```

Empreinte SHA-256 de la clé locale, déjà posée dans `assetlinks.json` :

```
20:EA:7E:81:60:80:20:39:0A:13:56:72:E6:71:BA:C8:35:3C:6A:C6:FD:D5:5E:D4:EA:91:88:12:9B:03:31:11
```

Pour reconstruire après un changement :

```bash
npm run android:build
```

---

## 4. Trois pièges de cette machine, et leurs correctifs

Ils sont documentés parce qu'aucun des trois ne dit ce qu'il est, et que les
trois reviendront sur une machine neuve.

### `bubblewrap build` ne fonctionne pas ici

```
ERROR Command failed: gradlew.bat assembleRelease --stacktrace
'gradlew.bat' n'est pas reconnu en tant que commande interne
```

L'outil lance Gradle par un shell en concaténant les arguments sans les
protéger. Le chemin du projet contient des espaces (« op quest-… »), la ligne
est coupée au premier, et Windows cherche une commande inexistante. Rien dans
le message ne parle d'espaces — on croit à un Gradle mal installé.

`npm run android:build` appelle donc [`scripts/android-build.mjs`](../scripts/android-build.mjs),
qui fait le même travail (Gradle, `zipalign`, `apksigner`, `jarsigner`) en
passant les arguments **en tableau**, jamais en chaîne. Le script n'invoque
aucun `.bat` : depuis Node 18, Windows refuse de lancer un `.bat` sans
`shell: true` (`spawnSync … EINVAL`), et `shell: true` ramènerait le problème
des espaces. Il appelle `java.exe` avec ce que ces `.bat` auraient passé.

### Le JDK téléchargé par Bubblewrap est en 32 bits

```
Error occurred during initialization of VM
Could not reserve enough space for 1572864KB object heap
```

Ce message est apparu avec **18 Go de mémoire libre**. Il ne parle pas de RAM
mais de l'espace d'adressage du processus : le JDK 17 installé par Bubblewrap
est un binaire 32 bits (`OpenJDK Client VM … emulated-client`), qui plafonne
bien en dessous des 1536 Mo demandés par défaut. `android/gradle.properties`
est donc réglé sur `-Xmx1024m`.

### Les licences du SDK doivent être acceptées séparément

Accepter la licence proposée par `bubblewrap init` ne suffit pas : les
*Build-Tools* en demandent une autre au moment de la compilation, et un refus
se traduit par un silencieux « Skipping following packages ». Une fois pour
toutes :

```bash
"$ANDROID_HOME/tools/bin/sdkmanager.bat" --sdk_root="$ANDROID_HOME" --licenses
```

(`ANDROID_HOME` vaut `~/.bubblewrap/android_sdk`.)

---

## 5. Supprimer la barre d'adresse (Digital Asset Links)

C'est l'étape la plus souvent ratée, et la seule dont l'échec ne produit aucun
message d'erreur — juste une URL affichée en haut de l'écran.

Android télécharge `https://one-piece-quest.vercel.app/.well-known/assetlinks.json`
et y cherche l'empreinte de la clé qui a signé l'application installée. Il faut
donc **deux** empreintes, et c'est le piège :

1. **La clé locale** (§3). Elle signe les APK installés à la main, et elle est
   **déjà en place** dans le fichier.

   ```bash
   npm run android:fingerprint
   ```

2. **La clé de signature Google Play.** Google resigne les paquets qu'il
   distribue, avec une clé qui lui appartient. Elle se lit dans la console
   Play : **Test et publication → Intégrité de l'application → Signature
   d'application → SHA-256**. Elle n'existe qu'**après** le premier envoi de
   l'`.aab`.

Ne poser que la première donne une application parfaite en test et une barre
d'adresse pour tous les joueurs venus de la boutique.

Une fois les deux en main :

```bash
node scripts/assetlinks.mjs \
  "AA:BB:…:FF" \
  "11:22:…:99"
```

Puis **déployer le site** — Android lit ce fichier en ligne, pas sur la
machine :

```bash
npx vercel --prod
```

Vérification :
<https://developers.google.com/digital-asset-links/tools/generator>

Sur le téléphone, désinstaller puis réinstaller l'application : la
vérification est faite à l'installation, pas à chaque lancement.

---

## 6. Publier sur le Play Store

1. **Compte développeur** — <https://play.google.com/console>, 25 $ une fois
   pour toutes. Compter quelques jours de vérification d'identité.
2. **Créer l'application**, envoyer `android/app-release-bundle.aab` sur un
   canal de **test interne** d'abord. C'est là qu'on récupère l'empreinte de
   signature Play (§5).
3. **Fiche du Play Store** — à préparer avant, Google bloque la publication
   tant qu'un champ manque :
   - icône 512 × 512 → `public/icons/icon-512.png` convient tel quel ;
   - image de bandeau 1024 × 500 ;
   - au moins 2 captures d'écran de téléphone (min. 320 px de côté) ;
   - description courte (80 caractères) et complète (4000) ;
   - **politique de confidentialité** accessible par URL — obligatoire dès
     qu'un compte utilisateur existe, ce qui est le cas ici ;
   - questionnaire de classification du contenu ;
   - déclaration de sécurité des données : le jeu collecte adresse e-mail et
     pseudo, il faut le déclarer.
4. **Une fois validé**, passer de test interne à production.

### Le point de vigilance

Google refuse les applications qui ne sont « qu'un site web dans un cadre »
(règle *Spam et fonctionnalité minimale*). Une TWA correctement faite passe —
c'est le format que Google recommande lui-même — à condition que :

- `assetlinks.json` soit vérifié (sinon la barre d'adresse trahit le
  navigateur) ;
- l'application ait une vraie icône et un écran de démarrage — c'est fait ;
- le site soit réellement conçu pour mobile.

---

## 7. Publier une mise à jour de l'application

**Dans l'immense majorité des cas, il n'y a rien à faire** : le contenu vient
du site, donc `npx vercel --prod` suffit et les joueurs voient la nouveauté au
lancement suivant.

Il faut republier l'application seulement pour changer son icône, son nom, ses
couleurs ou ses raccourcis. Dans ce cas, modifier `android/twa-manifest.json`,
**incrémenter `appVersionCode`** (le Play Store refuse deux envois avec le même
numéro), puis :

```bash
npm run android:update
npm run android:build
```

---

## 8. Si un nom de domaine propre est acheté

L'ordre compte, et se tromper laisse l'application publiée pointée sur une
adresse morte :

1. brancher le domaine sur Vercel et vérifier qu'il répond en HTTPS ;
2. mettre `APP_URL` à jour dans les variables d'environnement Vercel ;
3. remplacer `one-piece-quest.vercel.app` dans `android/twa-manifest.json`
   (`host`, `iconUrl`, `maskableIconUrl`, `webManifestUrl`, `fullScopeUrl`, et
   les `chosenIconUrl` des raccourcis) ;
4. régénérer `assetlinks.json` et le déployer **sur le nouveau domaine** ;
5. incrémenter `appVersionCode`, `npm run android:update && npm run android:build` ;
6. envoyer le nouvel `.aab`.

Garder l'ancien domaine actif jusqu'à ce que tous les joueurs aient reçu la
mise à jour : une application installée pointe sur le domaine gravé dans le
paquet.
