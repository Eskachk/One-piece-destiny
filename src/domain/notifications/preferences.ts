import type { NotificationKind } from './notifications';

/**
 * Préférences de notification et routage par canal.
 *
 * Deux canaux seulement : **in-app** et **e-mail**. Le push n'existe pas dans
 * le projet — ni service worker, ni clé VAPID, ni abonnement — et déclarer un
 * canal qu'aucun code ne sert donnerait au joueur une case à cocher sans
 * effet. On l'ajoutera quand il y aura quelque chose derrière.
 *
 * Règle qui gouverne le module : **une notification de sécurité part
 * toujours.** Un joueur ne doit pas pouvoir se rendre aveugle à la prise de
 * contrôle de son propre compte, et un attaquant qui obtient une session ne
 * doit pas pouvoir couper l'alerte avant d'agir.
 */

export type NotificationChannel = 'IN_APP' | 'EMAIL';

/**
 * Catégories exposées au joueur. Volontairement peu nombreuses : quatre
 * interrupteurs compréhensibles valent mieux que quinze qu'on ne lit pas.
 */
export type NotificationCategory =
  | 'SECURITY' // connexion, mot de passe, MFA — non désactivable
  | 'WEEKLY' // verrouillage, résultats
  | 'REWARDS' // récompenses, coffres
  | 'MARKETING'; // nouveautés, annonces — désactivé par défaut

/** Catégories que le joueur peut réellement couper. */
export const OPTIONAL_CATEGORIES: readonly NotificationCategory[] = [
  'WEEKLY',
  'REWARDS',
  'MARKETING',
] as const;

/**
 * Le marketing est **désactivé par défaut** : dans l'Union européenne, une
 * prospection par e-mail suppose un consentement préalable, et un
 * consentement ne se présume pas. Les autres catégories sont du service, pas
 * de la prospection.
 */
export const DEFAULT_PREFERENCES: NotificationPreferences = {
  weeklyEmail: true,
  rewardsEmail: true,
  marketingEmail: false,
  weeklyInApp: true,
  rewardsInApp: true,
};

export interface NotificationPreferences {
  weeklyEmail: boolean;
  rewardsEmail: boolean;
  marketingEmail: boolean;
  weeklyInApp: boolean;
  rewardsInApp: boolean;
}

/** À quelle catégorie appartient chaque type de notification. */
export const CATEGORY_OF: Record<NotificationKind, NotificationCategory> = {
  CREW_LOCK_SOON: 'WEEKLY',
  CREW_LOCKED: 'WEEKLY',
  RESULTS_COMPUTING: 'WEEKLY',
  RESULTS_READY: 'WEEKLY',
  CHAPTER_CORRECTED: 'WEEKLY',
  REWARD_RECEIVED: 'REWARDS',
  SECURITY_ALERT: 'SECURITY',
};

export function isMandatory(category: NotificationCategory): boolean {
  return category === 'SECURITY';
}

/**
 * Canaux à emprunter pour une notification donnée.
 *
 * Retourne une liste, éventuellement vide. L'appelant n'a pas à connaître les
 * règles : il demande, il obtient les canaux autorisés.
 */
export function channelsFor(
  kind: NotificationKind,
  preferences: NotificationPreferences,
): NotificationChannel[] {
  const category = CATEGORY_OF[kind];

  // La sécurité ne se négocie pas : les deux canaux, quelles que soient les
  // préférences enregistrées.
  if (isMandatory(category)) return ['IN_APP', 'EMAIL'];

  const channels: NotificationChannel[] = [];

  if (category === 'WEEKLY') {
    if (preferences.weeklyInApp) channels.push('IN_APP');
    if (preferences.weeklyEmail) channels.push('EMAIL');
  } else if (category === 'REWARDS') {
    if (preferences.rewardsInApp) channels.push('IN_APP');
    if (preferences.rewardsEmail) channels.push('EMAIL');
  } else if (category === 'MARKETING') {
    // Le marketing n'a pas de canal in-app : une annonce commerciale ne doit
    // pas se mêler aux notifications de jeu.
    if (preferences.marketingEmail) channels.push('EMAIL');
  }

  return channels;
}

/**
 * Applique une mise à jour partielle en refusant tout ce qui n'est pas une
 * préférence connue.
 *
 * Le formulaire vient du navigateur : sans ce filtre, un champ inventé
 * pourrait se retrouver écrit tel quel en base.
 */
export function applyPreferenceUpdate(
  current: NotificationPreferences,
  update: Record<string, unknown>,
): NotificationPreferences {
  const next = { ...current };

  for (const key of Object.keys(DEFAULT_PREFERENCES) as (keyof NotificationPreferences)[]) {
    const value = update[key];
    if (typeof value === 'boolean') next[key] = value;
  }

  return next;
}
