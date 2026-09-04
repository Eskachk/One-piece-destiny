/**
 * Personnages hors manga — écartés du jeu.
 *
 * Le référentiel est importé d'api-onepiece.com, qui mélange trois origines
 * sans les distinguer : le manga, les films, et les épisodes hors-série de
 * l'animé. Le jeu, lui, se joue sur **le chapitre hebdomadaire**. Un
 * personnage qui n'existe que dans un film ne peut, par construction, jamais
 * apparaître dans un chapitre : le proposer à la sélection revient à vendre
 * une carte dont le score est nul d'avance.
 *
 * ## Ce que la liste contient
 *
 * Uniquement des personnages dont l'origine hors manga est certaine —
 * équipages entiers de films, essentiellement. Le doute joue **en faveur du
 * maintien** : garder un personnage discutable coûte une carte de peu
 * d'intérêt, en retirer un par erreur retire une carte que des joueurs
 * possèdent déjà.
 *
 * Quelques cas qui ressemblaient à des hors-manga et n'en sont pas, gardés
 * exprès parce que l'API les range sous des libellés trompeurs :
 *
 *   — **Boodle** et **Chouchou** (« Archipel des Argao ») — Orange Town,
 *     tome 2 ;
 *   — **Gaimon** (« Île des animaux étranges ») — tome 3 ;
 *   — **Montblanc Cricket**, **Masira**, **Shojo** (« Primate League ») —
 *     Jaya ;
 *   — **Elizabello II**, **Dagama**, les frères **Funk**, **Chinjao** —
 *     Dressrosa ;
 *   — **Wapol** et sa cour (« Royaume maléfique de Black Drum ») — Drum ;
 *   — **Shiki**, présent dans le tome 0 dessiné par Oda.
 *
 * Une carte retirée n'est pas effacée des collections en base : elle cesse
 * simplement d'être proposée, tirée et vendue. Voir `CHARACTER_INDEX`, qui
 * n'indexe plus que le canon — un identifiant hors canon encore stocké chez un
 * joueur s'affiche alors sous son identifiant brut plutôt que de faire échouer
 * la page.
 */

export const NON_CANON_IDS: ReadonlySet<string> = new Set([
  // --- Film 1 : One Piece, le film (1998) ---------------------------------
  'borodo',
  'akisu',

  // --- Film 2 : L'Aventure de l'Île de l'Horloge (2001) -------------------
  'bear-king',
  'honey-queen',
  'pin-joker',
  'boo-jack',
  'skunk-one',

  // --- Film 3 : Le Royaume de Chopper (2002) ------------------------------
  'wetton',
  'mobambi',
  'bigalo',
  'sarfunkel',

  // --- Film 4 : Dead End (2003) -------------------------------------------
  'general-gasparde',
  'needless',
  'biera',
  'shuraiya-bascud',
  'adelle-bascud',

  // --- Film 5 : La Malédiction de l'Épée Sacrée (2004) --------------------
  'saga',
  'toma',
  'bismarck',
  'boo-kong',
  'maya',
  'izaya',
  'lacos',

  // --- Film 6 : Le Baron Omatsuri (2005) ----------------------------------
  'omatsuri',
  'lily-carnation',

  // --- Film 7 : Le Soldat Mécanique Géant (2006) --------------------------
  'ratchet',
  'honki',
  'maji',
  'roba',

  // --- Film 10 : Strong World (2009) --------------------------------------
  // Shiki est gardé : il figure dans le tome 0 dessiné par Oda. Son équipage,
  // lui, n'existe que dans le film.
  'indigo',
  'scarlett-2',
  'billy',
  'xiao',

  // --- Film 12 : Film Z (2012) --------------------------------------------
  'zephyr',
  'ain',
  'bins',

  // --- Film 13 : Film Gold (2016) -----------------------------------------
  'gild-tesoro',
  'baccarat',
  'dice',
  'tanaka',
  'carina',

  // --- Film 14 : Stampede (2019) ------------------------------------------
  'douglas-bullet',
  'buena-festa',
  'ann',
  'donald-moderate',

  // --- Film 15 : Film Red (2022) ------------------------------------------
  'uta',
  'gordon',

  // --- OVA « Battez Ganzack ! » (1998) ------------------------------------
  'schneider',
  'buzz',

  // --- Épisodes hors-série de l'animé --------------------------------------
  'apis',
]);

