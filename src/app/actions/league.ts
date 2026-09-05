'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireSession } from '@/lib/auth/guards';
import { assertSameOrigin } from '@/lib/auth/request-guard';
import {
  consumeQuotaByPlayer,
  throttleMessage,
} from '@/lib/auth/action-throttle';
import {
  NOM_MAX,
  decrireRefusAdhesion,
  decrireRefusNom,
  normaliserCodeLigue,
  validerNomLigue,
} from '@/domain/league/league';
import * as ligues from '@/lib/league/repository';

/**
 * Ligues privées : créer, rejoindre, quitter.
 *
 * Aucune de ces actions ne touche au score. Une ligue filtre un classement
 * déjà calculé — elle ne distribue ni Berries, ni coffres, ni avantage
 * (§48, §72). C'est ce qui permet d'en créer librement sans ouvrir une porte
 * à l'abus : il n'y a rien à y gagner d'autre qu'un rang parmi des amis.
 */

export type LeagueResult =
  | { ok: true; code?: string }
  | { ok: false; error: string };

export async function createLeagueAction(nom: unknown): Promise<LeagueResult> {
  await assertSameOrigin();
  const session = await requireSession();

  const saisie = z.string().max(NOM_MAX * 4).safeParse(nom);
  if (!saisie.success) return { ok: false, error: 'Nom invalide.' };

  const verdict = validerNomLigue(saisie.data);
  if (!verdict.valide) {
    return { ok: false, error: decrireRefusNom(verdict.raison) };
  }

  /*
   * Le frein de cadence, **après** la validation du nom.
   *
   * Un nom trop court est une faute de frappe, pas une tentative : la
   * consommer punirait l'hésitation. Même raisonnement que sur l'inscription.
   */
  const cadence = await consumeQuotaByPlayer('ligue', session.playerId);
  if (!cadence.autorise) return { ok: false, error: throttleMessage(cadence) };

  const creation = await ligues.creerLigue(session.playerId, verdict.nom);

  if (!creation.ok) {
    return {
      ok: false,
      error:
        creation.raison === 'TROP_DE_LIGUES'
          ? 'Tu appartiens déjà au nombre maximum de ligues.'
          : // Cinq tirages de code se sont heurtés à une collision : c'est
            // assez improbable pour qu'un simple « réessaie » soit la bonne
            // réponse, et assez rare pour ne pas mériter davantage.
            'Impossible de générer un code. Réessaie.',
    };
  }

  revalidatePath('/classement');
  return { ok: true, code: creation.ligue.code };
}

export async function joinLeagueAction(code: unknown): Promise<LeagueResult> {
  await assertSameOrigin();
  const session = await requireSession();

  const saisie = z.string().max(64).safeParse(code);
  if (!saisie.success) return { ok: false, error: 'Code invalide.' };

  const normalise = normaliserCodeLigue(saisie.data);
  if (normalise.length === 0) return { ok: false, error: 'Code invalide.' };

  const cadence = await consumeQuotaByPlayer('ligue', session.playerId);
  if (!cadence.autorise) return { ok: false, error: throttleMessage(cadence) };

  const refus = await ligues.rejoindreLigue(session.playerId, normalise);
  if (refus) return { ok: false, error: decrireRefusAdhesion(refus) };

  revalidatePath('/classement');
  return { ok: true };
}

export async function leaveLeagueAction(
  leagueId: unknown,
): Promise<LeagueResult> {
  await assertSameOrigin();
  const session = await requireSession();

  const parsed = z.string().uuid().safeParse(leagueId);
  if (!parsed.success) return { ok: false, error: 'Ligue introuvable.' };

  // Aucun frein ici : quitter une ligue ne crée rien et ne coûte rien. Freiner
  // une sortie serait retenir quelqu'un qui veut partir.
  await ligues.quitterLigue(session.playerId, parsed.data);

  revalidatePath('/classement');
  return { ok: true };
}
