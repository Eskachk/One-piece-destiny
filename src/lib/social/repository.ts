import 'server-only';

import type { NotificationDraft } from '@/domain/notifications/notifications';
import { db, isDatabaseConfigured } from '@/lib/supabase-admin';

/**
 * Notifications, commentaires et parrainage — accès base.
 *
 * Comme le Market, ces fonctions exigent Postgres : sans base, il n'y a ni
 * notification ni discussion à afficher.
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

// --- Commentaires (§70) ----------------------------------------------------

export interface StoredComment {
  id: string;
  playerId: string;
  handle: string;
  body: string;
  likes: number;
  likedByMe: boolean;
  reports: number;
  createdAt: Date;
}

export async function lastCommentAt(playerId: string): Promise<Date | null> {
  const { data } = await db()
    .from('chapter_comments')
    .select('created_at')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? new Date(data.created_at) : null;
}

export async function addComment(
  chapterId: string,
  playerId: string,
  body: string,
): Promise<void> {
  const { error } = await db()
    .from('chapter_comments')
    .insert({ chapter_id: chapterId, player_id: playerId, body });
  if (error) throw new Error(`chapter_comments.insert : ${error.message}`);
}

export async function listComments(
  chapterId: string,
  viewerId: string,
): Promise<StoredComment[]> {
  const { data, error } = await db()
    .from('chapter_comments')
    // La clé étrangère est nommée explicitement : `chapter_comments` atteint
    // `players` par plusieurs chemins (auteur, likes, signalements), et
    // PostgREST refuse de choisir à notre place.
    // eslint-disable-next-line prettier/prettier -- littéral d'un seul tenant :
    // supabase-js dérive les types du texte de la requête, une concaténation
    // lui fait perdre l'inférence.
    .select('id, player_id, body, created_at, players!chapter_comments_player_id_fkey(handle), comment_likes(player_id), comment_reports(id)')
    .eq('chapter_id', chapterId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw new Error(`chapter_comments.select : ${error.message}`);

  return (data ?? []).map((row) => {
    const player = row.players as unknown as { handle: string };
    const likes = (row.comment_likes ?? []) as { player_id: string }[];
    const reports = (row.comment_reports ?? []) as { id: string }[];

    return {
      id: row.id,
      playerId: row.player_id,
      handle: player.handle,
      body: row.body,
      likes: likes.length,
      likedByMe: likes.some((like) => like.player_id === viewerId),
      reports: reports.length,
      createdAt: new Date(row.created_at),
    };
  });
}

export async function toggleLike(
  commentId: string,
  playerId: string,
): Promise<void> {
  const { data } = await db()
    .from('comment_likes')
    .select('player_id')
    .eq('comment_id', commentId)
    .eq('player_id', playerId)
    .maybeSingle();

  if (data) {
    await db()
      .from('comment_likes')
      .delete()
      .eq('comment_id', commentId)
      .eq('player_id', playerId);
    return;
  }

  const { error } = await db()
    .from('comment_likes')
    .insert({ comment_id: commentId, player_id: playerId });
  if (error && error.code !== '23505') {
    throw new Error(`comment_likes.insert : ${error.message}`);
  }
}

export async function reportComment(
  commentId: string,
  reporterId: string,
  reason: string | null,
): Promise<void> {
  const { error } = await db()
    .from('comment_reports')
    .insert({ comment_id: commentId, reporter_id: reporterId, reason });
  // Un second signalement du même joueur n'est pas une erreur pour lui.
  if (error && error.code !== '23505') {
    throw new Error(`comment_reports.insert : ${error.message}`);
  }
}

/** Suppression logique par l'auteur (§70). */
export async function deleteOwnComment(
  commentId: string,
  playerId: string,
): Promise<boolean> {
  const { data } = await db()
    .from('chapter_comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', commentId)
    .eq('player_id', playerId)
    .is('deleted_at', null)
    .select('id')
    .maybeSingle();

  return data !== null;
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
