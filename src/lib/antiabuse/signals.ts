import 'server-only';

import {
  assessRisk,
  type RiskAssessment,
  type EconomicTransfer,
} from '@/domain/antiabuse/engine';
import { ECONOMIC_WINDOW_MS, VELOCITY } from '@/domain/antiabuse/config';
import { db, isDatabaseConfigured } from '@/lib/supabase-admin';

/**
 * Collecte des signaux et évaluation d'un compte (cahier §43).
 *
 * Ce module **rassemble des faits** ; il ne décide de rien. La décision est
 * prise par `assessRisk`, qui est pure et se teste sans base. La séparation
 * n'est pas cosmétique : elle permet de rejouer une évaluation contestée sur
 * les mêmes faits, des mois plus tard.
 *
 * Le calcul est volontairement **hors du chemin critique** (§35). Il est
 * déclenché après coup — à la vente, à l'ouverture d'un coffre — et jamais
 * avant d'afficher une page. La seule vérification synchrone est celle des
 * restrictions, qui est une simple lecture indexée.
 */

const DAY = 24 * 60 * 60 * 1000;

interface TransferRow {
  buyer_id: string;
  seller_id: string;
  price: number;
  at: string;
  character_id: string;
}

/**
 * Évalue un joueur et enregistre le résultat.
 *
 * Renvoie `null` si l'évaluation est impossible — sans base, ou joueur
 * inconnu. Un appelant ne doit jamais interpréter `null` comme « sans
 * risque » : c'est « on ne sait pas ».
 */
export async function evaluatePlayer(
  playerId: string,
): Promise<RiskAssessment | null> {
  if (!isDatabaseConfigured()) return null;

  const now = new Date();
  const since = new Date(now.getTime() - ECONOMIC_WINDOW_MS).toISOString();

  // Toutes les lectures partent ensemble : enchaînées, elles cumuleraient
  // sept allers-retours pour une évaluation qui doit rester discrète.
  const [account, related, chests, crew, referrals, out, income] =
    await Promise.all([
      db()
        .from('user_accounts')
        .select('created_at')
        .eq('player_id', playerId)
        .maybeSingle(),
      db().rpc('accounts_sharing_signup_ip', { p_player_id: playerId }),
      db()
        .from('account_events')
        .select('id', { count: 'exact', head: true })
        .eq('player_id', playerId)
        .eq('kind', 'CHEST_OPENED')
        .gte('at', new Date(now.getTime() - VELOCITY.chestOpening.windowMs).toISOString()),
      db()
        .from('teams')
        .select('id', { count: 'exact', head: true })
        .eq('player_id', playerId),
      db()
        .from('referrals')
        .select('referred_id, created_at')
        .eq('referrer_id', playerId),
      db()
        .from('market_transactions')
        .select('buyer_id, seller_id, price, at, character_id')
        .eq('seller_id', playerId)
        .gte('at', since),
      db()
        .from('market_transactions')
        .select('buyer_id, seller_id, price, at, character_id')
        .eq('buyer_id', playerId)
        .gte('at', since),
    ]);

  if (!account.data) return null;

  const accountAgeMs = now.getTime() - new Date(account.data.created_at).getTime();

  // Activité des filleuls : ont-ils déjà verrouillé un équipage ? C'est le
  // seul critère qui sépare un ami ramené d'un compte fabriqué.
  const referralIds = (referrals.data ?? []).map((row) => row.referred_id);
  const referralActivity = await activityOf(referralIds, now);

  const outgoing = await enrichTransfers(
    (out.data ?? []) as TransferRow[],
    playerId,
    'seller',
  );
  const incoming = ((income.data ?? []) as TransferRow[]).map(
    (row): EconomicTransfer => ({
      counterpartyId: row.seller_id,
      amount: row.price,
      at: new Date(row.at),
      heldForMs: null,
      fromStarterChest: false,
      counterpartyRelated: false,
    }),
  );

  const assessment = assessRisk({
    accountAgeMs,
    accountsSharingContext: typeof related.data === 'number' ? related.data : 1,
    chestsOpenedRecently: chests.count ?? 0,
    hasLockedCrew: (crew.count ?? 0) > 0,
    referrals: referralActivity,
    outgoingTransfers: outgoing,
    incomingTransfers: incoming,
    now,
  });

  // On conserve **toutes** les évaluations, jamais écrasées : c'est
  // l'historique qui montre qu'un compte blanchi a été re-signalé.
  await db().from('risk_assessments').insert({
    player_id: playerId,
    score: assessment.score,
    level: assessment.level,
    signals: assessment.signals,
  });

  return assessment;
}

