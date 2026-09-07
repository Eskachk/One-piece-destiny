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

Tranche d'âge à cocher : **18 ans et plus**, uniquement.

Trois raisons, et la première est bloquante :

1. **Une TWA est incompatible avec une application ciblant les moins de
   13 ans.** L'outil de Google l'a signalé pendant la construction du paquet.
2. Ton propre code réserve les achats aux comptes majeurs.
3. Cocher une tranche mineure déclenche les règles « Play pour les familles » :
   examen renforcé, restrictions publicitaires, et interdiction pratique des
   coffres aléatoires payants.

Question suivante : **« Votre application attire-t-elle involontairement les
enfants ? »** → **Non**, puis coche que tu n'utilises ni personnage animé
enfantin ni thème enfantin comme argument principal.

> **Un point à trancher, et il t'appartient.** Ta page de confidentialité
> annonce un âge minimum de 13 ans avec accord parental en dessous. Cibler
> 18+ sur le Play Store est cohérent avec les achats, mais divergent du site.
> Soit tu alignes le site sur 18 ans, soit tu assumes que l'application
> Android est réservée aux majeurs alors que le site accepte 13 ans. La
> seconde option est tenable, la première est plus propre.

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

- **Type d'application** : Jeu
- **Catégorie** : Trivia — c'est un jeu de pronostics. « Occasionnels » est un
  repli acceptable ; évite « Cartes », qui désigne les jeux de cartes à jouer.
- **Tags** : jeu de pronostics, collection, classement (3 maximum)

Coordonnées, affichées publiquement sur la fiche :

- **E-mail** : `skytheforz2@gmail.com` (obligatoire)
- **Site Web** : `https://one-piece-quest.vercel.app`
- **Téléphone** : facultatif — laisse vide, il serait public

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
