/**
 * Parrainage (cahier §71).
 *
 * « Rester simple. Inviter un ami → petite récompense pour les deux. Limiter
 * les abus et éviter les systèmes de spam. »
 *
 * Trois garde-fous en découlent :
 *
 *   1. la récompense est **petite et unique** — pas de pyramide où parrainer
 *      devient plus rentable que jouer ;
 *   2. un filleul ne peut être parrainé qu'une fois, jamais par lui-même ;
 *   3. un plafond de filleuls récompensés, pour qu'un générateur de comptes
 *      ne devienne pas une source de revenus.
 */

/**
 * Dotation d'inscription, en Berries.
 *
 * Un coffre coûte 1 500 Berries : un nouveau joueur arrive donc avec de quoi
 * en ouvrir un, et un joueur venu par une invitation avec de quoi en ouvrir
 * deux. Le repère est volontairement lisible — « une invitation = un coffre de
 * plus » se comprend sans calcul.
 */
export const SIGNUP_BERRIES = 1_500;
export const SIGNUP_BERRIES_REFERRED = 3_000;

/**
 * Ce que touche le parrain, **par filleul qui a réellement joué**.
 *
 * Le montant est le point d'équilibre du système, et il est contraint des deux
 * côtés :
 *
 *   — trop bas, personne n'invite et la fonction ne sert à rien ;
 *   — trop haut, fabriquer des comptes rapporte plus que jouer, et le
 *     classement se remplit de coquilles vides (§43).
 *
 * 800 vaut un peu plus d'un demi-coffre. À comparer aux 200 Berries de la
 * participation hebdomadaire : un parrainage pèse quatre semaines de présence,
 * ce qui reste une vraie récompense sans dépasser le jeu lui-même.
 *
 * Le garde-fou décisif n'est pas le montant mais **le moment du versement** :
 * rien n'est payé à l'inscription. Le parrain n'est crédité que lorsque son
 * filleul a confirmé son adresse et joué trois chapitres — voir
 * {@link REFERRAL_MIN_CHAPTERS}. Un générateur de comptes ne franchit pas ces
 * étapes ; un ami ramené, oui. C'est exactement la rejouabilité qu'on cherche
 * à récompenser.
 */
export const REFERRAL_BERRIES_REFERRER = 800;

/** Au-delà, les parrainages restent enregistrés mais ne rapportent plus. */
export const MAX_REWARDED_REFERRALS = 5;

/**
 * Ce qu'un filleul doit avoir fait pour que son parrain soit payé.
 *
 * Le seuil était : **un** équipage verrouillé. Trop bas. Fabriquer un compte,
 * ouvrir le coffre d'arrivée et cliquer trois personnages prend deux minutes,
 * ne demande aucune adresse valide, et rapportait 800 Berries. Multiplié par
 * dix filleuls, c'était plus rentable que de jouer — exactement ce que le §43
 * demande d'empêcher.
 *
 * Trois conditions cumulatives, choisies parce qu'elles coûtent chacune
 * quelque chose de différent à un fabricant de comptes :
 *
 *   1. **adresse e-mail confirmée** — il faut une boîte qui reçoit. C'est le
 *      filtre le moins contournable des trois ;
 *   2. **participation à {@link REFERRAL_MIN_CHAPTERS} chapitres distincts** —
 *      donc à trois semaines différentes. Le temps ne s'automatise pas : c'est
 *      la seule barrière qu'un script ne peut pas franchir plus vite ;
 *   3. **empreinte d'inscription différente de celle du parrain** — se
 *      parrainer soi-même depuis la même connexion ne paie plus.
 *
 * Le montant, lui, ne bouge pas : c'est le moment du versement qui protège,
 * pas sa taille. Le plafond passe en revanche de dix à cinq — au-delà de cinq
 * amis réellement ramenés, on est dans le recrutement, plus dans le bouche à
 * oreille.
 */
export const REFERRAL_MIN_CHAPTERS = 3;

export type ReferralHoldReason =
  | 'EMAIL_UNVERIFIED'
  | 'NOT_ENOUGH_CHAPTERS'
  | 'LINKED_ACCOUNTS';

export interface ReferralMaturity {
  emailVerified: boolean;
  chaptersPlayed: number;
  sharesSignupFingerprint: boolean;
}

export type ReferralPayoutDecision =
  | { pay: true }
  | { pay: false; hold: ReferralHoldReason };

/**
 * Le filleul a-t-il assez joué pour que le parrainage soit honoré ?
 *
 * Fonction pure : chaque refus se teste sans base ni réseau.
 */
export function evaluateReferralPayout(
  maturity: ReferralMaturity,
): ReferralPayoutDecision {
  if (maturity.sharesSignupFingerprint) {
    return { pay: false, hold: 'LINKED_ACCOUNTS' };
  }
  if (!maturity.emailVerified) {
    return { pay: false, hold: 'EMAIL_UNVERIFIED' };
  }
  if (maturity.chaptersPlayed < REFERRAL_MIN_CHAPTERS) {
    return { pay: false, hold: 'NOT_ENOUGH_CHAPTERS' };
  }
  return { pay: true };
}

