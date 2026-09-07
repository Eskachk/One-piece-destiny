# Console Play — réponse à chaque section

Les sections dans l'ordre de la console. Pour chacune : la réponse à donner, et
la raison quand elle n'est pas évidente.

Une règle générale avant de commencer : **ces formulaires sont des
déclarations.** Google les compare à ce que l'application fait réellement, et
un écart entraîne le retrait, pas une demande de correction. Ce document
s'appuie sur le code de ce dépôt ; relis-le quand même, c'est toi qui signes.

---

# A. Décrire le contenu de votre application

## 1. Règles de confidentialité

```
https://one-piece-quest.vercel.app/confidentialite
```

Colle cette URL telle quelle. La page est publique, lisible sans connexion —
c'est indispensable : le robot de Google la consulte sans session, et derrière
l'écran de connexion il verrait l'écran de connexion.

## 2. Informations de connexion (« App access »)

**C'est la section la plus souvent bâclée, et elle bloque l'examen.**

Réponse : **« Une partie ou l'intégralité de mon application est protégée par
des identifiants de connexion »**.

Presque tout ton jeu est derrière `requireSession` — pronostic, collection,
marché, boutique, profil. Sans identifiants, l'examinateur de Google ouvre
l'application, tombe sur l'écran de connexion, et **rejette la fiche pour
contenu inaccessible**. Le refus arrive au bout de plusieurs jours.

Ce que tu dois faire :

1. **Créer un compte de démonstration** sur le jeu (pas ton compte
   administrateur, et pas ton compte personnel : Google conserve ces
   identifiants et plusieurs personnes y accèdent).
2. Lui donner un peu de contenu — un équipage choisi, quelques cartes — pour
   que l'examinateur voie le jeu et non un compte vide.
3. Renseigner dans la console :
   - **Nom des identifiants** : `Compte de démonstration`
   - **Nom d'utilisateur** : l'adresse e-mail du compte
   - **Mot de passe** : celui du compte
   - **Toute autre information requise pour accéder à votre appli** :
     le texte ci-dessous, à coller tel quel.

Le champ « toute autre information » n'est pas décoratif. Il sert à éviter que
l'examinateur conclue à une application vide ou cassée : le classement de ce
jeu est **volontairement masqué** tant qu'un chapitre n'est pas publié, et rien
à l'écran ne distingue « pas encore révélé » de « ne fonctionne pas » pour qui
découvre le produit.

```
CONNEXION
Connexion par e-mail et mot de passe, avec les identifiants fournis ci-dessus,
depuis l'ecran d'accueil de l'application. Le bouton "Continuer avec Google"
n'est pas necessaire.

AUCUN OBSTACLE SUPPLEMENTAIRE
Ce compte n'a pas de validation en deux etapes, pas de code QR, pas de
restriction geographique, pas d'adhesion payante et pas de connexion
biometrique. Le nom d'utilisateur et le mot de passe suffisent.

CONNEXION INTERNET REQUISE
L'application affiche un site web securise (Trusted Web Activity). Sans reseau,
un ecran "Le Log Pose ne repond plus" s'affiche a la place du jeu : c'est le
comportement prevu, pas une erreur.

CE QUI PEUT RESSEMBLER A UN DEFAUT, ET N'EN EST PAS
1. Le classement hebdomadaire affiche "Les resultats du chapitre ne sont pas
   encore publies" tant que le chapitre en cours n'est pas sorti. C'est
   volontaire : le jeu ne revele aucun resultat avant la publication officielle
   du chapitre, pour ne pas divulguer son contenu.
2. Les equipages se verrouillent chaque dimanche a 23:59:59 (heure de Paris).
   Apres le verrouillage et jusqu'a la publication du chapitre, l'ecran
   principal montre l'equipage verrouille au lieu de la selection des
   personnages. Pour voir la selection en action, ouvrir l'application entre le
   lundi et le dimanche soir.
3. En Europe, un bandeau de consentement publicitaire de Google s'affiche au
   premier lancement. Il faut y repondre pour atteindre le jeu.

PARCOURS RECOMMANDE
Accueil (choix de 3 personnages) > Classement > Collection (ouverture d'un
coffre, probabilites affichees) > Marche > Boutique.
```

