/**
 * Les visites guidées, une par page du jeu (cahier §55, §111, §113).
 *
 * ## Pourquoi une par page, et pas une grande au début
 *
 * L'ancienne version était un unique diaporama de sept écrans, montré une fois
 * à l'arrivée, sur l'accueil. Il expliquait le jeu entier — la collection, le
 * marché, la boutique, le classement — à quelqu'un qui n'avait encore vu
 * aucune de ces pages. Tout y était dit au moment où rien ne pouvait s'y
 * rattacher, et plus rien n'était dit au moment où le joueur y arrivait
 * vraiment.
 *
 * Chaque page porte donc maintenant sa propre visite, courte, déclenchée la
 * première fois qu'on y met les pieds. Trois à sept écrans, jamais plus.
 *
 * ## Pourquoi les chiffres sont ici et pas en dur dans le texte
 *
 * L'ancien tutoriel annonçait « 40 points de présence », « jusqu'à 35 » de
 * synergie, « jusqu'à 25 » de risque. Son propre commentaire prévenait : « un
 * tutoriel qui ment sur les points est pire qu'un tutoriel absent. » C'étaient
 * les valeurs du moteur v2 ; le jeu tourne en v6 depuis, où elles valent 34,
 * 34 et 32. Le tutoriel mentait donc à tous les nouveaux joueurs, et rien ne
 * pouvait le signaler.
 *
 * D'où `CHIFFRES` : les valeurs sont nommées une fois, interpolées dans les
 * textes, et **`tutoriel.test.ts` les compare aux constantes des modules
 * d'origine**. Le jour où le moteur change de plafonds, c'est le test qui le
 * dit, pas un joueur.
 *
 * Ce détour évite en même temps d'importer le moteur de score dans un
 * composant client : `v6` tire le référentiel des personnages derrière lui,
 * soit sept cents fiches expédiées au navigateur pour afficher trois nombres.
 */

import type { Locale } from './i18n/locales';

/** Les pages qui portent une visite. Ce sont les six onglets de la barre. */
export type PageTutoriel =
  | 'accueil'
  | 'classement'
  | 'collection'
  | 'market'
  | 'boutique'
  | 'profil';

export interface Etape {
  titre: string;
  corps: string;
  /** Une phrase de repère : où regarder, ou la précision qui évite l'erreur. */
  repere?: string;
}

/**
 * Les valeurs citées dans les textes.
 *
 * Chacune est reliée à sa source par un test. Ne jamais écrire un nombre
 * directement dans une étape : c'est exactement comme ça que le tutoriel
 * précédent s'est mis à mentir.
 */
export const CHIFFRES = {
  /** `CAPS.base` du moteur courant. */
  base: 34,
  /** `CAPS.synergy`. */
  synergie: 34,
  /** `CAPS.risk`. */
  risque: 32,
  /** `CAPS.total`. */
  total: 100,
  /** `CONSENSUS`, en pourcentage : part du score qu'emporte l'unanimité. */
  consensus: 45,
  /** `MAX_QUESTIONS` des pronostics secondaires. */
  questions: 3,
  /** `BONUS_PAR_BONNE_REPONSE`, en Berries. */
  bonusQuestion: 100,
  /** `REFERRAL_BERRIES_REFERRER`, en Berries. */
  parrainage: 800,
} as const;

/**
 * L'exemple chiffré de l'étape « une carte nulle rapporte plus ».
 *
 * Ce ne sont pas des ordres de grandeur choisis pour l'effet : ce sont les
 * scores que rend le moteur sur un chapitre précis, et le test les recalcule.
 * C'est la seule façon honnête d'affirmer au joueur qu'un Commun bat un
 * Mythique — sinon on lui demande de nous croire sur parole, sur le point du
 * jeu qui compte le plus.
 *
 * Le chapitre : Luffy, Toto, Nefertari Vivi, Chaka et Crocodile apparaissent.
 * Le joueur a aligné Luffy, Toto et Vivi. Luffy est choisi par 85 % des
 * joueurs, Toto par 3 %.
 */
export const EXEMPLE = {
  /** Luffy — Mythique, présent, choisi par presque tout le monde. */
  vedette: 26,
  tauxVedette: 85,
  /** Toto — Commun, présent, entouré des siens, choisi par presque personne. */
  inconnu: 90,
  tauxInconnu: 3,
  /** Ce que Toto marque encore **sans apparaître**, pour ses seuls liens. */
  inconnuAbsent: 49,
} as const;

/**
 * Les étapes, page par page.
 *
 * Règles d'écriture tenues partout :
 *
 *   — **un titre est une affirmation**, jamais une étiquette. « La rareté ne
 *     donne aucun point » se retient ; « La collection » ne dit rien ;
 *   — **un corps fait deux ou trois phrases.** Au-delà, on ne lit plus, on
 *     passe — et un tutoriel qu'on passe ne vaut pas mieux que rien ;
 *   — **aucune étape ne décrit un bouton.** Le joueur voit les boutons ; ce
 *     qu'il ne voit pas, ce sont les règles qui décident de son score.
 */
