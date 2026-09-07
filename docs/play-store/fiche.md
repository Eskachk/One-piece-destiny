# Fiche Play Store — textes et réponses prêtes à coller

Tout ce qui suit est à recopier dans la console Play. Les champs sont dans
l'ordre où la console les demande.

**Un avertissement d'abord.** Les réponses du questionnaire « Sécurité des
données » sont une **déclaration**, pas une formalité : Google la compare à ce
que l'application fait réellement, et une déclaration fausse entraîne le
retrait de l'application. Celles ci-dessous ont été établies en lisant les
migrations et le code de ce dépôt. Relis-les quand même : c'est toi qui signes.

---

## Fichiers fournis

| Fichier | Champ de la console |
| --- | --- |
| `docs/play-store/bandeau-1024x500.png` | Image de bandeau (obligatoire) |
| `public/icons/icon-512.png` | Icône de l'application, 512 × 512 |
| `android/app-release-bundle.aab` | Le paquet à envoyer |

Les **captures d'écran** manquent, et je ne peux pas les produire : elles
demandent une session connectée avec une vraie progression. Voir la fin de ce
document.

---

## Coordonnées de l'application

- **Nom de l'application** (30 caractères max) : `One Piece Quest`
- **Catégorie** : Jeux → Trivia (ou Occasionnels)
- **Politique de confidentialité** :
  `https://one-piece-quest.vercel.app/confidentialite`

---

## Description courte (80 caractères max)

```
Devine qui apparaîtra dans le prochain chapitre. Classement chaque semaine.
```

*(74 caractères.)*

---

## Description complète (4 000 caractères max)

```
Le chapitre est le spectacle. Ta prédiction est le jeu.

Chaque semaine, avant la sortie du nouveau chapitre, tu choisis les 3
personnages que tu penses voir apparaître. Dimanche 23:59:59, les équipages se
verrouillent. À la publication, les points tombent — et le classement dit qui
avait lu entre les lignes.

CHOISIS TON ÉQUIPAGE
Trois personnages, pas un de plus. Un favori évident rapporte peu ; un pari
risqué qui tombe juste rapporte gros. Tout le jeu tient dans cet arbitrage, et
tu as une semaine pour en changer d'avis.

AFFRONTE LE CLASSEMENT
Classement hebdomadaire ouvert à tous, et ligues privées pour te mesurer aux
gens que tu connais. Rien n'est révélé avant la sortie officielle du chapitre :
aucun spoiler ne fuite par le jeu.

COLLECTIONNE LES PERSONNAGES
Les coffres délivrent des cartes de raretés différentes, et les probabilités
sont affichées avant l'ouverture — pas après. Les doublons se fondent en
fragments, les fragments se forgent en cartes que tu n'as pas encore.

ÉCHANGE SUR LE MARCHÉ
Un marché entre joueurs, avec ses prix, ses guetteurs et ses bonnes affaires.
Surveille une carte, place ton offre, revends au bon moment.

GAGNE DES BERRIES EN JOUANT
La monnaie du jeu s'obtient en jouant : pronostics justes, questions de
chapitre, connexions régulières. Les achats existent, ils font gagner du temps,
ils ne remplacent pas une bonne prédiction.

—

One Piece Quest est un jeu de fans, sans lien avec Eiichiro Oda, Shueisha ou
Toei Animation. Une connexion internet est nécessaire.
```

---

## Sécurité des données — réponses au questionnaire

### Question d'entrée

- L'application **collecte ou partage** des données utilisateur : **Oui**
- Les données sont **chiffrées en transit** : **Oui** (HTTPS partout, HSTS)
- L'utilisateur peut **demander la suppression** de ses données : **Oui**

### Données collectées

