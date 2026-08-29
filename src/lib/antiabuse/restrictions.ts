import 'server-only';

import {
  MARKET_ACCESS_DELAY_MS,
  STARTER_CARD_LOCK_MS,
} from '@/domain/antiabuse/config';
import { RESTRICTION_MESSAGE } from '@/domain/antiabuse/engine';
import { db, isDatabaseConfigured } from '@/lib/supabase-admin';
import { audit } from '@/lib/audit';

/**
 * Restrictions économiques (cahier §43).
 *
 * Trois verrous, du plus mécanique au plus heuristique. L'ordre compte : on
 * refuse d'abord sur des faits, et seulement ensuite sur une évaluation.
 *
 *   1. **la carte est-elle échangeable ?** Une carte de coffre d'inscription
 *      ne l'est pas avant sept jours. C'est un fait, pas un jugement ;
 *   2. **le compte a-t-il l'âge de vendre ?** Un compte de dix minutes n'a
 *      rien à faire au Market. C'est un fait aussi ;
 *   3. **le compte est-il restreint ?** Là seulement intervient le moteur de
 *      risque, et seulement pour limiter l'économie.
 *
 * Aucun de ces verrous ne touche au jeu : verrouiller un équipage, marquer
 * des points, monter en division restent possibles quoi qu'il arrive. Le
 * cadrage est explicite là-dessus, et le cahier §43 aussi — les sanctions
 * sont économiques, jamais sportives.
 */

export type EconomicRefusal =
  | 'STARTER_CARD_LOCKED'
  | 'ACCOUNT_TOO_NEW'
  | 'RESTRICTED';

export type EconomicDecision =
  | { allowed: true }
  | { allowed: false; reason: EconomicRefusal; message: string };

const ALLOWED: EconomicDecision = { allowed: true };

/** Restriction en cours, ou `null`. Lecture indexée, sans calcul. */
export async function activeRestriction(
  playerId: string,
): Promise<{ level: string; until: Date | null } | null> {
  if (!isDatabaseConfigured()) return null;

  const { data } = await db()
    .from('account_restrictions')
    .select('level, until')
    .eq('player_id', playerId)
    .maybeSingle();

  if (!data) return null;

  // Une restriction expirée n'est pas supprimée : la ligne reste, pour
  // l'historique. C'est la date qui décide, pas la présence de la ligne.
  const until = data.until ? new Date(data.until) : null;
  if (until && until.getTime() <= Date.now()) return null;

  return { level: data.level, until };
}

/**
 * Le joueur peut-il mettre **cette carte** en vente ?
 *
 * Complète `canList` de `domain/market/anti-manipulation.ts`, qui traite les
 * cooldowns et les annulations. Ici on traite l'origine de la carte et l'état
 * du compte — ce que ce module-là ne peut pas savoir.
 */
export async function canEnterMarket(
  playerId: string,
  characterId: string,
): Promise<EconomicDecision> {
  if (!isDatabaseConfigured()) return ALLOWED;

  const [card, account, restriction] = await Promise.all([
    db()
      .from('inventory')
      .select('tradable_from')
      .eq('player_id', playerId)
      .eq('character_id', characterId)
      .maybeSingle(),
    db()
      .from('user_accounts')
      .select('created_at')
      .eq('player_id', playerId)
      .maybeSingle(),
    activeRestriction(playerId),
  ]);

  const now = Date.now();

  if (card.data?.tradable_from) {
    const free = new Date(card.data.tradable_from).getTime();
    if (free > now) {
      // Ce message-là est explicite, et il peut l'être : la règle est
      // annoncée à l'avance et ne dépend d'aucune détection. Rien à
      // contourner, rien à deviner.
      const days = Math.ceil((free - now) / (24 * 60 * 60 * 1000));
      return {
        allowed: false,
        reason: 'STARTER_CARD_LOCKED',
        message: `Les personnages du coffre d’inscription ne s’échangent qu’après ${Math.round(STARTER_CARD_LOCK_MS / (24 * 60 * 60 * 1000))} jours. Encore ${days} jour${days > 1 ? 's' : ''}.`,
      };
    }
  }

  if (account.data) {
    const age = now - new Date(account.data.created_at).getTime();
    if (age < MARKET_ACCESS_DELAY_MS) {
      const hours = Math.ceil((MARKET_ACCESS_DELAY_MS - age) / (60 * 60 * 1000));
      return {
        allowed: false,
        reason: 'ACCOUNT_TOO_NEW',
        message: `Le Market s’ouvre 24 h après l’inscription. Encore ${hours} h.`,
      };
    }
  }

  if (restriction) {
    // Message générique (§40). Détailler les signaux publierait le mode
    // d'emploi du contournement, et accuserait nommément quelqu'un sur la
    // foi d'un calcul probabiliste.
    return {
      allowed: false,
      reason: 'RESTRICTED',
      message: RESTRICTION_MESSAGE,
    };
  }

  return ALLOWED;
}

/** Un compte restreint ne peut pas non plus acheter : le flux irait dans l'autre sens. */
export async function canBuyOnMarket(
  playerId: string,
): Promise<EconomicDecision> {
  const restriction = await activeRestriction(playerId);
  if (!restriction) return ALLOWED;
  return { allowed: false, reason: 'RESTRICTED', message: RESTRICTION_MESSAGE };
}

/** Pose ou lève une restriction. Toujours tracée (§29). */
export async function setRestriction(input: {
  playerId: string;
  level: string;
  reason: string;
  untilMs: number | null;
  byUserId: string | null;
}): Promise<void> {
  await db().from('account_restrictions').upsert(
    {
      player_id: input.playerId,
      level: input.level,
      reason: input.reason,
      until: input.untilMs ? new Date(Date.now() + input.untilMs).toISOString() : null,
      set_at: new Date().toISOString(),
      set_by: input.byUserId,
    },
    { onConflict: 'player_id' },
  );

  await audit({
    playerId: input.playerId,
    action: 'ANTIABUSE_RESTRICTION_SET',
    status: 'SUCCESS',
    metadata: { level: input.level, reason: input.reason },
  });
}

export async function clearRestriction(
  playerId: string,
  byUserId: string | null,
): Promise<void> {
  await db().from('account_restrictions').delete().eq('player_id', playerId);

  await audit({
    playerId,
    action: 'ANTIABUSE_RESTRICTION_CLEARED',
    status: 'SUCCESS',
    metadata: { by: byUserId },
  });
}
