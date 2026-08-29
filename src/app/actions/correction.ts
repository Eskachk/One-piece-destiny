'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { CHARACTERS, CHARACTER_INDEX } from '@/data/characters';
import { parseAppearanceImport } from '@/domain/chapter/appearance-import';
import { chapterCorrected } from '@/domain/notifications/notifications';
import {
  computeChapterResults,
  percentileFromRank,
} from '@/domain/scoring/chapter-results';
import { requireAdmin } from '@/lib/auth/guards';
import { assertSameOrigin } from '@/lib/auth/request-guard';
import { requiresReauthentication } from '@/lib/auth/session-store';
import { getRepository } from '@/lib/repository';
import * as social from '@/lib/social/repository';
import { db } from '@/lib/supabase-admin';
import { audit } from '@/lib/audit';
import { chapterTag } from '@/lib/cache';

/**
 * Correction d'un chapitre publié (cahier §79).
 *
 * Le cahier impose une séquence :
 *
 *   erreur détectée → chapitre suspendu → correction versionnée →
 *   nouveau calcul → journal de correction → notification
 *
 * Et une règle qui gouverne tout : **aucune correction silencieuse.**
 * L'état antérieur est conservé, la raison est obligatoire, et chaque joueur
 * dont le classement change est prévenu.
 *
 * Le recalcul réutilise la **version de score d'origine** du chapitre (§78) :
 * corriger une saisie ne doit pas changer les règles du jeu a posteriori.
 */

export type CorrectionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const CorrectionSchema = z.object({
  // Une raison courte serait aussi inutile qu'une absence de raison : c'est
  // ce texte que liront les joueurs notifiés.
  reason: z.string().trim().min(10).max(500),
  appearances: z.string().min(1).max(20_000),
});

export async function correctPublishedChapter(
  input: unknown,
): Promise<CorrectionResult> {
  await assertSameOrigin();
  const session = await requireAdmin();

  // Réécrire un classement déjà publié est au moins aussi sensible que le
  // publier (§86).
  if (requiresReauthentication(session)) {
    return {
      ok: false,
      error: 'Ressaisis ton mot de passe avant de corriger un chapitre publié.',
    };
  }

  const parsed = CorrectionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: 'Indique une raison d\'au moins 10 caractères et les apparitions corrigées.',
    };
  }

  const repository = getRepository();
  const chapter = await repository.getLatestPublishedChapter();
  if (!chapter) {
    return { ok: false, error: 'Aucun chapitre publié à corriger.' };
  }

  const { appearances, issues } = parseAppearanceImport(
    parsed.data.appearances,
    CHARACTERS,
  );
  const blocking = issues.filter((issue) => issue.kind !== 'UNKNOWN_CHARACTER');
  if (blocking.length > 0 || appearances.length === 0) {
    return { ok: false, error: 'Les apparitions corrigées sont invalides.' };
  }

  // 1. Photographie de l'état d'avant, avant toute écriture.
  const previousAppearances = await repository.getAppearances(chapter.id);
  const previousResults = await repository.getLeaderboard(chapter.id);

  const { error: journalError } = await db()
    .from('chapter_corrections')
    .insert({
      chapter_id: chapter.id,
      reason: parsed.data.reason,
      previous_appearances: previousAppearances,
      previous_results: previousResults,
      applied_by: session.userId,
    });

  if (journalError) {
    // Sans journal, pas de correction : le §79 interdit la modification muette.
    return { ok: false, error: 'Journalisation impossible, rien n\'a été modifié.' };
  }

  const { data: correction } = await db()
    .from('chapter_corrections')
    .select('id')
    .eq('chapter_id', chapter.id)
    .order('applied_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 2. Nouvelle saisie et recalcul, avec la version d'origine (§78).
  await repository.setAppearances(chapter.id, appearances);
  const teams = await repository.listTeams(chapter.id);

  const results = computeChapterResults({
    teams,
    appearances,
    roster: CHARACTER_INDEX,
    scoringVersion: chapter.scoringVersion,
  });

  await repository.saveResults(
    chapter.id,
    results.map((result) => ({
      playerId: result.playerId,
      handle: result.playerId.slice(0, 8),
      total: result.score.total,
      breakdown: result.score.characters,
    })),
  );

  // 3. Historique hebdomadaire remis à jour, sinon saison et style resteraient
  // calculés sur des scores devenus faux.
  for (const [index, result] of results.entries()) {
    await repository.recordWeeklyProfile({
      playerId: result.playerId,
      chapterId: chapter.id,
      chapterNumber: chapter.chapterNumber,
      // Le risque et le taux de sélection ne changent pas : seule la saisie
      // des apparitions a été corrigée.
      risk: 0,
      synergyShare: 0,
      averagePickRate: 0,
      total: result.score.total,
      percentile: percentileFromRank(index + 1, results.length),
    });
  }

  // 4. Notification de chaque joueur dont le score a changé (§79).
  const before = new Map(previousResults.map((row) => [row.playerId, row.total]));
  let notified = 0;

  for (const result of results) {
    if (before.get(result.playerId) === result.score.total) continue;

    const sent = await social.notify(
      result.playerId,
      chapterCorrected(
        result.playerId,
        chapter.id,
        chapter.chapterNumber,
        parsed.data.reason,
        correction?.id ?? chapter.id,
      ),
    );
    if (sent) notified += 1;
  }

  await audit({
    playerId: session.playerId,
    action: 'chapter.correct',
    status: 'SUCCESS',
    metadata: {
      chapterNumber: chapter.chapterNumber,
      reason: parsed.data.reason,
      notified,
    },
  });

  // « Aucune correction silencieuse » (§79) vaut aussi pour le cache : servir
  // l'ancien classement après une correction serait exactement cela.
  revalidateTag(chapterTag(chapter.id));
  revalidatePath('/classement');
  revalidatePath('/admin');
  return {
    ok: true,
    message: `Chapitre ${chapter.chapterNumber} corrigé. ${notified} joueur(s) notifié(s).`,
  };
}
