'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  describeCommentRefusal,
  evaluateComment,
} from '@/domain/social/moderation';
import {
  describeReferralRefusal,
  evaluateReferral,
  generateReferralCode,
  normalizeReferralCode,
  REFERRAL_BERRIES_REFERRED,
  REFERRAL_BERRIES_REFERRER,
} from '@/domain/social/referral';
import { requireSession } from '@/lib/auth/guards';
import { assertSameOrigin } from '@/lib/auth/request-guard';
import { getRepository } from '@/lib/repository';
import * as social from '@/lib/social/repository';

/**
 * Actions sociales (cahier §70, §71) et notifications (§108).
 */

export type SocialResult = { ok: true } | { ok: false; error: string };

const UNAVAILABLE_MESSAGE = 'Fonction indisponible sans base de données.';
const UNAVAILABLE: SocialResult = { ok: false, error: UNAVAILABLE_MESSAGE };

// --- Commentaires ----------------------------------------------------------

export async function postCommentAction(
  body: unknown,
): Promise<SocialResult> {
  await assertSameOrigin();
  const session = await requireSession();
  if (!social.isSocialAvailable()) return UNAVAILABLE;

  const parsed = z.string().max(4000).safeParse(body);
  if (!parsed.success) return { ok: false, error: 'Commentaire invalide.' };

  const repository = getRepository();
  const chapter = await repository.getLatestPublishedChapter();
  if (!chapter) {
    return { ok: false, error: 'Aucun chapitre publié à commenter.' };
  }

  const decision = evaluateComment({
    body: parsed.data,
    lastCommentAt: await social.lastCommentAt(session.playerId),
    resultsPublished: chapter.status === 'RESULTS_PUBLISHED',
    now: new Date(),
  });

  if (!decision.allowed) {
    return { ok: false, error: describeCommentRefusal(decision.reason) };
  }

  await social.addComment(chapter.id, session.playerId, decision.body);
  revalidatePath('/classement');
  return { ok: true };
}

export async function toggleLikeAction(
  commentId: unknown,
): Promise<SocialResult> {
  await assertSameOrigin();
  const session = await requireSession();
  if (!social.isSocialAvailable()) return UNAVAILABLE;

  const parsed = z.string().uuid().safeParse(commentId);
  if (!parsed.success) return { ok: false, error: 'Commentaire introuvable.' };

  await social.toggleLike(parsed.data, session.playerId);
  revalidatePath('/classement');
  return { ok: true };
}

export async function reportCommentAction(
  commentId: unknown,
): Promise<SocialResult> {
  await assertSameOrigin();
  const session = await requireSession();
  if (!social.isSocialAvailable()) return UNAVAILABLE;

  const parsed = z.string().uuid().safeParse(commentId);
  if (!parsed.success) return { ok: false, error: 'Commentaire introuvable.' };

  await social.reportComment(parsed.data, session.playerId, null);
  revalidatePath('/classement');
  return { ok: true };
}

export async function deleteCommentAction(
  commentId: unknown,
): Promise<SocialResult> {
  await assertSameOrigin();
  const session = await requireSession();
  if (!social.isSocialAvailable()) return UNAVAILABLE;

  const parsed = z.string().uuid().safeParse(commentId);
  if (!parsed.success) return { ok: false, error: 'Commentaire introuvable.' };

  // Le filtre sur l'auteur est dans la requête : on ne supprime jamais le
  // message de quelqu'un d'autre (§89).
  const deleted = await social.deleteOwnComment(parsed.data, session.playerId);
  if (!deleted) return { ok: false, error: 'Suppression impossible.' };

  revalidatePath('/classement');
  return { ok: true };
}

// --- Notifications ---------------------------------------------------------

export async function markNotificationsReadAction(): Promise<SocialResult> {
  await assertSameOrigin();
  const session = await requireSession();
  if (!social.isSocialAvailable()) return UNAVAILABLE;

  await social.markAllRead(session.playerId);
  revalidatePath('/profil');
  return { ok: true };
}

// --- Parrainage ------------------------------------------------------------

/** Code personnel, créé à la première demande. */
export async function ensureReferralCodeAction(): Promise<
  { ok: true; code: string } | { ok: false; error: string }
> {
  await assertSameOrigin();
  const session = await requireSession();
  if (!social.isSocialAvailable()) {
    return { ok: false, error: UNAVAILABLE_MESSAGE };
  }

  const existing = await social.getReferralCode(session.playerId);
  if (existing) return { ok: true, code: existing };

  // Collision improbable mais possible : on retente quelques fois plutôt que
  // d'échouer sur un tirage malheureux.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateReferralCode();
    if (await social.setReferralCode(session.playerId, code)) {
      return { ok: true, code };
    }
  }
  return { ok: false, error: 'Génération du code impossible.' };
}

export async function redeemReferralAction(
  code: unknown,
): Promise<SocialResult> {
  await assertSameOrigin();
  const session = await requireSession();
  if (!social.isSocialAvailable()) return UNAVAILABLE;

  const parsed = z.string().min(4).max(32).safeParse(code);
  if (!parsed.success) return { ok: false, error: 'Code invalide.' };

  const normalized = normalizeReferralCode(parsed.data);
  const referrerId = await social.findPlayerByReferralCode(normalized);
  const state = await social.getReferralState(session.playerId);

  const decision = evaluateReferral({
    referrerId,
    referredId: session.playerId,
    alreadyReferred: state.alreadyReferred,
    referrerRewardedCount: state.referredCount,
    // La fenêtre se compte depuis la création de la session la plus ancienne
    // du compte ; à défaut, on prend maintenant, ce qui reste permissif.
    referredAccountCreatedAt: session.state.createdAt,
    now: new Date(),
  });

  if (!decision.allowed) {
    return { ok: false, error: describeReferralRefusal(decision.reason) };
  }

  const recorded = await social.recordReferral(
    referrerId!,
    session.playerId,
    decision.rewarded,
  );
  if (!recorded) return { ok: false, error: 'Tu as déjà été parrainé.' };

  if (decision.rewarded) {
    const repository = getRepository();
    await repository.grantBerriesAndChests(
      referrerId!,
      REFERRAL_BERRIES_REFERRER,
      0,
    );
    await repository.grantBerriesAndChests(
      session.playerId,
      REFERRAL_BERRIES_REFERRED,
      0,
    );
  }

  revalidatePath('/profil');
  return { ok: true };
}
