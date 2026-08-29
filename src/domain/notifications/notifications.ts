/**
 * Notifications (cahier §108).
 *
 * Le cahier donne les moments qui comptent : rappel avant verrouillage,
 * confirmation du verrouillage, calcul en cours, résultats disponibles.
 *
 * Deux règles que ce module s'impose :
 *
 *   1. **aucune notification ne révèle un résultat** avant publication (§3).
 *      « Les résultats sont en cours de calcul » est le maximum autorisé ;
 *   2. chaque notification porte une clé de déduplication (§92) : republier
 *      un chapitre ne doit pas notifier deux fois les mêmes joueurs.
 */

export type NotificationKind =
  | 'CREW_LOCK_SOON'
  | 'CREW_LOCKED'
  | 'RESULTS_COMPUTING'
  | 'RESULTS_READY'
  | 'CHAPTER_CORRECTED'
  | 'REWARD_RECEIVED'
  | 'SECURITY_ALERT';

export interface NotificationDraft {
  kind: NotificationKind;
  title: string;
  body?: string;
  href?: string;
  /** Rend l'écriture idempotente : même clé, une seule notification. */
  dedupeKey: string;
}

/** Rappel avant l'échéance du dimanche (cahier §108). */
export function crewLockSoon(
  playerId: string,
  chapterId: string,
): NotificationDraft {
  return {
    kind: 'CREW_LOCK_SOON',
    title: '⚠️ Ton équipage se verrouille ce soir.',
    body: 'Dernière ligne droite pour ajuster ta prédiction.',
    href: '/',
    dedupeKey: `lock-soon:${chapterId}:${playerId}`,
  };
}

export function crewLocked(
  playerId: string,
  chapterId: string,
): NotificationDraft {
  return {
    kind: 'CREW_LOCKED',
    title: '🔒 Ton équipage est verrouillé.',
    href: '/',
    dedupeKey: `locked:${chapterId}:${playerId}`,
  };
}

/**
 * Calcul en cours.
 *
 * Volontairement muette sur le contenu : à ce stade le chapitre est sorti
 * mais les résultats ne sont pas publiés. Annoncer quoi que ce soit de plus
 * ferait de la notification un canal de spoiler.
 */
export function resultsComputing(
  playerId: string,
  chapterId: string,
): NotificationDraft {
  return {
    kind: 'RESULTS_COMPUTING',
    title: '🏴‍☠️ Les résultats du chapitre sont en cours de calcul.',
    dedupeKey: `computing:${chapterId}:${playerId}`,
  };
}

export function resultsReady(
  playerId: string,
  chapterId: string,
  chapterNumber: number,
): NotificationDraft {
  return {
    kind: 'RESULTS_READY',
    title: `🏆 Les résultats du chapitre ${chapterNumber} sont là.`,
    body: 'Découvre ton classement et le détail de ta prédiction.',
    href: '/classement',
    dedupeKey: `ready:${chapterId}:${playerId}`,
  };
}

export function rewardReceived(
  playerId: string,
  chapterId: string,
  berries: number,
  chests: number,
): NotificationDraft {
  const parts = [
    berries > 0 ? `${berries} Berries` : null,
    chests > 0 ? `${chests} coffre${chests > 1 ? 's' : ''}` : null,
  ].filter(Boolean);

  return {
    kind: 'REWARD_RECEIVED',
    title: `🎁 Récompense : ${parts.join(' et ')}.`,
    href: '/collection',
    dedupeKey: `reward:${chapterId}:${playerId}`,
  };
}

/**
 * Correction d'un chapitre déjà publié (cahier §79).
 *
 * Le cahier l'exige : « aucune correction silencieuse ». Un joueur dont le
 * score change doit l'apprendre, et savoir pourquoi.
 */
export function chapterCorrected(
  playerId: string,
  chapterId: string,
  chapterNumber: number,
  reason: string,
  correctionId: string,
): NotificationDraft {
  return {
    kind: 'CHAPTER_CORRECTED',
    title: `Le chapitre ${chapterNumber} a été corrigé.`,
    body: reason,
    href: '/classement',
    // La clé inclut la correction : deux corrections successives notifient
    // bien deux fois, ce qui est le comportement voulu.
    dedupeKey: `corrected:${correctionId}:${playerId}`,
  };
}

/**
 * Événements de sécurité sur le compte (mot de passe changé, MFA modifiée,
 * connexion depuis un appareil inconnu).
 *
 * Cette catégorie n'est pas désactivable : c'est souvent la seule chose qui
 * prévient la victime d'une prise de contrôle, et un attaquant disposant
 * d'une session ne doit pas pouvoir éteindre l'alarme avant d'agir.
 *
 * Le libellé décrit **ce qui a changé**, jamais la valeur nouvelle : une
 * alerte ne doit pas devenir elle-même une fuite.
 */
export type SecurityEvent =
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET'
  | 'MFA_ENABLED'
  | 'MFA_DISABLED'
  | 'RECOVERY_CODES_REGENERATED'
  | 'EMAIL_CHANGED';

const SECURITY_LABEL: Record<SecurityEvent, string> = {
  PASSWORD_CHANGED: 'Ton mot de passe a été modifié.',
  PASSWORD_RESET: 'Ton mot de passe a été réinitialisé.',
  MFA_ENABLED: 'La double authentification a été activée sur ton compte.',
  MFA_DISABLED: 'La double authentification a été désactivée sur ton compte.',
  RECOVERY_CODES_REGENERATED: 'Tes codes de secours ont été régénérés.',
  EMAIL_CHANGED: 'L’adresse e-mail de ton compte a été modifiée.',
};

export function securityAlert(
  playerId: string,
  event: SecurityEvent,
  occurredAt: Date,
): NotificationDraft {
  return {
    kind: 'SECURITY_ALERT',
    title: `🔐 ${SECURITY_LABEL[event]}`,
    body: "Si tu n'es pas à l'origine de ce changement, réinitialise ton mot de passe immédiatement.",
    href: '/profil',
    // L'horodatage à la seconde distingue deux événements identiques
    // successifs, sans laisser passer le doublon d'un même envoi rejoué.
    dedupeKey: `security:${event}:${playerId}:${Math.floor(occurredAt.getTime() / 1000)}`,
  };
}
