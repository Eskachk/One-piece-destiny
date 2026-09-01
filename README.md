# One Piece Quest — Grand Line Weekly

> Le chapitre est le spectacle. Ta prédiction est le jeu.

Prototype **Phase 0** du cahier des charges : la boucle hebdomadaire de
prédiction, son moteur de score versionné et le verrouillage serveur.

## Démarrer

```bash
npm install
npm run dev
```

```bash
npm test
```

> ⚠️ Ne lance pas `npm run build` pendant que `npm run dev` tourne sur une
> version antérieure à celle-ci : les deux écrivaient dans `.next` et le build
> effaçait les feuilles de style servies par le serveur de développement. Le
> site arrivait alors **entièrement sans CSS**, sans la moindre erreur. Réglé :
> la production écrit dans `.next-build` (voir `next.config.ts`).

## Documentation

| Sujet | Fichier |
|---|---|
| E-mails : fournisseur, file, réessais, gabarits | [docs/email.md](docs/email.md) |
| Notifications : canaux, préférences, anti-spoiler | [docs/notifications.md](docs/notifications.md) |
| Paiements — **non activés** | [docs/payments.md](docs/payments.md) |
| Sécurité et protection des mineurs | [docs/security.md](docs/security.md) |
| `MFA_ENCRYPTION_KEY` | [docs/mfa.md](docs/mfa.md) |
| Tâches planifiées (Vercel Cron) | [docs/cron.md](docs/cron.md) |
| Déploiement Vercel | [docs/deploiement.md](docs/deploiement.md) |
| **À faire avant l'ouverture au public** | [docs/lancement.md](docs/lancement.md) |
| Tenue en charge : chiffres et méthode | [docs/charge.md](docs/charge.md) |

Variables d'environnement : [`.env.example`](.env.example).

## Tâches planifiées

Configurées dans [`vercel.json`](vercel.json) — voir [docs/cron.md](docs/cron.md).
Ajouter `CRON_SECRET` aux variables d'environnement du projet Vercel ; la
plateforme l'envoie elle-même en `Authorization: Bearer`.

Déclenchement manuel :

```bash
curl -X POST $APP_URL/api/jobs/email -H "Authorization: Bearer $JOB_SECRET"
```

⚠️ Sur le plan **Hobby**, un cron ne tourne qu'une fois par jour. Les messages
urgents — réinitialisation, confirmation d'adresse, alerte de sécurité —
partent donc **immédiatement**, sans attendre le planificateur.

## État de vérification

Le parcours complet a été exercé **contre la base réelle** le 28 août 2026 :
inscription → équipage → promotion admin → MFA → ouverture de chapitre →
import des apparitions → simulation → publication → classement → coffres →
Market. Cinq défauts ont été trouvés et corrigés à cette occasion, tous
invisibles au build et aux tests unitaires (voir « Défauts trouvés en
conditions réelles »).

Second passage : déconnexion et révocation de session en base, inscription
d'un second joueur, **achat complet sur le Market** (acheteur débité, vendeur
crédité net de taxe, carte transférée, provenance tracée), refus de la
revente sous 24 h, watchlist et statistiques de prix.

Troisième passage : connexion avec **défi MFA** (session en attente sans
aucun droit, code accepté, rejeu refusé), correction d'un chapitre publié,
chiffrement opportuniste du secret TOTP.

Quatrième passage : file d'envoi des e-mails (mise en file, vidange, doublon
refusé par la contrainte), tâche hebdomadaire idempotente, **préférences qui
suppriment le bon canal** (3 notifications in-app, 2 e-mails), verrous des
routes de tâches et du webhook de paiement, vérification d'adresse à jeton
unique, alerte de prix, restrictions d'âge recalculées serveur.

Ce qui n'a **pas** encore été exercé : la fabrication par fragments, et tout
envoi réel d'e-mail — `EMAIL_MODE=development` journalise sans envoyer, faute
de clé de fournisseur.

