import { nextSundayLockInstant } from '@/domain/chapter/lock';
import { CURRENT_SCORING_VERSION } from '@/domain/scoring';
import type {
  ChapterAppearance,
  ChapterEvent,
  LockedTeam,
} from '@/domain/types';
import { INITIAL_DIVISION_STATE, type DivisionState } from '@/domain/season/divisions';
import type {
  ChapterResultRow,
  PlayerProgress,
  Repository,
  StoredAward,
  StoredWeeklyProfile,
  Wallet,
} from './types';

/**
 * Implémentation en mémoire, pour faire tourner le prototype sans base.
 *
 * Les données ne survivent pas à un redémarrage du serveur : c'est une étape
 * de Phase 0, remplacée par `postgres.ts` dès que la base est branchée.
 */

interface Store {
  chapter: ChapterEvent | null;
  teams: Map<string, LockedTeam>;
  snapshots: Map<string, { characterIds: string[]; takenAt: Date }[]>;
  appearances: Map<string, ChapterAppearance[]>;
  results: Map<string, ChapterResultRow[]>;
  inventory: Map<string, Set<string>>;
  shards: Map<string, Map<string, number>>;
  progress: Map<string, PlayerProgress>;
  chestRequests: Set<string>;
  wallets: Map<string, Wallet>;
  weeklyGrants: Set<string>;
  divisions: Map<string, DivisionState>;
  profiles: Map<string, StoredWeeklyProfile[]>;
  analysis: Map<string, unknown>;
  awards: Map<string, StoredAward[]>;
}

/**
 * Le module est rechargé à chaud en développement : on accroche le store au
 * `globalThis` pour ne pas perdre l'état à chaque édition de fichier.
 */
const globalStore = globalThis as typeof globalThis & { __opqStore?: Store };

function createStore(): Store {
  return {
    // Aucun chapitre au démarrage : son ouverture est une décision
    // administrateur (§4.1), pas un effet de bord du premier rendu.
    chapter: null,
    teams: new Map(),
    snapshots: new Map(),
    appearances: new Map(),
    results: new Map(),
    inventory: new Map(),
    shards: new Map(),
    progress: new Map(),
    chestRequests: new Set(),
    wallets: new Map(),
    weeklyGrants: new Set(),
    divisions: new Map(),
    profiles: new Map(),
    analysis: new Map(),
    awards: new Map(),
  };
}

function store(): Store {
  globalStore.__opqStore ??= createStore();
  return globalStore.__opqStore;
}

const teamKey = (playerId: string, chapterId: string) => `${playerId}:${chapterId}`;

