# Tenue en charge

Mesuré le 1ᵉʳ septembre 2026 avec [`scripts/load-test.mjs`](../scripts/load-test.mjs).

```bash
node node_modules/next/dist/bin/next start -p 3100
node scripts/load-test.mjs --url http://localhost:3100 --seconds 15 --paliers 25,50,100,200,400 --chemins /classement
```

**Conditions.** Build de production, un seul processus Next, Ryzen 7 5800X
(16 cœurs logiques), Node 24. Le générateur de charge tourne sur la même
machine que le serveur : au palier haut, les deux se disputent le processeur.
C'est une borne **pessimiste**, ce qui est le bon sens de l'erreur.

## Résultat

| clients simultanés | req/s | p50 | p90 | p99 | échecs |
|---:|---:|---:|---:|---:|---:|
| 25 | 148 | 156 ms | 188 ms | 435 ms | 0 |
| 50 | 149 | 320 ms | 407 ms | 447 ms | 0 |
| 100 | **168** | 585 ms | 622 ms | 758 ms | 0 |
| 200 | 139 | 1 308 ms | 1 852 ms | 2 144 ms | 0 |
| 400 | 165 | 2 277 ms | 3 010 ms | 4 962 ms | 60 refus |

Le débit est **plat** autour de 150-170 req/s quelle que soit la concurrence,
et la latence croît linéairement avec le nombre de clients. C'est la signature
d'un processus mono-thread saturé : les requêtes ne sont pas plus lentes, elles
attendent leur tour. Node ne rend qu'une page à la fois.

## Où part le temps

Trois mesures, du plus nu au plus complet :

| Cible | req/s | coût unitaire | ce qui s'ajoute |
|---|---:|---:|---|
| `/api/jobs/email` (401, aucun rendu) | 828 | 1,2 ms | middleware + routage |
| `/_not-found` (24 Ko) | 203 | 4,9 ms | + rendu React minimal |
| `/classement` (37 Ko) | 168 | 6,0 ms | + mise en page et contenu |

`/classement` et `/login` donnaient **exactement le même débit** avant
optimisation, alors que le premier lit un classement, une analyse et des
distinctions et que le second ne touche à rien. C'est la preuve que **la
couche de données ne coûte rien** au régime établi : le cache partagé
(`lib/cache.ts`) fait son travail, et il ne reste que le coût de fabrication du
HTML.

## L'optimisation trouvée par la mesure

La ventilation du HTML de `/classement` a montré 19 Ko de SVG en ligne, dont
9 Ko pour l'Éternal Pose et le chapeau de paille — deux ornements que le CSS
masquait (`display: none`) sur toutes les pages intérieures. Le serveur les
rendait, les sérialisait, puis les répétait dans la charge RSC, à chaque
requête de chaque joueur.

`display: none` cache ; il n'économise rien. Le décor du pont n'est plus
**rendu** hors de la scène d'entrée :

|  | avant | après |
|---|---:|---:|
| poids de `/classement` | 63,3 Ko | **37,5 Ko** (−41 %) |
| débit | 122 req/s | **168 req/s** (+38 %) |
| p90 à 100 clients | 854 ms | **622 ms** |

La baisse de poids dépasse les 9 Ko retirés : la charge RSC répète l'arbre, donc
tout ce qui n'est pas rendu est économisé deux fois.

## Ce que ça dit de « 1 000 joueurs simultanés »

**1 000 joueurs connectés ne font pas 1 000 requêtes par seconde.** Quelqu'un
qui consulte un classement lit sa page une dizaine de secondes avant de
cliquer ailleurs. Mille joueurs actifs produisent donc de l'ordre de
100 req/s — ce qu'une seule instance sert déjà, avec un p90 sous 650 ms.

Le cas qui compte est la **pointe du dimanche soir**, quand la publication des
résultats amène tout le monde sur `/classement` dans la même minute. Mille
pages en soixante secondes font 17 req/s : très en dessous de la capacité. Même
en concentrant l'arrivée sur cinq secondes — 200 req/s — il suffit de deux
instances, que Vercel ajoute seul.

## Le point de rupture, et pourquoi il n'est pas inquiétant

À 400 clients simultanés sur **un seul** processus, 60 connexions sont
refusées : la file d'acceptation du socket déborde. Ce n'est pas l'application
qui échoue — aucune requête servie n'a renvoyé d'erreur, à aucun palier. Le
remède est d'ajouter des instances, pas d'optimiser le rendu.

Sur Vercel, chaque requête est traitée par une fonction et la plateforme en
ajoute sous la charge : cette limite-là ne s'y présente pas sous cette forme.

## Les pages connectées

Elles ajoutent au rendu des **allers-retours vers Supabase**. Mesurés par
[`scripts/db-latency.mjs`](../scripts/db-latency.mjs), depuis cette machine :

| clients | req/s | p50 | p90 | p99 |
|---:|---:|---:|---:|---:|
| 1 | 11 | **92 ms** | 99 ms | 129 ms |
| 5 | 42 | 113 ms | 142 ms | 197 ms |
| 10 | 43 | 205 ms | 312 ms | 444 ms |
| 25 | 44 | 362 ms | 910 ms | 1 651 ms |
| 50 | 45 | 673 ms | 1 783 ms | 4 060 ms |