## Base de données

Le projet Supabase **one-piece-quest** (`miqipdynwteealuxpnjd`, eu-central-1)
contient les 16 tables et les 24 personnages du référentiel.

Pour brancher l'application, copier `.env.example` vers `.env.local` et y
coller la clé `service_role` (dashboard Supabase → Project Settings → API
Keys). Sans ces variables, l'application tourne sur le dépôt en mémoire et
l'indique dans l'interface.

### Row Level Security

RLS est **actif sur les 16 tables**, en refus par défaut (`0003_rls.sql`).

La clé `anon` ne peut lire que trois tables — `characters`,
`character_relations`, `chapter_events` — et uniquement en lecture. Tout le
reste, y compris `user_accounts`, `sessions`, `wallets`, `teams` et
`team_scores`, répond `42501` en accès direct.

Deux verrous se superposent : les policies filtrent les lignes, et les
privilèges de table (`GRANT`) sont retirés là où aucun accès direct n'a de
raison d'exister. Si une policy trop permissive est ajoutée par erreur, le
second verrou tient encore.

`chapter_appearances` et `team_scores` restent fermés même après publication :
les exposer permettrait de lire les apparitions avant la sortie officielle et
viderait l'anti-spoiler du §3 de son sens.

> **Le linter Supabase signale 13 fois « RLS enabled, no policy » en niveau
> INFO. C'est le résultat voulu**, pas un défaut : une table sans policy est
> une table fermée. L'ajout d'une policy serait ici la régression.

**Aucune policy ne s'appuie sur `auth.uid()`.** L'authentification du produit
est maison (`user_accounts` + sessions serveur), pas Supabase Auth :
`auth.uid()` serait toujours NULL, et une policy qui s'y réfère donnerait une
illusion de cloisonnement par joueur. Le cloisonnement réel est appliqué côté
serveur par `requireSession()` et `requireAdmin()`.

> ⚠️ **La clé `service_role` contourne RLS par conception.** C'est ce qui
> permet à l'application de fonctionner, et c'est aussi pourquoi cette clé ne
> doit jamais quitter le serveur. RLS protège contre l'accès direct à la base,
> pas contre une faille du code serveur.

### Créer le premier administrateur

L'inscription crée toujours un compte `PLAYER`. Il n'existe pas d'écran pour
se promouvoir soi-même — ce serait une élévation de privilège offerte. La
promotion se fait en base, volontairement :

```sql
update user_accounts set role = 'ADMIN' where email = 'ton@adresse.tld';
```

Sans compte `ADMIN`, `/admin` répond 404 — pas 403, qui confirmerait
l'existence du panel.

À la première visite du Chapter HQ, un administrateur est **redirigé vers
`/admin/mfa`** et ne peut rien faire tant qu'il n'a pas activé sa double
authentification. Le QR code est rendu côté serveur : le secret ne transite
vers aucun service tiers.

Les dix codes de secours ne sont affichés **qu'une fois** — la base n'en garde
que des empreintes Argon2. Sans eux, un téléphone perdu ferme définitivement
l'accès au panel.

## Ce qui est implémenté

