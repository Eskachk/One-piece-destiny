/**
 * Signature physique des cartes Légendaires et Mythiques (cahier §24, §122).
 *
 * ## Le défaut que ceci corrige
 *
 * Les figurines étaient tirées de l'empreinte de l'identifiant. Trois traits
 * seulement — carrure, coiffure, accessoire — et deux d'entre eux au hasard.
 * Résultat : Shanks et Luffy sortaient deux bonshommes interchangeables, à la
 * couleur de cheveux près, elle-même tirée au sort dans une liste de huit. Un
 * joueur ne reconnaissait pas ses propres cartes, et la promesse d'une
 * illustration qui monte avec la rareté n'était pas tenue.
 *
 * ## Ce que cette table contient, et ce qu'elle ne contient pas
 *
 * Des **faits publics** sur l'apparence d'un personnage : la couleur et la
 * coupe des cheveux, le teint, la couleur dominante de la tenue, un couvre-chef
 * s'il en porte un, une marque distinctive, une arme. Rien d'autre.
 *
 * Ce ne sont **pas** des dessins de l'œuvre (§122). Aucune planche n'est
 * décalquée, aucune image n'est reprise. Ce que le jeu affiche reste la
 * figurine géométrique de `CharacterArt` — une tête ovale, un manteau
 * trapézoïdal, des membres rectangulaires — dont les couleurs et les
 * accessoires sont désormais choisis d'après ces données au lieu d'être tirés
 * au sort. Un cheveu vert et trois sabres ne sont pas un dessin de Zoro ; ils
 * suffisent en revanche à ce qu'on sache de quelle carte il s'agit, et c'est
 * exactement ce qui était demandé.
 *
 * La limite est nette et vaut d'être dite : plus on descendrait dans le détail
 * — un motif de tatouage, la coupe exacte d'un manteau — plus on s'approcherait
 * d'une reproduction. On s'arrête donc aux traits qu'une phrase de description
 * suffit à énoncer.
 *
 * ## Pourquoi une table écrite à la main
 *
 * Aucune source de données du projet ne porte l'apparence des personnages :
 * l'API du référentiel donne des noms, des équipages et des primes. Ces
 * cinquante-huit lignes sont donc saisies, et `note` conserve la description en
 * une phrase dont chaque entrée découle — pour qu'on puisse vérifier une
 * figurine sans relire le code qui la dessine.
 */

/** Coupe de cheveux, ou son absence. */
export type Cut =
  | 'short'
  | 'long'
  | 'spiky'
  | 'wavy'
  | 'ponytail'
  | 'topknot'
  | 'afro'
  | 'mohawk'
  | 'pompadour'
  | 'bald';

/** Ce qui est posé sur la tête. */
export type Headwear =
  | 'none'
  | 'strawhat'
  | 'brim' // chapeau à large bord
  | 'cap' // casquette, calot
  | 'tricorne'
  | 'tophat'
  | 'horns'
  | 'mask'
  | 'hood'
  | 'bandana'
  | 'crown';

/** Marque du visage. Une seule par personnage : deux et la vignette sature. */
export type Mark =
  | 'none'
  | 'scar-eye'
  | 'scar-triple'
  | 'scar-face'
  | 'beard'
  | 'moustache'
  | 'goatee'
  | 'cigarette'
  | 'cigar'
  | 'glasses'
  | 'shades'
  | 'blind'
  | 'freckles'
  | 'skull';

/** Ce qu'il tient. */
export type Prop =
  | 'none'
  | 'sword'
  | 'katana3'
  | 'greatsword'
  | 'staff'
  | 'axe'
  | 'club'
  | 'gun'
  | 'knives'
  | 'cane'
  | 'hook';

export type Build = 'slim' | 'broad' | 'giant';

/**
 * La **forme du visage**.
 *
 * Jusqu'ici, les cinquante-huit avaient rigoureusement la même tête : une
 * ellipse de 9 sur 10. On pouvait empiler les accessoires, deux figurines se
 * ressemblaient toujours dès qu'on retirait le chapeau — parce que ce qu'on
 * reconnaît d'abord d'un visage, c'est sa forme, pas ce qu'il porte.
 */
export type Face = 'round' | 'square' | 'long' | 'sharp';

/** La forme du regard. Deux traits identiques donnaient cinquante-huit fois
 *  la même expression. */
export type Eyes = 'normal' | 'sharp' | 'narrow' | 'wide';

/** L'inclinaison des sourcils : ce qui donne une humeur en deux segments. */
export type Brow = 'neutral' | 'fierce' | 'calm' | 'arched';

/**
 * La taille.
 *
 * `build` ne disait que la largeur. Kaidô et Nami avaient donc exactement la
 * même hauteur, ce qui est le plus visible des contresens dans une grille où
 * les figurines sont côte à côte.
 */
export type Height = 'short' | 'normal' | 'tall' | 'towering';

/**
 * Le **plan du corps**. C'est ce qui manquait le plus.
 *
 * Tout le monde était dessiné sur le même patron humain : Chopper sortait donc
 * un petit bonhomme à casquette rose, alors que c'est un renne ; Brook un
 * homme au visage de crâne, alors que c'est un squelette ; Jinbé et Arlong des
 * hommes bleus, alors que ce sont des hommes-poissons. Aucune couleur de
 * cheveux ne rattrape une silhouette fausse.
 */
export type Frame = 'human' | 'reindeer' | 'skeleton' | 'fishman' | 'bear' | 'oni';

/**
 * Détails ajoutés au patron. Un personnage en porte zéro, un ou deux — jamais
 * plus : au-delà, la vignette devient illisible et l'on perd justement ce qu'on
 * cherchait à gagner.
 */
export type Extra =
  | 'long-nose'
  | 'clown-nose'
  | 'antlers'
  | 'tusks'
  | 'mane'
  | 'sharp-teeth'
  | 'ribs'
  | 'fins'
  | 'sawnose'
  | 'missing-arm'
  | 'metal-arm'
  | 'metal-arms'
  | 'bare-chest'
  | 'open-vest'
  | 'haramaki'
  | 'fur-collar'
  | 'feather-coat'
  | 'coat-shoulders'
  | 'cape'
  | 'wings'
  | 'snake'
  | 'pigeon'
  // Seconde série. Treize personnages n'avaient encore aucun signe
  // particulier — Nami, Sanji, Robin, Law, Perona, Sabo… — et le reste s'en
  // tenait à un seul. Ce sont pourtant des traits qu'une phrase énonce sans
  // effort : le sourcil en spirale, le tatouage du bras, les trois boucles
  // d'oreille, les points de suture.
  | 'curly-brow'
  | 'arm-tattoo'
  | 'crossed-arms'
  | 'twin-tails'
  | 'spotted-hat'
  | 'bare-midriff'
  | 'cards'
  | 'beads'
  | 'stitches'
  | 'cravat'
  | 'goggles'
  | 'epaulettes'
  | 'earrings'
  | 'pendant'
  | 'satchel'
  // Troisième série. Les deux premières laissaient encore trente-neuf
  // personnages avec un seul signe particulier : le détail existait, mais un
  // seul par figurine ne suffit pas à les séparer dans une grille de
  // cinquante-huit. Celle-ci porte tout le monde à trois.
  | 'face-tattoo'
  | 'chest-scar'
  | 'x-scar'
  | 'striped-suit'
  | 'necktie'
  | 'gloves'
  | 'boots'
  | 'sash'
  | 'high-collar'
  | 'pauldrons'
  | 'belt'
  // Quatrième série, tirée des descriptions fournies. Chacun de ces traits est
  // cité comme « indispensable à la reconnaissance » du personnage concerné.
  | 'eye-bags'
  | 'closed-eye'
  | 'nose-ring'
  | 'cross-scar'
  | 'chin-tuft'
  | 'feather'
  | 'striped-hat'
  | 'face-lines';

export interface Signature {
  /** Description physique en une phrase. Sert de source à tout le reste. */
  note: string;
  hair: string;
  cut: Cut;
  skin: string;
  outfit: string;
  /** Manteau ouvert par-dessus la tenue. Absent, la figurine n'en porte pas. */
  coat?: string;
  /**
   * Couleur du bas.
   *
   * Les jambes étaient peintes en `#2b2f38` pour tout le monde, en dur dans le
   * dessin. Un short bleu clair, un pantalon violet ou un bas à carreaux ne
   * pouvaient donc pas exister — et c'est la moitié de la silhouette.
   */
  trousers?: string;
  /**
   * Couleur du couvre-chef et du bandeau.
   *
   * Elle valait la couleur de rareté, faute de mieux : toutes les casquettes
   * du jeu étaient donc du même or, celle de Chopper comme celle de Law. À
   * défaut, on retombe sur le manteau ou la tenue, ce qui est presque toujours
   * juste — cette clé ne sert qu'aux exceptions.
   */
  accessory?: string;
  head: Headwear;
  mark: Mark;
  prop: Prop;
  build: Build;
  /** Plan du corps. Absent, on dessine un humain. */
  frame?: Frame;
  /** Forme du visage. Absente, un ovale. */
  face?: Face;
  /** Forme du regard. Absente, deux traits droits. */
  eyes?: Eyes;
  /** Inclinaison des sourcils. Absente, aucun sourcil. */
  brow?: Brow;
  /** Taille. Absente, la taille commune. */
  height?: Height;
  /**
   * Détails ajoutés au patron. **Quatre au maximum**, et jamais deux au même
   * endroit : un sur la tête, un sur le visage, un sur le torse, un sur un
   * bras. Le plafond est passé de trois à quatre pour les personnages dont on
   * a une description écrite : quand une source dit « plume au chapeau »,
   * « anneau au nez » et « cernes permanentes », les écarter au nom d'une
   * règle de comptage serait absurde. Au-delà de quatre, en revanche, la
   * vignette sature et l'on perd ce qu'on cherchait à gagner.
   */
  extras?: readonly Extra[];
}

