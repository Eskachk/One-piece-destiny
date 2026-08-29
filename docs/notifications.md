# Notifications

## Deux canaux, pas trois

**in-app** et **e-mail**. Le push n'existe pas : ni service worker, ni clé
VAPID, ni abonnement. Déclarer un canal qu'aucun code ne sert donnerait au
joueur une case à cocher sans effet — on l'ajoutera quand il y aura quelque
chose derrière.

## Un seul point d'entrée

Tout passe par `dispatch()`
([`src/lib/notifications/dispatch.ts`](../src/lib/notifications/dispatch.ts)).
C'est ce qui garantit que les préférences et les règles anti-spoiler
s'appliquent partout plutôt que d'être répétées — et donc oubliées quelque
part.

```
dispatch(playerId, draft, emailBuilder?)
   ↓
channelsFor(kind, preferences)      décision pure, testée
   ↓                    ↓
social.notify()     queueEmail()
(notification_keys) (email_outbox)
```

L'e-mail est construit par un **appelant explicite**, pas dérivé du brouillon
in-app : les deux formulations diffèrent, et surtout l'e-mail ne doit jamais
reprendre aveuglément un corps qui pourrait contenir un résultat. Sans
constructeur fourni, aucun e-mail ne part.

## Catégories

| Catégorie | Contenu | Par défaut | Désactivable |
|---|---|---|---|
| `SECURITY` | mot de passe, MFA, codes de secours | actif | **non** |
| `WEEKLY` | verrouillage, résultats, correction | actif | oui |
| `REWARDS` | récompenses, coffres | actif | oui |
| `MARKETING` | nouveautés, annonces | **inactif** | oui |

**Le marketing est désactivé par défaut** : dans l'Union européenne, une
prospection par e-mail suppose un consentement préalable, et un consentement ne
se présume pas. Les autres catégories relèvent du service, pas de la
prospection.

**Les alertes de sécurité partent toujours**, sur les deux canaux. Un joueur ne
doit pas pouvoir se rendre aveugle à la prise de contrôle de son propre compte,
et un attaquant disposant d'une session ne doit pas pouvoir éteindre l'alarme
avant d'agir. L'interface ne montre pas d'interrupteur grisé — une phrase
explique la règle, plutôt que de laisser croire qu'elle pourrait s'ouvrir.

## Anti-spoiler

Règle produit, appliquée **côté serveur** et jamais côté client.

Avant publication, aucune notification ne peut mentionner un score, une
apparition ou un personnage. `resultsComputing` est volontairement muet, et son
libellé vit dans le domaine — pas dans la tâche planifiée — pour qu'on ne
puisse pas l'enrichir par mégarde depuis l'infrastructure.

Autorisé avant publication : « Les résultats sont en cours de calcul. »
Interdit : tout le reste.

## Rendez-vous hebdomadaire

[`src/lib/jobs/weekly.ts`](../src/lib/jobs/weekly.ts), déclenché par
`POST /api/jobs/weekly` toutes les heures.

| Phase | Condition | Notification | E-mail |
|---|---|---|---|
| Rappel | moins de 6 h avant l'échéance | `CREW_LOCK_SOON` | oui |
| Verrouillé | échéance passée, aucune apparition saisie | `CREW_LOCKED` | non |
| Calcul | échéance passée, apparitions saisies | `RESULTS_COMPUTING` | non |
| Résultats | publication (action admin) | `RESULTS_READY` | oui |
| Récompense | publication (action admin) | `REWARD_RECEIVED` | oui |
| Alerte de prix | seuil franchi sur la watchlist | — (e-mail seul) | oui |

Les confirmations d'état ne partent pas par e-mail : elles décrivent quelque
chose que le joueur peut consulter, et ne valent pas un message dans sa boîte.

**Ces trois premiers brouillons existaient depuis le début du projet mais
n'étaient appelés nulle part** : la moitié de la boucle de rétention décrite au
cahier n'avait aucun émetteur. La tâche hebdomadaire est ce qui leur donne un
déclencheur.

## Idempotence

Chaque brouillon porte une `dedupeKey` indexée sur le chapitre et le joueur,
sous contrainte `UNIQUE` dans `notification_keys`. Rejouer la tâche cent fois
n'envoie qu'une notification par joueur et par phase.

## Protection contre l'IDOR

Le joueur visé **n'est jamais un paramètre de requête** : il vient de la
session. Aucune requête ne peut donc lire les notifications d'autrui ni
modifier ses préférences, quoi qu'elle contienne.

## Exploitation

```bash
curl -X POST https://$APP_URL/api/jobs/weekly -H "Authorization: Bearer $JOB_SECRET"
```
