import type { Rarity } from '../types';
import type { Attribute } from './attributes';
import {
  signatureOf,
  type Brow,
  type Build,
  type Cut,
  type Extra,
  type Eyes,
  type Face,
  type Frame,
  type Headwear,
  type Height,
  type Mark,
  type Prop,
} from './signatures';

/**
 * Ce dont l'illustration a besoin, et rien de plus.
 *
 * Volontairement plus étroit qu'un `Character` : la cérémonie d'ouverture de
 * coffre est un composant client alimenté par une action serveur, elle ne
 * reçoit que du JSON. Faire dépendre le portrait d'un `Character` complet
 * obligerait à réimporter les 740 personnages dans le navigateur pour trois
 * couleurs — exactement ce que le travail de performance a retiré.
 */
export interface PortraitSubject {
  id: string;
  rarity: Rarity;
  /** Attributs déjà calculés par `attributesOf`. */
  attributes: readonly Attribute[];
}

/**
 * Illustration d'une carte, par rareté (cahier §24, §122).
 *
 * Le niveau de représentation monte avec la rareté. C'est ce qui donne au
 * tirage un contenu visible : jusqu'ici, un Mythique et un Commun étaient deux
 * rectangles avec un nom dedans, et la seule différence était la couleur du
 * liseré.
 *
 *   Commun     → rien. Une carte de base reste sobre, et l'absence même
 *                d'illustration rend l'apparition de la suivante lisible.
 *   Rare       → un pictogramme, choisi d'après ce que le personnage sait
 *                faire.
 *   Épique     → un portrait en pixels.
 *   Légendaire → une figurine dessinée, en pied.
 *   Mythique   → la même figurine, avec ses effets.
 *
 * ## Ce que ces images sont, et ce qu'elles ne sont pas
 *
 * **Aucun visuel de l'œuvre n'est repris** (§122). Il n'y a ni planche, ni
 * capture, ni décalque : chaque portrait est **généré** à partir de
 * l'identifiant du personnage et de ses attributs factuels. Un vrai portrait
 * de Zoro demanderait une licence ; ce que le jeu affiche est une silhouette
 * dont la coupe, la couleur et l'accessoire découlent de ses données.
 *
 * ## Pourquoi c'est déterministe
 *
 * Le même personnage doit donner exactement la même image, sur tous les
 * appareils et à chaque rendu. Un tirage aléatoire produirait un portrait
 * différent à chaque ouverture de page : le joueur ne reconnaîtrait pas sa
 * propre collection. La graine est donc l'identifiant, et rien d'autre.
 */

/**
 * Empreinte 32 bits d'une chaîne (FNV-1a).
 *
 * Choisie pour trois raisons : elle tient en cinq lignes, elle disperse bien
 * les chaînes courtes qui ne diffèrent que d'une lettre — `nami` et `nano` ne
 * doivent pas donner le même visage — et elle donne le même résultat côté
 * serveur et côté navigateur, ce dont dépend tout le reste.
 */
export function seedOf(id: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Générateur pseudo-aléatoire à partir d'une graine.
 *
 * Suite déterministe : deux appels successifs donnent deux valeurs
 * différentes, mais la même suite pour la même graine.
 */
export function rngOf(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 0x1_0000_0000;
  };
}

function pick<T>(list: readonly T[], value: number): T {
  return list[Math.floor(value * list.length) % list.length];
}

// ---------------------------------------------------------------------------
// Rare — pictogramme
// ---------------------------------------------------------------------------

/**
 * Pictogramme d'une carte Rare.
 *
 * Il est **tiré des attributs**, pas au hasard : un épéiste montre une lame,
 * un utilisateur de Logia un tourbillon. Le symbole dit donc quelque chose du
 * personnage, ce qui est la seule justification d'en mettre un.
 *
 * Repli sur le drapeau noir quand le personnage n'a aucun attribut : c'est le
 * cas de sept entrées dont la source ne dit rien.
 */
export function emojiFor(subject: PortraitSubject): string {
  return subject.attributes[0]?.symbol ?? '🏴';
}

