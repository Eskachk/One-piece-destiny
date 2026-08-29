import 'server-only';

import { db } from '@/lib/supabase-admin';
import { nextSundayLockInstant } from '@/domain/chapter/lock';
import { CURRENT_SCORING_VERSION } from '@/domain/scoring';
import type {
  ChapterAppearance,
  ChapterEvent,
  ChapterStatus,
  LockedTeam,
} from '@/domain/types';
import { INITIAL_DIVISION_STATE } from '@/domain/season/divisions';
import type {
  ChapterResultRow,
  Repository,
  StoredAward,
  StoredWeeklyProfile,
} from './types';

/**
 * Dépôt Supabase / Postgres.
 *
 * ⚠️ Ce client utilise la clé de service : il contourne RLS par conception et
 * ne doit jamais être importé depuis un composant client. Le `server-only`
 * en tête de fichier fait échouer le build si cela arrive.
 *
 * Tant que RLS n'est pas activé avec des policies (cahier §89), c'est ce
 * serveur qui porte seul le contrôle d'accès.
 */

interface ChapterRow {
  id: string;
  chapter_number: number;
  status: ChapterStatus;
  team_lock_at: string;
  official_release_at: string | null;
  results_published_at: string | null;
  scoring_version: string;
  data_version: string;
}

function toChapter(row: ChapterRow): ChapterEvent {
  return {
    id: row.id,
    chapterNumber: row.chapter_number,
    status: row.status,
    teamLockAt: new Date(row.team_lock_at),
    officialReleaseAt: row.official_release_at
      ? new Date(row.official_release_at)
      : null,
    resultsPublishedAt: row.results_published_at
      ? new Date(row.results_published_at)
      : null,
    scoringVersion: row.scoring_version,
    dataVersion: row.data_version,
  };
}

/** Le joueur est créé à la volée tant que l'authentification (§86) manque. */
async function ensurePlayerRow(playerId: string): Promise<void> {
  const { error } = await db()
    .from('players')
    .upsert(
      { id: playerId, handle: playerId.slice(0, 8) },
      { onConflict: 'id', ignoreDuplicates: true },
    );
  if (error) throw new Error(`players.upsert : ${error.message}`);
}

async function teamIdFor(
  playerId: string,
  chapterId: string,
): Promise<string | null> {
  const { data, error } = await db()
    .from('teams')
    .select('id')
    .eq('player_id', playerId)
    .eq('chapter_id', chapterId)
    .maybeSingle();
  if (error) throw new Error(`teams.select : ${error.message}`);
  return data?.id ?? null;
}