⚠️ **Ces 92 ms ne sont pas ceux de la production.** Ils mesurent la liaison
entre une connexion domestique française et Frankfurt. Sur Vercel, la fonction
tourne dans la même région que la base : l'aller-retour y est de l'ordre de
quelques millisecondes. Le plafond de 45 req/s est celui de cette liaison, pas
celui de Supabase.

Ce qui **se transpose**, en revanche, c'est le **nombre d'allers-retours en
série** par page : il ne dépend d'aucun réseau, seulement du code.

| page | allers-retours en série |
|---|---:|
| `/boutique` | 1 (session) |
| `/`, `/collection`, `/parametres` | 2 |
| `/market` | 3 — le second lot dépend de la liste surveillée |
| `/profil` | **7 → 2** |

`/profil` enchaînait division, historique, inventaire, notifications, code de
parrainage, état du parrainage, préférences et compte : huit lectures, dont
sept en série, alors qu'aucune ne dépend de la précédente — toutes ne
dépendent que de `session.playerId`, connu dès la première.

En série, la page coûte la **somme** des latences ; en parallèle, le
**maximum**. Sept allers-retours de 92 ms font 650 ms de page blanche ici, et
resteraient 3,5 fois le nécessaire même en région.

## Un piège de mesure à connaître

Une page protégée demandée **sans session** répond **200**, pas 307 : Next a
déjà envoyé les en-têtes quand `requireSession()` s'exécute, et la redirection
part dans le corps du flux. Aucune donnée ne fuite — vérifié : la réponse de
22 Ko ne contient ni pseudo, ni Berries, ni division — mais un tir de charge
compte cette coquille comme une page servie et annonce un débit flatteur sur
une page qu'il n'a jamais rendue.

`load-test.mjs` détecte désormais le marqueur `NEXT_REDIRECT` dans le corps et
le signale au lieu de le compter comme un succès.

Pour tirer réellement sur une page connectée, il faut le cookie de session —
`Application → Cookies → opq_session` dans les outils de développement, il est
`httpOnly` donc invisible depuis la console :

```bash
$env:OPQ_SESSION="…"
node scripts/load-test.mjs --url https://…  --chemins /profil --paliers 25,50
```

Le jeton passe par une variable d'environnement et jamais par un argument :
les arguments d'un processus sont lisibles par tout utilisateur de la machine
et finissent dans l'historique du terminal.

## Ce qui n'a pas été mesuré

- **Le tir de charge de bout en bout sur une page connectée**, faute de session
  valide au moment du test — la fenêtre d'inactivité de deux heures avait
  expiré. Les deux composantes ont été mesurées séparément (rendu : 6 ms ;
  aller-retour : 92 ms d'ici) et le nombre d'allers-retours est désormais
  connu et réduit, mais la mesure combinée reste à faire.
- **Le déploiement réel.** Latence réseau, démarrage à froid des fonctions,
  limites de connexions Supabase : rien de tout cela n'existe sur localhost, et
  la latence vers la base y sera bien plus faible.
- **Le tir de charge de bout en bout sur une écriture**, pour la même raison :
  verrouiller un équipage exige une session. Le coût unitaire, lui, est
  mesuré — voir ci-dessous.

## Écritures

Mesurée sur une clé de sonde de `app_settings` (supprimée après coup, aucune
donnée de joueur touchée), une écriture coûte **exactement ce que coûte une
lecture** : 213 ms de p50 à 10 clients, contre 209 ms pour la lecture de
session. Ce n'est pas le disque qui décide, c'est le réseau.

Conséquence directe : sur les chemins d'écriture aussi, le seul levier est le
**nombre d'allers-retours en série**. Trois ont été aplatis :

| chemin | avant | après |
|---|---:|---:|
| verrouillage d'équipage | 6 | **4** |
| versement au parrain | 4 | **2** |
| achat au Marché | 5 | **4** |

Le verrouillage lisait le chapitre puis l'inventaire, alors qu'aucun ne dépend
de l'autre ; puis il journalisait l'événement anti-abus **avant** de verser au
parrain, alors que ni l'un ni l'autre ne se lit. Le versement enchaînait
libération de la dotation, lecture du parrain, plafond et maturité — quatre
lectures dont deux paires indépendantes. L'achat lisait l'annonce puis le droit
d'acheter, qui ne dépend que du joueur.

Dans les trois cas, **l'ordre des refus n'a pas bougé** : annonce introuvable
avant compte restreint, chapitre ouvert avant verrouillage. Quand on lit n'est
pas quand on décide — et c'est précisément ce qui rend la mise en parallèle
sûre.

Le journal anti-abus et le versement passent par `Promise.allSettled` : ni l'un
ni l'autre ne doit faire échouer la réponse. L'équipage est déjà enregistré en
base, et répondre « échec » sur un équipage bien verrouillé pousserait le
joueur à le rejouer — ou à croire qu'il l'a perdu.