// ---------------------------------------------------------------------------
// Épique et au-delà — palette du personnage
// ---------------------------------------------------------------------------

/**
 * Palette d'un personnage.
 *
 * Elle ne sert plus qu'au fond du portrait en pixels : le dessin lui-même lit
 * désormais les mêmes `SpriteTraits` que la figurine, pour qu'un Épique et un
 * Légendaire du même personnage ne se contredisent pas.
 */
export interface PortraitPalette {
  hair: string;
  skin: string;
  outfit: string;
  accent: string;
}

/**
 * Cheveux et teints : des gammes plausibles, pas un arc-en-ciel.
 *
 * Une palette entièrement aléatoire produit des visages verts et des tenues
 * fluorescentes ; l'ensemble cesse alors de ressembler à une galerie de
 * personnages pour ressembler à du bruit.
 */
const HAIR = ['#1c1712', '#3b2a1b', '#7a4a1f', '#c9922f', '#d8d3c8', '#2f4a7a', '#7a2f3f', '#4a7a4f'];
const SKIN = ['#f2c9a4', '#e0aa7d', '#c1854f', '#8e5a34', '#5f3a20'];
const OUTFIT = ['#c9302c', '#1f4f8f', '#2f7a5f', '#5a3a7a', '#3a3a42', '#a8621f', '#1b6b74'];

/**
 * Palette d'un personnage.
 *
 * La couleur d'accent n'est pas tirée au sort : c'est celle de sa rareté. Elle
 * relie le portrait au liseré de la carte, de sorte qu'un Légendaire se
 * reconnaît même réduit à une vignette.
 */
export function paletteOf(subject: PortraitSubject, rarityColor: string): PortraitPalette {
  const random = rngOf(seedOf(subject.id));
  return {
    hair: pick(HAIR, random()),
    skin: pick(SKIN, random()),
    outfit: pick(OUTFIT, random()),
    accent: rarityColor,
  };
}

// ---------------------------------------------------------------------------
// Épique — portrait en pixels
// ---------------------------------------------------------------------------

/**
 * Côté de la grille du portrait en pixels.
 *
 * Passé de 12 à 16. Ce n'est pas de la coquetterie : à douze, une fois la
 * chevelure et les épaules posées, il restait six rangées pour le visage —
 * de quoi loger deux yeux et rien d'autre. Un chapeau, une barbe ou une paire
 * de lunettes n'avaient nulle part où aller, et c'est précisément ce qui
 * distingue un personnage d'un autre.
 */
export const PIXEL_GRID = 64;

/**
 * Portrait en pixels — Épique.
 *
 * ## Ce qui a changé
 *
 * Il était bâti sur une palette tirée de l'empreinte de l'identifiant : trois
 * couleurs prises au hasard dans des listes de huit, cinq et sept, sur un
 * ovale toujours identique. Cent quarante-neuf personnages, et un seul visage
 * décliné en couleurs. C'était le même défaut que sur les figurines, une
 * rareté plus bas.
 *
 * Il lit maintenant les mêmes `SpriteTraits` que la figurine : quand le
 * personnage a une signature écrite, sa teinte de cheveux, son teint, sa
 * tenue, sa coupe, son couvre-chef et sa marque de visage sont les siens.
 * Sinon le repli déterministe s'applique — mais sur un dessin qui a de la
 * place pour les porter.
 *
 * ## Ce qui n'a pas changé
 *
 * La **symétrie**. On ne calcule que la moitié gauche et on la reflète : sans
 * cela, un tirage libre donne des visages bancals — un œil plus haut que
 * l'autre, une mèche d'un seul côté — et le résultat ne se lit plus comme un
 * visage.
 */