⚠️ **Désactive la double authentification sur ce compte**, sinon l'examinateur
reste bloqué au second facteur.

## 3. Annonces

Réponse : **« Oui, mon application contient des annonces. »**

Le script AdSense est chargé sur toutes les pages du site, donc dans
l'application. Répondre « non » alors qu'une régie tourne est un motif de
retrait — et c'est vérifiable automatiquement.

Google demandera ensuite d'ajouter la mention « Contient des annonces » sur la
fiche : accepte, c'est automatique.

## 4. Classification du contenu (questionnaire IARC)

- **Catégorie** : Jeu
- **Adresse e-mail** : `skytheforz2@gmail.com`

Réponses :

| Question | Réponse |
| --- | --- |
| Violence | Non |
| Sexualité, nudité | Non |
| Langage grossier | Non |
| Substances contrôlées | Non |
| **Achats intégrés** | **Oui** |
| **Éléments numériques aléatoires payants (loot boxes)** | **Oui** |
| **Les utilisateurs peuvent interagir entre eux** | **Oui** |
| **Partage du contenu généré par les utilisateurs** | **Oui** |
| **Thèmes liés au jeu d'argent, jeux d'argent simulés ou réels** | **Non** |
| **Achats numériques, récompenses convertibles ou NFT** | **Oui** — une seule case |
| **Échange d'articles entre joueurs avec une devise achetée en argent réel** | **Oui** |
| Partage de la position | Non |
| Informations personnelles partagées avec des tiers | Oui (régie publicitaire) |

Les trois « oui » en gras sont ceux qu'on est tenté d'éviter :

- **Loot boxes** : tes coffres tirent au hasard, et la monnaie qui les ouvre
  s'achète. La règle exige de le déclarer **et** d'afficher les probabilités
  avant l'achat — c'est fait, elles sont au rayon Coffres de la boutique.

### « Thèmes liés au jeu d'argent » : **Non**, et il ne faut pas confondre

C'est la question où l'on répond « oui » par prudence, et où c'est une erreur.
Le questionnaire IARC traite les coffres aléatoires dans une question
**séparée**, déjà cochée plus haut. Celle-ci porte sur le casino : machines à
sous, roulette, bingo, poker, mise d'une monnaie sur un résultat incertain,
ou simple imagerie de jeu d'argent.

Vérifié dans le code, aucun de ces éléments n'existe :

- aucune mécanique de casino — ni roulette, ni machine à sous, ni bingo, ni
  blackjack ;
- **aucune mise.** Le marché est à prix fixe (`§45 : pas d'enchères pour
  l'instant`), et rien ne permet d'engager des Berries sur un résultat
  incertain. Un pronostic ne coûte rien et ne peut rien faire perdre ;
- **aucune sortie en argent réel.** Les Berries entrent, ne ressortent pas :
  pas de retrait, pas de conversion. C'est la frontière qui sépare un jeu
  d'un service de jeu d'argent.

Deux occurrences peuvent inquiéter à la lecture du dépôt, aucune n'est une
mécanique :

- `jackpot` n'apparaît que dans le **simulateur de chapitre du Chapter HQ**,
  derrière `requireAdmin` : c'est l'étiquette du personnage au meilleur score.
- `poker` est un **nom de personnage** de One Piece — l'équipage de Kaido
  compte King, Queen, Jack et Poker.

Répondre « oui » ferait basculer la classification vers PEGI 18 / « contenu
de jeu d'argent », restreindrait la diffusion dans plusieurs pays, et
décrirait un jeu qui n'existe pas.

### « Achats numériques, récompenses convertibles ou NFT » : **Oui**, une case sur trois

Coche **« Achats de biens numériques »**, et **rien d'autre**.

| Case | Réponse | Pourquoi |
| --- | --- | --- |
| Achats de biens numériques | **Cocher** | La boutique vend des coffres, des Berries et des personnages en argent réel, via Stripe. |
| Récompenses convertibles en espèces | **Ne pas cocher** | Les Berries entrent et ne ressortent jamais. |
| Émission de ressources transférables (NFT) | **Ne pas cocher** | Aucune blockchain, aucun jeton. |

