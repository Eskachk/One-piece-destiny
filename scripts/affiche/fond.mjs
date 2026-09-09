/**
 * Le décor de l'affiche : la scène de port de la page de connexion.
 *
 * ## Pourquoi tout le fond est un seul SVG
 *
 * La page de connexion compose son port en CSS pur — dégradés superposés,
 * `repeating-conic-gradient` pour les rayons, masque radial, pseudo-éléments
 * pour les planches. Satori n'implémente presque rien de tout ça : les rayons
 * du soleil et le veinage du pont disparaîtraient sans erreur.
 *
 * Le décor est donc **redessiné en SVG**, à l'identique de ce que la feuille
 * de style produit, puis passé en une seule image à Satori. Les valeurs sont
 * recopiées de `globals.css` — mêmes couleurs, mêmes proportions, même
 * position de soleil — pour que l'affiche et la page se ressemblent vraiment
 * et pas seulement d'esprit.
 *
 * §122 : des formes géométriques. Un nuage est un tas de disques, un mât un
 * rectangle, un pavillon un quadrilatère.
 */

/* --- La charte, recopiée de globals.css ---------------------------------- */
export const CIEL_HAUT = '#3f97e0';
export const CIEL_MOYEN = '#7dc0ec';
export const CIEL_BAS = '#cfe9f8';
export const MER_CLAIRE = '#3d9ad8';
export const MER_PROFONDE = '#125ea8';
export const MER_ABYSSE = '#0d4c8c';
export const ENCRE = '#14294f';
export const PAVILLON = '#c02419';
export const OR = '#f5c542';
export const OR_SOMBRE = '#c99a1e';
export const PARCHEMIN = '#f5e8c8';

const L = 1920;
const H = 1080;

/** L'horizon, à 74 % de la hauteur — `inset: 74% 0 0 0` sur `.harbor__sea`. */
const HORIZON = Math.round(H * 0.74);
/** Le pont, 11 % de la hauteur — `height: 11vh` sur `.harbor__deck`. */
const PONT = H - 118;

/**
 * Le soleil, exactement où la feuille de style le pose : `right: 19%` et
 * `bottom: 26%`, soit posé sur l'horizon, à droite. C'est un lever de soleil
 * sur la mer, et c'est la signature de la page.
 */
const SOLEIL_X = Math.round(L * 0.81);
const SOLEIL_Y = HORIZON;

/**
 * Les rayons.
 *
 * La page les fait en `repeating-conic-gradient` — 2,6° pleins tous les 14° —
 * masqué par un dégradé radial qui les ouvre progressivement. Ici : vingt-six
 * triangles et **un seul** dégradé radial en coordonnées utilisateur, centré
 * sur le soleil. Chaque rayon est alors éteint à sa source comme à sa pointe,
 * quelle que soit sa direction ; un dégradé linéaire aurait demandé un vecteur
 * par rayon.
 */
const rayons = Array.from({ length: 26 }, (_, i) => {
  const angle = (i * 13.85 * Math.PI) / 180;
  const demi = (1.3 * Math.PI) / 180;
  const r = 1150;
  const p = (a) =>
    `${(SOLEIL_X + Math.sin(a) * r).toFixed(1)} ${(SOLEIL_Y - Math.cos(a) * r).toFixed(1)}`;
  return `<path d="M${SOLEIL_X} ${SOLEIL_Y} L${p(angle - demi)} L${p(angle + demi)}Z" fill="url(#rayon)"/>`;
}).join('');

/** Un nuage : un tas de disques sur une base aplatie. */
function nuage(cx, cy, s, opacite) {
  return `<g fill="#ffffff" opacity="${opacite}">
    <ellipse cx="${cx}" cy="${cy}" rx="${s * 1.05}" ry="${s * 0.5}"/>
    <circle cx="${cx - s * 0.48}" cy="${cy - s * 0.14}" r="${s * 0.48}"/>
    <circle cx="${cx + s * 0.06}" cy="${cy - s * 0.44}" r="${s * 0.6}"/>
    <circle cx="${cx + s * 0.62}" cy="${cy - s * 0.08}" r="${s * 0.44}"/>
  </g>`;
}

