import 'server-only';
import { db, isDatabaseConfigured } from '@/lib/supabase-admin';
import { getRepository } from '@/lib/repository';
import type { LockedTeam } from '@/domain/types';
import type {
  CardIdentity,
  PlayerChapterResult,
  PlayerProgress,
  StoredWeeklyProfile,
  Wallet,
} from '@/lib/repository/types';
import type { DivisionState } from '@/domain/season/divisions';
import { INITIAL_DIVISION_STATE } from '@/domain/season/divisions';
import type { Question } from '@/domain/chapter/pronostics';
import {
  DEFAULT_PREFERENCES,
  type NotificationPreferences,
} from '@/domain/notifications/preferences';
import type { Sale } from '@/domain/market/pricing';
import { questionsDe, reponsesDe } from '@/lib/chapter/questions';
import type { StoredNotification } from '@/lib/social/repository';

/**
 * Lectures groupées : ce qu'une page lit sur un joueur, en un aller-retour.
 *
 * ## Pourquoi
 *
 * L'API de la base plafonne autour de 45 requêtes par seconde sur le palier
 * actuel, quel que soit le nombre de connexions (tir de charge du 14
 * septembre 2026). Chaque requête coûte donc une part fixe d'un budget
 * commun à tous les joueurs. L'accueil en dépensait quatre par affichage, le
 * marché sept, le journal de bord dix : dix pages par seconde, et le site
 * s'effondrait.
 *
 * Les fonctions SQL de la migration 0038 rendent tout cela en un appel. Ce
 * module les décode vers les mêmes types que les lectures unitaires qu'elles
 * remplacent — les pages ne voient pas la différence, elles voient juste
 * moins de temps passer.
 *
 * ## Sans base
 *
 * En mode mémoire (tests, poste sans configuration), chaque lecture retombe
 * sur les méthodes unitaires du dépôt. Le résultat est identique ; seul le
 * nombre d'allers-retours diffère, et en mémoire il ne coûte rien.
 */

export interface LectureJoueur {
  team: LockedTeam | null;
  cards: CardIdentity[];
  progress: PlayerProgress;
  division: DivisionState;
  wallet: Wallet;
  questions: Question[];
  /** Réponses du joueur aux questions du chapitre, par identifiant de question. */
  answers: Map<string, number>;
  result: PlayerChapterResult | null;
  reward: { berries: number; chests: number } | null;
}

interface JoueurBrut {
  team: { character_ids: string[]; updated_at: string } | null;
  cards: {
    character_id: string;
    serial_code: string | null;
    mint_number: number | null;
    obtained_from: string;
    obtained_at: string;
  }[];
  progress: {
    pity_counter: number;
    starter_chest_opened_at: string | null;
    unopened_chests: number;
    shards: number;
    division: DivisionState['division'];
    promotion_streak: number;
    relegation_streak: number;
  } | null;
  wallet: {
    berries: number;
    pending_berries: number;
    royal_chests: number;
    version: number;
  } | null;
  questions: {
    id: string;
    prompt: string;
    options: string[];
    answer: number | null;
  }[];
  answers: { question_id: string; choice: number }[];
  result: { total: number; breakdown: unknown; rank: number } | null;
  reward: { berries: number; chests: number } | null;
}

const WALLET_VIDE: Wallet = { berries: 0, pendingBerries: 0, royalChests: 0, version: 0 };

