import 'server-only';

import type { NotificationDraft } from '@/domain/notifications/notifications';
import {
  applyPreferenceUpdate,
  channelsFor,
  DEFAULT_PREFERENCES,
  type NotificationPreferences,
} from '@/domain/notifications/preferences';
import { queueEmail } from '@/lib/email/outbox';
import type { EmailMessage } from '@/lib/email/provider';
import * as social from '@/lib/social/repository';
import { db } from '@/lib/supabase-admin';

/**
 * Point d'entrée unique des notifications.
 *
 * Tout le code appelant passe par ici : c'est ce qui garantit que les
 * préférences et les règles anti-spoiler s'appliquent partout, plutôt que
 * d'être répétées — et donc oubliées quelque part.
 *
 * Le canal in-app reste géré par `social.notify`, déjà idempotent via
 * `notification_keys`. On ne le double pas d'un second mécanisme.
 */

export async function preferencesOf(
  playerId: string,
): Promise<NotificationPreferences> {
  const { data } = await db()
    .from('notification_preferences')
    .select('weekly_email, rewards_email, marketing_email, weekly_in_app, rewards_in_app')
    .eq('player_id', playerId)
    .maybeSingle();

  // Absence de ligne = valeurs par défaut. On n'écrit pas à la lecture : un
  // simple affichage ne doit pas créer de données.
  if (!data) return DEFAULT_PREFERENCES;

  return {
    weeklyEmail: data.weekly_email,
    rewardsEmail: data.rewards_email,
    marketingEmail: data.marketing_email,
    weeklyInApp: data.weekly_in_app,
    rewardsInApp: data.rewards_in_app,
  };
}

export async function savePreferences(
  playerId: string,
  update: Record<string, unknown>,
): Promise<NotificationPreferences> {
  const current = await preferencesOf(playerId);
  const next = applyPreferenceUpdate(current, update);

  const { error } = await db().from('notification_preferences').upsert(
    {
      player_id: playerId,
      weekly_email: next.weeklyEmail,
      rewards_email: next.rewardsEmail,
      marketing_email: next.marketingEmail,
      weekly_in_app: next.weeklyInApp,
      rewards_in_app: next.rewardsInApp,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'player_id' },
  );

  if (error) throw new Error(`notification_preferences.upsert : ${error.message}`);
  return next;
}

/** Adresse du compte lié à un joueur, `null` s'il n'y en a pas. */
async function emailOf(playerId: string): Promise<string | null> {
  const { data } = await db()
    .from('user_accounts')
    .select('email')
    .eq('player_id', playerId)
    .maybeSingle();
  return data?.email ?? null;
}

export interface DispatchResult {
  inApp: boolean;
  emailQueued: boolean;
}

/**
 * Envoie une notification sur les canaux autorisés.
 *
 * `email` est fourni par l'appelant plutôt que dérivé du brouillon in-app :
 * les deux formulations diffèrent, et surtout l'e-mail ne doit jamais
 * reprendre aveuglément un corps qui pourrait contenir un résultat. Quand
 * l'appelant ne fournit pas de message, aucun e-mail ne part.
 */
export async function dispatch(
  playerId: string,
  draft: NotificationDraft,
  email?: (address: string) => EmailMessage,
): Promise<DispatchResult> {
  const preferences = await preferencesOf(playerId);
  const channels = channelsFor(draft.kind, preferences);

  const result: DispatchResult = { inApp: false, emailQueued: false };

  if (channels.includes('IN_APP')) {
    result.inApp = await social.notify(playerId, draft);
  }

  if (channels.includes('EMAIL') && email) {
    const address = await emailOf(playerId);
    if (address) {
      // La clé de déduplication in-app est réutilisée, préfixée : un même
      // événement ne peut produire qu'un seul e-mail, même si la notification
      // in-app a déjà été écrite lors d'un passage précédent.
      const queued = await queueEmail(email(address), `mail:${draft.dedupeKey}`, {
        // Une alerte de securite doit arriver pendant que la victime peut
        // encore reprendre la main. Le reste attend la tache planifiee.
        urgent: draft.kind === 'SECURITY_ALERT',
      });
      result.emailQueued = queued.queued;
    }
  }

  return result;
}