export const memoryRepository: Repository = {
  async getCurrentChapter() {
    // Même filtre que Postgres : un chapitre publié ou annulé n'est plus
    // « ouvert aux prédictions ». Sans cette parité, le mode mémoire
    // masquerait des bugs que la base révélerait.
    const chapter = store().chapter;
    if (!chapter) return null;
    return chapter.status === 'RESULTS_PUBLISHED' || chapter.status === 'CANCELLED'
      ? null
      : chapter;
  },

  async getLatestPublishedChapter() {
    const chapter = store().chapter;
    return chapter?.status === 'RESULTS_PUBLISHED' ? chapter : null;
  },

  async proposeNextChapterNumber() {
    return (store().chapter?.chapterNumber ?? 1179) + 1;
  },

  async createChapter(chapterNumber, teamLockAt) {
    const chapter = {
      id: `chapter-${chapterNumber}`,
      chapterNumber,
      status: 'NORMAL' as const,
      teamLockAt,
      officialReleaseAt: null,
      resultsPublishedAt: null,
      scoringVersion: CURRENT_SCORING_VERSION,
      dataVersion: '2026.08.01',
    };
    store().chapter = chapter;
    return chapter;
  },

  async updateChapter(chapter) {
    store().chapter = chapter;
  },

  async getTeam(playerId, chapterId) {
    return store().teams.get(teamKey(playerId, chapterId)) ?? null;
  },

  async saveTeam(playerId, chapterId, characterIds) {
    const key = teamKey(playerId, chapterId);
    store().teams.set(key, {
      userId: playerId,
      chapterId,
      characterIds,
      lockedAt: new Date(),
    });

    // Historique conservé avant verrouillage (cahier §83).
    const history = store().snapshots.get(key) ?? [];
    history.push({ characterIds: [...characterIds], takenAt: new Date() });
    store().snapshots.set(key, history);
  },

  async listTeams(chapterId) {
    return [...store().teams.values()].filter((t) => t.chapterId === chapterId);
  },

  async getAppearances(chapterId) {
    return store().appearances.get(chapterId) ?? [];
  },

  async getAppearanceHistory(chapters) {
    // Le store mémoire ne garde qu'un chapitre : l'historique est donc vide,
    // ce qui rend simplement la suggestion indisponible sans base.
    void chapters;
    return [];
  },

  async setAppearances(chapterId, appearances) {
    store().appearances.set(chapterId, appearances);
  },

  async saveResults(chapterId, rows) {
    store().results.set(chapterId, rows);
  },

  async getLeaderboard(chapterId) {
    return [...(store().results.get(chapterId) ?? [])].sort(
      (a, b) => b.total - a.total,
    );
  },

  async getLeaderboardTop(chapterId, limit) {
    const rows = await this.getLeaderboard(chapterId);
    return rows
      .slice(0, limit)
      .map(({ playerId, handle, total }) => ({ playerId, handle, total }));
  },

  async getLeaderboardSize(chapterId) {
    return (store().results.get(chapterId) ?? []).length;
  },

  async getPlayerChapterResult(chapterId, playerId) {
    const rows = store().results.get(chapterId) ?? [];
    const mien = rows.find((row) => row.playerId === playerId);
    if (!mien) return null;

    // Même règle que le dépôt Postgres : rang sportif, par comptage des
    // scores strictement supérieurs. Les deux implémentations doivent
    // s'accorder, sinon les tests valident un comportement que la production
    // n'a pas.
    const devant = rows.filter((row) => row.total > mien.total).length;
    return { rank: devant + 1, total: mien.total, breakdown: mien.breakdown };
  },

  async getOwnedCharacterIds(playerId) {
    return [...(store().inventory.get(playerId) ?? [])];
  },
  /**
   * Le dépôt en mémoire ne frappe pas de carte : les codes viennent de la
   * base. Il retourne donc une identité vide plutôt qu'un code inventé, qui
   * laisserait croire à une unicité que rien ne garantit.
   */
  async getCardIdentities(playerId) {
    const owned = await this.getOwnedCharacterIds(playerId);
    return owned.map((characterId) => ({
      characterId,
      serialCode: null,
      mintNumber: null,
      obtainedFrom: 'Mémoire',
      obtainedAt: new Date(),
    }));
  },


  async getShards(playerId) {
    return new Map(store().shards.get(playerId) ?? []);
  },

  async getProgress(playerId) {
    return (
      store().progress.get(playerId) ?? {
        pityCounter: 0,
        starterChestOpened: false,
        unopenedChests: 0,
      }
    );
  },

  async applyChestOpening(input) {
    const state = store();

    // §92 : un double envoi ne doit pas ouvrir deux coffres.
    if (state.chestRequests.has(input.clientRequestId)) {
      return 'already-applied';
    }
    state.chestRequests.add(input.clientRequestId);

    const owned = state.inventory.get(input.playerId) ?? new Set<string>();
    const shards = state.shards.get(input.playerId) ?? new Map<string, number>();

    for (const card of input.cards) {
      if (card.duplicate) {
        shards.set(
          card.characterId,
          (shards.get(card.characterId) ?? 0) + card.shards,
        );
      } else {
        owned.add(card.characterId);
      }
    }

    state.inventory.set(input.playerId, owned);
    state.shards.set(input.playerId, shards);

    const previous = state.progress.get(input.playerId);
    state.progress.set(input.playerId, {
      pityCounter: input.pityCounter,
      starterChestOpened:
        previous?.starterChestOpened || input.kind === 'STARTER',
      unopenedChests: previous?.unopenedChests ?? 0,
    });

    return 'applied';
  },

  async getWallet(playerId) {
    return store().wallets.get(playerId) ?? { berries: 0, pendingBerries: 0, royalChests: 0, version: 0 };
  },

  async consumeRoyalChest() {
    // Le dépôt en mémoire ne vend rien : sans paiement, il n'y a pas de
    // coffre royal à consommer.
    return false;
  },

  async spendBerries(playerId, amount, expectedVersion) {
    const state = store();
    const wallet = state.wallets.get(playerId) ?? { berries: 0, pendingBerries: 0, royalChests: 0, version: 0 };

    // Même sémantique que la fonction SQL : version périmée ou solde
    // insuffisant, rien n'est débité.
    if (wallet.version !== expectedVersion || wallet.berries < amount) {
      return false;
    }

    state.wallets.set(playerId, {
      ...wallet,
      berries: wallet.berries - amount,
      version: wallet.version + 1,
    });
    return true;
  },

  async grantBerriesAndChests(playerId, berries, chests) {
    const state = store();
    const wallet = state.wallets.get(playerId) ?? { berries: 0, pendingBerries: 0, royalChests: 0, version: 0 };
    state.wallets.set(playerId, {
      ...wallet,
      berries: wallet.berries + berries,
      version: wallet.version + 1,
    });

    const progress = state.progress.get(playerId) ?? {
      pityCounter: 0,
      starterChestOpened: false,
      unopenedChests: 0,
    };
    state.progress.set(playerId, {
      ...progress,
      unopenedChests: progress.unopenedChests + chests,
    });
  },

  async consumeChest(playerId) {
    const state = store();
    const progress = state.progress.get(playerId);
    if (!progress || progress.unopenedChests <= 0) return false;

    state.progress.set(playerId, {
      ...progress,
      unopenedChests: progress.unopenedChests - 1,
    });
    return true;
  },

  async craftCharacter(playerId, characterId, cost) {
    const state = store();
    const shards = state.shards.get(playerId) ?? new Map<string, number>();
    const owned = state.inventory.get(playerId) ?? new Set<string>();

    if (owned.has(characterId)) return false;
    if ((shards.get(characterId) ?? 0) < cost) return false;

    shards.set(characterId, (shards.get(characterId) ?? 0) - cost);
    owned.add(characterId);
    state.shards.set(playerId, shards);
    state.inventory.set(playerId, owned);
    return true;
  },

  async grantWeeklyRewards(chapterId, grants) {
    const state = store();
    let applied = 0;

    for (const grant of grants) {
      const key = `${grant.playerId}:${chapterId}`;
      // §92 : une seule attribution par joueur et par chapitre.
      if (state.weeklyGrants.has(key)) continue;
      state.weeklyGrants.add(key);

      await memoryRepository.grantBerriesAndChests(
        grant.playerId,
        grant.berries,
        grant.chests,
      );
      applied += 1;
    }

    return applied;
  },
  async getDivisionState(playerId) {
    return store().divisions.get(playerId) ?? INITIAL_DIVISION_STATE;
  },

  async setDivisionState(playerId, state) {
    store().divisions.set(playerId, state);
  },

  async getWeeklyProfiles(playerId) {
    return [...(store().profiles.get(playerId) ?? [])].sort(
      (a, b) => b.chapterNumber - a.chapterNumber,
    );
  },

  async recordWeeklyProfile(input) {
    const state = store();
    const existing = state.profiles.get(input.playerId) ?? [];
    // Une seule ligne par chapitre : republier un chapitre ne doit pas
    // dupliquer l'historique (§79).
    const without = existing.filter((p) => p.chapterId !== input.chapterId);
    state.profiles.set(input.playerId, [...without, input]);
  },

  async saveChapterAnalysis(chapterId, payload) {
    store().analysis.set(chapterId, payload);
  },

  async getChapterAnalysis(chapterId) {
    return store().analysis.get(chapterId) ?? null;
  },

  async saveChapterAwards(chapterId, awards) {
    store().awards.set(chapterId, awards);
  },

  async getChapterAwards(chapterId) {
    return store().awards.get(chapterId) ?? [];
  },
};
