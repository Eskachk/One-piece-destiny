'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { LOCALES } from '@/domain/i18n/locales';
import {
  HANDLE_MAX_LENGTH,
  canonicalHandle,
  checkHandle,
  describeHandleIssue,
  normalizeHandle,
} from '@/domain/player/handle';
import { audit } from '@/lib/audit';
import { requireSession } from '@/lib/auth/guards';
import { assertSameOrigin } from '@/lib/auth/request-guard';
import { writeDisplaySettings } from '@/lib/settings/store';
import { db } from '@/lib/supabase-admin';

/**
 * Paramètres du joueur.
 *
 * Deux natures distinctes, et elles ne vivent pas au même endroit :
 *
 *   — l'**affichage** (langue, animations, bouclier anti-spoiler) décrit
 *     l'appareil et tient dans un cookie. Voir `lib/settings/store.ts` ;
 *   — le **pseudo** est une identité publique : il est en base, et son
 *     changement laisse une trace.
 */

export type SettingsResult = { ok: true } | { ok: false; error: string };

const DisplaySchema = z.object({
  locale: z.enum(LOCALES),
  reducedMotion: z.boolean(),
  spoilerShield: z.boolean(),
});

/**
 * Réglages d'affichage.
 *
 * **Pas de session requise, et c'est délibéré** : la langue doit pouvoir être
 * changée depuis l'écran de connexion, qui est le premier écran que voit un
 * visiteur. L'action n'écrit qu'un cookie sur le navigateur qui la demande —
 * elle ne peut donc rien modifier chez personne d'autre.
 */
export async function updateDisplaySettingsAction(
  input: unknown,
): Promise<SettingsResult> {
  await assertSameOrigin();

  const parsed = DisplaySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Réglage invalide.' };

  await writeDisplaySettings(parsed.data);

  // Toutes les pages portent la langue et les réglages de confort : le cache
  // de rendu doit être invalidé partout, pas seulement sur la page courante.
  revalidatePath('/', 'layout');
  return { ok: true };
}

/**
 * Délai entre deux changements de pseudo.
 *
 * Constante **non exportée** : un fichier `'use server'` ne peut exporter que
 * des fonctions asynchrones. Chaque export y devient un point d'entrée
 * appelable depuis le navigateur, et Next refuse donc tout ce qui n'en est pas
 * un. La valeur ne sert qu'ici de toute façon.
 *
 * Le pseudo est l'identité publique sur le Marché et au classement. Sans
 * délai, un vendeur peut conclure une vente douteuse puis changer de nom : les
 * ventes récentes le nomment encore, mais plus personne ne le retrouve. Trente
 * jours laissent le temps de corriger un choix qu'on regrette sans permettre
 * d'effacer une réputation.
 */
const HANDLE_COOLDOWN_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export type HandleResult = { ok: true; handle: string } | { ok: false; error: string };

export async function changeHandleAction(input: unknown): Promise<HandleResult> {
  await assertSameOrigin();
  const session = await requireSession();

  const parsed = z.string().trim().min(1).max(64).safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Pseudo invalide.' };

  const handle = normalizeHandle(parsed.data);
  const naming = checkHandle(handle);
  if (!naming.valid) return { ok: false, error: describeHandleIssue(naming.issue!) };

  const { data: player } = await db()
    .from('players')
    .select('handle, handle_changed_at')
    .eq('id', session.playerId)
    .maybeSingle();

  if (!player) return { ok: false, error: 'Compte introuvable.' };

  // Recherche par égalité sur `handle_canonical` (index unique, migration
  // 0025). Le contrôle nomme le problème ; c'est l'index qui le garantit.
  const { data: taken } = await db()
    .from('players')
    .select('id')
    .eq('handle_canonical', canonicalHandle(handle))
    .neq('id', session.playerId)
    .maybeSingle();

  if (taken) return { ok: false, error: 'Ce pseudo est déjà pris.' };

  // Même pseudo, à la ponctuation près : on ne consomme pas le délai pour
  // corriger une majuscule.
  if (canonicalHandle(player.handle) === canonicalHandle(handle)) {
    const { error } = await db()
      .from('players')
      .update({ handle })
      .eq('id', session.playerId);

    if (error) return { ok: false, error: 'Ce pseudo est déjà pris.' };
    revalidatePath('/', 'layout');
    return { ok: true, handle };
  }

  if (player.handle_changed_at) {
    const since = Date.now() - new Date(player.handle_changed_at).getTime();
    const remaining = Math.ceil((HANDLE_COOLDOWN_DAYS * DAY_MS - since) / DAY_MS);

    if (remaining > 0) {
      return {
        ok: false,
        error: `Tu pourras changer de pseudo dans ${remaining} jour${remaining > 1 ? 's' : ''}.`,
      };
    }
  }

  const { error } = await db()
    .from('players')
    .update({ handle, handle_changed_at: new Date().toISOString() })
    .eq('id', session.playerId);

  if (error) {
    // La contrainte d'unicité est la seule erreur qu'on sait nommer, et la
    // nommer ne révèle rien : les pseudos sont publics.
    if (error.code === '23505') return { ok: false, error: 'Ce pseudo est déjà pris.' };
    return { ok: false, error: 'Changement impossible.' };
  }

  // L'ancien pseudo est journalisé : c'est ce qui permet de relier une
  // réputation à un compte quand une vente est contestée (§100).
  await audit({
    playerId: session.playerId,
    action: 'account.handle_changed',
    status: 'SUCCESS',
    metadata: { from: player.handle.slice(0, HANDLE_MAX_LENGTH), to: handle },
  });

  revalidatePath('/', 'layout');
  return { ok: true, handle };
}
