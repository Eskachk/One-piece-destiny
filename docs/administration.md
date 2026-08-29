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

## Perdre son second facteur

```bash
node scripts/reset-mfa.mjs <email>
```

Efface le secret et le drapeau `mfa_enabled`. La prochaine visite de `/admin`
repropose l'inscription.

**C'est délibérément un script, pas un bouton.** Réinitialiser un second
facteur depuis l'interface en ferait une case à cocher : quiconque prend la
main sur une session ouverte le désactiverait. Ici il faut un accès à la base —
c'est-à-dire un niveau de compromission où la MFA n'était de toute façon plus
la dernière ligne de défense.

Les sessions en cours ne sont pas révoquées : la double authentification
protège l'entrée, pas la session ouverte. Les couper déconnecterait quelqu'un
qui n'a rien demandé.

### Un défaut corrigé au passage

`beginEnrollment` écrasait le secret en place et repassait `mfa_enabled` à
`false` lorsqu'il était appelé sur un compte **déjà protégé**. Ouvrir la page
d'inscription suffisait donc à désactiver silencieusement la double
authentification d'un administrateur et à rendre son application inutilisable.

La fonction refuse désormais. La page appelante testait déjà le cas, mais une
garde qui ne tient que dans l'appelant finit par sauter.

## L'onglet Administrateur

Il apparaît dans la barre de navigation **uniquement** pour le compte
autorisé. Ce n'est qu'un raccourci d'affichage : le contrôle réel est sur la
route (`requireAdmin`), qui exige le rôle en base *et* `ADMIN_EMAIL`, et
répond 404 sinon. Un joueur qui forcerait le booléen dans son navigateur
gagnerait un bouton, pas un accès.
