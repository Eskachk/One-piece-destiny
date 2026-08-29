# Double authentification et `MFA_ENCRYPTION_KEY`

## Ce que fait la clé

`MFA_ENCRYPTION_KEY` chiffre les secrets TOTP **au repos**, dans la colonne
`user_accounts.mfa_secret`.

Sans elle, quiconque lit cette table — sauvegarde, export, accès en lecture à
la base — peut générer les codes à six chiffres de n'importe quel
administrateur. La double authentification n'en serait plus une.

| | |
|---|---|
| Algorithme | AES-256-GCM (chiffre **et** authentifie) |
| Dérivation | `scrypt(clé, "opq.mfa.v1", 32)` |
| Format stocké | `enc.v1.<iv>.<tag>.<chiffré>`, chaque partie en base64url |
| Implémentation | [`src/lib/auth/secret-box.ts`](../src/lib/auth/secret-box.ts) |

GCM authentifie : un secret modifié en base est **rejeté** au déchiffrement au
lieu d'être silencieusement accepté.

## Règles absolues

- **Ne jamais la regénérer** sur un environnement qui a déjà des comptes MFA.
  Les secrets existants deviendraient illisibles et tous les administrateurs
  seraient enfermés dehors.
- **Ne jamais la perdre** : même conséquence.
- **Ne jamais la journaliser.** Aucun code du projet ne l'affiche, même
  tronquée. `src/lib/env-check.ts` décrit les problèmes sans montrer la valeur.
- **Ne jamais la committer.** Elle vit dans `.env.local` (ignoré par git) et
  dans le gestionnaire de secrets de l'hébergeur.

## Où la stocker en production

`.env.local` couvre le développement local uniquement. En production, elle doit
venir du gestionnaire de secrets de la plateforme :

| Hébergement | Emplacement |
|---|---|
| Vercel | Project Settings → Environment Variables (marquer *Sensitive*) |
| AWS | Secrets Manager ou SSM Parameter Store (`SecureString`) |
| Fly.io | `fly secrets set MFA_ENCRYPTION_KEY=…` |
| Kubernetes | `Secret`, monté en variable d'environnement |
| Auto-hébergé | HashiCorp Vault, ou fichier hors dépôt en `0600` |

## Contrôle au démarrage

[`src/lib/env-check.ts`](../src/lib/env-check.ts) inspecte la configuration.
En production, un problème **fatal** empêche l'application de démarrer — mieux
vaut un déploiement qui échoue qu'un déploiement qui bloque les comptes.

Sont détectés : clé absente, plus courte que 32 caractères, espace en début ou
fin (cause classique du copier-coller, et qui change la clé dérivée),
saut de ligne (valeur tronquée).

## Migration opportuniste

Les secrets créés avant l'introduction du chiffrement sont **acceptés en
clair** et scellés au premier usage réussi (`verifySecondFactor`). Activer le
chiffrement n'a donc bloqué personne, et aucune manipulation n'a été
nécessaire.

`isSealed()` permet de vérifier l'avancement :

```sql
select count(*) filter (where mfa_secret like 'enc.v1.%') as chiffres,
       count(*) filter (where mfa_secret is not null)     as total
from user_accounts;
```

## Rotation future

Le préfixe `enc.v1.` est là pour ça : il **versionne le format**. Une rotation
non destructrice reste possible sans changer le schéma.

1. introduire `MFA_ENCRYPTION_KEY_PREVIOUS` ;
2. `open()` essaie la clé courante, puis l'ancienne ;
3. `seal()` n'utilise que la clé courante ;
4. les secrets migrent au fil des connexions, comme la migration ci-dessus ;
5. retirer l'ancienne clé une fois `enc.v1.` intégralement réécrit avec la
   nouvelle.

Cette rotation **n'est pas implémentée** : elle n'a pas lieu d'être tant qu'il
n'y a pas de raison de tourner, et l'architecture actuelle ne l'empêche pas.
Une rotation destructrice — regénérer la clé et repartir de zéro — n'est pas
une option : elle bloquerait tous les comptes MFA existants.
