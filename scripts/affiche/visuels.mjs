/**
 * Les trois visuels de l'affiche.
 *
 * ## Pourquoi du SVG encodé, et pas du SVG inline
 *
 * Satori accepte les deux, mais son support du SVG inline est partiel et
 * silencieux : une forme non gérée disparaît sans erreur. Passé en `data:` à
 * une balise `img`, le SVG est rastérisé par resvg, qui l'implémente en
 * entier. Sur une affiche qu'on ne relit pas à chaque génération, un échec
 * bruyant vaut mieux qu'une forme manquante.
 *
 * ## Aucun texte à l'intérieur
 *
 * Les fontes fournies à Satori ne descendent pas dans les images rastérisées :
 * un `<text>` ici tomberait sur ce que resvg trouve, c'est-à-dire rien de
 * garanti. Tout ce qui doit se lire — les chiffres, les titres — est du texte
 * Satori, dans la carte, jamais dans le dessin.
 *
 * ## Chaque dessin est une petite scène de pont
 *
 * Ciel dégradé en fond, bande de planches au pied. Ce n'est pas de la
 * décoration : les trois objets — cartes crème, coffre doré, marches marine —
 * sont clairs ou chauds, et se seraient noyés sur le panneau crème de la
 * carte. Le ciel leur rend le contraste, et il le rend en reprenant exactement
 * le décor de la page de connexion, donc sans rien inventer.
 *
 * §122 : des formes géométriques. Une carte à jouer est un rectangle arrondi,
 * un personnage un disque et un arc, un coffre un rectangle et une voûte.
 */

const PARCHEMIN = '#f5e8c8';
const ENCRE = '#0e3045';
const OR = '#f5c542';
const TURQUOISE = '#25c7c5';
const BOIS = '#9a6636';
const BOIS_SOMBRE = '#5a3719';

/** Les raretés du jeu, reprises de `domain/collection/rarity.ts`. */
const RARETE = {
  COMMUN: '#8ea3bd',
  RARE: '#2fa8a4',
  EPIQUE: '#9a5cd8',
  LEGENDAIRE: '#f5c542',
  MYTHIQUE: '#ff5d47',
};

const L = 460;
const H = 172;
/** Le dessus des planches. Tout objet pose son pied juste dessous. */
const PONT = 146;
/** La ligne où reposent les objets, quatre pixels dans le bois. */
const SOL = 150;

const rainures = Array.from({ length: 11 }, (_, i) =>
  `<rect x="${i * 44 + 26}" y="${PONT}" width="2.5" height="${H - PONT}" fill="#3a200c" opacity="0.55"/>`,
).join('');

/**
 * Le cadre commun : ciel, planches, et découpe aux angles arrondis.
 *
 * `clip-path` plutôt qu'un simple `rx` sur le fond : sans lui, les objets qui
 * dépassent — un rai de lumière, une pointe de flèche — sortiraient du
 * panneau et se colleraient au bord de la carte.
 */
const cadre = (id, contenu) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L} ${H}" width="${L}" height="${H}">
  <defs>
    <linearGradient id="ciel-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3f97e0"/>
      <stop offset="100%" stop-color="#a9d8f2"/>
    </linearGradient>
    <linearGradient id="bois-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#b07c46"/>
      <stop offset="100%" stop-color="#6d4423"/>
    </linearGradient>
    <clipPath id="decoupe-${id}"><rect width="${L}" height="${H}" rx="16"/></clipPath>
  </defs>
  <g clip-path="url(#decoupe-${id})">
    <rect width="${L}" height="${H}" fill="url(#ciel-${id})"/>
    <rect y="${PONT}" width="${L}" height="${H - PONT}" fill="url(#bois-${id})"/>
    <rect y="${PONT}" width="${L}" height="3" fill="#ffe1c2" opacity="0.5"/>
    ${rainures}
    ${contenu}
  </g>
