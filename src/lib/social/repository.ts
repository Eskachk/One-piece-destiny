import 'server-only';

import type { NotificationDraft } from '@/domain/notifications/notifications';
import { db, isDatabaseConfigured } from '@/lib/supabase-admin';
import { generateReferralCode } from '@/domain/social/referral';

/**
 * Notifications et parrainage — accès base.
 *
 * Comme le Market, ces fonctions exigent Postgres : sans base, il n'y a rien
 * à afficher.
 */

export function isSocialAvailable(): boolean {
  return isDatabaseConfigured();
}

// --- Notifications (§108) --------------------------------------------------

export interface StoredNotification {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: Date;
}

/**
 * Écrit une notification si sa clé n'a jamais été vue (§92).
 * Retourne `true` si elle a bien été créée.
 */
export async function notify(
  playerId: string,
  draft: NotificationDraft,
): Promise<boolean> {
  // La clé est posée en premier : si elle existe déjà, on n'écrit rien.
  const claim = await db()
    .from('notification_keys')
    .insert({ dedupe_key: draft.dedupeKey })
    .select('dedupe_key')
    .maybeSingle();

  if (claim.error) {
    if (claim.error.code === '23505') return false;
    throw new Error(`notification_keys.insert : ${claim.error.message}`);
  }

  const { error } = await db().from('notifications').insert({
    player_id: playerId,
    kind: draft.kind,
    title: draft.title,
    body: draft.body ?? null,
    href: draft.href ?? null,
  });
  if (error) throw new Error(`notifications.insert : ${error.message}`);
  return true;
}

export async function listNotifications(
  playerId: string,
  limit = 30,
): Promise<StoredNotification[]> {
  const { data, error } = await db()
    .from('notifications')
    .select('id, kind, title, body, href, read_at, created_at')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`notifications.select : ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    href: row.href,
    read: row.read_at !== null,
    createdAt: new Date(row.created_at),
  }));
}

export async function markAllRead(playerId: string): Promise<void> {
  await db()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('player_id', playerId)
    .is('read_at', null);
}

export async function unreadCount(playerId: string): Promise<number> {
  const { count } = await db()
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', playerId)
    .is('read_at', null);
  return count ?? 0;
}

// --- Parrainage (§71) ------------------------------------------------------

export async function getReferralCode(playerId: string): Promise<string | null> {
  const { data } = await db()
    .from('players')
    .select('referral_code')
    .eq('id', playerId)
    .maybeSingle();
  return data?.referral_code ?? null;
}

export async function setReferralCode(
  playerId: string,
  code: string,
): Promise<boolean> {
  const { error } = await db()
    .from('players')
    .update({ referral_code: code })
    .eq('id', playerId);

  // Collision de code : l'appelant en régénère un.
  return !error;
}

/**
 * Code du joueur, créé au premier affichage du profil.
 *
 * Il n'y a plus de bouton « générer mon code » : le lien d'invitation doit
 * être là, prêt à copier, sans que le joueur ait à demander la permission de
 * l'obtenir. Une collision de code est improbable mais possible — on retente
 * plutôt que d'échouer sur un tirage malheureux.
 */
export async function ensureReferralCode(
  playerId: string,
): Promise<string | null> {
  const existing = await getReferralCode(playerId);
  if (existing) return existing;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateReferralCode();
    if (await setReferralCode(playerId, code)) return code;
  }
  return null;
}

export async function findPlayerByReferralCode(
  code: string,
): Promise<string | null> {
  const { data } = await db()
    .from('players')
    .select('id')
    .eq('referral_code', code)
    .maybeSingle();
  return data?.id ?? null;
}

export async function getReferralState(playerId: string): Promise<{
  alreadyReferred: boolean;
  referredCount: number;
}> {
  const [mine, sponsored] = await Promise.all([
    db()
      .from('referrals')
      .select('referred_id')
      .eq('referred_id', playerId)
      .maybeSingle(),
    db()
      .from('referrals')
      .select('referred_id', { count: 'exact', head: true })
      .eq('referrer_id', playerId)
      .not('rewarded_at', 'is', null),
  ]);

  return {
    alreadyReferred: mine.data !== null,
    referredCount: sponsored.count ?? 0,
  };
}

export async function recordReferral(
  referrerId: string,
  referredId: string,
  rewarded: boolean,
): Promise<boolean> {
  const { error } = await db().from('referrals').insert({
    referrer_id: referrerId,
    referred_id: referredId,
    rewarded_at: rewarded ? new Date().toISOString() : null,
  });

  if (error) {
    if (error.code === '23505') return false; // déjà parrainé
    throw new Error(`referrals.insert : ${error.message}`);
  }
  return true;
}

/**
 * Parrain d'un filleul **pas encore payé**, ou `null`.
 *
 * Lecture seule : elle sert à décider si le plafond du parrain autorise le
 * versement, avant de consommer quoi que ce soit.
 */
export async function pendingReferrerOf(
  referredId: string,
): Promise<string | null> {
  const { data } = await db()
    .from('referrals')
    .select('referrer_id')
    .eq('referred_id', referredId)
    .is('rewarded_at', null)
    .maybeSingle();

  return data?.referrer_id ?? null;
}

/**
 * Confirme un parrainage : le filleul a joué, le parrain peut être payé.
 *
 * Renvoie l'identifiant du parrain **une seule fois**. Le `is('rewarded_at',
 * null)` fait office de verrou : deux verrouillages d'équipage simultanés
 * partent en concurrence, mais un seul `update` trouvera encore la ligne non
 * marquée et rapportera un parrain. L'autre repartira les mains vides. Sans
 * cette condition dans la requête, un joueur qui enregistre son équipage deux
 * fois de suite paierait son parrain deux fois.
 */
export async function confirmReferral(
  referredId: string,
): Promise<string | null> {
  const { data } = await db()
    .from('referrals')
    .update({ rewarded_at: new Date().toISOString() })
    .eq('referred_id', referredId)
    .is('rewarded_at', null)
    .select('referrer_id')
    .maybeSingle();

  return data?.referrer_id ?? null;
}

/** Parrainages déjà payés à ce parrain — sert à appliquer le plafond (§43). */
export async function rewardedReferralCount(
  referrerId: string,
): Promise<number> {
  const { count } = await db()
    .from('referrals')
    .select('referred_id', { count: 'exact', head: true })
    .eq('referrer_id', referrerId)
    .not('rewarded_at', 'is', null);

  return count ?? 0;
}

/**
 * Libère la dotation d'arrivée en attente et rend le montant crédité.
 *
 * Toute la logique est en base (`release_pending_berries`) : verrou de ligne,
 * remise à zéro, incrément de version. Deux appels concurrents ne peuvent pas
 * créditer deux fois, et ce n'est pas une convention côté application — c'est
 * le moteur qui le garantit.
 */
export async function releasePendingBerries(playerId: string): Promise<number> {
  if (!isDatabaseConfigured()) return 0;

  const { data, error } = await db().rpc('release_pending_berries', {
    p_player_id: playerId,
  });

  if (error) {
    console.warn('[signup] dotation non libérée', error.message);
    return 0;
  }
  return typeof data === 'number' ? data : 0;
}