export async function lireJoueur(
  playerId: string,
  chapterId: string | null,
): Promise<LectureJoueur> {
  if (!isDatabaseConfigured()) return lireJoueurUnitaire(playerId, chapterId);

  const { data, error } = await db().rpc('lire_joueur', {
    p_player: playerId,
    p_chapter: chapterId,
  });
  if (error) throw new Error(`lire_joueur : ${error.message}`);
  const brut = data as JoueurBrut;

  return {
    team:
      brut.team && chapterId
        ? {
            userId: playerId,
            chapterId,
            characterIds: brut.team.character_ids as [string, string, string],
            lockedAt: new Date(brut.team.updated_at),
          }
        : null,
    cards: brut.cards.map((c) => ({
      characterId: c.character_id,
      serialCode: c.serial_code,
      mintNumber: c.mint_number,
      obtainedFrom: c.obtained_from,
      obtainedAt: new Date(c.obtained_at),
    })),
    progress: {
      pityCounter: brut.progress?.pity_counter ?? 0,
      starterChestOpened: Boolean(brut.progress?.starter_chest_opened_at),
      unopenedChests: brut.progress?.unopened_chests ?? 0,
      shards: brut.progress?.shards ?? 0,
    },
    division: brut.progress
      ? {
          division: brut.progress.division,
          promotionStreak: brut.progress.promotion_streak,
          relegationStreak: brut.progress.relegation_streak,
        }
      : INITIAL_DIVISION_STATE,
    wallet: brut.wallet
      ? {
          berries: Number(brut.wallet.berries),
          pendingBerries: brut.wallet.pending_berries,
          royalChests: brut.wallet.royal_chests,
          version: Number(brut.wallet.version),
        }
      : WALLET_VIDE,
    questions: brut.questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options,
      answer: q.answer,
    })),
    answers: new Map(brut.answers.map((a) => [a.question_id, a.choice])),
    result: brut.result
      ? { rank: Number(brut.result.rank), total: brut.result.total, breakdown: brut.result.breakdown }
      : null,
    reward: brut.reward,
  };
}

async function lireJoueurUnitaire(
  playerId: string,
  chapterId: string | null,
): Promise<LectureJoueur> {
  const repository = getRepository();
  const [team, cards, progress, division, wallet, questions, answers, result, reward] =
    await Promise.all([
      chapterId ? repository.getTeam(playerId, chapterId) : null,
      repository.getCardIdentities(playerId),
      repository.getProgress(playerId),
      repository.getDivisionState(playerId),
      repository.getWallet(playerId),
      chapterId && isDatabaseConfigured() ? questionsDe(chapterId) : [],
      chapterId && isDatabaseConfigured()
        ? reponsesDe(chapterId, playerId)
        : new Map<string, number>(),
      chapterId ? repository.getPlayerChapterResult(chapterId, playerId) : null,
      chapterId ? repository.getWeeklyReward(chapterId, playerId) : null,
    ]);
  return { team, cards, progress, division, wallet, questions, answers, result, reward };
}

// ---------------------------------------------------------------------------

export interface LectureProfil {
  division: DivisionState;
  profiles: StoredWeeklyProfile[];
  ownedIds: string[];
  notifications: StoredNotification[];
  referralCode: string | null;
  handle: string | null;
  referralState: { alreadyReferred: boolean; referredCount: number };
  preferences: NotificationPreferences;
  account: { emailVerifiedAt: string | null; birthDate: string | null } | null;
}

interface ProfilBrut {
  progress: {
    division: DivisionState['division'];
    promotion_streak: number;
    relegation_streak: number;
  } | null;
  profiles: {
    chapter_id: string;
    chapter_number: number;
    risk: number | string;
    synergy_share: number | string;
    average_pick_rate: number | string;
    total: number;
    percentile: number | string | null;
  }[];
  owned: string[];
  notifications: {
    id: string;
    kind: string;
    title: string;
    body: string | null;
    href: string | null;
    read_at: string | null;
    created_at: string;
  }[];
  referral_code: string | null;
  handle: string | null;
  already_referred: boolean;
  referred_count: number;
  preferences: {
    weekly_email: boolean;
    rewards_email: boolean;
    marketing_email: boolean;
    weekly_in_app: boolean;
    rewards_in_app: boolean;
  } | null;
  account: { email_verified_at: string | null; birth_date: string | null } | null;
}

