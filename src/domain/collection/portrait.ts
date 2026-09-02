import type { Rarity } from '../types';
import type { Attribute } from './attributes';
import {
  signatureOf,
  type Build,
  type Cut,
  type Headwear,
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

export type { Build as SpriteBuild, Cut, Headwear, Mark, Prop } from './signatures';

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
  /** Couleur du couvre-chef. Jamais celle de la rareté — voir `signatures.ts`. */
  accessory: string;
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
      accessory: signature.accessory ?? signature.coat ?? signature.outfit,
      effects,
      named: true,
    };
  }

  // --- Repli : le tirage d'avant, conservé tel quel ------------------------
  //
  // Il ne sert plus qu'aux personnages sans signature. Aujourd'hui il n'y en a
  // aucun parmi les Légendaires et les Mythiques — mais une carte promue à ce
  // rang doit continuer d'avoir une figurine, quitte à ce qu'elle soit
  // générique, plutôt que de faire une page blanche.
  const random = rngOf(seedOf(subject.id) ^ 0x1d0f);
  const ids = new Set(subject.attributes.map((a) => a.id));

  const build: Build = ids.has('giant')
    ? 'giant'
    : ids.has('fighter') || ids.has('captain')
      ? 'broad'
      : pick<Build>(['slim', 'broad'], random());

  const head: Headwear = ids.has('pirate') && random() > 0.55 ? 'brim' : 'none';
  const cut: Cut = pick<Cut>(['short', 'long', 'spiky'], random());

  const prop: Prop = ids.has('sword')
    ? 'sword'
    : ids.has('fruit') || ids.has('logia') || ids.has('paramecia') || ids.has('zoan')
      ? 'staff'
      : 'none';

  return {
    build,
    cut,
    head,
    mark: 'none',
    prop,
    hair: pick(HAIR, random()),
    skin: pick(SKIN, random()),
    outfit: pick(OUTFIT, random()),
    coat: null,
    accessory: pick(OUTFIT, random()),
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
