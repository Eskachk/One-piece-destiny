'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/guards';
import { assertSameOrigin } from '@/lib/auth/request-guard';
import { audit } from '@/lib/audit';
import { markReviewed } from '@/lib/antiabuse/review';
import { clearRestriction, setRestriction } from '@/lib/antiabuse/restrictions';
import { evaluatePlayer } from '@/lib/antiabuse/signals';

/**
 * Actions du Fraud Center (cahier §43, §100 ; cadrage §27, §29).
 *
 * Trois invariants, tenus par chaque action de ce fichier :
 *
 *   1. **`requireAdmin` d'abord.** Ces actions modifient l'état économique
 *      d'un compte tiers : elles sont, avec la correction de chapitre, les
 *      plus sensibles du produit ;
 *   2. **tout est tracé.** Une restriction posée sans trace serait une
 *      décision sans auteur, donc indéfendable devant le joueur concerné ;
 *   3. **rien n'est effacé.** On marque « examiné », on ne supprime jamais une
 *      évaluation — c'est ce qui permet de mesurer les faux positifs, et donc
 *      de savoir si le dispositif est juste.
 *
 * Ce que ces actions ne font pas : bannir. La sanction maximale disponible ici
 * est une restriction économique temporaire. Fermer un compte reste une
 * opération manuelle, délibérément.
 */

export type AdminRiskResult = { ok: true } | { ok: false; error: string };

const PlayerId = z.string().uuid();

/** Durées proposées. Bornées : une restriction « définitive » n'existe pas ici. */
const DURATIONS = {
  '24h': 24 * 60 * 60 * 1000,
  '7j': 7 * 24 * 60 * 60 * 1000,
  '30j': 30 * 24 * 60 * 60 * 1000,
} as const;

const RestrictSchema = z.object({
  playerId: PlayerId,
  duration: z.enum(['24h', '7j', '30j']),
  reason: z.string().min(3).max(280),
});

export async function restrictAccountAction(
  input: unknown,
): Promise<AdminRiskResult> {
  await assertSameOrigin();
  const session = await requireAdmin();

  const parsed = RestrictSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Paramètres invalides.' };

  await setRestriction({
    playerId: parsed.data.playerId,
    level: 'RESTRICT_ECONOMY',
    reason: parsed.data.reason,
    untilMs: DURATIONS[parsed.data.duration],
    byUserId: session.userId,
  });

  await markReviewed(parsed.data.playerId, 'CONFIRMED', session.userId);

  revalidatePath('/admin/fraude');
  return { ok: true };
}

export async function liftRestrictionAction(
  playerId: unknown,
): Promise<AdminRiskResult> {
  await assertSameOrigin();
  const session = await requireAdmin();

  const parsed = PlayerId.safeParse(playerId);
  if (!parsed.success) return { ok: false, error: 'Compte introuvable.' };

  await clearRestriction(parsed.data, session.userId);

  revalidatePath('/admin/fraude');
  return { ok: true };
}

/**
 * Classe un signalement comme faux positif.
 *
 * La décision est **conservée**, pas effacée. C'est elle qui permettra de
 * savoir, dans six mois, si les seuils accusent trop souvent des joueurs
 * ordinaires — la seule mesure honnête de la justesse du dispositif.
 */
export async function markFalsePositiveAction(
  playerId: unknown,
): Promise<AdminRiskResult> {
  await assertSameOrigin();
  const session = await requireAdmin();

  const parsed = PlayerId.safeParse(playerId);
  if (!parsed.success) return { ok: false, error: 'Compte introuvable.' };

  await markReviewed(parsed.data, 'FALSE_POSITIVE', session.userId);
  await clearRestriction(parsed.data, session.userId);

  await audit({
    playerId: parsed.data,
    action: 'ANTIABUSE_FALSE_POSITIVE',
    status: 'SUCCESS',
    metadata: { by: session.userId },
  });

  revalidatePath('/admin/fraude');
  return { ok: true };
}

/** Relance une évaluation à la demande, sur les faits du moment. */
export async function reevaluateAction(
  playerId: unknown,
): Promise<AdminRiskResult> {
  await assertSameOrigin();
  await requireAdmin();

  const parsed = PlayerId.safeParse(playerId);
  if (!parsed.success) return { ok: false, error: 'Compte introuvable.' };

  const assessment = await evaluatePlayer(parsed.data);
  if (!assessment) {
    return { ok: false, error: 'Évaluation impossible pour ce compte.' };
  }

  revalidatePath('/admin/fraude');
  return { ok: true };
}
