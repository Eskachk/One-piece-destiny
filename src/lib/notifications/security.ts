import 'server-only';

import {
  securityAlert,
  type SecurityEvent,
} from '@/domain/notifications/notifications';
import { securityAlertEmail } from '@/lib/email/templates';
import { audit } from '@/lib/audit';
import { db } from '@/lib/supabase-admin';
import { dispatch } from './dispatch';

/**
 * Alerte de sécurité sur un compte.
 *
 * Appelée après tout changement sensible. Elle ne demande pas la permission :
 * `dispatch` traite `SECURITY_ALERT` comme obligatoire, sur les deux canaux.
 *
 * Trois précautions :
 *
 *   1. **l'échec ne remonte jamais.** Ne pas pouvoir prévenir quelqu'un que
 *      son mot de passe a changé est grave, mais faire échouer le changement
 *      lui-même le serait davantage — l'utilisateur légitime resterait bloqué
 *      avec un mot de passe qu'il croit changé ;
 *   2. **rien de la valeur nouvelle n'est transmis.** Le message dit ce qui a
 *      changé, jamais en quoi ;
 *   3. l'événement part aussi au journal d'audit (§100).
 */
const LABEL: Record<SecurityEvent, string> = {
  PASSWORD_CHANGED: 'Le mot de passe de ton compte a été modifié.',
  PASSWORD_RESET: 'Le mot de passe de ton compte a été réinitialisé.',
  MFA_ENABLED: 'La double authentification a été activée.',
  MFA_DISABLED: 'La double authentification a été désactivée.',
  RECOVERY_CODES_REGENERATED: 'Tes codes de secours ont été régénérés.',
  EMAIL_CHANGED: 'L’adresse e-mail de ton compte a été modifiée.',
};

/** Retrouve le joueur derrière un compte, `null` s'il n'y en a pas. */
async function playerOfUser(userId: string): Promise<string | null> {
  const { data } = await db()
    .from('user_accounts')
    .select('player_id')
    .eq('id', userId)
    .maybeSingle();
  return data?.player_id ?? null;
}

export async function notifySecurityEvent(
  userId: string,
  event: SecurityEvent,
): Promise<void> {
  try {
    const playerId = await playerOfUser(userId);
    if (!playerId) return;

    const now = new Date();

    await dispatch(playerId, securityAlert(playerId, event, now), (address) =>
      securityAlertEmail(address, LABEL[event], now),
    );

    await audit({
      playerId,
      action: 'security.event',
      status: 'SUCCESS',
      metadata: { event },
    });
  } catch (error) {
    // Journalisé, jamais propagé — voir la précaution 1 ci-dessus.
    console.error(`[security] SECURITY_ALERT_FAILED event=${event}`, error);
  }
}