/**
 * Résolution du portrait Épique.
 *
 * Trente-deux et non seize. Le doublement n'est pas cosmétique : à seize, le
 * visage occupait neuf rangées, ce qui laissait **une** rangée pour l'œil,
 * **une** pour la bouche, et rien pour un nez, un sourcil ou un col. Tout ce
 * qui distingue deux visages tombait sous le seuil du dessinable.
 *
 * À trente-deux, le visage en occupe dix-huit : deux rangées pour l'œil avec
 * son blanc et sa pupille, une pour le sourcil, deux pour le nez, deux pour la
 * bouche, et de quoi donner une épaisseur à la chevelure au lieu d'un bloc.
 *
 * ## Pourquoi tout est écrit en proportions
 *
 * La version précédente posait des coordonnées entières — visage de la rangée
 * 4 à la rangée 12, joues sur cinq colonnes — calées sur seize. Changer la
 * constante ne changeait donc rien d'autre que la taille du cadre : le dessin
 * se retrouvait tassé dans un coin.
 *
 * Ici chaque repère est une fraction de `N`, arrondie au pixel. Passer à
 * soixante-quatre ne demanderait qu'une ligne — et ajouter du détail, pas de
 * la réécriture.
 */
/**
 * Portrait Épique — soixante-quatre pixels de côté.
 *
 * ## Ce que chaque palier a permis
 *
 * À seize, le visage tenait sur neuf rangées : **une** pour l'œil, **une** pour
 * la bouche, rien pour un nez ou un sourcil. À trente-deux, l'œil a gagné son
 * blanc et sa pupille. À soixante-quatre, le visage occupe trente-six rangées,
 * et ce sont les traits eux-mêmes qui deviennent dessinables : un iris avec son
 * reflet, une arête de nez et ses ailes, une lèvre supérieure distincte de
 * l'inférieure, une oreille, un col.
 *
 * ## Pourquoi doubler la grille ne suffisait pas
 *
 * La géométrie d'ensemble était déjà écrite en proportions, elle a donc suivi
 * sans rien changer. **Les traits, non** : l'œil restait à deux pixels, le nez
 * à un, la bouche à six — dans un visage devenu trois fois plus large. On
 * obtenait un visage juste, aux yeux de mouche.
 *
 * Tout est donc exprimé en `u`, l'unité de dessin — un trente-deuxième du
 * cadre. Un œil de `3u` de large fait trois pixels à trente-deux et six à
 * soixante-quatre : il occupe la même place sur le visage, et gagne
 * simplement de quoi porter un détail de plus.
 */
