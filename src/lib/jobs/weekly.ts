import 'server-only';

import {
  crewLocked,
  crewLockSoon,
  resultsComputing,
} from '@/domain/notifications/notifications';
import { crewLockSoonEmail } from '@/lib/email/templates';
import { dispatch } from '@/lib/notifications/dispatch';
import { getRepository } from '@/lib/repository';
import { db } from '@/lib/supabase-admin';

/**
 * Rendez-vous hebdomadaire (cahier §108).
 *
 * Les trois brouillons `crewLockSoon`, `crewLocked` et `resultsComputing`
 * existaient depuis le début mais **n'étaient appelés nulle part** : la moitié
 * de la boucle de rétention décrite au cahier n'avait aucun émetteur. Cette
 * tâche les déclenche.
 *
 * Règle anti-spoiler (§3), appliquée ici et pas ailleurs : tant que le
 * chapitre n'est pas publié, aucune notification ne peut mentionner un score,
 * une apparition ou un personnage. `resultsComputing` est volontairement muet
 * — le libellé vit dans le domaine, pas dans cette tâche, pour qu'on ne
 * puisse pas l'enrichir par mégarde depuis l'infrastructure.
 */

/** Fenêtre avant l'échéance dans laquelle le rappel est envoyé. */
export const REMINDER_WINDOW_MS = 6 * 60 * 60 * 1000;

export interface WeeklyReport {
  phase: 'NONE' | 'REMINDER' | 'LOCKED' | 'COMPUTING';
  chapterNumber: number | null;
  notified: number;
  emailsQueued: number;
}

/** Joueurs ayant verrouillé un équipage sur ce chapitre. */
async function playersWithTeam(chapterId: string): Promise<string[]> {
  const { data } = await db().from('teams').select('player_id').eq('chapter_id', chapterId);
  return (data ?? []).map((row) => row.player_id);
}

/** Tous les joueurs, pour le rappel avant échéance. */
async function allPlayers(): Promise<string[]> {
  const { data } = await db().from('players').select('id');
  return (data ?? []).map((row) => row.id);
}

/**
 * Exécute la phase correspondant à l'instant présent.
 *
 * Idempotente par construction : chaque brouillon porte une clé de
 * déduplication indexée sur le chapitre, donc rejouer la tâche cent fois
 * n'envoie qu'une notification par joueur et par phase.
 */
export async function runWeeklyNotifications(now = new Date()): Promise<WeeklyReport> {
  const repository = getRepository();
  const chapter = await repository.getCurrentChapter();

  const report: WeeklyReport = {
    phase: 'NONE',
    chapterNumber: chapter?.chapterNumber ?? null,
    notified: 0,
    emailsQueued: 0,
  };

  if (!chapter) return report;

  const untilLock = chapter.teamLockAt.getTime() - now.getTime();

  if (untilLock > REMINDER_WINDOW_MS) {
    // Trop tôt : rien à annoncer. Notifier plus d'une fois par semaine
    // transformerait le rendez-vous en harcèlement.
    return report;
  }

  if (untilLock > 0) {
    report.phase = 'REMINDER';
    for (const playerId of await allPlayers()) {
      const sent = await dispatch(
        playerId,
        crewLockSoon(playerId, chapter.id),
        (address) => crewLockSoonEmail(address, chapter.chapterNumber),
      );
      if (sent.inApp) report.notified += 1;
      if (sent.emailQueued) report.emailsQueued += 1;
    }
    return report;
  }

  // L'échéance est passée. Deux annonces successives, sans e-mail : elles
  // confirment un état que le joueur peut consulter, et ne valent pas un
  // message dans sa boîte.
  const participants = await playersWithTeam(chapter.id);
  const appearances = await repository.getAppearances(chapter.id);

  // Des apparitions saisies signifient que le chapitre est sorti et que le
  // calcul est en cours — sans que rien n'en soit révélé.
  const draft = appearances.length > 0 ? resultsComputing : crewLocked;
  report.phase = appearances.length > 0 ? 'COMPUTING' : 'LOCKED';

  for (const playerId of participants) {
    const sent = await dispatch(playerId, draft(playerId, chapter.id));
    if (sent.inApp) report.notified += 1;
  }

  return report;
}