| Catégorie | Type | Collectée | Partagée | Obligatoire | Finalité |
| --- | --- | --- | --- | --- | --- |
| Informations personnelles | Adresse e-mail | Oui | Non | Oui | Gestion du compte, communications |
| Informations personnelles | ID utilisateur (pseudonyme) | Oui | Non | Oui | Gestion du compte, fonctionnalités |
| Informations personnelles | Autres (date de naissance) | Oui | Non | Oui | Contrôle de l'âge |
| Informations financières | Historique des achats | Oui | Non | Non | Gestion du compte |
| Activité dans l'application | Actions dans l'application | Oui | Non | Oui | Fonctionnalités de l'application |
| Activité dans l'application | Autres contenus générés | Oui | Non | Non | Fonctionnalités de l'application |
| ID de l'appareil ou autres | ID publicitaire | Oui | **Oui** | Non | **Publicité** |

**Le dernier point est celui qu'on oublie.** L'application affiche des annonces
Google AdSense : la régie lit l'identifiant publicitaire de l'appareil, et
c'est un **partage** avec un tiers. Ne pas le déclarer est le motif de retrait
le plus fréquent chez les applications qui monétisent par la publicité.

### Ce qu'il ne faut PAS cocher

- **Informations de paiement** : non collectées. Le numéro de carte va
  directement chez Stripe et ne transite jamais par le site.
- **Position géographique** : non collectée. L'adresse IP sert à la détection
  de fraude, pas à localiser — Google traite ces deux usages séparément.
- **Contacts, photos, fichiers, micro, caméra** : non. Ces autorisations sont
  refusées explicitement par le site (en-tête `Permissions-Policy`).

---

## Classification du contenu (questionnaire IARC)

Réponses attendues : pas de violence, pas de contenu sexuel, pas de grossièreté,
pas de drogue.

**Deux points appellent une réponse « oui », et ils ne sont pas optionnels :**

1. **Achats intégrés** — oui. Les Berries s'achètent.
2. **Éléments numériques aléatoires payants** (« loot boxes ») — **oui.** Les
   coffres délivrent des cartes tirées au hasard, et la monnaie qui les ouvre
   peut s'acheter. Google impose de le déclarer **et** d'afficher les
   probabilités. Le jeu les affiche déjà avant l'ouverture ; il faut le cocher
   quand même. Ne pas le faire est une infraction directe à la règle sur les
   achats intégrés.
3. **Interaction entre utilisateurs** — oui : marché entre joueurs, ligues,
   commentaires, pseudonymes visibles.
4. **Partage de la position** — non.

---

## Captures d'écran — à faire toi-même

Google en exige **au moins 2**, en 16:9 ou 9:16, côté le plus court ≥ 320 px.
Je ne peux pas les produire : les écrans qui valent la peine d'être montrés
demandent un compte connecté avec une progression réelle, et je ne vais ni
créer de compte ni utiliser le tien.

La méthode la plus simple, depuis ton téléphone, application installée :

1. ouvre l'application, connecte-toi ;
2. capture d'écran sur ces quatre écrans, dans cet ordre d'intérêt :
   - **l'écran de pronostic** avec 3 personnages choisis — c'est le jeu ;
   - **le classement** une fois des résultats publiés ;
   - **la collection**, qui montre les cartes et les raretés ;
   - **le marché**, ou l'ouverture d'un coffre.

Une capture de téléphone moderne fait 1080 × 2400 : elle passe telle quelle.

**Ce qu'il faut éviter** : une capture de l'écran de connexion (Google la juge
non représentative), et un classement où figurent les pseudonymes d'autres
joueurs si tu ne veux pas les publier.

---

## Une fois la fiche remplie

1. Envoyer `android/app-release-bundle.aab` en **test interne**.
2. Relever l'empreinte de la signature Play : **Test et publication → Intégrité
   de l'application → Signature d'application → SHA-256**.
3. Me la donner : je complète `assetlinks.json` et je redéploie. Sans cette
   étape, l'application distribuée par le Store affiche l'URL en haut de
   l'écran, alors que l'APK installé à la main ne l'affiche pas.
4. Passer de test interne à production.
