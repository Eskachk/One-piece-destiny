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
| `public/.well-known/assetlinks.json` | Preuve que l'application et le site sont au même propriétaire. **À remplir, voir §5.** |
| `android/twa-manifest.json` | Configuration Bubblewrap (nom du paquet, couleurs, raccourcis). |
| `scripts/assetlinks.mjs` | Écrit `assetlinks.json` à partir des empreintes de clé. |

### Vérifier que le site est bien installable

Après déploiement, sur Chrome desktop : `F12` → onglet **Application** →
**Manifest**. La page doit afficher le nom, les icônes, et **aucune** ligne
rouge. Sur mobile, le menu Chrome doit proposer « Installer l'application ».

Si Chrome propose « Ajouter à l'écran d'accueil » plutôt qu'« Installer », un
critère manque — le plus souvent l'agent de service, ou une icône absente.
Bubblewrap produira quand même un paquet, mais le Play Store est susceptible
de le refuser.

---

## 3. Outils à installer une fois

- **Node 18+** — déjà présent (le projet tourne dessus).
- **JDK 17** — [Adoptium Temurin 17](https://adoptium.net/temurin/releases/?version=17).
  Bubblewrap le télécharge tout seul s'il ne le trouve pas ; l'installer
  d'avance évite un premier lancement de dix minutes.
- **Android SDK** — Bubblewrap l'installe également à la demande.

Rien à installer à la main pour Bubblewrap : les scripts npm l'appellent via
`npx`.

---

## 4. Créer le projet Android

```bash
npm run android:init
```

La commande pose une série de questions. Elle lit `android/twa-manifest.json`
pour les réponses par défaut, donc **accepter les valeurs proposées** est
correct, à trois exceptions près :

1. **Mot de passe de la clé de signature.** Il est demandé deux fois (clé et
   trousseau). Le noter immédiatement dans un gestionnaire de mots de passe :
   il n'est stocké nulle part, et sans lui on ne peut plus signer de mise à
   jour.
2. **Nom du paquet** (`app.opquest.twa`). Il est **définitif**. Une fois publié,
   il ne peut plus changer : le modifier crée une autre application, et les
   joueurs installés ne reçoivent jamais la mise à jour.
3. **Domaine.** `one-piece-quest.vercel.app`. Si un nom de domaine propre est
   acheté plus tard, il faudra republier l'application (voir §8).

Puis :

```bash
npm run android:build
```

Cela produit dans `android/` :

- `app-release-bundle.aab` — **le fichier à envoyer au Play Store** ;
- `app-release-signed.apk` — pour installer directement sur un téléphone et
  tester.

### Tester sur un vrai téléphone avant de publier

Copier l'APK sur le téléphone et l'installer (il faudra autoriser les sources
inconnues). À ce stade, **la barre d'adresse sera visible** : c'est normal,
`assetlinks.json` n'est pas encore rempli. C'est l'étape suivante.

---

## 5. Supprimer la barre d'adresse (Digital Asset Links)

C'est l'étape la plus souvent ratée, et la seule dont l'échec ne produit aucun
message d'erreur — juste une URL affichée en haut de l'écran.

Android télécharge `https://one-piece-quest.vercel.app/.well-known/assetlinks.json`
et y cherche l'empreinte de la clé qui a signé l'application installée. Il faut
donc **deux** empreintes, et c'est le piège :

1. **La clé locale**, celle créée à l'étape 4. Elle signe les APK installés à
   la main.

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
