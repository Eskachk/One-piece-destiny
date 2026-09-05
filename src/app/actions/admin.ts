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
import { CURRENT_SCORING_VERSION } from '@/domain/scoring';
import {
  MAX_OPTIONS,
  MAX_QUESTIONS,
  OPTION_MAX,
  PROMPT_MAX,
  bonusDe,
  decrireRefusQuestion,
  validerQuestion,
} from '@/domain/chapter/pronostics';
import {
  ajouterQuestion,
  questionsDe,
  reponsesDuChapitre,
  supprimerQuestion,
  trancherQuestion,
} from '@/lib/chapter/questions';
import { setChapterAnchor } from '@/lib/settings/anchor';
import { requireAdmin } from '@/lib/auth/guards';
import { requiresReauthentication } from '@/lib/auth/session-store';
import { assertSameOrigin } from '@/lib/auth/request-guard';
import { audit } from '@/lib/audit';
import { chapterTag, CURRENT_CHAPTER_TAG } from '@/lib/cache';
import { db } from '@/lib/supabase-admin';

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
 * Ancrage du calendrier de parution (cahier §4).
 *
 * « Le chapitre N a été jugé le dimanche D. » Tout le numéro de la semaine en
 * découle. Il vivait dans une constante du code : le corriger demandait un
 * redéploiement, un dimanche soir, pendant que les joueurs attendent — et la
 * source externe ne rattrape rien, elle est figée au chapitre 1085.
 *
 * Poser un ancrage **ne change aucun chapitre déjà ouvert ni aucun résultat
 * publié** : il ne sert qu'à proposer le numéro du prochain. C'est délibéré —
 * une correction de calendrier ne doit pas pouvoir réécrire un classement.
 */
export async function setChapterAnchorAction(
  chapterNumber: unknown,
  weekOfIso: unknown,
): Promise<AdminActionResult> {
  await assertSameOrigin();
  const session = await requireAdmin();

  const numero = z.number().int().min(1).max(9999).safeParse(chapterNumber);
  if (!numero.success) return { ok: false, error: 'Numéro de chapitre invalide.' };

  const jour = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue au format AAAA-MM-JJ')
    .safeParse(weekOfIso);
  if (!jour.success) return { ok: false, error: 'Date invalide (AAAA-MM-JJ).' };

  // L'instant de verrouillage est celui du produit : dimanche 23:59:59 en
  // heure de Paris, soit 21:59:59 UTC en été. On ne demande pas l'heure à
  // l'administrateur — elle est la même chaque semaine, et la lui faire saisir
  // n'ouvrirait qu'une occasion de se tromper.
  const weekOf = new Date(`${jour.data}T21:59:59.000Z`);
  if (Number.isNaN(weekOf.getTime())) {
    return { ok: false, error: 'Date invalide.' };
  }

  if (weekOf.getUTCDay() !== 0) {
    return {
      ok: false,
      error: 'L’ancrage doit tomber un dimanche : c’est le jour de verrouillage.',
    };
  }

  await setChapterAnchor(
    { chapterNumber: numero.data, weekOf },
    session.playerId,
  );

  await audit({
    playerId: session.playerId,
    action: 'admin.chapter_anchor',
    status: 'SUCCESS',
    metadata: { chapterNumber: numero.data, weekOf: weekOf.toISOString() },
  });

  revalidatePath('/admin');
  return {
    ok: true,
    message: `Ancrage posé : chapitre ${numero.data} au ${jour.data}.`,
  };
}

/**
 * Renumérote le chapitre **ouvert**.
 *
 * L'ouverture laissait déjà saisir le numéro, mais une fois le chapitre ouvert
 * il n'y avait plus de recours : une erreur de saisie exigeait de supprimer la
 * ligne en base à la main. Or c'est justement le moment où l'on s'aperçoit de
 * l'erreur — quand les joueurs la signalent.
 *
 * **Refusé après publication.** Renuméroter un chapitre déjà jugé changerait
 * l'identité d'un classement figé (§75, §78). La correction d'un chapitre
 * publié passe par `correctChapter`, qui recalcule et prévient les joueurs.
 */