/** Une vague : deux crêtes molles, dessinées deux fois pour couvrir la largeur. */
function vague(y, amplitude, couleur, opacite) {
  let d = `M0 ${y}`;
  for (let x = 0; x < L + 200; x += 200) {
    d += ` q50 ${-amplitude} 100 0 q50 ${amplitude} 100 0`;
  }
  d += ` V${y + 60} H0Z`;
  return `<path d="${d}" fill="${couleur}" opacity="${opacite}"/>`;
}

/** Les rainures entre les planches du pont, tous les 64 px comme en CSS. */
const rainures = Array.from({ length: Math.ceil(L / 64) }, (_, i) => {
  const x = i * 64 + 64;
  return `<rect x="${x}" y="${PONT}" width="3" height="${H - PONT}" fill="#3a200c" opacity="0.7"/>
          <rect x="${x + 3}" y="${PONT}" width="2" height="${H - PONT}" fill="#c48f58" opacity="0.25"/>`;
}).join('');

/**
 * Le pavillon du mât, tête de mort et deux os croisés.
 *
 * L'emblème de piraterie du domaine public, pas la marque d'un équipage
 * (§122) — le même parti que sur le château de Drum.
 */
const pavillon = `
  <g transform="translate(114 96)">
    <path d="M0 0 Q104 -16 208 8 L208 150 Q104 174 0 152Z" fill="#161a20"/>
    <path d="M0 0 Q104 -16 208 8 L208 26 Q104 2 0 18Z" fill="#2b3138" opacity="0.7"/>
    <g fill="#ffffff">
      <g stroke="#ffffff" stroke-width="13" stroke-linecap="round">
        <path d="M50 44 L158 116 M158 44 L50 116"/>
      </g>
      <circle cx="42" cy="40" r="9"/>
      <circle cx="166" cy="40" r="9"/>
      <circle cx="42" cy="120" r="9"/>
      <circle cx="166" cy="120" r="9"/>
      <circle cx="104" cy="72" r="30"/>
      <path d="M78 96 h52 v22 a26 26 0 0 1 -52 0Z"/>
    </g>
    <g fill="#161a20">
      <circle cx="92" cy="68" r="9.5"/>
      <circle cx="116" cy="68" r="9.5"/>
      <path d="M96 100 v14 M104 100 v14 M112 100 v14" stroke="#161a20" stroke-width="3"/>
    </g>
  </g>`;

/**
 * Ce qui traîne sur le pont.
 *
 * La page de connexion y pose un chapeau de paille et un hublot ; sans rien,
 * les cent vingt pixels de bois du bas se lisent comme une plinthe et non
 * comme le pont d'un navire. Deux objets suffisent — trois encombreraient une
 * zone qui doit rester calme sous le bouton.
 *
 * À gauche, l'icône de l'application, posée à plat sur les planches. Le
 * rouleau de cordage qui s'y trouvait se lisait mal — trois anneaux
 * concentriques ouverts font un rond inachevé plutôt qu'une corde lovée. La
 * remplacer par l'icône n'est pas seulement une réparation : une affiche qui
 * invite à installer une application gagne à montrer ce qu'on va trouver sur
 * son écran d'accueil.
 *
 * L'icône elle-même n'est pas dans ce SVG : seule son ombre l'est. Une balise
 * `image` imbriquée ici n'était **pas rendue** — ce décor est déjà passé à
 * Satori comme une image, et une image dans une image ne survit pas à la
 * chaîne. Fidèle à la manière dont Satori échoue, rien ne le signalait :
 * l'ombre s'affichait, l'icône manquait.
 *
 * Elle est donc posée par `index.mjs`, en élément à part entière, aux
 * coordonnées que `POSE_ICONE` publie juste en dessous.
 */
const accessoiresDuPont = `
  <g transform="translate(1610 ${PONT + 56}) rotate(-6)">
    <ellipse cy="16" rx="112" ry="32" fill="#c9a55c" opacity="0.5"/>
    <ellipse cy="10" rx="112" ry="32" fill="#f0d48c"/>
    <path d="M-56 12 a56 50 0 0 1 112 0Z" fill="#e6c374"/>
    <path d="M-20 -34 a56 50 0 0 1 40 10 a48 44 0 0 0 -40 -10Z" fill="#f7e2a6" opacity="0.8"/>
    <path d="M-57 2 q57 16 114 0 l0 15 q-57 16 -114 0Z" fill="${PAVILLON}"/>
    <ellipse cy="10" rx="112" ry="32" fill="none" stroke="#c8a45e" stroke-width="3"/>
  </g>
  <ellipse cx="336" cy="${PONT + 102}" rx="64" ry="13" fill="#3a200c" opacity="0.35"/>`;