const FR: Record<PageTutoriel, readonly Etape[]> = {
  accueil: [
    {
      titre: 'Deviner le prochain chapitre',
      corps:
        'Un nouveau chapitre paraît chaque semaine. Ton jeu : deviner qui y apparaîtra, avant qu’il sorte.',
      repere: 'Personne ne l’a lu. Aucun spoiler ne peut t’aider.',
    },
    {
      titre: 'Trois personnages, pas un de plus',
      corps:
        'Tu composes ton équipage avec trois personnages parmi ceux que tu possèdes. Tu peux en changer autant que tu veux jusqu’au dimanche 23:59:59.',
      repere: 'Ensuite tout se verrouille, et le chapitre sort.',
    },
    {
      titre: 'Ce que rapporte un personnage',
      corps: `${CHIFFRES.base} points s’il apparaît dans le chapitre. Jusqu’à ${CHIFFRES.synergie} de plus pour ses liens avec les autres personnages présents. Jusqu’à ${CHIFFRES.risque} pour l’improbabilité du pari. ${CHIFFRES.total} au maximum.`,
      repere:
        'Un absent perd la présence, mais garde une partie des liens qu’il avait bien vus.',
    },
    {
      titre: 'La rareté ne donne aucun point',
      corps:
        'Le moteur de score ne regarde jamais la rareté d’une carte. Elle dit ce qu’une carte vaut en collection, jamais ce qu’elle vaut au classement.',
      repere: 'C’est aussi pour ça qu’aucun achat ne peut te faire gagner.',
    },
    {
      titre: 'Une carte « nulle » rapporte plus qu’une vedette',
      corps: `Mesuré sur le vrai moteur. Luffy, choisi par ${EXEMPLE.tauxVedette} % des joueurs et bien présent au chapitre : ${EXEMPLE.vedette} points. Un Commun choisi par ${EXEMPLE.tauxInconnu} %, présent aux côtés des siens : ${EXEMPLE.inconnu} points.`,
      repere: `Un choix que tout le monde fait ne départage personne : il perd jusqu’à ${CHIFFRES.consensus} % de sa valeur.`,
    },
    {
      titre: 'Vise une scène, pas trois grands noms',
      corps:
        'Un lien ne se déclenche que si les deux personnages apparaissent dans le même chapitre. Trois célébrités sans rapport entre elles valent trois fois la présence et rien d’autre ; trois personnages d’un même camp se rapportent des points les uns aux autres.',
      repere: `Dans l’exemple précédent, ce Commun marquait encore ${EXEMPLE.inconnuAbsent} points sans même apparaître, pour ses seuls liens avec la scène.`,
    },
    {
      titre: 'Les questions bonus',
      corps: `Sous ton équipage, jusqu’à ${CHIFFRES.questions} questions sur le chapitre à venir. Chaque bonne réponse rapporte ${CHIFFRES.bonusQuestion} Berries.`,
      repere: 'Une mauvaise réponse ne rapporte rien, et ne coûte rien non plus.',
    },
  ],

  classement: [
    {
      titre: 'Ce que ton pari a donné',
      corps:
        'Ta place, ta prime de la semaine, et le détail de chaque personnage que tu avais aligné.',
    },
    {
      titre: 'Chaque point est justifié',
      corps:
        'Présence, liens, improbabilité, effet du consensus : le calcul est écrit ligne par ligne, personnage par personnage. Rien n’est arrondi en coulisse.',
      repere: 'Si un score te surprend, la raison est là.',
    },
    {
      titre: 'Le chapitre reste caché tant que tu veux',
      corps:
        'Les résultats parlent d’un chapitre que tu n’as peut-être pas encore lu. Ce qui pourrait le divulgâcher reste masqué jusqu’à ce que tu demandes à voir.',
    },
    {
      titre: 'Rien n’est recalculé après coup',
      corps:
        'Un classement publié ne bouge plus. Si les règles de score changent, elles ne s’appliquent qu’aux chapitres suivants : chacun garde la version avec laquelle il a été jugé.',
    },
  ],

  collection: [
    {
      titre: 'Tout ce que tu possèdes',
      corps:
        'Tes cartes, rangées par rareté et par série. C’est ici que tu vas chercher les trois personnages de ton équipage.',
    },
    {
      titre: 'Les coffres s’ouvrent en cérémonie',
      corps:
        'Chaque coffre est une petite mise en scène. Les probabilités de chaque rareté sont affichées avant l’ouverture, jamais après.',
      repere: 'Le tirage se fait sur le serveur, rien dans ton navigateur ne peut l’influencer.',
    },
    {
      titre: 'Un doublon n’est jamais perdu',
      corps:
        'Une carte que tu as déjà se transforme en fragments, et les fragments fabriquent la carte qui te manque.',
      repere: 'C’est le seul moyen de choisir précisément un personnage.',
    },
    {
      titre: 'La rareté est un plaisir, pas un avantage',
      corps:
        'Un Mythique ne rapporte pas un point de plus qu’un Commun. Il est plus rare à obtenir et plus beau à posséder, mais strictement égal devant le classement.',
    },
  ],

  market: [
    {
      titre: 'La Bourse des personnages',
      corps:
        'On y achète et on y vend des cartes contre des Berries, la monnaie que le jeu te verse chaque semaine.',
    },
    {
      titre: 'Les prix bougent tout seuls',
      corps:
        'Ils suivent ce que les joueurs achètent et vendent. Une carte que tout le monde cherche monte ; une carte dont tout le monde se sépare descend.',
    },
    {
      titre: 'Surveille sans acheter',
      corps:
        'Mets une carte en liste de surveillance pour suivre son prix sans t’engager.',
    },
    {
      titre: 'Aucun Berry n’achète un point',
      corps:
        'Le marché sert la collection, et seulement elle. Le classement, lui, ne se négocie pas.',
    },
  ],

  boutique: [
    {
      titre: 'Ce qui se vend ici',
      corps: 'Des coffres et des Berries, en argent réel.',
    },
    {
      titre: 'Rien n’est exclusif',
      corps:
        'Tout ce qui est en boutique s’obtient aussi en jouant. Payer abrège l’attente, ça n’ouvre aucune porte fermée.',
      repere: 'Les Berries gagnées chaque semaine ouvrent exactement les mêmes coffres.',
    },
    {
      titre: 'Les chances sont écrites avant l’achat',
      corps:
        'Les probabilités de chaque rareté sont affichées sur la page, à côté du prix.',
    },
    {
      titre: 'L’argent n’achète pas le classement',
      corps:
        'Comme la rareté ne donne aucun point, rien de ce qui est vendu ici ne peut te faire gagner une place.',
    },
  ],

  profil: [
    {
      titre: 'Ton parcours',
      corps:
        'Ton niveau, ta division, tes semaines passées et l’avancement de tes séries de collection.',
    },
    {
      titre: 'Ton style de jeu',
      corps:
        'Au bout de quelques semaines, le jeu déduit ta façon de parier : prudente, opportuniste, ou franchement téméraire.',
      repere: 'Aucun style ne rapporte plus qu’un autre.',
    },
    {
      titre: 'Parrainer rapporte',
      corps: `Ton lien de parrainage vaut ${CHIFFRES.parrainage} Berries par joueur qui reste, et davantage encore pour celui que tu amènes.`,
      repere: 'Il faut qu’il joue quelques chapitres. Un compte créé puis abandonné ne rapporte rien.',
    },
    {
      titre: 'Tes réglages sont ici',
      corps:
        'Notifications, affichage, protection du compte et fermeture : tout ce qui te concerne se règle depuis cette page.',
    },
  ],
};