export function pixelPortrait(traits: SpriteTraits): (string | null)[][] {
  const N = PIXEL_GRID;
  const half = N / 2;
  const grid: (string | null)[][] = Array.from({ length: N }, () =>
    new Array<string | null>(N).fill(null),
  );

  /** Pose un pixel et son symétrique : un visage ne se dessine qu'à moitié. */
  const poser = (x: number, y: number, couleur: string) => {
    if (x < 0 || y < 0 || x >= half || y >= N) return;
    grid[y][x] = couleur;
    grid[y][N - 1 - x] = couleur;
  };

  /** `dx` compte depuis l'axe : 0 au centre. */
  const colonne = (dx: number) => half - 1 - dx;
  const bande = (y1: number, y2: number, dxMax: number, couleur: string, dxMin = 0) => {
    for (let y = y1; y <= y2; y += 1) {
      for (let dx = dxMin; dx <= dxMax; dx += 1) poser(colonne(dx), y, couleur);
    }
  };

  const r = (f: number) => Math.round(f * N);
  /** L'unité de dessin : un trente-deuxième du cadre. */
  const u = Math.max(1, Math.round(N / 32));

  const joue =
    traits.face === 'long' ? r(0.2)
    : traits.face === 'square' ? r(0.28)
    : traits.face === 'sharp' ? r(0.24)
    : r(0.26);

  const hautVisage = r(0.19);
  const basVisage = traits.face === 'long' ? r(0.68) : r(0.63);
  const hautCrane = r(0.09);

  const largeurAu = (y: number) => {
    const t = (y - hautVisage) / Math.max(1, basVisage - hautVisage);
    let largeur = joue;
    if (t < 0.14) largeur -= 2 * u;
    else if (t < 0.26) largeur -= u;
    if (t > 0.86) largeur -= (traits.face === 'sharp' ? 3 : 2) * u;
    else if (t > 0.74) largeur -= (traits.face === 'sharp' ? 2 : 1) * u;
    if (traits.face === 'square' && t > 0.74) largeur += u;
    return Math.max(1, largeur);
  };

  // --- Le visage -----------------------------------------------------------
  for (let y = hautVisage; y <= basVisage; y += 1) bande(y, y, largeurAu(y), traits.skin);

  // Les oreilles : deux bosses à hauteur des yeux. Elles ne se remarquent pas,
  // et leur absence se remarque — une tête sans oreilles paraît rasée.
  const ligneOeil = traits.eyes === 'wide' ? r(0.4) : r(0.42);
  if (N >= 32) {
    for (let dy = 0; dy < 3 * u; dy += 1) {
      const y = ligneOeil - u + dy;
      bande(y, y, largeurAu(y) + u, traits.skin, largeurAu(y) + 1);
    }
  }

  // --- La chevelure --------------------------------------------------------
  if (traits.cut !== 'bald') {
    const volume =
      traits.cut === 'afro' ? 3 * u : traits.cut === 'spiky' || traits.cut === 'pompadour' ? 2 * u : u;
    const frange =
      traits.cut === 'pompadour' ? r(0.34) : traits.cut === 'spiky' ? r(0.32) : r(0.3);

    for (let y = hautCrane; y <= frange; y += 1) {
      const t = (y - hautCrane) / Math.max(1, frange - hautCrane);
      let largeur = (y >= hautVisage ? largeurAu(y) : joue - u) + (volume - u);
      if (t < 0.3) largeur -= 2 * u;
      else if (t < 0.5) largeur -= u;
      bande(y, y, Math.max(1, largeur), traits.hair);
    }

    // Pas de mèches dessinées dans la masse. Essayées longues puis courtes,
    // elles se lisent dans les deux cas comme des barreaux verticaux — un
    // peigne posé sur la tête. À cette résolution, une masse franche est plus
    // juste qu'un faux détail : ce qui distingue une chevelure, c'est sa
    // silhouette et sa couleur, pas sa texture.

    if (traits.cut === 'spiky') {
      for (const dx of [0, Math.round(joue * 0.55), joue - u]) {
        bande(hautCrane - 2 * u, hautCrane - 1, dx, traits.hair, dx);
      }
    }
    if (traits.cut === 'pompadour') {
      bande(hautCrane - 3 * u, hautCrane - 1, Math.round(joue * 0.6), traits.hair);
    }

    const descend =
      traits.cut === 'long' || traits.cut === 'wavy' ? basVisage + r(0.09)
      : traits.cut === 'ponytail' ? basVisage - r(0.06)
      : traits.cut === 'afro' ? r(0.5)
      : traits.cut === 'topknot' ? r(0.34)
      : -1;

    for (let y = frange + 1; y <= descend; y += 1) {
      const epaisseur = traits.cut === 'afro' ? 3 * u : traits.cut === 'wavy' ? 2 * u : u;
      const bord = y <= basVisage ? largeurAu(y) : largeurAu(basVisage);
      for (let e = 0; e < epaisseur; e += 1) poser(colonne(bord + e), y, traits.hair);
    }

    if (traits.cut === 'topknot') bande(hautCrane - 4 * u, hautCrane - 1, 2 * u, traits.hair);
  }

  // --- Le regard -----------------------------------------------------------
  // L'œil grandit avec le cadre : blanc, iris, pupille, et un reflet quand la
  // place existe. C'est le seul trait dont le détail se voit vraiment.
  const dxOeil = Math.round(joue * 0.5);
  const largeurOeil = Math.max(2, 2 * u);
  const hauteurOeil = traits.eyes === 'narrow' ? Math.max(1, u) : Math.max(2, 2 * u);

  for (let dy = 0; dy < hauteurOeil; dy += 1) {
    for (let dx = 0; dx < largeurOeil; dx += 1) {
      poser(colonne(dxOeil + dx - Math.floor(largeurOeil / 2)), ligneOeil + dy, '#fbf7ec');
    }
  }
  // L'iris, décalé vers le nez : un œil centré regarde dans le vide.
  const irisY = ligneOeil + (hauteurOeil > 1 ? Math.floor(hauteurOeil / 2) : 0);
  const irisDx = dxOeil - Math.floor(largeurOeil / 2) + Math.max(0, u - 1);
  for (let dy = 0; dy < Math.max(1, u); dy += 1) {
    for (let dx = 0; dx < Math.max(1, u); dx += 1) {
      poser(colonne(irisDx - dx), irisY - dy, '#1a1a22');
    }
  }
  if (u >= 2) poser(colonne(irisDx + 1), irisY - u, '#ffffffcc'); // le reflet

  // --- Les sourcils --------------------------------------------------------
  if (traits.brow && traits.brow !== 'neutral') {
    const y = ligneOeil - 2 * u;
    const ext = dxOeil + u;
    const centre = dxOeil - u;
    const epais = Math.max(1, Math.floor(u / 1.5));
    for (let e = 0; e < epais; e += 1) {
      if (traits.brow === 'fierce') {
        bande(y + e, y + e, ext, traits.hair, dxOeil);
        bande(y + u + e, y + u + e, dxOeil - 1, traits.hair, centre);
      } else if (traits.brow === 'arched') {
        bande(y + u + e, y + u + e, ext, traits.hair, dxOeil);
        bande(y + e, y + e, dxOeil - 1, traits.hair, centre);
      } else {
        bande(y + e, y + e, ext, traits.hair, centre);
      }
    }
  }

  // --- Le nez et la bouche -------------------------------------------------
  const ombre = '#00000026';
  const basNez = r(0.53);
  // L'arête, puis les ailes : à seize pixels on ne pouvait poser qu'un point.
  for (let y = ligneOeil + hauteurOeil; y <= basNez; y += 1) poser(colonne(0), y, ombre);
  if (u >= 2) {
    for (let dx = 0; dx <= u; dx += 1) poser(colonne(dx), basNez, ombre);
  }

  const ligneBouche = r(0.58);
  const largeurBouche = Math.max(2, Math.round(joue * 0.24));
  bande(ligneBouche, ligneBouche, largeurBouche, '#8a4a44');
  if (u >= 2) {
    // La lèvre inférieure, plus courte et plus claire que la supérieure.
    bande(ligneBouche + 1, ligneBouche + 1, largeurBouche - u, '#a8615a');
  }

  // --- La marque du visage -------------------------------------------------
  if (traits.mark === 'glasses' || traits.mark === 'shades' || traits.mark === 'blind') {
    const teinte =
      traits.mark === 'glasses' ? '#33333d' : traits.mark === 'blind' ? '#e6e0d2' : '#15151c';
    bande(ligneOeil, ligneOeil + hauteurOeil - 1, joue, teinte);
    bande(ligneOeil, ligneOeil, joue + u, teinte, joue);
  }
  if (traits.mark === 'beard' || traits.mark === 'moustache' || traits.mark === 'goatee') {
    const depart = traits.mark === 'moustache' ? ligneBouche - u : ligneBouche + 2 * u;
    const fin = traits.mark === 'moustache' ? ligneBouche - 1 : basVisage + u;
    const largeur = traits.mark === 'goatee' ? 2 * u : joue - u;
    bande(depart, fin, largeur, traits.hair);
    if (traits.mark === 'beard') bande(ligneBouche - u, ligneBouche - 1, joue - 2 * u, traits.hair);
  }
  if (traits.mark === 'scar-eye' || traits.mark === 'scar-triple') {
    for (let dy = -2 * u; dy <= 2 * u; dy += 1) poser(colonne(dxOeil + u), ligneOeil + dy, '#8a3a30');
    if (traits.mark === 'scar-triple') {
      for (let dy = -u; dy <= u; dy += 1) poser(colonne(dxOeil + 2 * u), ligneOeil + dy, '#8a3a30');
    }
  }
  if (traits.mark === 'freckles') {
    for (const dx of [dxOeil, dxOeil - u, dxOeil + u]) {
      poser(colonne(dx), basNez + u, '#00000030');
    }
  }
  if (traits.mark === 'cigarette' || traits.mark === 'cigar') {
    const longueur = (traits.mark === 'cigar' ? 4 : 3) * u;
    for (let dx = largeurBouche; dx < largeurBouche + longueur; dx += 1) {
      for (let e = 0; e < Math.max(1, u - 1); e += 1) {
        const y = ligneBouche + e;
        if (y < N) grid[y][half - 1 - dx] = traits.mark === 'cigar' ? '#6a4a2a' : '#efe9dc';
      }
    }
  }

  // --- Le couvre-chef ------------------------------------------------------
  const CHAPEAUX: Partial<Record<Headwear, { hauteur: number; bord: number }>> = {
    strawhat: { hauteur: r(0.09), bord: 4 * u },
    brim: { hauteur: r(0.09), bord: 4 * u },
    tricorne: { hauteur: r(0.09), bord: 5 * u },
    tophat: { hauteur: r(0.2), bord: 3 * u },
    cap: { hauteur: r(0.09), bord: 0 },
    bandana: { hauteur: r(0.05), bord: 0 },
    hood: { hauteur: r(0.14), bord: u },
    crown: { hauteur: r(0.06), bord: 0 },
    horns: { hauteur: r(0.05), bord: 0 },
    mask: { hauteur: 0, bord: 0 },
  };
  const forme = CHAPEAUX[traits.head];
  if (forme && traits.head !== 'mask') {
    const teinte = traits.head === 'strawhat' ? '#e8c87a' : traits.accessory;
    const bas = traits.head === 'bandana' ? r(0.28) : r(0.22);
    bande(bas - forme.hauteur + 1, bas, joue + u, teinte);
    if (forme.bord > 0) {
      bande(bas + 1, bas + u, joue + forme.bord, teinte);
      bande(bas + u + 1, bas + u + 1, joue + u, '#00000022');
    }
    if (traits.head === 'crown') {
      for (const dx of [0, 3 * u, 6 * u]) bande(bas - forme.hauteur - u, bas - forme.hauteur, dx, teinte, dx);
    }
    if (traits.head === 'horns') {
      for (let dy = 1; dy <= 3 * u; dy += 1) poser(colonne(joue), bas - forme.hauteur - dy, teinte);
    }
  }
  if (traits.head === 'mask') {
    bande(hautVisage, ligneOeil + hauteurOeil, joue, '#2a2a33');
    for (let dy = 0; dy < hauteurOeil; dy += 1) {
      poser(colonne(dxOeil), ligneOeil + dy, traits.accessory);
    }
  }

  // --- Le cou et les épaules -----------------------------------------------
  // Une unité sous la mâchoire, pas deux : au-delà, une bande de fond
  // apparaissait de chaque côté du cou, entre le menton et l'épaule.
  const hautEpaules = basVisage + u;
  const largeurCou = Math.max(2, 2 * u);

  // Le cou d'abord, sinon les cheveux longs laissent voir le fond entre la
  // mâchoire et l'épaule — le trou qui se voyait à trente-deux.
  bande(basVisage + 1, hautEpaules, largeurCou, traits.skin);
  bande(basVisage + 1, basVisage + u, largeurCou + u, '#00000022', largeurCou);

  for (let y = hautEpaules; y < N; y += 1) {
    const t = (y - hautEpaules) / Math.max(1, N - 1 - hautEpaules);
    const largeur = Math.round(joue + u + t * (half - joue - u));
    bande(y, y, largeur, traits.coat ?? traits.outfit);
  }
  if (traits.coat) bande(hautEpaules + u, N - 1, largeurCou, traits.outfit);

  return grid;
}

