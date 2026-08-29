/**
 * Âge et restrictions associées (cahier §114).
 *
 * ⚠️ Ce module **n'établit aucune conformité juridique**. Il fournit la
 * mécanique permettant d'appliquer des restrictions ; quelles restrictions
 * s'appliquent, dans quel pays, relève de l'audit du §122 qui n'est pas fait.
 * Les seuils ci-dessous sont des valeurs de travail, pas un avis juridique.
 *
 * Deux principes tenus :
 *
 *   1. **le serveur décide.** L'âge est recalculé à partir de la date de
 *      naissance stockée, jamais lu depuis une requête. Un client ne doit pas
 *      pouvoir annoncer « je suis majeur » ;
 *   2. **en cas d'inconnu, on restreint.** Une date de naissance absente
 *      donne les restrictions les plus fortes, pas les plus faibles.
 */

/** Majorité numérique retenue par défaut, faute d'audit par juridiction. */
export const ADULT_AGE = 18;

/**
 * En dessous, le traitement des données suppose l'accord d'un titulaire de
 * l'autorité parentale dans l'Union européenne. Les États membres peuvent
 * abaisser ce seuil jusqu'à 13 ans ; on retient le plus protecteur.
 */
export const PARENTAL_CONSENT_AGE = 16;

export type AgeBand = 'UNKNOWN' | 'CHILD' | 'TEEN' | 'ADULT';

/**
 * Âge révolu à une date donnée.
 *
 * Le calcul se fait sur les composantes de date, sans arithmétique sur les
 * millisecondes : un décalage horaire ne doit pas faire vieillir quelqu'un
 * d'un jour.
 */
export function ageOn(birthDate: Date, reference: Date): number {
  let age = reference.getUTCFullYear() - birthDate.getUTCFullYear();

  const monthDelta = reference.getUTCMonth() - birthDate.getUTCMonth();
  const dayDelta = reference.getUTCDate() - birthDate.getUTCDate();

  // L'anniversaire n'est pas encore passé cette année.
  if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) age -= 1;

  return age;
}

export function bandOf(birthDate: Date | null, reference: Date): AgeBand {
  if (!birthDate) return 'UNKNOWN';

  const age = ageOn(birthDate, reference);
  if (age >= ADULT_AGE) return 'ADULT';
  if (age >= PARENTAL_CONSENT_AGE) return 'TEEN';
  return 'CHILD';
}

export interface Restrictions {
  /** Peut engager une dépense en argent réel. */
  mayPurchase: boolean;
  /** Peut recevoir de la prospection commerciale. */
  mayReceiveMarketing: boolean;
  /** Peut accéder au Market interne (échange contre monnaie de jeu). */
  mayUseMarket: boolean;
  /** Un accord parental est requis avant tout traitement non nécessaire. */
  needsParentalConsent: boolean;
  /** Plafond de dépense sur une journée glissante, en centimes. */
  dailySpendCapCents: number;
  /** Explication affichable, en français, sans jargon. */
  reason: string;
}

/**
 * Restrictions applicables à une tranche d'âge.
 *
 * Le Market reste ouvert à tous : il n'échange que de la monnaie de jeu,
 * jamais de l'argent réel (cf. §17 du cahier des charges — cloisonnement de
 * l'économie). Ce qui est fermé aux mineurs, c'est l'achat en euros.
 */
export function restrictionsFor(band: AgeBand): Restrictions {
  switch (band) {
    case 'ADULT':
      return {
        mayPurchase: true,
        mayReceiveMarketing: true,
        mayUseMarket: true,
        needsParentalConsent: false,
        dailySpendCapCents: 5_000,
        reason: 'Compte majeur.',
      };

    case 'TEEN':
      return {
        mayPurchase: false,
        mayReceiveMarketing: false,
        mayUseMarket: true,
        needsParentalConsent: false,
        dailySpendCapCents: 0,
        reason:
          'Les achats en argent réel sont réservés aux comptes majeurs.',
      };

    case 'CHILD':
      return {
        mayPurchase: false,
        mayReceiveMarketing: false,
        mayUseMarket: true,
        needsParentalConsent: true,
        dailySpendCapCents: 0,
        reason:
          'Ce compte nécessite l’accord d’un parent et ne peut pas effectuer d’achat.',
      };

    case 'UNKNOWN':
    default:
      // Prudence : sans date de naissance, on ne peut pas affirmer la
      // majorité, donc on ne l'accorde pas.
      return {
        mayPurchase: false,
        mayReceiveMarketing: false,
        mayUseMarket: true,
        needsParentalConsent: false,
        dailySpendCapCents: 0,
        reason:
          'Indique ta date de naissance pour accéder aux achats.',
      };
  }
}

/** Raccourci : restrictions directement depuis la date de naissance. */
export function restrictionsForBirthDate(
  birthDate: Date | null,
  reference: Date,
): Restrictions {
  return restrictionsFor(bandOf(birthDate, reference));
}

/**
 * Une date de naissance est-elle plausible ?
 *
 * Rejette le futur et les âges absurdes. Ce n'est pas une vérification
 * d'identité — le cahier n'en prévoit pas — et il ne faut pas la présenter
 * comme telle : c'est une déclaration, filtrée des saisies impossibles.
 */
export function isPlausibleBirthDate(date: Date, reference: Date): boolean {
  if (Number.isNaN(date.getTime())) return false;
  if (date.getTime() > reference.getTime()) return false;
  return ageOn(date, reference) <= 120;
}
