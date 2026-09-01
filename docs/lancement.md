# À faire avant l'ouverture au public

Trois choses ne peuvent pas être décidées dans le code : elles demandent une
valeur qui n'existe que dans un tableau de bord ou dans un calendrier. Tant
qu'elles ne sont pas renseignées, **le site fonctionne** — chacune se désactive
proprement plutôt que d'échouer à moitié.

## 1. La promotion de lancement

```
LAUNCH_AT=2026-09-15T10:00:00Z
```

Déclenche **−20 % sur les coffres pendant sept jours**, avec le bandeau en haut
de la boutique et les prix barrés. Les Berries et les personnages ne sont pas
remisés ; les probabilités des coffres ne changent pas.

La date est en UTC et compte à partir de l'instant exact indiqué. Elle est
laissée **vide** pour l'instant, délibérément : mettre une date au hasard
lancerait le compte à rebours immédiatement, et l'offre serait consommée avant
que quiconque soit là pour en profiter. C'est la seule variable de ce fichier
dont la bonne valeur dépend d'une décision qui n'est pas technique.

Pour vérifier avant l'heure : mettre une date passée de moins de sept jours,
recharger `/boutique`, le bandeau doit apparaître avec le bon nombre de jours
restants.

## 2. L'emplacement publicitaire

```
NEXT_PUBLIC_ADSENSE_SLOT_BANNER=1234567890
```

Le script AdSense est déjà chargé pour tout le site et identifie l'éditeur
(`ca-pub-9364111418812673`). L'**emplacement**, lui, se crée dans le tableau de
bord AdSense (Annonces → Par unité d'annonce → Display), qui donne un numéro à
dix chiffres : c'est celui-là.

Vide, le bandeau ne s'affiche pas du tout. C'est voulu : un numéro inventé ne
produit pas d'annonce mais un cadre vide qui décale la page pour rien.

Le bandeau apparaît en bas de l'accueil, du classement, de la collection, du
Marché et du profil. **Jamais** sur les écrans de connexion, ni à la boutique,
ni dans le poste de commandement — voir `src/components/AdSlot.tsx` pour le
raisonnement.

Une alternative existe et ne demande aucune variable : activer les **annonces
automatiques** dans le tableau de bord AdSense. Google place alors les annonces
lui-même, y compris en interstitiel plein écran. C'est plus rapide à mettre en
place et nettement moins maîtrisé — d'où le choix inverse ici.

## 3. La mesure d'audience Vercel

Rien à renseigner : le script n'est posé que lorsque `VERCEL=1`, donc en
déploiement. Il reste à activer **Web Analytics** dans l'onglet Analytics du
projet Vercel — sans cela, le chemin `/_vercel/insights/script.js` n'est pas
servi et la mesure ne remonte rien.

## 4. La migration de base

`supabase/migrations/0024_handle_history.sql` ajoute `players.handle_changed_at`,
qui porte le délai de trente jours entre deux changements de pseudo. Sans elle,
`changeHandleAction` échoue sur une colonne inconnue.

Les comptes créés avant cette date ont `handle_changed_at` à `NULL` : leur
premier changement est libre. C'est le bon comportement — leur pseudo avait été
fabriqué à partir de leur adresse e-mail, sans qu'ils aient rien choisi.