/**
 * Doublons : deux fiches pour un seul personnage.
 *
 * L'API mélange les nominations françaises et anglaises sans les rapprocher.
 * Le même personnage entre donc deux fois dans le référentiel, sous deux
 * identifiants, avec deux fiches, deux illustrations et deux exemplaires à
 * collectionner — ce qui fausse d'un coup le tirage, la collection et le
 * Marché : la « paire » n'en est pas une, et deux cartes du même personnage
 * peuvent tenir dans un équipage.
 *
 * On garde la **nomination française**, puisque le site est en français.
 *
 * Liste distincte de `NON_CANON_IDS`, et ce n'est pas de la coquetterie : les
 * deux produisent le même effet mais pour des raisons opposées. Un personnage
 * de film est écarté parce qu'il ne peut pas apparaître dans un chapitre ; un
 * doublon est écarté bien qu'il le puisse — c'est son jumeau qui le
 * représente. Les fondre en une seule liste rendrait la seconde raison
 * invisible à la relecture.
 */
export const DUPLICATE_IDS: ReadonlySet<string> = new Set([
  // Buggy (anglais) et Baggy / Le Clown (français) sont le même personnage.
  'buggy',

  // Trafalgar Law, entré deux fois sous son nom court et son nom complet.
  // On garde `law`. La fiche en double portait les quatre liens d'équipage —
  // Bepo, Jean Bart, Shachi, Pingouin — et la mention de capitaine : les uns
  // et l'autre ont été repris sur `law` avant le retrait, et les quatre liens
  // entrants repointés. Retirer un doublon ne doit rien faire perdre.
  'trafalgar-d-water-law',

  // Koby, entré une seconde fois sous la transcription « Kobby ». On garde
  // `koby`, qui est la fiche complète : Légendaire, affilié à SWORD, lié à
  // Luffy, Garp et Helmeppo. Le doublon était Épique, ne portait que le grade
  // de colonel et des liens vers les amiraux — des liens d'institution, pas
  // d'équipage : les reprendre inventerait des synergies qui n'existent pas.
  'kobby',
]);

/**
 * Le personnage est-il **jouable** ?
 *
 * Vrai s'il vient du manga et qu'il n'est pas le doublon d'un autre. Le nom de
 * la fonction dit « canon » pour des raisons d'histoire ; ce qu'elle décide,
 * c'est l'entrée dans le jeu.
 */
/**
 * Personnages dont l'apparition en chapitre courant est **impossible**.
 *
 * Ils sont morts dans l'œuvre : leur seule apparition possible est un
 * souvenir. Les laisser jouables revenait à proposer un pari qui ne peut pas
 * être gagné — et le moteur de score, qui les tenait pour des valeurs sûres,
 * leur accordait en plus un bonus de risque minimal. C'étaient les cartes les
 * plus mauvaises du jeu, sans que rien le signale.
 *
 * ## Ce qui n'est **pas** dans cette liste
 *
 * Les personnages « évoqués ». Le document de récurrence distingue les deux, et
 * la confusion serait une faute : un personnage évoqué est vivant, simplement
 * hors champ — Law, Kid, Hawkins, Apoo. Il peut revenir au prochain chapitre,
 * et le retirer priverait le joueur d'un pari parfaitement légitime.
 *
 * Big Mom non plus : vaincue mais vivante. La retirer serait un jugement sur
 * l'intrigue, pas la constatation d'un fait.
 */
export const FLASHBACK_ONLY_IDS: ReadonlySet<string> = new Set([
  'gol-d-roger',
  'edward-newgate-barbe-blanche',
  'portgas-d-ace',
  'ficher-tiger',
  'oden-kozuki',
  'toki-kozuki',
  'rocks-d-xebec',
  'don-quijote-rosinante',
  'kuina',
  'hiluluk',
  'pedro',
  'ashura-doji',
  'sukiyaki-kozuki',
]);

/**
 * Communs de fond de tableau, retirés du jeu.
 *
 * Deux cents personnages Communs sans description physique écrite et que le
 * document de récurrence ne cite nulle part. Ils remplissaient la collection
 * sans jamais rien y apporter : ils n'apparaissent pas dans le chapitre, et
 * leur carte ne montre qu'une figurine générique.
 *
 * ## Pourquoi deux cents et pas trois cent trente
 *
 * Trois cent trente entraient dans cette définition. Les retirer tous aurait
 * laissé vingt-trois Communs, et le tirage se serait inversé : un « Rare »
 * serait devenu la carte la plus fréquente du jeu. Ce n'est pas un réglage à
 * corriger, c'est l'échelle des raretés qui perd son sens.
 *
 * Le seuil vient d'un calcul. Sur une saison d'une vingtaine de semaines, un
 * joueur tire une soixantaine de cartes dont environ trois quarts de Communs.
 * En dessous de cent cinquante Communs distincts, il reverrait sans cesse les
 * mêmes, et le socle de la collection cesserait d'être une collection. Il en
 * reste cent cinquante-trois, et Commun demeure le tirage le plus fréquent :
 * 59 pour cent, contre 31 de Rares.
 *
 * ## Lesquels
 *
 * **Les moins reliés.** Le classement porte sur la somme des relations, des
 * affiliations et des capacités — ce dont le moteur de synergie se nourrit,
 * donc la mesure la plus proche de « tertiaire » qu'on puisse tirer des
 * données plutôt que d'une opinion.
 *
 * Le mot juste est « les moins reliés », pas « les non reliés » : deux
 * seulement n'avaient aucun lien. Les retirés en comptent 4,8 en moyenne
 * contre 9,2 pour les Communs conservés — on retire la moitié la plus pauvre,
 * pas des cartes vides.
 */