export async function renumberOpenChapter(
  chapterNumber: unknown,
): Promise<AdminActionResult> {
  await assertSameOrigin();
  const session = await requireAdmin();

  const parsed = z.number().int().min(1).max(9999).safeParse(chapterNumber);
  if (!parsed.success) return { ok: false, error: 'Numéro de chapitre invalide.' };

  const chapter = await getRepository().getCurrentChapter();
  if (!chapter) return { ok: false, error: 'Aucun chapitre ouvert.' };

  if (chapter.chapterNumber === parsed.data) {
    return { ok: true, message: 'C’est déjà ce numéro.' };
  }

  const { error } = await db()
    .from('chapter_events')
    .update({ chapter_number: parsed.data })
    .eq('id', chapter.id)
    .neq('status', 'RESULTS_PUBLISHED');

  if (error) {
    // `chapter_number` est UNIQUE (§4.3).
    if (error.code === '23505') {
      return { ok: false, error: `Le chapitre ${parsed.data} existe déjà.` };
    }
    return { ok: false, error: 'Renumérotation impossible.' };
  }

  await audit({
    playerId: session.playerId,
    action: 'admin.chapter_renumber',
    status: 'SUCCESS',
    metadata: { from: chapter.chapterNumber, to: parsed.data },
  });

  revalidateTag(CURRENT_CHAPTER_TAG);
  revalidatePath('/');
  revalidatePath('/admin');
  return {
    ok: true,
    message: `Chapitre ${chapter.chapterNumber} renuméroté en ${parsed.data}.`,
  };
}

/**
 * Déplace l'échéance de verrouillage du chapitre **ouvert**.
 *
 * ## Le défaut que ceci corrige
 *
 * `team_lock_at` est figé à l'ouverture du chapitre, à « le prochain dimanche
 * 23:59:59 ». C'est la bonne règle, et rien d'autre ne doit la déplacer : ni
 * la sortie du chapitre, ni un spoil (§2.2, §76).
 *
 * Mais un chapitre ouvert la semaine dernière porte une échéance de la semaine
 * dernière. Elle est passée, donc les équipages sont verrouillés — un mercredi,
 * alors que le dimanche n'est pas arrivé. Et rien ne permettait de la
 * rattraper : poser un ancrage de calendrier ne touche pas au chapitre ouvert,
 * c'est même écrit noir sur blanc dans son avertissement. Il fallait éditer la
 * ligne en base à la main.
 *
 * ## Ce que ce levier fait, et ce qu'il ne fait pas
 *
 * Il déplace **une seule** date, sur **un seul** chapitre, celui qui est
 * ouvert. Il ne touche à aucune équipe déjà enregistrée : rouvrir laisse les
 * joueurs modifier la leur, verrouiller la fige telle qu'elle est.
 *
 * **Refusé sur un chapitre publié.** Déplacer l'échéance d'un chapitre déjà
 * jugé rouvrirait des équipes derrière un classement figé (§75, §78) — le
 * moyen le plus simple de fabriquer un tricheur.
 *
 * Chaque déplacement est journalisé avec l'ancienne et la nouvelle date : le
 * verrouillage décide qui a pu jouer, il ne doit pas pouvoir bouger sans
 * trace.
 */
export async function setTeamLockAt(
  lockAtIso: unknown,
): Promise<AdminActionResult> {
  await assertSameOrigin();
  const session = await requireAdmin();

  const parsed = z.string().datetime().safeParse(lockAtIso);
  if (!parsed.success) return { ok: false, error: 'Date de verrouillage invalide.' };

  const lockAt = new Date(parsed.data);
  if (Number.isNaN(lockAt.getTime())) {
    return { ok: false, error: 'Date de verrouillage invalide.' };
  }

  // Garde-fou de saisie : une échéance à cinq ans n'est pas une correction,
  // c'est une faute de frappe, et elle laisserait les équipages ouverts
  // indéfiniment.
  const limite = Date.now() + 366 * 24 * 60 * 60 * 1000;
  if (lockAt.getTime() > limite) {
    return { ok: false, error: 'Échéance trop lointaine : un an au maximum.' };
  }

  const chapter = await getRepository().getCurrentChapter();
  if (!chapter) return { ok: false, error: 'Aucun chapitre ouvert.' };

  if (chapter.status === 'RESULTS_PUBLISHED') {
    return {
      ok: false,
      error: 'Chapitre publié : son échéance ne peut plus bouger.',
    };
  }

  const { error } = await db()
    .from('chapter_events')
    .update({ team_lock_at: lockAt.toISOString() })
    .eq('id', chapter.id)
    .neq('status', 'RESULTS_PUBLISHED');

  if (error) return { ok: false, error: 'Déplacement impossible.' };

  await audit({
    playerId: session.playerId,
    action: 'admin.team_lock_moved',
    status: 'SUCCESS',
    metadata: {
      chapterNumber: chapter.chapterNumber,
      from: chapter.teamLockAt.toISOString(),
      to: lockAt.toISOString(),
    },
  });

  revalidateTag(CURRENT_CHAPTER_TAG);
  revalidateTag(chapterTag(chapter.id));
  revalidatePath('/');
  revalidatePath('/admin');

  const ouvert = lockAt.getTime() > Date.now();
  return {
    ok: true,
    message: ouvert
      ? `Équipages rouverts jusqu’au ${lockAt.toISOString()}.`
      : 'Équipages verrouillés.',
  };
}