export async function lireProfil(playerId: string): Promise<LectureProfil> {
  if (!isDatabaseConfigured()) return lireProfilUnitaire(playerId);

  const { data, error } = await db().rpc('lire_profil', { p_player: playerId });
  if (error) throw new Error(`lire_profil : ${error.message}`);
  const brut = data as ProfilBrut;

  return {
    division: brut.progress
      ? {
          division: brut.progress.division,
          promotionStreak: brut.progress.promotion_streak,
          relegationStreak: brut.progress.relegation_streak,
        }
      : INITIAL_DIVISION_STATE,
    profiles: brut.profiles.map((p) => ({
      playerId,
      chapterId: p.chapter_id,
      chapterNumber: p.chapter_number,
      risk: Number(p.risk),
      synergyShare: Number(p.synergy_share),
      averagePickRate: Number(p.average_pick_rate),
      total: p.total,
      percentile: p.percentile === null ? null : Number(p.percentile),
    })),
    ownedIds: brut.owned,
    notifications: brut.notifications.map((n) => ({
      id: n.id,
      kind: n.kind,
      title: n.title,
      body: n.body,
      href: n.href,
      read: n.read_at !== null,
      createdAt: new Date(n.created_at),
    })),
    referralCode: brut.referral_code,
    handle: brut.handle,
    referralState: {
      alreadyReferred: brut.already_referred,
      referredCount: Number(brut.referred_count),
    },
    preferences: brut.preferences
      ? {
          weeklyEmail: brut.preferences.weekly_email,
          rewardsEmail: brut.preferences.rewards_email,
          marketingEmail: brut.preferences.marketing_email,
          weeklyInApp: brut.preferences.weekly_in_app,
          rewardsInApp: brut.preferences.rewards_in_app,
        }
      : DEFAULT_PREFERENCES,
    account: brut.account
      ? { emailVerifiedAt: brut.account.email_verified_at, birthDate: brut.account.birth_date }
      : null,
  };
}

async function lireProfilUnitaire(playerId: string): Promise<LectureProfil> {
  const repository = getRepository();
  const [division, profiles, ownedIds] = await Promise.all([
    repository.getDivisionState(playerId),
    repository.getWeeklyProfiles(playerId),
    repository.getOwnedCharacterIds(playerId),
  ]);
  return {
    division,
    profiles,
    ownedIds,
    notifications: [],
    referralCode: null,
    handle: null,
    referralState: { alreadyReferred: false, referredCount: 0 },
    preferences: DEFAULT_PREFERENCES,
    account: null,
  };
}

// ---------------------------------------------------------------------------

export interface LectureMarche {
  wallet: Wallet;
  ownedIds: string[];
  /** Personnages surveillés, dans l'ordre d'ajout. */
  watchedIds: string[];
  thresholds: Map<string, number>;
  asks: Map<string, number>;
  sales: Map<string, Sale[]>;
}

interface MarcheBrut {
  wallet: JoueurBrut['wallet'];
  owned: string[];
  watchlist: { character_id: string; alert_below: number | null }[];
  asks: { character_id: string; price: number }[];
  sales: { character_id: string; price: number; sold_at: string }[];
}

export async function lireMarche(playerId: string): Promise<LectureMarche> {
  if (!isDatabaseConfigured()) return lireMarcheUnitaire(playerId);

  const { data, error } = await db().rpc('lire_marche', { p_player: playerId });
  if (error) throw new Error(`lire_marche : ${error.message}`);
  const brut = data as MarcheBrut;

  const sales = new Map<string, Sale[]>();
  for (const row of brut.sales) {
    const list = sales.get(row.character_id) ?? [];
    list.push({ price: row.price, soldAt: new Date(row.sold_at) });
    sales.set(row.character_id, list);
  }

  return {
    wallet: brut.wallet
      ? {
          berries: Number(brut.wallet.berries),
          pendingBerries: brut.wallet.pending_berries,
          royalChests: brut.wallet.royal_chests,
          version: Number(brut.wallet.version),
        }
      : WALLET_VIDE,
    ownedIds: brut.owned,
    watchedIds: brut.watchlist.map((w) => w.character_id),
    thresholds: new Map(
      brut.watchlist
        .filter((w) => w.alert_below !== null)
        .map((w) => [w.character_id, w.alert_below as number]),
    ),
    asks: new Map(brut.asks.map((a) => [a.character_id, a.price])),
    sales,
  };
}

async function lireMarcheUnitaire(playerId: string): Promise<LectureMarche> {
  const repository = getRepository();
  const [wallet, ownedIds] = await Promise.all([
    repository.getWallet(playerId),
    repository.getOwnedCharacterIds(playerId),
  ]);
  return {
    wallet,
    ownedIds,
    watchedIds: [],
    thresholds: new Map(),
    asks: new Map(),
    sales: new Map(),
  };
}
