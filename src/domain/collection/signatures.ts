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
    note:
      'Dans sa première apparition, elle est très corpulente, avec un visage ' +
      'rond, des joues épaisses et une imposante masse corporelle. Peau très ' +
      'claire. Ses cheveux noirs sont très longs et abondants, descendant ' +
      'loin dans le dos. Ses yeux sont petits et son sourire dévoile une ' +
      'large bouche. Elle porte un énorme manteau de capitaine et des ' +
      'vêtements de pirate voyants. Sa massue métallique à pointes est l’un ' +
      'de ses principaux éléments visuels. Après avoir mangé le Sube Sube no ' +
      'Mi, elle devient extrêmement mince : visage affiné, taille fine, ' +
      'jambes longues et silhouette beaucoup plus élancée.',
    hair: '#1c1c22', cut: 'long', skin: PALE, outfit: '#c25a8a',
    face: 'round',
    head: 'none', mark: 'none', prop: 'club', build: 'broad',
  },
  kuro: {
    note:
      'Homme grand, extrêmement mince et élégant. Cheveux noirs lisses, ' +
      'plaqués en arrière. Visage anguleux, nez étroit. Porte de petites ' +
      'lunettes rondes qu’il remet avec le dos de sa main. Costume de ' +
      'majordome impeccable : veste, chemise, pantalon et chaussures bien ' +
      'entretenues. Ses griffes donnent une apparence extrêmement fine et ' +
      'inquiétante aux mains.',
    hair: '#1c1c22', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    extras: ['boots'],
    face: 'sharp',
    height: 'tall',
    head: 'none', mark: 'glasses', prop: 'knives', build: 'slim',
  },
  'krieg-don-krieg': {
    note:
      'Homme extrêmement grand et très massif. Cheveux noirs courts et ' +
      'hérissés. Visage large et mâchoire puissante. Porte une gigantesque ' +
      'armure dorée, couvrant presque entièrement le corps, avec épaulières, ' +
      'protections métalliques et nombreuses armes. Cape sombre dans ' +
      'certaines apparitions. Sans son armure, son corps reste déjà très ' +
      'robuste. C’est l’archétype du chef de guerre lourdement blindé.',
    hair: '#1c1c22', cut: 'spiky', skin: CLAIR, outfit: '#c9a33a', coat: '#2c2f3a',
    extras: ['pauldrons', 'cape'],
    face: 'square',
    height: 'towering',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  cabaji: {
    note:
      'Homme mince et athlétique. Cheveux bleus, longs sur les côtés et ' +
      'généralement coiffés vers l’arrière. Le bas de son visage peut être ' +
      'couvert par une écharpe ou un tissu. Visage plutôt fin, yeux étroits. ' +
      'Corps souple plutôt que massif, adapté à ses mouvements acrobatiques. ' +
      'Il porte une tenue rappelant celle d’un acrobate ou d’un artiste de ' +
      'cirque, avec un sabre. Silhouette très légère.',
    hair: '#3f6bb5', cut: 'long', skin: CLAIR, outfit: '#3a4250',
    eyes: 'narrow',
    head: 'none', mark: 'none', prop: 'sword', build: 'slim',
  },
  galdino: {
    note:
      'Homme mince de taille moyenne. Visage long et nez pointu. Cheveux ' +
      'blonds coiffés en trois grandes pointes caractéristiques. Porte ' +
      'souvent une structure de cire autour du visage. Costume clair très ' +
      'propre. Bras et jambes assez fins. Apparence de gentleman bizarre et ' +
      'très théâtral.',
    hair: '#e6cf7e', cut: 'spiky', skin: CLAIR, outfit: '#ded6c2',
    face: 'long',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  foxy: {
    note:
      'Homme relativement grand mais avec une silhouette peu athlétique. ' +
      'Visage particulièrement caricatural, surtout à cause de son énorme nez ' +
      'rouge très long et pointu. Cheveux violets, dressés en pointes. Grands ' +
      'sourcils et grands yeux. Porte une longue cape et des vêtements ' +
      'voyants. Corps plutôt mou que musclé.',
    hair: '#8a5fae', cut: 'spiky', skin: CLAIR, outfit: '#c25a8a',
    extras: ['cape'],
    eyes: 'wide',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  hogback: {
    note:
      'Homme assez grand, légèrement voûté. Très grosse tête par rapport au ' +
      'corps. Cheveux noirs plaqués vers l’arrière. Visage très pâle avec ' +
      'menton extrêmement allongé, donnant un aspect presque cartoonesque. ' +
      'Petit corps comparativement mince. Porte une blouse blanche de ' +
      'chirurgien et souvent des gants. Apparence d’un scientifique maladif.',
    hair: '#1c1c22', cut: 'short', skin: PALE, outfit: '#f0ece2',
    extras: ['gloves'],
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  absalom: {
    note:
      'Très grand homme à la carrure extrêmement massive, avec des épaules ' +
      'très larges et un torse épais. Son visage est particulièrement bestial ' +
      ': museau et bouche inspirés d’un lion, mâchoire volumineuse et dents ' +
      'visibles. Sa peau est claire. Il possède une épaisse crinière de ' +
      'cheveux blancs, longs, hérissés et très désordonnés, qui encadre toute ' +
      'sa tête. Ses sourcils sont épais et son regard est agressif. Son corps ' +
      'comporte de nombreuses zones couturées à la suite des modifications ' +
      'chirurgicales de Hogback. Il porte généralement un long manteau ' +
      'sombre, un pantalon et des chaussures lourdes. Silhouette globale : ' +
      'énorme, animale et très imposante.',
    hair: '#e9e5da', cut: 'spiky', skin: CLAIR, outfit: '#2c2f3a',
    extras: ['boots', 'sharp-teeth', 'mane', 'stitches'],
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  bepo: {
    note:
      'Ours polaire anthropomorphe. Corps entièrement recouvert d’une ' +
      'fourrure blanche extrêmement épaisse. Grande tête d’ours avec museau ' +
      'allongé, oreilles rondes, nez noir et grands yeux. Malgré son ' +
      'apparence animale, il possède des bras et jambes humanoïdes. Corps ' +
      'robuste, avec ventre arrondi et pattes épaisses. Il porte généralement ' +
      'une combinaison orange caractéristique des Heart Pirates. Son ' +
      'apparence est nettement plus douce et ronde que celle des autres ' +
      'combattants.',
    hair: '#e9e5da', cut: 'short', skin: CLAIR, outfit: '#d97a2b',
    extras: ['belt'],
    frame: 'bear',
    eyes: 'wide',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  'jean-bart': {
    note:
      'Colosse extrêmement massif. Crâne rasé, barbe noire ou brune très ' +
      'fournie. Visage extrêmement large et mâchoire massive. Nombreuses ' +
      'cicatrices. Torse nu ou très peu couvert, montrant un torse ' +
      'extrêmement développé. Bras énormes. Apparence de véritable montagne ' +
      'humaine.',
    hair: '#6a4326', cut: 'bald', skin: CLAIR, outfit: '#3a4250',
    extras: ['bare-chest'],
    head: 'none', mark: 'beard', prop: 'none', build: 'giant',
  },
  shiki: {
    note:
      'Homme grand et très robuste, d’âge mûr. Cheveux très abondants et ' +
      'dressés vers le haut. Un gouvernail est littéralement planté dans son ' +
      'crâne. Visage large, moustache et traits sévères. Ses jambes ont été ' +
      'remplacées par deux sabres, ce qui donne une silhouette extrêmement ' +
      'particulière : corps humain avec deux longues lames à la place des ' +
      'jambes.',
    hair: '#2a2a33', cut: 'spiky', skin: CLAIR, outfit: '#3a4250',
    face: 'square',
    height: 'tall',
    head: 'none', mark: 'moustache', prop: 'sword', build: 'broad',
  },
  caribou: {
    note:
      'Homme grand mais assez mince, avec une silhouette irrégulière et un ' +
      'peu voûtée. Cheveux noirs en longues dreadlocks, très abondants. ' +
      'Visage pâle, long et déformé par un sourire permanent. Yeux rapprochés ' +
      'et expression inquiétante. Il porte des vêtements sombres, ' +
      'généralement relativement lourds. Ses deux pistolets sont très ' +
      'visibles à la ceinture. Physique moins impressionnant par la ' +
      'musculature que par son apparence étrange.',
    hair: '#1c1c22', cut: 'long', skin: PALE, outfit: '#2c2f3a',
    extras: ['belt'],
    eyes: 'narrow',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'gun', build: 'slim',
  },
  'ficher-tiger': {
    note:
      'Homme-poisson de type tigre. Corps extrêmement musclé et puissant. ' +
      'Peau rouge-orangée avec des rayures sombres typiques du tigre. Visage ' +
      'très large, mâchoire forte, dents acérées. Torse nu, muscles pectoraux ' +
      'et abdominaux très développés. Longues oreilles et caractéristiques ' +
      'faciales félines. Nombreux tatouages sur les bras. Très grande ' +
      'silhouette.',
    hair: '#2a2a33', cut: 'short', skin: '#c4664a', outfit: '#3a4250',
    extras: ['bare-chest', 'striped-suit', 'sharp-teeth', 'arm-tattoo'],
    frame: 'fishman',
    face: 'square',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  aladdin: {
    note:
      'Homme-poisson à l’apparence de raie manta. Corps humain puissant mais ' +
      'allongé, avec une peau claire et des caractéristiques aquatiques très ' +
      'visibles. Son visage est large, son nez et ses traits sont plats, et ' +
      'il possède une très grande barbe noire qui descend sous le menton. Ses ' +
      'cheveux sont noirs et relativement courts. Ses yeux sont étroits. Ses ' +
      'bras sont musclés, avec des caractéristiques de nageoires près des ' +
      'membres. Il porte une tenue de médecin de bord, avec un style pratique ' +
      'et relativement ample.',
    hair: '#1c1c22', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    extras: ['fins'],
    frame: 'fishman',
    head: 'none', mark: 'beard', prop: 'none', build: 'slim',
  },
  'ben-beckmann': {
    note:
      'Homme grand et robuste sans être excessivement musclé. Visage long et ' +
      'relativement anguleux, avec une mâchoire forte et une barbe courte. ' +
      'Ses cheveux sont gris, épais et tirés vers l’arrière. Ses yeux sont ' +
      'étroits, souvent plissés. Il présente des rides et lignes de fatigue ' +
      'autour des yeux. Il porte généralement un gilet sans manches, laissant ' +
      'apparaître une partie de ses bras et de son torse, avec un long ' +
      'manteau sombre. Il fume régulièrement une cigarette et porte un fusil ' +
      'massif. Son apparence générale est celle d’un homme mûr, calme et très ' +
      'robuste.',
    hair: '#a8a89e', cut: 'short', skin: CLAIR, outfit: '#2c2f3a',
    extras: ['open-vest', 'face-lines'],
    face: 'long',
    height: 'tall',
    head: 'none', mark: 'cigarette', prop: 'gun', build: 'broad',
  },
  yassop: {
    note:
      'Homme grand et mince mais athlétique. Peau mate. Très longs cheveux ' +
      'blonds en dreadlocks, descendant largement dans le dos. Visage ' +
      'allongé, nez assez long et barbe légère. Corps sec avec épaules ' +
      'relativement larges. Porte des vêtements de tireur et un immense ' +
      'fusil. Ses bras sont bien développés mais sa silhouette reste celle ' +
      'd’un homme très élancé.',
    hair: '#e6cf7e', cut: 'long', skin: HALE, outfit: '#3a4250',
    face: 'long',
    height: 'tall',
    head: 'none', mark: 'goatee', prop: 'gun', build: 'slim',
  },
  'lucky-roo': {
    note:
      'Homme extrêmement rond et corpulent. Gros ventre, joues épaisses et ' +
      'visage large. Cheveux généralement dissimulés sous un large chapeau. ' +
      'Il porte des vêtements verts et amples. Bras relativement épais, ' +
      'jambes plus courtes visuellement à cause de son ventre. Souvent vu en ' +
      'train de manger, ce qui accentue encore sa silhouette ronde.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#5a7a44',
    extras: ['belt'],
    face: 'square',
    head: 'brim', mark: 'none', prop: 'none', build: 'broad',
  },
  'charlotte-cracker': {
    note:
      'Homme grand et très athlétique. Cheveux roses, dressés en nombreuses ' +
      'pointes. Visage fin, mâchoire étroite et grand sourire. Peau claire. ' +
      'Bras et épaules musclés. Il porte une armure très claire, presque ' +
      'blanche, très structurée, ainsi qu’un énorme bouclier. Son apparence ' +
      'réelle sans l’armure est nettement plus mince que l’image gigantesque ' +
      'donnée par son équipement.',
    hair: '#e88ab0', cut: 'spiky', skin: CLAIR, outfit: '#ded6c2',
    extras: ['pauldrons'],
    face: 'sharp',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'club', build: 'giant',
  },
  'charlotte-smoothie': {
    note:
      'Femme gigantesque et extrêmement élancée. Très longues jambes, taille ' +
      'fine et poitrine importante. Cheveux clairs, longs et lisses. Visage ' +
      'très fin. Peau claire. Elle porte généralement une tenue sombre très ' +
      'élégante, avec des bottes et une grande cape ou robe. Son immense ' +
      'sabre accentue encore sa taille. Apparence générale : géante élégante ' +
      'et athlétique.',
    hair: '#d8cbb0', cut: 'long', skin: CLAIR, outfit: '#2c2f3a',
    extras: ['cape', 'boots'],
    face: 'sharp',
    height: 'towering',
    head: 'none', mark: 'none', prop: 'greatsword', build: 'giant',
  },
  'charlotte-dent-de-chien': {
    note:
      'Très grand homme, extrêmement athlétique et musclé. Silhouette en V : ' +
      'épaules extrêmement larges, taille relativement étroite, bras massifs. ' +
      'Cheveux rouge sombre, courts et dressés en pointes. Visage anguleux, ' +
      'yeux étroits. Il possède une mâchoire et une bouche très grandes, avec ' +
      'des dents extrêmement pointues, habituellement cachées par un large ' +
      'col de fourrure. Il porte un pantalon sombre, des bottes épaisses et ' +
      'un gilet laissant largement apparaître son torse. Silhouette générale ' +
      ': combattant très grand, sec et extrêmement musclé.',
    hair: '#8f2f2a', cut: 'spiky', skin: CLAIR, outfit: '#3a4250',
    extras: ['fur-collar', 'boots'],
    face: 'sharp',
    eyes: 'narrow',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  'charlotte-brulee': {
    note:
      'Femme assez grande et mince, mais son visage est déformé par une ' +
      'longue cicatrice qui traverse une grande partie du visage. Cheveux ' +
      'violets très épais. Nez et menton relativement longs. Sourcils fins. ' +
      'Elle porte des vêtements sombres, souvent amples. Ses traits sont ' +
      'volontairement très irréguliers et donnent une apparence de sorcière ' +
      'âgée.',
    hair: '#8a5fae', cut: 'short', skin: CLAIR, outfit: '#2c2f3a',
    brow: 'arched',
    height: 'tall',
    head: 'none', mark: 'scar-face', prop: 'none', build: 'slim',
  },
  'charlotte-pudding': {
    note:
      'Jeune femme assez petite et mince. Visage très fin et peau très ' +
      'claire. Longs cheveux châtains, lisses, tombant de chaque côté du ' +
      'visage et souvent sur un œil. Grands yeux. Elle possède un troisième ' +
      'œil au milieu du front, habituellement caché par ses cheveux. ' +
      'Silhouette mince et féminine. Elle porte des robes élégantes aux tons ' +
      'clairs.',
    hair: '#7a5230', cut: 'long', skin: PALE, outfit: '#ded6c2',
    face: 'sharp',
    eyes: 'wide',
    height: 'short',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  pekoms: {
    note:
      'Lion anthropomorphe. Tête entièrement féline avec crinière épaisse, ' +
      'museau large, nez noir et grandes dents. Fourrure brun clair/orangée. ' +
      'Corps humain extrêmement musclé. Son trait le plus particulier est une ' +
      'carapace de tortue portée sur le dos. Bras et jambes humanoïdes, mais ' +
      'recouverts de fourrure.',
    hair: '#e08a3c', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    extras: ['mane'],
    frame: 'bear',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  'page-one': {
    note:
      'Jeune homme grand et athlétique. Cheveux noirs courts. Visage ' +
      'anguleux, yeux étroits et expression presque constamment fermée. Cou ' +
      'puissant, épaules larges et bras développés. Porte une veste sombre et ' +
      'un pantalon. Sous forme de Zoan antique, il devient un Spinosaurus, ' +
      'avec une énorme mâchoire, une queue, des griffes et une grande voile ' +
      'dorsale.',
    hair: '#1c1c22', cut: 'short', skin: CLAIR, outfit: '#2c2f3a',
    face: 'sharp',
    eyes: 'narrow',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'knives', build: 'slim',
  },
  ulti: {
    note:
      'Jeune femme grande et athlétique. Longs cheveux roses et bleus, ' +
      'souvent volumineux. Deux cornes sur la tête. Visage fin mais ' +
      'expression énergique. Corps très bien proportionné, jambes longues et ' +
      'taille relativement fine. Porte une tenue courte laissant apparaître ' +
      'les jambes et une partie du ventre. Forme Zoan antique : tête et corps ' +
      'transformés en Pachycéphalosaure, avec crâne extrêmement puissant.',
    hair: '#e88ab0', cut: 'long', skin: CLAIR, outfit: '#3a4250',
    extras: ['bare-midriff', 'belt', 'tusks'],
    face: 'sharp',
    height: 'tall',
    head: 'horns', mark: 'none', prop: 'none', build: 'slim',
  },
  'black-maria': {
    note:
      'Femme gigantesque, extrêmement grande et très élancée malgré des ' +
      'formes très développées. Très longs cheveux noirs, épais et ondulés, ' +
      'tombant très bas dans le dos. Visage féminin allongé, yeux étirés, ' +
      'lèvres marquées. Peau claire. Elle possède une silhouette avec une ' +
      'poitrine et des hanches extrêmement développées. Elle porte un kimono ' +
      'très ouvert, laissant largement apparaître le buste et les jambes, ' +
      'avec de nombreux ornements. Elle est souvent accompagnée d’une ' +
      'ombrelle. En forme de Zoan, son bas du corps devient celui d’une ' +
      'araignée géante, donnant une apparence extrêmement massive.',
    hair: '#1c1c22', cut: 'wavy', skin: CLAIR, outfit: '#3a4250',
    extras: ['beads', 'open-vest'],
    eyes: 'sharp',
    height: 'towering',
    head: 'none', mark: 'none', prop: 'staff', build: 'giant',
  },
  fukurokuju: {
    note:
      'Homme adulte assez grand et extrêmement mince. Son trait principal est ' +
      'son front gigantesquement allongé, qui donne au crâne une forme très ' +
      'inhabituelle. Cheveux noirs très longs, tombant dans le dos. Visage ' +
      'étroit. Il porte le costume traditionnel des ninjas d’Oniwabanshu, ' +
      'avec un grand kimono. Bras et jambes fins.',
    hair: '#1c1c22', cut: 'long', skin: CLAIR, outfit: '#3a4250',
    face: 'long',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  'jesus-burgess': {
    note:
      'Très grand homme, extrêmement musclé et large d’épaules. Crâne ' +
      'partiellement dégarni. Petite moustache. Visage large avec nez ' +
      'proéminent. Porte le fameux masque de catcheur autour du visage et du ' +
      'cou. Torse presque toujours nu, révélant une musculature énorme. Bras ' +
      'et épaules surdéveloppés.',
    hair: '#2a2a33', cut: 'bald', skin: CLAIR, outfit: '#3a4250',
    extras: ['bare-chest'],
    face: 'square',
    height: 'tall',
    head: 'mask', mark: 'moustache', prop: 'none', build: 'broad',
  },
  shiliew: {
    note:
      'Homme grand, mince mais musclé. Cheveux noirs, barbe noire et visage ' +
      'anguleux. Plusieurs cicatrices. Regard très calme. Porte le manteau et ' +
      'les vêtements de geôlier d’Impel Down, généralement sombres. Son sabre ' +
      'imposant est porté à la taille. Silhouette de combattant très sec.',
    hair: '#1c1c22', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    face: 'sharp',
    brow: 'calm',
    height: 'tall',
    head: 'none', mark: 'beard', prop: 'greatsword', build: 'slim',
  },
  'van-auger': {
    note:
      'Homme grand et mince. Très longs cheveux noirs, généralement lisses. ' +
      'Visage étroit. Porte de petites lunettes rondes. Corps extrêmement sec ' +
      'avec longs bras et longues jambes. Vêtements sombres et longs ' +
      'manteaux. Porte un très long fusil de précision. Silhouette de tireur ' +
      'extrêmement élancé.',
    hair: '#1c1c22', cut: 'long', skin: CLAIR, outfit: '#2c2f3a',
    face: 'long',
    height: 'tall',
    head: 'none', mark: 'glasses', prop: 'gun', build: 'slim',
  },
  lafitte: {
    note:
      'Homme grand et extrêmement mince. Teint anormalement pâle. Cheveux ' +
      'blancs assez longs et lisses. Visage très étroit. Yeux petits et ' +
      'lèvres fines. Porte un haut-de-forme blanc, une canne et des vêtements ' +
      'élégants rappelant ceux d’un gentleman du XIXe siècle. Lorsqu’il ' +
      'révèle ses capacités de fruit du démon, de grandes ailes blanches ' +
      'apparaissent dans son dos. Cela transforme sa silhouette en celle d’un ' +
      'oiseau humanoïde.',
    hair: '#e9e5da', cut: 'long', skin: PALE, outfit: '#3a4250',
    extras: ['wings'],
    eyes: 'narrow',
    height: 'tall',
    head: 'tophat', mark: 'none', prop: 'cane', build: 'slim',
  },
  'catarina-devon': {
    note:
      'Femme grande, mince et très inquiétante. Très longs cheveux blonds, ' +
      'généralement laissés tomber dans le dos. Visage allongé, nez long, ' +
      'sourire carnassier et dents visibles. Yeux fins et regard agressif. Sa ' +
      'tenue sombre accentue son apparence de criminelle. Elle possède une ' +
      'silhouette féminine mais assez anguleuse. Sous forme de Zoan mythique, ' +
      'elle peut prendre l’apparence d’un renard à neuf queues.',
    hair: '#e6cf7e', cut: 'long', skin: CLAIR, outfit: '#2c2f3a',
    extras: ['sharp-teeth'],
    face: 'long',
    eyes: 'sharp',
    brow: 'fierce',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  'sanjuan-wolf': {
    note:
      'Géant colossal, encore plus grand que beaucoup d’autres géants. Son ' +
      'corps est très long et extrêmement massif. Cheveux sombres, visage ' +
      'large et légèrement allongé. Silhouette souvent voûtée, comme s’il ne ' +
      'pouvait pas se tenir complètement droit. Bras et jambes gigantesques. ' +
      'Vêtements très simples.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    face: 'square',
    height: 'towering',
    head: 'none', mark: 'none', prop: 'none', build: 'giant',
  },
  'doc-q': {
    note:
      'Homme extrêmement maigre. Corps presque squelettique, épaules étroites ' +
      'et membres très fins. Visage pâle, creusé et malade. Très longs ' +
      'cheveux noirs, tombant autour du visage. Cernes très marquées sous les ' +
      'yeux. Porte des vêtements de médecin et une longue blouse. Se déplace ' +
      'avec une grande faux. Son apparence rappelle délibérément celle d’un ' +
      'malade chronique.',
    hair: '#1c1c22', cut: 'long', skin: PALE, outfit: '#3a4250',
    extras: ['eye-bags'],
    head: 'none', mark: 'none', prop: 'staff', build: 'slim',
  },
  kuroobi: {
    note:
      'Homme-poisson de type raie. Corps très musclé et compact. Peau claire. ' +
      'Visage large, nez aplati et caractéristiques de raie. Cheveux noirs ' +
      'tirés vers l’arrière. Torse très large. Porte un pantalon et une tenue ' +
      'de karatéka, laissant le torse largement exposé. Bras et épaules ' +
      'particulièrement développés.',
    hair: '#1c1c22', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    frame: 'fishman',
    face: 'square',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  'diamond-joz': {
    note:
      'Colosse extrêmement massif. Torse énorme, épaules gigantesques et bras ' +
      'très épais. Crâne rasé. Peau mate. Visage large et mâchoire puissante. ' +
      'Souvent torse nu, révélant une musculature énorme. Lors de sa ' +
      'transformation, une grande partie de son corps devient entièrement ' +
      'constituée de diamant, ce qui le rend extrêmement volumineux et ' +
      'brillant.',
    hair: '#2a2a33', cut: 'bald', skin: HALE, outfit: '#3a4250',
    extras: ['bare-chest'],
    face: 'square',
    head: 'none', mark: 'none', prop: 'none', build: 'giant',
  },
  vista: {
    note:
      'Homme adulte grand et élégant. Porte un chapeau à large bord. Cheveux ' +
      'sombres. Grande moustache en forme de guidon. Visage fin mais mâchoire ' +
      'solide. Corps athlétique. Vêtements de pirate très élégants, souvent ' +
      'avec une longue veste. Deux sabres. Des motifs floraux, notamment des ' +
      'roses, apparaissent sur sa tenue.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    face: 'sharp',
    height: 'tall',
    head: 'brim', mark: 'moustache', prop: 'sword', build: 'slim',
  },
  izou: {
    note:
      'Homme à l’apparence extrêmement élégante et androgyne. Très longs ' +
      'cheveux noirs, souvent attachés ou relevés. Visage fin et peau claire. ' +
      'Porte un maquillage rappelant les acteurs de kabuki, notamment autour ' +
      'des yeux et des lèvres. Kimono traditionnel avec plusieurs couches et ' +
      'motifs. Deux pistolets. Corps mince et droit, peu massif.',
    hair: '#1c1c22', cut: 'topknot', skin: CLAIR, outfit: '#3a4250',
    extras: ['face-tattoo'],
    face: 'sharp',
    head: 'none', mark: 'none', prop: 'gun', build: 'slim',
  },
  'hody-jones': {
    note:
      'Homme-poisson de type grand requin. Corps gigantesque, extrêmement ' +
      'musclé. Peau bleu-gris. Cheveux blancs dressés vers l’arrière. Visage ' +
      'de requin avec nez aplati, mâchoire extrêmement large et dents ' +
      'triangulaires en scie. Yeux agressifs. Bras et épaules gigantesques. ' +
      'Porte une tenue sombre sans manches, laissant apparaître son torse.',
    hair: '#e9e5da', cut: 'spiky', skin: '#8fb4c4', outfit: '#2c2f3a',
    extras: ['open-vest', 'sharp-teeth'],
    frame: 'fishman',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'giant',
  },
  trebol: {
    note:
      'Homme très étrange dont le corps semble informe et extrêmement ' +
      'volumineux. Cheveux courts ou peu visibles sous ses accessoires. Porte ' +
      'de grosses lunettes noires. Visage long et nez particulièrement ' +
      'volumineux. Son vêtement vert est extrêmement large et recouvre une ' +
      'grande partie de son corps. Une quantité importante de mucus est ' +
      'continuellement visible autour de son nez et de sa bouche. Sa ' +
      'silhouette réelle est volontairement difficile à distinguer.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    face: 'long',
    head: 'none', mark: 'glasses', prop: 'none', build: 'slim',
  },
  diamante: {
    note:
      'Homme grand, mince et très élancé. Longs cheveux blonds, légèrement ' +
      'ondulés. Visage fin et nez relativement long. Porte un grand tricorne ' +
      'à plume, une cape rouge et une tenue très colorée. Jambes longues et ' +
      'silhouette d’escrimeur. Son physique est davantage élégant et théâtral ' +
      'que massif.',
    hair: '#e6cf7e', cut: 'wavy', skin: CLAIR, outfit: '#b8362c',
    extras: ['cape', 'feather'],
    face: 'sharp',
    height: 'tall',
    head: 'tricorne', mark: 'none', prop: 'none', build: 'slim',
  },
  pica: {
    note:
      'Homme gigantesque dans sa forme normale et encore plus énorme ' +
      'lorsqu’il fusionne avec la pierre. Visage assez fin malgré son corps ' +
      'immense. Cheveux noirs courts. Son principal trait corporel est son ' +
      'volume démesuré lorsqu’il forme un colosse de roche. Lorsqu’il ' +
      'fusionne avec la pierre, il peut prendre la forme d’un véritable géant ' +
      'minéral avec une tête humaine géante.',
    hair: '#1c1c22', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    height: 'towering',
    head: 'none', mark: 'none', prop: 'none', build: 'giant',
  },
  vergo: {
    note:
      'Homme grand, large d’épaules et très musclé. Cheveux noirs courts. ' +
      'Lunettes de soleil. Visage assez carré. Porte une veste sombre et des ' +
      'vêtements bien ajustés. Son signe le plus absurde est le morceau de ' +
      'nourriture collé sur son visage à certaines occasions. Utilise un long ' +
      'bambou comme arme. Corps athlétique et puissant.',
    hair: '#1c1c22', cut: 'short', skin: CLAIR, outfit: '#2c2f3a',
    height: 'tall',
    head: 'none', mark: 'shades', prop: 'staff', build: 'broad',
  },
  sugar: {
    note:
      'Physiquement, elle ressemble à une petite fille très jeune. Petite ' +
      'taille, corps extrêmement mince et peau très pâle. Très longs cheveux ' +
      'noirs. Grands yeux. Visage enfantin. Porte une robe sombre assez ' +
      'simple. Son fruit du démon stoppe son vieillissement, ce qui explique ' +
      'son apparence enfantine malgré son âge réel.',
    hair: '#1c1c22', cut: 'long', skin: CLAIR, outfit: '#2c2f3a',
    face: 'round',
    eyes: 'wide',
    height: 'short',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  'senor-pink': {
    note:
      'Homme très robuste, avec une carrure de travailleur manuel ou de ' +
      'docker. Visage large, nez volumineux, petite barbe. Porte un costume ' +
      'de bébé, avec bonnet, tétine et vêtements enfantins, malgré son corps ' +
      'd’adulte massif. Une cigarette est souvent présente à ses lèvres. ' +
      'Contraste visuel très marqué entre son physique adulte et ses ' +
      'vêtements de nourrisson.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    face: 'square',
    head: 'cap', mark: 'cigarette', prop: 'none', build: 'broad',
  },
  monet: {
    note:
      'Femme grande et mince. Très longs cheveux verts, lisses. Visage fin et ' +
      'regard généralement doux ou froid. Haut du corps humain avec ' +
      'silhouette féminine fine. Après sa transformation, le bas du corps ' +
      'peut devenir celui d’un grand oiseau, avec ailes couvertes de plumes ' +
      'et serres puissantes. Elle porte généralement des vêtements noirs ou ' +
      'sombres.',
    hair: '#5a9a55', cut: 'long', skin: CLAIR, outfit: '#22222c',
    extras: ['feather-coat', 'wings'],
    face: 'sharp',
    brow: 'calm',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  kaku: {
    note:
      'Homme grand et mince, mais athlétique. Visage très long avec nez carré ' +
      'anormalement grand. Cheveux clairs courts. Porte souvent une ' +
      'casquette. Yeux fins. Corps élancé, jambes longues. Utilise deux ' +
      'sabres. Son fruit du démon lui donne un long cou de girafe et des ' +
      'membres très allongés lorsqu’il se transforme.',
    hair: '#d8cbb0', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    eyes: 'sharp',
    height: 'tall',
    head: 'cap', mark: 'none', prop: 'sword', build: 'slim',
  },
  spandam: {
    note:
      'Homme mince et assez grand. Cheveux bruns relativement longs. Visage ' +
      'partiellement dissimulé par un masque métallique, surtout autour du ' +
      'nez et de la bouche. Épaules relativement étroites. Porte la tenue et ' +
      'la cape caractéristiques du CP9. Bras fins, jambes longues. Physique ' +
      'peu imposant.',
    hair: '#6a4326', cut: 'long', skin: CLAIR, outfit: '#3a4250',
    extras: ['cape'],
    height: 'tall',
    head: 'mask', mark: 'none', prop: 'none', build: 'slim',
  },
  hannyabal: {
    note:
      'Homme grand et mince, avec des proportions très théâtrales. Visage ' +
      'marqué par une apparence de masque Hannya, avec des traits ' +
      'démoniaques. Porte les vêtements rouges et noirs de l’administration ' +
      'd’Impel Down. Corps longiligne avec bras et jambes relativement longs.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#b8362c',
    height: 'tall',
    head: 'mask', mark: 'none', prop: 'none', build: 'slim',
  },
  domino: {
    note:
      'Femme grande et très mince. Cheveux blonds, longs et lisses. Visage ' +
      'fin, lèvres marquées. Porte un petit masque noir autour des yeux. ' +
      'Uniforme très ajusté de gardienne d’Impel Down, généralement sombre. ' +
      'Jambes longues, posture droite. Fouet comme arme.',
    hair: '#e6cf7e', cut: 'long', skin: CLAIR, outfit: '#3a4250',
    face: 'sharp',
    height: 'tall',
    head: 'mask', mark: 'none', prop: 'knives', build: 'slim',
  },
  sadi: {
    note:
      'Femme grande et très mince. Longs cheveux roses, lisses. Visage fin, ' +
      'yeux étroits. Deux petites cornes sur la tête. Porte une tenue noire ' +
      'extrêmement ajustée, souvent très ouverte au niveau des jambes et du ' +
      'buste. Bottes hautes et fouet. Silhouette longue, féminine et très ' +
      'élancée.',
    hair: '#e88ab0', cut: 'long', skin: CLAIR, outfit: '#22222c',
    extras: ['open-vest', 'boots', 'tusks'],
    face: 'sharp',
    eyes: 'narrow',
    height: 'tall',
    head: 'horns', mark: 'none', prop: 'knives', build: 'slim',
  },
  tsuru: {
    note:
      'Vieille femme de la Marine, grande et relativement mince. Cheveux ' +
      'blancs, coiffés en hauteur et parfois attachés. Visage fin et très ' +
      'ridé. Porte le manteau de Marine. Corps plutôt sec, posture droite ' +
      'malgré l’âge. Utilise une pipe. Son apparence est celle d’une vieille ' +
      'femme élégante et autoritaire plutôt que d’une combattante massive.',
    hair: '#e9e5da', cut: 'ponytail', skin: CLAIR, outfit: '#3a4250',
    extras: ['face-lines'],
    face: 'sharp',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'cane', build: 'slim',
  },
  momonga: {
    note:
      'Homme grand et athlétique. Cheveux noirs, relativement longs mais bien ' +
      'entretenus. Barbe soigneusement taillée. Visage anguleux avec nez ' +
      'fort. Porte le manteau de vice-amiral sur les épaules et un sabre. ' +
      'Jambes et bras proportionnés, musculature visible mais pas ' +
      'gigantesque.',
    hair: '#1c1c22', cut: 'long', skin: CLAIR, outfit: '#3a4250',
    extras: ['coat-shoulders'],
    face: 'sharp',
    height: 'tall',
    head: 'none', mark: 'beard', prop: 'sword', build: 'slim',
  },
  hina: {
    note:
      'Femme grande, mince et élégante. Très longs cheveux roses, lisses et ' +
      'volumineux. Visage fin, yeux étroits et lèvres marquées. Corps élancé ' +
      'avec longues jambes. Elle porte une tenue noire ajustée sous le ' +
      'manteau blanc de la Marine. Fume souvent une cigarette. Son apparence ' +
      'est particulièrement sophistiquée.',
    hair: '#e88ab0', cut: 'long', skin: CLAIR, outfit: '#22222c', coat: '#f0ece2',
    face: 'sharp',
    eyes: 'narrow',
    height: 'tall',
    head: 'none', mark: 'cigarette', prop: 'none', build: 'slim',
  },
  't-bone': {
    note:
      'Homme extraordinairement maigre, presque squelettique. Bras et jambes ' +
      'très longs et très fins. Visage extrêmement émacié, joues creuses. ' +
      'Porte une armure et un casque avec plumet. Sabre très imposant par ' +
      'rapport à son corps. Son physique donne l’impression d’un squelette ' +
      'humain vivant.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    extras: ['feather', 'pauldrons', 'face-lines'],
    head: 'horns', mark: 'none', prop: 'greatsword', build: 'slim',
  },
  'don-quijote-rosinante': {
    note:
      'Très grand homme, extrêmement longiligne. Jambes et bras longs, ' +
      'épaules relativement étroites. Visage allongé couvert de maquillage ' +
      'blanc et rouge de clown. Longs cheveux clairs. Il porte un gigantesque ' +
      'manteau noir couvert de plumes. Son torse comporte un motif de cœur ' +
      'rouge. Fume souvent plusieurs cigarettes en même temps. Son apparence ' +
      'est volontairement extravagante.',
    hair: '#d8cbb0', cut: 'long', skin: CLAIR, outfit: '#22222c',
    extras: ['face-tattoo', 'feather-coat'],
    face: 'long',
    height: 'tall',
    head: 'none', mark: 'cigarette', prop: 'none', build: 'slim',
  },
  jango: {
    note:
      'Homme grand et mince. Très longs cheveux noirs, souvent regroupés sous ' +
      'un bonnet ou un chapeau. Visage fin. Porte de grandes lunettes rondes ' +
      'bleues. Menton étroit. Vêtements militaires puis uniformes de Marine. ' +
      'Son anneau hypnotique ajoute un élément circulaire très visible à sa ' +
      'silhouette.',
    hair: '#1c1c22', cut: 'long', skin: CLAIR, outfit: '#3a4250',
    face: 'sharp',
    height: 'tall',
    head: 'brim', mark: 'glasses', prop: 'none', build: 'slim',
  },
  sentomaru: {
    note:
      'Homme extrêmement massif et large. Gros ventre, épaules énormes et ' +
      'bras très épais. Barbe formant un collier autour du menton et de la ' +
      'mâchoire. Porte un casque et des vêtements de garde militaire. Son ' +
      'énorme hache accentue la largeur de sa silhouette. Corps ' +
      'particulièrement lourd.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    extras: ['pendant', 'belt'],
    head: 'horns', mark: 'beard', prop: 'axe', build: 'broad',
  },
  makino: {
    note:
      'Jeune femme adulte de taille moyenne et de morphologie mince. Cheveux ' +
      'verts, longs et lisses, généralement attachés ou tombant sur les ' +
      'épaules. Visage doux, grands yeux et sourire calme. Porte un tablier ' +
      'de tavernière au-dessus d’une robe simple. Peau claire. Apparence très ' +
      'naturelle et élégante.',
    hair: '#5a9a55', cut: 'ponytail', skin: CLAIR, outfit: '#ded6c2',
    extras: ['coat-shoulders', 'necktie'],
    face: 'round',
    eyes: 'wide',
    brow: 'calm',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  'curly-dadan': {
    note:
      'Femme âgée de forte corpulence, avec de larges épaules et un corps ' +
      'volumineux. Cheveux orange très abondants et fortement bouclés, ' +
      'formant presque une masse autour de sa tête. Visage large et ridé, ' +
      'gros nez. Cigarette souvent à la bouche. Elle porte des vêtements ' +
      'simples et robustes. Malgré son âge, ses bras et épaules restent ' +
      'imposants.',
    hair: '#e08a3c', cut: 'wavy', skin: CLAIR, outfit: '#3a4250',
    extras: ['face-lines'],
    face: 'square',
    head: 'none', mark: 'cigarette', prop: 'none', build: 'slim',
  },
  koshiro: {
    note:
      'Homme adulte grand et mince, mais encore très droit et athlétique. ' +
      'Longs cheveux noirs, coiffés vers l’arrière ou attachés. Porte des ' +
      'lunettes. Visage fin et sérieux. Kimono blanc traditionnel. Porte un ' +
      'katana de maître. Ses bras ne sont pas volumineux, mais son corps est ' +
      'sec et entraîné.',
    hair: '#1c1c22', cut: 'ponytail', skin: CLAIR, outfit: '#f0ece2',
    face: 'sharp',
    brow: 'calm',
    height: 'tall',
    head: 'none', mark: 'glasses', prop: 'sword', build: 'slim',
  },
  kuina: {
    note:
      'Jeune fille mince mais athlétique. Cheveux bleu-noir, relativement ' +
      'courts et souvent attachés en arrière. Visage fin et juvénile. Peau ' +
      'claire. Corps svelte avec bras et jambes fins mais entraînés. Porte un ' +
      'kimono ou une tenue d’entraînement simple. Katana attaché à la ' +
      'ceinture.',
    hair: '#2a2f42', cut: 'ponytail', skin: CLAIR, outfit: '#3a4250',
    extras: ['belt'],
    face: 'sharp',
    head: 'none', mark: 'none', prop: 'sword', build: 'slim',
  },
  kaya: {
    note:
      'Jeune femme très mince et délicate. Longs cheveux blonds, lisses, ' +
      'tombant largement dans le dos. Visage très fin et pâle. Grands yeux. ' +
      'Épaules étroites, bras fins et jambes longues. Porte des robes claires ' +
      'et élégantes, souvent blanches ou pastel. Impression générale : jeune ' +
      'aristocrate fragile.',
    hair: '#e6cf7e', cut: 'long', skin: CLAIR, outfit: '#ded6c2',
    face: 'sharp',
    eyes: 'wide',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  helmeppo: {
    note:
      'Jeune homme relativement grand et mince. Cheveux blonds courts, ' +
      'coiffés proprement. Visage allongé et peau claire. Yeux souvent grands ' +
      'ou légèrement inquiets. Corps athlétique mais pas particulièrement ' +
      'musclé. Uniforme de Marine parfaitement ajusté. Sa silhouette devient ' +
      'progressivement plus sportive au fil de l’histoire.',
    hair: '#e6cf7e', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    face: 'long',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  'boa-sandersonia': {
    note:
      'Femme extrêmement grande et imposante, au physique athlétique et ' +
      'musclé. Très longs cheveux verts, épais, descendant dans le dos. ' +
      'Visage allongé, yeux étroits. Peau claire. Bras et jambes longs et ' +
      'puissants. Elle porte une tenue Kuja légère, avec une robe ou un haut ' +
      'très ouvert et des ornements de serpent. Son corps est plus robuste ' +
      'que celui de Hancock mais beaucoup plus élancé que celui de Marigold.',
    hair: '#5a9a55', cut: 'long', skin: CLAIR, outfit: '#3a4250',
    extras: ['beads', 'open-vest'],
    face: 'long',
    eyes: 'narrow',
    height: 'towering',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  'boa-marigold': {
    note:
      'Très grande femme, mais extrêmement corpulente. Bras et jambes épais, ' +
      'hanches larges, ventre développé. Cheveux orange/roux, attachés en ' +
      'hauteur. Visage rond et joues pleines. Ses yeux sont grands. Elle ' +
      'porte une grande robe traditionnelle ample, avec des éléments ' +
      'rappelant le style de Kuja. Son physique est beaucoup plus massif que ' +
      'celui de sa sœur Boa Hancock.',
    hair: '#c4562a', cut: 'topknot', skin: CLAIR, outfit: '#3a4250',
    extras: ['belt'],
    face: 'round',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  hajrudin: {
    note:
      'Géant d’Elbaf de taille gigantesque comparé aux humains normaux. Corps ' +
      'extrêmement massif et athlétique, avec des bras et jambes énormes. ' +
      'Cheveux blonds longs. Barbe blonde souvent tressée. Visage très large ' +
      'avec grosses dents et traits typiquement nordiques. Porte une armure ' +
      'métallique, un casque et de grandes protections. Physiquement, il ' +
      'domine complètement un humain normal.',
    hair: '#e6cf7e', cut: 'long', skin: CLAIR, outfit: '#3a4250',
    extras: ['pauldrons', 'sharp-teeth'],
    face: 'square',
    height: 'towering',
    head: 'horns', mark: 'beard', prop: 'none', build: 'giant',
  },
  leo: {
    note:
      'Très petit nain Tontatta. Corps extrêmement minuscule comparé à un ' +
      'humain normal. Tête disproportionnellement grande, oreilles longues, ' +
      'nez pointu. Cheveux clairs. Porte un casque avec de grandes oreilles ' +
      'ressemblant à celles d’un lapin. Corps mince et agile. Transporte une ' +
      'gigantesque aiguille et du fil pour sa taille.',
    hair: '#d8cbb0', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    height: 'short',
    head: 'horns', mark: 'none', prop: 'staff', build: 'slim',
  },
  'baby-5': {
    note:
      'Femme jeune et mince, avec une silhouette féminine fine mais bien ' +
      'proportionnée. Peau claire. Ses cheveux noirs sont relativement longs, ' +
      'lisses et tombent autour de son visage et sur ses épaules. Grands yeux ' +
      'et traits fins. Elle porte généralement une robe noire ou très sombre, ' +
      'moulante au niveau du buste, avec des bottes et des accessoires de ' +
      'servante/combat. Son corps peut se transformer en armes : bras ' +
      'transformés en canons ou lames, jambes en armes, etc., ce qui modifie ' +
      'radicalement sa silhouette lorsqu’elle utilise son fruit.',
    hair: '#1c1c22', cut: 'long', skin: CLAIR, outfit: '#22222c',
    extras: ['boots'],
    eyes: 'wide',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  // --- Épiques : équipage de Big Mom ----------------------------------------

  'charlotte-chiffon': {
    note:
      'Jeune femme grande et assez ronde, visage doux et arrondi. Peau ' +
      'claire. Cheveux blond très pâle, longs et volumineux. Grands yeux et ' +
      'lèvres bien dessinées. Elle porte une robe sombre avec un col haut et ' +
      'des vêtements élégants. Sa silhouette reste féminine et relativement ' +
      'douce, sans musculature apparente.',
    hair: '#e6cf7e', cut: 'long', skin: CLAIR, outfit: '#2c2f3a',
    extras: ['high-collar'],
    face: 'round',
    eyes: 'wide',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  'charlotte-praline': {
    note:
      'Femme-poisson de type requin. Corps féminin assez grand et voluptueux. ' +
      'Peau claire. Cheveux bruns très longs et ondulés. Visage humain, mais ' +
      'avec des caractéristiques de poisson, notamment la structure autour de ' +
      'la bouche et les nageoires. Ses avant-bras présentent des éléments ' +
      'rappelant des nageoires. Porte une robe claire et élégante.',
    hair: '#6a4326', cut: 'wavy', skin: CLAIR, outfit: '#ded6c2',
    extras: ['fins'],
    frame: 'fishman',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  'charlotte-daifuku': {
    note:
      'Homme extrêmement grand et musclé. Épaules très larges, torse massif ' +
      'et bras puissants. Crâne presque entièrement rasé. Très grosse ' +
      'moustache noire, accompagnée d’une barbiche. Visage large et dur. Il ' +
      'porte une veste ouverte laissant le torse nu. Sabre à la ceinture. ' +
      'Physique de lutteur ou culturiste lourd.',
    hair: '#1c1c22', cut: 'bald', skin: CLAIR, outfit: '#3a4250',
    extras: ['bare-chest', 'open-vest', 'belt'],
    face: 'square',
    height: 'towering',
    head: 'none', mark: 'goatee', prop: 'sword', build: 'broad',
  },
  'charlotte-oven': {
    note:
      'Homme colossal et extrêmement musclé. Visage large et carré, avec des ' +
      'pommettes massives et une mâchoire puissante. Cheveux noirs courts. ' +
      'Peau mate. Cou épais et épaules énormes. Il porte une tenue rouge ' +
      'foncé ouverte sur les bras, avec un pantalon et des bottes. Ses bras ' +
      'sont particulièrement volumineux. Physiquement, c’est l’un des hommes ' +
      'les plus massifs de la famille Charlotte.',
    hair: '#1c1c22', cut: 'short', skin: HALE, outfit: '#b8362c',
    extras: ['boots'],
    face: 'square',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  'charlotte-mont-d-or': {
    note:
      'Homme de taille moyenne à grande, assez mince. Visage étroit, petit ' +
      'nez et lunettes rondes. Cheveux clairs plaqués vers l’arrière. Cou fin ' +
      'et épaules modestes. Porte une longue tenue claire rappelant ' +
      'énormément celle d’un bibliothécaire ou archiviste. Son apparence est ' +
      'élégante et intellectuelle plutôt que physique.',
    hair: '#d8cbb0', cut: 'short', skin: CLAIR, outfit: '#ded6c2',
    face: 'long',
    height: 'tall',
    head: 'none', mark: 'glasses', prop: 'none', build: 'slim',
  },
  streusen: {
    note:
      'Vieil homme petit à moyen et plutôt mince. Très longue barbe blanche ' +
      'pointue, cheveux blancs ou gris. Visage ridé et yeux petits. Porte la ' +
      'toque de chef et un grand tablier de cuisinier. Corps sec avec bras ' +
      'fins. Grand couteau souvent visible.',
    hair: '#e9e5da', cut: 'long', skin: CLAIR, outfit: '#3a4250',
    extras: ['necktie', 'face-lines'],
    eyes: 'narrow',
    height: 'short',
    head: 'cap', mark: 'beard', prop: 'knives', build: 'slim',
  },
  promethee: {
    note:
      'Petite entité solaire. Forme de boule de feu jaune/orange avec un ' +
      'visage humain souriant intégré. Corps constitué principalement de ' +
      'flammes. Pas de jambes ni d’anatomie humaine classique. Flammes ' +
      'irrégulières formant une sorte de chevelure autour du visage. Taille ' +
      'généralement compacte, mais pouvant augmenter.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    height: 'short',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  napoleon: {
    note:
      'Objet animé : bicorne bleu nuit prenant la forme d’un visage humain. ' +
      'Deux yeux, grand nez et moustache intégrés à la surface du chapeau. ' +
      'Une lame est fixée sur le sommet. La forme du corps dépend du chapeau ' +
      'lui-même. Il possède une expression faciale très mobile.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    head: 'tricorne', mark: 'moustache', prop: 'none', build: 'slim',
  },
  hera: {
    note:
      'Être constitué d’un nuage d’orage vivant. Corps flottant sans ' +
      'structure humaine classique. Forme principalement nuageuse, de couleur ' +
      'gris-violet. Visage rond intégré dans le nuage, avec des joues ' +
      'visibles, deux yeux et une expression agressive. De petits éclairs ' +
      'apparaissent autour du corps. Texture générale : nuage épais et ' +
      'irrégulier.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    face: 'round',
    brow: 'fierce',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  zeus: {
    note:
      'Nuage vivant principalement gris-bleu, plus compact et plus rond que ' +
      'Prométhée. Visage humain extrêmement simple, avec grands yeux et ' +
      'expression naïve. Corps duveteux avec petites pointes de nuage. De ' +
      'petits éclairs jaunes apparaissent autour de lui. Pas de membres ' +
      'humains classiques. Il peut s’étendre et grossir considérablement.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    eyes: 'wide',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },

  // --- Épiques : équipage aux Cent Bêtes ------------------------------------

  'who-s-who': {
    note:
      'Homme grand et athlétique, à l’apparence très féline. Cheveux clairs ' +
      'mi-longs. Visage allongé et mâchoire marquée. Porte un masque de félin ' +
      'couvrant la partie supérieure du visage dans certaines scènes. Longue ' +
      'veste claire et pantalon assorti. Deux sabres. En forme Zoan, il ' +
      'devient un sabre à dents humanoïde, avec museau félin, oreilles, ' +
      'fourrure et énorme mâchoire.',
    hair: '#d8cbb0', cut: 'long', skin: CLAIR, outfit: '#ded6c2',
    face: 'long',
    height: 'tall',
    head: 'mask', mark: 'none', prop: 'sword', build: 'slim',
  },
  sasaki: {
    note:
      'Homme grand et très massif. Crâne rasé, barbe noire et très fournie. ' +
      'Visage large. Cou et épaules puissants. Porte une longue veste sombre ' +
      'et un grand sabre. Corps athlétique mais surtout épais et lourd. En ' +
      'forme Zoan antique, il devient un Triceratops, avec large crâne, ' +
      'cornes et immense collerette.',
    hair: '#1c1c22', cut: 'bald', skin: CLAIR, outfit: '#2c2f3a',
    extras: ['tusks'],
    face: 'square',
    height: 'tall',
    head: 'horns', mark: 'beard', prop: 'greatsword', build: 'broad',
  },
  holdem: {
    note:
      'Homme grand et robuste. Cheveux hérissés et visage humain relativement ' +
      'large. Son trait majeur est la tête de lion intégrée dans le ventre, ' +
      'avec bouche, yeux et crinière. Il porte un kimono très ouvert montrant ' +
      'une grande partie du torse et du ventre. Bras puissants. Apparence ' +
      'hybride homme/lion très particulière.',
    hair: '#2a2a33', cut: 'spiky', skin: CLAIR, outfit: '#3a4250',
    extras: ['belt', 'open-vest', 'mane'],
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  speed: {
    note:
      'Femme-centaure de type cheval. Partie supérieure : corps féminin ' +
      'mince, visage fin, longs cheveux blonds et généralement un chapeau. ' +
      'Partie inférieure : grand corps de cheval, musclé au niveau des jambes ' +
      'et du bassin, avec quatre sabots. Cette combinaison donne une ' +
      'silhouette très haute et très longue.',
    hair: '#e6cf7e', cut: 'long', skin: CLAIR, outfit: '#3a4250',
    extras: ['boots'],
    face: 'sharp',
    head: 'brim', mark: 'none', prop: 'none', build: 'slim',
  },

  // --- Épiques : équipage de Barbe Blanche ----------------------------------

  thatch: {
    note:
      'Homme grand, mince mais athlétique. Visage souriant, mâchoire moyenne. ' +
      'Cheveux bruns très volumineux, dressés en arrière en une grande ' +
      'banane. Porte une tenue claire de cuisinier avec tablier. Corps assez ' +
      'sec. Sabre à la ceinture. Son apparence combine celle d’un cuisinier ' +
      'et d’un épéiste.',
    hair: '#6a4326', cut: 'pompadour', skin: CLAIR, outfit: '#ded6c2',
    extras: ['belt', 'necktie'],
    height: 'tall',
    head: 'none', mark: 'none', prop: 'sword', build: 'slim',
  },
  haruta: {
    note:
      'Jeune homme très fin et de petite stature comparé aux autres ' +
      'commandants. Visage juvénile. Cheveux bruns courts, tombant légèrement ' +
      'autour du visage. Corps mince mais souple. Porte une veste claire et ' +
      'une tenue de combat légère. Utilise une rapière. Apparence presque ' +
      'androgyne.',
    hair: '#6a4326', cut: 'short', skin: CLAIR, outfit: '#ded6c2',
    face: 'round',
    height: 'short',
    head: 'none', mark: 'none', prop: 'sword', build: 'slim',
  },
  atmos: {
    note:
      'Homme extrêmement massif, large au niveau du torse et des bras. Son ' +
      'visage évoque celui d’un bovin : nez large, traits épais, mâchoire ' +
      'puissante et petites cornes sur la tête. Peau sombre. Son torse est ' +
      'entièrement découvert, montrant une musculature très développée. Il ' +
      'porte peu de vêtements, principalement des éléments destinés au ' +
      'combat. Son arme est une grande hache. Impression générale : brute ' +
      'géante extrêmement robuste.',
    hair: '#2a2a33', cut: 'short', skin: MAT, outfit: '#3a4250',
    extras: ['tusks'],
    head: 'horns', mark: 'none', prop: 'axe', build: 'broad',
  },
  fossa: {
    note:
      'Homme adulte grand et robuste. Visage anguleux, nez prononcé, yeux ' +
      'étroits. Une grande cicatrice traverse son visage. Porte un cigare. ' +
      'Cheveux et barbe foncés. Torse assez large. Veste sombre et pantalon ' +
      'robuste. Son sabre est généralement visible. Physique de combattant ' +
      'expérimenté plutôt que de colosse.',
    hair: '#33291f', cut: 'short', skin: CLAIR, outfit: '#2c2f3a',
    face: 'sharp',
    eyes: 'narrow',
    height: 'tall',
    head: 'none', mark: 'cigar', prop: 'sword', build: 'broad',
  },
  squardo: {
    note:
      'Homme adulte plutôt mince mais de taille importante. Cheveux sombres ' +
      'assez longs. Bandana sur la tête. Visage étroit et marqué. Porte une ' +
      'veste ouverte laissant apparaître une partie du torse. Bras ' +
      'relativement musclés mais corps sec. Sabre long porté au côté.',
    hair: '#2a2a33', cut: 'long', skin: CLAIR, outfit: '#3a4250',
    extras: ['open-vest'],
    face: 'long',
    head: 'bandana', mark: 'none', prop: 'sword', build: 'slim',
  },
  'whitey-bay': {
    note:
      'Femme adulte grande et assez mince. Cheveux blancs courts, coupés ' +
      'autour de la tête. Visage fin avec traits froids. Peau claire. Porte ' +
      'un épais manteau de fourrure clair, donnant beaucoup de volume autour ' +
      'des épaules et du cou. Silhouette féminine mais robuste.',
    hair: '#e9e5da', cut: 'short', skin: CLAIR, outfit: '#ded6c2',
    extras: ['fur-collar'],
    face: 'sharp',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  'little-oz-junior': {
    note:
      'Géant colossal, encore bien plus massif qu’un humain gigantesque ' +
      'standard. Corps incroyablement épais, avec épaules, bras et jambes ' +
      'gigantesques. Visage carré, grosses dents et petites cornes sur la ' +
      'tête. Porte très peu de vêtements. Torse et bras couverts de muscles ' +
      'épais. Sa taille donne l’impression d’un véritable monstre humanoïde.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    extras: ['sharp-teeth', 'tusks'],
    face: 'square',
    height: 'towering',
    head: 'horns', mark: 'none', prop: 'none', build: 'giant',
  },

  // --- Épiques : famille Don Quichotte --------------------------------------

  jora: {
    note:
      'Femme d’âge mûr, relativement grande et surtout très corpulente. ' +
      'Visage rond. Cheveux colorés, volumineux et coiffés très haut. Porte ' +
      'des vêtements extrêmement voyants et fantaisistes. Bras et jambes ' +
      'épais. Forte poitrine et hanches larges. Apparence volontairement ' +
      'extravagante.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#c25a8a',
    face: 'round',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  'lao-g': {
    note:
      'Vieillard extrêmement sec et voûté. Corps maigre avec muscles très peu ' +
      'volumineux. Très longue barbe blanche. Lunettes rondes. Visage ridé et ' +
      'profondément marqué par l’âge. Porte des vêtements traditionnels ' +
      'd’arts martiaux. Bras et jambes très fins, mais extrêmement nerveux.',
    hair: '#e9e5da', cut: 'long', skin: CLAIR, outfit: '#3a4250',
    extras: ['face-lines'],
    head: 'none', mark: 'glasses', prop: 'none', build: 'slim',
  },
  machvise: {
    note:
      'Homme gigantesque, très lourd et extraordinairement rond. Crâne ' +
      'dégarni, petite paire de lunettes. Visage large et ventre énorme. Bras ' +
      'et jambes épais. Porte une tenue rappelant celle d’un lutteur ou d’un ' +
      'catcheur. Son corps combine masse graisseuse et puissance physique.',
    hair: '#2a2a33', cut: 'bald', skin: CLAIR, outfit: '#3a4250',
    extras: ['belt'],
    face: 'square',
    height: 'towering',
    head: 'none', mark: 'glasses', prop: 'none', build: 'giant',
  },
  dellinger: {
    note:
      'Jeune homme très mince et relativement petit. Apparence androgyne. ' +
      'Cheveux blonds mi-longs. Peau claire. Visage fin avec des dents ' +
      'extrêmement pointues et un sourire inquiétant. Corps souple, jambes ' +
      'relativement longues. Ses particularités de poisson-combattant lui ' +
      'donnent des oreilles et éléments aquatiques caractéristiques. Porte ' +
      'une tenue claire et élégante.',
    hair: '#e6cf7e', cut: 'long', skin: CLAIR, outfit: '#ded6c2',
    face: 'sharp',
    height: 'short',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  gladius: {
    note:
      'Homme adulte plutôt grand et mince. Cheveux sombres courts ou mi- ' +
      'longs. Visage anguleux, souvent partiellement couvert par un masque ou ' +
      'des protections de cuir. Longue veste sombre et gants. Bras et jambes ' +
      'relativement fins. Apparence sophistiquée et inquiétante.',
    hair: '#2a2a33', cut: 'long', skin: CLAIR, outfit: '#2c2f3a',
    extras: ['gloves'],
    face: 'sharp',
    height: 'tall',
    head: 'mask', mark: 'none', prop: 'none', build: 'slim',
  },
  buffallo: {
    note:
      'Homme très rond et trapu, avec un visage large et un menton ' +
      'extrêmement proéminent. Cheveux noirs dressés en pointes. Gros nez, ' +
      'petites lèvres et yeux assez rapprochés. Son corps est ' +
      'particulièrement compact. Porte des vêtements sombres et amples, avec ' +
      'des éléments métalliques de son équipement. Sa tête et son menton ' +
      'donnent à sa silhouette un aspect presque caricatural.',
    hair: '#1c1c22', cut: 'spiky', skin: CLAIR, outfit: '#2c2f3a',
    face: 'square',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },

  // --- Épiques : équipage de Trafalgar Law et de Kid -------------------------

  shachi: {
    note:
      'Homme relativement petit et mince. Porte une casquette, des lunettes ' +
      'teintées et une combinaison claire des Heart Pirates. Visage souriant ' +
      'et assez rond. Corps mince, bras peu volumineux. Son apparence est ' +
      'volontairement similaire à celle de Penguin.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#ded6c2',
    height: 'short',
    head: 'cap', mark: 'shades', prop: 'none', build: 'slim',
  },
  pingouin: {
    note:
      'Homme de petite à moyenne taille. Visage assez mince. Porte un bonnet ' +
      'blanc à visière, cachant une partie de ses cheveux. Combinaison claire ' +
      'caractéristique des Heart Pirates. Yeux et bouche assez simples. Corps ' +
      'mince et agile. Son apparence est coordonnée avec celle de Shachi.',
    hair: '#e9e5da', cut: 'short', skin: CLAIR, outfit: '#ded6c2',
    height: 'short',
    head: 'cap', mark: 'none', prop: 'none', build: 'slim',
  },
  heat: {
    note:
      'Homme grand, mince et très élancé. Visage long, lèvres très épaisses ' +
      'et bien visibles. Cheveux roux soigneusement plaqués. Peau claire. ' +
      'Porte une veste sombre, souvent ouverte, et des vêtements de pirate ' +
      'relativement simples. Jambes longues et corps sec.',
    hair: '#c4562a', cut: 'short', skin: CLAIR, outfit: '#2c2f3a',
    face: 'long',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  wire: {
    note:
      'Homme extrêmement grand et très décharné. Crâne rasé. Visage pâle, ' +
      'étroit et émacié. Bras et jambes très longs. Corps maigre mais ' +
      'légèrement musclé. Porte des vêtements de pirate simples. Utilise une ' +
      'très longue lance, qui accentue encore sa silhouette verticale.',
    hair: '#2a2a33', cut: 'bald', skin: PALE, outfit: '#3a4250',
    height: 'towering',
    head: 'none', mark: 'none', prop: 'staff', build: 'slim',
  },

  // --- Épiques : Fire Tank et grande flotte ---------------------------------

  vito: {
    note:
      'Homme grand et mince. Cheveux clairs plaqués en arrière. Porte de ' +
      'petites lunettes rondes. Visage étroit. Costume à rayures de gangster, ' +
      'souvent avec veste et cravate. Bras fins mais relativement longs. ' +
      'Silhouette d’un mafieux élégant.',
    hair: '#d8cbb0', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    extras: ['necktie', 'striped-suit'],
    face: 'long',
    height: 'tall',
    head: 'none', mark: 'glasses', prop: 'none', build: 'slim',
  },
  gotti: {
    note:
      'Homme trapu et très large. Visage énorme, mâchoire carrée et joues ' +
      'épaisses. Cou très épais. Cheveux sombres. Corps lourd et musclé, ' +
      'surtout au niveau des bras. Porte un costume sombre typique d’un ' +
      'gangster. Ressemble davantage à un garde du corps massif qu’à un ' +
      'combattant agile.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#2c2f3a',
    face: 'square',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  suleiman: {
    note:
      'Homme grand et très mince. Cheveux longs et sombres. Visage dur, peau ' +
      'plutôt mate. Plusieurs cicatrices sur le visage. Nez droit, yeux ' +
      'étroits. Porte des vêtements de gladiateur/combat et un sabre. Corps ' +
      'sec, surtout adapté au maniement de l’épée.',
    hair: '#2a2a33', cut: 'long', skin: HALE, outfit: '#3a4250',
    eyes: 'narrow',
    height: 'tall',
    head: 'none', mark: 'scar-face', prop: 'sword', build: 'slim',
  },
  gambia: {
    note:
      'Jeune homme mince et assez petit. Cheveux clairs dressés et bandeau ' +
      'sur le front. Visage fin. Corps léger et athlétique. Porte une tenue ' +
      'de combat courte et légère. Utilise un bâton. Silhouette de jeune ' +
      'combattant agile.',
    hair: '#d8cbb0', cut: 'spiky', skin: CLAIR, outfit: '#3a4250',
    face: 'sharp',
    height: 'short',
    head: 'bandana', mark: 'none', prop: 'staff', build: 'slim',
  },
  sai: {
    note:
      'Jeune homme grand et athlétique. Cheveux noirs mi-longs et bandeau. ' +
      'Visage fin, nez droit. Bras musclés et épaules assez larges. Porte une ' +
      'tenue traditionnelle claire, avec pantalon ample et haut adapté aux ' +
      'arts martiaux. Utilise deux longues lances dans certaines ' +
      'configurations.',
    hair: '#1c1c22', cut: 'long', skin: CLAIR, outfit: '#ded6c2',
    face: 'sharp',
    height: 'tall',
    head: 'bandana', mark: 'none', prop: 'staff', build: 'broad',
  },
  boo: {
    note:
      'Homme extrêmement corpulent et très large. Ventre volumineux, épaules ' +
      'larges et visage rond. Nez large et joues épaisses. Peau mate. Cheveux ' +
      'courts et relativement sombres. Il porte des vêtements traditionnels ' +
      'amples, donnant encore plus de volume à sa silhouette. Apparence ' +
      'générale : homme très lourd et placide.',
    hair: '#2a2a33', cut: 'short', skin: HALE, outfit: '#3a4250',
    extras: ['belt'],
    face: 'round',
    brow: 'calm',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  ideo: {
    note:
      'Homme grand, musclé et athlétique. Crâne très allongé et étroit. ' +
      'Cheveux courts et sombres. Visage anguleux. Torse entièrement ' +
      'découvert, avec muscles pectoraux et abdominaux visibles. Bras ' +
      'puissants. Porte de gros gants de boxe. Jambes longues et fortes. ' +
      'Corps de boxeur pur.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    extras: ['bare-chest', 'gloves'],
    face: 'sharp',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  'blue-gilly': {
    note:
      'Homme très grand et extrêmement longiligne. Ses jambes sont ' +
      'anormalement longues en raison de son style de combattant et de sa ' +
      'physiologie particulière. Peau bleuâtre. Visage étroit avec menton ' +
      'pointu. Cheveux noirs tirés vers l’arrière. Corps musclé mais très ' +
      'sec, avec peu de masse grasse. Il porte une tenue de combat légère ' +
      'couvrant assez peu le corps. Son principal élément visuel est le ' +
      'rapport jambes/torse extrêmement disproportionné.',
    hair: '#1c1c22', cut: 'short', skin: '#8fb4c4', outfit: '#3a4250',
    face: 'long',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  orlumbus: {
    note:
      'Homme massif et très grand. Corps extrêmement large et lourd, avec ' +
      'énorme torse et bras épais. Grande barbe sombre ou brun foncé. Porte ' +
      'un bicorne d’amiral, une longue veste et plusieurs accessoires de ' +
      'commandement. Son ventre est relativement développé. Porte une énorme ' +
      'ancre ou une arme de grande taille.',
    hair: '#6a4326', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    extras: ['belt'],
    height: 'tall',
    head: 'tricorne', mark: 'beard', prop: 'club', build: 'broad',
  },

  // --- Épiques : Marine et Cipher Pol ---------------------------------------

  onigumo: {
    note:
      'Homme grand, mince mais athlétique. Visage anguleux, nez prononcé. ' +
      'Cheveux noirs mi-longs. Porte le manteau de Marine sur les épaules. Sa ' +
      'tenue est celle d’un vice-amiral. Lorsqu’il utilise son pouvoir, ' +
      'plusieurs pattes d’araignée apparaissent derrière son corps, ' +
      'transformant fortement sa silhouette.',
    hair: '#1c1c22', cut: 'long', skin: CLAIR, outfit: '#3a4250',
    extras: ['coat-shoulders'],
    face: 'sharp',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  doberman: {
    note:
      'Homme grand et relativement mince. Visage très émacié, joues creusées ' +
      'et mâchoire longue. Cheveux noirs coiffés en arrière. Sourcils épais. ' +
      'Il porte l’uniforme d’officier de la Marine et le manteau blanc sur ' +
      'les épaules. Corps athlétique mais sec, sans volume musculaire ' +
      'excessif.',
    hair: '#1c1c22', cut: 'short', skin: CLAIR, outfit: '#f0ece2',
    extras: ['face-lines', 'coat-shoulders'],
    face: 'long',
    brow: 'fierce',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  strawberry: {
    note:
      'Homme très grand et très mince. Le crâne est anormalement haut et ' +
      'allongé, avec un visage extrêmement étroit. Longue moustache tombante ' +
      'de chaque côté de la bouche. Cheveux sombres. Manteau de Marine et ' +
      'tenue d’officier. Ses proportions sont particulièrement inhabituelles ' +
      'à cause de la forme du crâne.',
    hair: '#2a2a33', cut: 'long', skin: CLAIR, outfit: '#3a4250',
    height: 'tall',
    head: 'none', mark: 'moustache', prop: 'none', build: 'slim',
  },
  yamakaji: {
    note:
      'Homme grand et plutôt corpulent. Visage assez large. Porte des ' +
      'lunettes teintées. Chemise à motifs sous le manteau de Marine. Cigare ' +
      'souvent présent à la bouche. Cheveux sombres et courts. Corps robuste ' +
      'avec ventre légèrement développé. Silhouette de haut gradé confortable ' +
      'mais toujours solide.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    extras: ['belt'],
    face: 'square',
    height: 'tall',
    head: 'none', mark: 'cigar', prop: 'none', build: 'broad',
  },
  bastille: {
    note:
      'Très grand officier de la Marine, extrêmement massif. Épaules énormes, ' +
      'bras épais et jambes puissantes. Son visage est carré et sa mâchoire ' +
      'particulièrement imposante. Son casque possède des cornes, donnant à ' +
      'son apparence un aspect démoniaque. Peau mate. Il porte le manteau ' +
      'blanc de la Marine sur une tenue militaire sombre. Son arme est un ' +
      'très grand sabre. Son physique évoque un soldat blindé très lourd.',
    hair: '#2a2a33', cut: 'short', skin: HALE, outfit: '#2c2f3a', coat: '#f0ece2',
    extras: ['tusks'],
    height: 'tall',
    head: 'horns', mark: 'none', prop: 'greatsword', build: 'broad',
  },
  maynard: {
    note:
      'Homme adulte assez grand, robuste et athlétique. Crâne rasé, moustache ' +
      'fine. Visage large mais relativement sérieux. Porte une tenue sombre ' +
      'd’instructeur de la Marine et un sabre. Épaules assez larges, bras ' +
      'musclés sans exagération.',
    hair: '#2a2a33', cut: 'bald', skin: CLAIR, outfit: '#2c2f3a',
    face: 'square',
    brow: 'calm',
    height: 'tall',
    head: 'none', mark: 'moustache', prop: 'sword', build: 'broad',
  },
  brandnew: {
    note:
      'Homme adulte assez mince. Visage allongé, nez fin, menton étroit. ' +
      'Porte de petites lunettes rondes. Cheveux clairs coiffés soigneusement ' +
      'vers l’arrière. Peau claire. Uniforme classique d’officier de Marine ' +
      'et manteau blanc. Sa silhouette est beaucoup plus sèche et élégante ' +
      'que celle des soldats de première ligne.',
    hair: '#d8cbb0', cut: 'short', skin: CLAIR, outfit: '#f0ece2',
    face: 'long',
    head: 'none', mark: 'glasses', prop: 'none', build: 'slim',
  },
  nezumi: {
    note:
      'Officier de Marine ayant une tête inspirée d’un rat. Visage allongé, ' +
      'nez pointu, oreilles rondes et grandes moustaches fines. Cheveux gris ' +
      'plaqués. Corps humain relativement mince. Uniforme de Marine très ' +
      'propre. Ses mains et jambes restent humaines malgré le visage animal.',
    hair: '#a8a89e', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    face: 'long',
    head: 'none', mark: 'moustache', prop: 'none', build: 'slim',
  },
  fullbody: {
    note:
      'Homme grand, athlétique mais peu massif. Cheveux bleus, coiffés en ' +
      'arrière. Visage carré et sourcils épais. Porte l’uniforme de Marine. ' +
      'Ses poings sont protégés par de gros accessoires métalliques. Corps ' +
      'relativement bien entretenu, mais moins imposant que celui des vice- ' +
      'amiraux.',
    hair: '#3f6bb5', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    face: 'square',
    brow: 'fierce',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  stussy: {
    note:
      'Femme adulte grande, mince et très élégante. Longs cheveux ' +
      'clairs/blonds, légèrement ondulés. Visage fin, mâchoire petite et ' +
      'grands yeux. Robe sombre très élégante, souvent décolletée. Porte des ' +
      'gants et accessoires raffinés, parfois un verre. Silhouette élancée, ' +
      'longue et sophistiquée.',
    hair: '#e6cf7e', cut: 'wavy', skin: CLAIR, outfit: '#2c2f3a',
    extras: ['bare-midriff', 'beads', 'gloves'],
    face: 'sharp',
    eyes: 'wide',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  saldeath: {
    note:
      'Personnage extrêmement petit. Silhouette étroite et presque frêle. ' +
      'Porte un masque en forme de crâne, qui dissimule une grande partie du ' +
      'visage. Cape sombre. Bras et jambes fins. Trident plus grand que son ' +
      'propre corps ou presque. Son allure contraste fortement avec son ' +
      'équipement.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#2c2f3a',
    extras: ['cape'],
    height: 'short',
    head: 'mask', mark: 'none', prop: 'staff', build: 'slim',
  },
  guernica: {
    note:
      'Homme grand et robuste, mais sans musculature extravagante. Crâne ' +
      'entièrement ou presque rasé. Visage très large et anguleux. Yeux ' +
      'sévères. Vêtements noirs caractéristiques du Cipher Pol, avec gants et ' +
      'chaussures sombres. Cou épais et épaules relativement larges. ' +
      'Apparence froide et professionnelle.',
    hair: '#2a2a33', cut: 'bald', skin: CLAIR, outfit: '#22222c',
    extras: ['boots', 'gloves'],
    face: 'square',
    eyes: 'sharp',
    brow: 'fierce',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },

  // --- Épiques : Dragons Célestes -------------------------------------------

  roswald: {
    note:
      'Homme noble massif et corpulent. Visage rond, joues épaisses et menton ' +
      'peu prononcé. Cheveux blonds extrêmement volumineux et bouffants. ' +
      'Petits yeux. Peau très claire. Vêtements entièrement blancs et ' +
      'luxueux. Bulle transparente autour de la tête. Beaucoup plus rond que ' +
      'Jalmack.',
    hair: '#e6cf7e', cut: 'wavy', skin: PALE, outfit: '#f0ece2',
    extras: ['high-collar'],
    face: 'round',
    eyes: 'narrow',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  charloss: {
    note:
      'Homme très corpulent, mou et peu athlétique. Visage rond et bouffi, ' +
      'joues lourdes, petit menton. Cheveux blonds très volumineux, bouclés ' +
      'et gonflés autour de la tête. Petits yeux. Peau très claire. Il porte ' +
      'des vêtements immaculés extrêmement luxueux, souvent blancs, et ' +
      'surtout une bulle transparente autour de la tête. Silhouette globale : ' +
      'aristocrate obèse et fragile.',
    hair: '#e6cf7e', cut: 'wavy', skin: PALE, outfit: '#f4f1e8',
    extras: ['high-collar'],
    face: 'round',
    eyes: 'narrow',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  sharlia: {
    note:
      'Jeune femme de la noblesse mondiale. Cheveux blonds volumineux, ' +
      'généralement attachés ou coiffés vers le haut. Visage fin et hautain. ' +
      'Peau très claire. Porte une robe immaculée extrêmement luxueuse. Bulle ' +
      'transparente autour de la tête. Silhouette mince et élégante.',
    hair: '#e6cf7e', cut: 'topknot', skin: PALE, outfit: '#f4f1e8',
    extras: ['high-collar'],
    face: 'sharp',
    brow: 'arched',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  jalmack: {
    note:
      'Homme noble corpulent mais pas gigantesque. Visage long, lèvres ' +
      'épaisses et nez prononcé. Cheveux blonds plaqués. Peau très claire. ' +
      'Porte des vêtements immaculés extrêmement luxueux. Bulle transparente ' +
      'autour de la tête. Silhouette légèrement bedonnante.',
    hair: '#e6cf7e', cut: 'short', skin: PALE, outfit: '#f4f1e8',
    extras: ['high-collar'],
    face: 'long',
    height: 'towering',
    head: 'none', mark: 'none', prop: 'none', build: 'giant',
  },

  // --- Épiques : équipage de Barbe Noire -------------------------------------

  'avalo-pizarro': {
    note:
      'Homme immense et très large, avec une musculature importante et une ' +
      'silhouette lourde. Son visage est extrêmement large, presque carré, ' +
      'avec des joues épaisses et un grand sourire permanent et narquois. ' +
      'Cheveux foncés, longs et volumineux, descendant sur les côtés du ' +
      'visage. Son nez et ses lèvres sont larges. Il porte une tenue ' +
      'rappelant les prisonniers d’Impel Down : vêtements rayés ou très ' +
      'simples, avec une apparence négligée. Son apparence générale est celle ' +
      'd’un criminel massif et arrogant.',
    hair: '#33291f', cut: 'long', skin: CLAIR, outfit: '#3a4250',
    extras: ['striped-suit'],
    face: 'square',
    brow: 'arched',
    height: 'towering',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  'vasco-shot': {
    note:
      'Homme énorme et très corpulent. Crâne rasé. Visage large et fortement ' +
      'rougi, nez volumineux, joues épaisses. Cou massif. Ventre gigantesque. ' +
      'Porte des vêtements très simples et une énorme gourde. Physique lourd ' +
      'et extrêmement massif.',
    hair: '#2a2a33', cut: 'bald', skin: CLAIR, outfit: '#3a4250',
    extras: ['belt'],
    face: 'square',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  rockstar: {
    note:
      'Jeune homme grand, assez mince et athlétique. Cheveux noirs plaqués ' +
      'vers l’arrière. Porte des lunettes teintées. Visage fin. Veste sombre ' +
      'et vêtements de pirate relativement élégants. Sabre à la ceinture. ' +
      'Corps sec et droit.',
    hair: '#1c1c22', cut: 'short', skin: CLAIR, outfit: '#2c2f3a',
    extras: ['belt'],
    face: 'sharp',
    height: 'tall',
    head: 'none', mark: 'shades', prop: 'sword', build: 'slim',
  },

  // --- Épiques : Foxy, Jaya et la mer d’en bas ------------------------------

  porche: {
    note:
      'Jeune femme relativement mince. Cheveux roses très longs, généralement ' +
      'attachés ou relevés. Visage fin et sourire fixe. Porte des vêtements ' +
      'très voyants rappelant un artiste ou une idole de spectacle. Corps ' +
      'féminin assez élancé. Beaucoup d’ornements dans sa tenue.',
    hair: '#e88ab0', cut: 'topknot', skin: CLAIR, outfit: '#c25a8a',
    extras: ['beads'],
    face: 'sharp',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  hamburg: {
    note:
      'Créature anthropomorphe ressemblant à un ours, mais avec une ' +
      'morphologie humanoïde. Très massif et large, avec une fourrure sombre. ' +
      'Museau court, petites oreilles et gros nez. Bras puissants et épaisses ' +
      'jambes. Porte très peu de vêtements, principalement une tenue légère ' +
      'de combat.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    frame: 'bear',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  'montblanc-cricket': {
    note:
      'Homme robuste et assez grand. Torse nu, avec une musculature ' +
      'importante, surtout au niveau des bras et des épaules. Cheveux sombres ' +
      'hérissés. Porte un bandeau autour de la tête. Visage marqué, barbe ' +
      'légère et plusieurs traces de vie en mer. Pantalon et équipement de ' +
      'plongée. Apparence de vieux aventurier très physique.',
    hair: '#2a2a33', cut: 'spiky', skin: CLAIR, outfit: '#3a4250',
    extras: ['bare-chest'],
    height: 'tall',
    head: 'bandana', mark: 'goatee', prop: 'none', build: 'broad',
  },
  masira: {
    note:
      'Homme-singe, ou humanoïde très simiesque. Corps massif recouvert d’un ' +
      'épais pelage brun. Museau clair, nez large et bouche de singe. Bras ' +
      'particulièrement longs et forts. Porte une casquette et une salopette. ' +
      'Ventre relativement volumineux. Apparence globale : gros primate ' +
      'humanoïde.',
    hair: '#6a4326', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    extras: ['belt'],
    head: 'cap', mark: 'none', prop: 'none', build: 'broad',
  },
  'vander-decken-ix': {
    note:
      'Homme-poisson très âgé à l’apparence grotesque. Corps voûté et assez ' +
      'mince. Peau verdâtre. Porte un heaume/casque et une cape sombre. ' +
      'Visage allongé avec caractéristiques de poisson, nez et bouche ' +
      'prononcés. Bras et jambes longs. Apparence de pirate sous-marin ' +
      'vieillissant.',
    hair: '#2a2a33', cut: 'short', skin: '#7fa07a', outfit: '#2c2f3a',
    extras: ['cape'],
    frame: 'fishman',
    face: 'long',
    head: 'horns', mark: 'none', prop: 'none', build: 'slim',
  },
  'edward-weeble': {
    note:
      'Homme extrêmement grand et massivement construit. Corps énorme, bras ' +
      'épais, ventre développé et jambes relativement courtes. Visage ' +
      'étonnamment jeune et enfantin par rapport à son corps. Cheveux blonds ' +
      'rares et irréguliers avec une zone dégarnie sur le haut du crâne. Peau ' +
      'claire. Porte des vêtements de pirate simples et un immense bisento. ' +
      'Silhouette de colosse disproportionné.',
    hair: '#e6cf7e', cut: 'bald', skin: CLAIR, outfit: '#3a4250',
    extras: ['belt'],
    height: 'towering',
    head: 'none', mark: 'none', prop: 'staff', build: 'giant',
  },
  laura: {
    note:
      'Jeune femme assez grande et mince. Cheveux sombres et longs, visage ' +
      'fin. Porte souvent un grand chapeau à large bord. Traits assez doux. ' +
      'Corps féminin et élancé. Vêtements simples de voyage ou de pirate, ' +
      'laissant les bras et jambes relativement libres.',
    hair: '#2a2a33', cut: 'long', skin: CLAIR, outfit: '#3a4250',
    face: 'sharp',
    brow: 'calm',
    height: 'tall',
    head: 'brim', mark: 'none', prop: 'none', build: 'slim',
  },
  margaret: {
    note:
      'Jeune femme grande et athlétique. Cheveux blonds mi-longs, visage fin ' +
      'et peau claire. Bras et jambes bien dessinés mais pas fortement ' +
      'musclés. Porte la tenue légère traditionnelle des Kuja, souvent ' +
      'accompagnée d’un arc et de flèches. Silhouette de combattante agile.',
    hair: '#e6cf7e', cut: 'long', skin: CLAIR, outfit: '#3a4250',
    face: 'sharp',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'gun', build: 'slim',
  },
  coribou: {
    note:
      'Plus petit mais très corpulent que son frère Caribou. Barbe sombre et ' +
      'épaisse. Porte un bonnet et des vêtements évoquant un marin ou un ' +
      'pirate. Visage rond, nez volumineux, dents visibles lors de son ' +
      'sourire. Corps très large et ventre développé. Apparence plus compacte ' +
      'que celle de Caribou.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    extras: ['belt', 'sharp-teeth'],
    face: 'round',
    height: 'short',
    head: 'cap', mark: 'beard', prop: 'none', build: 'broad',
  },
  'demaro-black': {
    note:
      'Homme de taille moyenne, mince et légèrement voûté. Visage maigre, ' +
      'joues creuses et mâchoire asymétrique. Cheveux sombres. Porte un ' +
      'chapeau de paille similaire à celui de Luffy, mais avec une apparence ' +
      'grossièrement imitée. Cardigan rouge et vêtements de pirate ' +
      'ordinaires. Sa silhouette est nettement moins athlétique que celle de ' +
      'Luffy.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    extras: ['face-lines'],
    face: 'long',
    head: 'strawhat', mark: 'none', prop: 'none', build: 'slim',
  },

  // --- Épiques : East Blue et souvenirs d’enfance ---------------------------

  bluejam: {
    note:
      'Pirate grand et robuste, au visage large et marqué. Cheveux bleus très ' +
      'courts et hérissés. Nombreuses cicatrices sur le visage. Regard dur et ' +
      'sourcils épais. Barbe ou duvet facial irrégulier. Porte une longue ' +
      'veste sombre, généralement ouverte sur une tenue de pirate. Deux ' +
      'pistolets complètent sa silhouette. Il a l’apparence d’un pirate ' +
      'brutal et vieillissant.',
    hair: '#3f6bb5', cut: 'spiky', skin: CLAIR, outfit: '#2c2f3a',
    face: 'square',
    eyes: 'sharp',
    brow: 'fierce',
    height: 'tall',
    head: 'none', mark: 'goatee', prop: 'gun', build: 'broad',
  },
  porchemy: {
    note:
      'Homme pirate assez massif. Visage très large et cheveux sombres. Front ' +
      'large, nez imposant et mâchoire puissante. Corps robuste. Porte des ' +
      'gants avec éléments métalliques ou pointes et des vêtements de pirate ' +
      'relativement simples. Bras épais. Apparence de brute de combat.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    extras: ['gloves'],
    face: 'square',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  higuma: {
    note:
      'Homme adulte de corpulence moyenne à forte. Visage dur, nez épais, ' +
      'yeux étroits. Cheveux sombres assez courts. Barbe naissante. Vêtements ' +
      'de bandit simples, sales et robustes. Porte un sabre. Sa silhouette ' +
      'est celle d’un homme habitué à la violence mais pas d’un véritable ' +
      'colosse.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    eyes: 'narrow',
    head: 'none', mark: 'goatee', prop: 'sword', build: 'giant',
  },
  'woop-slap': {
    note:
      'Vieil homme de petite à moyenne taille. Crâne fortement dégarni. Barbe ' +
      'blanche assez volumineuse. Lunettes. Visage rond et ridé. Porte des ' +
      'vêtements simples de maire/villageois. Corps plutôt petit et trapu. ' +
      'Apparence globale de vieux notable de village.',
    hair: '#e9e5da', cut: 'bald', skin: CLAIR, outfit: '#3a4250',
    extras: ['face-lines'],
    face: 'round',
    height: 'short',
    head: 'none', mark: 'glasses', prop: 'none', build: 'broad',
  },
  dogra: {
    note:
      'Petit homme trapu et robuste. Visage rond, front large, nez épais. ' +
      'Cheveux sombres courts et désordonnés. Bras courts mais relativement ' +
      'musclés. Vêtements pauvres et rapiécés. Son corps est compact plutôt ' +
      'qu’élancé.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    face: 'round',
    height: 'short',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  magra: {
    note:
      'Homme mince et assez petit. Visage allongé, cheveux sombres et corps ' +
      'peu musclé. Vêtements très simples et rapiécés. Silhouette de bandit ' +
      'pauvre plutôt que de combattant puissant. Mains et jambes fines.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    face: 'long',
    height: 'short',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  stelly: {
    note:
      'Jeune homme adulte de la noblesse. Cheveux clairs très bouffants. ' +
      'Visage relativement rond mais expression arrogante. Sourcils fins. ' +
      'Porte un costume parfaitement ajusté et très luxueux. Corps mince avec ' +
      'ventre légèrement arrondi.',
    hair: '#d8cbb0', cut: 'wavy', skin: CLAIR, outfit: '#3a4250',
    extras: ['belt'],
    brow: 'arched',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  'outlook-iii': {
    note:
      'Homme noble d’âge mûr. Visage long et sévère. Cheveux blonds très ' +
      'soigneusement plaqués vers l’arrière. Peau claire. Nez long. Corps ' +
      'plutôt mince mais légèrement corpulent au niveau du ventre. Porte un ' +
      'costume immaculé extrêmement luxueux, avec chaussures élégantes et ' +
      'accessoires aristocratiques.',
    hair: '#e6cf7e', cut: 'short', skin: CLAIR, outfit: '#f4f1e8',
    extras: ['boots', 'belt'],
    face: 'long',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  'kozaburo-shimotsuki': {
    note:
      'Vieil homme relativement grand. Crâne fortement dégarni. Très longue ' +
      'barbe blanche, volumineuse, descendant sur la poitrine. Visage ridé, ' +
      'joues creuses et nez important. Porte un tablier de forgeron et des ' +
      'vêtements de travail. Bras et mains épaissis par des décennies de ' +
      'forge. Porte ou travaille régulièrement avec un katana.',
    hair: '#e9e5da', cut: 'bald', skin: CLAIR, outfit: '#3a4250',
    extras: ['face-lines', 'necktie'],
    height: 'tall',
    head: 'none', mark: 'beard', prop: 'sword', build: 'slim',
  },
  merry: {
    note:
      'Homme maigre et assez grand. Visage étroit, nez long et cheveux ' +
      'sombres plaqués. Porte un monocle. Uniforme de majordome très soigné, ' +
      'avec veste, pantalon, chaussures et gants. Corps longiligne et gestes ' +
      'élégants. Apparence d’un serviteur aristocratique.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#3a4250',
    extras: ['boots', 'gloves'],
    face: 'long',
    height: 'tall',
    head: 'none', mark: 'glasses', prop: 'none', build: 'slim',
  },

};

/** Le personnage a-t-il une signature écrite ? */
export function hasSignature(id: string): boolean {
  return Object.hasOwn(SIGNATURES, id);
}

export function signatureOf(id: string): Signature | null {
  return SIGNATURES[id] ?? null;
}
