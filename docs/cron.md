# Tâches planifiées (Vercel Cron)

## Configuration

[`vercel.json`](../vercel.json) déclare deux tâches :

| Chemin | Cadence | Rôle |
|---|---|---|
| `/api/jobs/weekly` | `0 18 * * *` — chaque jour à 18 h UTC | Rappel de verrouillage, confirmation, calcul en cours, alertes de prix |
| `/api/jobs/email` | `0 6 * * *` — chaque jour à 6 h UTC | Vidange de la file d'envoi (rattrapage) |

Le fuseau des crons Vercel est **toujours UTC**, sans exception configurable.

## Le secret

Ajouter dans les variables d'environnement du projet Vercel :

```
CRON_SECRET=<chaîne aléatoire d'au moins 24 caractères>
```

Vercel l'envoie **automatiquement** en `Authorization: Bearer <CRON_SECRET>`.
Le nom de la variable et l'en-tête sont imposés par la plateforme.

`JOB_SECRET` reste accepté en parallèle, pour un déclencheur externe (GitHub
Actions, cron système) ou un appel manuel — et pour ne pas enfermer le projet
sur un seul hébergeur. Les deux sont comparés en temps constant.

Sans aucun des deux, les routes répondent **503** : une route de tâche sans
secret est une route ouverte.

## Pourquoi GET *et* POST

Les crons Vercel invoquent en **GET** ; on ne choisit pas la méthode. Un `GET`
avec effet de bord est inhabituel, et c'est assumé : c'est la contrainte de la
plateforme, et le jeton porteur reste exigé — la route n'est pas déclenchable
par une simple visite.

`POST` est conservé pour tout autre déclencheur.

## ⚠️ La contrainte du plan Hobby

**Sur Hobby, un cron ne peut tourner qu'une fois par jour**, et Vercel se
réserve de l'invoquer à n'importe quel moment dans l'heure indiquée. Une
expression plus fréquente **fait échouer le déploiement**.

Conséquence directe : une file vidée une fois par jour rendrait inutilisable
tout message dont le retard le vide de son sens — un lien de réinitialisation
vaut une heure.

**Contournement en place :** les messages urgents partent **immédiatement**,
sans attendre le planificateur.

| Message | Envoi |
|---|---|
| Réinitialisation de mot de passe | immédiat |
| Confirmation d'adresse | immédiat |
| Alerte de sécurité | immédiat |
| Verrouillage imminent, résultats, récompense, alerte de prix | file quotidienne |

L'envoi immédiat porte sur **un seul message**, jamais un lot : la raison
d'être de la file — ne pas faire attendre une publication qui notifie tous les
joueurs — reste intacte. Et il passe par la même réservation atomique, donc il
ne peut pas doubler un passage planifié.

La tâche quotidienne conserve son rôle de **rattrapage** : elle reprend ce qui
a échoué au premier essai.

### Passage en Pro

Remplacer les deux cadences dans `vercel.json` :

```json
{ "path": "/api/jobs/email",  "schedule": "* * * * *" }
{ "path": "/api/jobs/weekly", "schedule": "0 * * * *" }
```

L'envoi immédiat peut rester : il ne fait alors qu'accélérer ce que la file
aurait fait dans la minute.

## Concurrence et doublons

Vercel annonce explicitement deux comportements :

1. une invocation peut être **manquée** (erreur réseau transitoire) ;
2. une invocation peut être **jouée deux fois**, y compris en parallèle.

La file y résiste par une **réservation atomique** (`claim_emails`, avec
`for update skip locked`) : deux exécutions concurrentes prennent des lots
disjoints au lieu d'envoyer deux fois le même message.

> La `dedupe_key` ne couvrait pas ce cas : elle empêche deux *mises en file*,
> pas deux *envois* de la même ligne. C'est une distinction qui n'apparaît
> qu'en lisant les garanties réelles de la plateforme.

Un message réservé puis abandonné — fonction interrompue en plein vol —
repart après 10 minutes (`requeue_stale_claims`), sur la date de réservation
et non sur `next_attempt_at`, qui est par construction dans le passé.

Les notifications, elles, restent idempotentes par `dedupeKey` : rejouer la
tâche hebdomadaire cent fois n'envoie qu'une notification par joueur et par
phase.

**Vercel ne réessaie jamais une invocation en échec.** C'est pourquoi la
reprise vit dans la file, pas dans le planificateur.

## Vérifier

Dashboard → Settings → **Cron Jobs**, puis **View Logs** sur chaque tâche.

Manuellement :

```bash
curl -X POST https://$APP_URL/api/jobs/email -H "Authorization: Bearer $JOB_SECRET"
```

Attention : les crons **ne suivent pas les redirections**. Si un chemin
redirige, la tâche se termine sans rien faire — et un chemin inexistant produit
un 404 tout en étant compté comme exécuté.