</svg>`;

/** L'ombre portée d'un objet sur les planches. */
const ombre = (cx, rx) =>
  `<ellipse cx="${cx}" cy="${SOL + 2}" rx="${rx}" ry="6" fill="#3a200c" opacity="0.3"/>`;

/**
 * Une carte de collection, vue de face.
 *
 * Un bandeau de rareté en haut, une silhouette au centre, un cartouche de nom
 * en bas : c'est la structure des vraies cartes du site, réduite à ce qui se
 * lit à cette taille.
 */
function carteAJouer(x, y, l, hgt, couleur, rotation = null) {
  const cx = x + l / 2;
  const tete = y + hgt * 0.42;
  const demiEpaules = l * 0.29;

  const groupe = `
    <rect x="${x}" y="${y}" width="${l}" height="${hgt}" rx="${l * 0.09}"
          fill="${PARCHEMIN}" stroke="${ENCRE}" stroke-width="3"/>
    <rect x="${x + l * 0.08}" y="${y + hgt * 0.06}" width="${l * 0.84}" height="${hgt * 0.065}"
          rx="${hgt * 0.033}" fill="${couleur}"/>
    <circle cx="${cx}" cy="${tete}" r="${l * 0.17}" fill="${ENCRE}" opacity="0.52"/>
    <path d="M${cx - demiEpaules} ${y + hgt * 0.82} a${demiEpaules} ${demiEpaules * 1.15} 0 0 1 ${demiEpaules * 2} 0Z"
          fill="${ENCRE}" opacity="0.52"/>
    <rect x="${x + l * 0.16}" y="${y + hgt * 0.87}" width="${l * 0.68}" height="${hgt * 0.05}"
          rx="${hgt * 0.025}" fill="${ENCRE}" opacity="0.22"/>`;

  return rotation
    ? `<g transform="rotate(${rotation.angle} ${rotation.cx} ${rotation.cy})">${groupe}</g>`
    : `<g>${groupe}</g>`;
}

/** Une étincelle à quatre branches, aux flancs creusés. */
function etincelle(cx, cy, s, couleur, opacite = 1) {
  const c = s * 0.2;
  return `<path d="M${cx} ${cy - s} Q${cx + c} ${cy - c} ${cx + s} ${cy} Q${cx + c} ${cy + c} ${cx} ${cy + s} Q${cx - c} ${cy + c} ${cx - s} ${cy} Q${cx - c} ${cy - c} ${cx} ${cy - s}Z" fill="${couleur}" opacity="${opacite}"/>`;
}

/* --- 01. Trois cartes en éventail ---------------------------------------- */

/**
 * L'éventail dit « tu en choisis trois » sans une ligne de texte, et les trois
 * bandeaux de rareté différents disent au passage que la rareté n'est qu'une
 * couleur — ce que la troisième carte de l'affiche affirme en toutes lettres.
 */
export const visuelEquipage = cadre(
  'eq',
  `
  ${ombre(230, 130)}
  ${carteAJouer(74, 18, 104, 132, RARETE.RARE, { angle: -15, cx: 126, cy: 84 })}
  ${carteAJouer(282, 18, 104, 132, RARETE.EPIQUE, { angle: 15, cx: 334, cy: 84 })}
  ${carteAJouer(176, 8, 108, 142, RARETE.COMMUN)}
  ${etincelle(310, 22, 11, OR, 0.9)}
  ${etincelle(150, 30, 8, '#ffffff', 0.85)}
