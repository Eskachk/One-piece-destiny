/**
 * Génère l'affiche 1920×1080 des réseaux sociaux.
 *
 *     node scripts/affiche/index.mjs public/affiche-one-piece-quest.png
 *
 * ## Pourquoi elle est fabriquée par le moteur du site
 *
 * `next/og` — c'est-à-dire Satori — compose déjà la carte de partage du site
 * (`src/app/opengraph-image.tsx`). L'affiche reprend la même chaîne, les mêmes
 * couleurs prises dans `globals.css`, les mêmes fontes, et redessine le décor
 * de la page de connexion. Faite dans un logiciel de dessin, elle aurait
 * dérivé de la charte à la première retouche du site ; ici elle suit le code.
 *
 * ## Pourquoi les fontes sont versionnées à côté
 *
 * Le site charge Anton et Caveat par `next/font/google`, qui les auto-héberge
 * en **woff2** — un format que Satori ne sait pas lire. Les mêmes fontes, en
 * TTF, vivent donc dans `fontes/`. Sans elles, ce script tombe sur Noto Sans
 * et l'affiche perd exactement ce qui la rend reconnaissable.
 *
 * C'est un doublon assumé : le seul autre choix était de les télécharger à
 * l'exécution, ce qui rend la génération dépendante du réseau et du fait que
 * Google serve encore la même version.
 *
 * ## Ce que Satori ne sait pas faire, et comment on contourne
 *
 * Le port de la page de connexion est du CSS pur : `repeating-conic-gradient`
 * pour les rayons, masque radial, dégradés empilés pour les planches. Satori
 * n'implémente presque rien de tout ça et **échoue en silence**. Le décor et
 * les trois vignettes sont donc du SVG, rastérisé par resvg, passé en `data:`.
 * Satori ne fait plus que la mise en page et le texte — ce qu'il fait bien.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ENCRE, OR, OR_SOMBRE, PAVILLON, POSE_ICONE, fondPort } from './fond.mjs';
import {
  enBase64,
  visuelClassement,
  visuelCoffre,
  visuelEquipage,
} from './visuels.mjs';

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, '..', '..');
const requireProjet = createRequire(join(RACINE, 'package.json'));
const React = requireProjet('react');

// `pathToFileURL` : sous Windows, `resolve` rend « C:\… », que l'import ESM
// refuse — il lui faut une URL file://.
const { ImageResponse } = await import(
  pathToFileURL(requireProjet.resolve('next/dist/server/og/image-response.js')).href
);

const sortie = process.argv[2] ?? join(RACINE, 'affiche-one-piece-quest.png');
const h = (type, props, ...enfants) => React.createElement(type, props, ...enfants);

const chapeau = readFileSync(join(RACINE, 'public', 'chapeau-chopper.png'));
const chapeauSrc = `data:image/png;base64,${chapeau.toString('base64')}`;

/**
 * Les trois activités.
 *
 * Choisies pour ce qu'elles ont d'irremplaçable, pas pour le nombre d'écrans
 * qu'elles occupent — le Marché est une belle page, mais « acheter des cartes
 * avec de la monnaie de jeu » ne distingue ce site d'aucun autre.
 *
 * La troisième porte la promesse la plus singulière du jeu, et elle est vraie,
 * mesurée sur le moteur : un Commun bien vu à 90 points contre un Mythique
 * unanime à 26.
 *
 * Deux couleurs par activité, et ce n'est pas de la coquetterie : le liseré vit
 * sur du crème, où le turquoise et l'or du site passent très bien, tandis que
 * le chiffre est du **texte** et doit rester lisible — d'où des versions
 * assombries. Le même turquoise aux deux endroits aurait donné un chiffre
 * illisible ou un liseré terne.
 */
const ACTIVITES = [
  {
    numero: '01',
    bord: '#25c7c5',
    encre: '#0f7d86',
    titre: 'Compose ton équipage',
    visuel: enBase64(visuelEquipage),
    corps:
      'Trois personnages parmi ceux que tu possèdes. Modifiable jusqu’au dimanche 23:59.',
  },
  {
    numero: '02',
    bord: OR,
    encre: '#a8720f',
    titre: 'Ouvre des coffres',
    visuel: enBase64(visuelCoffre),
    corps: 'Une cérémonie à chaque ouverture. Les chances sont affichées avant, jamais après.',
  },
  {
    numero: '03',
    bord: PAVILLON,
    encre: PAVILLON,
    titre: 'Grimpe au classement',
    visuel: enBase64(visuelClassement),
    corps: 'Une carte commune que personne n’attendait bat un Mythique aligné par tout le monde.',
  },
];

const carte = ({ numero, bord, encre, titre, visuel, corps }) =>
  h(
    'div',
    {
      key: numero,
      style: {
        display: 'flex',
        flexDirection: 'column',
        width: 536,
        padding: '26px 30px 30px',
        borderRadius: 24,
        border: `4px solid ${bord}`,
        background: 'rgba(255, 252, 244, 0.95)',
        // L'ombre portée en deux temps, comme le bouton de connexion : un
        // aplat net qui donne l'épaisseur, un flou large qui décolle la carte
        // du ciel.
        boxShadow: '0 9px 0 rgba(20, 41, 79, 0.16), 0 22px 40px rgba(12, 45, 80, 0.28)',
      },
    },

    // Le dessin en tête, et non en vignette à côté du titre : c'est lui qui
    // doit arrêter le défilement, le texte ne vient qu'après.
    h('img', { src: visuel, width: 460, height: 172 }),

    h(
      'div',
      { style: { display: 'flex', fontFamily: 'Anton', fontSize: 38, color: encre, lineHeight: 1, marginTop: 14 } },
      numero,
    ),
    h(
      'div',
      {
        style: {
          display: 'flex',
          fontFamily: 'Anton',
          fontSize: 44,
          letterSpacing: 1,
          textTransform: 'uppercase',
          color: ENCRE,
          marginTop: 8,
          lineHeight: 1.05,
        },
      },
      titre,
    ),
    h(
      'div',
      { style: { display: 'flex', fontSize: 24, lineHeight: 1.45, color: '#3d5878', marginTop: 12 } },
      corps,
    ),
  );