// ---------------------------------------------------------------------------
// Légendaire et Mythique — figurine
// ---------------------------------------------------------------------------

export type {
  Build as SpriteBuild,
  Brow,
  Cut,
  Extra,
  Eyes,
  Face,
  Frame,
  Headwear,
  Height,
  Mark,
  Prop,
} from './signatures';

/**
 * Traits de la figurine — Légendaire et Mythique.
 *
 * ## Ce qui a changé, et pourquoi
 *
 * Ils sortaient de l'empreinte de l'identifiant : trois champs, dont deux tirés
 * au sort dans des listes de trois ou quatre. Deux cartes différentes donnaient
 * donc, très souvent, la même figurine à la couleur près — Shanks et Luffy
 * étaient deux bonshommes interchangeables. Pour les cinquante-huit cartes qui
 * portent le jeu, ce n'est pas acceptable : ce sont précisément celles qu'un
 * joueur veut reconnaître d'un coup d'œil dans sa collection.
 *
 * Ces cartes ont maintenant une **signature écrite** (`signatures.ts`) : une
 * description physique en une phrase, et les huit champs qui en découlent. Le
 * tirage ne sert plus que de repli, pour un personnage qui n'en aurait pas.
 *
 * §122 : la signature ne contient que des faits d'apparence — une couleur de
 * cheveux, un chapeau, une arme. Le dessin, lui, reste la même figurine
 * géométrique pour tout le monde.
 */