export const postgresRepository: Repository = {
  async getCurrentChapter() {
    // Le chapitre ouvert est celui qui n'a pas encore publié ses résultats.
    const { data, error } = await db()
      .from('chapter_events')
      .select('*')
      .not('status', 'in', '("RESULTS_PUBLISHED","CANCELLED")')
      .order('chapter_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`chapter_events.select : ${error.message}`);
    return data ? toChapter(data as ChapterRow) : null;
  },

  async getLatestPublishedChapter() {
    const { data, error } = await db()
      .from('chapter_events')
      .select('*')
      .eq('status', 'RESULTS_PUBLISHED')
      .order('chapter_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(`chapter_events.select : ${error.message}`);
    return data ? toChapter(data as ChapterRow) : null;
  },

  async proposeNextChapterNumber() {
    const { data } = await db()
      .from('chapter_events')
      .select('chapter_number')
      .order('chapter_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    return (data?.chapter_number ?? 1179) + 1;
  },

  async createChapter(chapterNumber, teamLockAt) {
    const { data, error } = await db()
      .from('chapter_events')
      .insert({
        chapter_number: chapterNumber,
        status: 'NORMAL',
        team_lock_at: teamLockAt.toISOString(),
        scoring_version: CURRENT_SCORING_VERSION,
        data_version: '2026.08.01',
      })
      .select('*')
      .single();

    if (error) throw new Error(`chapter_events.insert : ${error.message}`);
    return toChapter(data as ChapterRow);
  },

  async updateChapter(chapter) {
    const { error } = await db()
      .from('chapter_events')
      .update({
        status: chapter.status,
        team_lock_at: chapter.teamLockAt.toISOString(),
        official_release_at: chapter.officialReleaseAt?.toISOString() ?? null,
        results_published_at: chapter.resultsPublishedAt?.toISOString() ?? null,
      })
      .eq('id', chapter.id);
    if (error) throw new Error(`chapter_events.update : ${error.message}`);
  },

  async getTeam(playerId, chapterId) {
    const { data, error } = await db()
      .from('teams')
      .select('player_id, chapter_id, character_ids, updated_at')
      .eq('player_id', playerId)
      .eq('chapter_id', chapterId)
      .maybeSingle();

    if (error) throw new Error(`teams.select : ${error.message}`);
    if (!data) return null;

    return {
      userId: data.player_id,
      chapterId: data.chapter_id,
      characterIds: data.character_ids as [string, string, string],
      lockedAt: new Date(data.updated_at),
    };
  },

  async saveTeam(playerId, chapterId, characterIds) {
    await ensurePlayerRow(playerId);

    const { data, error } = await db()
      .from('teams')
      .upsert(
        {
          player_id: playerId,
          chapter_id: chapterId,
          character_ids: characterIds,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'player_id,chapter_id' },
      )
      .select('id')
      .single();

    if (error) throw new Error(`teams.upsert : ${error.message}`);

    // Historique avant verrouillage (§83) : on empile, on n'écrase jamais.
    const snapshot = await db()
      .from('team_snapshots')
      .insert({ team_id: data.id, character_ids: characterIds });

    if (snapshot.error) {
      throw new Error(`team_snapshots.insert : ${snapshot.error.message}`);
    }
  },

  async listTeams(chapterId) {
    const { data, error } = await db()
      .from('teams')
      .select('player_id, chapter_id, character_ids, updated_at')
      .eq('chapter_id', chapterId);

    if (error) throw new Error(`teams.list : ${error.message}`);

    return (data ?? []).map(
      (row): LockedTeam => ({
        userId: row.player_id,
        chapterId: row.chapter_id,
        characterIds: row.character_ids as [string, string, string],
        lockedAt: new Date(row.updated_at),
      }),
    );
  },

  async getAppearances(chapterId) {
    const { data, error } = await db()
      .from('chapter_appearances')
      .select('character_id, appearances')
      .eq('chapter_id', chapterId);

    if (error) throw new Error(`chapter_appearances.select : ${error.message}`);

    return (data ?? []).map(
      (row): ChapterAppearance => ({
        characterId: row.character_id,
        appearances: row.appearances,
      }),
    );
  },

  async getAppearanceHistory(chapters) {
    const { data, error } = await db()
      .from('chapter_appearances')
      .select('character_id, appearances, chapter_events!inner(chapter_number)')
      .order('chapter_id', { ascending: false })
      .limit(chapters * 60);

    if (error) {
      throw new Error(`chapter_appearances.history : ${error.message}`);
    }

    return (data ?? []).map((row) => {
      const chapter = row.chapter_events as unknown as {
        chapter_number: number;
      };
      return {
        chapterNumber: chapter.chapter_number,
        characterId: row.character_id,
        appearances: row.appearances,
      };
    });
  },

  async setAppearances(chapterId, appearances) {
    // Remplacement complet : la validation humaine fait foi (§5.2).
    const removed = await db()
      .from('chapter_appearances')
      .delete()
      .eq('chapter_id', chapterId);
    if (removed.error) {
      throw new Error(`chapter_appearances.delete : ${removed.error.message}`);
    }

    if (appearances.length === 0) return;

    const { error } = await db().from('chapter_appearances').insert(
      appearances.map((appearance) => ({
        chapter_id: chapterId,
        character_id: appearance.characterId,
        appearances: appearance.appearances,
        validated_at: new Date().toISOString(),
      })),
    );
    if (error) throw new Error(`chapter_appearances.insert : ${error.message}`);
  },

  async saveResults(chapterId, rows) {
    for (const row of rows) {
      const teamId = await teamIdFor(row.playerId, chapterId);
      if (!teamId) continue;

      const characters = row.breakdown as {
        base: number;
        synergy: number;
        risk: number;
      }[];

      const sum = (key: 'base' | 'synergy' | 'risk') =>
        characters.reduce((total, c) => total + c[key], 0);

      const { error } = await db().from('team_scores').upsert(
        {
          team_id: teamId,
          chapter_id: chapterId,
          base_total: sum('base'),
          synergy_total: sum('synergy'),
          risk_total: sum('risk'),
          total: row.total,
          breakdown: row.breakdown,
          scoring_version: CURRENT_SCORING_VERSION,
        },
        { onConflict: 'team_id' },
      );
      if (error) throw new Error(`team_scores.upsert : ${error.message}`);
    }
  },

  async getLeaderboard(chapterId) {
    const { data, error } = await db()
      .from('team_scores')
      .select('total, breakdown, teams!inner(player_id, players!inner(handle))')
      .eq('chapter_id', chapterId)
      .order('total', { ascending: false });

    if (error) throw new Error(`team_scores.select : ${error.message}`);

    return (data ?? []).map((row): ChapterResultRow => {
      const team = row.teams as unknown as {
        player_id: string;
        players: { handle: string };
      };
      return {
        playerId: team.player_id,
        handle: team.players.handle,
        total: row.total,
        breakdown: row.breakdown,
      };
    });
  },

  async getOwnedCharacterIds(playerId) {
    const { data, error } = await db()
      .from('inventory')
      .select('character_id')
      .eq('player_id', playerId);

    if (error) throw new Error(`inventory.select : ${error.message}`);
    return (data ?? []).map((row) => row.character_id);
  },

  /**
   * Identité des cartes possédées (code de série, numéro d'émission).
   *
   * Requête distincte de `getOwnedCharacterIds` : la plupart des écrans n'ont
   * besoin que de savoir *quels* personnages sont possédés, pas de charger
   * l'identité de chaque exemplaire.
   */
  async getCardIdentities(playerId) {
    const { data, error } = await db()
      .from('inventory')
      .select('character_id, serial_code, mint_number, obtained_from, obtained_at')
      .eq('player_id', playerId);

    if (error) throw new Error(`inventory.select : ${error.message}`);

    return (data ?? []).map((row) => ({
      characterId: row.character_id,
      serialCode: row.serial_code,
      mintNumber: row.mint_number,
      obtainedFrom: row.obtained_from,
      obtainedAt: new Date(row.obtained_at),
    }));
  },

  async getShards(playerId) {
    const { data, error } = await db()
      .from('character_shards')
      .select('character_id, shards')
      .eq('player_id', playerId);

    if (error) throw new Error(`character_shards.select : ${error.message}`);
    return new Map((data ?? []).map((row) => [row.character_id, row.shards]));
  },

  async getProgress(playerId) {
    const { data, error } = await db()
      .from('player_progress')
      .select('pity_counter, starter_chest_opened_at, unopened_chests')
      .eq('player_id', playerId)
      .maybeSingle();

    if (error) throw new Error(`player_progress.select : ${error.message}`);

    return {
      pityCounter: data?.pity_counter ?? 0,
      starterChestOpened: Boolean(data?.starter_chest_opened_at),
      unopenedChests: data?.unopened_chests ?? 0,
    };
  },

  async applyChestOpening(input) {
    // §92 : la clé d'idempotence est posée en premier. Si l'insertion
    // échoue sur la contrainte d'unicité, le coffre a déjà été ouvert et
    // rien d'autre ne doit être appliqué.
    const claim = await db()
      .from('chest_openings')
      .insert({
        player_id: input.playerId,
        kind: input.kind,
        cards: input.cards,
        pity_triggered: input.pityTriggered,
        client_request_id: input.clientRequestId,
      })
      .select('id')
      .maybeSingle();

    if (claim.error) {
      // 23505 = violation d'unicité : double envoi du même formulaire.
      if (claim.error.code === '23505') return 'already-applied';
      throw new Error(`chest_openings.insert : ${claim.error.message}`);
    }

    const fresh = input.cards.filter((card) => !card.duplicate);
    if (fresh.length > 0) {
      // `ignoreDuplicates` protège d'une course : deux coffres simultanés
      // ne doivent pas produire deux lignes pour le même personnage.
      const { data: inserted, error } = await db()
        .from('inventory')
        .upsert(
          fresh.map((card) => ({
            player_id: input.playerId,
            character_id: card.characterId,
            obtained_from: input.kind === 'STARTER' ? 'Coffre d\'inscription' : 'Coffre',
          })),
          { onConflict: 'player_id,character_id', ignoreDuplicates: true },
        )
        .select('id');
      if (error) throw new Error(`inventory.upsert : ${error.message}`);

      // Frappe : chaque carte neuve reçoit son code unique et son numéro
      // d'émission. Le tirage du code a lieu en base, jamais côté client (§97).
      for (const row of inserted ?? []) {
        await db().rpc('mint_card', { p_inventory_id: row.id });
      }
    }

    for (const card of input.cards.filter((c) => c.duplicate)) {
      const { data: existing } = await db()
        .from('character_shards')
        .select('shards')
        .eq('player_id', input.playerId)
        .eq('character_id', card.characterId)
        .maybeSingle();

      const { error } = await db().from('character_shards').upsert(
        {
          player_id: input.playerId,
          character_id: card.characterId,
          shards: (existing?.shards ?? 0) + card.shards,
        },
        { onConflict: 'player_id,character_id' },
      );
      if (error) throw new Error(`character_shards.upsert : ${error.message}`);
    }

    const now = new Date().toISOString();
    const { error: progressError } = await db().from('player_progress').upsert(
      {
        player_id: input.playerId,
        pity_counter: input.pityCounter,
        ...(input.kind === 'STARTER' ? { starter_chest_opened_at: now } : {}),
        updated_at: now,
      },
      { onConflict: 'player_id' },
    );
    if (progressError) {
      throw new Error(`player_progress.upsert : ${progressError.message}`);
    }

    return 'applied';
  },

  async getWallet(playerId) {
    const { data, error } = await db()
      .from('wallets')
      .select('berries, version')
      .eq('player_id', playerId)
      .maybeSingle();

    if (error) throw new Error(`wallets.select : ${error.message}`);
    if (data) return { berries: data.berries, version: data.version };

    // Portefeuille créé à la volée, à zéro.
    await db()
      .from('wallets')
      .upsert({ player_id: playerId }, { onConflict: 'player_id', ignoreDuplicates: true });
    return { berries: 0, version: 0 };
  },

  async spendBerries(playerId, amount, expectedVersion) {
    // La lecture et l'écriture sont une seule opération côté base (§93) :
    // deux requêtes concurrentes ne peuvent pas dépenser le même solde.
    const { data, error } = await db().rpc('spend_berries', {
      p_player_id: playerId,
      p_amount: amount,
      p_expected_version: expectedVersion,
    });

    if (error) throw new Error(`spend_berries : ${error.message}`);
    return data !== null;
  },

  async grantBerriesAndChests(playerId, berries, chests) {
    if (berries > 0) {
      const wallet = await postgresRepository.getWallet(playerId);
      const { error } = await db()
        .from('wallets')
        .update({ berries: wallet.berries + berries, version: wallet.version + 1 })
        .eq('player_id', playerId)
        .eq('version', wallet.version);
      if (error) throw new Error(`wallets.update : ${error.message}`);
    }

    if (chests > 0) {
      const { data } = await db()
        .from('player_progress')
        .select('unopened_chests')
        .eq('player_id', playerId)
        .maybeSingle();

      const { error } = await db().from('player_progress').upsert(
        {
          player_id: playerId,
          unopened_chests: (data?.unopened_chests ?? 0) + chests,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'player_id' },
      );
      if (error) throw new Error(`player_progress.upsert : ${error.message}`);
    }
  },

  async consumeChest(playerId) {
    const { data } = await db()
      .from('player_progress')
      .select('unopened_chests')
      .eq('player_id', playerId)
      .maybeSingle();

    const available = data?.unopened_chests ?? 0;
    if (available <= 0) return false;

    // Le filtre sur la valeur attendue joue le rôle de verrou : deux
    // ouvertures simultanées ne peuvent pas consommer le même coffre.
    const { data: updated } = await db()
      .from('player_progress')
      .update({ unopened_chests: available - 1 })
      .eq('player_id', playerId)
      .eq('unopened_chests', available)
      .select('player_id')
      .maybeSingle();

    return updated !== null;
  },

  async craftCharacter(playerId, characterId, cost) {
    const { data: shardRow } = await db()
      .from('character_shards')
      .select('shards')
      .eq('player_id', playerId)
      .eq('character_id', characterId)
      .maybeSingle();

    const available = shardRow?.shards ?? 0;
    if (available < cost) return false;

    // Débit conditionné au solde lu : si une autre requête a dépensé entre
    // temps, la condition ne matche plus et rien n'est débité.
    const { data: debited } = await db()
      .from('character_shards')
      .update({ shards: available - cost })
      .eq('player_id', playerId)
      .eq('character_id', characterId)
      .eq('shards', available)
      .select('character_id')
      .maybeSingle();

    if (!debited) return false;

    const { data: crafted, error } = await db()
      .from('inventory')
      .upsert(
        {
          player_id: playerId,
          character_id: characterId,
          obtained_from: 'Fabrication (fragments)',
        },
        { onConflict: 'player_id,character_id', ignoreDuplicates: true },
      )
      .select('id');
    if (error) throw new Error(`inventory.upsert : ${error.message}`);

    // Une carte fabriquée est une carte comme une autre : elle porte son code
    // et son numéro d'émission.
    for (const row of crafted ?? []) {
      await db().rpc('mint_card', { p_inventory_id: row.id });
    }

    await db().from('craft_log').insert({
      player_id: playerId,
      character_id: characterId,
      shards_spent: cost,
    });

    return true;
  },

  async grantWeeklyRewards(chapterId, grants) {
    let applied = 0;

    for (const grant of grants) {
      // La clé primaire (player_id, chapter_id) porte l'idempotence :
      // republier un chapitre ne distribue pas deux fois les Berries.
      const claim = await db()
        .from('weekly_rewards')
        .insert({
          player_id: grant.playerId,
          chapter_id: chapterId,
          berries: grant.berries,
          chests: grant.chests,
          percentile: grant.percentile,
        })
        .select('player_id')
        .maybeSingle();

      if (claim.error) {
        if (claim.error.code === '23505') continue; // déjà attribué
        throw new Error(`weekly_rewards.insert : ${claim.error.message}`);
      }

      await postgresRepository.grantBerriesAndChests(
        grant.playerId,
        grant.berries,
        grant.chests,
      );
      applied += 1;
    }

    return applied;
  },
  async getDivisionState(playerId) {
    const { data } = await db()
      .from('player_progress')
      .select('division, promotion_streak, relegation_streak')
      .eq('player_id', playerId)
      .maybeSingle();

    if (!data) return INITIAL_DIVISION_STATE;
    return {
      division: data.division,
      promotionStreak: data.promotion_streak,
      relegationStreak: data.relegation_streak,
    };
  },

  async setDivisionState(playerId, state) {
    const { error } = await db().from('player_progress').upsert(
      {
        player_id: playerId,
        division: state.division,
        promotion_streak: state.promotionStreak,
        relegation_streak: state.relegationStreak,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'player_id' },
    );
    if (error) throw new Error(`player_progress.upsert : ${error.message}`);
  },

  async getWeeklyProfiles(playerId) {
    const { data, error } = await db()
      .from('weekly_profiles')
      .select('chapter_id, risk, synergy_share, average_pick_rate, total, percentile, chapter_events!inner(chapter_number)')
      .eq('player_id', playerId)
      .order('recorded_at', { ascending: false })
      .limit(60);

    if (error) throw new Error(`weekly_profiles.select : ${error.message}`);

    return (data ?? []).map((row): StoredWeeklyProfile => {
      const chapter = row.chapter_events as unknown as { chapter_number: number };
      return {
        playerId,
        chapterId: row.chapter_id,
        chapterNumber: chapter.chapter_number,
        risk: Number(row.risk),
        synergyShare: Number(row.synergy_share),
        averagePickRate: Number(row.average_pick_rate),
        total: row.total,
        percentile: row.percentile === null ? null : Number(row.percentile),
      };
    });
  },

  async recordWeeklyProfile(input) {
    // Clé (joueur, chapitre) : republier un chapitre met à jour la ligne
    // plutôt que d'en empiler une seconde (§79).
    const { error } = await db().from('weekly_profiles').upsert(
      {
        player_id: input.playerId,
        chapter_id: input.chapterId,
        risk: input.risk,
        synergy_share: input.synergyShare,
        average_pick_rate: input.averagePickRate,
        total: input.total,
        percentile: input.percentile,
      },
      { onConflict: 'player_id,chapter_id' },
    );
    if (error) throw new Error(`weekly_profiles.upsert : ${error.message}`);
  },

  async saveChapterAnalysis(chapterId, payload) {
    const { error } = await db().from('chapter_analysis').upsert(
      { chapter_id: chapterId, payload },
      { onConflict: 'chapter_id' },
    );
    if (error) throw new Error(`chapter_analysis.upsert : ${error.message}`);
  },

  async getChapterAnalysis(chapterId) {
    const { data } = await db()
      .from('chapter_analysis')
      .select('payload')
      .eq('chapter_id', chapterId)
      .maybeSingle();
    return data?.payload ?? null;
  },

  async saveChapterAwards(chapterId, awards) {
    if (awards.length === 0) return;
    const { error } = await db().from('chapter_awards').upsert(
      awards.map((a) => ({
        chapter_id: chapterId,
        award: a.award,
        player_id: a.playerId,
        value: a.value,
      })),
      { onConflict: 'chapter_id,award' },
    );
    if (error) throw new Error(`chapter_awards.upsert : ${error.message}`);
  },

  async getChapterAwards(chapterId) {
    const { data, error } = await db()
      .from('chapter_awards')
      .select('award, player_id, value, players!inner(handle)')
      .eq('chapter_id', chapterId);

    if (error) throw new Error(`chapter_awards.select : ${error.message}`);

    return (data ?? []).map((row): StoredAward => {
      const player = row.players as unknown as { handle: string };
      return {
        award: row.award,
        playerId: row.player_id,
        handle: player.handle,
        value: Number(row.value),
      };
    });
  },
};
