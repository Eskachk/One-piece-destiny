/**
 * Configuration anti-abus (cahier §43).
 *
 * **Tous les seuils sont ici, aucun dans la logique métier.** Ces valeurs
 * bougeront — c'est leur nature : un seuil anti-fraude qui ne bouge jamais est
 * un seuil que personne n'a mesuré. Les enfouir dans les contrôleurs
 * obligerait à relire du code métier pour les ajuster.
 *
 * ⚠️ Ces valeurs ne doivent **jamais** être envoyées au navigateur (§40). Ce
 * module est importé exclusivement côté serveur ; le joueur ne reçoit qu'un
 * message générique lorsqu'une restriction s'applique.
 */

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Poids des signaux.
 *
 * Réglés pour qu'**aucun signal seul n'atteigne le seuil de restriction**.
 * C'est la règle §5 du cadrage, traduite en arithmétique plutôt qu'en
 * intention : partager une adresse IP vaut 20 points, il en faut 70 pour
 * restreindre. Un foyer ne peut donc pas être restreint par le seul fait
 * d'être un foyer.
 */
export const SIGNAL_WEIGHTS = {
  /** Compte de moins de 24 h. Presque tout le monde le devient un jour. */
  NEW_ACCOUNT: 5,
  /** Plusieurs comptes partagent le même contexte technique d'inscription. */
  RELATED_ACCOUNTS: 20,
  /** Cadence d'ouverture de coffres anormale. */
  RAPID_CHEST_OPENING: 10,
  /** Le compte n'a jamais verrouillé d'équipage : il ne joue pas. */
  NO_GAMEPLAY: 10,
  /** Valeur sortie du compte peu après son arrivée. */
  RAPID_VALUE_TRANSFER: 20,
  /** Plusieurs comptes liés alimentent le même bénéficiaire. */
  COMMON_BENEFICIARY: 25,
  /** Grappe de filleuls inactifs sous le même parrain. */
  REFERRAL_CLUSTER: 15,
  /** Échanges circulaires entre deux comptes. */
  WASH_TRADING: 30,
  /** Le trajet complet coffre d'inscription → Market → même compte. */
  WELCOME_VALUE_FARMING: 30,
} as const;

export type SignalName = keyof typeof SIGNAL_WEIGHTS;

/**
 * Seuils de niveau.
 *
 * Bornes **inférieures**. Le score est plafonné à 100 par le moteur : sans
 * plafond, empiler six signaux moyens dépasserait n'importe quel seuil et
 * rendrait la graduation illusoire.
 */
export const RISK_LEVELS = {
  NORMAL: 0,
  LOW_RISK: 30,
  REVIEW: 50,
  RESTRICTED: 70,
  HIGH_RISK: 85,
} as const;

export type RiskLevel = keyof typeof RISK_LEVELS;

/** Limites de cadence. */
export const VELOCITY = {
  /** Comptes créés depuis un même contexte technique. */
  signup: { max: 3, windowMs: 24 * HOUR },
  /** Coffres ouverts par un même compte. */
  chestOpening: { max: 30, windowMs: HOUR },
  /** Filleuls récompensés pour un même parrain. */
  referral: { max: 5, windowMs: 7 * DAY },
  /** Annonces déposées par un même compte. */
  marketListing: { max: 20, windowMs: HOUR },
} as const;

/**
 * Verrou des cartes du coffre d'inscription.
 *
 * C'est la protection **la plus rentable** du dispositif, et de loin. Elle ne
 * détecte rien, ne se trompe sur personne, et coupe pourtant net le circuit
 * « 100 comptes → 100 coffres → tout revendre sur le compte principal » :
 * la valeur existe, mais elle est immobile pendant sept jours. Fabriquer des
 * comptes cesse d'être rentable sans qu'un seul joueur légitime soit accusé
 * de quoi que ce soit.
 */
export const STARTER_CARD_LOCK_MS = 7 * DAY;

/**
 * Délai avant qu'un compte neuf puisse vendre.
 *
 * Complète le verrou précédent : sans lui, un compte fabriqué pourrait
 * revendre les cartes de ses coffres *achetés* dès la première minute.
 */
export const MARKET_ACCESS_DELAY_MS = 24 * HOUR;

/** Fenêtre d'observation des flux économiques. */
export const ECONOMIC_WINDOW_MS = 14 * DAY;

/**
 * Un transfert est « rapide » — donc suspect — s'il suit de peu l'acquisition.
 * Un joueur qui revend garde généralement sa carte plus longtemps.
 */
export const RAPID_TRANSFER_MS = 2 * HOUR;

/**
 * Nombre maximal de comptes autorisés par personne (règle affichée aux
 * joueurs). Au-delà, les comptes excédentaires sont considérés comme des
 * comptes secondaires au sens des règles du bord.
 */
export const MAX_ACCOUNTS_PER_PERSON = 2;
