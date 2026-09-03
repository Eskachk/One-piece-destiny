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
export const PIXEL_GRID = 16;

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
export function pixelPortrait(traits: SpriteTraits): (string | null)[][] {
  const N = PIXEL_GRID;
  const half = N / 2;
  const grid: (string | null)[][] = Array.from({ length: N }, () =>
    new Array<string | null>(N).fill(null),
  );

  const poser = (x: number, y: number, couleur: string) => {
    if (x < 0 || y < 0 || x >= half || y >= N) return;
    grid[y][x] = couleur;
    grid[y][N - 1 - x] = couleur;
  };

  // Largeur du visage selon sa forme. C'est le premier trait qu'on lit.
  const joue =
    traits.face === 'long' ? 4 : traits.face === 'square' ? 6 : traits.face === 'sharp' ? 5 : 5;

  const hautVisage = 4;
  const basVisage = traits.face === 'long' ? 13 : 12;

  // --- Le visage -----------------------------------------------------------
  for (let y = hautVisage; y <= basVisage; y += 1) {
    for (let x = 0; x < half; x += 1) {
      const dx = half - 1 - x;
      if (dx > joue) continue;

      // Les coins sont retirés : sans eux le visage est un rectangle. Un
      // menton anguleux se rétrécit en plus sur les deux dernières rangées.
      const coinHaut = y <= hautVisage + 1 && dx === joue;
      const coinBas = y >= basVisage - 1 && dx === joue;
      const menton = traits.face === 'sharp' && y >= basVisage - 1 && dx >= joue - 1;
      if (coinHaut || coinBas || menton) continue;

      poser(x, y, traits.skin);
    }
  }

  // --- La chevelure --------------------------------------------------------
  const frange = traits.cut === 'bald' ? -1 : traits.cut === 'spiky' ? 6 : 5;

  if (traits.cut !== 'bald') {
    for (let y = 2; y <= frange; y += 1) {
      for (let x = 0; x < half; x += 1) {
        const dx = half - 1 - x;
        if (dx > joue) continue;
        // La banane et les épis montent d'une rangée au centre ; la coupe
        // droite s'arrête net.
        if (y === 2 && traits.cut !== 'spiky' && traits.cut !== 'pompadour') continue;
        if (y <= 3 && dx > joue - 2) continue;
        poser(x, y, traits.hair);
      }
    }

    // Ce qui descend sur les côtés : long, ondulé, queue, couettes.
    const descend =
      traits.cut === 'long' || traits.cut === 'wavy'
        ? basVisage
        : traits.cut === 'ponytail' || traits.extras.includes('twin-tails')
          ? basVisage - 2
          : traits.cut === 'afro'
            ? basVisage - 4
            : -1;
    for (let y = frange + 1; y <= descend; y += 1) {
      poser(half - 1 - joue, y, traits.hair);
      if (traits.cut === 'afro') poser(half - 2 - joue, y, traits.hair);
    }
  }

  // --- Le regard -----------------------------------------------------------
  const yeux = traits.eyes === 'wide' ? 7 : 8;
  poser(half - 1 - (joue - 1), yeux, '#ffffffdd');
  poser(half - 1 - (joue - 2), yeux, '#1a1a22');
  if (traits.eyes === 'wide') {
    poser(half - 1 - (joue - 1), yeux + 1, '#1a1a22');
    poser(half - 1 - (joue - 2), yeux + 1, '#1a1a22');
  }

  // --- La marque du visage -------------------------------------------------
  if (traits.mark === 'glasses' || traits.mark === 'shades' || traits.mark === 'blind') {
    const teinte = traits.mark === 'glasses' ? '#33333d' : traits.mark === 'blind' ? '#e6e0d2' : '#15151c';
    for (let dx = 0; dx <= joue; dx += 1) poser(half - 1 - dx, yeux, teinte);
  }
  if (traits.mark === 'beard' || traits.mark === 'moustache' || traits.mark === 'goatee') {
    const depart = traits.mark === 'moustache' ? basVisage - 2 : basVisage - 1;
    const largeur = traits.mark === 'goatee' ? 1 : joue - 1;
    for (let y = depart; y <= basVisage; y += 1) {
      for (let dx = 0; dx <= largeur; dx += 1) poser(half - 1 - dx, y, traits.hair);
    }
  }
  if (traits.mark === 'scar-eye' || traits.mark === 'scar-triple') {
    poser(half - 1 - (joue - 1), yeux - 1, '#8a3a30');
    poser(half - 1 - (joue - 1), yeux + 1, '#8a3a30');
  }

  // --- Le couvre-chef ------------------------------------------------------
  const chapeau: Partial<Record<Headwear, { hauteur: number; bord: boolean }>> = {
    strawhat: { hauteur: 2, bord: true },
    brim: { hauteur: 2, bord: true },
    tricorne: { hauteur: 2, bord: true },
    tophat: { hauteur: 4, bord: true },
    cap: { hauteur: 2, bord: false },
    bandana: { hauteur: 1, bord: false },
    hood: { hauteur: 3, bord: false },
    crown: { hauteur: 2, bord: false },
    mask: { hauteur: 0, bord: false },
  };
  const forme = chapeau[traits.head];
  if (forme) {
    const teinte = traits.head === 'strawhat' ? '#e8c87a' : traits.accessory;
    const bas = traits.head === 'bandana' ? 4 : 3;
    for (let y = bas - forme.hauteur + 1; y <= bas; y += 1) {
      for (let dx = 0; dx <= joue; dx += 1) poser(half - 1 - dx, y, teinte);
    }
    if (forme.bord) {
      for (let dx = 0; dx <= joue + 2; dx += 1) poser(half - 1 - dx, bas + 1, teinte);
    }
  }
  // Le masque couvre le visage entier, il ne se pose pas dessus.
  if (traits.head === 'mask') {
    for (let y = hautVisage; y <= yeux + 1; y += 1) {
      for (let dx = 0; dx <= joue; dx += 1) poser(half - 1 - dx, y, '#2a2a33');
    }
    poser(half - 1 - (joue - 2), yeux, traits.accessory);
  }

  // --- Les épaules ---------------------------------------------------------
  for (let y = basVisage + 1; y < N; y += 1) {
    for (let x = 0; x < half; x += 1) {
      const dx = half - 1 - x;
      if (dx > joue + 2) continue;
      if (y === basVisage + 1 && dx > joue) continue;
      poser(x, y, traits.coat ?? traits.outfit);
    }
  }
  // Un col, pour que les épaules ne soient pas un bloc.
  for (let dx = 0; dx <= 1; dx += 1) poser(half - 1 - dx, basVisage + 1, traits.skin);

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