`,
);

/* --- 02. Le coffre qui s'ouvre ------------------------------------------- */

/**
 * Les rais partent de la fente, pas du centre du coffre : c'est de là que la
 * lumière sort, et c'est ce détail qui fait « il s'ouvre » plutôt que « il
 * brille ».
 *
 * Le dégradé radial n'est pas un raffinement. À opacité constante, de l'or à
 * 14 % ne donne pas de la lumière : les onze triangles se recomposent en un
 * éventail plein aux bords nets — une queue de paon. Un seul dégradé en
 * coordonnées utilisateur, centré sur la fente, rend chaque rai franc à sa
 * source et éteint avant sa pointe, quelle que soit sa direction ; un dégradé
 * linéaire aurait demandé un vecteur par rai.
 */
const rais = Array.from({ length: 11 }, (_, i) => {
  const angle = (-82 + i * 16.4) * (Math.PI / 180);
  const demi = 5.4 * (Math.PI / 180);
  const r = 155;
  const p = (a) =>
    `${(230 + Math.sin(a) * r).toFixed(1)} ${(88 - Math.cos(a) * r).toFixed(1)}`;
  return `<path d="M230 88 L${p(angle - demi)} L${p(angle + demi)}Z" fill="url(#rai)"/>`;
}).join('');

export const visuelCoffre = cadre(
  'co',
  `
  <defs>
    <radialGradient id="rai" gradientUnits="userSpaceOnUse" cx="230" cy="88" r="155">
      <stop offset="0%" stop-color="${OR}" stop-opacity="0.78"/>
      <stop offset="38%" stop-color="${OR}" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="${OR}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  ${rais}
  <circle cx="230" cy="88" r="150" fill="url(#rai)" opacity="0.45"/>
  ${ombre(230, 96)}

  <!-- Le couvercle, rejeté en arrière et incliné : une voûte posée bien
       au-dessus du coffre, sinon il a simplement le dessus ouvert. -->
  <g transform="translate(0 -38) rotate(-9 230 84)">
    <path d="M152 88 Q230 24 308 88Z" fill="${BOIS}" stroke="${BOIS_SOMBRE}" stroke-width="3"/>
    <path d="M186 88 Q230 40 274 88Z" fill="${OR}" opacity="0.32"/>
  </g>

  <!-- La lumière qui sort de la fente. -->
  <ellipse cx="230" cy="86" rx="80" ry="17" fill="${OR}" opacity="0.9"/>
  <ellipse cx="230" cy="84" rx="52" ry="10" fill="#fff6d8"/>

  <!-- La caisse. -->
  <rect x="152" y="90" width="156" height="60" rx="9" fill="${BOIS}" stroke="${BOIS_SOMBRE}" stroke-width="3"/>
  <rect x="152" y="128" width="156" height="22" fill="${BOIS_SOMBRE}" opacity="0.45"/>
  <g fill="${OR}">
    <rect x="168" y="90" width="13" height="60"/>
    <rect x="279" y="90" width="13" height="60"/>
  </g>
  <rect x="146" y="82" width="168" height="14" rx="6" fill="#b07a42" stroke="${BOIS_SOMBRE}" stroke-width="3"/>
  <rect x="218" y="104" width="24" height="28" rx="4" fill="${OR}" stroke="${BOIS_SOMBRE}" stroke-width="2.5"/>
  <circle cx="230" cy="116" r="4.5" fill="${BOIS_SOMBRE}"/>

  ${etincelle(104, 44, 17, '#ffffff', 0.95)}
  ${etincelle(352, 54, 14, OR, 0.95)}
  ${etincelle(318, 16, 10, '#ffffff', 0.8)}
  ${etincelle(140, 14, 9, OR, 0.75)}
`,
);

/* --- 03. Le podium ------------------------------------------------------- */

/**
 * Le visuel **dit** ce que le texte affirme : sur la plus haute marche, une
 * carte au bandeau gris — un Commun — et sur la deuxième, la carte au bandeau
 * braise du Mythique. C'est l'inverse de ce qu'un joueur attend d'un podium,
 * et c'est exactement le propos.
 */
function marche(x, l, hauteur) {
  const y = SOL - hauteur;
  return `
    <rect x="${x}" y="${y}" width="${l}" height="${hauteur}" rx="6"
          fill="#1c4260" stroke="${PARCHEMIN}" stroke-width="2.5" stroke-opacity="0.5"/>
    <rect x="${x}" y="${y}" width="${l}" height="7" rx="3.5" fill="${PARCHEMIN}" opacity="0.24"/>`;
}

export const visuelClassement = cadre(
  'cl',
  `
  <!-- La flèche passe derrière tout : elle donne la montée sans disputer la
       lecture aux marches. La pointe est calculée sur la direction du dernier
       segment, pas placée à l'œil — posée « à peu près », elle flottait à côté
       de sa propre ligne. -->
  <g opacity="0.3">
    <path d="M40 130 L124 100 L210 62 L290 30" fill="none" stroke="${TURQUOISE}"
          stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M308.6 22.6 L296.4 40.4 L287.4 18.2Z" fill="${TURQUOISE}"/>
  </g>

  ${ombre(249, 148)}
  ${marche(110, 90, 46)}
  ${marche(204, 90, 66)}
  ${marche(298, 90, 34)}

  ${carteAJouer(134, 56, 42, 50, RARETE.MYTHIQUE)}
  ${carteAJouer(222, 22, 54, 64, RARETE.COMMUN)}
  ${carteAJouer(324, 76, 38, 42, RARETE.EPIQUE)}

  ${etincelle(196, 24, 11, OR, 0.95)}
  ${etincelle(306, 52, 8, OR, 0.7)}
`,
);

export const enBase64 = (svg) =>
  `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