const EN: Record<PageTutoriel, readonly Etape[]> = {
  accueil: [
    {
      titre: 'Guess the next chapter',
      corps:
        'A new chapter comes out every week. Your game: guess who will appear in it, before it is released.',
      repere: 'Nobody has read it. No spoiler can help you.',
    },
    {
      titre: 'Three characters, not one more',
      corps:
        'You build your crew from three characters you own. Change them as often as you like until Sunday 23:59:59.',
      repere: 'Then everything locks, and the chapter comes out.',
    },
    {
      titre: 'What a character earns',
      corps: `${CHIFFRES.base} points if they appear in the chapter. Up to ${CHIFFRES.synergie} more for their links with the other characters present. Up to ${CHIFFRES.risque} for how unlikely the bet was. ${CHIFFRES.total} at most.`,
      repere:
        'An absent character loses the presence points, but keeps part of the links they had rightly seen.',
    },
    {
      titre: 'Rarity gives no points',
      corps:
        'The scoring engine never looks at a card’s rarity. Rarity says what a card is worth in your collection, never what it is worth on the ranking.',
      repere: 'That is also why no purchase can make you win.',
    },
    {
      titre: 'A “worthless” card beats a star',
      corps: `Measured on the real engine. Luffy, picked by ${EXEMPLE.tauxVedette}% of players and present in the chapter: ${EXEMPLE.vedette} points. A Common picked by ${EXEMPLE.tauxInconnu}%, present alongside his own crew: ${EXEMPLE.inconnu} points.`,
      repere: `A choice everyone makes separates no one: it loses up to ${CHIFFRES.consensus}% of its value.`,
    },
    {
      titre: 'Aim for a scene, not three big names',
      corps:
        'A link only triggers if both characters appear in the same chapter. Three unrelated celebrities are worth three times the presence and nothing else; three characters from the same side earn points off each other.',
      repere: `In the previous example, that Common still scored ${EXEMPLE.inconnuAbsent} points without even appearing, for his links with the scene alone.`,
    },
    {
      titre: 'The bonus questions',
      corps: `Below your crew, up to ${CHIFFRES.questions} questions about the coming chapter. Each correct answer earns ${CHIFFRES.bonusQuestion} Berries.`,
      repere: 'A wrong answer earns nothing, and costs nothing either.',
    },
  ],

  classement: [
    {
      titre: 'What your bet produced',
      corps:
        'Your place, your bounty for the week, and the breakdown for every character you lined up.',
    },
    {
      titre: 'Every point is accounted for',
      corps:
        'Presence, links, unlikelihood, consensus effect: the calculation is written line by line, character by character. Nothing is rounded off backstage.',
      repere: 'If a score surprises you, the reason is right there.',
    },
    {
      titre: 'The chapter stays hidden as long as you want',
      corps:
        'The results talk about a chapter you may not have read yet. Anything that could spoil it stays hidden until you ask to see it.',
    },
    {
      titre: 'Nothing is recomputed afterwards',
      corps:
        'A published ranking never moves again. If the scoring rules change, they only apply to later chapters: each one keeps the version it was judged with.',
    },
  ],

  collection: [
    {
      titre: 'Everything you own',
      corps:
        'Your cards, sorted by rarity and by set. This is where you pick the three characters of your crew.',
    },
    {
      titre: 'Chests open with a ceremony',
      corps:
        'Every chest is a little show. The odds for each rarity are shown before opening, never after.',
      repere: 'The draw happens on the server, nothing in your browser can influence it.',
    },
    {
      titre: 'A duplicate is never wasted',
      corps:
        'A card you already own turns into shards, and shards craft the card you are missing.',
      repere: 'It is the only way to pick a character precisely.',
    },
    {
      titre: 'Rarity is a pleasure, not an edge',
      corps:
        'A Mythic does not earn a single point more than a Common. It is rarer to get and prettier to own, but strictly equal on the ranking.',
    },
  ],

  market: [
    {
      titre: 'The character exchange',
      corps:
        'Buy and sell cards for Berries, the currency the game pays you every week.',
    },
    {
      titre: 'Prices move on their own',
      corps:
        'They follow what players buy and sell. A card everyone wants goes up; a card everyone is letting go of goes down.',
    },
    {
      titre: 'Watch without buying',
      corps:
        'Put a card on your watchlist to follow its price without committing.',
    },
    {
      titre: 'No Berry buys a point',
      corps:
        'The market serves the collection, and only the collection. The ranking is not for sale.',
    },
  ],

  boutique: [
    {
      titre: 'What is sold here',
      corps: 'Chests and Berries, for real money.',
    },
    {
      titre: 'Nothing is exclusive',
      corps:
        'Everything in the shop can also be earned by playing. Paying shortens the wait; it opens no closed door.',
      repere: 'The Berries you earn each week open exactly the same chests.',
    },
    {
      titre: 'The odds are written before you buy',
      corps:
        'The probability of each rarity is shown on the page, next to the price.',
    },
    {
      titre: 'Money does not buy the ranking',
      corps:
        'Since rarity gives no points, nothing sold here can earn you a place.',
    },
  ],

  profil: [
    {
      titre: 'Your journey',
      corps:
        'Your level, your division, your past weeks and the progress of your collection sets.',
    },
    {
      titre: 'Your play style',
      corps:
        'After a few weeks, the game works out how you bet: cautious, opportunistic, or downright reckless.',
      repere: 'No style earns more than another.',
    },
    {
      titre: 'Referrals pay',
      corps: `Your referral link is worth ${CHIFFRES.parrainage} Berries for every player who stays, and even more for the one you bring in.`,
      repere: 'They need to play a few chapters. An account created and then abandoned earns nothing.',
    },
    {
      titre: 'Your settings live here',
      corps:
        'Notifications, display, account protection and closure: everything about you is managed from this page.',
    },
  ],
};

/**
 * Les visites, par langue puis par page.
 *
 * Les deux tables partagent `CHIFFRES` et `EXEMPLE` : un plafond qui change
 * dans le moteur se répercute dans les deux langues d'un coup, et le test qui
 * rejoue l'exemple sur le moteur vaut pour l'anglais comme pour le français.
 */
export const TUTORIELS: Record<Locale, Record<PageTutoriel, readonly Etape[]>> = {
  fr: FR,
  en: EN,
};
