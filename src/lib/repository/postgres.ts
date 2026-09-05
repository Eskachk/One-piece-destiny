import 'server-only';

import { db } from '@/lib/supabase-admin';
import { STARTER_CARD_LOCK_MS } from '@/domain/antiabuse/config';
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

/**
 * Taille d'une tranche de pagination.
 *
 * **Le défaut corrigé ici, et pourquoi il ne se voit pas aujourd'hui.**
 *
 * PostgREST — la couche qui sert l'API de Supabase — plafonne le nombre de
 * lignes d'une réponse (`max-rows`, mille par défaut sur un projet Supabase).
 * Une requête sans borne ne renvoie donc pas « tout » : elle renvoie le
 * début, **sans erreur, sans avertissement, et sans que rien dans le code ne
 * puisse le distinguer d'un résultat complet.**
 *
 * Deux lectures du produit grandissent d'une ligne par joueur :
 * `listTeams`, que la publication parcourt pour attribuer les points, et
 * `getLeaderboard`, qui construit le classement. Au millier de joueurs, la
 * première **cesse silencieusement de noter** les suivants — ils jouent leur
 * semaine et ne reçoivent rien — et la seconde efface leur rang.
 *
 * C'est la pire forme de bogue d'échelle : invisible tant que le jeu est
 * petit, et il se déclenche le jour où il marche.
 */
const PAGE = 1000;

/**
 * Lit une table par tranches, jusqu'à épuisement.
 *
 * `build(from, to)` doit renvoyer la requête bornée par `.range(from, to)`.
 * On s'arrête sur une tranche incomplète — c'est la fin des données — ou sur
 * `MAX_PAGES`, garde-fou contre une boucle infinie si le serveur renvoyait
 * indéfiniment des tranches pleines.
 */