export interface SpriteTraits {
  build: Build;
  cut: Cut;
  head: Headwear;
  mark: Mark;
  prop: Prop;
  hair: string;
  skin: string;
  outfit: string;
  /** Manteau ouvert par-dessus la tenue, ou `null`. */
  coat: string | null;
  /**
   * Couleur du bas.
   *
   * Les jambes étaient peintes en `#2b2f38` pour tout le monde, en dur dans le
   * dessin. Un short bleu clair, un pantalon violet ou un bas jaune et noir ne
   * pouvaient donc pas exister — et c'est la moitié de la silhouette.
   */
  trousers: string;
  /** Couleur du couvre-chef. Jamais celle de la rareté — voir `signatures.ts`. */
  accessory: string;
  /**
   * Plan du corps.
   *
   * Tout le monde était dessiné sur le patron humain, ce qui donnait un petit
   * bonhomme à casquette rose pour un renne et un homme au visage de crâne pour
   * un squelette. Aucune couleur ne rattrape une silhouette fausse.
   */
  frame: Frame;
  /** Détails ajoutés au patron : long nez, bois, ailes, bras mécanique… */
  extras: readonly Extra[];
  /**
   * Le visage lui-même.
   *
   * Les cinquante-huit avaient rigoureusement la même tête. On pouvait empiler
   * les accessoires : deux figurines se ressemblaient toujours dès qu'on
   * retirait le chapeau, parce que ce qu'on reconnaît d'abord d'un visage,
   * c'est sa forme.
   */
  face: Face;
  eyes: Eyes;
  brow: Brow;
  /** `build` ne disait que la largeur : Kaidô et Nami avaient la même hauteur. */
  height: Height;
  /** Effets réservés au Mythique : aura et éclats. */
  effects: boolean;
  /** Les traits viennent-ils d'une signature écrite, ou du repli ? */
  named: boolean;
}

