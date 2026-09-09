# L'affiche des réseaux sociaux

```bash
npm run affiche              # → affiche-one-piece-quest.png, à la racine
npm run affiche -- chemin.png
```

1920 × 1080, dans la direction artistique de la page de connexion : ciel de
plein jour, soleil rasant sur l'horizon, mât et pavillon, pont de planches,
bandeau rouge et bouton doré.

## Pourquoi elle vit dans le dépôt

Elle est fabriquée par **le moteur d'images du site lui-même** — `next/og`,
c'est-à-dire Satori, la même dépendance qui compose déjà la carte de partage
(`src/app/opengraph-image.tsx`). Couleurs, fontes et décor sont repris de
`globals.css`. Faite dans un logiciel de dessin, l'affiche aurait dérivé de la
charte à la première retouche du site ; ici, elle suit le code.

## Les trois fichiers

| Fichier | Rôle |
| --- | --- |
| `index.mjs` | La mise en page et les textes. C'est le seul à modifier pour changer un titre ou une accroche. |
| `fond.mjs` | Le port : ciel, rayons, nuages, mer, pont, mât, pavillon. |
| `visuels.mjs` | Les trois vignettes — l'éventail de cartes, le coffre, le podium. |

## Deux contraintes qui expliquent la forme du code

**Satori ne lit pas le woff2.** Le site charge Anton et Caveat par
`next/font/google`, qui les auto-héberge dans ce format. Les mêmes fontes, en
TTF, sont donc versionnées dans `fontes/`. C'est un doublon assumé : l'autre
choix était de les télécharger à l'exécution, ce qui rend la génération
dépendante du réseau et de la version que Google sert ce jour-là.

**Satori échoue en silence.** Le port de la page de connexion est du CSS pur —
`repeating-conic-gradient` pour les rayons, masque radial, dégradés empilés
pour le veinage des planches. Satori n'en implémente presque rien et ne le dit
pas : les rayons et le bois disparaîtraient sans erreur. Le décor et les
vignettes sont donc du **SVG**, rastérisé par resvg et passé en `data:`.
Satori ne fait plus que la mise en page et le texte, ce qu'il fait bien.

Corollaire à ne pas oublier : **aucun texte à l'intérieur des SVG.** Les fontes
fournies à Satori ne descendent pas dans les images rastérisées. Tout ce qui
doit se lire est du texte Satori, dans la mise en page.

## Modifier les activités

Les trois blocs sont la constante `ACTIVITES` dans `index.mjs`. Chacun porte
deux couleurs, et ce n'est pas une coquetterie : le liseré vit sur du crème, où
le turquoise et l'or du site passent très bien, tandis que le chiffre est du
texte et doit rester lisible — d'où des versions assombries.