/* Teints et étoffes récurrents, nommés pour que la table se relise. */
const PALE = '#f3d3b6';
const CLAIR = '#efc49f';
const HALE = '#d9a476';
const MAT = '#a9713f';
const SOMBRE = '#7a4a28';
const OS = '#efece1';

export const SIGNATURES: Readonly<Record<string, Signature>> = {
  // --- Mythiques ------------------------------------------------------------

  luffy: {
    note:
      'Corps mince et sec, visage rond et juvénile, grands yeux noirs. Cheveux noirs courts et hérissés. Cicatrice en X au centre de la poitrine. Chapeau de paille à large bord et ruban rouge, cardigan rouge ouvert, short bleu clair, large écharpe jaune à la taille.',
    hair: '#191919', cut: 'spiky', skin: HALE, outfit: '#d0342c',
    accessory: '#c0342c',
    extras: ['open-vest', 'x-scar', 'sash', 'boots'],
    eyes: 'wide',
    trousers: '#5a9ad8',
    head: 'strawhat', mark: 'scar-eye', prop: 'none', build: 'slim',
  },
  zoro: {
    note:
      'Grand et massif, musculature dense aux épaules et aux avant-bras, visage anguleux à la mâchoire ferme et aux sourcils épais. Cheveux verts courts et hérissés. Œil gauche définitivement fermé, barré d\'une longue cicatrice verticale. Haut ouvert, pantalon sombre, large ceinture, trois sabres à la hanche droite.',
    hair: '#4c8b45', cut: 'short', skin: HALE, outfit: '#1f4034', coat: '#12261f',
    accessory: '#17301f',
    extras: ['haramaki', 'earrings', 'chest-scar', 'closed-eye'],
    face: 'sharp',
    eyes: 'sharp',
    brow: 'fierce',
    trousers: '#1b1f26',
    head: 'bandana', mark: 'scar-eye', prop: 'katana3', build: 'broad',
  },
  nami: {
    note:
      'Élancée, silhouette en sablier, visage fin aux grands yeux bruns. Cheveux orange-cuivré longs et légèrement ondulés tombant dans le dos. Tatouage à l\'épaule gauche : une mandarine et un moulinet. Boucles d\'oreilles, Log Pose au poignet, haut court.',
    hair: '#e8842c', cut: 'wavy', skin: CLAIR, outfit: '#2f6fb5',
    extras: ['arm-tattoo', 'bare-midriff', 'boots', 'earrings'],
    accessory: '#e8842c',
    brow: 'arched',
    trousers: '#2f6fb5',
    head: 'none', mark: 'none', prop: 'staff', build: 'slim',
  },
  usopp: {
    note: 'Cheveux noirs crépus noués en arrière, bandana, teint sombre, long nez, lance-pierres.',
    hair: '#241a12', cut: 'ponytail', skin: SOMBRE, outfit: '#c8a02c',
    accessory: '#5a4a2a',
    extras: ['long-nose', 'satchel', 'goggles'],
    eyes: 'wide',
    head: 'bandana', mark: 'none', prop: 'gun', build: 'slim',
  },
  sanji: {
    note:
      'Grand, mince et musclé, longues jambes, visage fin et allongé au menton marqué. Cheveux blond doré en mèches souples couvrant l\'œil droit. Les deux sourcils en spirale. Légère barbe autour de la bouche. Costume noir ajusté, chemise claire, cravate, chaussures noires.',
    hair: '#e0be5a', cut: 'short', skin: PALE, outfit: '#23232b', coat: '#15151a',
    extras: ['curly-brow', 'necktie', 'boots', 'chin-tuft'],
    face: 'sharp',
    brow: 'arched',
    trousers: '#1c1c22',
    head: 'none', mark: 'cigarette', prop: 'none', build: 'slim',
  },
  chopper: {
    note: 'Petit renne, pelage brun clair, chapeau rose à croix blanche, bois ramifiés.',
    hair: '#8a5a33', cut: 'short', skin: '#d8b98a', outfit: '#c0524f',
    accessory: '#e0708a',
    frame: 'reindeer',
    extras: ['antlers', 'satchel', 'belt'],
    eyes: 'wide',
    height: 'short',
    head: 'cap', mark: 'none', prop: 'none', build: 'slim',
  },
  robin: {
    note:
      'Grande et très élancée, allure de mannequin, visage fin et mature aux yeux bleu-gris. Cheveux noirs longs et lisses, frange et mèches encadrant le visage. Style raffiné : manteau, pantalon ajusté, talons.',
    hair: '#141018', cut: 'long', skin: HALE, outfit: '#5a3a7a', coat: '#3d2455',
    extras: ['crossed-arms', 'high-collar', 'boots', 'earrings'],
    brow: 'calm',
    trousers: '#3d2455',
    head: 'none', mark: 'shades', prop: 'none', build: 'slim',
  },
  franky: {
    note:
      'Silhouette de cyborg culturiste : épaules extrêmement larges, avant-bras métalliques surdimensionnés, jambes puissantes. Mâchoire carrée, traits extravagants. Cheveux bleus en banane. Lunettes de soleil, chemise très ouverte, accessoires métalliques.',
    hair: '#25b7d3', cut: 'pompadour', skin: HALE, outfit: '#1a8fb0',
    extras: ['metal-arms', 'open-vest', 'belt', 'boots'],
    face: 'square',
    height: 'tall',
    trousers: '#1a8fb0',
    head: 'none', mark: 'shades', prop: 'none', build: 'broad',
  },
  brook: {
    note:
      'Très grand squelette humanoïde d\'une maigreur extrême, membres filiformes. Crâne allongé, orbites entièrement noires, mâchoire osseuse. Immense coiffure afro noire — l\'élément le plus caractéristique. Costume de musicien : manteau sombre, chemise, cravate, haut-de-forme.',
    hair: '#171717', cut: 'afro', skin: OS, outfit: '#1d2a45', coat: '#101a2e',
    accessory: '#1b1620',
    frame: 'skeleton',
    extras: ['ribs', 'necktie', 'gloves', 'boots'],
    face: 'long',
    height: 'tall',
    trousers: '#101a2e',
    head: 'tophat', mark: 'skull', prop: 'cane', build: 'slim',
  },
  jinbe: {
    note:
      'Homme-poisson requin-baleine au torse énorme et aux épaules très larges, silhouette de lutteur. Peau bleu clair tirant vers le gris. Visage large, nez volumineux, sourcils jaunes très marqués, deux grands crocs inférieurs. Longue cicatrice en éclair de la tempe gauche à l\'œil. Cheveux noirs en chignon, petite touffe au menton. Nageoires, branchies, mains palmées.',
    hair: '#101010', cut: 'topknot', skin: '#5d8fb8', outfit: '#2b4f7a',
    frame: 'fishman',
    extras: ['fins', 'sash', 'chest-scar', 'chin-tuft'],
    brow: 'calm',
    height: 'tall',
    trousers: '#1d3a5a',
    head: 'none', mark: 'none', prop: 'none', build: 'giant',
  },

  // --- Légendaires : Empereurs et sommets -----------------------------------

  shanks: {
    note:
      'Grand et robuste, physique musclé mais naturel, peau légèrement bronzée. Visage anguleux à la mâchoire carrée, yeux étroits. Cheveux rouge vif légèrement ondulés tombant autour de la nuque. Trois longues cicatrices parallèles en diagonale sur l\'œil gauche. Bras gauche absent. Chemise claire, pantalon sombre, bottes, large cape noire à col rouge, ceinture.',
    hair: '#b0342c', cut: 'wavy', skin: CLAIR, outfit: '#e8e2d4', coat: '#1b1b22',
    extras: ['missing-arm', 'cape', 'sash', 'boots'],
    face: 'sharp',
    trousers: '#1b1b22',
    head: 'none', mark: 'scar-triple', prop: 'sword', build: 'broad',
  },
  'gol-d-roger': {
    note: 'Cheveux noirs, grande moustache recourbée, chemise rouge, manteau ouvert, sabre au côté.',
    hair: '#1a1a1a', cut: 'short', skin: CLAIR, outfit: '#b8342c', coat: '#3a2a1c',
    extras: ['cape', 'sash', 'boots'],
    face: 'sharp',
    head: 'none', mark: 'moustache', prop: 'sword', build: 'broad',
  },
  'edward-newgate-barbe-blanche': {
    note: 'Colosse au crâne dégarni, moustache blanche en croissant, torse nu barré de cicatrices, bisento.',
    hair: '#e6e3d8', cut: 'bald', skin: CLAIR, outfit: '#2d5f7a',
    extras: ['bare-chest', 'chest-scar', 'sash'],
    face: 'square',
    brow: 'fierce',
    height: 'towering',
    head: 'none', mark: 'moustache', prop: 'staff', build: 'giant',
  },
  kaido: {
    note: 'Longue crinière noire, moustache tombante, cornes, torse nu tatoué, massue cloutée.',
    hair: '#141414', cut: 'long', skin: MAT, outfit: '#4a2a5a',
    accessory: '#d8cfc0',
    frame: 'oni',
    extras: ['bare-chest', 'mane', 'sash'],
    face: 'square',
    eyes: 'sharp',
    brow: 'fierce',
    height: 'towering',
    head: 'horns', mark: 'moustache', prop: 'club', build: 'giant',
  },
  'charlotte-linlin-big-mom': {
    note: 'Géante aux longs cheveux roses, robe rouge, coiffe à plumes.',
    hair: '#e05a8a', cut: 'long', skin: HALE, outfit: '#c0243c',
    extras: ['mane', 'high-collar', 'boots'],
    height: 'towering',
    head: 'crown', mark: 'none', prop: 'none', build: 'giant',
  },
  'marchall-d-teach-barbe-noire': {
    note: 'Cheveux noirs hirsutes, barbe épaisse, tricorne, manteau sombre, dents manquantes.',
    hair: '#100f10', cut: 'spiky', skin: MAT, outfit: '#2b2b33', coat: '#16161c',
    extras: ['bare-chest', 'belt', 'boots'],
    face: 'sharp',
    eyes: 'sharp',
    brow: 'fierce',
    height: 'towering',
    head: 'tricorne', mark: 'beard', prop: 'none', build: 'giant',
  },
  'rocks-d-xebec': {
    note: 'Silhouette imposante à la chevelure sombre, manteau lourd — l’œuvre n’en montre presque rien.',
    hair: '#121218', cut: 'long', skin: MAT, outfit: '#2a2333', coat: '#191322',
    extras: ['cape', 'pauldrons', 'belt'],
    face: 'square',
    eyes: 'narrow',
    height: 'towering',
    head: 'none', mark: 'none', prop: 'none', build: 'giant',
  },
  'im-sama': {
    note: 'Silhouette encapuchonnée, visage jamais montré, longs cheveux sombres.',
    hair: '#0e0e14', cut: 'long', skin: '#2a2a34', outfit: '#171522', coat: '#0d0c14',
    extras: ['cape', 'high-collar', 'gloves'],
    eyes: 'narrow',
    brow: 'calm',
    head: 'hood', mark: 'none', prop: 'none', build: 'slim',
  },
  dragon: {
    note:
      'Grand et robuste, mâchoire marquée. Longs cheveux noirs épais et sauvages tombant bien au-delà des épaules. Regard profond, yeux étroits et ombragés, barbe de trois jours. Gigantesque tatouage rouge sombre en losanges imbriqués couvrant le côté gauche du visage. Longue cape vert foncé très ample sur des vêtements sombres.',
    hair: '#151515', cut: 'long', skin: CLAIR, outfit: '#2f5a3a', coat: '#1f3d28',
    extras: ['face-tattoo', 'cape', 'high-collar', 'chin-tuft'],
    brow: 'calm',
    trousers: '#1f3d28',
    head: 'none', mark: 'scar-face', prop: 'none', build: 'broad',
  },

  // --- Légendaires : Marine et gouvernement ---------------------------------

  akainu: {
    note:
      'Gigantesque et extrêmement musclé, épaules et cou massifs. Visage carré, sévère, mâchoire large. Cheveux noirs courts. Immense tatouage floral noir sur tout le côté gauche du corps. Costume rouge profond à double boutonnage, chemise rouge pâle ouverte au col, gants noirs, casquette blanche de la Marine.',
    hair: '#171717', cut: 'short', skin: HALE, outfit: '#8a1f22', coat: '#f0ede4',
    accessory: '#f0ede4',
    extras: ['coat-shoulders', 'gloves', 'boots', 'necktie'],
    face: 'square',
    eyes: 'sharp',
    brow: 'fierce',
    height: 'tall',
    trousers: '#6a1a1c',
    head: 'cap', mark: 'cigar', prop: 'none', build: 'broad',
  },
  'borsalino-kizaru': {
    note: 'Cheveux noirs plaqués, costume rayé jaune, manteau blanc, regard mi-clos.',
    hair: '#1b1b1b', cut: 'short', skin: CLAIR, outfit: '#d8b13a', coat: '#f0ede4',
    extras: ['coat-shoulders', 'striped-suit', 'necktie'],
    face: 'long',
    eyes: 'narrow',
    height: 'tall',
    head: 'none', mark: 'shades', prop: 'none', build: 'slim',
  },
  'aramaki-ryokugyu': {
    note: 'Très longs cheveux noirs, bandeau sur les yeux, manteau blanc, silhouette élancée.',
    hair: '#151515', cut: 'long', skin: CLAIR, outfit: '#2f4a35', coat: '#f0ede4',
    extras: ['coat-shoulders', 'bare-chest', 'sash'],
    face: 'long',
    height: 'tall',
    head: 'none', mark: 'blind', prop: 'none', build: 'slim',
  },
  'issho-fujitora': {
    note: 'Cheveux violets, bandeau sur les yeux, manteau blanc sur kimono, canne-épée.',
    hair: '#6a5a8a', cut: 'short', skin: CLAIR, outfit: '#3a3550', coat: '#f0ede4',
    extras: ['coat-shoulders', 'sash', 'boots'],
    face: 'long',
    brow: 'calm',
    head: 'none', mark: 'blind', prop: 'cane', build: 'broad',
  },
  garp: {
    note:
      'Vieil homme très grand, torse massif, bras épais, cou puissant. Mâchoire large, traits profondément marqués. Cicatrice autour de l\'œil gauche. Cheveux blancs courts avec une petite pointe au sommet. Costume clair, chemise bleu foncé, cravate turquoise, grand manteau blanc posé sur les épaules.',
    hair: '#e2e0d6', cut: 'short', skin: HALE, outfit: '#2d3a4a', coat: '#f0ede4',
    extras: ['coat-shoulders', 'belt', 'boots', 'necktie'],
    face: 'square',
    brow: 'fierce',
    height: 'tall',
    trousers: '#2d3a4a',
    head: 'none', mark: 'scar-eye', prop: 'none', build: 'giant',
  },
  sengoku: {
    note: 'Cheveux noirs et bouc grisonnant, lunettes, calot de la Marine, manteau blanc.',
    hair: '#3a3129', cut: 'afro', skin: MAT, outfit: '#2d3a4a', coat: '#f0ede4',
    accessory: '#f0ede4',
    extras: ['coat-shoulders', 'pauldrons', 'belt'],
    face: 'square',
    eyes: 'narrow',
    brow: 'calm',
    height: 'tall',
    head: 'cap', mark: 'glasses', prop: 'none', build: 'broad',
  },
  smoker: {
    note: 'Cheveux blancs hérissés, deux cigares aux lèvres, veste ouverte sur le torse, jitte.',
    hair: '#ddd9cf', cut: 'spiky', skin: HALE, outfit: '#3d4652', coat: '#2a323c',
    extras: ['bare-chest', 'epaulettes', 'gloves'],
    accessory: '#c8ccd4',
    face: 'sharp',
    brow: 'fierce',
    height: 'tall',
    head: 'none', mark: 'cigar', prop: 'staff', build: 'broad',
  },
  tashigi: {
    note: 'Cheveux bleu-noir aux épaules, lunettes rectangulaires, sabre au côté.',
    hair: '#26303f', cut: 'long', skin: PALE, outfit: '#4a5a6e',
    extras: ['epaulettes', 'necktie', 'boots'],
    accessory: '#e8e2d4',
    head: 'none', mark: 'glasses', prop: 'sword', build: 'slim',
  },
  koby: {
    note:
      'Silhouette athlétique, épaules élargies par l\'entraînement, visage doux resté juvénile. Cheveux rose pâle, plus longs et désordonnés. Cicatrice en croix au-dessus de l\'œil droit. Uniforme des Marines, longue veste blanche, foulard, bandana au front, lunettes posées sur le front.',
    hair: '#e88fa8', cut: 'short', skin: PALE, outfit: '#e8e2d4',
    extras: ['epaulettes', 'necktie', 'boots', 'cross-scar'],
    accessory: '#2d3a4a',
    eyes: 'wide',
    trousers: '#2d3a4a',
    head: 'none', mark: 'glasses', prop: 'none', build: 'slim',
  },
  'rob-lucci': {
    note: 'Cheveux noirs jusqu’aux épaules, bouc, haut-de-forme, costume sombre.',
    hair: '#151515', cut: 'long', skin: HALE, outfit: '#1d1d24', coat: '#111116',
    accessory: '#111116',
    extras: ['pigeon', 'necktie', 'gloves'],
    face: 'long',
    eyes: 'sharp',
    head: 'tophat', mark: 'goatee', prop: 'none', build: 'broad',
  },
  magellan: {
    note: 'Cheveux violets, cornes, barbe épaisse en pointe, cape de gardien.',
    hair: '#6a4a8a', cut: 'long', skin: '#8a6a5a', outfit: '#4a2a5a', coat: '#33203f',
    accessory: '#d8cfc0',
    frame: 'oni',
    extras: ['bare-chest', 'cape', 'boots'],
    face: 'square',
    brow: 'fierce',
    height: 'towering',
    head: 'horns', mark: 'beard', prop: 'none', build: 'giant',
  },
  kuma: {
    note:
      'Gigantesque, carrure monumentale, dépassant largement la taille humaine. Visage large et presque inexpressif, yeux blancs, menton très prononcé, apparence évoquant celle d\'un ours. Cheveux noirs et épais, immense manteau sombre, chapeau caractéristique.',
    hair: '#1a1a1a', cut: 'short', skin: '#5d3a2a', outfit: '#2a3a5a', coat: '#1c2740',
    accessory: '#22304e',
    frame: 'bear',
    extras: ['gloves', 'high-collar', 'boots', 'belt'],
    face: 'square',
    brow: 'calm',
    height: 'towering',
    trousers: '#141c30',
    head: 'cap', mark: 'shades', prop: 'none', build: 'giant',
  },

  // --- Légendaires : Grands Corsaires et capitaines --------------------------

  mihawk: {
    note:
      'Grand, mince et très élégant, musculature sèche. Visage long, fin et anguleux, moustache et barbe en pointes remontantes. Yeux jaunes à cercles concentriques, comme ceux d\'un faucon. Immense chapeau noir à larges bords orné d\'une plume. Manteau noir ouvert doublé de rouge, motifs rouges et dorés. Épée noire démesurée portée dans le dos.',
    hair: '#161616', cut: 'short', skin: PALE, outfit: '#2a1f2e', coat: '#8a1a22',
    extras: ['cape', 'pendant', 'high-collar', 'feather'],
    face: 'long',
    eyes: 'sharp',
    brow: 'calm',
    height: 'tall',
    trousers: '#1a1420',
    head: 'brim', mark: 'goatee', prop: 'greatsword', build: 'slim',
  },
  crocodile: {
    note: 'Cheveux noirs plaqués en arrière, longue cicatrice en travers du visage, manteau à col de fourrure, crochet en guise de main gauche, cigare.',
    hair: '#141414', cut: 'short', skin: MAT, outfit: '#2b2b33', coat: '#4a3a2a',
    extras: ['fur-collar', 'gloves', 'belt'],
    face: 'sharp',
    eyes: 'sharp',
    height: 'tall',
    head: 'none', mark: 'scar-face', prop: 'hook', build: 'broad',
  },
  'don-quijote-doflamingo': {
    note: 'Cheveux blonds courts hérissés, lunettes étroites, manteau de plumes roses.',
    hair: '#e8c85a', cut: 'spiky', skin: CLAIR, outfit: '#c05a8a', coat: '#e87aa8',
    extras: ['feather-coat', 'high-collar', 'boots'],
    face: 'long',
    brow: 'arched',
    height: 'towering',
    head: 'none', mark: 'shades', prop: 'none', build: 'giant',
  },
  'boa-hancock': {
    note: 'Très longs cheveux noirs, teint pâle, robe rouge fendue, boucles en forme de serpent.',
    hair: '#131018', cut: 'long', skin: PALE, outfit: '#c0243c', coat: '#8a1a30',
    extras: ['snake', 'earrings', 'high-collar'],
    eyes: 'sharp',
    brow: 'arched',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  'gecko-moria': {
    note:
      'Monstrueusement grand, proportions grotesques : tête énorme, cou très long et épais, bas du corps plus massif que le torse. Deux petites cornes de chaque côté du front. Points de suture verticaux traversant le visage jusqu\'au cou. Oreilles et dents pointues. Peau bleu pâle. Cheveux très courts et hérissés, rouge sombre.',
    hair: '#7a2030', cut: 'spiky', skin: '#a8c0c8', outfit: '#3a2a4a', coat: '#241a30',
    extras: ['sharp-teeth', 'stitches', 'high-collar', 'boots'],
    face: 'long',
    eyes: 'sharp',
    height: 'towering',
    trousers: '#241a30',
    head: 'horns', mark: 'none', prop: 'none', build: 'giant',
  },
  'baggy-le-clown': {
    note:
      'Taille moyenne, silhouette mince, visage de clown. Peau claire, yeux gris-bleu, cheveux bleu vif longs et volumineux. Énorme nez rouge naturel, maquillage coloré autour des yeux, lèvres rouges. Immense tricorne rouge et blanc à rayures orné de boules dorées.',
    hair: '#2f6fb5', cut: 'spiky', skin: PALE, outfit: '#e8842c', coat: '#c0243c',
    accessory: '#c0243c',
    extras: ['clown-nose', 'striped-hat', 'gloves', 'boots'],
    face: 'sharp',
    eyes: 'wide',
    brow: 'arched',
    trousers: '#c8a02c',
    head: 'bandana', mark: 'none', prop: 'knives', build: 'slim',
  },
  'silvers-rayleigh': {
    note: 'Longs cheveux gris tirés en arrière, barbe, lunettes rondes, sabre.',
    hair: '#c8c4bb', cut: 'ponytail', skin: HALE, outfit: '#3a4250', coat: '#252b36',
    extras: ['cape', 'earrings', 'belt'],
    face: 'sharp',
    brow: 'calm',
    head: 'none', mark: 'beard', prop: 'sword', build: 'broad',
  },

  // --- Légendaires : Onze Supernovas ----------------------------------------

  law: {
    note:
      'Grand, mince et nerveux, teint hâlé. Visage fin, yeux gris-jaune fatigués et cernes permanentes. Cheveux noirs courts cachés sous un bonnet blanc à taches noires, petite barbiche. Bras et mains couverts de tatouages noirs.',
    hair: '#1a1a1a', cut: 'short', skin: HALE, outfit: '#2a4a5a', coat: '#f0ece2',
    accessory: '#f0ece2',
    extras: ['spotted-hat', 'belt', 'boots', 'eye-bags'],
    face: 'sharp',
    eyes: 'sharp',
    brow: 'calm',
    trousers: '#1f3644',
    head: 'cap', mark: 'goatee', prop: 'sword', build: 'slim',
  },
  kid: {
    note:
      'Très grand et massif, épaules larges. Cheveux rouge vif extrêmement hérissés en forme de flammes. Visage anguleux et agressif, nez pointu, lèvres rouge sombre, yeux orange-rouge, aucun sourcil visible. Lunettes de protection jaunes relevées sur le front, cape de fourrure sombre, pantalon jaune et noir, bottes épaisses.',
    hair: '#c0342c', cut: 'spiky', skin: '#f6e2d2', outfit: '#3a2a3a', coat: '#5a3a4a',
    extras: ['metal-arm', 'fur-collar', 'belt', 'boots'],
    face: 'sharp',
    eyes: 'sharp',
    brow: 'neutral',
    trousers: '#c8a02c',
    head: 'none', mark: 'shades', prop: 'none', build: 'broad',
  },
  killer: {
    note: 'Longs cheveux blonds, casque cylindrique percé de trous, deux faux à main.',
    hair: '#e0c05a', cut: 'long', skin: PALE, outfit: '#3a4250',
    extras: ['epaulettes', 'gloves', 'boots'],
    accessory: '#8a94a4',
    face: 'long',
    height: 'tall',
    head: 'mask', mark: 'none', prop: 'knives', build: 'slim',
  },
  'basil-hawkins': {
    note: 'Longs cheveux blonds raides, visage impassible, manteau sombre, cartes de tarot.',
    hair: '#e6d08a', cut: 'long', skin: PALE, outfit: '#2a2a38', coat: '#4a2a3a',
    extras: ['cape', 'cards', 'high-collar'],
    face: 'long',
    eyes: 'narrow',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'sword', build: 'slim',
  },
  'x-drake': {
    note: 'Cheveux roux courts, cicatrice sur le visage, tricorne, cape, épée.',
    hair: '#b0562c', cut: 'short', skin: HALE, outfit: '#3a4a3a', coat: '#2a3a2a',
    accessory: '#c8a04a',
    extras: ['cape', 'epaulettes', 'boots'],
    face: 'square',
    brow: 'fierce',
    height: 'tall',
    head: 'tricorne', mark: 'scar-face', prop: 'sword', build: 'broad',
  },
  urouge: {
    note: 'Moine massif au crâne rasé surmonté d’un chignon, tatouages, jambes courtes et torse énorme.',
    hair: '#2a2018', cut: 'topknot', skin: MAT, outfit: '#8a5a2a', coat: '#5a3a1a',
    extras: ['bare-chest', 'beads', 'sash'],
    face: 'sharp',
    eyes: 'narrow',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'staff', build: 'giant',
  },
  'scratchmen-apoo': {
    note: 'Longs cheveux sombres tressés de perles, mâchoire large et dentée, tenue bariolée.',
    hair: '#1f1a2a', cut: 'long', skin: MAT, outfit: '#4a7a4a', coat: '#2a5a3a',
    extras: ['sharp-teeth', 'beads', 'belt'],
    face: 'sharp',
    eyes: 'sharp',
    brow: 'arched',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  bonney: {
    note:
      'Jeune fille de petite taille et à la silhouette mince, longs cheveux rose clair, grands yeux, petite marque dorée sous l\'œil droit. Débardeur blanc, short rayé orange et noir, bottes noires.',
    hair: '#e87aa8', cut: 'long', skin: HALE, outfit: '#c0546a',
    accessory: '#f0ece2',
    extras: ['bare-midriff', 'boots', 'belt', 'twin-tails'],
    eyes: 'wide',
    brow: 'arched',
    trousers: '#e8842c',
    head: 'cap', mark: 'none', prop: 'none', build: 'slim',
  },
  'capone-bege': {
    note: 'Cheveux noirs plaqués, costume rayé, chapeau mou, cigare, arme à feu.',
    hair: '#1a1a1a', cut: 'short', skin: CLAIR, outfit: '#3a3a48', coat: '#22222c',
    accessory: '#22222c',
    extras: ['pendant', 'striped-suit', 'necktie'],
    face: 'square',
    eyes: 'narrow',
    brow: 'arched',
    head: 'brim', mark: 'cigar', prop: 'gun', build: 'broad',
  },

  // --- Légendaires : Dressrosa, Thriller Bark, Wano --------------------------

  cavendish: {
    note:
      'Extraordinairement beau, grand et élancé, silhouette aristocratique. Grands yeux bleu ciel et fins. Longs cheveux blond doré naturellement ondulés descendant sous les épaules. Visage symétrique, nez fin, mâchoire élégante. Tricorne noir à grande plume turquoise, chemise blanche à volants, manteau sur les épaules, pantalon violet, bottes marron à talons.',
    hair: '#e8cf6a', cut: 'wavy', skin: PALE, outfit: '#f0ece2', coat: '#d8c8a8',
    extras: ['cape', 'cravat', 'boots', 'feather'],
    face: 'sharp',
    eyes: 'wide',
    brow: 'arched',
    accessory: '#241c18',
    trousers: '#5a3a7a',
    head: 'none', mark: 'none', prop: 'sword', build: 'slim',
  },
  bartolomeo: {
    note:
      'Très grand, mince mais musclé. Traits anguleux, crocs visibles, regard sauvage, anneau au nez, aucun sourcil. Yeux brun-orange. Deux lignes tatouées sous l\'œil droit. Cheveux vert clair en énorme mohawk désordonné. Long manteau violet sombre, ceinture claire, pantalon large à carreaux, bottes volumineuses.',
    hair: '#4c8b45', cut: 'mohawk', skin: CLAIR, outfit: '#6a3a7a', coat: '#4a2a5a',
    extras: ['nose-ring', 'face-lines', 'sharp-teeth', 'boots'],
    face: 'sharp',
    eyes: 'wide',
    brow: 'neutral',
    trousers: '#5a4a5a',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  perona: {
    note: 'Longs cheveux roses en couettes, robe gothique noire et blanche, ombrelle.',
    hair: '#e87aa8', cut: 'long', skin: PALE, outfit: '#22222c', coat: '#3a2a3a',
    extras: ['twin-tails', 'high-collar', 'boots'],
    eyes: 'wide',
    brow: 'arched',
    head: 'none', mark: 'none', prop: 'cane', build: 'slim',
  },
  king: {
    note: 'Masque intégral sombre, longue cape noire, ailes dorsales.',
    hair: '#141414', cut: 'long', skin: '#3a2a2a', outfit: '#1a1a22', coat: '#0f0f16',
    extras: ['wings', 'pauldrons', 'gloves'],
    face: 'sharp',
    eyes: 'sharp',
    brow: 'fierce',
    height: 'towering',
    head: 'mask', mark: 'none', prop: 'sword', build: 'giant',
  },
  queen: {
    note: 'Longs cheveux blonds, lunettes teintées, corpulence énorme, tenue voyante.',
    hair: '#e0c05a', cut: 'long', skin: CLAIR, outfit: '#c0243c', coat: '#8a1a30',
    extras: ['open-vest', 'high-collar', 'boots'],
    face: 'square',
    brow: 'fierce',
    height: 'towering',
    head: 'none', mark: 'shades', prop: 'none', build: 'giant',
  },
  jack: {
    note: 'Longs cheveux noirs, masque à défenses, carrure de mammouth.',
    hair: '#141414', cut: 'long', skin: MAT, outfit: '#3a2a2a', coat: '#241a1a',
    extras: ['tusks', 'pauldrons', 'belt'],
    face: 'square',
    eyes: 'sharp',
    brow: 'fierce',
    height: 'towering',
    head: 'mask', mark: 'none', prop: 'sword', build: 'giant',
  },

  // --- Légendaires : divers -------------------------------------------------

  'portgas-d-ace': {
    note: 'Cheveux noirs ondulés, taches de rousseur, chapeau orange à médaillons, torse nu, tatouage dans le dos.',
    hair: '#1a1a1a', cut: 'wavy', skin: HALE, outfit: '#e8842c',
    accessory: '#e8842c',
    extras: ['bare-chest', 'belt', 'boots'],
    face: 'sharp',
    head: 'brim', mark: 'freckles', prop: 'none', build: 'slim',
  },
  sabo: {
    note:
      'Grand, mince et athlétique, visage fin et allongé proche de celui de Luffy. Cheveux blond clair souples et légèrement désordonnés. Cicatrice marquée autour de l\'œil gauche. Long manteau sombre, chemise claire, gants, haut-de-forme noir orné de lunettes de protection bleues.',
    hair: '#e8cf6a', cut: 'wavy', skin: PALE, outfit: '#2f5a8a', coat: '#1f3d5f',
    accessory: '#1b1620',
    extras: ['cravat', 'goggles', 'gloves', 'boots'],
    face: 'sharp',
    trousers: '#1f3d5f',
    head: 'tophat', mark: 'scar-eye', prop: 'staff', build: 'slim',
  },
  arlong: {
    note: 'Homme-poisson-scie, peau bleue, nez en lame de scie, cheveux noirs hérissés, sabre à dents.',
    hair: '#1a1a2a', cut: 'spiky', skin: '#4f86ae', outfit: '#3a5a7a',
    frame: 'fishman',
    extras: ['sawnose', 'sharp-teeth', 'sash'],
    face: 'sharp',
    eyes: 'sharp',
    brow: 'fierce',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'sword', build: 'giant',
  },

  /* =========================================================================
     Épiques.

     Cent quarante-neuf cartes, et **toutes n'y sont pas**. C'est délibéré, et
     il faut le dire plutôt que de le masquer : je n'écris une signature que
     pour les personnages dont l'apparence est établie et que je peux décrire
     sans inventer. Pour un second couteau vu trois cases dans un tome, une
     description « plausible » serait une invention déguisée en donnée — et
     elle vivrait ensuite dans le code comme un fait.

     Les autres passent par le repli déterministe de `spriteTraits`, qui tire
     désormais tout ce que le dessin sait rendre : deux cartes différentes
     donnent deux portraits différents. Ce n'est pas une ressemblance, mais
     c'est honnête, et c'est réparable une entrée à la fois.
     ========================================================================= */

  alvida: {
    note: 'Très longs cheveux noirs, teint pâle, tenue de capitaine, massue à pointes.',
    hair: '#141018', cut: 'long', skin: PALE, outfit: '#c0243c', coat: '#8a1a30',
    face: 'round', eyes: 'sharp', brow: 'arched',
    extras: ['high-collar', 'boots', 'belt'],
    head: 'none', mark: 'none', prop: 'club', build: 'slim',
  },
  kuro: {
    note: 'Cheveux noirs plaqués, petites lunettes rondes qu’il remonte de la paume, costume de majordome, griffes.',
    hair: '#131313', cut: 'short', skin: PALE, outfit: '#22222c', coat: '#15151c',
    face: 'long', eyes: 'narrow', brow: 'calm',
    extras: ['necktie', 'gloves', 'boots'],
    accessory: '#e8e2d4',
    head: 'none', mark: 'glasses', prop: 'knives', build: 'slim',
  },
  'krieg-don-krieg': {
    note: 'Cheveux noirs hérissés, armure dorée massive, cape, carrure de colosse.',
    hair: '#1a1a1a', cut: 'spiky', skin: HALE, outfit: '#c8a04a', coat: '#8a6a2a',
    face: 'square', eyes: 'sharp', brow: 'fierce', height: 'tall',
    extras: ['pauldrons', 'cape', 'belt'],
    head: 'none', mark: 'none', prop: 'axe', build: 'giant',
  },
  cabaji: {
    note: 'Cheveux bleus, écharpe qui couvre le bas du visage, tenue d’acrobate, sabre.',
    hair: '#2f6fb5', cut: 'short', skin: PALE, outfit: '#4a7a4a',
    face: 'sharp', eyes: 'narrow', brow: 'neutral',
    extras: ['sash', 'boots', 'belt'],
    head: 'none', mark: 'none', prop: 'sword', build: 'slim',
  },
  galdino: {
    note: 'Cheveux blonds coiffés en trois pointes, masque de cire, costume clair.',
    hair: '#e8cf6a', cut: 'spiky', skin: PALE, outfit: '#e8e2d4', coat: '#c8b88a',
    face: 'long', eyes: 'narrow', brow: 'arched',
    extras: ['necktie', 'gloves', 'boots'],
    head: 'none', mark: 'none', prop: 'staff', build: 'slim',
  },
  foxy: {
    note: 'Immense nez rouge et pointu, cheveux violets en pointes, longue cape.',
    hair: '#6a4a8a', cut: 'spiky', skin: PALE, outfit: '#8a4a5a', coat: '#5a2a3a',
    face: 'sharp', eyes: 'wide', brow: 'arched', height: 'tall',
    extras: ['long-nose', 'cape', 'boots'],
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  hogback: {
    note: 'Cheveux noirs plaqués, menton en galoche, blouse de chirurgien.',
    hair: '#1a1a1a', cut: 'short', skin: PALE, outfit: '#e8e2d4', coat: '#c8ccd4',
    face: 'square', eyes: 'narrow', brow: 'arched',
    extras: ['necktie', 'gloves', 'boots'],
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  absalom: {
    note: 'Crinière et gueule de lion, cheveux blancs hirsutes, manteau sombre.',
    hair: '#e2ded2', cut: 'spiky', skin: HALE, outfit: '#2a2a33', coat: '#181820',
    face: 'square', eyes: 'sharp', brow: 'fierce', height: 'tall',
    extras: ['mane', 'sharp-teeth', 'cape'],
    head: 'none', mark: 'none', prop: 'gun', build: 'broad',
  },
  bepo: {
    note: 'Ours blanc à la fourrure épaisse, combinaison orange des Heart Pirates.',
    hair: '#f0ede4', cut: 'short', skin: '#f0ede4', outfit: '#e8842c',
    frame: 'bear', face: 'round', eyes: 'wide', brow: 'calm',
    extras: ['gloves', 'boots', 'belt'],
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  'jean-bart': {
    note: 'Colosse au crâne rasé, barbe fournie, cicatrices, torse nu.',
    hair: '#241a12', cut: 'bald', skin: MAT, outfit: '#3a4250',
    face: 'square', eyes: 'sharp', brow: 'fierce', height: 'towering',
    extras: ['bare-chest', 'chest-scar', 'belt'],
    head: 'none', mark: 'beard', prop: 'none', build: 'giant',
  },
  shiki: {
    note: 'Cheveux blancs relevés, gouvernail planté dans le crâne, deux sabres en guise de jambes.',
    hair: '#e6e3d8', cut: 'spiky', skin: CLAIR, outfit: '#3a3a48', coat: '#22222c',
    face: 'sharp', eyes: 'sharp', brow: 'fierce', height: 'tall',
    extras: ['cape', 'high-collar', 'boots'],
    head: 'none', mark: 'moustache', prop: 'sword', build: 'broad',
  },
  caribou: {
    note: 'Cheveux noirs en dreadlocks, sourire figé, tenue sombre, deux pistolets.',
    hair: '#141414', cut: 'long', skin: PALE, outfit: '#2a3a2a', coat: '#1a281a',
    face: 'long', eyes: 'narrow', brow: 'arched',
    extras: ['sharp-teeth', 'belt', 'boots'],
    head: 'none', mark: 'none', prop: 'gun', build: 'slim',
  },
  'ficher-tiger': {
    note: 'Homme-poisson-tigre, rayures sombres, torse nu, tatouages sur les bras.',
    hair: '#3a2a1a', cut: 'long', skin: '#c8a86a', outfit: '#5a3a1a',
    frame: 'fishman', face: 'square', eyes: 'sharp', brow: 'fierce', height: 'tall',
    extras: ['bare-chest', 'arm-tattoo', 'belt'],
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  aladdin: {
    note: 'Homme-poisson-raie, cheveux noirs, grande barbe, tenue de médecin de bord.',
    hair: '#141414', cut: 'long', skin: '#5d8fb8', outfit: '#2b4f7a',
    frame: 'fishman', face: 'square', eyes: 'normal', brow: 'calm', height: 'tall',
    extras: ['fins', 'sash', 'belt'],
    head: 'none', mark: 'beard', prop: 'none', build: 'broad',
  },
  'ben-beckmann': {
    note: 'Cheveux gris tirés en arrière, cigarette, gilet sans manches, fusil.',
    hair: '#b8b4ab', cut: 'ponytail', skin: HALE, outfit: '#3a4250', coat: '#252b36',
    face: 'sharp', eyes: 'narrow', brow: 'calm', height: 'tall',
    extras: ['bare-chest', 'belt', 'boots'],
    head: 'none', mark: 'cigarette', prop: 'gun', build: 'broad',
  },
  yassop: {
    note: 'Longues dreadlocks blondes, teint mat, tireur d’élite, fusil.',
    hair: '#c8a84a', cut: 'long', skin: SOMBRE, outfit: '#4a7a4a',
    face: 'sharp', eyes: 'sharp', brow: 'neutral',
    extras: ['bare-chest', 'belt', 'boots'],
    head: 'none', mark: 'none', prop: 'gun', build: 'slim',
  },
  'lucky-roo': {
    note: 'Silhouette ronde, mangeur perpétuel, chapeau à large bord, tenue verte.',
    hair: '#3a2a1a', cut: 'short', skin: CLAIR, outfit: '#4a7a4a', coat: '#2a5a3a',
    accessory: '#3a2a1a',
    face: 'round', eyes: 'narrow', brow: 'neutral',
    extras: ['belt', 'boots', 'gloves'],
    head: 'brim', mark: 'none', prop: 'none', build: 'giant',
  },
  'charlotte-cracker': {
    note: 'Cheveux roses relevés en pointes, armure claire, immense bouclier, sourire large.',
    hair: '#e05a8a', cut: 'spiky', skin: CLAIR, outfit: '#e8e2d4', coat: '#c8b88a',
    face: 'long', eyes: 'sharp', brow: 'arched', height: 'tall',
    extras: ['pauldrons', 'cape', 'boots'],
    head: 'none', mark: 'none', prop: 'sword', build: 'broad',
  },
  'charlotte-smoothie': {
    note: 'Très grande, longs cheveux clairs, robe sombre, immense sabre.',
    hair: '#e8e2d4', cut: 'long', skin: CLAIR, outfit: '#3a2a4a', coat: '#241a30',
    face: 'long', eyes: 'narrow', brow: 'arched', height: 'towering',
    extras: ['high-collar', 'boots', 'belt'],
    head: 'none', mark: 'none', prop: 'greatsword', build: 'slim',
  },
  'charlotte-dent-de-chien': {
    note: 'Cheveux rouges hérissés, écharpe qui masque la mâchoire, manteau sombre, trident.',
    hair: '#c0342c', cut: 'spiky', skin: CLAIR, outfit: '#2a2a33', coat: '#181820',
    face: 'sharp', eyes: 'sharp', brow: 'fierce', height: 'tall',
    extras: ['sash', 'high-collar', 'boots'],
    head: 'none', mark: 'none', prop: 'staff', build: 'broad',
  },
  'charlotte-brulee': {
    note: 'Cheveux violets, longue cicatrice sur le visage, robe sombre.',
    hair: '#6a4a8a', cut: 'long', skin: PALE, outfit: '#3a2a4a', coat: '#241a30',
    face: 'long', eyes: 'sharp', brow: 'arched',
    extras: ['high-collar', 'boots', 'belt'],
    head: 'none', mark: 'scar-face', prop: 'none', build: 'slim',
  },
  'charlotte-pudding': {
    note: 'Cheveux châtains, teint clair, robe claire, œil supplémentaire caché sous la frange.',
    hair: '#8a5a33', cut: 'long', skin: PALE, outfit: '#e8c8d0', coat: '#c89aa8',
    face: 'round', eyes: 'wide', brow: 'arched',
    extras: ['high-collar', 'boots', 'earrings'],
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  pekoms: {
    note: 'Lion anthropomorphe, crinière fournie, carapace de tortue dans le dos.',
    hair: '#c8a04a', cut: 'spiky', skin: '#d8b070', outfit: '#4a7a4a',
    frame: 'bear', face: 'square', eyes: 'sharp', brow: 'fierce',
    extras: ['mane', 'belt', 'boots'],
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  'page-one': {
    note: 'Cheveux noirs courts, veste sombre, expression fermée.',
    hair: '#141414', cut: 'short', skin: CLAIR, outfit: '#2a2a33', coat: '#181820',
    face: 'sharp', eyes: 'sharp', brow: 'fierce',
    extras: ['high-collar', 'belt', 'boots'],
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  ulti: {
    note: 'Longs cheveux roses et bleus, cornes, tenue courte.',
    hair: '#e87aa8', cut: 'long', skin: PALE, outfit: '#4a2a5a',
    face: 'round', eyes: 'sharp', brow: 'fierce',
    accessory: '#d8cfc0',
    extras: ['bare-midriff', 'boots', 'belt'],
    head: 'horns', mark: 'none', prop: 'none', build: 'slim',
  },
  'black-maria': {
    note: 'Immense, très longs cheveux noirs, kimono ouvert, ombrelle.',
    hair: '#141018', cut: 'long', skin: PALE, outfit: '#8a1a30', coat: '#5a0f20',
    face: 'long', eyes: 'sharp', brow: 'arched', height: 'towering',
    extras: ['high-collar', 'boots', 'earrings'],
    head: 'none', mark: 'none', prop: 'cane', build: 'slim',
  },
  fukurokuju: {
    note: 'Front démesuré, longs cheveux noirs, kimono de chef ninja.',
    hair: '#141414', cut: 'long', skin: CLAIR, outfit: '#3a3550', coat: '#241f38',
    face: 'long', eyes: 'narrow', brow: 'calm', height: 'tall',
    extras: ['sash', 'gloves', 'boots'],
    head: 'none', mark: 'beard', prop: 'none', build: 'slim',
  },
  'jesus-burgess': {
    note: 'Colosse au crâne dégarni, moustache, masque de catcheur, torse nu.',
    hair: '#3a2a1a', cut: 'bald', skin: HALE, outfit: '#c0342c',
    face: 'square', eyes: 'sharp', brow: 'fierce', height: 'towering',
    extras: ['bare-chest', 'belt', 'boots'],
    head: 'none', mark: 'moustache', prop: 'none', build: 'giant',
  },
  shiliew: {
    note: 'Cheveux noirs et barbe, cicatrice, manteau de geôlier, sabre.',
    hair: '#1a1a1a', cut: 'short', skin: HALE, outfit: '#3a4250', coat: '#252b36',
    face: 'square', eyes: 'sharp', brow: 'fierce', height: 'tall',
    extras: ['cape', 'belt', 'boots'],
    head: 'none', mark: 'beard', prop: 'sword', build: 'broad',
  },
  'van-auger': {
    note: 'Longs cheveux noirs, lunettes rondes, silhouette élancée, fusil de précision.',
    hair: '#141414', cut: 'long', skin: PALE, outfit: '#2a2a33', coat: '#181820',
    face: 'long', eyes: 'narrow', brow: 'calm', height: 'tall',
    extras: ['cape', 'gloves', 'boots'],
    head: 'none', mark: 'glasses', prop: 'gun', build: 'slim',
  },
  lafitte: {
    note: 'Teint très pâle, cheveux blancs, haut-de-forme, canne, ailes dans le dos.',
    hair: '#e8e4da', cut: 'short', skin: '#f2ece0', outfit: '#22222c', coat: '#15151c',
    accessory: '#1b1620',
    face: 'long', eyes: 'narrow', brow: 'arched', height: 'tall',
    extras: ['wings', 'necktie', 'gloves'],
    head: 'tophat', mark: 'none', prop: 'cane', build: 'slim',
  },
  'catarina-devon': {
    note: 'Longs cheveux blonds, tenue sombre, sourire carnassier.',
    hair: '#e0c05a', cut: 'long', skin: PALE, outfit: '#2a2a33', coat: '#181820',
    face: 'sharp', eyes: 'sharp', brow: 'arched',
    extras: ['sharp-teeth', 'high-collar', 'boots'],
    head: 'none', mark: 'none', prop: 'sword', build: 'slim',
  },
  'sanjuan-wolf': {
    note: 'Géant démesuré, cheveux sombres, silhouette voûtée.',
    hair: '#1f1a2a', cut: 'long', skin: MAT, outfit: '#3a3a48',
    face: 'square', eyes: 'sharp', brow: 'fierce', height: 'towering',
    extras: ['bare-chest', 'belt', 'boots'],
    head: 'none', mark: 'none', prop: 'none', build: 'giant',
  },
  'doc-q': {
    note: 'Très maigre, longs cheveux noirs, cernes marqués, faux et blouse.',
    hair: '#141414', cut: 'long', skin: '#e0d4c4', outfit: '#2a2a33', coat: '#181820',
    face: 'long', eyes: 'narrow', brow: 'calm',
    extras: ['cape', 'gloves', 'boots'],
    head: 'none', mark: 'goatee', prop: 'knives', build: 'slim',
  },
  kuroobi: {
    note: 'Homme-poisson-raie, peau claire, coiffure noire tirée, tenue de karatéka.',
    hair: '#141414', cut: 'topknot', skin: '#8ab0c8', outfit: '#e8e2d4',
    frame: 'fishman', face: 'sharp', eyes: 'sharp', brow: 'fierce', height: 'tall',
    extras: ['sash', 'fins', 'belt'],
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  'diamond-joz': {
    note: 'Colosse au crâne rasé, teint mat, torse nu, peau de diamant.',
    hair: '#1a1a1a', cut: 'bald', skin: MAT, outfit: '#3a4250',
    face: 'square', eyes: 'sharp', brow: 'fierce', height: 'towering',
    extras: ['bare-chest', 'belt', 'boots'],
    head: 'none', mark: 'none', prop: 'none', build: 'giant',
  },
  vista: {
    note: 'Chapeau à large bord, moustache en guidon, deux sabres, roses.',
    hair: '#1a1a1a', cut: 'short', skin: CLAIR, outfit: '#2a3a5a', coat: '#1c2740',
    accessory: '#2a3a5a',
    face: 'sharp', eyes: 'normal', brow: 'calm', height: 'tall',
    extras: ['cape', 'gloves', 'boots'],
    head: 'brim', mark: 'moustache', prop: 'sword', build: 'broad',
  },
  izou: {
    note: 'Kimono, longs cheveux noirs relevés, maquillage, deux pistolets.',
    hair: '#141414', cut: 'topknot', skin: PALE, outfit: '#8a1a30', coat: '#5a0f20',
    face: 'long', eyes: 'narrow', brow: 'calm',
    extras: ['sash', 'boots', 'earrings'],
    head: 'none', mark: 'none', prop: 'gun', build: 'slim',
  },
  'hody-jones': {
    note: 'Homme-requin, peau bleu-gris, dents en scie, cheveux blancs tirés.',
    hair: '#e8e4da', cut: 'ponytail', skin: '#7a9ab0', outfit: '#2a4a5a',
    frame: 'fishman', face: 'sharp', eyes: 'sharp', brow: 'fierce', height: 'tall',
    extras: ['sharp-teeth', 'bare-chest', 'belt'],
    head: 'none', mark: 'none', prop: 'sword', build: 'giant',
  },
  trebol: {
    note: 'Silhouette informe et massive, morve permanente, lunettes noires, manteau vert.',
    hair: '#1a1a1a', cut: 'short', skin: CLAIR, outfit: '#4a7a4a', coat: '#2a5a3a',
    face: 'round', eyes: 'narrow', brow: 'neutral', height: 'towering',
    extras: ['high-collar', 'gloves', 'boots'],
    head: 'none', mark: 'shades', prop: 'none', build: 'giant',
  },
  diamante: {
    note: 'Cheveux blonds ondulés, tricorne à plume, cape rouge, silhouette élancée.',
    hair: '#e8cf6a', cut: 'wavy', skin: CLAIR, outfit: '#c0243c', coat: '#8a1a30',
    accessory: '#241c18',
    face: 'long', eyes: 'sharp', brow: 'arched', height: 'tall',
    extras: ['cape', 'gloves', 'boots'],
    head: 'tricorne', mark: 'none', prop: 'sword', build: 'slim',
  },
  pica: {
    note: 'Colosse de pierre, cheveux noirs, mâchoire massive.',
    hair: '#141414', cut: 'short', skin: '#8a8a94', outfit: '#5a5a66', coat: '#3a3a44',
    face: 'square', eyes: 'sharp', brow: 'fierce', height: 'towering',
    extras: ['pauldrons', 'belt', 'boots'],
    head: 'none', mark: 'none', prop: 'sword', build: 'giant',
  },
  vergo: {
    note: 'Cheveux noirs, lunettes de soleil, bambou toujours collé à la joue, manteau sombre.',
    hair: '#141414', cut: 'short', skin: HALE, outfit: '#2a2a33', coat: '#181820',
    face: 'square', eyes: 'sharp', brow: 'fierce', height: 'tall',
    extras: ['coat-shoulders', 'gloves', 'boots'],
    head: 'none', mark: 'shades', prop: 'staff', build: 'broad',
  },
  sugar: {
    note: 'Petite fille aux longs cheveux noirs, raisins à la main, teint pâle.',
    hair: '#141018', cut: 'long', skin: PALE, outfit: '#c8a02c',
    face: 'round', eyes: 'wide', brow: 'neutral', height: 'short',
    extras: ['high-collar', 'boots', 'twin-tails'],
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  'senor-pink': {
    note: 'Costume de bébé, casque, cigarette, carrure de docker.',
    hair: '#1a1a1a', cut: 'short', skin: HALE, outfit: '#e88fa8', coat: '#c05a8a',
    accessory: '#4a5a6e',
    face: 'square', eyes: 'narrow', brow: 'neutral',
    extras: ['gloves', 'boots', 'belt'],
    head: 'cap', mark: 'cigarette', prop: 'none', build: 'broad',
  },
  monet: {
    note: 'Cheveux verts, ailes et serres d’oiseau des neiges, tenue sombre.',
    hair: '#4c8b45', cut: 'long', skin: PALE, outfit: '#2a3a4a', coat: '#1c2740',
    face: 'sharp', eyes: 'sharp', brow: 'arched',
    extras: ['wings', 'high-collar', 'boots'],
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  kaku: {
    note: 'Nez carré et démesuré, casquette, cheveux clairs, deux sabres.',
    hair: '#c8a04a', cut: 'short', skin: CLAIR, outfit: '#3a4250', coat: '#252b36',
    accessory: '#2a3a5a',
    face: 'square', eyes: 'narrow', brow: 'neutral',
    extras: ['long-nose', 'gloves', 'boots'],
    head: 'cap', mark: 'none', prop: 'sword', build: 'slim',
  },
  spandam: {
    note: 'Masque qui couvre le nez et la bouche, cheveux bruns longs, cape du CP9.',
    hair: '#5a4a3a', cut: 'long', skin: PALE, outfit: '#2a2a33', coat: '#181820',
    face: 'long', eyes: 'narrow', brow: 'arched',
    extras: ['cape', 'gloves', 'boots'],
    head: 'none', mark: 'none', prop: 'sword', build: 'slim',
  },
  hannyabal: {
    note: 'Visage de démon Hannya, cornes, uniforme de vice-directeur.',
    hair: '#8a4a2a', cut: 'short', skin: '#c88a5a', outfit: '#4a5a6e', coat: '#2a3a4a',
    frame: 'oni', face: 'square', eyes: 'sharp', brow: 'fierce', height: 'tall',
    extras: ['pauldrons', 'belt', 'boots'],
    head: 'horns', mark: 'none', prop: 'staff', build: 'broad',
  },
  domino: {
    note: 'Cheveux blonds, masque sur les yeux, tenue noire de gardienne, fouet.',
    hair: '#e0c05a', cut: 'long', skin: PALE, outfit: '#22222c', coat: '#15151c',
    face: 'long', eyes: 'narrow', brow: 'arched',
    extras: ['gloves', 'boots', 'belt'],
    head: 'none', mark: 'shades', prop: 'none', build: 'slim',
  },
  sadi: {
    note: 'Longs cheveux roses, cornes, tenue noire, fouet.',
    hair: '#e87aa8', cut: 'long', skin: PALE, outfit: '#22222c', coat: '#15151c',
    accessory: '#d8cfc0',
    face: 'sharp', eyes: 'sharp', brow: 'arched',
    extras: ['bare-midriff', 'boots', 'gloves'],
    head: 'horns', mark: 'none', prop: 'none', build: 'slim',
  },
  tsuru: {
    note: 'Cheveux blancs relevés, âgée, manteau de la Marine, pipe.',
    hair: '#e8e4da', cut: 'topknot', skin: CLAIR, outfit: '#2d3a4a', coat: '#f0ede4',
    face: 'long', eyes: 'narrow', brow: 'calm',
    extras: ['coat-shoulders', 'gloves', 'boots'],
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  momonga: {
    note: 'Cheveux noirs, barbe taillée, manteau de la Marine, sabre.',
    hair: '#1a1a1a', cut: 'short', skin: CLAIR, outfit: '#2d3a4a', coat: '#f0ede4',
    face: 'square', eyes: 'normal', brow: 'calm', height: 'tall',
    extras: ['coat-shoulders', 'belt', 'boots'],
    head: 'none', mark: 'beard', prop: 'sword', build: 'broad',
  },
  hina: {
    note: 'Longs cheveux roses, cigarette, manteau de la Marine sur tenue sombre.',
    hair: '#e87aa8', cut: 'long', skin: PALE, outfit: '#2a2a33', coat: '#f0ede4',
    face: 'long', eyes: 'narrow', brow: 'arched',
    extras: ['coat-shoulders', 'boots', 'earrings'],
    head: 'none', mark: 'cigarette', prop: 'none', build: 'slim',
  },
  't-bone': {
    note: 'Silhouette squelettique, armure, casque à plumet, sabre.',
    hair: '#e2ded2', cut: 'short', skin: '#e8e2d4', outfit: '#c8ccd4', coat: '#8a94a4',
    accessory: '#c0243c',
    face: 'long', eyes: 'narrow', brow: 'calm', height: 'tall',
    extras: ['pauldrons', 'cape', 'boots'],
    head: 'cap', mark: 'none', prop: 'sword', build: 'slim',
  },
  'don-quijote-rosinante': {
    note: 'Très grand, maquillage de clown, manteau à plumes, cigarettes, cœur peint sur le torse.',
    hair: '#e8cf6a', cut: 'wavy', skin: CLAIR, outfit: '#c0243c', coat: '#e8842c',
    face: 'long', eyes: 'narrow', brow: 'calm', height: 'towering',
    extras: ['feather-coat', 'gloves', 'boots'],
    head: 'none', mark: 'cigarette', prop: 'none', build: 'slim',
  },
  jango: {
    note: 'Longs cheveux noirs sous un bonnet, lunettes rondes bleues, anneau hypnotique.',
    hair: '#141414', cut: 'long', skin: HALE, outfit: '#2a4a5a', coat: '#1a3040',
    accessory: '#e8e2d4',
    face: 'long', eyes: 'narrow', brow: 'arched',
    extras: ['bare-chest', 'boots', 'belt'],
    head: 'bandana', mark: 'shades', prop: 'knives', build: 'slim',
  },
  sentomaru: {
    note: 'Silhouette massive, barbe en collier, casque, hache géante.',
    hair: '#1a1a1a', cut: 'topknot', skin: HALE, outfit: '#4a5a6e', coat: '#2a3a4a',
    accessory: '#8a94a4',
    face: 'square', eyes: 'narrow', brow: 'fierce', height: 'tall',
    extras: ['pauldrons', 'belt', 'boots'],
    head: 'cap', mark: 'beard', prop: 'axe', build: 'giant',
  },
  makino: {
    note: 'Cheveux verts, tablier de tavernière, sourire calme.',
    hair: '#4c8b45', cut: 'long', skin: PALE, outfit: '#e8e2d4', coat: '#c8b88a',
    face: 'round', eyes: 'normal', brow: 'calm',
    extras: ['boots', 'belt', 'earrings'],
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  'curly-dadan': {
    note: 'Cheveux orange bouclés en masse, cigarette, carrure imposante.',
    hair: '#e8842c', cut: 'afro', skin: HALE, outfit: '#8a5a33', coat: '#5a3a1a',
    face: 'square', eyes: 'narrow', brow: 'fierce', height: 'tall',
    extras: ['belt', 'boots', 'gloves'],
    head: 'none', mark: 'cigarette', prop: 'none', build: 'giant',
  },
  koshiro: {
    note: 'Kimono blanc, longs cheveux noirs relevés, lunettes, sabre de maître.',
    hair: '#141414', cut: 'topknot', skin: CLAIR, outfit: '#e8e2d4', coat: '#c8b88a',
    face: 'long', eyes: 'narrow', brow: 'calm', height: 'tall',
    extras: ['sash', 'boots', 'belt'],
    head: 'none', mark: 'glasses', prop: 'sword', build: 'slim',
  },
  kuina: {
    note: 'Cheveux bleu-noir courts, tenue d’entraînement, sabre.',
    hair: '#26303f', cut: 'short', skin: PALE, outfit: '#e8e2d4', coat: '#4a5a6e',
    face: 'round', eyes: 'normal', brow: 'fierce', height: 'short',
    extras: ['sash', 'belt', 'boots'],
    head: 'none', mark: 'none', prop: 'sword', build: 'slim',
  },
  kaya: {
    note: 'Longs cheveux blonds, teint pâle, robe claire, silhouette frêle.',
    hair: '#e8cf6a', cut: 'long', skin: '#f6e2d2', outfit: '#e8e2d4', coat: '#c8d8e0',
    face: 'round', eyes: 'wide', brow: 'calm',
    extras: ['high-collar', 'boots', 'earrings'],
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  helmeppo: {
    note: 'Cheveux blonds courts, uniforme de la Marine, expression inquiète.',
    hair: '#e8cf6a', cut: 'short', skin: PALE, outfit: '#e8e2d4', coat: '#4a5a6e',
    accessory: '#2d3a4a',
    face: 'long', eyes: 'wide', brow: 'arched',
    extras: ['epaulettes', 'necktie', 'boots'],
    head: 'none', mark: 'none', prop: 'sword', build: 'slim',
  },
  'boa-sandersonia': {
    note: 'Très grande, cheveux verts, robe légère, serpent en motif.',
    hair: '#4c8b45', cut: 'long', skin: PALE, outfit: '#4a7a4a', coat: '#2a5a3a',
    face: 'long', eyes: 'sharp', brow: 'arched', height: 'towering',
    extras: ['snake', 'boots', 'earrings'],
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  'boa-marigold': {
    note: 'Corpulente, cheveux orange relevés, robe ample.',
    hair: '#e8842c', cut: 'topknot', skin: PALE, outfit: '#c0546a', coat: '#8a2a44',
    face: 'round', eyes: 'sharp', brow: 'arched', height: 'towering',
    extras: ['snake', 'boots', 'earrings'],
    head: 'none', mark: 'none', prop: 'none', build: 'giant',
  },
  hajrudin: {
    note: 'Géant d’Elbaf, cheveux blonds, barbe tressée, armure et casque.',
    hair: '#e0c05a', cut: 'long', skin: CLAIR, outfit: '#5a4a34', coat: '#3a2f20',
    accessory: '#8a94a4',
    face: 'square', eyes: 'sharp', brow: 'fierce', height: 'towering',
    extras: ['pauldrons', 'belt', 'boots'],
    head: 'cap', mark: 'beard', prop: 'sword', build: 'giant',
  },
  leo: {
    note: 'Nain du Tontatta, très petit, casque à oreilles de lapin, aiguille et fil.',
    hair: '#4c8b45', cut: 'short', skin: CLAIR, outfit: '#e8842c',
    accessory: '#c8a02c',
    face: 'round', eyes: 'wide', brow: 'neutral', height: 'short',
    extras: ['belt', 'boots', 'gloves'],
    head: 'cap', mark: 'none', prop: 'staff', build: 'slim',
  },
  'baby-5': {
    note: 'Cheveux noirs mi-longs, robe sombre, membres qui se changent en armes.',
    hair: '#141414', cut: 'long', skin: PALE, outfit: '#22222c', coat: '#15151c',
    face: 'round', eyes: 'wide', brow: 'arched',
    extras: ['gloves', 'boots', 'high-collar'],
    head: 'none', mark: 'none', prop: 'gun', build: 'slim',
  },
};

/** Le personnage a-t-il une signature écrite ? */
export function hasSignature(id: string): boolean {
  return Object.hasOwn(SIGNATURES, id);
}

export function signatureOf(id: string): Signature | null {
  return SIGNATURES[id] ?? null;
}
