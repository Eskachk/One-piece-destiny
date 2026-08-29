import 'server-only';

import { db, isDatabaseConfigured } from '@/lib/supabase-admin';

/**
 * Statistiques du Chapter HQ (cahier §82).
 *
 * Toutes les requêtes sont des **agrégats**, jamais des listes complètes :
 * on demande à Postgres de compter, on ne rapatrie pas des milliers de lignes
 * pour les compter en JavaScript. C'est la différence entre une page qui tient
 * la charge et une page qui la crée.
 *
 * Les lectures partent ensemble. Enchaînées, elles cumuleraient une vingtaine
 * d'allers-retours pour un seul affichage.
 */

export interface PlayerStats {
  total: number;
  createdLast24h: number;
  createdLast7d: number;
  verified: number;
  withStarterOpened: number;
  everLockedCrew: number;
  restricted: number;
}

export interface EconomyStats {
  berriesInCirculation: number;
  chestsUnopened: number;
  cardsMinted: number;
  chestsOpenedLast7d: number;
  marketListingsActive: number;
  marketSalesLast7d: number;
  marketVolumeLast7d: number;
}

export interface ChapterStats {
  chapterNumber: number;
  status: string;
  teamsLocked: number;
  averageScore: number | null;
  topScore: number | null;
}

export interface RiskStats {
  pendingReview: number;
  restricted: number;
  falsePositives: number;
}

export interface AdminStats {
  players: PlayerStats;
  economy: EconomyStats;
  chapters: ChapterStats[];
  risk: RiskStats;
}

const DAY = 24 * 60 * 60 * 1000;

/** Compte exact sans rapatrier les lignes. */
async function countOf(
  table: string,
  apply: (query: ReturnType<typeof buildCount>) => unknown = (q) => q,
): Promise<number> {
  const query = buildCount(table);
  const result = (await apply(query)) as { count: number | null };
  return result.count ?? 0;
}

function buildCount(table: string) {
  return db().from(table).select('*', { count: 'exact', head: true });
}

export async function adminStats(): Promise<AdminStats | null> {
  if (!isDatabaseConfigured()) return null;

  const now = Date.now();
  const since24h = new Date(now - DAY).toISOString();
  const since7d = new Date(now - 7 * DAY).toISOString();

  const [
    playersTotal,
    created24h,
    created7d,
    verified,
    starterOpened,
    lockedCrew,
    restricted,
    wallets,
    cards,
    chests7d,
    listings,
    sales7d,
    pendingReview,
    falsePositives,
    chapters,
  ] = await Promise.all([
    countOf('players'),
    countOf('user_accounts', (q) => q.gte('created_at', since24h)),
    countOf('user_accounts', (q) => q.gte('created_at', since7d)),
    countOf('user_accounts', (q) => q.not('email_verified_at', 'is', null)),
    countOf('player_progress', (q) => q.not('starter_chest_opened_at', 'is', null)),
    // `teams` compte les équipages, pas les joueurs : on dédoublonne plus bas.
    db().from('teams').select('player_id'),
    countOf('account_restrictions'),
    db().from('wallets').select('berries, unopened_chests'),
    countOf('inventory', (q) => q.not('serial_code', 'is', null)),
    countOf('chest_openings', (q) => q.gte('opened_at', since7d)),
    countOf('market_listings', (q) => q.eq('status', 'ACTIVE')),
    db().from('market_transactions').select('price').gte('at', since7d),
    countOf('risk_assessments', (q) =>
      q.is('reviewed_at', null).in('level', ['REVIEW', 'RESTRICTED', 'HIGH_RISK']),
    ),
    countOf('risk_assessments', (q) => q.eq('verdict', 'FALSE_POSITIVE')),
    db()
      .from('chapter_events')
      .select('id, chapter_number, status')
      .order('chapter_number', { ascending: false })
      .limit(6),
  ]);

  const walletRows = (wallets.data ?? []) as {
    berries: number;
    unopened_chests: number;
  }[];

  const saleRows = (sales7d.data ?? []) as { price: number }[];

  return {
    players: {
      total: playersTotal,
      createdLast24h: created24h,
      createdLast7d: created7d,
      verified,
      withStarterOpened: starterOpened,
      everLockedCrew: new Set(
        ((lockedCrew.data ?? []) as { player_id: string }[]).map((r) => r.player_id),
      ).size,
      restricted,
    },
    economy: {
      berriesInCirculation: walletRows.reduce((sum, w) => sum + w.berries, 0),
      chestsUnopened: walletRows.reduce((sum, w) => sum + w.unopened_chests, 0),
      cardsMinted: cards,
      chestsOpenedLast7d: chests7d,
      marketListingsActive: listings,
      marketSalesLast7d: saleRows.length,
      marketVolumeLast7d: saleRows.reduce((sum, s) => sum + s.price, 0),
    },
    chapters: await chapterStats(
      ((chapters.data ?? []) as { id: string; chapter_number: number; status: string }[]),
    ),
    risk: {
      pendingReview,
      restricted,
      falsePositives,
    },
  };
}

/**
 * Résultats des derniers chapitres.
 *
 * Les scores sont **lus tels qu'ils ont été calculés**, jamais recalculés à la
 * consultation (§75) : un tableau de bord qui recalcule finit par afficher des
 * chiffres que le classement ne montre pas.
 */
async function chapterStats(
  rows: { id: string; chapter_number: number; status: string }[],
): Promise<ChapterStats[]> {
  if (rows.length === 0) return [];

  const scores = await db()
    .from('team_scores')
    .select('chapter_id, total')
    .in(
      'chapter_id',
      rows.map((r) => r.id),
    );

  const byChapter = new Map<string, number[]>();
  for (const row of (scores.data ?? []) as { chapter_id: string; total: number }[]) {
    const list = byChapter.get(row.chapter_id) ?? [];
    list.push(row.total);
    byChapter.set(row.chapter_id, list);
  }

  return rows.map((row) => {
    const totals = byChapter.get(row.id) ?? [];
    return {
      chapterNumber: row.chapter_number,
      status: row.status,
      teamsLocked: totals.length,
      averageScore:
        totals.length > 0
          ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length)
          : null,
      topScore: totals.length > 0 ? Math.max(...totals) : null,
    };
  });
}
