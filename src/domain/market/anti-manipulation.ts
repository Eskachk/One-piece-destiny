/**
 * Anti-manipulation du Market (cahier §43).
 *
 * Le cahier liste ce qu'il faut prévoir : cooldown, détection de wash
 * trading, restrictions sur les comptes liés, limitation des annulations
 * répétées, historique complet, détection de comportements anormaux.
 *
 * Toutes les décisions sont ici, en fonctions pures : elles sont donc
 * testables sans base, et un litige peut être rejoué à l'identique.
 *
 * Principe transverse : **on refuse, on ne sanctionne pas.** Ces règles
 * bloquent une transaction suspecte ; elles ne bannissent personne. Une
 * détection automatique se trompe, un bannissement automatique se trompe
 * durablement.
 */

/** Délai minimal entre deux mises en vente par le même joueur. */
export const LISTING_COOLDOWN_MS = 60 * 1000;

/** Délai minimal avant de revendre une carte qu'on vient d'acheter. */
export const RESELL_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** Annulations tolérées sur la fenêtre d'observation. */
export const MAX_CANCELLATIONS = 5;
export const CANCELLATION_WINDOW_MS = 60 * 60 * 1000;

/**
 * Au-delà de ce nombre d'échanges entre deux mêmes comptes sur la fenêtre,
 * la relation est considérée comme du wash trading.
 */
export const WASH_TRADE_THRESHOLD = 3;
export const WASH_TRADE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export type ListingRefusal =
  | 'COOLDOWN'
  | 'TOO_MANY_CANCELLATIONS'
  | 'RECENTLY_PURCHASED';

export type PurchaseRefusal =
  | 'OWN_LISTING'
  | 'WASH_TRADING'
  | 'LINKED_ACCOUNT'
  | 'ALREADY_OWNED';

export type Decision<R> = { allowed: true } | { allowed: false; reason: R };

export interface ListingContext {
  /** Dernière mise en vente du joueur. */
  lastListingAt: Date | null;
  /** Annulations récentes, horodatées. */
  cancellations: Date[];
  /** Date d'acquisition de la carte, si elle vient du Market. */
  purchasedAt: Date | null;
  now: Date;
}

/**
 * Peut-on mettre une carte en vente ?
 *
 * Le délai de revente est la règle la plus importante des trois : sans lui,
 * acheter puis revendre instantanément permet de faire circuler une carte
 * entre comptes complices pour fabriquer un historique de prix.
 */
export function canList(context: ListingContext): Decision<ListingRefusal> {
  const { now } = context;

  if (
    context.lastListingAt &&
    now.getTime() - context.lastListingAt.getTime() < LISTING_COOLDOWN_MS
  ) {
    return { allowed: false, reason: 'COOLDOWN' };
  }

  const recentCancellations = context.cancellations.filter(
    (at) => now.getTime() - at.getTime() <= CANCELLATION_WINDOW_MS,
  );
  if (recentCancellations.length >= MAX_CANCELLATIONS) {
    return { allowed: false, reason: 'TOO_MANY_CANCELLATIONS' };
  }

  if (
    context.purchasedAt &&
    now.getTime() - context.purchasedAt.getTime() < RESELL_COOLDOWN_MS
  ) {
    return { allowed: false, reason: 'RECENTLY_PURCHASED' };
  }

  return { allowed: true };
}

export interface TradeRecord {
  buyerId: string;
  sellerId: string;
  at: Date;
}

export interface PurchaseContext {
  buyerId: string;
  sellerId: string;
  /** Le joueur possède-t-il déjà ce personnage ? */
  buyerOwnsCharacter: boolean;
  /** Historique des échanges entre ces deux comptes. */
  tradesBetween: TradeRecord[];
  /**
   * Signaux de comptes liés : même adresse IP d'inscription, même empreinte
   * d'appareil. Fourni par l'appelant, jamais déduit ici.
   */
  linkedAccount: boolean;
  now: Date;
}

/**
 * Peut-on acheter cette annonce ?
 *
 * L'ordre des refus va du plus certain au plus heuristique : posséder déjà la
 * carte est un fait, le wash trading est une présomption.
 */
export function canPurchase(
  context: PurchaseContext,
): Decision<PurchaseRefusal> {
  if (context.buyerId === context.sellerId) {
    return { allowed: false, reason: 'OWN_LISTING' };
  }

  // Racheter un personnage déjà possédé ne produirait qu'un doublon payé au
  // prix fort : on refuse plutôt que de laisser gaspiller des Berries.
  if (context.buyerOwnsCharacter) {
    return { allowed: false, reason: 'ALREADY_OWNED' };
  }

  if (context.linkedAccount) {
    return { allowed: false, reason: 'LINKED_ACCOUNT' };
  }

  const recent = context.tradesBetween.filter(
    (trade) =>
      context.now.getTime() - trade.at.getTime() <= WASH_TRADE_WINDOW_MS,
  );
  if (recent.length >= WASH_TRADE_THRESHOLD) {
    return { allowed: false, reason: 'WASH_TRADING' };
  }

  return { allowed: true };
}

export function describeListingRefusal(reason: ListingRefusal): string {
  switch (reason) {
    case 'COOLDOWN':
      return 'Attends une minute entre deux mises en vente.';
    case 'TOO_MANY_CANCELLATIONS':
      return 'Trop d\'annulations récentes. Réessaie plus tard.';
    case 'RECENTLY_PURCHASED':
      return 'Une carte achetée au Market ne peut être revendue qu\'après 24 h.';
  }
}

export function describePurchaseRefusal(reason: PurchaseRefusal): string {
  switch (reason) {
    case 'OWN_LISTING':
      return 'Tu ne peux pas acheter ta propre annonce.';
    case 'ALREADY_OWNED':
      return 'Tu possèdes déjà ce personnage.';
    case 'LINKED_ACCOUNT':
      // Message volontairement neutre : accuser à tort serait pire que
      // refuser sans expliquer.
      return 'Cette transaction ne peut pas être effectuée.';
    case 'WASH_TRADING':
      return 'Trop d\'échanges récents entre vos deux comptes.';
  }
}
