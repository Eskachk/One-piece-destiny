'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { CHARACTERS, CHARACTER_INDEX } from '@/data/characters';
import { parseAppearanceImport } from '@/domain/chapter/appearance-import';
import {
  computeChapterResults,
  computePickRates,
  percentileFromRank,
} from '@/domain/scoring/chapter-results';
import {
  analyseChapter,
  averagePickRate,
  specialAwards,
  synergyShare,
} from '@/domain/scoring/chapter-analysis';
import { applyChapterToDivision } from '@/domain/season/divisions';
import { nextSundayLockInstant } from '@/domain/chapter/lock';
import { teamRisk } from '@/domain/risk';
import { weeklyReward } from '@/domain/collection/rewards';
import {
  resultsReady,
  rewardReceived,
} from '@/domain/notifications/notifications';
import * as social from '@/lib/social/repository';
import { dispatch } from '@/lib/notifications/dispatch';
import { resultsReadyEmail, rewardReadyEmail } from '@/lib/email/templates';
import { getRepository } from '@/lib/repository';
import { requireAdmin } from '@/lib/auth/guards';
import { requiresReauthentication } from '@/lib/auth/session-store';
import { assertSameOrigin } from '@/lib/auth/request-guard';
import { audit } from '@/lib/audit';
import { chapterTag, CURRENT_CHAPTER_TAG } from '@/lib/cache';

/**
 * Pipeline hebdomadaire côté administration (cahier §5.2).
 *
 *   Import → mapping → comptage → validation humaine → publication
 *
 * L'IA et l'import automatique ne font que proposer ; la publication reste
 * une action humaine explicite (§7, §269 du pipeline).
 */

const ImportSchema = z.string().max(20_000);

export type AdminActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * Enregistre les apparitions validées.
 * Le texte est reparsé côté serveur : ce que le navigateur a affiché n'est
 * qu'une prévisualisation, jamais la source de vérité (§99).
 */
export async function validateAppearances(
  raw: unknown,
): Promise<AdminActionResult> {
  await assertSameOrigin();
  await requireAdmin();

  const parsed = ImportSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: 'Import invalide.' };
  }

  const { appearances, issues } = parseAppearanceImport(parsed.data, CHARACTERS);

  const blocking = issues.filter((i) => i.kind !== 'UNKNOWN_CHARACTER');
  if (blocking.length > 0) {
    return {
      ok: false,
      error: `${blocking.length} anomalie(s) à corriger avant validation.`,
    };
  }

  if (appearances.length === 0) {
    return { ok: false, error: 'Aucune apparition reconnue.' };
  }

  const repository = getRepository();
  const chapter = await repository.getCurrentChapter();
  if (!chapter) {
    return { ok: false, error: 'Aucun chapitre ouvert. Ouvre-en un d\'abord.' };
  }
  await repository.setAppearances(chapter.id, appearances);

  revalidatePath('/admin');
  return {
    ok: true,
    message: `${appearances.length} personnage(s) enregistré(s).`,
  };
}

/**
 * Ouverture d'un chapitre (cahier §4.1).
 *
 * Le numéro est saisi par l'administrateur. Le système ne fait que **proposer**
 * « précédent + 1 » : un hiatus, un chapitre double ou une renumérotation
 * doivent rester possibles sans contourner l'outil.
 */
export async function openChapter(
  chapterNumber: unknown,
): Promise<AdminActionResult> {
  await assertSameOrigin();
  await requireAdmin();

  const parsed = z.number().int().min(1).max(9999).safeParse(chapterNumber);
  if (!parsed.success) return { ok: false, error: 'Numéro de chapitre invalide.' };

  const repository = getRepository();

  const existing = await repository.getCurrentChapter();
  if (existing) {
    return {
      ok: false,
      error: `Le chapitre ${existing.chapterNumber} est encore ouvert.`,
    };
  }

  try {
    const chapter = await repository.createChapter(
      parsed.data,
      nextSundayLockInstant(new Date()),
    );
    // Le chapitre courant vient de changer : le cache partagé doit tomber
    // immédiatement, pas au bout de son délai de revalidation.
    revalidateTag(CURRENT_CHAPTER_TAG);
    revalidatePath('/');
    revalidatePath('/admin');
    return { ok: true, message: `Chapitre ${chapter.chapterNumber} ouvert.` };
  } catch (error) {
    // `chapter_number` est UNIQUE (§4.3) : rejouer un numéro déjà utilisé
    // échoue en base plutôt que de créer un doublon.
    const message = error instanceof Error ? error.message : '';
    return {
      ok: false,
      error: message.includes('duplicate')
        ? `Le chapitre ${parsed.data} existe déjà.`
        : 'Ouverture impossible.',
    };
  }
}

