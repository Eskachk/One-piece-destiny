import type { Rarity } from '../types';
import type { Attribute } from './attributes';

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

/** Côté de la grille du portrait en pixels. */
export const PIXEL_GRID = 12;

/**
 * Grille du portrait en pixels : `null` pour un pixel vide, une couleur sinon.
 *
 * Le visage est construit par **symétrie sur l'axe vertical** : on ne tire que
 * la moitié gauche et on la reflète. Sans cela, un tirage libre donne des
 * visages bancals — un œil plus haut que l'autre, une mèche d'un seul côté —
 * et le résultat ne se lit plus comme un visage.
 */
export function pixelPortrait(
  subject: PortraitSubject,
  palette: PortraitPalette,
): (string | null)[][] {
  const random = rngOf(seedOf(subject.id) ^ 0x5f3a);
  const grid: (string | null)[][] = [];

  // Silhouette : un ovale, tiré large ou étroit selon la graine.
  const width = 3 + Math.floor(random() * 2); // demi-largeur du visage
  const hairLine = 2 + Math.floor(random() * 2);
  const half = PIXEL_GRID / 2;

  for (let y = 0; y < PIXEL_GRID; y += 1) {
    const row: (string | null)[] = new Array(PIXEL_GRID).fill(null);

    for (let x = 0; x < half; x += 1) {
      const dx = half - 1 - x; // distance à l'axe
      const inFace = y >= 1 && y <= PIXEL_GRID - 3 && dx <= width;

      if (!inFace) continue;

      // Les coins du haut et du bas sont retirés : sans eux, le visage est un
      // rectangle et pas une tête.
      const corner = (y <= 2 || y >= PIXEL_GRID - 4) && dx === width;
      if (corner) continue;

      let colour = palette.skin;
      if (y <= hairLine) colour = palette.hair;
      // Les yeux, deux pixels sombres à hauteur fixe : les tirer au sort les
      // fait glisser sur le front ou sur le menton.
      else if (y === hairLine + 2 && dx === width - 1) colour = '#1a1a22';
      else if (y >= PIXEL_GRID - 4) colour = palette.outfit;

      row[x] = colour;
      row[PIXEL_GRID - 1 - x] = colour;
    }

    grid.push(row);
  }

  return grid;
}

// ---------------------------------------------------------------------------
// Légendaire et Mythique — figurine
// ---------------------------------------------------------------------------

export type SpriteBuild = 'slim' | 'broad' | 'giant';
export type SpriteHair = 'short' | 'long' | 'spiky' | 'hat';
export type SpriteProp = 'sword' | 'staff' | 'none';

export interface SpriteTraits {
  build: SpriteBuild;
  hair: SpriteHair;
  prop: SpriteProp;
  /** Effets réservés au Mythique : aura, éclats, cape animée. */
  effects: boolean;
}

/**
 * Traits de la figurine.
 *
 * Les trois qui se voient le plus — carrure, coiffure, accessoire — sont
 * **déduits des données** plutôt que tirés au sort, parce que c'est ce qui
 * fait qu'une figurine « ressemble » à son personnage :
 *
 *   — un géant est bâti comme un géant ;
 *   — un épéiste tient une lame, un utilisateur de fruit un bâton de Haki ;
 *   — un pirate au chapeau garde son chapeau.
 *
 * Le reste — la coiffure quand rien ne l'impose — vient de la graine.
 */
export function spriteTraits(subject: PortraitSubject): SpriteTraits {
  const random = rngOf(seedOf(subject.id) ^ 0x1d0f);
  const ids = new Set(subject.attributes.map((a) => a.id));

  const build: SpriteBuild = ids.has('giant')
    ? 'giant'
    : ids.has('fighter') || ids.has('captain')
      ? 'broad'
      : pick<SpriteBuild>(['slim', 'broad'], random());

  const hair: SpriteHair = ids.has('pirate') && random() > 0.55
    ? 'hat'
    : pick<SpriteHair>(['short', 'long', 'spiky'], random());

  const prop: SpriteProp = ids.has('sword')
    ? 'sword'
    : ids.has('fruit') || ids.has('logia') || ids.has('paramecia') || ids.has('zoan')
      ? 'staff'
      : 'none';

  return { build, hair, prop, effects: subject.rarity === 'MYTHIC' };
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
