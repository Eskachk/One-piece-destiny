import type { ChestCard } from '@/domain/collection/chest';
import type { HistoricalAppearance } from '@/domain/admin/assisted-count';
import type { DivisionState } from '@/domain/season/divisions';
import type {
  ChapterAppearance,
  ChapterEvent,
  LockedTeam,
} from '@/domain/types';

/**
 * Frontière de persistance.
 *
 * Deux implémentations : `memory` (prototype, sans base) et `postgres`
 * (Supabase). Le domaine ne connaît que cette interface — le moteur de score
 * et les règles de verrouillage restent testables sans base.
 */

export interface ChapterResultRow {
  playerId: string;
  handle: string;
  total: number;
  breakdown: unknown;
}

export interface Repository {
  /**
   * Chapitre ouvert aux prédictions, ou `null` si aucun ne l'est.
   *
   * Ne crée jamais de chapitre : le §4.1 veut que le numéro reste une
   * proposition validée par un humain, pas une vérité déduite.
   */
  getCurrentChapter(): Promise<ChapterEvent | null>;

  /**
   * Dernier chapitre dont les résultats sont publiés.
   *
   * Distinct de `getCurrentChapter` : une fois publié, un chapitre n'est plus
   * « ouvert aux prédictions », mais c'est précisément celui dont le joueur
   * veut voir le classement (§17, §118).
   */
  getLatestPublishedChapter(): Promise<ChapterEvent | null>;

  /** Ouvre un chapitre. Le numéro vient de l'administrateur. */
  createChapter(chapterNumber: number, teamLockAt: Date): Promise<ChapterEvent>;

  /** Numéro proposé pour le prochain chapitre — une suggestion, pas une règle. */
  proposeNextChapterNumber(): Promise<number>;

  updateChapter(chapter: ChapterEvent): Promise<void>;

  /** Équipe d'un joueur pour un chapitre, ou `null` s'il n'a pas encore joué. */
  getTeam(playerId: string, chapterId: string): Promise<LockedTeam | null>;

  /**
   * Enregistre l'équipe et empile un snapshot (cahier §83).
   * L'appelant a déjà vérifié le verrouillage côté serveur.
   */
  saveTeam(
    playerId: string,
    chapterId: string,
    characterIds: [string, string, string],
  ): Promise<void>;

  /** Toutes les équipes d'un chapitre, pour le calcul par lot (§75). */
  listTeams(chapterId: string): Promise<LockedTeam[]>;

  getAppearances(chapterId: string): Promise<ChapterAppearance[]>;

  /**
   * Apparitions des `chapters` derniers chapitres, pour le comptage assisté
   * (§7). Lecture seule et purement statistique.
   */
  getAppearanceHistory(chapters: number): Promise<HistoricalAppearance[]>;

  /** Remplace les apparitions validées d'un chapitre. */
  setAppearances(
    chapterId: string,
    appearances: ChapterAppearance[],
  ): Promise<void>;

  saveResults(chapterId: string, rows: ChapterResultRow[]): Promise<void>;

  /** Classement pré-calculé, jamais recalculé à la consultation (§75). */
  getLeaderboard(chapterId: string): Promise<ChapterResultRow[]>;

  // --- Collection (cahier §26 à §33) -------------------------------------

  getOwnedCharacterIds(playerId: string): Promise<string[]>;

  /**
   * Identité de chaque carte possédée : code de série et numéro d'émission.
   *
   * Séparé de `getOwnedCharacterIds` : la plupart des écrans n'ont besoin que
   * de savoir quels personnages sont possédés.
   */
  getCardIdentities(playerId: string): Promise<CardIdentity[]>;

  /** Fragments par personnage (cahier §29). */
  getShards(playerId: string): Promise<Map<string, number>>;

  getProgress(playerId: string): Promise<PlayerProgress>;