/** Âge et activité de chaque filleul. */
async function activityOf(
  playerIds: string[],
  now: Date,
): Promise<{ hasLockedCrew: boolean; accountAgeMs: number }[]> {
  if (playerIds.length === 0) return [];

  const [accounts, teams] = await Promise.all([
    db().from('user_accounts').select('player_id, created_at').in('player_id', playerIds),
    db().from('teams').select('player_id').in('player_id', playerIds),
  ]);

  const played = new Set((teams.data ?? []).map((row) => row.player_id));

  return (accounts.data ?? []).map((row) => ({
    hasLockedCrew: played.has(row.player_id),
    accountAgeMs: now.getTime() - new Date(row.created_at).getTime(),
  }));
}

/**
 * Complète chaque transfert des deux faits qui font la différence : depuis
 * combien de temps le vendeur détenait la carte, et d'où elle venait.
 *
 * Sans eux, le moteur ne verrait que « une carte a changé de main » — ce qui
 * décrit aussi bien une ferme de comptes qu'un marché qui fonctionne.
 */
async function enrichTransfers(
  rows: TransferRow[],
  playerId: string,
  side: 'seller' | 'buyer',
): Promise<EconomicTransfer[]> {
  if (rows.length === 0) return [];

  const counterparties = [
    ...new Set(rows.map((row) => (side === 'seller' ? row.buyer_id : row.seller_id))),
  ];

  const [ownership, mine, theirs] = await Promise.all([
    db()
      .from('card_ownership')
      .select('character_id, player_id, source, at')
      .eq('player_id', playerId)
      .in('character_id', [...new Set(rows.map((r) => r.character_id))]),
    db().from('user_accounts').select('signup_ip').eq('player_id', playerId).maybeSingle(),
    db().from('user_accounts').select('player_id, signup_ip').in('player_id', counterparties),
  ]);

  const myIp = mine.data?.signup_ip ?? null;
  const relatedIds = new Set(
    (theirs.data ?? [])
      .filter((row) => myIp !== null && row.signup_ip === myIp)
      .map((row) => row.player_id),
  );

  // Acquisition la plus récente de chaque personnage par ce joueur.
  const acquired = new Map<string, { at: Date; source: string }>();
  for (const row of ownership.data ?? []) {
    const at = new Date(row.at);
    const known = acquired.get(row.character_id);
    if (!known || at > known.at) {
      acquired.set(row.character_id, { at, source: row.source });
    }
  }

  return rows.map((row): EconomicTransfer => {
    const counterpartyId = side === 'seller' ? row.buyer_id : row.seller_id;
    const origin = acquired.get(row.character_id);
    const soldAt = new Date(row.at);

    return {
      counterpartyId,
      amount: row.price,
      at: soldAt,
      heldForMs: origin ? soldAt.getTime() - origin.at.getTime() : null,
      fromStarterChest: origin?.source === 'STARTER_CHEST',
      counterpartyRelated: relatedIds.has(counterpartyId),
    };
  });
}

/** Dernière évaluation connue, sans en calculer une nouvelle. */
export async function lastAssessment(playerId: string) {
  if (!isDatabaseConfigured()) return null;

  const { data } = await db()
    .from('risk_assessments')
    .select('score, level, signals, at, reviewed_at, verdict')
    .eq('player_id', playerId)
    .order('at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

export { DAY };