async function readAllPages<T>(
  label: string,
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const MAX_PAGES = 200; // 200 000 lignes : très au-delà de tout usage réel.
  const rows: T[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const from = page * PAGE;
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(`${label} : ${error.message}`);

    const tranche = data ?? [];
    rows.push(...tranche);
    if (tranche.length < PAGE) return rows;
  }

  return rows;
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
    // Une ligne par joueur ayant verrouillé cette semaine, et c'est la lecture
    // dont dépend l'attribution des points : ce qui n'est pas lu ici n'est
    // jamais noté. Paginée pour cette raison, et pas pour la mémoire.
    const data = await readAllPages<{
      player_id: string;
      chapter_id: string;
      character_ids: string[];
      updated_at: string;
    }>('teams.list', (from, to) =>
      db()
        .from('teams')
        .select('player_id, chapter_id, character_ids, updated_at')
        .eq('chapter_id', chapterId)
        // Ordre stable : sans `order`, deux tranches successives peuvent
        // renvoyer la même ligne deux fois et en sauter une autre.
        .order('player_id', { ascending: true })
        .range(from, to),
    );

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

  /**
   * Apparitions des `chapters` derniers chapitres.
   *
   * **Le défaut corrigé ici.** La requête triait sur `chapter_id` — une
   * **`uuid`**, tirée au hasard à la création du chapitre. « Les N derniers
   * chapitres » désignait donc N chapitres arbitraires, et le comptage
   * assisté proposait à l'administrateur des moyennes calculées sur un
   * échantillon quelconque de l'historique. Rien ne signalait l'erreur : le
   * tri fonctionnait, il ne classait simplement pas ce qu'on croyait.
   *
   * Le plafond était faux aussi : `chapters * 60` supposait soixante
   * personnages par chapitre, alors qu'une validation peut en porter jusqu'à
   * huit cents. Au-delà, les chapitres les plus anciens de la fenêtre étaient
   * tronqués — en silence, encore.
   *
   * On choisit donc les chapitres d'abord, sur `chapter_number`, puis on lit
   * leurs apparitions sans plafond deviné. C'est un aller-retour de plus, sur
   * un chemin d'administration appelé une fois par semaine.
   */
  async getAppearanceHistory(chapters) {
    /*
     * **Chapitres publiés seulement**, et c'est une règle d'anti-spoiler (§3),
     * pas une commodité.
     *
     * Cette fenêtre alimente désormais deux usages : le comptage assisté de
     * l'administrateur, et la récurrence affichée au joueur sur chaque carte.
     * Le second rendrait le filtre indispensable même si le premier s'en
     * passait — inclure le chapitre courant révélerait qui y figure dès la
     * saisie des apparitions, donc **avant** la publication.
     *
     * Le comptage assisté y gagne aussi : proposer un chapitre à partir de ses
     * propres apparitions déjà saisies serait circulaire.
     */
    const recents = await db()
      .from('chapter_events')
      .select('id, chapter_number')
      .eq('status', 'RESULTS_PUBLISHED')
      .order('chapter_number', { ascending: false })
      .limit(chapters);

    if (recents.error) {
      throw new Error(`chapter_events.history : ${recents.error.message}`);
    }

    const numeroParId = new Map(
      (recents.data ?? []).map((row) => [row.id as string, row.chapter_number as number]),
    );
    if (numeroParId.size === 0) return [];

    const data = await readAllPages<{
      chapter_id: string;
      character_id: string;
      appearances: number;
    }>('chapter_appearances.history', (from, to) =>
      db()
        .from('chapter_appearances')
        .select('chapter_id, character_id, appearances')
        .in('chapter_id', [...numeroParId.keys()])
        .order('chapter_id', { ascending: true })
        .order('character_id', { ascending: true })
        .range(from, to),
    );

    return (data ?? []).map((row) => ({
      chapterNumber: numeroParId.get(row.chapter_id) ?? 0,
      characterId: row.character_id,
      appearances: row.appearances,
    }));
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
    const data = await readAllPages<{
      total: number;
      breakdown: unknown;
      teams: unknown;
    }>('team_scores.select', (from, to) =>
      db()
        .from('team_scores')
        .select('total, breakdown, teams!inner(player_id, players!inner(handle))')
        .eq('chapter_id', chapterId)
        .order('total', { ascending: false })
        // Départage stable. `total` seul ne suffit pas à paginer : les ex æquo
        // sont nombreux — trois personnages, des scores entiers — et deux
        // tranches consécutives se recouvriraient sur eux, dupliquant des
        // joueurs et en perdant d'autres.
        .order('team_id', { ascending: true })
        .range(from, to),
    );

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

  async getLeaderboardTop(chapterId, limit) {
    const { data, error } = await db()
      .from('team_scores')
      // Pas de `breakdown` : c'est tout l'objet de cette lecture.
      .select('total, teams!inner(player_id, players!inner(handle))')
      .eq('chapter_id', chapterId)
      .order('total', { ascending: false })
      .order('team_id', { ascending: true })
      .limit(limit);

    if (error) throw new Error(`team_scores.top : ${error.message}`);

    return (data ?? []).map((row) => {
      const team = row.teams as unknown as {
        player_id: string;
        players: { handle: string };
      };
      return {
        playerId: team.player_id,
        handle: team.players.handle,
        total: row.total,
      };
    });
  },

  async getLeaderboardSize(chapterId) {
    // `head: true` : Postgres compte, et ne renvoie **aucune ligne**. Le
    // dénominateur du percentile ne coûte donc qu'un entier sur le réseau,
    // quel que soit le nombre de joueurs.
    const { count, error } = await db()
      .from('team_scores')
      .select('team_id', { count: 'exact', head: true })
      .eq('chapter_id', chapterId);

    if (error) throw new Error(`team_scores.count : ${error.message}`);
    return count ?? 0;
  },

  async getPlayerChapterResult(chapterId, playerId) {
    const mien = await db()
      .from('team_scores')
      .select('total, breakdown, teams!inner(player_id)')
      .eq('chapter_id', chapterId)
      .eq('teams.player_id', playerId)
      .maybeSingle();

    if (mien.error) throw new Error(`team_scores.mine : ${mien.error.message}`);
    if (!mien.data) return null;

    /*
     * Le rang, par comptage plutôt que par recherche dans une liste.
     *
     * L'ancienne page trouvait sa position avec un `findIndex` sur le
     * classement entier — ce qui obligeait à charger le classement entier. Un
     * `count` sur les scores strictement supérieurs donne la même réponse en
     * un entier, et il s'appuie sur `team_scores_ranking_idx`.
     *
     * « Strictement supérieurs » donne le classement **sportif** : deux
     * joueurs à égalité partagent le rang, et le suivant saute. C'est aussi
     * plus juste que l'ancien comportement, où l'ordre entre ex æquo — donc
     * le rang affiché — dépendait de l'ordre de la base.
     */
    const devant = await db()
      .from('team_scores')
      .select('team_id', { count: 'exact', head: true })
      .eq('chapter_id', chapterId)
      .gt('total', mien.data.total);

    if (devant.error) throw new Error(`team_scores.rank : ${devant.error.message}`);

    return {
      rank: (devant.count ?? 0) + 1,
      total: mien.data.total,
      breakdown: mien.data.breakdown,
    };
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
      .from('player_progress')
      .select('shards')
      .eq('player_id', playerId)
      .maybeSingle();

    if (error) throw new Error(`player_progress.shards : ${error.message}`);
    return data?.shards ?? 0;
  },

  async getProgress(playerId) {
    const { data, error } = await db()
      .from('player_progress')
      .select('pity_counter, starter_chest_opened_at, unopened_chests, shards')
      .eq('player_id', playerId)
      .maybeSingle();

    if (error) throw new Error(`player_progress.select : ${error.message}`);

    return {
      pityCounter: data?.pity_counter ?? 0,
      starterChestOpened: Boolean(data?.starter_chest_opened_at),
      unopenedChests: data?.unopened_chests ?? 0,
      shards: data?.shards ?? 0,
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
      // Verrou des cartes d'inscription (§43, anti-abus).
      //
      // Les cartes du coffre offert à l'arrivée ne sont pas échangeables
      // pendant une période fixée. C'est la protection la plus efficace du
      // dispositif, et la seule qui ne se trompe sur personne : elle ne
      // détecte rien, elle rend simplement immobile la valeur qu'une ferme de
      // comptes chercherait à concentrer. Un joueur légitime, lui, n'a aucune
      // raison de revendre sa dotation de départ dans l'heure.
      const tradableFrom =
        input.kind === 'STARTER'
          ? new Date(Date.now() + STARTER_CARD_LOCK_MS).toISOString()
          : null;

      const { data: inserted, error } = await db()
        .from('inventory')
        .upsert(
          fresh.map((card) => ({
            player_id: input.playerId,
            character_id: card.characterId,
            obtained_from: input.kind === 'STARTER' ? 'Coffre d\'inscription' : 'Coffre',
            source: input.kind === 'STARTER' ? 'STARTER_CHEST' : 'CHEST',
            acquired_at: new Date().toISOString(),
            tradable_from: tradableFrom,
          })),
          { onConflict: 'player_id,character_id', ignoreDuplicates: true },
        )
        .select('id, character_id');
      if (error) throw new Error(`inventory.upsert : ${error.message}`);

      // Frappe : chaque carte neuve reçoit son code unique et son numéro
      // d'émission. Le tirage du code a lieu en base, jamais côté client (§97).
      for (const row of inserted ?? []) {
        const { data: serial } = await db().rpc('mint_card', {
          p_inventory_id: row.id,
        });

        // Premier maillon de la chaîne de propriété. Il porte la **source**,
        // ce qui rend traçable, des mois plus tard, qu'une carte trouvée sur
        // le compte principal venait du coffre d'inscription d'un autre.
        if (serial) {
          await db().from('card_ownership').insert({
            serial_code: serial,
            character_id: row.character_id,
            player_id: input.playerId,
            source: input.kind === 'STARTER' ? 'STARTER_CHEST' : 'CHEST',
          });
        }
      }
    }

    /*
     * Les fragments des doublons vont dans la **réserve unique** du joueur.
     *
     * Ils étaient rangés par personnage, et c'est ce qui rendait la
     * fabrication impossible : on ne gagne des fragments d'un personnage qu'en
     * le tirant en double, donc en le possédant, alors que le fabriquer exige
     * de ne pas le posséder. Voir la migration 0028.
     *
     * Un seul total, une seule écriture — au lieu d'une lecture et d'une
     * écriture **par carte en double**, soit jusqu'à dix allers-retours par
     * coffre ouvert.
     */
    const fragments = input.cards
      .filter((card) => card.duplicate)
      .reduce((somme, card) => somme + card.shards, 0);

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

    // Crédit **incrémental**, donc par fonction : un `upsert` écrit une valeur
    // au lieu de l'ajouter, et deux coffres ouverts en même temps
    // s'écraseraient — le joueur perdrait les fragments du premier.
    if (fragments > 0) {
      const { error: shardError } = await db().rpc('grant_shards', {
        p_player: input.playerId,
        p_amount: fragments,
      });
      if (shardError) throw new Error(`grant_shards : ${shardError.message}`);
    }

    return 'applied';
  },

  async getWallet(playerId) {
    const { data, error } = await db()
      .from('wallets')
      .select('berries, pending_berries, royal_chests, version')
      .eq('player_id', playerId)
      .maybeSingle();

    if (error) throw new Error(`wallets.select : ${error.message}`);
    if (data) {
      return {
        berries: data.berries,
        pendingBerries: data.pending_berries ?? 0,
        royalChests: data.royal_chests ?? 0,
        version: data.version,
      };
    }

    // Portefeuille créé à la volée, à zéro.
    await db()
      .from('wallets')
      .upsert({ player_id: playerId }, { onConflict: 'player_id', ignoreDuplicates: true });
    return { berries: 0, pendingBerries: 0, royalChests: 0, version: 0 };
  },

  async consumeRoyalChest(playerId) {
    // Décision en base : deux ouvertures simultanées ne peuvent pas consommer
    // le même coffre, la seconde ne trouvant plus `royal_chests > 0`.
    const { data, error } = await db().rpc('consume_royal_chest', {
      p_player_id: playerId,
    });
    if (error) throw new Error(`consume_royal_chest : ${error.message}`);
    return data === true;
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
    /*
     * Débit **d'abord**, carte ensuite.
     *
     * `spend_shards` fait le contrôle de solde et la soustraction dans la même
     * instruction : deux fabrications simultanées ne peuvent pas lire le même
     * solde et dépenser chacune la totalité. Un `null` en retour signifie que
     * la réserve était insuffisante — rien n'a bougé.
     */
    const { data: restant, error: debitError } = await db().rpc('spend_shards', {
      p_player: playerId,
      p_cost: cost,
    });
    if (debitError) throw new Error(`spend_shards : ${debitError.message}`);
    if (restant === null || restant === undefined) return false;

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