/**
 * Fait passer le chapitre **ouvert** au moteur de score courant.
 *
 * ## Pourquoi cette action existe
 *
 * Un chapitre garde à vie la version de moteur avec laquelle il a été ouvert
 * (§78). C'est la bonne règle : elle garantit qu'un classement se recalcule
 * des mois plus tard avec les règles qui étaient affichées quand les joueurs
 * ont composé.
 *
 * Mais elle avait un effet de bord : après avoir écrit un nouveau moteur, il
 * fallait attendre la publication du chapitre en cours puis l'ouverture du
 * suivant pour le voir servir. Sur un chapitre à peine ouvert, dont personne
 * n'a encore rien tiré, c'est une semaine d'attente pour rien — et la seule
 * échappatoire était de modifier la ligne en base à la main.
 *
 * ## Les deux verrous
 *
 * Le §78 reste protégé par deux refus, et ils ne sont pas négociables :
 *
 *   — **un chapitre publié ne bouge pas.** Son classement est figé et servi
 *     tel quel ; changer son moteur rendrait ses scores irreproductibles ;
 *   — **un chapitre qui porte déjà des scores ne bouge pas non plus**, même
 *     non publié. Des scores existants ont été calculés par l'ancien moteur :
 *     les laisser à côté d'une nouvelle version, c'est promettre un recalcul
 *     qui ne rendrait pas les mêmes chiffres.
 *
 * Reste le cas légitime : un chapitre ouvert, sans apparition validée ni
 * score, dont on veut qu'il soit jugé avec les règles qu'on vient d'écrire.
 */
