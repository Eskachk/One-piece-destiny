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
export type Frame =
  | 'human'
  | 'reindeer'
  | 'skeleton'
  | 'fishman'
  | 'bear'
  | 'oni'
  // Les Homies de Big Mom n'ont pas d'anatomie : ce sont un nuage, un orage,
  // une flamme et un bicorne. Dessinés sur le patron humain, ils sortaient
  // quatre petits bonshommes — le contresens le plus visible du jeu.
  | 'homie'
  // Le centaure a quatre membres et un tronc de cheval. Deux jambes ne le
  // rendent pas, quelle que soit la couleur du pantalon.
  | 'centaur';

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
  | 'face-lines'
  // Cinquième série. Napoléon est un bicorne vivant : sa forme **est** son
  // identité, elle ne peut pas être un chapeau posé sur une tête.
  | 'bicorn';

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
      'Avant le Sube Sube no Mi Race : Humaine. Peau : très claire. Cheveux : ' +
      'noirs, extrêmement longs, lisses et abondants. Yeux : petits, sombres. ' +
      'Visage : très rond, grosses joues, nez large et bouche importante. ' +
      'Morphologie : très corpulente, bras épais, ventre large, hanches et ' +
      'cuisses volumineuses. Vêtements : grand manteau de capitaine rouge ' +
      'foncé/brun sombre, vêtements de pirate et accessoires dorés. Arme : ' +
      'énorme massue métallique grise/noire couverte de pointes argentées. ' +
      'Après le Sube Sube no Mi Corps : extrêmement mince et lisse, taille ' +
      'fine, longues jambes et silhouette très élancée. Visage : beaucoup ' +
      'plus fin et régulier. Cheveux/vêtements : restent essentiellement ' +
      'noirs et sombres. Particularité : la peau devient miraculeusement ' +
      'lisse et glissante.',
    hair: '#1c1c24', cut: 'long', skin: PALE, outfit: '#842720',
    extras: ['coat-shoulders'],
    face: 'round',
    eyes: 'narrow',
    head: 'none', mark: 'none', prop: 'club', build: 'broad',
  },
  kuro: {
    note:
      'Race : Humain. Peau : claire. Cheveux : noirs, lisses, plaqués en ' +
      'arrière. Yeux : sombres derrière lunettes rondes. Visage : fin, ' +
      'anguleux. Morphologie : grand, extrêmement mince, bras et jambes ' +
      'longs. Vêtements : costume de majordome noir, chemise blanche, gants ' +
      'blancs, chaussures noires. Arme : griffes métalliques argentées fixées ' +
      'aux doigts. Particularité : mouvement de remise en place de ses ' +
      'lunettes avec la paume.',
    hair: '#1c1c24', cut: 'short', skin: CLAIR, outfit: '#1c1c24',
    extras: ['gloves', 'boots', 'goggles', 'necktie'],
    face: 'sharp',
    height: 'tall',
    head: 'none', mark: 'glasses', prop: 'knives', build: 'slim',
  },
  'krieg-don-krieg': {
    note:
      'Race : Humain. Peau : mate. Cheveux : noirs, très courts et hérissés. ' +
      'Yeux : sombres. Visage : large et agressif. Morphologie : énorme, ' +
      'épaules très larges, bras massifs. Armure : gigantesque armure ' +
      'principalement dorée/jaune métallique, avec parties rouges, noires et ' +
      'argentées. Cape : grande cape principalement noire. Accessoires : ' +
      'nombreuses armes cachées dans l\'armure, épaulières et lance- ' +
      'projectiles. Particularité : son apparence est dominée par ' +
      'l\'équipement plutôt que par le corps nu.',
    hair: '#1c1c24', cut: 'spiky', skin: HALE, outfit: '#c9a33a',
    extras: ['pauldrons'],
    face: 'square',
    brow: 'fierce',
    head: 'none', mark: 'none', prop: 'staff', build: 'broad',
  },
  cabaji: {
    note:
      'Race : Humain. Peau : claire. Cheveux : bleus, coiffés vers l\'arrière ' +
      'avec volume. Yeux : sombres. Visage : fin, souvent partiellement ' +
      'caché. Morphologie : mince, souple, athlétique mais peu musclé. ' +
      'Vêtements : costume d\'acrobate dominant rouge, noir, blanc et bleu, ' +
      'avec écharpe. Accessoires : sabre, accessoires de spectacle et ' +
      'éléments de jonglerie. Particularité : silhouette très flexible et ' +
      'acrobatique.',
    hair: '#3c62a0', cut: 'short', skin: CLAIR, outfit: '#b8362c',
    extras: ['sash', 'necktie'],
    face: 'sharp',
    head: 'none', mark: 'none', prop: 'sword', build: 'slim',
  },
  galdino: {
    note:
      'Race : Humain. Peau : claire. Cheveux : blonds, coiffés en trois ' +
      'grandes pointes. Yeux : petits/dark, parfois cachés par des ' +
      'accessoires. Visage : long, nez pointu. Morphologie : mince, bras et ' +
      'jambes fins. Vêtements : costume clair blanc/crème, avec éléments ' +
      'jaunes, noirs ou dorés. Particularité : créations de cire souvent ' +
      'jaune pâle/crème, utilisées comme armure ou masque.',
    hair: '#e2c978', cut: 'spiky', skin: CLAIR, outfit: '#ffffff',
    extras: ['pauldrons', 'necktie'],
    face: 'long',
    eyes: 'narrow',
    head: 'mask', mark: 'none', prop: 'none', build: 'slim',
  },
  foxy: {
    note:
      'Race : Humain. Peau : claire. Cheveux : violets, hérissés en pointes. ' +
      'Yeux : grands et sombres. Visage : extrêmement caricatural avec nez ' +
      'rouge immense et pointu. Morphologie : grand mais mou, relativement ' +
      'peu musclé. Vêtements : longue cape rouge/violette, vêtements jaune, ' +
      'violet, blanc et noir selon les pièces. Particularité : nez rouge ' +
      'disproportionné et forte esthétique de spectacle.',
    hair: '#744c9c', cut: 'spiky', skin: CLAIR, outfit: '#b8362c',
    extras: ['cape'],
    face: 'sharp',
    eyes: 'wide',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  hogback: {
    note:
      'Race : Humain. Peau : très claire/pâle. Cheveux : noirs, plaqués vers ' +
      'l\'arrière. Yeux : sombres. Visage : gros crâne, menton et mâchoire ' +
      'extrêmement allongés. Morphologie : corps relativement petit et mince ' +
      'comparé à la tête. Vêtements : blouse de chirurgien blanche, vêtements ' +
      'et gants blancs/noirs. Accessoires : instruments chirurgicaux. ' +
      'Particularité : apparence de médecin fou caricatural.',
    hair: '#1c1c24', cut: 'short', skin: PALE, outfit: '#f0ece2',
    extras: ['gloves'],
    face: 'long',
    height: 'short',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  absalom: {
    note:
      'Race/espèce : Humain, lourdement modifié chirurgicalement. Carnation : ' +
      'peau claire/beige. Cheveux : blancs, très longs, extrêmement épais et ' +
      'hérissés ; ils forment une véritable crinière autour du crâne. Yeux : ' +
      'sombres, relativement petits ; regard agressif. Visage : très large et ' +
      'fortement animalisé ; nez/museau rappelant un lion, bouche énorme, ' +
      'dents visibles et mâchoire puissante. Morphologie : très grand, ' +
      'épaules gigantesques, torse énorme, bras épais et jambes lourdes ; ' +
      'physique de colosse. Vêtements : long manteau noir ou brun très ' +
      'sombre, vêtements sombres dessous, pantalon sombre et chaussures ' +
      'lourdes. Accessoires/armes : armes de feu et équipement de combat ' +
      'selon les scènes. Particularités : nombreuses cicatrices et sutures ' +
      'liées aux greffes de Hogback ; apparence volontairement proche d\'un ' +
      'lion humanoïde.',
    hair: '#f0ece2', cut: 'spiky', skin: CLAIR, outfit: '#1c1c24',
    extras: ['boots', 'stitches', 'coat-shoulders', 'belt'],
    face: 'square',
    eyes: 'narrow',
    brow: 'fierce',
    height: 'towering',
    head: 'none', mark: 'scar-face', prop: 'none', build: 'giant',
  },
  bepo: {
    note:
      'Race : Mink / ours polaire anthropomorphe. Fourrure : entièrement ' +
      'blanche, très dense et épaisse. Yeux : noirs/dark. Visage : museau ' +
      'd\'ours, nez noir, petites oreilles rondes, grandes joues de fourrure. ' +
      'Morphologie : corps humanoïde, épaules et bras puissants, ventre ' +
      'légèrement arrondi, pieds larges. Vêtements : combinaison de Heart ' +
      'Pirates principalement orange, avec parties noires/blanches et parfois ' +
      'un col sombre. Particularités : oreilles rondes, pattes couvertes de ' +
      'fourrure, apparence très douce malgré ses capacités de combat.',
    hair: '#f0ece2', cut: 'short', skin: CLAIR, outfit: '#db7c2c',
    extras: ['fur-collar'],
    frame: 'bear',
    face: 'round',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  'jean-bart': {
    note:
      'Race : Humain. Peau : mate/brune. Cheveux : crâne rasé. Barbe : ' +
      'énorme, dense, noire. Yeux : sombres. Visage : gigantesque, joues et ' +
      'mâchoire massives, plusieurs cicatrices. Morphologie : véritable ' +
      'colosse, torse gigantesque et bras extrêmement épais. Vêtements : ' +
      'souvent torse nu ou presque ; pantalon/ceinture sombres. Particularité ' +
      ': apparence de montagne humaine.',
    hair: '#2a2a33', cut: 'bald', skin: HALE, outfit: '#3a4250',
    extras: ['bare-chest', 'belt'],
    height: 'towering',
    head: 'none', mark: 'scar-face', prop: 'none', build: 'giant',
  },
  shiki: {
    note:
      'Race : Humain. Peau : mate. Cheveux : blonds pâles/blancs, extrêmement ' +
      'volumineux et dressés. Yeux : sombres. Visage : large, moustache ' +
      'importante. Particularité : gouvernail brun/doré planté dans le crâne. ' +
      'Morphologie : grand et très robuste. Vêtements : long manteau ' +
      'doré/jaune, noir et rouge, vêtements de pirate. Jambes : remplacées ' +
      'par deux sabres/lames argentées.',
    hair: '#e2c978', cut: 'spiky', skin: HALE, outfit: '#c9a33a',
    extras: ['coat-shoulders'],
    face: 'square',
    height: 'tall',
    head: 'none', mark: 'moustache', prop: 'none', build: 'broad',
  },
  caribou: {
    note:
      'Race : Humain. Peau : pâle. Cheveux : longs noirs, en dreadlocks ' +
      'épaisses. Yeux : petits et sombres. Visage : long, sourire très large ' +
      'et inquiétant, dents visibles. Morphologie : grand, mince, légèrement ' +
      'voûté. Vêtements : ensemble sombre noir/brun, manteau ou veste lourde. ' +
      'Armes : pistolets principalement noirs et métalliques. Particularités ' +
      ': expression figée et aspect macabre.',
    hair: '#1c1c24', cut: 'long', skin: PALE, outfit: '#141419',
    extras: ['coat-shoulders'],
    face: 'long',
    eyes: 'narrow',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'gun', build: 'slim',
  },
  'ficher-tiger': {
    note:
      'Race : Homme-poisson, tigre. Peau : rouge-orangée, couverte de rayures ' +
      'noires. Cheveux : très courts ou crête sombres. Yeux : jaunes/dorés ou ' +
      'très sombres selon les représentations. Visage : tête de tigre ' +
      'humanoïde, museau large, dents acérées, oreilles félines. Morphologie ' +
      ': immense, extrêmement musclé, torse massif, épaules énormes. ' +
      'Vêtements : principalement torse nu, pantalon de pirate sombre et ' +
      'ceinture. Accessoires : tatouages bleus/noirs ou motifs de l\'équipage ' +
      'selon les scènes. Particularité : rayures et traits félins présents ' +
      'sur tout le corps.',
    hair: '#2a2620', cut: 'mohawk', skin: '#4a2c1a', outfit: '#3a4250',
    extras: ['bare-chest', 'belt', 'striped-suit', 'arm-tattoo'],
    frame: 'fishman',
    face: 'square',
    height: 'towering',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  aladdin: {
    note:
      'Race/espèce : Homme-poisson de type raie/manta. Peau : claire, avec ' +
      'caractéristiques de poisson sur le visage et les membres. Cheveux : ' +
      'noirs, relativement courts et épais. Yeux : sombres, étroits. Visage : ' +
      'large, traits aplatis, nez/structure faciale rappelant une raie ; très ' +
      'grande barbe. Barbe : longue, noire, épaisse et couvrant largement la ' +
      'mâchoire et le menton. Morphologie : grand, robuste, épaules larges, ' +
      'bras musclés et corps puissant de combattant. Vêtements : tenue de ' +
      'médecin de bord ; vêtements pratiques, principalement clairs/blancs ' +
      'avec éléments plus sombres et accessoires médicaux. Accessoires : ' +
      'matériel de médecin. Particularités : caractéristiques aquatiques ' +
      'visibles autour des bras et de la tête ; apparence clairement non ' +
      'humaine.',
    hair: '#1c1c24', cut: 'short', skin: CLAIR, outfit: '#f0ece2',
    frame: 'fishman',
    face: 'square',
    eyes: 'narrow',
    height: 'tall',
    head: 'none', mark: 'beard', prop: 'none', build: 'broad',
  },
  'ben-beckmann': {
    note:
      'Race : Humain. Peau : claire à légèrement mate. Cheveux : gris, épais, ' +
      'mi-longs, tirés vers l\'arrière. Yeux : sombres, étroits. Visage : ' +
      'allongé, mâchoire forte, barbe courte grisâtre/brune. Morphologie : ' +
      'grand, robuste, épaules assez larges, physique mature mais pas ' +
      'bodybuildé. Vêtements : gilet/chemise sans manches brun foncé/noir, ' +
      'pantalon sombre et long manteau sombre/beige foncé selon les ' +
      'apparitions. Accessoires : cigarette presque toujours présente ; fusil ' +
      'long. Particularités : rides autour des yeux, air calme et très ' +
      'sérieux.',
    hair: '#8a8e96', cut: 'long', skin: CLAIR, outfit: '#d8c4a4', coat: '#978973',
    extras: ['open-vest', 'face-lines', 'coat-shoulders', 'necktie'],
    face: 'long',
    eyes: 'narrow',
    height: 'tall',
    head: 'none', mark: 'cigarette', prop: 'gun', build: 'broad',
  },
  yassop: {
    note:
      'Race : Humain. Peau : mate. Cheveux : blonds, extrêmement longs et en ' +
      'dreadlocks. Yeux : sombres. Visage : allongé, nez fort, barbe légère. ' +
      'Morphologie : grand, mince mais athlétique, bras adaptés au tir. ' +
      'Vêtements : vêtements de tireur principalement brun, vert, noir et ' +
      'beige, accessoires de cuir. Arme : énorme fusil brun/noir/métal.',
    hair: '#e2c978', cut: 'long', skin: HALE, outfit: '#6a462a',
    face: 'long',
    height: 'tall',
    head: 'none', mark: 'beard', prop: 'gun', build: 'slim',
  },
  'lucky-roo': {
    note:
      'Race : Humain. Peau : claire. Cheveux : peu visibles sous chapeau. ' +
      'Yeux : petits/sombres. Visage : rond, joues très pleines. Morphologie ' +
      ': extrêmement corpulent, ventre gigantesque, jambes courtes en ' +
      'apparence. Vêtements : vêtements généralement verts, avec brun, blanc ' +
      'et beige. Chapeau : large, souvent brun/crème. Particularité : ' +
      'toujours associé à la nourriture et à sa silhouette ronde.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#4f8648',
    face: 'round',
    eyes: 'narrow',
    height: 'towering',
    head: 'none', mark: 'none', prop: 'none', build: 'giant',
  },
  'charlotte-cracker': {
    note:
      'Race : Humain. Peau : claire. Cheveux : rose, dressés en pointes. Yeux ' +
      ': bleus ou très clairs dans les palettes animées. Visage : fin et ' +
      'souriant. Morphologie réelle : très mince, ventre plat, muscles ' +
      'modérés. Armure : grande armure beige clair/ivoire, avec plaques ' +
      'métalliques dorées et brunes. Bouclier : énorme, principalement ' +
      'marron/bois et métal doré. Particularité : l\'apparence de colosse est ' +
      'fortement renforcée par l\'armure et ses soldats-biscuits.',
    hair: '#e08aae', cut: 'spiky', skin: CLAIR, outfit: '#ffefc8',
    extras: ['pauldrons'],
    face: 'sharp',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  'charlotte-smoothie': {
    note:
      'Race : Humaine. Peau : claire. Cheveux : très longs, blond ' +
      'clair/crème, lisses. Yeux : sombres, longs. Visage : très fin et ' +
      'allongé. Morphologie : gigantesque, très grande, taille fine, longues ' +
      'jambes, poitrine développée. Vêtements : tenue principalement violet ' +
      'foncé/noir, manteau/cape claire et bottes hautes noires. Arme : énorme ' +
      'sabre gris métallique. Particularité : proportions extrêmement ' +
      'élancées et élégantes.',
    hair: '#efe7d8', cut: 'long', skin: CLAIR, outfit: '#543770', coat: '#1c1c24',
    extras: ['cape', 'boots', 'coat-shoulders'],
    face: 'long',
    height: 'towering',
    head: 'none', mark: 'none', prop: 'greatsword', build: 'giant',
  },
  'charlotte-dent-de-chien': {
    note:
      'Homme extrêmement grand et musclé, silhouette en V, près de trois fois ' +
      'la taille de Luffy. Cheveux magenta sombre, courts et hérissés vers ' +
      'l’arrière. Deux cicatrices symétriques aux commissures ; la bouche, ' +
      'habituellement couverte, porte des dents très pointues. Regard dur, ' +
      'sourcils froncés. Immense col de fourrure rayé blanc et noir couvrant ' +
      'les épaules. Veste noire en cuir sans manches, ouverte sur un maillot ' +
      'à rayures verticales roses et rouges laissant voir les abdominaux. ' +
      'Gants sombres, large ceinture cloutée à boucle ronde, pantalon noir. ' +
      'Sangles cloutées et genouillères à pointes sur la jambe droite, ' +
      'bracelets à pointes au poignet gauche, bottes à éperons. Tatouage rose ' +
      'sur le bras gauche. Arme : une longue lance à trois pointes, hampe ' +
      'brun sombre et fer clair.',
    hair: '#7e3358', cut: 'spiky', skin: HALE, outfit: '#d1476e',
    coat: '#1c1c22',
    trousers: '#17171c',
    accessory: '#efe9dc',
    extras: ['fur-collar', 'bare-chest', 'belt', 'boots'],
    face: 'sharp',
    eyes: 'sharp',
    brow: 'fierce',
    height: 'towering',
    head: 'none', mark: 'scar-face', prop: 'staff', build: 'broad',
  },
  'charlotte-brulee': {
    note:
      'Race : Humaine. Peau : claire. Cheveux : violets, très longs et ' +
      'volumineux. Yeux : sombres. Visage : très déformé ; nez long, lèvres ' +
      'épaisses et grande cicatrice traversant le visage. Morphologie : ' +
      'grande, mince, membres fins. Vêtements : vêtements/robe principalement ' +
      'violet foncé, noir et rouge sombre. Particularité : cicatrice faciale ' +
      'extrêmement visible, aspect de sorcière.',
    hair: '#744c9c', cut: 'long', skin: CLAIR, outfit: '#744c9c',
    extras: ['high-collar'],
    face: 'long',
    brow: 'fierce',
    height: 'tall',
    head: 'none', mark: 'scar-face', prop: 'none', build: 'slim',
  },
  'charlotte-pudding': {
    note:
      'Race : Humaine, troisième œil. Peau : très claire. Cheveux : châtains, ' +
      'longs, lisses, souvent devant un œil. Yeux : grands, sombres. ' +
      'Troisième œil : au centre du front ; couleur/forme sombre typique de ' +
      'son design. Visage : fin, petit nez, lèvres délicates. Morphologie : ' +
      'petite à moyenne, mince et féminine. Vêtements : robes élégantes ' +
      'principalement crème, blanc cassé, rose pâle ou violet pâle, avec ' +
      'accessoires de mode. Particularité : son troisième œil est presque ' +
      'toujours masqué par la frange.',
    hair: '#7d5633', cut: 'long', skin: PALE, outfit: '#efe7d8',
    extras: ['high-collar'],
    face: 'sharp',
    eyes: 'wide',
    height: 'short',
    head: 'mask', mark: 'none', prop: 'none', build: 'slim',
  },
  pekoms: {
    note:
      'Race : Mink, lion/tortue hybride visuelle. Fourrure : brun ' +
      'clair/orange, très dense autour de la tête. Crinière : épaisse, brun ' +
      'foncé. Visage : tête de lion, museau clair, nez noir, grandes dents ' +
      'blanches. Yeux : sombres. Morphologie : grand, très musclé, torse ' +
      'large. Vêtements : vêtements de pirate dominés par bleu foncé, noir, ' +
      'jaune/or et brun. Carapace : grosse carapace de tortue verte/brun-vert ' +
      'dans le dos. Particularité : mélange très net de lion anthropomorphe ' +
      'et d\'éléments de tortue.',
    hair: '#815533', cut: 'short', skin: CLAIR, outfit: '#2b4773',
    frame: 'bear',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  'page-one': {
    note:
      'Race : Humain, Zoan antique. Peau : claire. Cheveux : noirs, courts. ' +
      'Yeux : sombres. Visage : anguleux et fermé. Morphologie : grand, ' +
      'athlétique, épaules larges. Vêtements : veste sombre principalement ' +
      'noire/bleu très foncé, pantalon sombre. Forme Zoan : Spinosaurus avec ' +
      'peau bleu-vert, ventre clair, grandes dents blanches, crête dorsale ' +
      'sombre et longue queue.',
    hair: '#1c1c24', cut: 'short', skin: CLAIR, outfit: '#141419',
    extras: ['belt'],
    face: 'sharp',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  ulti: {
    note:
      'Race : Humaine, Zoan antique. Peau : claire. Cheveux : très longs, ' +
      'mélange rose vif et bleu clair, épais. Yeux : grands, sombres. Visage ' +
      ': fin et jeune. Morphologie : grande, mince mais athlétique, longues ' +
      'jambes. Cornes : grandes cornes blanches/ivoire. Vêtements : tenue ' +
      'courte principalement bleu clair, rose, blanc et noir, avec bottes. ' +
      'Forme Zoan : Pachycéphalosaure à peau bleu-violet/rose, ventre clair, ' +
      'énorme crâne.',
    hair: '#e08aae', cut: 'long', skin: CLAIR, outfit: '#4978c3',
    extras: ['boots', 'tusks'],
    face: 'sharp',
    eyes: 'wide',
    height: 'tall',
    head: 'horns', mark: 'none', prop: 'none', build: 'slim',
  },
  'black-maria': {
    note:
      'Race : Humaine / Zoan antique (Kumo Kumo no Mi, modèle Rosamygale ' +
      'grauvogeli). Peau : claire. Cheveux : noirs, extrêmement longs, épais ' +
      'et ondulés. Yeux : sombres, maquillage prononcé. Visage : long et très ' +
      'féminin, grands yeux étirés, lèvres colorées. Morphologie : ' +
      'gigantesque, très grande, jambes longues, taille relativement fine, ' +
      'poitrine et hanches très développées. Vêtements : kimono ' +
      'principalement violet/rose foncé/noir selon les scènes, très ouvert au ' +
      'niveau du torse et des jambes ; ornements dorés/rouges. Accessoire : ' +
      'ombrelle/parasol principalement violet avec décoration. Forme hybride ' +
      ': énorme partie arachnide avec plusieurs pattes sombres, abdomen très ' +
      'volumineux et éléments de toile. Particularité : une des silhouettes ' +
      'féminines les plus gigantesques de l\'équipage de Kaido.',
    hair: '#1c1c24', cut: 'wavy', skin: CLAIR, outfit: '#744c9c',
    extras: ['open-vest', 'sash'],
    face: 'long',
    height: 'towering',
    head: 'none', mark: 'none', prop: 'staff', build: 'giant',
  },
  fukurokuju: {
    note:
      'Race : Humain. Peau : claire. Cheveux : noirs, très longs, tombant ' +
      'dans le dos. Yeux : sombres. Visage : front gigantesque, crâne très ' +
      'allongé, visage mince. Morphologie : grand, extrêmement mince, bras et ' +
      'jambes fins. Vêtements : grand costume de ninja/Onibawanshu ' +
      'principalement noir, violet foncé et rouge, avec motifs traditionnels. ' +
      'Particularité : front gigantesque, élément immédiatement ' +
      'reconnaissable.',
    hair: '#1c1c24', cut: 'long', skin: CLAIR, outfit: '#744c9c',
    extras: ['necktie'],
    face: 'long',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  'jesus-burgess': {
    note:
      'Race : Humain. Peau : mate/brune. Cheveux : noirs, crâne partiellement ' +
      'dégarni. Yeux : sombres. Visage : très large, grosse moustache et nez ' +
      'important. Morphologie : gigantesque et bodybuildé, bras et épaules ' +
      'énormes. Vêtements : souvent torse nu ; pantalon de lutteur ' +
      'rouge/bleu/noir selon les apparitions. Masque : masque de catcheur ' +
      'principalement bleu/noir/jaune selon les détails. Particularité : ' +
      'silhouette de champion de lutte.',
    hair: '#1c1c24', cut: 'bald', skin: HALE, outfit: '#b8362c',
    extras: ['bare-chest', 'belt'],
    face: 'square',
    height: 'towering',
    head: 'mask', mark: 'moustache', prop: 'none', build: 'giant',
  },
  shiliew: {
    note:
      'Race : Humain. Peau : claire. Cheveux : noirs. Barbe : noire. Yeux : ' +
      'sombres. Visage : anguleux, cicatrices. Morphologie : grand, sec et ' +
      'musclé. Vêtements : uniforme de geôlier principalement violet très ' +
      'foncé/noir, manteau sombre. Arme : sabre argenté/noir.',
    hair: '#1c1c24', cut: 'short', skin: CLAIR, outfit: '#402a56',
    extras: ['coat-shoulders', 'epaulettes'],
    face: 'sharp',
    height: 'tall',
    head: 'none', mark: 'scar-face', prop: 'sword', build: 'slim',
  },
  'van-auger': {
    note:
      'Race : Humain. Peau : claire. Cheveux : noirs, longs et lisses. Yeux : ' +
      'derrière petites lunettes rondes. Visage : très étroit. Morphologie : ' +
      'immense et très mince, longs bras/jambes. Vêtements : long manteau ' +
      'principalement noir/brun foncé, pantalon sombre. Arme : très long ' +
      'fusil de précision marron/noir/métal argenté.',
    hair: '#1c1c24', cut: 'long', skin: CLAIR, outfit: '#1c1c24',
    extras: ['coat-shoulders', 'belt'],
    face: 'long',
    eyes: 'narrow',
    height: 'towering',
    head: 'none', mark: 'none', prop: 'gun', build: 'slim',
  },
  lafitte: {
    note:
      'Race : Humain avec pouvoir permettant une forme ailée. Peau : ' +
      'extrêmement pâle. Cheveux : blancs, longs et lisses. Yeux : petits, ' +
      'sombres. Visage : étroit, lèvres fines. Morphologie : très grand, très ' +
      'mince, bras et jambes longs. Vêtements : costume de gentleman ' +
      'blanc/ivoire, gilet et pantalon clairs, manteau sombre. Chapeau : ' +
      'haut-de-forme principalement blanc/crème. Accessoire : canne sombre. ' +
      'Forme ailée : grandes ailes blanches dans le dos.',
    hair: '#f0ece2', cut: 'long', skin: PALE, outfit: '#f0ece2',
    extras: ['wings', 'coat-shoulders', 'necktie', 'belt'],
    face: 'long',
    eyes: 'narrow',
    height: 'tall',
    head: 'tophat', mark: 'none', prop: 'cane', build: 'slim',
  },
  'catarina-devon': {
    note:
      'Race : Humaine, utilisatrice d\'un Zoan mythique. Peau : claire. ' +
      'Cheveux : blonds, longs et volumineux. Yeux : sombres. Visage : long, ' +
      'nez prononcé, lèvres fines, dents pointues visibles dans le sourire. ' +
      'Morphologie : grande et mince, membres longs. Vêtements : tenue ' +
      'principalement sombre/noire, longue jupe ou robe et accessoires de ' +
      'pirate. Particularité : aspect de sorcière/criminelle ; forme animale ' +
      'associée au renard à neuf queues.',
    hair: '#e2c978', cut: 'long', skin: CLAIR, outfit: '#141419',
    extras: ['high-collar'],
    face: 'long',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  'sanjuan-wolf': {
    note:
      'Race : Géant immense. Peau : claire/rosée. Cheveux : noirs/dark brown. ' +
      'Yeux : sombres. Visage : très large. Morphologie : colossal, plus ' +
      'grand que presque tout autre personnage humain/giant connu, corps ' +
      'massif et voûté. Vêtements : vêtements très simples, principalement ' +
      'brun, gris, beige.',
    hair: '#1c1c24', cut: 'short', skin: CLAIR, outfit: '#d8c4a4',
    face: 'square',
    height: 'towering',
    head: 'none', mark: 'none', prop: 'none', build: 'giant',
  },
  'doc-q': {
    note:
      'Race : Humain. Peau : très pâle. Cheveux : noirs, extrêmement longs et ' +
      'raides. Yeux : sombres, avec énormes cernes. Visage : émacié, joues ' +
      'creuses, nez fin, lèvres pâles. Morphologie : extrêmement maigre, bras ' +
      'et jambes presque squelettiques. Vêtements : longue blouse de médecin ' +
      'blanche/beige sale, vêtements dessous sombres. Arme : grande faux gris ' +
      'métallique. Particularités : apparence maladive et presque ' +
      'cadavérique, présence constante du cheval Stronger.',
    hair: '#1c1c24', cut: 'long', skin: '#f8e3d0', outfit: '#f0ece2',
    face: 'long',
    head: 'none', mark: 'none', prop: 'staff', build: 'slim',
  },
  kuroobi: {
    note:
      'Race : Homme-poisson, raie. Peau : claire avec teinte aquatique. ' +
      'Cheveux : noirs, courts et tirés en arrière. Yeux : sombres. Visage : ' +
      'large et aplati, traits de raie. Morphologie : très musclé, torse ' +
      'large, bras et épaules énormes. Vêtements : pantalon de karaté ' +
      'principalement noir, ceinture et détails de combat blancs. ' +
      'Particularité : apparence d\'athlète spécialisé dans le karaté homme- ' +
      'poisson.',
    hair: '#1c1c24', cut: 'short', skin: CLAIR, outfit: '#1c1c24',
    extras: ['belt'],
    frame: 'fishman',
    face: 'square',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  'diamond-joz': {
    note:
      'Race : Humain. Peau : très mate/brune. Cheveux : rasés. Yeux : petits, ' +
      'foncés. Visage : énorme, mâchoire puissante. Morphologie : véritable ' +
      'colosse musculaire : torse énorme, épaules gigantesques, bras massifs. ' +
      'Vêtements : souvent torse nu ou avec éléments très légers ; pantalon ' +
      'sombre et accessoires de pirate. Fruit : corps transformable en ' +
      'diamant blanc/translucide, extrêmement réfléchissant. Particularité : ' +
      'quand transformé, les surfaces corporelles deviennent brillantes et ' +
      'facettées comme une pierre précieuse.',
    hair: '#2a2a33', cut: 'bald', skin: HALE, outfit: '#3a4250',
    extras: ['bare-chest', 'belt'],
    eyes: 'narrow',
    height: 'towering',
    head: 'none', mark: 'none', prop: 'none', build: 'giant',
  },
  vista: {
    note:
      'Race : Humain. Peau : mate. Cheveux : sombres. Yeux : sombres. Visage ' +
      ': fin avec grande moustache en guidon. Morphologie : grand, athlétique ' +
      'et élégant. Vêtements : manteau de pirate principalement bleu foncé, ' +
      'violet, rouge et blanc, motifs floraux. Chapeau : large bord, tons ' +
      'brun/noir, décorations. Armes : deux sabres argentés. Particularité : ' +
      'roses/fleurs associées à son design.',
    hair: '#2a2620', cut: 'short', skin: HALE, outfit: '#2b4773',
    extras: ['coat-shoulders'],
    face: 'sharp',
    height: 'tall',
    head: 'brim', mark: 'moustache', prop: 'sword', build: 'slim',
  },
  izou: {
    note:
      'Race : Humain. Peau : claire. Cheveux : noirs, longs, ' +
      'relevés/attachés. Yeux : foncés, souvent accentués par maquillage. ' +
      'Visage : fin, traits androgynes. Maquillage : style kabuki avec rouge ' +
      'et blanc autour des yeux/lèvres. Morphologie : mince et élégante. ' +
      'Vêtements : kimono principalement blanc/crème, avec rouge, bleu, noir ' +
      'et motifs floraux. Armes : deux pistolets noir/métal argenté.',
    hair: '#1c1c24', cut: 'ponytail', skin: CLAIR, outfit: '#f0ece2',
    extras: ['sash'],
    face: 'sharp',
    head: 'none', mark: 'none', prop: 'gun', build: 'slim',
  },
  'hody-jones': {
    note:
      'Race : Homme-poisson, grand requin blanc. Peau : bleu-gris. Cheveux : ' +
      'blancs, hérissés vers l\'arrière. Yeux : petits, sombres/rouges selon ' +
      'scènes. Visage : énorme mâchoire de requin, nez aplati, dents ' +
      'triangulaires. Morphologie : gigantesque, extrêmement musclé, épaules ' +
      'énormes. Vêtements : tenue de pirate principalement blanc cassé, bleu ' +
      'très sombre, noir et rouge. Particularité : dents en scie sur ' +
      'plusieurs rangées et silhouette de requin humanoïde.',
    hair: '#f0ece2', cut: 'spiky', skin: '#8a8e96', outfit: '#f0ece2',
    extras: ['sharp-teeth'],
    frame: 'fishman',
    eyes: 'narrow',
    height: 'towering',
    head: 'none', mark: 'none', prop: 'none', build: 'giant',
  },
  trebol: {
    note:
      'Race : Humain. Peau : très claire. Cheveux : peu visibles. Yeux : ' +
      'derrière grandes lunettes noires. Visage : long, nez extrêmement ' +
      'imposant. Morphologie : très particulier ; son pouvoir et sa ' +
      'silhouette donnent l\'impression d\'un énorme corps informe. Vêtements ' +
      ': immense manteau principalement vert, avec intérieur et détails ' +
      'jaune/orange. Particularité : mucus abondant autour du nez et de la ' +
      'bouche.',
    hair: '#2a2a33', cut: 'short', skin: PALE, outfit: '#4f8648',
    extras: ['coat-shoulders'],
    face: 'long',
    eyes: 'wide',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  diamante: {
    note:
      'Race : Humain. Peau : claire. Cheveux : blonds, ondulés, volumineux. ' +
      'Yeux : sombres. Visage : fin, nez long. Morphologie : grand et ' +
      'extrêmement élancé. Vêtements : cape rouge, tenue de gladiateur ' +
      'souvent bleu clair, rouge et blanc, éléments métalliques ' +
      'dorés/argentés. Chapeau : tricorne principalement noir/brun, avec ' +
      'plume claire/rouge selon les scènes. Arme : sabre/épée. Particularité ' +
      ': esthétique de torero et de gladiateur.',
    hair: '#e2c978', cut: 'wavy', skin: CLAIR, outfit: '#b8362c',
    extras: ['feather-coat', 'cape'],
    face: 'long',
    height: 'tall',
    head: 'tricorne', mark: 'none', prop: 'sword', build: 'slim',
  },
  pica: {
    note:
      'Race : Humain / fruit de la pierre. Peau : claire dans sa forme ' +
      'humaine. Cheveux : noirs, courts. Yeux : sombres. Visage : ' +
      'relativement fin malgré le corps extrêmement imposant. Morphologie ' +
      'humaine : déjà gigantesque et musclée. Vêtements : uniforme/costume ' +
      'principalement noir, violet foncé et gris. Forme de pierre : corps de ' +
      'roche gris/beige, énorme, avec visage géant intégré à la pierre.',
    hair: '#1c1c24', cut: 'short', skin: CLAIR, outfit: '#744c9c',
    extras: ['necktie', 'epaulettes'],
    face: 'sharp',
    height: 'towering',
    head: 'none', mark: 'none', prop: 'none', build: 'giant',
  },
  vergo: {
    note:
      'Race : Humain. Peau : claire à mate. Cheveux : noirs, courts. Yeux : ' +
      'cachés derrière lunettes de soleil noires. Visage : carré et ferme. ' +
      'Morphologie : grand, épaules larges, musculature importante. Vêtements ' +
      ': costume/manteau principalement violet foncé, noir ou blanc cassé ' +
      'selon les scènes. Arme : long bambou brun/vert pâle. Particularité : ' +
      'morceaux de nourriture collés sur le visage ou le corps dans plusieurs ' +
      'scènes comiques.',
    hair: '#1c1c24', cut: 'short', skin: CLAIR, outfit: '#744c9c', coat: '#543770',
    extras: ['coat-shoulders', 'necktie'],
    face: 'square',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'staff', build: 'broad',
  },
  sugar: {
    note:
      'Race : Humaine dont l\'apparence reste celle d\'une petite fille à ' +
      'cause du Hobi Hobi no Mi. Peau : très pâle. Cheveux : noirs, ' +
      'extrêmement longs. Yeux : grands et sombres. Visage : enfantin, petit ' +
      'nez et joues fines. Morphologie : très petite, très mince. Vêtements : ' +
      'robe principalement rouge foncé/noire, collants et chaussures sombres. ' +
      'Accessoire : grappes de raisin vert/violet selon les scènes. ' +
      'Particularité : apparence physique d\'enfant malgré son âge réel.',
    hair: '#1c1c24', cut: 'long', skin: '#f8e3d0', outfit: '#842720',
    extras: ['boots', 'high-collar'],
    face: 'sharp',
    eyes: 'wide',
    height: 'short',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  'senor-pink': {
    note:
      'Race : Humain. Peau : claire à mate. Cheveux : peu visibles à cause du ' +
      'bonnet/casque. Yeux : sombres. Visage : large, nez massif, barbe ' +
      'courte. Morphologie : très musclé, carrure de docker. Vêtements : ' +
      'costume de bébé rose, bleu clair et blanc, bonnet assorti. Accessoire ' +
      ': tétine jaune/orange. Particularité : cigarette malgré les vêtements ' +
      'de nourrisson.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#e08aae',
    extras: ['necktie'],
    face: 'square',
    head: 'cap', mark: 'cigarette', prop: 'none', build: 'broad',
  },
  monet: {
    note:
      'Race : Humaine / harpie par modification de corps et pouvoir. Peau : ' +
      'claire. Cheveux : verts, très longs et lisses. Yeux : sombres/verts ' +
      'selon les palettes. Visage : fin, calme. Morphologie humaine : grande, ' +
      'mince. Vêtements : tenue sombre principalement noire, verte et ' +
      'blanche, avec accessoires d\'hiver. Forme harpie : ailes couvertes de ' +
      'plumes vertes/blanches ou brunes, jambes transformées en serres ' +
      'jaunes. Particularité : énorme contraste entre silhouette féminine et ' +
      'anatomie d\'oiseau. -- N — R',
    hair: '#4f8648', cut: 'long', skin: CLAIR, outfit: '#141419',
    face: 'sharp',
    brow: 'calm',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  kaku: {
    note:
      'Race : Humain, Zoan girafe. Peau : claire. Cheveux : blond clair, ' +
      'courts. Yeux : sombres. Visage : nez carré extrêmement grand. ' +
      'Morphologie : grand, mince, longues jambes. Vêtements : costume ' +
      'd\'agent principalement noir, chemise blanche, cravate/accessoires ' +
      'bleus ou sombres. Accessoire : casquette de débardeur/manœuvre dans ' +
      'certaines périodes. Armes : deux sabres. Forme Zoan : cou immensément ' +
      'long, tête de girafe brune/beige, motifs brun foncé sur le corps.',
    hair: '#fff592', cut: 'short', skin: CLAIR, outfit: '#1c1c24',
    extras: ['necktie'],
    face: 'square',
    height: 'tall',
    head: 'cap', mark: 'none', prop: 'sword', build: 'slim',
  },
  spandam: {
    note:
      'Race : Humain. Peau : claire. Cheveux : bruns, relativement longs. ' +
      'Yeux : sombres, souvent cachés. Visage : partiellement masqué ; nez et ' +
      'bouche couverts. Morphologie : grand mais mince et peu musclé. ' +
      'Vêtements : tenue du Cipher Pol principalement bleu marine/noir, cape ' +
      'sombre. Masque : métal gris/argenté.',
    hair: '#6a462a', cut: 'long', skin: CLAIR, outfit: '#253760',
    extras: ['cape'],
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  hannyabal: {
    note:
      'Race : Humain. Peau : claire. Cheveux : sombres. Yeux : petits, ' +
      'sombres. Visage : traits de masque Hannya, apparence démoniaque. ' +
      'Morphologie : très grand et longiligne, bras et jambes longs. ' +
      'Vêtements : tenue d\'Impel Down dominée par rouge, noir et or. ' +
      'Particularité : cornes et visage inspirés d\'un démon japonais.',
    hair: '#2a2620', cut: 'short', skin: CLAIR, outfit: '#b8362c',
    extras: ['tusks'],
    eyes: 'narrow',
    height: 'tall',
    head: 'horns', mark: 'none', prop: 'none', build: 'slim',
  },
  domino: {
    note:
      'Race : Humaine. Peau : claire. Cheveux : blonds, longs et lisses. Yeux ' +
      ': sombres. Visage : fin et régulier. Morphologie : grande, mince, ' +
      'longues jambes. Vêtements : uniforme de gardienne d\'Impel Down ' +
      'principalement noir, avec blanc et détails or/argent. Masque : masque ' +
      'sombre autour des yeux. Arme : fouet, généralement brun/noir. ' +
      'Particularité : silhouette très droite et disciplinée.',
    hair: '#e2c978', cut: 'long', skin: CLAIR, outfit: '#1c1c24',
    extras: ['epaulettes'],
    face: 'sharp',
    height: 'tall',
    head: 'mask', mark: 'none', prop: 'knives', build: 'slim',
  },
  sadi: {
    note:
      'Race : Humaine. Peau : claire. Cheveux : roses, très longs. Yeux : ' +
      'sombres. Visage : fin. Morphologie : grande, extrêmement mince, ' +
      'longues jambes. Cornes : petites cornes de démon rouge/orange sur la ' +
      'tête. Vêtements : tenue très ajustée noire et rouge, bottes hautes ' +
      'noires. Arme : fouet.',
    hair: '#e08aae', cut: 'long', skin: CLAIR, outfit: '#1c1c24',
    extras: ['boots', 'tusks'],
    face: 'sharp',
    height: 'tall',
    head: 'horns', mark: 'none', prop: 'knives', build: 'slim',
  },
  tsuru: {
    note:
      'Race : Humaine. Peau : claire, très ridée. Cheveux : blancs, relevés. ' +
      'Yeux : sombres. Morphologie : grande et mince, posture droite malgré ' +
      'l\'âge. Vêtements : uniforme Marine blanc/bleu, manteau blanc, détails ' +
      'dorés. Accessoire : pipe. Particularité : apparence aristocratique et ' +
      'sévère.',
    hair: '#f0ece2', cut: 'short', skin: CLAIR, outfit: '#253760', coat: '#f0ece2',
    extras: ['coat-shoulders', 'epaulettes'],
    height: 'tall',
    head: 'none', mark: 'none', prop: 'cane', build: 'slim',
  },
  momonga: {
    note:
      'Race : Humain. Peau : claire. Cheveux : noirs, mi-longs. Barbe : ' +
      'courte, sombre. Yeux : sombres. Visage : anguleux, mâchoire forte. ' +
      'Morphologie : grand, athlétique et sec. Vêtements : uniforme Marine ' +
      'blanc/bleu, manteau blanc sur les épaules, détails dorés. Arme : ' +
      'sabre.',
    hair: '#1c1c24', cut: 'long', skin: CLAIR, outfit: '#253760', coat: '#f0ece2',
    extras: ['coat-shoulders', 'epaulettes'],
    face: 'sharp',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'sword', build: 'slim',
  },
  hina: {
    note:
      'Race : Humaine. Peau : claire. Cheveux : rose vif, longs et lisses. ' +
      'Yeux : sombres. Visage : fin et très élégant. Morphologie : grande, ' +
      'mince, longues jambes, silhouette féminine. Vêtements : uniforme noir ' +
      'ajusté sous manteau de Marine blanc, bottes noires, détails dorés. ' +
      'Accessoire : cigarette.',
    hair: '#ed92b8', cut: 'long', skin: CLAIR, outfit: '#253760',
    extras: ['boots', 'coat-shoulders', 'epaulettes'],
    face: 'sharp',
    height: 'tall',
    head: 'none', mark: 'cigarette', prop: 'none', build: 'slim',
  },
  't-bone': {
    note:
      'Race : Humain. Peau : très pâle. Cheveux : très peu visibles. Yeux : ' +
      'sombres. Visage : extrêmement émacié, joues creuses. Morphologie : ' +
      'quasi squelettique, bras et jambes extrêmement fins et longs. ' +
      'Vêtements : armure principalement gris acier, casque et plumet ' +
      'rouge/bleu selon la palette. Arme : grand sabre argenté.',
    hair: '#2a2a33', cut: 'short', skin: '#f8e3d0', outfit: '#9aa4b0',
    extras: ['feather-coat', 'pauldrons'],
    face: 'long',
    head: 'horns', mark: 'none', prop: 'greatsword', build: 'slim',
  },
  'don-quijote-rosinante': {
    note:
      'Race : Humain. Peau : claire. Cheveux : clairs/blonds, longs et ' +
      'volumineux. Yeux : sombres. Visage : très allongé, recouvert de ' +
      'maquillage blanc, avec détails rouges autour des yeux et du nez. ' +
      'Morphologie : gigantesque et très longiligne, bras et jambes ' +
      'extrêmement longs. Vêtements : immense manteau noir, couvert d\'une ' +
      'énorme bordure de plumes roses/blanches ; pantalon et bottes sombres. ' +
      'Torse : motif rouge en forme de cœur. Accessoires : nombreuses ' +
      'cigarettes. Particularité : apparence de clown tragique et de géant ' +
      'maigre.',
    hair: '#e2c978', cut: 'long', skin: CLAIR, outfit: '#1c1c24',
    extras: ['feather-coat', 'boots', 'coat-shoulders', 'belt'],
    face: 'long',
    height: 'towering',
    head: 'none', mark: 'cigarette', prop: 'none', build: 'giant',
  },
  jango: {
    note:
      'Race : Humain. Peau : claire. Cheveux : noirs, longs, souvent cachés ' +
      'sous chapeau/bonnet. Yeux : cachés derrière de grandes lunettes rondes ' +
      'bleues. Visage : fin, menton étroit. Vêtements : costume puis uniforme ' +
      'Marine principalement blanc, bleu et noir. Accessoire : anneau ' +
      'hypnotique doré/métallique. Particularité : grande silhouette de ' +
      'danseur/performer.',
    hair: '#1c1c24', cut: 'long', skin: CLAIR, outfit: '#253760',
    extras: ['necktie', 'epaulettes', 'earrings'],
    face: 'long',
    eyes: 'wide',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  sentomaru: {
    note:
      'Race : Humain. Peau : mate. Cheveux : courts, sombres. Barbe : énorme ' +
      'collerette autour du menton, noire/brune. Yeux : sombres. Morphologie ' +
      ': extrêmement massif, grand ventre, épaules énormes. Vêtements : ' +
      'costume de garde principalement rouge, noir, blanc avec casque ' +
      'gris/noir. Arme : énorme hache gris métallique.',
    hair: '#2a2620', cut: 'short', skin: HALE, outfit: '#b8362c',
    extras: ['necktie'],
    height: 'tall',
    head: 'horns', mark: 'none', prop: 'axe', build: 'broad',
  },
  makino: {
    note:
      'Race : Humaine. Peau : claire. Cheveux : verts, longs et lisses. Yeux ' +
      ': grands, sombres. Visage : doux et souriant. Morphologie : mince, ' +
      'proportions équilibrées. Vêtements : robe/tunique de tavernière ' +
      'principalement vert clair/blanc, avec tablier blanc/crème. ' +
      'Particularité : apparence simple, calme et élégante.',
    hair: '#4f8648', cut: 'long', skin: CLAIR, outfit: '#f0ece2',
    extras: ['necktie', 'high-collar'],
    eyes: 'wide',
    brow: 'calm',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  'curly-dadan': {
    note:
      'Race : Humaine. Peau : claire. Cheveux : orange vif/roux, extrêmement ' +
      'volumineux et bouclés. Yeux : sombres. Visage : large, ridé, gros nez. ' +
      'Morphologie : forte corpulence, épaules larges, bras épais et ventre ' +
      'développé. Vêtements : vêtements rustiques principalement bruns, ' +
      'rouges, beige et blancs. Accessoire : cigarette. Particularité : masse ' +
      'de cheveux orange très caractéristique. -- D — H',
    hair: '#e8832f', cut: 'wavy', skin: CLAIR, outfit: '#6a462a',
    face: 'square',
    head: 'none', mark: 'cigarette', prop: 'none', build: 'broad',
  },
  koshiro: {
    note:
      'Race : Humain. Peau : claire. Cheveux : noirs, longs, ' +
      'relevés/attachés. Yeux : derrière lunettes. Visage : fin et sérieux. ' +
      'Morphologie : grand, sec, athlétique. Vêtements : kimono de maître ' +
      'principalement blanc, avec hakama noir ou bleu foncé. Arme : katana ' +
      'métallique gris/argent. Particularité : posture parfaitement droite de ' +
      'maître d\'escrime.',
    hair: '#1c1c24', cut: 'ponytail', skin: CLAIR, outfit: '#f0ece2',
    extras: ['sash'],
    face: 'sharp',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'sword', build: 'slim',
  },
  kuina: {
    note:
      'Race : Humaine. Peau : claire. Cheveux : bleu-noir, courts, souvent ' +
      'attachés derrière. Yeux : sombres. Visage : jeune et fin. Morphologie ' +
      ': mince, svelte, athlétique sans musculature volumineuse. Vêtements : ' +
      'tenue d\'entraînement blanche/crème, hakama/pantalon bleu foncé/noir. ' +
      'Arme : katana. Particularité : silhouette de jeune épéiste très ' +
      'droite.',
    hair: '#1c1c24', cut: 'ponytail', skin: CLAIR, outfit: '#f0ece2',
    extras: ['belt'],
    face: 'sharp',
    head: 'none', mark: 'none', prop: 'sword', build: 'slim',
  },
  kaya: {
    note:
      'Race : Humaine. Peau : très claire. Cheveux : blonds, très longs et ' +
      'lisses. Yeux : grands, souvent brun/vert selon palette. Visage : fin ' +
      'et délicat. Morphologie : très mince, petite musculature, épaules ' +
      'étroites. Vêtements : robes aristocratiques blanches, crème, rose pâle ' +
      'et bleu clair. Accessoires : rubans et accessoires élégants.',
    hair: '#e2c978', cut: 'long', skin: PALE, outfit: '#f0ece2',
    extras: ['high-collar'],
    face: 'sharp',
    eyes: 'wide',
    height: 'short',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  helmeppo: {
    note:
      'Race : Humain. Peau : claire. Cheveux : blonds, courts et soignés. ' +
      'Yeux : clairs/sombres selon les scènes ; souvent grands et expressifs. ' +
      'Visage : allongé, traits assez fins. Morphologie : grand et mince, ' +
      'devenu progressivement plus athlétique. Vêtements : uniforme Marine ' +
      'blanc/bleu, manteau blanc, détails dorés. Accessoires : lunettes dans ' +
      'certaines apparitions, épée. Particularité : silhouette beaucoup plus ' +
      'sportive après son entraînement.',
    hair: '#e2c978', cut: 'short', skin: CLAIR, outfit: '#253760', coat: '#f0ece2',
    extras: ['goggles', 'coat-shoulders', 'epaulettes'],
    face: 'long',
    eyes: 'wide',
    height: 'tall',
    head: 'none', mark: 'glasses', prop: 'sword', build: 'slim',
  },
  'boa-sandersonia': {
    note:
      'Race : Humaine, Kuja. Peau : claire. Cheveux : verts, très longs et ' +
      'épais. Yeux : sombres. Visage : long et assez anguleux. Morphologie : ' +
      'extrêmement grande, athlétique, épaules et bras développés. Vêtements ' +
      ': tenue Kuja légère, principalement verte, jaune/or, blanche et rose ' +
      'selon les éléments. Accessoires : motifs de serpent et bijoux Kuja. ' +
      'Particularités : corps puissant, jambes longues, silhouette très ' +
      'élancée pour sa taille.',
    hair: '#4f8648', cut: 'long', skin: CLAIR, outfit: '#f0ece2',
    extras: ['pendant'],
    face: 'sharp',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  'boa-marigold': {
    note:
      'Race : Humaine, Kuja. Peau : claire. Cheveux : orange/roux, attachés ' +
      'et relevés en hauteur. Yeux : foncés. Visage : très rond, joues ' +
      'pleines, bouche large. Morphologie : très grande et extrêmement ' +
      'corpulente ; ventre volumineux, bras épais, cuisses épaisses. ' +
      'Vêtements : longue robe Kuja principalement blanche/crème, avec ' +
      'détails rouges et verts selon les scènes. Accessoires : motifs et ' +
      'ornements inspirés du serpent. Particularité : contrairement à ' +
      'Hancock, son physique est massif et très volumineux.',
    hair: '#db7c2c', cut: 'ponytail', skin: CLAIR, outfit: '#f0ece2',
    extras: ['high-collar'],
    face: 'round',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  hajrudin: {
    note:
      'Race : Géant d\'Elbaf. Peau : claire/rosée. Cheveux : blonds, longs. ' +
      'Barbe : blonde, très épaisse et tressée. Yeux : petits, sombres. ' +
      'Visage : gigantesque, nez large, dents imposantes. Morphologie : ' +
      'gigantesque, torse énorme, bras et jambes comparables à des troncs. ' +
      'Vêtements : armure de géant principalement bleu, gris métallique et ' +
      'rouge, avec casque gris/acier. Accessoires : grande arme et ' +
      'protections métalliques. Particularité : proportions gigantesques par ' +
      'rapport aux humains.',
    hair: '#e2c978', cut: 'long', skin: CLAIR, outfit: '#3c62a0',
    extras: ['pauldrons'],
    face: 'square',
    eyes: 'narrow',
    height: 'towering',
    head: 'horns', mark: 'none', prop: 'none', build: 'giant',
  },
  leo: {
    note:
      'Race : Nain Tontatta. Peau : claire/rose pâle. Cheveux : ' +
      'clairs/blonds. Yeux : sombres et grands. Oreilles : longues et ' +
      'pointues. Morphologie : minuscule ; tête proportionnellement grande, ' +
      'corps très mince. Vêtements : combinaison/tenue principalement jaune, ' +
      'rouge, bleu et blanc. Casque : bleu/vert avec grandes oreilles de ' +
      'lapin. Accessoires : aiguille et fil géants à son échelle.',
    hair: '#e2c978', cut: 'short', skin: PALE, outfit: '#f0ece2',
    eyes: 'wide',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'staff', build: 'slim',
  },
  'baby-5': {
    note:
      'Race : Humaine. Peau : claire. Cheveux : noirs, mi-longs à longs, ' +
      'lisses, encadrant le visage. Yeux : grands, généralement bruns/dorés ' +
      'selon la palette animée. Visage : petit, fin, traits féminins, nez ' +
      'discret et lèvres fines. Morphologie : grande, mince, taille fine, ' +
      'longues jambes, poitrine et hanches développées sans être massives. ' +
      'Vêtements : robe/tenue de maid-combat principalement noire, avec blanc ' +
      'sur certaines bordures et éléments de col, bas et chaussures noirs. ' +
      'Accessoires : éléments de servante, chaussures hautes, accessoires de ' +
      'combat. Armes/pouvoir : bras, jambes et autres parties du corps ' +
      'peuvent devenir armes métalliques, notamment fusils, lames, canons et ' +
      'autres formes mécaniques. Particularité : design basé sur le contraste ' +
      'entre une apparence de jeune femme élégante et un pouvoir transformant ' +
      'le corps en arsenal.',
    hair: '#1c1c24', cut: 'long', skin: CLAIR, outfit: '#f0ece2',
    extras: ['boots', 'high-collar'],
    face: 'sharp',
    eyes: 'wide',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  // --- Épiques : équipage de Big Mom ----------------------------------------

  'charlotte-chiffon': {
    note:
      'Race : Humaine. Peau : claire. Cheveux : blond très pâle/blanc cassé, ' +
      'longs et volumineux. Yeux : grands, sombres. Visage : rond et doux, ' +
      'lèvres marquées. Morphologie : grande, poitrine et hanches ' +
      'développées, silhouette assez ronde. Vêtements : robe principalement ' +
      'noire/dark purple, avec col haut et détails clairs. Particularité : ' +
      'air calme et traits plus doux que la majorité de la famille Charlotte.',
    hair: '#ffff9c', cut: 'long', skin: CLAIR, outfit: '#1c1c24',
    extras: ['high-collar'],
    face: 'round',
    eyes: 'wide',
    brow: 'calm',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  'charlotte-praline': {
    note:
      'Race : Femme-poisson, requin. Peau : claire avec caractéristiques ' +
      'aquatiques. Cheveux : brun foncé, très longs, ondulés. Yeux : sombres. ' +
      'Visage : humain mais avec caractéristiques de poisson ; bouche et ' +
      'structure des joues plus aquatiques. Morphologie : grande, silhouette ' +
      'féminine voluptueuse. Vêtements : robe blanche/crème avec détails ' +
      'rose, brun et bleu. Particularités : nageoires/appendices aquatiques ' +
      'sur les bras et éléments de poisson visibles.',
    hair: '#4c321e', cut: 'wavy', skin: CLAIR, outfit: '#f0ece2',
    extras: ['fins', 'high-collar'],
    frame: 'fishman',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  'charlotte-daifuku': {
    note:
      'Race : Humain. Peau : claire à légèrement mate. Cheveux : presque ' +
      'rasés, très foncés. Yeux : sombres. Visage : large, mâchoire forte. ' +
      'Barbe : grosse moustache et barbiche noires. Morphologie : extrêmement ' +
      'musclé, très grand, torse large, bras épais. Vêtements : veste très ' +
      'sombre/noire ou rouge foncé, ouverte sur torse nu ; pantalon sombre. ' +
      'Arme : sabre. Particularité : silhouette de lutteur massif.',
    hair: '#221f20', cut: 'bald', skin: CLAIR, outfit: '#651e18',
    extras: ['bare-chest', 'open-vest', 'belt'],
    face: 'square',
    height: 'tall',
    head: 'none', mark: 'goatee', prop: 'sword', build: 'broad',
  },
  'charlotte-oven': {
    note:
      'Race : Humain. Peau : mate/brune. Cheveux : noirs, courts. Yeux : ' +
      'petits et sombres. Visage : carré, mâchoire énorme, nez large. ' +
      'Morphologie : colossal, cou très épais, épaules énormes, torse et bras ' +
      'extrêmement musclés. Vêtements : tenue principalement rouge ' +
      'sombre/bordeaux et noire, col haut, bras découverts. Particularité : ' +
      'silhouette de colosse plus large que haute.',
    hair: '#1c1c24', cut: 'short', skin: HALE, outfit: '#81261f',
    extras: ['high-collar'],
    face: 'square',
    eyes: 'narrow',
    height: 'towering',
    head: 'none', mark: 'none', prop: 'none', build: 'giant',
  },
  'charlotte-mont-d-or': {
    note:
      'Race : Humain. Peau : claire. Cheveux : blond clair, plaqués en ' +
      'arrière. Yeux : cachés derrière lunettes rondes. Visage : long, ' +
      'étroit, lèvres fines. Morphologie : mince, cou fin, épaules modestes. ' +
      'Vêtements : longue tenue de bibliothécaire principalement crème/blanc ' +
      'cassé, avec détails bruns, rouges et dorés. Accessoires : grosses ' +
      'lunettes rondes et livres. Particularité : esthétique de ' +
      'bibliothécaire/aristocrate érudit.',
    hair: '#fff592', cut: 'short', skin: CLAIR, outfit: '#efe7d8',
    extras: ['goggles'],
    face: 'long',
    head: 'none', mark: 'glasses', prop: 'none', build: 'slim',
  },
  streusen: {
    note:
      'Race : Humain. Peau : claire et très ridée. Cheveux : blancs/gris. ' +
      'Barbe : longue, blanche, pointue. Yeux : petits et sombres. ' +
      'Morphologie : petit à moyen, très sec. Vêtements : toque blanche, ' +
      'tablier blanc, vêtements de cuisinier noirs/bruns. Arme : grand ' +
      'couteau gris métallique.',
    hair: '#f0ece2', cut: 'short', skin: CLAIR, outfit: '#f0ece2',
    extras: ['necktie'],
    eyes: 'narrow',
    height: 'short',
    head: 'cap', mark: 'none', prop: 'knives', build: 'slim',
  },
  promethee: {
    note:
      'Race/espèce : Homie solaire. Corps : boule de feu. Couleur : centre ' +
      'orange/jaune vif, flammes rouge-orangé et jaune. Visage : rond, ' +
      'souriant, yeux sombres. Particularités : aucune anatomie humaine ; ' +
      'masse de flammes mobile.',
    hair: '#f6b13c', cut: 'bald', skin: '#f2913a', outfit: '#f2913a',
    frame: 'homie', extras: [],
    face: 'round',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  napoleon: {
    note:
      'Race/espèce : Homie / objet animé. Forme : bicorne vivant. Couleur : ' +
      'chapeau principalement bleu nuit/noir, bordure or/beige. Visage : yeux ' +
      'intégrés, nez, moustache et bouche stylisés. Lame : grande lame ' +
      'argentée fixée au sommet. Particularité : peut changer de taille et de ' +
      'forme ; aucune anatomie humaine classique.',
    hair: '#242a4a', cut: 'bald', skin: '#2a3358', outfit: '#2a3358',
    accessory: '#d9b25e',
    frame: 'homie', extras: ['bicorn'],
    head: 'none', mark: 'moustache', prop: 'none', build: 'slim',
  },
  hera: {
    note:
      'Race/espèce : Homie — nuage d\'orage. Corps : masse de nuage gris- ' +
      'violet/lavande. Visage : rond, intégré dans le nuage. Yeux : ' +
      'noirs/sombres. Joues : arrondies, donnant une apparence presque ' +
      'enfantine malgré l\'expression agressive. Particularités : petits ' +
      'éclairs jaune pâle et blancs autour du corps. Morphologie : aucune ' +
      'anatomie humaine conventionnelle ; volume nuageux variable.',
    hair: '#b7a6d6', cut: 'bald', skin: '#b09fd0', outfit: '#b09fd0',
    frame: 'homie', extras: [],
    face: 'round',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  zeus: {
    note:
      'Race/espèce : Homie — nuage vivant. Corps : nuage gris clair/gris- ' +
      'bleu. Visage : rond, yeux grands, expression naïve. Yeux : noirs. ' +
      'Particularités : petits éclairs jaunes autour du corps. Morphologie : ' +
      'masse nuageuse variable, sans jambes ni bras anatomiques. -- Entités ' +
      'et formes non humaines — résumé | Personnage | Nature / race | ' +
      'Particularité visuelle dominante | |---|---|---| | Bepo | Mink / ours ' +
      'polaire | Fourrure blanche | | Pekoms | Mink / lion | Crinière brune + ' +
      'carapace de tortue | | Fisher Tiger | Homme-poisson / tigre | Peau ' +
      'rouge-orangé rayée de noir | | Hody Jones | Homme-poisson / requin | ' +
      'Peau bleu-gris + dents en scie | | Kuroobi | Homme-poisson / raie | ' +
      'Traits de raie + corps musclé | | Aladdin | Homme-poisson / raie | ' +
      'Grande barbe noire + traits de manta | | Charlotte Praliné | Femme- ' +
      'poisson / requin | Cheveux bruns ondulés + traits aquatiques | | Blue ' +
      'Gilly | Longleg Tribe | Jambes extrêmement longues | | Léo | Nain ' +
      'Tontatta | Très petite taille + longues oreilles | | Hajrudin | Géant ' +
      'd\'Elbaf | Taille gigantesque + barbe blonde | | Little Oars Jr. | ' +
      'Géant ancien | Taille et masse colossales | | Sanjuan Wolf | Géant | ' +
      'Taille démesurée et silhouette voûtée | | Hera | Homie | Nuage ' +
      'd\'orage violet-gris | | Zeus | Homie | Nuage gris-bleu et éclairs ' +
      'jaunes | | Prométhée | Homie | Boule de feu orange-jaune | | Napoléon ' +
      '| Homie | Bicorne bleu vivant avec lame | -- Repères rapides de ' +
      'morphologie Colosses extrêmement massifs Jozu, Jesus Burgess, Jean ' +
      'Bart, Charlotte Oven, Diamond Jozu, Sentomaru, Edward Weevil, Vasco ' +
      'Shot, Little Oars Jr., Sanjuan Wolf. Géants / proportions gigantesques ' +
      'Hajrudin, Little Oars Jr., Sanjuan Wolf, Charlotte Smoothie, Black ' +
      'Maria, Bastille, Fisher Tiger. Grands et très athlétiques Katakuri, ' +
      'Benn Beckman, Momonga, Page One, Sasaki, Who\'s-Who, Hina, Vista. Très ' +
      'longilignes Lafitte, Van Augur, Strawberry, T-Bone, Doc Q, Lao G, ' +
      'Wire, Blue Gilly, Dellinger, Haruta. Très corpulents Alvida (avant ' +
      'fruit), Boa Marigold, Boo, Lucky Roux, Machvise, Vasco Shot, Charloss, ' +
      'Roswald, Coribou, Jora. Petits / compacts Léo, Saldeath, Dogra, ' +
      'Cabaji, Sugar, Bepo (humanoïde compact), Galdino. Apparence animale ou ' +
      'hybride Bepo, Pekoms, Hody Jones, Kuroobi, Aladdin, Fisher Tiger, ' +
      'Speed, Monet, Kaku, Page One, Ulti, Sasaki, Who\'s-Who, Onigumo, ' +
      'Holdem. -- Légende pour une utilisation comme référence visuelle ' +
      'Race/espèce = nature biologique ou surnaturelle du personnage. ' +
      'Carnation/fourrure = couleur de la peau, des poils ou du pelage. ' +
      'Morphologie = taille relative, largeur d\'épaules, musculature, ' +
      'proportions des membres et volume corporel. Palette vestimentaire = ' +
      'couleurs dominantes à privilégier pour recréer le costume. ' +
      'Particularités = cicatrices, cornes, oreilles, moustaches, marques, ' +
      'transformations ou anomalies anatomiques. Non précisé = information ' +
      'qui n\'est pas solidement fixée par le canon ; la couleur ne doit pas ' +
      'être considérée comme officielle.',
    hair: '#cfd9e8', cut: 'bald', skin: '#c6d2e4', outfit: '#c6d2e4',
    frame: 'homie', extras: [],
    face: 'round',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },

  // --- Épiques : équipage aux Cent Bêtes ------------------------------------

  'who-s-who': {
    note:
      'Race : Humain, ancien agent du Gouvernement devenu Zoan antique. Peau ' +
      ': claire. Cheveux : blond clair, mi-longs. Yeux : sombres/jaune doré ' +
      'en forme animale. Visage : long, traits félins. Morphologie : grand, ' +
      'athlétique et mince. Vêtements : longue veste principalement blanc ' +
      'cassé/ivoire, pantalon sombre, détails rouges/noirs. Masque : masque ' +
      'félin noir/blanc. Armes : deux sabres. Forme Zoan : énorme sabre à ' +
      'dents humanoïde, fourrure brun/orange, dents blanches et longue queue.',
    hair: '#fff592', cut: 'long', skin: CLAIR, outfit: '#f0ece2',
    extras: ['belt'],
    face: 'long',
    height: 'tall',
    head: 'mask', mark: 'none', prop: 'sword', build: 'slim',
  },
  sasaki: {
    note:
      'Race : Humain, Zoan antique. Peau : mate. Cheveux : crâne rasé. Barbe ' +
      ': très fournie, noire. Yeux : sombres. Visage : large et carré. ' +
      'Morphologie : grande, trapue et extrêmement robuste. Vêtements : ' +
      'longue veste principalement bleu foncé/noir, pantalon sombre. Arme : ' +
      'énorme sabre. Forme Zoan : Triceratops avec peau bleu/vert sombre, ' +
      'ventre clair, cornes ivoire, collerette massive.',
    hair: '#2a2a33', cut: 'bald', skin: HALE, outfit: '#2b4773',
    extras: ['belt'],
    face: 'square',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'greatsword', build: 'broad',
  },
  holdem: {
    note:
      'Race : Humain, Zoan antique. Peau : claire/mate. Cheveux : ' +
      'bruns/noirs, hérissés. Yeux : sombres. Visage : humain avec gros nez ' +
      'et traits brutaux. Morphologie : grand et robuste, torse épais. ' +
      'Particularité anatomique : énorme tête de lion attachée/incrustée dans ' +
      'la zone abdominale ; crinière orange/brune, museau beige et yeux ' +
      'jaunes/sombres. Vêtements : kimono principalement jaune, orange, rouge ' +
      'et brun, ouvert sur le torse. -- I — M',
    hair: '#6a462a', cut: 'spiky', skin: CLAIR, outfit: '#dfc04a',
    extras: ['open-vest', 'mane', 'sash'],
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  speed: {
    note:
      'Race : Humaine transformée en centaure via Smile. Peau : claire. ' +
      'Cheveux : blonds, longs, attachés ou en queue de cheval. Yeux : ' +
      'sombres. Visage : fin. Partie humaine : femme mince et athlétique. ' +
      'Partie cheval : grand corps de cheval, muscles des cuisses et des ' +
      'jambes développés, quatre sabots. Couleurs : partie cheval dominée par ' +
      'brun clair/beige, crinière blonde, vêtements noirs, jaunes, blancs et ' +
      'rouges. Accessoire : chapeau de cavalière.',
    hair: '#e2c978', cut: 'ponytail', skin: CLAIR, outfit: '#c9243f',
    trousers: '#c6a074',
    frame: 'centaur',
    face: 'sharp',
    head: 'brim', mark: 'none', prop: 'none', build: 'slim',
  },

  // --- Épiques : équipage de Barbe Blanche ----------------------------------

  thatch: {
    note:
      'Race : Humain. Peau : claire. Cheveux : bruns, volumineux, coiffés en ' +
      'grande banane. Yeux : sombres. Visage : souriant, mâchoire moyenne. ' +
      'Morphologie : grand, mince mais athlétique. Vêtements : tenue de ' +
      'cuisinier principalement blanche/crème, avec tablier blanc et détails ' +
      'sombres. Arme : sabre.',
    hair: '#6a462a', cut: 'pompadour', skin: CLAIR, outfit: '#f0ece2',
    extras: ['necktie'],
    height: 'tall',
    head: 'none', mark: 'none', prop: 'sword', build: 'slim',
  },
  haruta: {
    note:
      'Race : Humain. Peau : claire. Cheveux : bruns, courts et légèrement ' +
      'arrondis autour du visage. Yeux : grands/sombres. Visage : juvénile, ' +
      'très fin. Morphologie : petit, mince et androgyne. Vêtements : veste ' +
      'claire blanc cassé/crème, pantalon sombre. Arme : rapière.',
    hair: '#6a462a', cut: 'short', skin: CLAIR, outfit: '#f0ece2',
    extras: ['belt'],
    face: 'sharp',
    eyes: 'wide',
    height: 'short',
    head: 'none', mark: 'none', prop: 'sword', build: 'slim',
  },
  atmos: {
    note:
      'Race : Humain. Peau : brun foncé / mate. Cheveux : très courts, ' +
      'sombres. Yeux : petits, foncés. Visage : énorme et bovin, nez très ' +
      'large, mâchoire lourde, traits épais. Particularité anatomique : ' +
      'petites cornes au-dessus du front. Morphologie : extrêmement massif, ' +
      'torse et bras volumineux, cou épais. Vêtements : principalement torse ' +
      'nu ; pantalon et protections de combat sombres. Arme : grande hache ' +
      'métallique.',
    hair: '#2a2620', cut: 'short', skin: HALE, outfit: '#3a4250',
    extras: ['bare-chest', 'tusks', 'belt'],
    face: 'square',
    eyes: 'narrow',
    brow: 'fierce',
    head: 'horns', mark: 'none', prop: 'axe', build: 'broad',
  },
  fossa: {
    note:
      'Race : Humain. Peau : mate. Cheveux : noirs/dark brown, courts. Yeux : ' +
      'sombres. Visage : anguleux, large nez, grande cicatrice sur le visage. ' +
      'Morphologie : grand et robuste, torse large, bras musclés. Vêtements : ' +
      'veste principalement rouge foncé/noire, pantalon sombre. Accessoire : ' +
      'cigare. Arme : sabre.',
    hair: '#1c1c24', cut: 'short', skin: HALE, outfit: '#842720',
    extras: ['belt'],
    face: 'sharp',
    height: 'tall',
    head: 'none', mark: 'cigar', prop: 'sword', build: 'broad',
  },
  squardo: {
    note:
      'Race : Humain. Peau : claire à mate. Cheveux : noirs/dark brown, ' +
      'longs. Yeux : sombres. Visage : étroit, marqué. Morphologie : grand, ' +
      'mince mais robuste. Vêtements : veste ouverte principalement brun ' +
      'foncé/rouge sombre, pantalon sombre. Accessoire : bandana généralement ' +
      'rouge/brun. Arme : long sabre.',
    hair: '#1c1c24', cut: 'long', skin: CLAIR, outfit: '#4c321e',
    extras: ['open-vest', 'belt'],
    face: 'long',
    height: 'tall',
    head: 'bandana', mark: 'none', prop: 'sword', build: 'slim',
  },
  'whitey-bay': {
    note:
      'Race : Humaine. Peau : claire. Cheveux : blancs, courts. Yeux : ' +
      'sombres. Visage : fin, expression sévère. Morphologie : grande, mince ' +
      'mais robuste. Vêtements : manteau épais de fourrure principalement ' +
      'blanc/crème, vêtements dessous noirs/dark blue. Particularité : ' +
      'silhouette froide et hivernale.',
    hair: '#f0ece2', cut: 'short', skin: CLAIR, outfit: '#f0ece2',
    extras: ['fur-collar', 'coat-shoulders'],
    face: 'sharp',
    brow: 'fierce',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  'little-oz-junior': {
    note:
      'Race : Ancien Géant. Peau : rougeâtre/brun-rouge selon la palette. ' +
      'Cheveux : sombres. Yeux : sombres. Visage : énorme, carré, grosses ' +
      'dents, petites cornes. Morphologie : gigantesque, immensément massif ' +
      'même parmi les géants. Vêtements : très sommaires, principalement ' +
      'brun, beige et rouge. Particularité : proportions monstrueuses, bras ' +
      'et jambes comme des colonnes.',
    hair: '#2a2620', cut: 'short', skin: '#c4664a', outfit: '#d8c4a4',
    face: 'square',
    height: 'towering',
    head: 'none', mark: 'none', prop: 'none', build: 'giant',
  },

  // --- Épiques : famille Don Quichotte --------------------------------------

  jora: {
    note:
      'Race : Humaine. Peau : claire. Cheveux : violet/rose, très volumineux, ' +
      'coiffés en hauteur. Yeux : sombres. Visage : rond. Morphologie : très ' +
      'corpulente, bras et jambes épais, poitrine et hanches développées. ' +
      'Vêtements : robe très voyante mélangeant rose, violet, rouge, jaune et ' +
      'bleu. Particularité : look extravagant et théâtral.',
    hair: '#744c9c', cut: 'short', skin: CLAIR, outfit: '#e08aae',
    extras: ['high-collar'],
    face: 'round',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  'lao-g': {
    note:
      'Race : Humain. Peau : claire et très vieillie. Cheveux : rares/blancs. ' +
      'Barbe : très longue, blanche. Yeux : lunettes rondes. Visage : ridé, ' +
      'émacié. Morphologie : extrêmement maigre, voûté, membres fins. ' +
      'Vêtements : tenue d\'arts martiaux principalement blanche, noire et ' +
      'rouge. Particularité : vieillesse extrême mais musculature encore ' +
      'nerveuse.',
    hair: '#f0ece2', cut: 'short', skin: CLAIR, outfit: '#f0ece2',
    extras: ['bare-chest'],
    face: 'long',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  machvise: {
    note:
      'Race : Humain. Peau : claire. Cheveux : clairsemés/rasés. Yeux : ' +
      'petites lunettes. Visage : rond et large. Morphologie : gigantesque et ' +
      'extrêmement lourd ; ventre énorme, bras et jambes très épais. ' +
      'Vêtements : tenue de lutteur principalement blanche, jaune, noire et ' +
      'rouge. Particularité : mélange de masse graisseuse et de puissance ' +
      'physique.',
    hair: '#2a2a33', cut: 'bald', skin: CLAIR, outfit: '#f0ece2',
    face: 'round',
    eyes: 'narrow',
    height: 'towering',
    head: 'none', mark: 'none', prop: 'none', build: 'giant',
  },
  dellinger: {
    note:
      'Race : Hybride humain / poisson-combattant, avec traits de poisson et ' +
      'dents acérées. Peau : claire. Cheveux : blonds, mi-longs. Yeux : ' +
      'grands, sombres. Visage : fin et androgyne, nez petit, sourire très ' +
      'large. Dents : pointues, rappelant un poisson prédateur. Morphologie : ' +
      'mince, jambes longues, corps souple. Vêtements : tenue claire ' +
      'principalement blanche/crème, avec bleu clair, rouge et noir sur ' +
      'certains éléments, plus accessoires de combat. Particularités : ' +
      'oreilles et caractéristiques aquatiques ; chaussures/talons intégrés à ' +
      'son style de combat.',
    hair: '#e2c978', cut: 'long', skin: CLAIR, outfit: '#f0ece2',
    extras: ['boots', 'sharp-teeth'],
    frame: 'fishman',
    face: 'sharp',
    eyes: 'wide',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  gladius: {
    note:
      'Race : Humain. Peau : claire. Cheveux : sombres, courts à mi-longs. ' +
      'Yeux : généralement cachés par lunettes/masque. Visage : anguleux, ' +
      'partiellement masqué. Morphologie : grand, mince, membres longs. ' +
      'Vêtements : longue veste principalement noire/violet très foncé, gants ' +
      'noirs et chaussures sombres. Particularité : masque/harnais en cuir ' +
      'sombre et silhouette très militaire.',
    hair: '#2a2620', cut: 'long', skin: CLAIR, outfit: '#1c1c24',
    extras: ['gloves', 'boots'],
    face: 'sharp',
    height: 'tall',
    head: 'mask', mark: 'none', prop: 'none', build: 'slim',
  },
  buffallo: {
    note:
      'Race : Humain. Peau : claire. Cheveux : noirs, dressés en pointes. ' +
      'Yeux : petits, sombres. Visage : énorme menton proéminent, joues ' +
      'épaisses, nez large. Morphologie : très rond, trapu, ventre volumineux ' +
      'et membres courts. Vêtements : tenue principalement noire/brun foncé, ' +
      'avec bottes et éléments métalliques. Particularité : corps compact et ' +
      'tête caricaturalement large.',
    hair: '#1c1c24', cut: 'spiky', skin: CLAIR, outfit: '#1c1c24',
    extras: ['boots'],
    face: 'square',
    eyes: 'narrow',
    brow: 'fierce',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },

  // --- Épiques : équipage de Trafalgar Law et de Kid -------------------------

  shachi: {
    note:
      'Race : Humain. Peau : claire. Cheveux : peu visibles sous casquette. ' +
      'Yeux : derrière lunettes teintées. Visage : assez rond et souriant. ' +
      'Morphologie : petit à moyen, mince. Vêtements : combinaison Heart ' +
      'Pirates principalement blanc cassé, noir et bleu ; casquette blanche.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#f0ece2',
    face: 'round',
    height: 'short',
    head: 'cap', mark: 'none', prop: 'none', build: 'slim',
  },
  pingouin: {
    note:
      'Race : Humain. Peau : claire. Cheveux : peu visibles sous le bonnet. ' +
      'Yeux : sombres. Visage : fin, moitié caché par bonnet. Morphologie : ' +
      'mince, moyenne/petite taille. Vêtements : combinaison Heart Pirates ' +
      'principalement blanche/crème et noire, bonnet blanc à visière.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#f0ece2',
    face: 'sharp',
    height: 'short',
    head: 'cap', mark: 'none', prop: 'none', build: 'slim',
  },
  heat: {
    note:
      'Race : Humain. Peau : claire. Cheveux : roux, plaqués vers l\'arrière. ' +
      'Yeux : sombres. Visage : long, lèvres épaisses et caractéristiques. ' +
      'Morphologie : grand, très mince, jambes longues. Vêtements : veste ' +
      'principalement noire/brun très foncé, pantalon sombre. Particularité : ' +
      'silhouette extrêmement verticale et élancée.',
    hair: '#be552c', cut: 'short', skin: CLAIR, outfit: '#1c1c24',
    extras: ['belt'],
    face: 'long',
    brow: 'fierce',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  wire: {
    note:
      'Race : Humain. Peau : très pâle. Cheveux : crâne rasé. Yeux : sombres. ' +
      'Visage : très étroit et émacié. Morphologie : gigantesque, extrêmement ' +
      'mince, longs membres. Vêtements : vêtements de pirate noir, brun et ' +
      'beige. Arme : lance extrêmement longue métal gris.',
    hair: '#2a2a33', cut: 'bald', skin: '#f8e3d0', outfit: '#1c1c24',
    face: 'long',
    height: 'towering',
    head: 'none', mark: 'none', prop: 'staff', build: 'giant',
  },

  // --- Épiques : Fire Tank et grande flotte ---------------------------------

  vito: {
    note:
      'Race : Humain. Peau : claire. Cheveux : blond clair, plaqués en ' +
      'arrière. Yeux : derrière lunettes rondes. Visage : long et étroit. ' +
      'Morphologie : grand, mince. Vêtements : costume de gangster à rayures ' +
      'gris/bleu ou brun, chemise claire et cravate. Particularité : ' +
      'esthétique mafieuse extrêmement marquée.',
    hair: '#fff592', cut: 'short', skin: CLAIR, outfit: '#8a8e96',
    extras: ['necktie', 'striped-suit'],
    face: 'long',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  gotti: {
    note:
      'Race : Humain. Peau : claire à mate. Cheveux : noirs/sombres, courts. ' +
      'Yeux : sombres. Visage : énorme, mâchoire carrée, joues épaisses. ' +
      'Morphologie : trapu, très large, bras épais, cou massif. Vêtements : ' +
      'costume de gangster principalement noir, chemise blanche et cravate ' +
      'sombre. Particularité : carrure de garde du corps/mafia.',
    hair: '#1c1c24', cut: 'short', skin: CLAIR, outfit: '#1c1c24',
    extras: ['necktie'],
    face: 'square',
    brow: 'fierce',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  suleiman: {
    note:
      'Race : Humain. Peau : mate. Cheveux : noirs, longs. Yeux : sombres. ' +
      'Visage : dur, long. Cicatrices : plusieurs marques sur le visage. ' +
      'Morphologie : grand et très mince, sec. Vêtements : tenue de ' +
      'gladiateur principalement gris, noir, rouge et brun. Arme : sabre.',
    hair: '#1c1c24', cut: 'long', skin: HALE, outfit: '#8a8e96',
    face: 'long',
    brow: 'fierce',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'sword', build: 'slim',
  },
  gambia: {
    note:
      'Race : Humain. Peau : claire. Cheveux : clairs, hérissés. Yeux : ' +
      'sombres. Visage : jeune, fin. Morphologie : petit à moyen, mince et ' +
      'agile. Vêtements : tenue légère principalement blanche, beige, orange ' +
      'et brun avec bandeau. Arme : bâton.',
    hair: '#cdbb93', cut: 'spiky', skin: CLAIR, outfit: '#f0ece2',
    face: 'sharp',
    height: 'short',
    head: 'bandana', mark: 'none', prop: 'staff', build: 'slim',
  },
  sai: {
    note:
      'Race : Humain. Peau : claire. Cheveux : noirs, mi-longs. Yeux : ' +
      'sombres. Visage : fin. Morphologie : grand, athlétique, épaules ' +
      'développées. Vêtements : tenue traditionnelle principalement ' +
      'blanche/crème, bleu foncé et rouge, avec bandeau. Armes : armes ' +
      'longues/lances gris métallique.',
    hair: '#1c1c24', cut: 'long', skin: CLAIR, outfit: '#f0ece2',
    face: 'sharp',
    height: 'tall',
    head: 'bandana', mark: 'none', prop: 'staff', build: 'slim',
  },
  boo: {
    note:
      'Race : Humain. Peau : mate/brune. Cheveux : noirs/sombres, courts. ' +
      'Yeux : petits et sombres. Visage : rond, très large, joues pleines et ' +
      'expression calme. Morphologie : extrêmement corpulent, ventre énorme, ' +
      'épaules larges et membres épais. Vêtements : vêtements traditionnels ' +
      'amples, principalement brun, beige, blanc cassé ou noir selon les ' +
      'détails. Particularité : silhouette compacte et très lourde.',
    hair: '#1c1c24', cut: 'short', skin: HALE, outfit: '#f0ece2',
    face: 'round',
    eyes: 'narrow',
    brow: 'calm',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  ideo: {
    note:
      'Race : Humain. Peau : mate. Cheveux : sombres, courts. Yeux : sombres. ' +
      'Visage : crâne très allongé et étroit. Morphologie : grand, très ' +
      'athlétique, torse et bras musclés, taille assez fine. Vêtements : ' +
      'torse nu ; pantalon/équipement de combat noir, rouge et blanc. ' +
      'Accessoires : gros gants de boxe noirs/blancs.',
    hair: '#2a2620', cut: 'short', skin: HALE, outfit: '#f0ece2',
    extras: ['bare-chest', 'gloves', 'belt'],
    face: 'long',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  'blue-gilly': {
    note:
      'Race : Longleg Tribe. Peau : bleu pâle/bleutée. Cheveux : noirs, ' +
      'lisses, tirés vers l\'arrière. Yeux : sombres. Visage : très étroit, ' +
      'menton pointu. Morphologie : extrêmement longiligne ; jambes ' +
      'exceptionnellement longues, corps sec, muscles définis mais peu ' +
      'volumineux. Vêtements : tenue de combat très légère, dominée par des ' +
      'tons sombres et bleus. Particularité : proportions des jambes ' +
      'extrêmement exagérées, typiques de la Longleg Tribe.',
    hair: '#1c1c24', cut: 'short', skin: PALE, outfit: '#3c62a0',
    face: 'long',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  orlumbus: {
    note:
      'Race : Humain. Peau : claire à mate. Cheveux : sombres. Barbe : ' +
      'énorme, dense, brune/noire. Yeux : sombres. Morphologie : très grand, ' +
      'énorme torse, ventre développé, bras épais. Vêtements : longue veste ' +
      'principalement blanche, bleue et rouge, bicorne bleu/noir, détails or. ' +
      'Arme : grande ancre/grande arme métallique.',
    hair: '#2a2620', cut: 'short', skin: CLAIR, outfit: '#f0ece2',
    height: 'tall',
    head: 'tricorne', mark: 'none', prop: 'club', build: 'broad',
  },

  // --- Épiques : Marine et Cipher Pol ---------------------------------------

  onigumo: {
    note:
      'Race : Humain, Zoan araignée. Peau : claire. Cheveux : noirs, mi- ' +
      'longs. Yeux : sombres. Visage : anguleux. Morphologie : grand et ' +
      'mince. Vêtements : uniforme Marine blanc/bleu, manteau blanc. Forme ' +
      'hybride : nombreuses pattes d\'araignée noires/brun foncé surgissant ' +
      'du dos. Particularité : silhouette transformée en créature arachnide ' +
      'humanoïde.',
    hair: '#1c1c24', cut: 'long', skin: CLAIR, outfit: '#253760', coat: '#f0ece2',
    extras: ['coat-shoulders', 'epaulettes'],
    face: 'sharp',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  doberman: {
    note:
      'Race : Humain. Peau : claire. Cheveux : noirs, coiffés en arrière. ' +
      'Yeux : sombres. Visage : extrêmement émacié, joues creusées, nez long. ' +
      'Morphologie : grand, mince, sec et athlétique. Vêtements : uniforme ' +
      'Marine blanc/bleu, manteau blanc, détails dorés. Particularité : ' +
      'apparence sévère et presque cadavérique du visage.',
    hair: '#1c1c24', cut: 'short', skin: CLAIR, outfit: '#253760', coat: '#f0ece2',
    extras: ['coat-shoulders', 'epaulettes'],
    face: 'long',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  strawberry: {
    note:
      'Race : Humain. Peau : claire. Cheveux : sombres. Yeux : petits. Visage ' +
      ': extrêmement allongé verticalement, crâne démesurément haut. ' +
      'Moustache : très longue, tombante, blanche/grise. Morphologie : très ' +
      'grand, extrêmement mince. Vêtements : uniforme Marine blanc/bleu, ' +
      'manteau blanc.',
    hair: '#2a2620', cut: 'short', skin: CLAIR, outfit: '#253760', coat: '#f0ece2',
    extras: ['coat-shoulders', 'epaulettes'],
    face: 'long',
    eyes: 'narrow',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  yamakaji: {
    note:
      'Race : Humain. Peau : claire/mate. Cheveux : sombres, courts. Yeux : ' +
      'derrière lunettes teintées. Visage : large et mature. Morphologie : ' +
      'grand, corpulent, légèrement bedonnant. Vêtements : uniforme Marine ' +
      'blanc/bleu, manteau blanc ; chemise dessous très colorée avec motifs ' +
      'rouges, bleus, jaunes. Accessoire : cigare.',
    hair: '#2a2620', cut: 'short', skin: CLAIR, outfit: '#253760', coat: '#f0ece2',
    extras: ['coat-shoulders', 'necktie', 'epaulettes'],
    face: 'square',
    height: 'tall',
    head: 'none', mark: 'cigar', prop: 'none', build: 'broad',
  },
  bastille: {
    note:
      'Race : Humain. Peau : mate/brune. Cheveux : très courts, sombres, peu ' +
      'visibles sous le casque. Yeux : sombres. Visage : extrêmement carré, ' +
      'mâchoire massive. Morphologie : très grand, très large, muscles ' +
      'volumineux ; épaules et bras énormes. Casque : casque de Marine ' +
      'imposant gris/métallique, avec cornes. Vêtements : uniforme de Marine ' +
      'blanc, chemise et pantalon bleu marine/noir, manteau blanc avec ' +
      'détails dorés selon la représentation. Arme : énorme sabre. ' +
      'Particularité : apparence de soldat lourdement blindé.',
    hair: '#2a2620', cut: 'short', skin: HALE, outfit: '#253760', coat: '#f0ece2',
    extras: ['tusks', 'coat-shoulders', 'necktie', 'epaulettes'],
    face: 'square',
    height: 'tall',
    head: 'horns', mark: 'none', prop: 'greatsword', build: 'broad',
  },
  maynard: {
    note:
      'Race : Humain. Peau : claire. Cheveux : crâne rasé. Moustache : fine, ' +
      'sombre. Yeux : sombres. Morphologie : grand, robuste, athlétique. ' +
      'Vêtements : tenue Marine principalement blanc, bleu marine et noir, ' +
      'manteau blanc. Arme : sabre.',
    hair: '#2a2a33', cut: 'bald', skin: CLAIR, outfit: '#253760', coat: '#f0ece2',
    extras: ['coat-shoulders'],
    height: 'tall',
    head: 'none', mark: 'none', prop: 'sword', build: 'broad',
  },
  brandnew: {
    note:
      'Race : Humain. Peau : claire. Cheveux : blond clair/beige, plaqués ' +
      'vers l\'arrière. Yeux : cachés derrière de petites lunettes rondes à ' +
      'monture sombre. Visage : étroit, nez fin, menton mince. Morphologie : ' +
      'grand, mince et droit. Vêtements : uniforme de Marine blanc et bleu, ' +
      'manteau blanc à épaulettes et détails dorés. Accessoires : dossiers, ' +
      'documents ou équipement administratif. Particularité : allure ' +
      'd\'officier administratif plutôt que de combattant de première ligne.',
    hair: '#fff592', cut: 'short', skin: CLAIR, outfit: '#253760', coat: '#f0ece2',
    extras: ['coat-shoulders', 'epaulettes'],
    face: 'long',
    eyes: 'narrow',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  nezumi: {
    note:
      'Race : Humain à tête de rongeur anthropomorphe. Peau/fourrure : ' +
      'teintes gris-brun, surtout sur le visage. Cheveux : gris, plaqués en ' +
      'arrière. Visage : museau de rat, nez pointu, longues moustaches fines. ' +
      'Yeux : petits et sombres. Morphologie : mince, taille moyenne. ' +
      'Vêtements : uniforme Marine blanc et bleu, manteau blanc.',
    hair: '#8a8e96', cut: 'short', skin: '#8b7f70', outfit: '#253760', coat: '#f0ece2',
    frame: 'bear',
    extras: ['coat-shoulders', 'epaulettes'],
    face: 'long',
    eyes: 'narrow',
    head: 'none', mark: 'moustache', prop: 'none', build: 'slim',
  },
  fullbody: {
    note:
      'Race : Humain. Peau : claire. Cheveux : bleus, coiffés en arrière. ' +
      'Yeux : sombres. Visage : carré, sourcils épais. Morphologie : grand, ' +
      'athlétique, épaules modérément larges. Vêtements : uniforme de Marine ' +
      'blanc et bleu. Armes : poings renforcés par équipements métalliques. ' +
      'Particularité : accessoires de poing volumineux donnant l\'impression ' +
      'd\'un boxeur.',
    hair: '#3c62a0', cut: 'short', skin: CLAIR, outfit: '#253760',
    extras: ['epaulettes'],
    face: 'square',
    brow: 'fierce',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  stussy: {
    note:
      'Race : Humaine (identité publique/CP0 à distinguer de son origine). ' +
      'Peau : claire. Cheveux : longs blond clair, ondulés. Yeux : grands, ' +
      'sombres. Visage : très fin et élégant. Morphologie : grande, mince, ' +
      'taille fine, longues jambes. Vêtements : robe principalement ' +
      'noire/dark violet, avec détails rouge, blanc et or selon les scènes. ' +
      'Accessoires : gants, accessoires luxueux et verre. Particularité : ' +
      'esthétique de femme mondaine très raffinée.',
    hair: '#fff592', cut: 'wavy', skin: CLAIR, outfit: '#1c1c24',
    extras: ['gloves', 'high-collar'],
    face: 'sharp',
    eyes: 'wide',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  saldeath: {
    note:
      'Race : Humain. Peau : claire. Cheveux : peu visibles. Yeux : cachés ' +
      'par masque. Visage : masqué par un motif de crâne blanc/gris avec ' +
      'zones sombres. Morphologie : extrêmement petit et mince. Vêtements : ' +
      'cape noire/dark blue. Arme : trident gris métallique.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#1c1c24',
    extras: ['cape'],
    height: 'short',
    head: 'none', mark: 'none', prop: 'staff', build: 'slim',
  },
  guernica: {
    note:
      'Race : Humain. Peau : claire. Cheveux : crâne rasé. Yeux : sombres. ' +
      'Visage : large et carré. Morphologie : grand, robuste, épaules larges. ' +
      'Vêtements : costume du Cipher Pol principalement noir, avec gants ' +
      'blancs/noirs et chaussures sombres. Particularité : apparence froide, ' +
      'très uniforme et professionnelle.',
    hair: '#2a2a33', cut: 'bald', skin: CLAIR, outfit: '#1c1c24',
    extras: ['gloves', 'boots', 'necktie', 'epaulettes'],
    face: 'square',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },

  // --- Épiques : Dragons Célestes -------------------------------------------

  roswald: {
    note:
      'Race : Humain, Dragon Céleste. Peau : très claire. Cheveux : blonds, ' +
      'extrêmement bouffants. Yeux : petits. Visage : rond, joues épaisses. ' +
      'Morphologie : très corpulent, ventre important. Vêtements : vêtements ' +
      'aristocratiques blancs/crème, détails dorés. Accessoire : bulle ' +
      'transparente autour de la tête. -- S — Z',
    hair: '#e2c978', cut: 'wavy', skin: PALE, outfit: '#f0ece2',
    extras: ['high-collar'],
    face: 'round',
    eyes: 'narrow',
    brow: 'fierce',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  charloss: {
    note:
      'Race : Humain, Dragon Céleste. Peau : très claire. Cheveux : blonds, ' +
      'volumineux, bouclés et gonflés. Yeux : petits, sombres. Visage : rond, ' +
      'joues lourdes, lèvres épaisses, menton petit. Morphologie : très ' +
      'obèse, ventre volumineux, bras et jambes relativement courts. ' +
      'Vêtements : vêtements aristocratiques entièrement blancs/crème, très ' +
      'larges et luxueux, avec détails dorés. Accessoire emblématique : bulle ' +
      'transparente autour de la tête. Arme : pistolet généralement ' +
      'doré/brun/métallique.',
    hair: '#e2c978', cut: 'wavy', skin: PALE, outfit: '#f0ece2',
    extras: ['high-collar'],
    face: 'round',
    eyes: 'narrow',
    brow: 'fierce',
    head: 'none', mark: 'none', prop: 'gun', build: 'slim',
  },
  sharlia: {
    note:
      'Race : Humaine, Dragon Céleste. Peau : très claire. Cheveux : blonds, ' +
      'volumineux et relevés. Yeux : sombres. Visage : fin, expression ' +
      'hautaine. Morphologie : mince, élégante. Vêtements : robe immaculée ' +
      'blanche/crème avec détails or. Accessoire : bulle transparente autour ' +
      'de la tête.',
    hair: '#e2c978', cut: 'short', skin: PALE, outfit: '#f0ece2',
    extras: ['high-collar'],
    face: 'sharp',
    brow: 'arched',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  jalmack: {
    note:
      'Race : Humain, Dragon Céleste. Peau : très claire. Cheveux : blonds, ' +
      'courts et plaqués. Yeux : petits. Visage : long, lèvres épaisses. ' +
      'Morphologie : corpulent et légèrement bedonnant. Vêtements : vêtements ' +
      'immaculés blancs/crème, détails or. Accessoire : bulle transparente ' +
      'autour de la tête.',
    hair: '#e2c978', cut: 'short', skin: PALE, outfit: '#f0ece2',
    extras: ['high-collar'],
    face: 'long',
    eyes: 'narrow',
    brow: 'fierce',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },

  // --- Épiques : équipage de Barbe Noire -------------------------------------

  'avalo-pizarro': {
    note:
      'Race : Humain. Peau : claire. Cheveux : longs, noirs/brun très sombre, ' +
      'volumineux sur les côtés du visage. Yeux : sombres. Visage : immense, ' +
      'presque carré, joues épaisses, large nez et large sourire narquois. ' +
      'Morphologie : très grand, lourd, large d\'épaules, bras et torse ' +
      'épais. Vêtements : tenue inspirée de celle d\'un prisonnier d\'Impel ' +
      'Down, principalement sombre, avec bandes/éléments de prisonnier selon ' +
      'la scène. Accessoires : éléments métalliques et équipements de combat. ' +
      'Particularité : apparence de criminel massif, négligé et arrogant.',
    hair: '#1c1c24', cut: 'long', skin: CLAIR, outfit: '#3a4250',
    face: 'square',
    brow: 'fierce',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  'vasco-shot': {
    note:
      'Race : Humain. Peau : rougeâtre/rosée, souvent très colorée. Cheveux : ' +
      'crâne rasé. Yeux : petits. Visage : énorme et rougeaud, joues ' +
      'gonflées, nez massif. Morphologie : gigantesque et extrêmement obèse, ' +
      'ventre colossal. Vêtements : vêtements très simples principalement ' +
      'brun, beige, noir, laissant souvent une partie du corps découverte. ' +
      'Accessoire : immense gourde/bouteille brune.',
    hair: '#2a2a33', cut: 'bald', skin: '#f2c6ae', outfit: '#6a462a',
    face: 'square',
    eyes: 'narrow',
    height: 'towering',
    head: 'none', mark: 'none', prop: 'none', build: 'giant',
  },
  rockstar: {
    note:
      'Race : Humain. Peau : claire. Cheveux : noirs, plaqués en arrière. ' +
      'Yeux : derrière lunettes teintées. Visage : fin. Morphologie : grand, ' +
      'mince, athlétique. Vêtements : veste sombre noir/brun, pantalon ' +
      'sombre, chaussures noires. Arme : sabre argenté.',
    hair: '#1c1c24', cut: 'short', skin: CLAIR, outfit: '#141419',
    extras: ['boots', 'belt'],
    face: 'sharp',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'sword', build: 'slim',
  },

  // --- Épiques : Foxy, Jaya et la mer d’en bas ------------------------------

  porche: {
    note:
      'Race : Humaine. Peau : claire. Cheveux : roses, très longs, relevés. ' +
      'Yeux : grands, sombres. Visage : fin, sourire fixe. Morphologie : ' +
      'mince et élégante. Vêtements : costume de spectacle très coloré rose, ' +
      'rouge, violet, jaune, blanc. Particularité : forte esthétique ' +
      'd\'artiste/diva de spectacle.',
    hair: '#e08aae', cut: 'long', skin: CLAIR, outfit: '#e08aae',
    extras: ['necktie'],
    face: 'sharp',
    eyes: 'wide',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  hamburg: {
    note:
      'Race : Humanoïde simiesque/animalier du clan de Foxy. Fourrure : brun ' +
      'foncé. Visage : museau clair, nez sombre, petites oreilles. Yeux : ' +
      'sombres. Morphologie : très massif, gros bras, torse large, jambes ' +
      'épaisses. Vêtements : très légers, dominés par brun, beige, rouge et ' +
      'blanc. Particularité : apparence d\'un grand ours/singe ' +
      'anthropomorphe.',
    hair: '#4c321e', cut: 'short', skin: '#5c3f28', outfit: '#f0ece2',
    frame: 'bear', extras: ['bare-chest'],
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  'montblanc-cricket': {
    note:
      'Race : Humain. Peau : mate/brune. Cheveux : sombres, hérissés. Barbe : ' +
      'courte, brune/noire. Yeux : sombres. Morphologie : robuste et musclée, ' +
      'torse nu. Vêtements : pantalon de plongée principalement noir/brun, ' +
      'bandeau de tête et équipement rouge, brun, gris. Particularité : ' +
      'cicatrices et marques de vie en mer, physique d\'aventurier.',
    hair: '#2a2620', cut: 'spiky', skin: HALE, outfit: '#1c1c24',
    extras: ['belt'],
    head: 'bandana', mark: 'scar-face', prop: 'none', build: 'broad',
  },
  masira: {
    note:
      'Race : Humanoïde simiesque. Fourrure : brun foncé, abondante. Visage : ' +
      'museau beige/crème, nez sombre. Yeux : noirs. Morphologie : massif, ' +
      'ventre volumineux, bras longs et puissants. Vêtements : salopette ' +
      'principalement bleu clair, chemise sous-jacente et casquette ' +
      'rouge/brune. Particularité : apparence de grand singe anthropomorphe.',
    hair: '#4c321e', cut: 'short', skin: '#5c3f28', outfit: '#4978c3',
    frame: 'bear',
    extras: ['necktie'],
    head: 'cap', mark: 'none', prop: 'none', build: 'broad',
  },
  'vander-decken-ix': {
    note:
      'Race : Homme-poisson, espèce précise non toujours explicitée ; ' +
      'apparence de poisson à la peau verdâtre. Peau : vert pâle/vert gris. ' +
      'Cheveux : peu visibles sous casque. Yeux : sombres. Visage : long, ' +
      'bosselé, traits aquatiques. Morphologie : voûté, assez mince, membres ' +
      'longs. Vêtements : cape et tenue principalement noires, violettes et ' +
      'rouges foncées. Casque : gris/métallique. Particularité : apparence de ' +
      'pirate marin ancien et grotesque.',
    hair: '#2a2a33', cut: 'short', skin: PALE, outfit: '#744c9c',
    extras: ['cape'],
    frame: 'fishman',
    face: 'long',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  'edward-weeble': {
    note:
      'Race : Humain. Peau : claire. Cheveux : blond pâle, clairsemés et en ' +
      'partie dégarnis. Yeux : grands, aspect juvénile. Visage : étonnamment ' +
      'enfantin, rond, avec joues pleines. Morphologie : énorme et ' +
      'extrêmement puissante, bras massifs, ventre volumineux, jambes ' +
      'relativement courtes. Vêtements : tenue de pirate principalement ' +
      'blanche, beige et marron, ceinture et accessoires. Arme : énorme ' +
      'bisento métallique gris. Particularité : contraste entre visage de ' +
      'jeune garçon et corps de colosse adulte.',
    hair: '#ffff9c', cut: 'bald', skin: CLAIR, outfit: '#f0ece2',
    extras: ['belt'],
    face: 'round',
    eyes: 'wide',
    head: 'none', mark: 'none', prop: 'staff', build: 'broad',
  },
  laura: {
    note:
      'Race : Humaine. Peau : claire. Cheveux : noirs/brun très sombre, ' +
      'longs. Yeux : sombres. Visage : fin. Morphologie : grande et mince. ' +
      'Vêtements : tenue de voyage de pirate principalement beige, brun, ' +
      'blanc et noir. Chapeau : large, généralement brun/noir.',
    hair: '#1c1c24', cut: 'long', skin: CLAIR, outfit: '#d8c4a4',
    face: 'sharp',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  margaret: {
    note:
      'Race : Humaine, Kuja. Peau : claire. Cheveux : blonds, mi-longs. Yeux ' +
      ': sombres. Visage : fin. Morphologie : grande, athlétique, silhouette ' +
      'de guerrière. Vêtements : tenue Kuja légère dominée par rose, violet, ' +
      'blanc et vert, avec motifs de serpent. Arme : arc, souvent brun avec ' +
      'flèches noires/jaunes.',
    hair: '#e2c978', cut: 'long', skin: CLAIR, outfit: '#e08aae',
    face: 'sharp',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'gun', build: 'slim',
  },
  coribou: {
    note:
      'Race : Humain. Peau : claire à mate. Cheveux/barbe : sombres, barbe ' +
      'épaisse. Yeux : petits. Visage : rond et large. Morphologie : très ' +
      'corpulent, plus compact que Caribou. Vêtements : bonnet clair/blanc, ' +
      'vêtements de pirate/marin bruns, sombres ou bleus. Armes : ' +
      'généralement armes à feu et équipement de pirate.',
    hair: '#2a2a33', cut: 'short', skin: CLAIR, outfit: '#ffffff',
    face: 'round',
    eyes: 'narrow',
    head: 'cap', mark: 'none', prop: 'none', build: 'broad',
  },
  'demaro-black': {
    note:
      'Race : Humain. Peau : claire. Cheveux : noirs/sombres, courts. Yeux : ' +
      'petits. Visage : maigre, joues creuses, mâchoire irrégulière. ' +
      'Morphologie : mince, plus petit et moins athlétique que Luffy. ' +
      'Vêtements : chapeau de paille jaune/beige, cardigan rouge, pantalon ' +
      'brun/noir et chaussures sombres. Particularité : costume d\'imitateur ' +
      'grossier du Chapeau de Paille.',
    hair: '#1c1c24', cut: 'short', skin: CLAIR, outfit: '#dfc04a',
    extras: ['boots', 'necktie', 'belt'],
    eyes: 'narrow',
    height: 'short',
    head: 'strawhat', mark: 'none', prop: 'none', build: 'slim',
  },

  // --- Épiques : East Blue et souvenirs d’enfance ---------------------------

  bluejam: {
    note:
      'Race : Humain. Peau : claire à légèrement mate. Cheveux : bleu foncé, ' +
      'courts, hérissés. Yeux : sombres. Visage : large, plusieurs cicatrices ' +
      'visibles, front marqué, barbe naissante. Morphologie : grand et ' +
      'robuste sans être colossal. Vêtements : longue veste de pirate ' +
      'principalement bleu foncé/noir, pantalon sombre, ceinture claire. ' +
      'Armes : deux pistolets brun/noir métallique. Particularités : ' +
      'cicatrices faciales et apparence de bandit endurci.',
    hair: '#2b4773', cut: 'spiky', skin: CLAIR, outfit: '#2b4773',
    extras: ['belt'],
    face: 'square',
    height: 'towering',
    head: 'none', mark: 'beard', prop: 'gun', build: 'giant',
  },
  porchemy: {
    note:
      'Race : Humain. Peau : mate. Cheveux : noirs/sombres. Yeux : sombres. ' +
      'Visage : très large, nez gros, mâchoire forte. Morphologie : grand et ' +
      'robuste. Vêtements : tenue de pirate brune, beige, noire et gants de ' +
      'combat. Accessoires : gants cloutés métal gris/noir.',
    hair: '#1c1c24', cut: 'short', skin: HALE, outfit: '#6a462a',
    extras: ['gloves'],
    face: 'square',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  higuma: {
    note:
      'Race : Humain. Peau : claire à mate. Cheveux : noirs/sombres, courts. ' +
      'Yeux : sombres. Visage : dur, nez épais, barbe naissante. Morphologie ' +
      ': corpulence moyenne à forte, bras robustes. Vêtements : tenue de ' +
      'bandit principalement brun, beige, gris et noir. Arme : sabre.',
    hair: '#1c1c24', cut: 'short', skin: CLAIR, outfit: '#6a462a',
    brow: 'fierce',
    head: 'none', mark: 'beard', prop: 'sword', build: 'broad',
  },
  'woop-slap': {
    note:
      'Race : Humain. Peau : claire, ridée. Cheveux : rares, blancs/gris. ' +
      'Barbe : blanche et volumineuse. Yeux : derrière lunettes. Visage : ' +
      'rond et ridé. Morphologie : petit à moyen, trapu. Vêtements : ' +
      'vêtements de maire/villageois principalement brun, beige, blanc cassé.',
    hair: '#f0ece2', cut: 'short', skin: CLAIR, outfit: '#f0ece2',
    face: 'round',
    height: 'short',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  dogra: {
    note:
      'Race : Humain. Peau : mate. Cheveux : noirs/sombres, courts. Yeux : ' +
      'sombres. Visage : rond et large. Morphologie : petit, trapu, bras ' +
      'relativement musclés. Vêtements : vêtements de bandit bruns, beiges, ' +
      'noirs et rapiécés. Particularité : silhouette compacte de petit ' +
      'brigand.',
    hair: '#1c1c24', cut: 'short', skin: HALE, outfit: '#6a462a',
    face: 'round',
    height: 'short',
    head: 'none', mark: 'none', prop: 'none', build: 'broad',
  },
  magra: {
    note:
      'Race : Humain. Peau : mate. Cheveux : sombres, courts. Yeux : sombres. ' +
      'Visage : étroit et allongé. Morphologie : petit, mince. Vêtements : ' +
      'vêtements de bandit bruns, gris, beige et noir, visiblement rapiécés.',
    hair: '#2a2620', cut: 'short', skin: HALE, outfit: '#6a462a',
    face: 'long',
    height: 'short',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  stelly: {
    note:
      'Race : Humain, noble du Royaume de Goa. Peau : claire. Cheveux : ' +
      'blonds/clairs, très bouffants. Yeux : sombres. Visage : assez rond, ' +
      'expression arrogante. Morphologie : mince avec légère bedaine. ' +
      'Vêtements : costume aristocratique blanc/crème, détails or. ' +
      'Particularité : apparence de jeune noble riche et très apprêté.',
    hair: '#e2c978', cut: 'wavy', skin: CLAIR, outfit: '#f0ece2',
    extras: ['necktie'],
    face: 'round',
    brow: 'arched',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  'outlook-iii': {
    note:
      'Race : Humain, noble du Royaume de Goa. Peau : claire. Cheveux : ' +
      'blonds, plaqués en arrière. Yeux : sombres. Visage : long, sévère. ' +
      'Morphologie : plutôt mince, ventre légèrement présent. Vêtements : ' +
      'costume aristocratique blanc/crème, détails or, chaussures sombres.',
    hair: '#e2c978', cut: 'short', skin: CLAIR, outfit: '#f0ece2',
    extras: ['boots', 'necktie'],
    face: 'long',
    brow: 'fierce',
    head: 'none', mark: 'none', prop: 'none', build: 'slim',
  },
  'kozaburo-shimotsuki': {
    note:
      'Race : Humain. Peau : claire, vieillie et ridée. Cheveux : rares, ' +
      'gris/blanc. Barbe : extrêmement longue, blanche. Yeux : sombres. ' +
      'Visage : ridé, joues creuses, nez prononcé. Morphologie : vieux corps ' +
      'sec, mains très épaisses de forgeron. Vêtements : tablier de forge ' +
      'brun, vêtements de travail gris/beige, sandales. Arme : katana.',
    hair: '#f0ece2', cut: 'short', skin: CLAIR, outfit: '#6a462a',
    extras: ['necktie', 'boots'],
    head: 'none', mark: 'none', prop: 'sword', build: 'slim',
  },
  merry: {
    note:
      'Race : Humain. Peau : claire. Cheveux : noirs, plaqués. Yeux : un œil ' +
      'souvent couvert d\'un monocle ; yeux sombres. Visage : étroit, nez ' +
      'long. Morphologie : grand, mince. Vêtements : costume de majordome ' +
      'noir, chemise blanche, gants blancs, chaussures noires. Accessoire : ' +
      'monocle.',
    hair: '#1c1c24', cut: 'short', skin: CLAIR, outfit: '#1c1c24',
    extras: ['gloves', 'boots', 'necktie'],
    face: 'long',
    height: 'tall',
    head: 'none', mark: 'glasses', prop: 'none', build: 'slim',
  },

  /* =========================================================================
     Sixième série — les personnages que l'API ne sert pas.

     Ils viennent de `src/data/characters.manquants.ts`, écrits à la main
     parce que la source ne les connaît pas. Chaque Épique doit sa signature :
     sans elle, il tomberait sur la figurine de repli, et une carte de haut
     rang à visage générique se remarque immédiatement dans une grille.
     ========================================================================= */

  'jaguar-d-saul': {
    note:
      'Race : Géant. Peau : claire. Cheveux : sombres, courts. Visage : ' +
      'large, mâchoire carrée, rire perpétuel. Morphologie : colossale. ' +
      'Vêtements : manteau de vice-amiral sur une tenue sombre.',
    hair: '#2a2018', cut: 'short', skin: CLAIR, outfit: '#33455e',
    coat: '#e8e2d4',
    extras: ['coat-shoulders', 'epaulettes'],
    face: 'square',
    brow: 'calm',
    height: 'towering',
    head: 'none', mark: 'none', prop: 'none', build: 'giant',
  },

  'figarland-garling': {
    note:
      'Race : Humain. Peau : claire. Cheveux : blancs, longs. Visage : ' +
      'anguleux, traits durs. Morphologie : grande, large. Vêtements : ' +
      'armure claire de Chevalier de Dieu, cape, épaulières. Arme : grande ' +
      'lame.',
    hair: '#efeae0', cut: 'long', skin: CLAIR, outfit: '#e4e7ee',
    accessory: '#c9a227',
    extras: ['cape', 'pauldrons', 'high-collar'],
    face: 'sharp',
    eyes: 'sharp',
    brow: 'fierce',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'greatsword', build: 'broad',
  },

  gunko: {
    note:
      'Race : Humain. Peau : claire. Cheveux : clairs, longs. Visage : fin. ' +
      'Morphologie : élancée. Vêtements : tenue claire de Chevalier de Dieu, ' +
      'cape. Arme : arc.',
    hair: '#f2eddf', cut: 'long', skin: CLAIR, outfit: '#dfe4ec',
    accessory: '#c9a227',
    extras: ['cape', 'high-collar'],
    face: 'sharp',
    eyes: 'narrow',
    brow: 'calm',
    height: 'normal',
    head: 'none', mark: 'none', prop: 'gun', build: 'slim',
  },

  killingham: {
    note:
      'Race : Humain. Peau : claire. Cheveux : sombres, longs et ondulés. ' +
      'Visage : large. Morphologie : colossale. Vêtements : tenue de ' +
      'Chevalier de Dieu, cape, col haut.',
    hair: '#2b2430', cut: 'wavy', skin: CLAIR, outfit: '#d8dce6',
    accessory: '#c9a227',
    extras: ['cape', 'high-collar', 'pauldrons'],
    face: 'square',
    eyes: 'wide',
    brow: 'fierce',
    height: 'towering',
    head: 'none', mark: 'none', prop: 'none', build: 'giant',
  },

  'shepherd-sommers': {
    note:
      'Race : Humain. Peau : claire. Cheveux : sombres, courts. Visage : ' +
      'étroit, traits sévères. Morphologie : mince. Vêtements : tenue claire ' +
      'de Chevalier de Dieu, cape, col haut. Accessoire : lunettes.',
    hair: '#241f1c', cut: 'short', skin: CLAIR, outfit: '#dde2ea',
    accessory: '#c9a227',
    extras: ['cape', 'high-collar'],
    face: 'long',
    eyes: 'narrow',
    brow: 'fierce',
    height: 'tall',
    head: 'none', mark: 'glasses', prop: 'none', build: 'slim',
  },

  'charlotte-perospero': {
    note:
      'Race : Humain. Peau : claire. Cheveux : roses, en spirale de sucre ' +
      'candi. Visage : long, langue démesurée. Morphologie : grande, mince. ' +
      'Vêtements : manteau à rayures, col haut. Arme : canne de sucre.',
    hair: '#e59ac2', cut: 'spiky', skin: CLAIR, outfit: '#f0d7e6',
    coat: '#c2477a',
    extras: ['high-collar', 'striped-suit'],
    face: 'long',
    eyes: 'narrow',
    brow: 'arched',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'cane', build: 'slim',
  },

  hatchan: {
    note:
      'Race : Homme-poisson, poulpe. Peau : rose-violacé. Cheveux : sombres, ' +
      'coupe courte. Visage : large, lèvres épaisses. Morphologie : ' +
      'imposante, six bras. Vêtements : haut ouvert, ceinture d’étoffe. ' +
      'Armes : plusieurs sabres.',
    hair: '#2c2230', cut: 'short', skin: '#c98fae', outfit: '#4e7f5e',
    frame: 'fishman',
    extras: ['open-vest', 'sash', 'fins'],
    face: 'round',
    eyes: 'wide',
    brow: 'neutral',
    height: 'tall',
    head: 'none', mark: 'none', prop: 'sword', build: 'broad',
  },

};

/** Le personnage a-t-il une signature écrite ? */
export function hasSignature(id: string): boolean {
  return Object.hasOwn(SIGNATURES, id);
}

export function signatureOf(id: string): Signature | null {
  return SIGNATURES[id] ?? null;
}