| Domaine | Cahier | État |
|---|---|---|
| Verrouillage dimanche 23:59:59, décidé serveur | §2.2, §76 | ✅ 14 tests |
| Fuseau + changements d'heure, stockage UTC | §2.2 | ✅ |
| Indépendance vis-à-vis de la sortie du chapitre | §2.2 | ✅ |
| Statuts `NORMAL` / `HIATUS` / `DELAYED`… | §4.2 | ✅ |
| Anti-spoiler (`SPOILER_LOCK` / `CHAPTER_REVEALED`) | §3 | ✅ |
| Moteur de score Base 0–50 / Synergy 0–30 / Risk 0–20 | §9 | ✅ 15 tests |
| Synergies à logique narrative | §9.2, §9.3 | ✅ |
| Risque récompensé, pari raté = 0 point | §10 | ✅ |
| Registre de versions du moteur | §78 | ✅ |
| Risk Meter d'équipe, sans spoiler | §11, §12 | ✅ |
| Schéma Postgres complet | §4, §74, §77, §83, §92, §93 | ✅ SQL |
| Home mobile-first + HUD + countdown | §54, §55, §59, §63 | ✅ |
| Palette « Grand Line Weekly » | §52 | ✅ |
| En-têtes de sécurité, `X-Powered-By` retiré | §84.2 | ✅ partiel |
| Hachage Argon2id, politique de mot de passe | §86 | ✅ 6 tests |
| Rate limit connexion par compte **et** par IP | §86, §98 | ✅ 7 tests |
| Sessions serveur, timeouts inactivité + absolu | §85 | ✅ 6 tests |
| Réauthentification sur action critique | §86 | ✅ |
| MFA administrateur TOTP (RFC 6238) | §86 | ✅ 20 tests |
| Codes de secours à usage unique, hachés | §86 | ✅ |
| Anti-rejeu du code TOTP | §86 | ✅ |
| Messages d'erreur génériques, anti-énumération | §86 | ✅ |
| Contrôle d'origine explicite (pas que SameSite) | §87 | ✅ |
| Contrôle d'accès identité → ressource → permission | §89 | ✅ |
| RLS refus par défaut + retrait des privilèges | §89, §90 | ✅ vérifié |
| Import rapide des apparitions + anomalies | §6.3, §7 | ✅ 12 tests |
| Calcul des résultats par lot, pick rates, percentile | §13, §17, §75 | ✅ 9 tests |
| Enregistrement d'équipage validé serveur | §88, §99 | ✅ |
| Chapter HQ + Health Dashboard | §5.1, §82 | ✅ |
| Réinitialisation de mot de passe, jeton à usage unique | §86 | ✅ 10 tests |
| Classement hebdomadaire + percentile | §17 | ✅ |
| Replay de performance post-chapitre | §65 | ✅ |
| Coffre d'inscription, garanties annoncées | §27, §30, §113 | ✅ 19 tests |
| Doublons convertis en fragments | §28, §29 | ✅ |
| Système de pitié transparent | §31 | ✅ |
| Sets de collection, récompenses cosmétiques | §33 | ✅ |
| Collection + Most wanted | §67, §68 | ✅ |
| RNG serveur, jamais côté client | §97 | ✅ |
| Coffres récurrents + boutique en Berries | §36, §72 | ✅ 13 tests |
| Fabrication par fragments | §29 | ✅ |
| Portefeuille à verrou optimiste | §93 | ✅ vérifié en base |
| Récompenses hebdomadaires idempotentes | §72, §92 | ✅ |
| Ouverture de coffre 3D, chargée à la demande | §56, §57 | ✅ 10 tests |
| Cérémonie premium pour les légendaires | §56, §61 | ✅ |
| Repli sans 3D si mouvement réduit ou pas de WebGL | §111 | ✅ |
| Divisions avec promotion/relégation sur série | §19 | ✅ 8 tests |
| Saisons, meilleurs N résultats retenus | §20 | ✅ 7 tests |
| Styles de joueur | §16 | ✅ 6 tests |
| Analyse post-chapitre | §64 | ✅ 6 tests |
| Classements spécialisés | §18 | ✅ 5 tests |
| Historique des prédictions, Captain's log | §66 | ✅ |
| Market : vente/achat à prix fixe, achat atomique | §35, §36, §45 | ✅ 28 tests |
| Taxe de transaction, puits de monnaie | §42 | ✅ vérifié en base |
| Bornes de prix, cooldowns, anti wash trading | §43 | ✅ |
| Historique des prix, variation hebdomadaire | §39 | ✅ vérifié en vrai |
| Watchlist, prix le plus bas et tendance | §41 | ✅ vérifié en vrai |
| Chapter Simulator avant publication | §80 | ✅ 19 tests |
| Détection d'anomalies, sévérités | §81 | ✅ |
| Correction de chapitre publié, journal et notification | §79 | ✅ |
| Notifications en application | §108 | ✅ |
| Commentaires, likes, signalement, masquage | §70 | ✅ 8 tests |
| Parrainage plafonné | §71 | ✅ 8 tests |
| Comptage assisté statistique | §7 | ✅ 10 tests |
| Secret TOTP chiffré au repos (AES-256-GCM) | §86 | ✅ vérifié en vrai |
| Désactivation MFA et régénération des codes | §86 | ✅ |
| Journal d'audit, champs et secrets filtrés | §100 | ✅ vérifié en vrai |
| Détection de comptes liés | §43 | ✅ |
| Coffre à choix de catégorie | §32 | ✅ 4 tests |
| Niveaux de personnage, strictement cosmétiques | §34 | ✅ 10 tests |
| Surveillance de la méta, personnage dominant | §13, §14 | ✅ |
| Missions, récompenses non compétitives | §73 | ✅ 15 tests |
| Share card générée côté serveur, sans score | §69 | ✅ |