export async function migrateOpenChapterEngine(): Promise<AdminActionResult> {
  await assertSameOrigin();
  const session = await requireAdmin();

  const chapter = await getRepository().getCurrentChapter();
  if (!chapter) return { ok: false, error: 'Aucun chapitre ouvert.' };

  if (chapter.status === 'RESULTS_PUBLISHED') {
    return {
      ok: false,
      error: 'Chapitre publié : son moteur de score ne peut plus changer.',
    };
  }

  if (chapter.scoringVersion === CURRENT_SCORING_VERSION) {
    return { ok: true, message: `Déjà en ${CURRENT_SCORING_VERSION}.` };
  }

  // Des scores déjà calculés interdisent la bascule : ils viennent de l'ancien
  // moteur, et les garder à côté d'une nouvelle version promettrait un recalcul
  // qui ne rendrait pas les mêmes chiffres.
  const { count } = await db()
    .from('team_scores')
    .select('player_id', { count: 'exact', head: true })
    .eq('chapter_id', chapter.id);

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `Ce chapitre porte déjà ${count} score(s) calculés en ${chapter.scoringVersion}. Publie-le, puis ouvre le suivant.`,
    };
  }

  const { error } = await db()
    .from('chapter_events')
    .update({ scoring_version: CURRENT_SCORING_VERSION })
    .eq('id', chapter.id)
    .neq('status', 'RESULTS_PUBLISHED');

  if (error) return { ok: false, error: 'Bascule impossible.' };

  await audit({
    playerId: session.playerId,
    action: 'admin.chapter_engine_migrated',
    status: 'SUCCESS',
    metadata: {
      chapterNumber: chapter.chapterNumber,
      from: chapter.scoringVersion,
      to: CURRENT_SCORING_VERSION,
    },
  });

  revalidateTag(CURRENT_CHAPTER_TAG);
  revalidateTag(chapterTag(chapter.id));
  revalidatePath('/');
  revalidatePath('/admin');

  return {
    ok: true,
    message: `Chapitre ${chapter.chapterNumber} : ${chapter.scoringVersion} → ${CURRENT_SCORING_VERSION}.`,
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

  /*
   * Bonus des pronostics secondaires, **fondu dans le versement hebdomadaire**.
   *
   * Un second versement demanderait sa propre idempotence (§92) et pourrait
   * réussir quand le premier échoue, laissant un joueur payé à moitié. Une
   * seule écriture, une seule garantie.
   *
   * Le bonus est en Berries et jamais en points (§25, §48, §72) : il n'entre
   * donc ni dans `results`, ni dans `team_scores`, ni dans le classement.
   */
  const [questions, reponses] = await Promise.all([
    questionsDe(chapter.id),
    reponsesDuChapitre(chapter.id),
  ]);

  // Récompenses hebdomadaires (§72). Tout participant reçoit un coffre ; le
  // classement ne module que les Berries, jamais un avantage de score (§48).
  const rewarded = await repository.grantWeeklyRewards(
    chapter.id,
    results.map((result, index) => {
      const percentile = percentileFromRank(index + 1, results.length);
      const reward = weeklyReward({ participated: true, rank: index + 1 });
      const bonus = bonusDe(reponses.get(result.playerId) ?? [], questions);
      return {
        playerId: result.playerId,
        berries: reward.berries + bonus,
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
      // Le taux de sélection ne modifie plus le risque : au v6 il escompte le
      // score entier. Le passer ici le compterait deux fois.
      risk: team ? teamRisk(
        team.characterIds
          .map((id) => CHARACTER_INDEX.get(id))
          .filter((c): c is NonNullable<typeof c> => c !== undefined),
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
      const reward = weeklyReward({ participated: true, rank: index + 1 });

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

// ---------------------------------------------------------------------------
// Pronostics secondaires (§73)
// ---------------------------------------------------------------------------

/**
 * Ajoute une question au chapitre **ouvert**.
 *
 * Jamais à un chapitre publié : la bonne réponse y serait déjà connue, et la
 * question ne serait plus un pronostic mais un cadeau.
 */
export async function addQuestionAction(
  prompt: unknown,
  options: unknown,
): Promise<AdminActionResult> {
  await assertSameOrigin();
  await requireAdmin();

  const parsed = z
    .object({
      prompt: z.string().max(PROMPT_MAX * 4),
      options: z.array(z.string().max(OPTION_MAX * 4)).max(MAX_OPTIONS),
    })
    .safeParse({ prompt, options });

  if (!parsed.success) return { ok: false, error: 'Question invalide.' };

  const verdict = validerQuestion(parsed.data.prompt, parsed.data.options);
  if (!verdict.valide) {
    return { ok: false, error: decrireRefusQuestion(verdict.raison) };
  }

  const chapter = await getRepository().getCurrentChapter();
  if (!chapter) return { ok: false, error: 'Aucun chapitre ouvert.' };

  const issue = await ajouterQuestion(chapter.id, verdict.prompt, verdict.options);
  if (issue === 'COMPLET') {
    return {
      ok: false,
      error: `Ce chapitre porte déjà ${MAX_QUESTIONS} pronostics.`,
    };
  }

  revalidatePath('/admin');
  revalidatePath('/');
  return { ok: true, message: 'Pronostic ajouté.' };
}

export async function removeQuestionAction(
  questionId: unknown,
): Promise<AdminActionResult> {
  await assertSameOrigin();
  await requireAdmin();

  const parsed = z.string().uuid().safeParse(questionId);
  if (!parsed.success) return { ok: false, error: 'Pronostic introuvable.' };

  const chapter = await getRepository().getCurrentChapter();
  if (!chapter) return { ok: false, error: 'Aucun chapitre ouvert.' };

  await supprimerQuestion(chapter.id, parsed.data);

  revalidatePath('/admin');
  revalidatePath('/');
  return { ok: true, message: 'Pronostic retiré.' };
}

/**
 * Fixe la bonne réponse d'un pronostic.
 *
 * À faire **avant** de publier : le bonus est calculé pendant la publication,
 * et une question laissée sans réponse ne rapporte rien à personne. Elle
 * n'enlève rien non plus — ce n'est pas au joueur de payer un oubli.
 */
export async function answerQuestionAdminAction(
  questionId: unknown,
  answer: unknown,
): Promise<AdminActionResult> {
  await assertSameOrigin();
  await requireAdmin();

  const parsedId = z.string().uuid().safeParse(questionId);
  const parsedAnswer = z.number().int().min(0).max(MAX_OPTIONS - 1).safeParse(answer);
  if (!parsedId.success || !parsedAnswer.success) {
    return { ok: false, error: 'Réponse invalide.' };
  }

  const chapter = await getRepository().getCurrentChapter();
  if (!chapter) return { ok: false, error: 'Aucun chapitre ouvert.' };

  await trancherQuestion(chapter.id, parsedId.data, parsedAnswer.data);

  revalidatePath('/admin');
  return { ok: true, message: 'Bonne réponse enregistrée.' };
}
