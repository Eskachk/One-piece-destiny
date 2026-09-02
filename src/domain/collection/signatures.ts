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
  | 'belt';

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
   * Détails ajoutés au patron. **Trois au maximum**, et jamais deux au même
   * endroit : un sur la tête, un sur le torse, un sur un bras. Au-delà, la
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
    note: 'Cheveux noirs en bataille, chapeau de paille à ruban rouge, gilet rouge ouvert sur le torse, cicatrice sous l’œil gauche.',
    hair: '#191919', cut: 'spiky', skin: HALE, outfit: '#d0342c',
    accessory: '#c0342c',
    extras: ['open-vest', 'x-scar', 'sash'],
    eyes: 'wide',
    head: 'strawhat', mark: 'scar-eye', prop: 'none', build: 'slim',
  },
  zoro: {
    note: 'Cheveux verts courts, ceinture ventrale verte, trois sabres à la hanche, cicatrice verticale sur l’œil gauche.',
    hair: '#4c8b45', cut: 'short', skin: HALE, outfit: '#1f4034', coat: '#12261f',
    accessory: '#17301f',
    extras: ['haramaki', 'earrings', 'chest-scar'],
    face: 'sharp',
    eyes: 'sharp',
    brow: 'fierce',
    head: 'bandana', mark: 'scar-eye', prop: 'katana3', build: 'broad',
  },
  nami: {
    note: 'Longs cheveux orange, tenue bleue et blanche, bâton climatique en trois sections.',
    hair: '#e8842c', cut: 'long', skin: CLAIR, outfit: '#2f6fb5',
    extras: ['arm-tattoo', 'bare-midriff', 'boots'],
    accessory: '#e8842c',
    brow: 'arched',
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
    note: 'Cheveux blonds couvrant l’œil droit, costume noir, cigarette au coin des lèvres, sourcil en spirale.',
    hair: '#e0be5a', cut: 'short', skin: PALE, outfit: '#23232b', coat: '#15151a',
    extras: ['curly-brow', 'necktie', 'boots'],
    face: 'sharp',
    brow: 'arched',
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
    note: 'Longs cheveux noirs, teint mat, manteau violet, lunettes relevées sur le front.',
    hair: '#141018', cut: 'long', skin: HALE, outfit: '#5a3a7a', coat: '#3d2455',
    extras: ['crossed-arms', 'high-collar', 'boots'],
    brow: 'calm',
    head: 'none', mark: 'shades', prop: 'none', build: 'slim',
  },
  franky: {
    note: 'Cheveux bleus en banane, chemise ouverte à fleurs, avant-bras métalliques surdimensionnés.',
    hair: '#25b7d3', cut: 'pompadour', skin: HALE, outfit: '#1a8fb0',
    extras: ['metal-arms', 'open-vest', 'belt'],
    face: 'square',
    height: 'tall',
    head: 'none', mark: 'shades', prop: 'none', build: 'broad',
  },
  brook: {
    note: 'Squelette en haut-de-forme, immense coiffure afro noire, redingote, canne-épée.',
    hair: '#171717', cut: 'afro', skin: OS, outfit: '#1d2a45', coat: '#101a2e',
    accessory: '#1b1620',
    frame: 'skeleton',
    extras: ['ribs', 'necktie', 'gloves'],
    face: 'long',
    height: 'tall',
    head: 'tophat', mark: 'skull', prop: 'cane', build: 'slim',
  },
  jinbe: {
    note: 'Homme-poisson corpulent, peau bleue, catogan noir, kimono ouvert sur le torse.',
    hair: '#101010', cut: 'topknot', skin: '#5d8fb8', outfit: '#2b4f7a',
    frame: 'fishman',
    extras: ['fins', 'sash', 'chest-scar'],
    brow: 'calm',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'giant',
  },

  // --- Légendaires : Empereurs et sommets -----------------------------------

  shanks: {
    note: 'Cheveux rouges mi-longs, cape noire sur chemise blanche, trois cicatrices parallèles sur l’œil gauche, bras gauche manquant.',
    hair: '#b0342c', cut: 'short', skin: CLAIR, outfit: '#e8e2d4', coat: '#1b1b22',
    extras: ['missing-arm', 'cape', 'sash'],
    face: 'sharp',
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
    note: 'Longs cheveux noirs, tatouage rouge sur la moitié gauche du visage, cape à capuche verte.',
    hair: '#151515', cut: 'long', skin: CLAIR, outfit: '#2f5a3a', coat: '#1f3d28',
    extras: ['face-tattoo', 'cape', 'high-collar'],
    brow: 'calm',
    head: 'none', mark: 'scar-face', prop: 'none', build: 'broad',
  },

  // --- Légendaires : Marine et gouvernement ---------------------------------

  akainu: {
    note: 'Cheveux noirs courts, mâchoire carrée, manteau blanc de la Marine sur costume sombre, cigare.',
    hair: '#171717', cut: 'short', skin: HALE, outfit: '#2a2a30', coat: '#f0ede4',
    accessory: '#f0ede4',
    extras: ['coat-shoulders', 'necktie', 'gloves'],
    face: 'square',
    eyes: 'sharp',
    brow: 'fierce',
    height: 'tall',
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
    note: 'Cheveux blancs courts, cicatrice sous l’œil gauche, manteau de la Marine, carrure massive.',
    hair: '#e2e0d6', cut: 'short', skin: HALE, outfit: '#2d3a4a', coat: '#f0ede4',
    extras: ['coat-shoulders', 'belt', 'boots'],
    face: 'square',
    brow: 'fierce',
    height: 'tall',
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
    note: 'Cheveux roses courts, lunettes rondes, uniforme de la Marine.',
    hair: '#e88fa8', cut: 'short', skin: PALE, outfit: '#e8e2d4',
    extras: ['epaulettes', 'necktie', 'gloves'],
    accessory: '#2d3a4a',
    eyes: 'wide',
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
    note: 'Colosse à la peau sombre, casquette à oreilles, lunettes teintées, bible et gants.',
    hair: '#1a1a1a', cut: 'short', skin: '#5d3a2a', outfit: '#2a3a5a', coat: '#1c2740',
    accessory: '#22304e',
    frame: 'bear',
    extras: ['gloves', 'high-collar', 'boots'],
    face: 'square',
    brow: 'calm',
    height: 'towering',
    head: 'cap', mark: 'shades', prop: 'none', build: 'giant',
  },

  // --- Légendaires : Grands Corsaires et capitaines --------------------------

  mihawk: {
    note: 'Cheveux noirs courts, yeux jaunes de rapace, chapeau à large bord et plume, immense lame noire.',
    hair: '#161616', cut: 'short', skin: PALE, outfit: '#2a1f2e', coat: '#171020',
    extras: ['cape', 'pendant', 'high-collar'],
    face: 'long',
    eyes: 'sharp',
    brow: 'calm',
    height: 'tall',
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
    note: 'Silhouette démesurée, cheveux noirs en cornes, teint blafard, sourire dentelé.',
    hair: '#1a1a22', cut: 'spiky', skin: '#b9c4b0', outfit: '#3a2a4a', coat: '#241a30',
    extras: ['sharp-teeth', 'stitches', 'high-collar'],
    face: 'long',
    eyes: 'sharp',
    height: 'towering',
    head: 'horns', mark: 'none', prop: 'none', build: 'giant',
  },
  buggy: {
    note: 'Cheveux bleus, nez rouge et rond, maquillage de clown, bonnet à tête de mort, poignées de couteaux.',
    hair: '#2f6fb5', cut: 'spiky', skin: PALE, outfit: '#e8842c', coat: '#c0243c',
    accessory: '#e8e2d4',
    extras: ['clown-nose', 'striped-suit', 'gloves'],
    face: 'sharp',
    eyes: 'wide',
    brow: 'arched',
    head: 'bandana', mark: 'none', prop: 'knives', build: 'slim',
  },
  'baggy-le-clown': {
    note: 'Voir `buggy` : cheveux bleus, nez rouge, bonnet à tête de mort, couteaux.',
    hair: '#2f6fb5', cut: 'spiky', skin: PALE, outfit: '#e8842c', coat: '#c0243c',
    accessory: '#e8e2d4',
    extras: ['clown-nose', 'striped-suit', 'gloves'],
    face: 'sharp',
    eyes: 'wide',
    brow: 'arched',
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
    note: 'Bouc taillé, toque de fourrure blanche tachetée, mains tatouées, nodachi.',
    hair: '#1a1a1a', cut: 'short', skin: HALE, outfit: '#2a4a5a', coat: '#f0ece2',
    accessory: '#f0ece2',
    extras: ['spotted-hat', 'belt', 'boots'],
    face: 'sharp',
    eyes: 'sharp',
    brow: 'calm',
    head: 'cap', mark: 'goatee', prop: 'sword', build: 'slim',
  },
  'trafalgar-d-water-law': {
    note: 'Voir `law` : bouc, toque de fourrure tachetée, mains tatouées, nodachi.',
    hair: '#1a1a1a', cut: 'short', skin: HALE, outfit: '#2a4a5a', coat: '#f0ece2',
    extras: ['spotted-hat', 'belt', 'boots'],
    face: 'sharp',
    eyes: 'sharp',
    brow: 'calm',
    head: 'cap', mark: 'goatee', prop: 'sword', build: 'slim',
  },
  kid: {
    note: 'Cheveux rouges hérissés, teint très pâle, lunettes de soudeur sur le front, manteau à fourrure, bras gauche mécanique.',
    hair: '#c0342c', cut: 'spiky', skin: '#f6e2d2', outfit: '#3a2a3a', coat: '#5a3a4a',
    extras: ['metal-arm', 'fur-collar', 'belt'],
    face: 'sharp',
    eyes: 'sharp',
    brow: 'fierce',
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
    note: 'Longs cheveux roses, casquette plate, tenue courte, teint hâlé.',
    hair: '#e87aa8', cut: 'long', skin: HALE, outfit: '#c0546a',
    accessory: '#f0ece2',
    extras: ['bare-midriff', 'boots', 'belt'],
    eyes: 'wide',
    brow: 'arched',
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
    note: 'Longs cheveux blonds ondulés, tenue blanche, rapière.',
    hair: '#e8cf6a', cut: 'wavy', skin: PALE, outfit: '#f0ece2', coat: '#d8c8a8',
    extras: ['cape', 'cravat', 'boots'],
    face: 'sharp',
    eyes: 'wide',
    brow: 'arched',
    head: 'none', mark: 'none', prop: 'sword', build: 'slim',
  },
  bartolomeo: {
    note: 'Crête verte, piercings, dents pointues, manteau ouvert.',
    hair: '#4c8b45', cut: 'mohawk', skin: CLAIR, outfit: '#8a4a5a', coat: '#5a2a3a',
    extras: ['open-vest', 'belt', 'boots'],
    face: 'sharp',
    eyes: 'wide',
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
    note: 'Cheveux blonds ondulés, haut-de-forme à lunettes d’aviateur, brûlure sur l’œil gauche, manteau bleu, tuyau de fer.',
    hair: '#e8cf6a', cut: 'wavy', skin: PALE, outfit: '#2f5a8a', coat: '#1f3d5f',
    accessory: '#1b1620',
    extras: ['cravat', 'goggles', 'gloves'],
    face: 'sharp',
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
};

/** Le personnage a-t-il une signature écrite ? */
export function hasSignature(id: string): boolean {
  return Object.hasOwn(SIGNATURES, id);
}

export function signatureOf(id: string): Signature | null {
  return SIGNATURES[id] ?? null;
}