**Sur la deuxième case.** Le marché se règle **entre joueurs, en Berries** —
le code refuse un achat sur « Berries insuffisantes » et prélève la taxe de
10 % dans la même monnaie. Le vendeur reçoit des Berries, jamais de l'argent.
Aucun retrait, aucune carte cadeau, aucune cryptomonnaie, et le bonus de
parrainage est lui aussi versé en Berries. Il n'y a donc pas de
« play-to-earn » : on gagne de la monnaie de jeu, ce qui est le contraire d'un
revenu.

**Sur la troisième case, qui est la piegeuse.** Les cartes du jeu **sont**
échangeables entre joueurs, et on peut lire « ressources numériques
transférables » au sens large. Ce n'est pas ce que la question vise : le mot
« émission (par exemple la frappe) » et l'exemple « NFT » désignent
l'émission d'un jeton sur une chaîne de blocs. Le lire autrement obligerait
tout jeu à inventaire échangeable à se déclarer émetteur de NFT.

Rien dans le dépôt ne touche à une chaîne de blocs : `grep -i
"blockchain|crypto|nft|web3"` ne renvoie que `node:crypto` — le module
standard de tirage aléatoire — et `wallet`, qui désigne le portefeuille de
Berries. Les cartes sont des lignes de base de données, elles ne peuvent pas
quitter le jeu.

⚠️ `character_mint_counters` porte le mot « mint » et inquiète à la lecture.
C'est un **compteur de numéros de série** : il attribue à chaque carte son
rang de sortie, comme le tirage numéroté d'une carte à collectionner. Aucun
rapport avec la frappe d'un jeton.

**Ce qui changerait la réponse** : autoriser la revente de cartes contre de
l'argent réel, ou le retrait des Berries. Tant que la monnaie ne ressort pas
du jeu, une seule case.

### « Échange d'articles entre joueurs » : **Oui**

L'exemple donné par la question — « maison de vente aux enchères, bourse
d'articles » — décrit littéralement le Marché de la Grand Line.

La chaîne est complète, et chaque maillon est vérifiable dans le dépôt :

1. la boutique vend des Berries **en euros** : « Bourse de Berries » à 4,99 €
   pour 7 500 Berries, « Sac de Berries » à 19,99 € pour 36 000 ;
2. le marché se règle **en Berries** entre joueurs ;
3. donc un joueur peut acheter des Berries en argent réel et s'en servir pour
   obtenir la carte d'un autre joueur.

C'est exactement la formulation de la question : « une devise dans le jeu
**achetée avec de l'argent réel** ».

**Pourquoi on est tenté de répondre non**, et pourquoi ce serait faux : aucun
argent ne circule *entre les joueurs* — le vendeur reçoit des Berries, pas
des euros. Mais la question ne porte pas sur ce que reçoit le vendeur : elle
porte sur l'existence d'un système d'échange alimenté par une monnaie
achetable. Le fait que les Berries se gagnent **aussi** en jouant ne change
rien : il suffit qu'elles puissent s'acheter.

Cette réponse conforte le ciblage **18 ans et plus** (§5) : combinée aux
coffres aléatoires payants, elle décrit une économie que Google examine de
près et qu'il n'accepte pas pour un public mineur.
- **Interaction et contenu généré** : marché entre joueurs, ligues,
  commentaires de chapitre, pseudonymes visibles au classement.

  ⚠️ **Conséquence à connaître avant de répondre.** Déclarer du contenu
  généré par les utilisateurs engage la règle de Google sur ce contenu : elle
  exige un **moyen de signalement dans l'application** et une possibilité de
  **bloquer un autre utilisateur**.

  La table `comment_reports` existe bien en base — elle a été créée par la
  migration — mais **aucun code de l'application ne l'utilise** : ni bouton de
  signalement côté joueur, ni écran de modération côté administrateur.
  Vérifié : `grep comment_reports src/` ne renvoie rien.

  Répondre « non » pour éviter la contrainte serait une fausse déclaration,
  et les commentaires sont visibles dans l'application. La voie honnête est
  donc de répondre « oui » et de brancher le signalement avant de passer en
  production. C'est un risque de refus réel, pas théorique.

## 5. Cible et contenu (« Target audience »)

**Cocher uniquement « 18 ans et plus ».**

### La contrainte dure : jamais une tranche sous 13 ans

