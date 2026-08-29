import 'server-only';

import { CHARACTER_INDEX } from '@/data/characters';
import { priceAlertEmail } from '@/lib/email/templates';
import { queueEmail } from '@/lib/email/outbox';
import { preferencesOf } from '@/lib/notifications/dispatch';
import { db } from '@/lib/supabase-admin';

/**
 * Alertes de prix (cahier §41).
 *
 * La watchlist existait déjà mais **ne portait aucun seuil** : il n'y avait
 * donc rien à déclencher. La colonne `alert_below` est ce qui transforme une
 * liste de suivi en surveillance active.
 *
 * Trois garde-fous, parce qu'une alerte de prix est le genre de mécanisme qui
 * glisse vite vers la relance commerciale :
 *
 *   1. **le seuil vient du joueur.** On ne décide jamais à sa place qu'une
 *      affaire est intéressante ;
 *   2. **une seule alerte par annonce franchie** (`alerted_at`), sinon chaque
 *      passage du planificateur renverrait le même message ;
 *   3. **pas de pression artificielle.** Le message dit le prix et le seuil,
 *      sans compte à rebours ni « dernière chance » (§20 du prompt : éviter
 *      les dark patterns).
 *
 * L'alerte relève des notifications de service : c'est une surveillance
 * demandée, pas de la prospection. Elle suit donc la préférence
 * « récompenses / e-mail » du joueur et non le consentement marketing.
 */

export interface PriceAlertReport {
  watched: number;
  triggered: number;
  queued: number;
}

export async function runPriceAlerts(): Promise<PriceAlertReport> {
  const report: PriceAlertReport = { watched: 0, triggered: 0, queued: 0 };

  const { data: watches, error } = await db()
    .from('market_watchlist')
    .select('player_id, character_id, alert_below, alerted_at')
    .not('alert_below', 'is', null);

  if (error) throw new Error(`market_watchlist.select : ${error.message}`);
  if (!watches || watches.length === 0) return report;

  report.watched = watches.length;

  for (const watch of watches) {
    // Annonce active la moins chère pour ce personnage.
    const { data: cheapest } = await db()
      .from('market_listings')
      .select('id, price, seller_id')
      .eq('character_id', watch.character_id)
      .eq('status', 'ACTIVE')
      .order('price', { ascending: true })
      .limit(1)
      .maybeSingle();

    // Rien en vente, ou toujours au-dessus du seuil : on réarme et on passe.
    if (!cheapest || cheapest.price >= watch.alert_below) {
      if (watch.alerted_at) {
        // Le prix est remonté : la prochaine baisse pourra alerter à nouveau.
        await db()
          .from('market_watchlist')
          .update({ alerted_at: null })
          .eq('player_id', watch.player_id)
          .eq('character_id', watch.character_id);
      }
      continue;
    }

    // Ne pas alerter quelqu'un sur sa propre annonce.
    if (cheapest.seller_id === watch.player_id) continue;

    // Déjà prévenu pour cette baisse.
    if (watch.alerted_at) continue;

    report.triggered += 1;

    const preferences = await preferencesOf(watch.player_id);
    if (!preferences.rewardsEmail) continue;

    const { data: account } = await db()
      .from('user_accounts')
      .select('email')
      .eq('player_id', watch.player_id)
      .maybeSingle();

    if (!account?.email) continue;

    const name = CHARACTER_INDEX.get(watch.character_id)?.name ?? watch.character_id;

    // La clé porte l'annonce : deux baisses successives alertent bien deux
    // fois, mais un rejeu du planificateur n'envoie qu'un message.
    const queued = await queueEmail(
      priceAlertEmail(account.email, name, cheapest.price, watch.alert_below),
      `price:${cheapest.id}:${watch.player_id}`,
    );
    if (queued.queued) report.queued += 1;

    await db()
      .from('market_watchlist')
      .update({ alerted_at: new Date().toISOString() })
      .eq('player_id', watch.player_id)
      .eq('character_id', watch.character_id);
  }

  return report;
}