### Décisions de conception notables

**Le risque ne paie que s'il aboutit.** Un personnage absent rapporte 0 de
bonus de risque, quelle que soit son improbabilité — sinon parier serait
gratuit. Le bonus est proportionnel à `improbabilité × performance réalisée`.

**Une synergie exige les deux extrémités présentes.** L'alliance Law–Luffy ne
rapporte rien si Luffy n'apparaît pas. C'est ce qui empêche le système de
dégénérer en « je coche des tags » (§9.3).

**La rareté n'entre jamais dans le score.** `rarity` sert la collection, pas la
puissance (§25). Le moteur ne lit pas ce champ.

**Un personnage absent rapporte exactement 0.** Y compris si ses relations
narratives sont toutes présentes dans le chapitre. Sans cette garde, parier sur
un personnage absent mais bien connecté rapportait des points de synergie.

**La home est rendue à chaque requête.** Un prérendu statique figerait
l'échéance au moment du build et viderait §76 de son sens.

### Défauts trouvés en conditions réelles

Aucun n'était visible au typecheck ni aux tests unitaires.

1. **Création de chapitre en course.** `getCurrentChapter` créait un chapitre
   quand la table était vide : deux rendus concurrents en ont créé deux en
   0,3 s. Corrigé à la racine — l'ouverture est désormais une action
   administrateur explicite, conforme au §4.1 qui veut que le numéro reste
   une proposition.

2. **Secret TOTP régénéré à chaque rendu.** Scanner le QR puis recharger la
   page rendait le secret caduc et l'activation impossible. Le secret en
   attente est maintenant réutilisé.

3. **Toutes les ouvertures de coffre plantaient.** `randomInt(0, 2**48)`
   dépasse d'exactement 1 la borne maximale de Node. Remplacé par
   `randomBytes(6)`, vérifié sur 200 000 tirages.

4. **Le classement devenait inaccessible après publication.** Un chapitre
   publié n'est plus « courant » : le joueur ne voyait jamais ses résultats.
   Ajout de `getLatestPublishedChapter`.

5. **Carte de partage vide.** Next ne transmet pas les paramètres de requête
   aux générateurs `opengraph-image` ; l'équipage est passé dans le chemin.

**L'aperçu d'import est calculé deux fois.** Une fois dans le navigateur pour
le confort, une fois sur le serveur au moment de valider. Ce que l'admin voit
n'engage rien (§99).

## Ce qui n'est pas fait

Le cahier repousse lui-même ces éléments (§117, §120) :

- **Échange direct (§44) et enchères (§45)** : repoussés, comme le demande
  le cahier §120.
- **Vérification d'adresse à l'inscription** et **alertes de prix (§41)** :
  implémentées. Voir [docs/email.md](docs/email.md).
