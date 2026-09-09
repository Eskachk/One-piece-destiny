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
export const TUTORIELS: Record<PageTutoriel, readonly Etape[]> = {
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
      repere: 'Une mauvaise réponse ne coûte rien : elle ne rapporte pas.',
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
      repere: 'Le tirage se fait sur le serveur : rien dans ton navigateur ne peut l’influencer.',
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
      repere: 'C’est un miroir, pas une note : aucun style ne rapporte plus qu’un autre.',
    },
    {
      titre: 'Parrainer rapporte',
      corps: `Ton lien de parrainage vaut ${CHIFFRES.parrainage} Berries par joueur qui reste, et davantage encore pour celui que tu amènes.`,
      repere: 'Il faut qu’il joue quelques chapitres : un compte créé puis abandonné ne rapporte rien.',
    },
    {
      titre: 'Tes réglages sont ici',
      corps:
        'Notifications, affichage, protection du compte et fermeture : tout ce qui te concerne se règle depuis cette page.',
    },
  ],
};