export function describeReferralProgress(maturity: ReferralMaturity): string {
  const decision = evaluateReferralPayout(maturity);
  if (decision.pay) return 'Parrainage validé.';

  switch (decision.hold) {
    case 'LINKED_ACCOUNTS':
      return 'Parrainage non récompensé : les deux comptes se sont inscrits depuis la même connexion.';
    case 'EMAIL_UNVERIFIED':
      return 'En attente : ton filleul doit confirmer son adresse e-mail.';
    case 'NOT_ENOUGH_CHAPTERS':
      return `En attente : ton filleul a joué ${maturity.chaptersPlayed} chapitre${maturity.chaptersPlayed > 1 ? 's' : ''} sur ${REFERRAL_MIN_CHAPTERS}.`;
  }
}

/**
 * Lien d'invitation.
 *
 * Le joueur partage une URL, jamais un code à recopier : le filleul clique, et
 * son bonus lui est acquis sans qu'il ait rien à saisir ni à comprendre. Le
 * code reste dans l'adresse — il faut bien transporter l'information — mais il
 * n'est plus demandé à personne.
 */
export function referralLink(origin: string, code: string): string {
  return `${origin.replace(/\/+$/, '')}/r/${encodeURIComponent(code)}`;
}

const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const CODE_LENGTH = 8;

/**
 * Code lisible : sans les caractères qui se confondent — `I` avec `1`, `O`
 * avec `0`. Les voyelles restent, contrairement à ce que ce commentaire a
 * longtemps affirmé : l'alphabet ci-dessus contient A, E, U et Y.
 *
 * Utilise l'API Web Crypto plutôt que `node:crypto` : ce module est importé
 * par un composant client pour ses constantes, et une dépendance Node y
 * casserait le bundle navigateur.
 *
 * Le rejet des valeurs hors du plus grand multiple de l'alphabet évite le
 * biais modulo : sans lui, les premières lettres sortiraient plus souvent.
 */
export function generateReferralCode(): string {
  const limit = Math.floor(256 / CODE_ALPHABET.length) * CODE_ALPHABET.length;
  let code = '';

  while (code.length < CODE_LENGTH) {
    const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
    for (const byte of bytes) {
      if (byte >= limit) continue;
      code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
      if (code.length === CODE_LENGTH) break;
    }
  }

  return code;
}

export function normalizeReferralCode(input: string): string {
  return input.trim().toUpperCase().replace(/[\s-]/g, '');
}

export type ReferralRefusal =
  | 'UNKNOWN_CODE'
  | 'SELF_REFERRAL'
  | 'ALREADY_REFERRED'
  | 'ACCOUNT_TOO_OLD';

export type ReferralDecision =
  | { allowed: true; rewarded: boolean }
  | { allowed: false; reason: ReferralRefusal };

/**
 * Fenêtre pendant laquelle un nouveau compte peut saisir un code.
 *
 * Sans elle, un joueur installé pourrait se faire parrainer après coup par un
 * complice : le parrainage récompenserait alors une inscription qui a déjà eu
 * lieu.
 */
export const REFERRAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface ReferralContext {
  referrerId: string | null;
  referredId: string;
  alreadyReferred: boolean;
  /** Parrainages déjà récompensés du parrain. */
  referrerRewardedCount: number;
  referredAccountCreatedAt: Date;
  now: Date;
}

export function evaluateReferral(
  context: ReferralContext,
): ReferralDecision {
  if (!context.referrerId) {
    return { allowed: false, reason: 'UNKNOWN_CODE' };
  }
  if (context.referrerId === context.referredId) {
    return { allowed: false, reason: 'SELF_REFERRAL' };
  }
  if (context.alreadyReferred) {
    return { allowed: false, reason: 'ALREADY_REFERRED' };
  }

  const age =
    context.now.getTime() - context.referredAccountCreatedAt.getTime();
  if (age > REFERRAL_WINDOW_MS) {
    return { allowed: false, reason: 'ACCOUNT_TOO_OLD' };
  }

  // Le lien est enregistré même au-delà du plafond : seule la récompense
  // s'arrête. On garde ainsi la traçabilité sans encourager le volume.
  return {
    allowed: true,
    rewarded: context.referrerRewardedCount < MAX_REWARDED_REFERRALS,
  };
}

export function describeReferralRefusal(reason: ReferralRefusal): string {
  switch (reason) {
    case 'UNKNOWN_CODE':
      return 'Ce code de parrainage est inconnu.';
    case 'SELF_REFERRAL':
      return 'Tu ne peux pas te parrainer toi-même.';
    case 'ALREADY_REFERRED':
      return 'Tu as déjà été parrainé.';
    case 'ACCOUNT_TOO_OLD':
      return 'Le parrainage se saisit dans les 7 jours suivant l\'inscription.';
  }
}
