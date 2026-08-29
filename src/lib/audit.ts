import 'server-only';

import { headers } from 'next/headers';
import { db, isDatabaseConfigured } from '@/lib/supabase-admin';

/**
 * Journal d'audit (cahier §100, §101).
 *
 * Le cahier fixe les champs : `userId`, `IP`, `action`, `status`,
 * `timestamp`, `requestId`. Et surtout ce qu'il ne faut **jamais** écrire :
 * mots de passe, jetons complets, numéros de carte, secrets.
 *
 * La journalisation ne doit jamais faire échouer l'action qu'elle observe :
 * une erreur d'écriture du journal est signalée en console et avalée. Perdre
 * une ligne de journal est regrettable, perdre un achat déjà payé le serait
 * bien davantage.
 */

export type AuditStatus = 'SUCCESS' | 'REFUSED' | 'ERROR';

export interface AuditEntry {
  playerId?: string | null;
  action: string;
  status: AuditStatus;
  /** Contexte utile au diagnostic. Ne doit contenir aucun secret. */
  metadata?: Record<string, unknown>;
}

/** Champs dont la présence trahirait une fuite de secret dans le journal. */
const FORBIDDEN_KEYS = [
  'password',
  'token',
  'secret',
  'hash',
  'key',
  'code',
  'card',
];

/**
 * Filet de sécurité : on retire toute clé au nom suspect avant écriture.
 *
 * Un appelant distrait passera un jour un objet contenant un secret ; mieux
 * vaut le laisser tomber ici que de le retrouver dans le journal.
 */
function sanitize(metadata: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    const lower = key.toLowerCase();
    if (FORBIDDEN_KEYS.some((forbidden) => lower.includes(forbidden))) {
      clean[key] = '[retiré]';
      continue;
    }
    clean[key] = value;
  }

  return clean;
}

export async function audit(entry: AuditEntry): Promise<void> {
  if (!isDatabaseConfigured()) return;

  try {
    const store = await headers();
    const forwarded = store.get('x-forwarded-for');

    await db().from('audit_log').insert({
      player_id: entry.playerId ?? null,
      action: entry.action,
      status: entry.status,
      request_id: store.get('x-request-id'),
      ip: forwarded?.split(',')[0]?.trim() ?? null,
      metadata: entry.metadata ? sanitize(entry.metadata) : null,
    });
  } catch (error) {
    // Jamais propagé : le journal observe, il ne décide pas.
    console.error('[audit] écriture impossible', error);
  }
}