export function spriteTraits(subject: PortraitSubject): SpriteTraits {
  const signature = signatureOf(subject.id);
  const effects = subject.rarity === 'MYTHIC';

  if (signature) {
    return {
      build: signature.build,
      cut: signature.cut,
      head: signature.head,
      mark: signature.mark,
      prop: signature.prop,
      hair: signature.hair,
      skin: signature.skin,
      outfit: signature.outfit,
      coat: signature.coat ?? null,
      trousers: signature.trousers ?? '#2b2f38',
      accessory: signature.accessory ?? signature.coat ?? signature.outfit,
      frame: signature.frame ?? 'human',
      extras: signature.extras ?? [],
      face: signature.face ?? 'round',
      eyes: signature.eyes ?? 'normal',
      brow: signature.brow ?? 'neutral',
      height: signature.height ?? 'normal',
      effects,
      named: true,
    };
  }

  /*
   * --- Repli déterministe -------------------------------------------------
   *
   * Il sert aux cent quarante-neuf cartes Épiques dont l'apparence n'est pas
   * décrite, et à toute carte qui serait promue à un rang dessiné sans avoir
   * de signature.
   *
   * L'ancienne version ne tirait que trois champs — carrure, coupe parmi
   * trois, accessoire — et laissait tout le reste figé : même visage, même
   * regard, aucune marque, aucun couvre-chef. Cent quarante-neuf portraits
   * pour un seul dessin décliné en couleurs, ce qui était exactement le défaut
   * corrigé un cran plus haut chez les Légendaires.
   *
   * Il tire maintenant **tout ce que le dessin sait rendre**. Ce n'est pas une
   * description — personne n'a décrit ces personnages — mais deux cartes
   * différentes donnent deux portraits différents, ce qui est le minimum
   * qu'on leur doit.
   *
   * Les probabilités ne sont pas uniformes : « rien » revient plusieurs fois
   * dans les listes de couvre-chefs et de marques. Une population où trois
   * personnages sur quatre portent un chapeau ne ressemble pas à une
   * population, elle ressemble à un défilé.
   */
  const random = rngOf(seedOf(subject.id) ^ 0x1d0f);
  const ids = new Set(subject.attributes.map((a) => a.id));

  const build: Build = ids.has('giant')
    ? 'giant'
    : ids.has('fighter') || ids.has('captain')
      ? 'broad'
      : pick<Build>(['slim', 'broad'], random());

  // Ce que les attributs savent réellement dire prime sur le tirage : un
  // épéiste tient une lame, un pirate porte plus souvent un couvre-chef.
  const head: Headwear = ids.has('pirate')
    ? pick<Headwear>(['none', 'brim', 'bandana', 'cap', 'tricorne'], random())
    : pick<Headwear>(['none', 'none', 'none', 'cap', 'bandana'], random());

  const prop: Prop = ids.has('sword')
    ? 'sword'
    : ids.has('fruit') || ids.has('logia') || ids.has('paramecia') || ids.has('zoan')
      ? 'staff'
      : pick<Prop>(['none', 'none', 'none', 'gun', 'knives'], random());

  const teinteCheveux = pick(HAIR, random());

  return {
    build,
    cut: pick<Cut>(
      ['short', 'short', 'long', 'spiky', 'wavy', 'ponytail', 'afro', 'bald'],
      random(),
    ),
    head,
    mark: pick<Mark>(
      ['none', 'none', 'none', 'none', 'beard', 'moustache', 'goatee', 'glasses', 'scar-eye'],
      random(),
    ),
    prop,
    hair: teinteCheveux,
    skin: pick(SKIN, random()),
    outfit: pick(OUTFIT, random()),
    coat: null,
    trousers: '#2b2f38',
    // L'accessoire doit trancher avec la tenue, sinon le chapeau disparaît sur
    // les épaules qui le portent : on le tire dans une gamme claire.
    accessory: pick(['#e8e2d4', '#d8b04a', '#2a2a33', '#8a94a4'], random()),
    frame: 'human',
    extras: [],
    face: pick<Face>(['round', 'round', 'square', 'long', 'sharp'], random()),
    eyes: pick<Eyes>(['normal', 'normal', 'sharp', 'narrow', 'wide'], random()),
    brow: pick<Brow>(['neutral', 'neutral', 'fierce', 'calm', 'arched'], random()),
    height: pick<Height>(['normal', 'normal', 'normal', 'short', 'tall'], random()),
    effects,
    named: false,
  };
}

/** Niveau d'illustration attendu pour une rareté. */
export type ArtLevel = 'none' | 'emoji' | 'pixel' | 'sprite';

export function artLevelOf(rarity: Rarity): ArtLevel {
  switch (rarity) {
    case 'COMMON':
      return 'none';
    case 'RARE':
      return 'emoji';
    case 'EPIC':
      return 'pixel';
    case 'LEGENDARY':
    case 'MYTHIC':
      return 'sprite';
  }
}
