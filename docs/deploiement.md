# Déploiement (Vercel)

Projet : **`hhr1/one-piece-quest`** — relié au dépôt GitHub `Eskachk/One-piece-destiny`.

## Variables d'environnement

### Déjà posées (non sensibles)

`SUPABASE_URL` · `EMAIL_MODE=development` · `EMAIL_PROVIDER=resend` ·
`PAYMENTS_ENABLED=false` · `PAYMENT_MODE=test`

### À ajouter — secrets, par vous seul

Aucun agent ne doit lire `.env.local` : ces trois valeurs doivent être copiées
à la main, depuis votre machine vers le dashboard Vercel.

| Variable | Où la trouver | Conséquence si absente |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys | **Le serveur refuse de démarrer.** |
| `MFA_ENCRYPTION_KEY` | ⚠️ **exactement la même valeur que dans `.env.local`** | **Le serveur refuse de démarrer.** |
| `CRON_SECRET` | à générer (voir ci-dessous) | Les routes `/api/jobs/*` répondent 503. |

> ⚠️ **`MFA_ENCRYPTION_KEY` : la même valeur, impérativement.**
> La production et le développement partagent la **même base Supabase**. Une
> clé différente rendrait illisibles les secrets TOTP déjà chiffrés — les
> comptes administrateurs existants seraient définitivement bloqués.

```bash
# CRON_SECRET uniquement — jamais pour MFA_ENCRYPTION_KEY sur un
# environnement existant.
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

`APP_URL` n'est **pas** nécessaire : à défaut, les liens des e-mails utilisent
`VERCEL_PROJECT_PRODUCTION_URL`, que la plateforme fournit elle-même. Ne la
poser que pour un domaine personnalisé.

## Trois obstacles rencontrés, et leur cause

### 1. 254 Mo téléversés, déploiement en échec

Le CLI se rabat sur `.gitignore` quand `.vercelignore` est absent — ce repli
s'est révélé insuffisant : `node_modules` et les dossiers de build partaient
avec. [`.vercelignore`](../.vercelignore) les exclut explicitement.

### 2. « Output directory `.next` was not found »

Conséquence directe d'un correctif local. `distDir: '.next-build'` avait été
introduit pour qu'un `next build` local n'efface pas les feuilles de style du
serveur de développement — les deux écrivaient dans `.next`.

Vercel, lui, cherche `.next` à un emplacement figé. Le build réussissait, mais
écrivait ailleurs. La séparation ne s'applique donc plus que **hors Vercel** :

```ts
distDir: process.env.VERCEL || phase === PHASE_DEVELOPMENT_SERVER
  ? '.next'
  : '.next-build',
```

Un correctif local ne doit pas déborder sur l'hébergement.

### 3. « Vulnerable version of Next.js detected »

Vercel **refuse** de déployer une version de Next.js portant une faille
connue. Passage de `15.5.4` à `15.5.24` — dernier correctif de la même version
mineure. Next 16 existe, mais un saut majeur non testé en plein déploiement
n'était pas la bonne réponse à un blocage de sécurité.

## Le contrôle de configuration

`src/instrumentation.ts` exécute `assertEnvironment()` au démarrage du serveur.

Ce contrôle **existait mais n'était appelé nulle part** : la promesse « refuse
de démarrer sur une configuration invalide » était fausse. Un contrôle jamais
exécuté ne protège de rien.

Vérifié en production — journal du premier déploiement :

```
[env] FATAL MFA_ENCRYPTION_KEY — Absente. Les secrets TOTP déjà chiffrés
      deviendraient illisibles et les nouveaux seraient écrits en clair.
[env] FATAL SUPABASE_SERVICE_ROLE_KEY — Absente : l'application basculerait
      sur le dépôt en mémoire en production.
Failed to prepare server Error: Configuration invalide :
      MFA_ENCRYPTION_KEY, SUPABASE_SERVICE_ROLE_KEY.
```

Les variables manquantes sont nommées ; **aucune valeur de secret n'apparaît**.

## Mettre en production

Une fois les trois secrets ajoutés :

```bash
npx vercel deploy --prod
```

Puis vérifier :

- la page d'accueil répond 200 et **avec ses styles** ;
- **Settings → Cron Jobs** liste les deux tâches ;
- le journal de démarrage affiche `[env] configuration verifiee — 0 remarque(s).`

## La région des fonctions

`vercel.json` déclare `"regions": ["fra1"]` — Francfort. Ce n'est pas un
détail de confort.

Les fonctions tournaient par défaut dans `iad1`, en Virginie, pendant que la
base Supabase du projet est en `eu-central-1`, à Francfort. Chaque requête
vers la base traversait donc l'Atlantique dans les deux sens : environ 90 ms
de latence réseau pure par aller-retour, avant même que Postgres ne commence à
travailler. Une page qui enchaîne trois lectures payait un quart de seconde en
pur transport, et aucune optimisation de code n'y pouvait quoi que ce soit. Les
joueurs étant en France, le trajet navigateur → fonction franchissait lui aussi
l'Atlantique.

Une seule région est déclarée. En ajouter d'autres demanderait une base
répliquée, sans quoi on ne ferait que déplacer le problème d'un continent à
l'autre.

**Si la base déménage, cette ligne déménage avec elle.** Les deux doivent
rester dans la même région ; c'est la seule règle à retenir ici.

### Pourquoi cette explication est ici et pas dans le fichier

`vercel.json` est du JSON **strict**, validé contre un schéma fermé : il
n'admet ni commentaires, ni clés inconnues. Une clé `"//regions"` contenant
cette note a fait échouer le déploiement avec *« should NOT have additional
property `//regions` »* — le build s'arrête avant de commencer, sans journal,
et seule une tentative de redéploiement en ligne de commande donne le message.

## Avant d'ouvrir au public

- [ ] **Faire tourner la clé `service_role`** — elle a circulé pendant le
      développement. Voir [security.md](security.md).
- [ ] Audit juridique §122 — bloque les paiements réels.
- [ ] Clé Resend et domaine vérifié avant de passer `EMAIL_MODE=live`.
