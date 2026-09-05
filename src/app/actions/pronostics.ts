'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/guards';
import { assertSameOrigin } from '@/lib/auth/request-guard';
import {
  consumeQuotaByPlayer,
  throttleMessage,
} from '@/lib/auth/action-throttle';
import { getCachedCurrentChapter } from '@/lib/cache';
import { isTeamEditable } from '@/domain/chapter/lock';
import { MAX_OPTIONS } from '@/domain/chapter/pronostics';
import * as questions from '@/lib/chapter/questions';

/**
 * Réponse d'un joueur à un pronostic secondaire.
 *
 * ## L'échéance est celle de l'équipage, et c'est volontaire
 *
 * Un pronostic répondu après la sortie du chapitre n'est plus un pronostic.
 * On réutilise `isTeamEditable` plutôt que de recopier la règle : deux
 * échéances qui se ressemblent finiraient par diverger, et le joueur
 * découvrirait l'écart un dimanche soir.
 *
 * ## Le bonus ne touche pas le score
 *
 * Il est versé en Berries à la publication (§25, §48, §72). Cette action
 * n'écrit qu'un choix ; elle ne calcule rien et ne crédite rien.
 */

export type PronosticResult = { ok: true } | { ok: false; error: string };

export async function answerQuestionAction(
  questionId: unknown,
  choice: unknown,
): Promise<PronosticResult> {
  await assertSameOrigin();
  const session = await requireSession();

  const parsedId = z.string().uuid().safeParse(questionId);
  const parsedChoice = z
    .number()
    .int()
    .min(0)
    .max(MAX_OPTIONS - 1)
    .safeParse(choice);

  if (!parsedId.success || !parsedChoice.success) {
    return { ok: false, error: 'Réponse invalide.' };
  }

  const chapter = await getCachedCurrentChapter();
  if (!chapter) return { ok: false, error: 'Aucun chapitre ouvert.' };

  if (!isTeamEditable(chapter, new Date())) {
    return {
      ok: false,
      error: 'Les pronostics sont fermés : le chapitre est verrouillé.',
    };
  }

  const cadence = await consumeQuotaByPlayer('equipage', session.playerId);
  if (!cadence.autorise) return { ok: false, error: throttleMessage(cadence) };

  /*
   * La question doit appartenir au chapitre **courant**.
   *
   * L'identifiant vient du navigateur. Sans ce contrôle, un joueur pourrait
   * répondre à la question d'un chapitre déjà publié — dont la bonne réponse
   * est connue — et empocher le bonus au prochain versement.
   */
  const ouvertes = await questions.questionsDe(chapter.id);
  if (!ouvertes.some((question) => question.id === parsedId.data)) {
    return { ok: false, error: 'Ce pronostic n’est pas ouvert.' };
  }

  await questions.repondre(session.playerId, parsedId.data, parsedChoice.data);

  revalidatePath('/');
  return { ok: true };
}
