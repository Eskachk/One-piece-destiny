'use server';

import { z } from 'zod';
import { assertSameOrigin } from '@/lib/auth/request-guard';
import { getAuthenticatedSession } from '@/lib/auth/session-store';
import { consumeQuotaByIp } from '@/lib/auth/action-throttle';
import { signalerIncident } from '@/lib/observability/incidents';

/**
 * Remontée d'un incident survenu **dans le navigateur**.
 *
 * L'écran d'erreur (`app/error.tsx`) est un composant client : quand il
 * s'affiche, le serveur a déjà rendu la main et sa trace est perdue. Sans cette
 * action, la moitié des pannes vécues par les joueurs n'existait nulle part.
 *
 * ## Ce qui est accepté, et pourquoi si peu
 *
 * Le condensat et le chemin. **Pas le message d'erreur du client** : il vient
 * du navigateur, donc de l'extérieur, et un journal qui recopie ce qu'on lui
 * envoie devient un dépotoir — au mieux du bruit, au pire un vecteur
 * d'injection dans l'écran qui le relit.
 *
 * Le condensat, lui, est produit par le serveur : c'est un identifiant, pas un
 * contenu, et c'est exactement ce qui permet de retrouver la trace d'origine.
 *
 * ## Le frein
 *
 * Une boucle de rendu en échec peut rappeler cette action à chaque image. Le
 * quota par adresse la borne : au-delà, on perd des doublons, ce qui n'a aucune
 * importance — le premier signalement dit déjà tout.
 */

const SignalementSchema = z.object({
  digest: z.string().max(64).optional(),
  chemin: z.string().max(200),
});

export async function signalerIncidentClientAction(
  entree: unknown,
): Promise<{ ok: boolean }> {
  await assertSameOrigin();

  const parsed = SignalementSchema.safeParse(entree);
  if (!parsed.success) return { ok: false };

  const cadence = await consumeQuotaByIp('incident');
  if (!cadence.autorise) return { ok: false };

  const session = await getAuthenticatedSession();

  await signalerIncident({
    scope: 'rendu',
    message: `Écran d'erreur affiché sur ${parsed.data.chemin}`,
    digest: parsed.data.digest ?? null,
    metadata: { chemin: parsed.data.chemin },
    playerId: session?.playerId ?? null,
  });

  return { ok: true };
}
