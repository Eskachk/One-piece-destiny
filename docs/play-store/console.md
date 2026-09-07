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
   - **Toutes les autres instructions** :

     ```
     Connexion par e-mail et mot de passe depuis l'écran d'accueil.
     Le bouton « Continuer avec Google » n'est pas nécessaire.
     Le jeu nécessite une connexion internet.
     Les équipages se verrouillent le dimanche à 23:59:59 ; hors de cette
     fenêtre, l'écran de pronostic affiche l'équipage verrouillé plutôt que
     la sélection.
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
| Partage de la position | Non |
| Informations personnelles partagées avec des tiers | Oui (régie publicitaire) |

Les trois « oui » en gras sont ceux qu'on est tenté d'éviter :

- **Loot boxes** : tes coffres tirent au hasard, et la monnaie qui les ouvre
  s'achète. La règle exige de le déclarer **et** d'afficher les probabilités
  avant l'achat — c'est fait, elles sont au rayon Coffres de la boutique.
- **Interaction et contenu généré** : marché entre joueurs, ligues,
  commentaires de chapitre, pseudonymes visibles au classement. Google en
  déduira l'obligation d'un moyen de signalement — tu as déjà
  `comment_reports`.

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