« 5 ans et moins », « 6-8 » et « 9-12 » sont exclues, et ce n'est pas une
question de prudence. L'outil de Google l'a annoncé pendant la construction du
paquet :

    WARNING: Trusted Web Activities are currently incompatible with
    applications targeting children under the age of 13.

S'y ajoutent les règles « Play pour les familles », qui interdisent en pratique
l'économie de ce jeu — coffres aléatoires payants et échange entre joueurs avec
une monnaie achetable.

### Pourquoi pas 13-15 ni 16-17

Cocher une tranche mineure **à côté** de 18+ fait de l'application un « public
mixte ». Google exige alors un **écran d'âge neutre au premier lancement**,
avant toute collecte et tout affichage d'annonce.

Le jeu n'en a pas. Vérifié : la date de naissance n'est **pas** demandée à
l'inscription — elle se renseigne plus tard depuis le profil, une seule fois
(`.is('birth_date', null)` empêche la réécriture). Un joueur qui vient de
s'inscrire est dans la tranche `UNKNOWN`.

Déclarer un public mixte engagerait donc à construire cette porte d'entrée, et
Google la vérifie.

### Ce que ce choix coûte, honnêtement

La console le prévient : « des restrictions de disponibilité supplémentaires ».
Concrètement, l'application n'apparaît pas aux comptes Google déclarés mineurs,
et certains pays imposent une vérification d'âge renforcée.

C'est un vrai coût : le lectorat de One Piece est largement adolescent. Et le
jeu est **déjà conçu pour eux** — la tranche `TEEN` peut jouer et utiliser le
marché, mais ne peut ni acheter en euros ni recevoir de prospection ; sans date
de naissance, les achats sont refusés par défaut. Le cloisonnement existe, il
manque seulement l'écran d'âge à l'inscription pour pouvoir le déclarer.

### Question suivante : « attire involontairement les enfants ? »

Réponse : **Non**.

⚠️ Attends-toi à ce que Google y regarde à deux fois. L'icône est un chapeau
de dessin animé, les cartes sont des figurines colorées, et l'univers est un
manga lu par des adolescents. Si l'examen conclut que la fiche attire les
enfants, il faudra soit retravailler les visuels de la fiche, soit accepter les
règles « familles » — incompatibles avec les coffres payants.

### Incohérence à régler

La page de confidentialité annonce un âge minimum de **13 ans**, et le code
prévoit un accord parental sous 16 ans (`PARENTAL_CONSENT_AGE = 16`). Déclarer
18+ sur le Play Store crée un écart entre ce que dit le site et ce que dit la
fiche. Deux sorties : aligner le site sur 18 ans, ou assumer que
**l'application Android** est réservée aux majeurs pendant que le site reste
ouvert à 13 ans. La seconde est tenable — ce sont deux canaux distincts — mais
elle doit être un choix, pas un oubli.

---

## 6. Sécurité des données

Tout le détail est dans `fiche.md`. Le résumé :

- Collecte ou partage de données : **Oui**
- Chiffrement en transit : **Oui**
- Suppression sur demande : **Oui**, `https://one-piece-quest.vercel.app/confidentialite`

Données à déclarer : adresse e-mail, ID utilisateur, autres informations
personnelles (date de naissance), historique des achats, actions dans
l'application, autres contenus générés, **et l'identifiant publicitaire —
collecté ET partagé, à des fins de publicité.**

Ne coche **pas** : informations de paiement (elles vont chez Stripe, jamais
chez toi), position géographique, contacts, photos, fichiers, micro, caméra.

## 7. Applis gouvernementales

**Non.** Cette section vise les applications publiées pour le compte d'une
administration. Le jeu n'a aucun rapport.

## 8. Fonctionnalités financières

**« Mon application ne fournit aucune fonctionnalité financière. »**

À ne pas confondre : cette section vise le crédit, la banque, l'assurance, les
cryptomonnaies et le placement. **Acheter des Berries n'en fait pas partie** —
c'est un achat intégré, déclaré ailleurs. Cocher une fonctionnalité financière
ici déclencherait des demandes de justificatifs réglementaires que tu ne
pourrais pas fournir.

## 9. Santé

**Aucune des cases.** Le jeu ne collecte aucune donnée de santé, ne fournit ni
conseil médical, ni suivi de forme physique, ni contenu sur la santé mentale.