- **Détection de comptes liés (§43)** : le signal est câblé dans la décision
  d'achat, mais sa source (IP, empreinte d'appareil) n'est pas implémentée —
  il vaut toujours .
- **Design sonore** (§61) : le silence avant révélation est en place, mais
  aucun son n'est joué — il n'y a pas d'assets audio.
- **Paiement en argent réel** (§94) : l'architecture est complète et testée
  (catalogue serveur, signature de webhook, idempotence, crédit atomique),
  mais **désactivée**. `PAYMENTS_ENABLED=false`, et le webhook répond 503 en
  annonçant la raison. L'activation reste suspendue à l'audit juridique du
  §122. Voir [docs/payments.md](docs/payments.md).
- **Push web / mobile** : aucun service worker, aucune clé VAPID. Les deux
  canaux implémentés sont l'in-app et l'e-mail ; déclarer un canal push sans
  rien derrière donnerait une case à cocher sans effet.
- **Changement d'adresse e-mail** : le parcours n'existe pas, donc le message
  correspondant non plus.
- **Vérification d'âge effective** : la date de naissance est déclarative.
  Un mineur qui saisit une fausse date passe — limite réelle, documentée
  dans [docs/security.md](docs/security.md).
- **Bascule effective sur Postgres** : les migrations sont appliquées et le
  dépôt Postgres est écrit, mais sans `.env.local` l'application reste en
  mémoire (`PERSISTENCE_MODE`) et tout est perdu au redémarrage.
- **Cloisonnement par joueur en base** : le refus par défaut empêche tout
  accès direct, mais il n'existe pas de policy « ce joueur ne voit que ses
  lignes » — inutile tant que seul le serveur lit la base, à revoir si un
  client attaque Supabase directement un jour.
- Le parcours inscription / connexion **n'a pas été exercé contre la base** :
  il exige la clé `service_role` que le développeur doit fournir. Ce qui est
  vérifié de bout en bout, c'est la chaîne origine → validation → politique de
  mot de passe → garde base, et la dégradation propre sans base.
- Le chemin de publication après verrouillage n'a pas encore été exercé de
  bout en bout : la garde est en place et `computeChapterResults` est testé,
  mais aucun chapitre réel n'a franchi l'échéance.
- **Reconnaissance d'image pour le comptage** : le §7 est couvert par une
  assistance **statistique** (moyenne des chapitres passés), pas par une
  lecture des pages — que le §122 interdit d'héberger de toute façon.
- Ouverture de coffre 3D (§56) — la 3D est réservée aux moments forts (§57)

> ⚠️ **Aucun fournisseur d'e-mail n'est branché** (`src/lib/mail.ts`). En
> développement le lien de réinitialisation est écrit dans le journal du
> serveur ; en production il n'est envoyé à personne. La fonctionnalité est
> complète côté logique, mais inopérante tant que ce port n'a pas
> d'implémentation réelle.

## Propriété intellectuelle

Ce dépôt ne contient **aucun visuel, scan ou page de manga**. Les personnages
sont représentés par des données textuelles saisies à la main (identifiant,
affiliations, liens narratifs).

Conformément au §122, une exploitation commerciale publique nécessite un
traitement sérieux des droits et un audit juridique préalable. Ce prototype
ne le remplace pas.

## Structure

```
src/
  domain/           logique pure, testée, sans dépendance framework
    types.ts
    risk.ts         Risk Meter (avant-chapitre, sans spoiler)
    chapter/lock.ts verrouillage serveur + état anti-spoiler
    scoring/        moteur versionné (v1.0.0) + registre
  data/             référentiel de 24 personnages (Phase 0)
  lib/              accès serveur (chapitre courant)
  app/              Next.js App Router, rendu serveur
  components/       Countdown, CrewSelector
supabase/migrations/  schéma Postgres
```

Le dossier `domain/` ne dépend ni de React ni de Next : il est réutilisable
tel quel par les workers de calcul (§74, §75).
# One-piece-destiny
# One-piece-Quest
