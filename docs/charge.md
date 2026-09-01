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

## Ce qui n'a pas été mesuré

- **Les pages authentifiées.** Elles lisent la session en base à chaque
  requête (`getAuthenticatedSession`, mémorisé par requête). Le tir de charge
  a porté sur des pages anonymes ; le coût d'un aller-retour Supabase par page
  vue reste à mesurer, et c'est le prochain endroit à regarder.
- **Le déploiement réel.** Latence réseau, démarrage à froid des fonctions,
  limites de connexions Supabase : rien de tout cela n'existe sur localhost.
- **Les écritures.** Verrouillage d'équipage, achat au Marché, ouverture de
  coffre passent par des transactions en base et n'ont pas été mises sous
  charge. C'est là que se trouvent les vrais points de contention, pas dans la
  lecture.