---

# B. Gérer l'organisation et la présentation

## 10. Catégorie et coordonnées

- **Type d'application** : **Jeu**, pas Application. Le questionnaire de
  classification a déjà été rempli en tant que jeu ; les deux doivent
  concorder.
- **Catégorie** : **Grand public**.

### Pourquoi Grand public

« Occasionnels » n'existe pas dans la liste de Google. Son équivalent français
est **Grand public** — le mapping des tags le confirme : « Mini-jeux » et
« Jeux très grand public » y renvoient tous les deux.

Les dix-sept catégories disponibles sont : Action, Arcade, Aventure, Cartes,
Casino, Course, Culture générale, Grand public, Jeux de lettres, Jeux de rôles,
Jeux de société, Musique, Réflexion, Simulation, Sports, Stratégie, Éducatifs.
Il n'existe **aucune catégorie « pronostics »** ; deux seulement sont
plaidables.

| Catégorie | Pour | Contre |
| --- | --- | --- |
| **Grand public** | Décrit ce que le joueur fait : une session par semaine, un geste simple. Aucune contestation possible. | La catégorie la plus saturée du Store. |
| **Culture générale** | Rayon bien plus petit, donc bien plus visible. Les questions de chapitre existent vraiment. | S'appuie sur trois questions par semaine que le code appelle lui-même un à-côté. |

**À écarter absolument :** *Cartes* désigne les jeux où l'on **joue** des cartes
— ses tags sont Solitaire, Rami, Jeux de plis, Jeux de combats de cartes — or
ici on les collectionne. *Casino* contredirait frontalement le « Non » donné à
la question sur les jeux d'argent.

**La catégorie se change à tout moment**, sans renvoyer d'AAB : commencer par
Grand public et basculer plus tard n'engage rien.

### Tags

Chaque tag appartient à une ou plusieurs catégories, et la console ne propose
que ceux de la catégorie retenue. Avec **Grand public**, le vivier est mince —
c'est ainsi.

| Tag | Prendre ? |
| --- | --- |
| **Grand public** | **Oui.** Le seul qui décrit honnêtement le jeu. |
| Mini-jeux | Non : annonce un recueil de petits jeux indépendants. |
| Jeux très grand public | Non : désigne l'hyper-casual, un jeu à un doigt sans progression. |

Si la console autorise un tag hors catégorie, **Culture générale** est le seul
autre à être vrai : les questions de chapitre en sont.

**Ceux qu'il ne faut jamais prendre, et pourquoi :**

- **Casino, Poker, Machine à sous, Bingo, Black jack, Jeux de casino hybrides**
  — ils contrediraient le « Non » déjà donné à la question sur les thèmes de
  jeu d'argent. Une contradiction interne au questionnaire déclenche un examen
  manuel, au mieux.
- **Jeux de combats de cartes, Solitaire, Rami, Jeux de plis** — il n'y a aucun
  jeu **de** cartes ici : on en collectionne et on en échange.
- **Sports, Management sportif** — le pronostic porte sur un manga, pas sur une
  compétition sportive.

Un tag qui décrit mal le jeu ne coûte pas qu'un risque de refus : il place
l'application devant un public qui cherche autre chose, et ce public note mal.

## 11. Fiche Play Store

| Champ | Valeur |
| --- | --- |
| Nom de l'application | `One Piece Quest` |
| Description courte | voir `fiche.md` (74 caractères) |
| Description complète | voir `fiche.md` |
| Icône | `public/icons/icon-512.png` |
| Image de bandeau | `docs/play-store/bandeau-1024x500.png` |
| Captures téléphone | `docs/play-store/captures/*.png` (3 fournies, 3 à prendre) |
| Langue par défaut | Français (France) |

---

# C. Ce qui reste après

1. Envoyer `android/app-release-bundle.aab` en **test interne**.
2. Relever l'empreinte SHA-256 de la signature Play : **Test et publication →
   Intégrité de l'application → Signature d'application**.
3. La transmettre pour compléter `assetlinks.json` et redéployer. Sans cette
   étape, l'application distribuée par le Store affiche l'URL en haut de
   l'écran alors que l'APK installé à la main ne l'affiche pas.
4. Passer en production.