/** Où l'icône vient se poser, en pixels de l'affiche. Lu par `index.mjs`. */
/*
 * Le pont ne fait que 118 pixels de haut, et une icône inclinée occupe plus
 * que son côté : à 7 degrés, un carré de 100 en réclame 111. D'où cette
 * taille-là — la première version, à 120, sortait du cadre par le bas.
 */
export const POSE_ICONE = { left: 276, top: 971, taille: 100, angle: -7 };

export const fondPort = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} ${H}" width="${L}" height="${H}">
  <defs>
    <linearGradient id="ciel" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${CIEL_HAUT}"/>
      <stop offset="42%" stop-color="${CIEL_MOYEN}"/>
      <stop offset="100%" stop-color="${CIEL_BAS}"/>
    </linearGradient>
    <linearGradient id="mer" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${MER_CLAIRE}"/>
      <stop offset="55%" stop-color="${MER_PROFONDE}"/>
      <stop offset="100%" stop-color="${MER_ABYSSE}"/>
    </linearGradient>
    <linearGradient id="bois" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#b07c46"/>
      <stop offset="45%" stop-color="#96633a"/>
      <stop offset="100%" stop-color="#6d4423"/>
    </linearGradient>
    <linearGradient id="mat" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7a4f28"/>
      <stop offset="35%" stop-color="#b07c46"/>
      <stop offset="100%" stop-color="#6d4423"/>
    </linearGradient>

    <!-- Le masque des rayons de la page : transparent au centre, ouvert
         jusqu'au tiers, éteint avant le bord. -->
    <radialGradient id="rayon" gradientUnits="userSpaceOnUse"
                    cx="${SOLEIL_X}" cy="${SOLEIL_Y}" r="1150">
      <stop offset="0%" stop-color="#fff4c6" stop-opacity="0"/>
      <stop offset="7%" stop-color="#fff4c6" stop-opacity="0"/>
      <stop offset="17%" stop-color="#fff4c6" stop-opacity="0.5"/>
      <stop offset="34%" stop-color="#fff4c6" stop-opacity="0.42"/>
      <stop offset="70%" stop-color="#fff4c6" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="halo" gradientUnits="userSpaceOnUse"
                    cx="${SOLEIL_X}" cy="${SOLEIL_Y}" r="440">
      <stop offset="0%" stop-color="#fffae0" stop-opacity="0.95"/>
      <stop offset="34%" stop-color="#ffeca8" stop-opacity="0.65"/>
      <stop offset="70%" stop-color="#ffe096" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ombrePont" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#183c60" stop-opacity="0"/>
      <stop offset="100%" stop-color="#123050" stop-opacity="0.4"/>
    </linearGradient>
  </defs>

  <rect width="${L}" height="${H}" fill="url(#ciel)"/>
  ${rayons}
  <circle cx="${SOLEIL_X}" cy="${SOLEIL_Y}" r="440" fill="url(#halo)"/>

  ${nuage(300, 210, 96, 0.9)}
  ${nuage(700, 132, 66, 0.75)}
  ${nuage(1180, 186, 82, 0.8)}
  ${nuage(1640, 118, 58, 0.65)}
  ${nuage(980, 300, 52, 0.5)}

  <rect y="${HORIZON}" width="${L}" height="${H - HORIZON}" fill="url(#mer)"/>
  ${vague(HORIZON - 14, 24, '#8ecaee', 0.6)}
  ${vague(HORIZON + 14, 17, '#ffffff', 0.32)}
  ${vague(HORIZON + 52, 12, '#7fc2ea', 0.22)}

  <rect y="${PONT - 26}" width="${L}" height="26" fill="url(#ombrePont)"/>
  <rect y="${PONT}" width="${L}" height="${H - PONT}" fill="url(#bois)"/>
  <rect y="${PONT}" width="${L}" height="4" fill="#ffe1c2" opacity="0.45"/>
  ${rainures}

  <rect x="68" width="46" height="${PONT + 10}" fill="url(#mat)"/>
  ${Array.from({ length: 7 }, (_, i) => `<rect x="62" y="${140 + i * 128}" width="58" height="11" rx="5" fill="#5d3a1a" opacity="0.55"/>`).join('')}
  ${pavillon}
  ${accessoiresDuPont}
</svg>`;