/**
 * Publication des résultats (cahier §77).
 *
 * Fige le chapitre : à partir d'ici les scores sont calculés une fois, stockés,
 * et le classement est servi tel quel (§75). L'état anti-spoiler bascule sur
 * CHAPTER_REVEALED.
 */
export async function publishResults(): Promise<AdminActionResult> {
  await assertSameOrigin();
  const session = await requireAdmin();

  // Publier fige un classement compétitif : le cahier §86 exige une
  // réauthentification récente sur ce type d'action.
  if (requiresReauthentication(session)) {
    return {
      ok: false,
      error: "Ressaisis ton mot de passe avant de publier (session trop ancienne).",
    };
  }

  const repository = getRepository();
  const chapter = await repository.getCurrentChapter();
  if (!chapter) {
    return { ok: false, error: 'Aucun chapitre ouvert. Ouvre-en un d\'abord.' };
  }

  if (chapter.status === 'RESULTS_PUBLISHED') {
    return { ok: false, error: 'Les résultats sont déjà publiés.' };
  }

  const appearances = await repository.getAppearances(chapter.id);
  if (appearances.length === 0) {
    return { ok: false, error: 'Aucune apparition validée pour ce chapitre.' };
  }

  const now = new Date();
  if (now.getTime() <= chapter.teamLockAt.getTime()) {
    // Publier avant l'échéance exposerait les résultats à des joueurs qui
    // peuvent encore modifier leur équipe.
    return {
      ok: false,
      error: 'Les équipages ne sont pas encore verrouillés.',
    };
  }

  const teams = await repository.listTeams(chapter.id);

  const results = computeChapterResults({
    teams,
    appearances,
    roster: CHARACTER_INDEX,
    // Version figée du chapitre, pas « la dernière » (§78).
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

  // Récompenses hebdomadaires (§72). Tout participant reçoit un coffre ; le
  // classement ne module que les Berries, jamais un avantage de score (§48).
  const rewarded = await repository.grantWeeklyRewards(
    chapter.id,
    results.map((result, index) => {
      const percentile = percentileFromRank(index + 1, results.length);
      const reward = weeklyReward({ participated: true, percentile });
      return {
        playerId: result.playerId,
        berries: reward.berries,
        chests: reward.chests,
        percentile,
      };
    }),
  );

  // --- Phase 2 : rétention -------------------------------------------------
  const pickRates = computePickRates(teams);
  const teamById = new Map(teams.map((team) => [team.userId, team]));

  // Analyse post-chapitre et distinctions, figées à la publication (§64, §77).
  await repository.saveChapterAnalysis(
    chapter.id,
    analyseChapter(results, pickRates),
  );
  await repository.saveChapterAwards(
    chapter.id,
    specialAwards(results).map((winner) => ({
      award: winner.award,
      playerId: winner.playerId,
      value: winner.value,
    })),
  );

  for (const [index, result] of results.entries()) {
    const percentile = percentileFromRank(index + 1, results.length);
    const team = teamById.get(result.playerId);

    // Historique hebdomadaire : alimente la détection de style (§16) et le
    // classement de saison (§20).
    await repository.recordWeeklyProfile({
      playerId: result.playerId,
      chapterId: chapter.id,
      chapterNumber: chapter.chapterNumber,
      risk: team ? teamRisk(
        team.characterIds
          .map((id) => CHARACTER_INDEX.get(id))
          .filter((c): c is NonNullable<typeof c> => c !== undefined),
        pickRates,
      ).value : 0,
      synergyShare: synergyShare(result),
      averagePickRate: team
        ? averagePickRate([...team.characterIds], pickRates)
        : 0,
      total: result.score.total,
      percentile,
    });

    // Mouvement de division (§19), sur la base du percentile.
    const current = await repository.getDivisionState(result.playerId);
    const outcome = applyChapterToDivision(current, percentile);
    await repository.setDivisionState(result.playerId, outcome.state);
  }

  await repository.updateChapter({
    ...chapter,
    status: 'RESULTS_PUBLISHED',
    officialReleaseAt: chapter.officialReleaseAt ?? now,
    resultsPublishedAt: now,
  });

  // Notifications (§108). Envoyées après la bascule de statut, jamais avant :
  // prévenir que les résultats sont là alors qu'ils ne sont pas encore
  // consultables serait une promesse en l'air.
  let notified = 0;
  if (social.isSocialAvailable()) {
    for (const [index, result] of results.entries()) {
      const percentile = percentileFromRank(index + 1, results.length);
      const reward = weeklyReward({ participated: true, percentile });

      // Les deux canaux passent par `dispatch` : les préférences du joueur
      // s'appliquent, et l'e-mail n'annonce que l'existence des résultats —
      // jamais un score, jamais un personnage (§3).
      const sent = await dispatch(
        result.playerId,
        resultsReady(result.playerId, chapter.id, chapter.chapterNumber),
        (address) => resultsReadyEmail(address, chapter.chapterNumber),
      );
      if (sent.inApp) notified += 1;

      await dispatch(
        result.playerId,
        rewardReceived(
          result.playerId,
          chapter.id,
          reward.berries,
          reward.chests,
        ),
        (address) => rewardReadyEmail(address, reward.berries, reward.chests),
      );
    }
  }

  await audit({
    playerId: session.playerId,
    action: 'chapter.publish',
    status: 'SUCCESS',
    metadata: {
      chapterNumber: chapter.chapterNumber,
      teams: results.length,
      scoringVersion: chapter.scoringVersion,
    },
  });

  // La publication change à la fois le chapitre courant et le classement :
  // les deux caches partagés tombent ensemble, sinon un joueur verrait un
  // classement vide pendant la durée de revalidation.
  revalidateTag(CURRENT_CHAPTER_TAG);
  revalidateTag(chapterTag(chapter.id));
  revalidatePath('/');
  revalidatePath('/admin');
  revalidatePath('/classement');
  return {
    ok: true,
    message: `${results.length} équipe(s) classée(s), ${rewarded} récompensée(s), ${notified} notifiée(s).`,
  };
}

export interface AppearancePreview {
  appearances: { characterId: string; name: string; appearances: number }[];
  issues: {
    line: number;
    raw: string;
    kind: string;
    message: string;
    /** Suggestions quand un nom correspond à plusieurs personnages. */
    candidates?: string[];
  }[];
}

/**
 * Prévisualisation de l'import d'apparitions.
 *
 * L'analyse a lieu **côté serveur**. Le formulaire la faisait dans le
 * navigateur, ce qui obligeait à embarquer les 790 personnages dans le bundle
 * client — 235 Ko — et à reparcourir tout le référentiel à chaque frappe.
 *
 * Le nom est joint ici : le client n'a donc plus besoin du référentiel.
 * Ce n'est qu'un confort de saisie — la validation qui compte reste
 * `validateAppearances`, qui reparse tout (§99).
 */
export async function previewAppearances(
  raw: unknown,
): Promise<AppearancePreview> {
  await assertSameOrigin();
  await requireAdmin();

  const parsed = ImportSchema.safeParse(raw);
  if (!parsed.success) return { appearances: [], issues: [] };

  const result = parseAppearanceImport(parsed.data, CHARACTERS);

  return {
    appearances: result.appearances.map((appearance) => ({
      characterId: appearance.characterId,
      name: CHARACTER_INDEX.get(appearance.characterId)?.name ?? appearance.characterId,
      appearances: appearance.appearances,
    })),
    issues: result.issues.map((issue) => ({
      line: issue.line,
      raw: issue.raw,
      kind: issue.kind,
      message: issue.message,
      // Les identifiants sont remplacés par les noms : le client n'a plus le
      // référentiel pour les résoudre.
      candidates: issue.candidates?.map(
        (id) => CHARACTER_INDEX.get(id)?.name ?? id,
      ),
    })),
  };
}