export const BACKGROUND_IDS: ReadonlySet<string> = new Set([
  'a-o',
  'abdullah',
  'agsilly',
  'amadob',
  'and',
  'andre',
  'arhur',
  'babe',
  'baboumaru',
  'baggaley',
  'banchina',
  'bankro',
  'bas',
  'bee-anne',
  'belmer',
  'bizarre',
  'blenheim',
  'blondie',
  'blumarine',
  'bobby-funk',
  'boddin',
  'bokuden',
  'boodle',
  'bourdon-jr',
  'braham',
  'brew',
  'brocca',
  'broggy',
  'bulter',
  'calgara',
  'canard',
  'cands',
  'canne',
  'carotte',
  'carrot',
  'cb-galant',
  'cesar-clown',
  'chabo',
  'charlotte-pets',
  'chess',
  'chimney',
  'chinjao',
  'cho',
  'choi',
  'chouchou',
  'clover',
  'cocoa',
  'colonel-mugren',
  'colscon',
  'cowboy',
  'crocus',
  'curiel',
  'dagama',
  'das-bones',
  'delacuaji',
  'den',
  'disco',
  'doma',
  'don-quijote-homing',
  'don-quijote-myosgard',
  'donquino',
  'duval',
  'elio',
  'elmy',
  'ener',
  'epoida',
  'ethanbaron-v-nusjuro',
  'forliewbs',
  'freres-decalvan',
  'fuga',
  'fukuro',
  'gaimone',
  'ganryu',
  'ganzo',
  'gatz',
  'gedatsu',
  'genbo',
  'genzo',
  'ginrummy',
  'giovanni',
  'goki',
  'gonbei',
  'great-micheal',
  'hacha',
  'hack',
  'hangan',
  'happygun',
  'haredas',
  'heaby',
  'heracles',
  'hikoichi',
  'hoe',
  'hotdog',
  'imu-neronna',
  'inbi',
  'ipponmatsu',
  'islewan',
  'ivan-x',
  'jacsonbaner',
  'jaki',
  'jarl',
  'jaygarcia-saturn',
  'jeet',
  'jerry',
  'johny',
  'jorl',
  'juki',
  'julius',
  'kaashii',
  'kabu',
  'kaloo',
  'kamakiri',
  'karma',
  'kechatch',
  'keimi',
  'kelly-funk',
  'kentaros',
  'kerville',
  'kinga',
  'kingbaum',
  'kingdew',
  'kiwi',
  'kokoro',
  'komachiyo',
  'koza',
  'kumadori',
  'kunyun',
  'kuromarimo',
  'laboon',
  'laki',
  'longs-cils',
  'madaisky-mizuta',
  'maha',
  'marcus-mars',
  'mawaritovsky-mizuta',
  'max-marks',
  'mc-guy',
  'megalo',
  'millet-pine',
  'ministre-dextre',
  'ministre-senestre',
  'minochihuabua',
  'minokoala',
  'minorhinoceros',
  'minozebre',
  'miss-monday',
  'montblanc-norland',
  'moon-isaac-jr',
  'morgans',
  'morge',
  'mr-9',
  'mr-momora',
  'musshuru',
  'nangi',
  'nero',
  'nico-olvia',
  'ninth',
  'nojiko',
  'oignon',
  'pandaman',
  'patty',
  'piment',
  'portgas-d-rouge',
  'punk-01-shaka',
  'punk-02-lilith',
  'punk-03-edison',
  'punk-04-pythagoras',
  'punk-05-atlas',
  'punk-06-york',
  'rangram',
  'rock',
  'rowing',
  's-bear',
  's-hawk',
  's-shark',
  's-snake',
  'sanjuan-wolf-2',
  'sarquiss',
  'scotch',
  'shakuyaku',
  'shelly',
  'shepherd-ju-peter',
  'shojo',
  'smiley',
  'spencer',
  'tobio',
  'tonjit',
  'topman-warcury',
  'turco',
  'vegapunk',
  'vegapunk-atlas',
  'vegapunk-edison',
  'vegapunk-pythagoras',
  'vegapunk-shaka',
  'vegapunk-york',
  'wanze',
  'yamon',
  'yui',
  'zeff',
  'zenny',
]);

export function isCanon(id: string): boolean {
  return (
    !NON_CANON_IDS.has(id) &&
    !DUPLICATE_IDS.has(id) &&
    !FLASHBACK_ONLY_IDS.has(id) &&
    !BACKGROUND_IDS.has(id)
  );
}
