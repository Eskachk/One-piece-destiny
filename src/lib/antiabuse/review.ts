import 'server-only';

import { db, isDatabaseConfigured } from '@/lib/supabase-admin';

/**
 * Lectures du Fraud Center (cahier §43, cadrage §26).
 *
 * Ces requêtes ne décident rien : elles rassemblent ce qu'un administrateur
 * doit voir **avant** de décider. Un score sans son contexte — l'âge du
 * compte, ses transferts, ses filleuls — n'est pas exploitable, et pousserait
 * à trancher sur un chiffre.
 */

export interface SuspiciousAccount {
  playerId: string;
  handle: string;
  email: string | null;
  createdAt: Date;
  score: number;
  level: string;
  signals: { name: string; detail: string }[];
  assessedAt: Date;
  restricted: boolean;
}

/**
 * Comptes signalés et non encore examinés, du plus risqué au moins risqué.
 *
 * On ne retient que la **dernière** évaluation de chaque compte : les
 * précédentes restent en base pour l'historique, mais une file d'attente qui
 * répète dix fois le même compte est une file qu'on cesse de lire.
 */
export async function suspiciousAccounts(limit = 40): Promise<SuspiciousAccount[]> {
  if (!isDatabaseConfigured()) return [];

  const { data } = await db()
    .from('risk_assessments')
    .select('player_id, score, level, signals, at, players!inner(handle)')
    .is('reviewed_at', null)
    .in('level', ['REVIEW', 'RESTRICTED', 'HIGH_RISK'])
    .order('at', { ascending: false })
    .limit(limit * 4);

  // Type explicite plutôt que dérivé de la requête : `data` est typé `… | null`
  // par le client Supabase, et `(typeof data)[number]` n'a alors aucun sens.
  type Row = {
    player_id: string;
    score: number;
    level: string;
    signals: unknown;
    at: string;
    players: { handle: string } | null;
  };

  const latest = new Map<string, Row>();
  for (const row of (data ?? []) as unknown as Row[]) {
    if (!latest.has(row.player_id)) latest.set(row.player_id, row);
  }

  const playerIds = [...latest.keys()].slice(0, limit);
  if (playerIds.length === 0) return [];

  const [accounts, restrictions] = await Promise.all([
    db()
      .from('user_accounts')
      .select('player_id, email, created_at')
      .in('player_id', playerIds),
    db().from('account_restrictions').select('player_id').in('player_id', playerIds),
  ]);

  const accountById = new Map(
    ((accounts.data ?? []) as { player_id: string; email: string; created_at: string }[]).map(
      (row) => [row.player_id, row],
    ),
  );
  const restrictedIds = new Set(
    ((restrictions.data ?? []) as { player_id: string }[]).map((r) => r.player_id),
  );

  return playerIds
    .map((playerId) => {
      const row = latest.get(playerId)!;
      const account = accountById.get(playerId);
      return {
        playerId,
        handle: row.players?.handle ?? playerId.slice(0, 8),
        email: account?.email ?? null,
        createdAt: account ? new Date(account.created_at) : new Date(row.at),
        score: row.score,
        level: row.level,
        signals: (row.signals as { name: string; detail: string }[]) ?? [],
        assessedAt: new Date(row.at),
        restricted: restrictedIds.has(playerId),
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Graphe économique d'un compte : qui lui envoie de la valeur, à qui il en
 * envoie.
 *
 * Volontairement **plat** — une liste de contreparties agrégées, pas un
 * graphe généralisé. Le cadrage le dit (§13) : une structure relationnelle
 * simple suffit d'abord, et un vrai moteur de graphes coûterait bien plus
 * cher qu'il ne rapporterait à cette échelle.
 */
export async function economicNeighbours(playerId: string): Promise<{
  outgoing: { counterpartyId: string; handle: string; count: number; volume: number }[];
  incoming: { counterpartyId: string; handle: string; count: number; volume: number }[];
}> {
  if (!isDatabaseConfigured()) return { outgoing: [], incoming: [] };

  const [sold, bought] = await Promise.all([
    db()
      .from('market_transactions')
      .select('buyer_id, price')
      .eq('seller_id', playerId),
    db()
      .from('market_transactions')
      .select('seller_id, price')
      .eq('buyer_id', playerId),
  ]);

  const aggregate = (
    rows: { price: number }[],
    key: (row: Record<string, unknown>) => string,
  ) => {
    const map = new Map<string, { count: number; volume: number }>();
    for (const row of rows) {
      const id = key(row as Record<string, unknown>);
      const entry = map.get(id) ?? { count: 0, volume: 0 };
      entry.count += 1;
      entry.volume += row.price;
      map.set(id, entry);
    }
    return map;
  };

  const out = aggregate((sold.data ?? []) as { price: number }[], (r) => r.buyer_id as string);
  const inc = aggregate((bought.data ?? []) as { price: number }[], (r) => r.seller_id as string);

  const ids = [...new Set([...out.keys(), ...inc.keys()])];
  const handles = new Map<string, string>();
  if (ids.length > 0) {
    const { data } = await db().from('players').select('id, handle').in('id', ids);
    for (const row of (data ?? []) as { id: string; handle: string }[]) {
      handles.set(row.id, row.handle);
    }
  }

  const shape = (map: Map<string, { count: number; volume: number }>) =>
    [...map.entries()]
      .map(([counterpartyId, value]) => ({
        counterpartyId,
        handle: handles.get(counterpartyId) ?? counterpartyId.slice(0, 8),
        ...value,
      }))
      .sort((a, b) => b.count - a.count);

  return { outgoing: shape(out), incoming: shape(inc) };
}

/** Comptes partageant le contexte technique d'inscription. */
export async function relatedAccounts(playerId: string): Promise<
  { playerId: string; handle: string; createdAt: Date; hasPlayed: boolean }[]
> {
  if (!isDatabaseConfigured()) return [];

  const { data: mine } = await db()
    .from('user_accounts')
    .select('signup_ip')
    .eq('player_id', playerId)
    .maybeSingle();

  if (!mine?.signup_ip) return [];

  const { data } = await db()
    .from('user_accounts')
    .select('player_id, created_at, players!inner(handle)')
    .eq('signup_ip', mine.signup_ip)
    .limit(50);

  const ids = (data ?? []).map((row) => row.player_id);
  const { data: teams } = await db().from('teams').select('player_id').in('player_id', ids);
  const played = new Set(((teams ?? []) as { player_id: string }[]).map((r) => r.player_id));

  return (data ?? []).map((row) => ({
    playerId: row.player_id,
    handle:
      (row.players as unknown as { handle: string } | null)?.handle ??
      row.player_id.slice(0, 8),
    createdAt: new Date(row.created_at),
    hasPlayed: played.has(row.player_id),
  }));
}

/** Marque une évaluation comme examinée. L'historique n'est jamais effacé. */
export async function markReviewed(
  playerId: string,
  verdict: 'CONFIRMED' | 'FALSE_POSITIVE',
  reviewerId: string,
): Promise<void> {
  await db()
    .from('risk_assessments')
    .update({
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
      verdict,
    })
    .eq('player_id', playerId)
    .is('reviewed_at', null);
}