  /**
   * Applique un coffre déjà tiré : ajoute les cartes neuves à l'inventaire,
   * crédite les fragments des doublons, met à jour le compteur de pitié.
   *
   * `clientRequestId` rend l'opération idempotente (§92) : un double envoi
   * n'ouvre pas deux coffres.
   */
  applyChestOpening(input: ApplyChestInput): Promise<ChestApplication>;

  // --- Économie (cahier §29, §36, §72, §93) -------------------------------

  getWallet(playerId: string): Promise<Wallet>;

  /**
   * Dépense atomique avec verrou optimiste (§93).
   * Retourne `false` si le solde est insuffisant **ou** si la version a changé
   * entre-temps — dans les deux cas rien n'est débité.
   */
  spendBerries(
    playerId: string,
    amount: number,
    expectedVersion: number,
  ): Promise<boolean>;

  /** Crédite des Berries et/ou des coffres. */
  grantBerriesAndChests(
    playerId: string,
    berries: number,
    chests: number,
  ): Promise<void>;

  /**
   * Consomme un coffre non ouvert. Retourne `false` s'il n'en reste aucun —
   * c'est ce qui empêche d'ouvrir deux fois le même coffre.
   */
  consumeChest(playerId: string): Promise<boolean>;

  /**
   * Fabrique un personnage : débite les fragments et l'ajoute à l'inventaire,
   * en une opération. Rejette si le solde a bougé entre-temps.
   */
  craftCharacter(
    playerId: string,
    characterId: string,
    cost: number,
  ): Promise<boolean>;

  /** Attribution des récompenses d'un chapitre, idempotente (§92). */
  grantWeeklyRewards(
    chapterId: string,
    grants: WeeklyGrant[],
  ): Promise<number>;

  // --- Phase 2 : rétention (cahier §16, §18, §19, §20, §64) ---------------

  getDivisionState(playerId: string): Promise<DivisionState>;

  setDivisionState(playerId: string, state: DivisionState): Promise<void>;

  /** Historique hebdomadaire d'un joueur, du plus récent au plus ancien. */
  getWeeklyProfiles(playerId: string): Promise<StoredWeeklyProfile[]>;

  recordWeeklyProfile(input: StoredWeeklyProfile): Promise<void>;

  /** Analyse post-chapitre figée à la publication (§64, §77). */
  saveChapterAnalysis(chapterId: string, payload: unknown): Promise<void>;

  getChapterAnalysis(chapterId: string): Promise<unknown | null>;

  saveChapterAwards(chapterId: string, awards: StoredAward[]): Promise<void>;

  getChapterAwards(chapterId: string): Promise<StoredAward[]>;
}

export interface StoredWeeklyProfile {
  playerId: string;
  chapterId: string;
  chapterNumber: number;
  risk: number;
  synergyShare: number;
  averagePickRate: number;
  total: number;
  percentile: number | null;
}

export interface CardIdentity {
  characterId: string;
  /** `null` pour une carte antérieure à l'introduction des codes. */
  serialCode: string | null;
  mintNumber: number | null;
  obtainedFrom: string;
  obtainedAt: Date;
}

export interface StoredAward {
  award: string;
  playerId: string;
  handle?: string;
  value: number;
}

export interface PlayerProgress {
  pityCounter: number;
  starterChestOpened: boolean;
  /** Coffres obtenus mais pas encore ouverts. */
  unopenedChests: number;
}

export interface Wallet {
  berries: number;
  /** Verrou optimiste (§93) : à repasser tel quel lors d'une dépense. */
  version: number;
}

export interface WeeklyGrant {
  playerId: string;
  berries: number;
  chests: number;
  percentile: number | null;
}

export interface ApplyChestInput {
  playerId: string;
  kind: 'STARTER' | 'WEEKLY';
  cards: ChestCard[];
  pityCounter: number;
  pityTriggered: boolean;
  clientRequestId: string;
}

export type ChestApplication = 'applied' | 'already-applied';