const affiche = h(
  'div',
  {
    style: {
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '40px 72px 112px',
      fontFamily: 'Noto Sans',
      position: 'relative',
    },
  },

  // Le port, en une seule image sous tout le reste.
  h('img', {
    src: enBase64(fondPort),
    width: 1920,
    height: 1080,
    style: { position: 'absolute', top: 0, left: 0 },
  }),

  // L'icône de l'application, posée à plat sur les planches, à gauche. Elle
  // vit ici et non dans le SVG du décor : une image imbriquée dans une image
  // n'est pas rendue par la chaîne Satori, et elle disparaissait en silence.
  h('img', {
    src: `data:image/png;base64,${readFileSync(
      join(RACINE, 'public', 'icons', 'icon-512.png'),
    ).toString('base64')}`,
    width: POSE_ICONE.taille,
    height: POSE_ICONE.taille,
    style: {
      position: 'absolute',
      left: POSE_ICONE.left,
      top: POSE_ICONE.top,
      transform: `rotate(${POSE_ICONE.angle}deg)`,
    },
  }),

  /* --- L'en-tête, dans la hiérarchie de la page de connexion -------------- */
  h(
    'div',
    { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } },
    h(
      'div',
      { style: { display: 'flex', alignItems: 'center' } },
      h('img', { src: chapeauSrc, width: 112, height: 73, style: { marginRight: 20 } }),
      h(
        'div',
        {
          style: {
            display: 'flex',
            fontFamily: 'Anton',
            fontSize: 52,
            letterSpacing: 6,
            color: PAVILLON,
            // Le liseré blanc de la page : sans lui, du rouge sur du ciel bleu
            // ne tient pas le contraste.
            textShadow: '0 2px 0 rgba(255,255,255,0.6), 0 3px 10px rgba(9,26,45,0.22)',
          },
        },
        'ONE PIECE QUEST',
      ),
    ),
    h(
      'div',
      {
        style: {
          display: 'flex',
          fontFamily: 'Anton',
          fontSize: 122,
          letterSpacing: 2,
          lineHeight: 0.94,
          color: ENCRE,
          marginTop: 10,
          textShadow: '0 4px 0 rgba(255,255,255,0.42)',
        },
      },
      'DEVINE LE CHAPITRE',
    ),
    h(
      'div',
      {
        style: {
          display: 'flex',
          marginTop: 18,
          padding: '8px 38px 14px',
          borderRadius: 999,
          background: PAVILLON,
          color: '#fff6e4',
          fontFamily: 'Caveat',
          fontSize: 46,
          transform: 'rotate(-1.2deg)',
          boxShadow: '0 6px 16px rgba(140, 26, 20, 0.34)',
        },
      },
      'avant qu’il sorte — personne ne l’a encore lu',
    ),
  ),

  /* --- Les trois activités ----------------------------------------------- */
  h(
    'div',
    { style: { display: 'flex', justifyContent: 'space-between', width: '100%' } },
    ...ACTIVITES.map(carte),
  ),

  /* --- Le pied : le bouton doré de la page de connexion -------------------- */
  h(
    'div',
    { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } },
    h(
      'div',
      {
        style: {
          display: 'flex',
          padding: '16px 44px 20px',
          borderRadius: 18,
          background: `linear-gradient(180deg, #ffd767, ${OR})`,
          color: ENCRE,
          fontFamily: 'Anton',
          fontSize: 40,
          letterSpacing: 3,
          boxShadow: `0 7px 0 ${OR_SOMBRE}, 0 14px 26px rgba(12, 45, 80, 0.3)`,
        },
      },
      'ONE-PIECE-QUEST.VERCEL.APP',
    ),
    h(
      'div',
      {
        style: {
          display: 'flex',
          marginTop: 16,
          fontSize: 27,
          color: '#eaf6ff',
          textShadow: '0 2px 6px rgba(6, 30, 52, 0.6)',
        },
      },
      'Gratuit · un nouveau chapitre chaque semaine',
    ),
  ),
);

const fonte = (nom, fichier, weight) => ({
  name: nom,
  data: readFileSync(join(ICI, 'fontes', fichier)),
  weight,
  style: 'normal',
});

const reponse = new ImageResponse(affiche, {
  width: 1920,
  height: 1080,
  fonts: [
    fonte('Anton', 'Anton-Regular.ttf', 400),
    fonte('Caveat', 'Caveat-Bold.ttf', 700),
    {
      name: 'Noto Sans',
      data: readFileSync(
        requireProjet.resolve('next/dist/compiled/@vercel/og/noto-sans-v27-latin-regular.ttf'),
      ),
      weight: 400,
      style: 'normal',
    },
  ],
});

writeFileSync(sortie, Buffer.from(await reponse.arrayBuffer()));
console.log('affiche écrite :', sortie);
