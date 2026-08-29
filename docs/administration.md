# Chapter HQ — un seul administrateur (cahier §86, §89)

## Les deux verrous

L'accès à `/admin` exige **deux conditions indépendantes**, et c'est délibéré :

1. le compte porte le rôle `ADMIN` en base (`user_accounts.role`) ;
2. son adresse est **exactement** celle de la variable d'environnement
   `ADMIN_EMAIL`.

Le rôle seul ne suffit pas. Il vit dans une colonne : une restauration
d'ancienne sauvegarde, un `update` maladroit en console Supabase, une injection
SQL suffisent à en accorder un. `ADMIN_EMAIL`, elle, vit chez l'hébergeur, hors
d'atteinte de tout ce qui passe par l'application. Il faut donc compromettre les
deux, par deux chemins différents.

S'y ajoute la double authentification : un administrateur sans second facteur
est redirigé vers `/admin/mfa` plutôt que refusé — le refuser sèchement le
laisserait sans moyen de se mettre en conformité.

Un compte qui échoue à l'un de ces contrôles reçoit **404, pas 403**. Un 403
confirmerait l'existence du Chapter HQ à quelqu'un qui n'y a pas accès.

Si `ADMIN_EMAIL` est vide, le rôle décide seul. C'est acceptable en
développement ; `assertEnvironment` le signale en production.

## Désigner l'administrateur

```bash
node scripts/create-admin.mjs <email> [mot-de-passe]
```

Le script :

1. crée le joueur et le compte s'ils n'existent pas ;
2. accorde le rôle `ADMIN` à cette adresse ;
3. **retire le rôle `ADMIN` à toutes les autres.** C'est son intérêt principal :
   un seul compte administre le jeu, et les anciennes clés ne restent pas en
   circulation.

Sur un compte existant, **le mot de passe n'est pas réécrit** — le promouvoir ne
doit pas déconnecter quelqu'un qui s'en sert déjà. Deux exceptions : un mot de
passe passé en argument, et un compte ouvert par Google, qui n'en a aucun et ne
pourrait sinon jamais se connecter si Google tombait.

Sans argument, un mot de passe fort est tiré au sort et affiché **une seule
fois** : la base ne garde qu'une empreinte Argon2id, personne — pas même le
serveur — ne peut le relire ensuite.

Les identifiants Supabase sont lus dans `.env.local` et ne sont jamais
affichés, ni en clair, ni tronqués, ni en cas d'erreur.

## Après la désignation

Déclarer la variable dans l'environnement de déploiement :

```
ADMIN_EMAIL=<la même adresse>
```

Sur Vercel : Project Settings → Environment Variables → Production, puis
redéployer. Tant qu'elle n'y est pas, le second verrou n'existe pas en
production.
