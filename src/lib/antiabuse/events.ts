import 'server-only';

import { headers } from 'next/headers';
import { db, isDatabaseConfigured } from '@/lib/supabase-admin';

/**
 * Journal de parcours (cahier §43).
 *
 * Distinct d'`audit_log`, qui trace les actions sensibles pour
 * l'exploitation. Ici on enregistre **le parcours d'un joueur** : quand il
 * arrive, quand il ouvre son premier coffre, quand il vend pour la première
 * fois. C'est l'écart entre ces instants — pas leur contenu — qui distingue un
 * joueur d'un compte fabriqué.
 *
 * Comme le journal d'audit, une écriture qui échoue est avalée : observer ne
 * doit jamais faire échouer ce qu'on observe.
 */

export type AccountEventKind =
  | 'ACCOUNT_CREATED'
  | 'WELCOME_BALANCE_GRANTED'
  | 'REFERRAL_SIGNUP'
  | 'REFERRAL_QUALIFIED'
  | 'REFERRAL_REWARDED'
  | 'WELCOME_CHEST_OPENED'
  | 'CHEST_OPENED'
  | 'FIRST_CREW_LOCKED'
  | 'MARKET_LISTED'
  | 'MARKET_SOLD'
  | 'MARKET_BOUGHT'
  | 'PURCHASE_COMPLETED';

/**
 * Adresse d'origine, tronquée à ce qui sert.
 *
 * On conserve l'adresse telle quelle — elle sert à rapprocher des comptes —
 * mais rien de plus : ni géolocalisation, ni empreinte d'appareil, ni
 * corrélation avec un identifiant tiers. Le cadrage §34 demande la
 * minimisation, et §4 interdit explicitement le fingerprinting invasif.
 */
async function requestIp(): Promise<string | null> {
  try {
    const store = await headers();
    return store.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  } catch {
    // Hors contexte de requête (tâche de fond) : l'événement reste utile.
    return null;
  }
}

export async function recordEvent(
  playerId: string,
  kind: AccountEventKind,
  metadata?: Record<string, unknown>,
): Promise<void> {
  if (!isDatabaseConfigured()) return;

  try {
    await db().from('account_events').insert({
      player_id: playerId,
      kind,
      ip: await requestIp(),
      metadata: metadata ?? null,
    });
  } catch (error) {
    console.warn('[antiabuse] événement non enregistré', (error as Error).message);
  }
}

/** Nombre d'événements d'un type sur une fenêtre — base des règles de vélocité. */
export async function countEvents(
  playerId: string,
  kind: AccountEventKind,
  windowMs: number,
): Promise<number> {
  if (!isDatabaseConfigured()) return 0;

  const since = new Date(Date.now() - windowMs).toISOString();
  const { count } = await db()
    .from('account_events')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', playerId)
    .eq('kind', kind)
    .gte('at', since);

  return count ?? 0;
}
