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

export function isCanon(id: string): boolean {
  return (
    !NON_CANON_IDS.has(id) &&
    !DUPLICATE_IDS.has(id) &&
    !FLASHBACK_ONLY_IDS.has(id)
  );
}
