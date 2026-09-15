import 'server-only';

import type { Division } from '@/domain/season/divisions';
import { STARTING_DIVISION } from '@/domain/season/divisions';
import { canonicalHandle } from '@/domain/player/handle';
import { db, isDatabaseConfigured } from '@/lib/supabase-admin';

/**
 * Ce qu'un joueur montre aux autres — et la recherche qui y mène.
 *
 * Le classement affiche des pseudos qui ne menaient nulle part. Une page par
 * joueur, atteignable par son pseudo, donne au tableau des visages : on peut
 * regarder qui est devant soi, avec quel équipage il a gagné la semaine
 * dernière, et ce qu'il collectionne.
 *
 * **Public** au sens de « visible par les autres joueurs » : rien ici ne vient
 * du compte. Pas d'adresse, pas d'âge, pas de Berries, pas de coffres —
 * seulement ce que le jeu montre déjà ailleurs (le classement, les
 * distinctions) et la collection en nombre. L'équipage montré est celui du
 * dernier chapitre **publié**, jamais celui de la semaine en cours.
 *
 * La lecture passe par `lire_profil_public` (migration 0044), un seul
 * aller-retour. La recherche se fait sur la forme canonique du pseudo, celle
 * qui garantit l'unicité : chercher « sh_anks » trouve « Shanks ».
 */

export interface ProfilPublic {
  playerId: string;
  handle: string;
  createdAt: Date;
  division: Division;
  profiles: {
    chapterNumber: number;
    total: number;
    percentile: number | null;
    risk: number;
    synergyShare: number;
    averagePickRate: number;
  }[];
  ownedIds: string[];
  awards: { award: string; chapterNumber: number }[];
  lastTeam: { chapterNumber: number; characterIds: string[]; total: number | null } | null;
}

interface ProfilPublicBrut {
  player: { id: string; handle: string; created_at: string };
  division: Division | null;
  profiles: {
    chapter_number: number;
    total: number;
    percentile: number | string | null;
    risk: number | string;
    synergy_share: number | string;
    average_pick_rate: number | string;
  }[];
  owned: string[];
  awards: { award: string; chapter_number: number }[];
  last_team: { chapter_number: number; character_ids: string[]; total: number | null } | null;
}

/** Le profil public du joueur au pseudo donné, ou `null` s'il n'existe pas. */
export async function lireProfilPublic(handle: string): Promise<ProfilPublic | null> {
  if (!isDatabaseConfigured()) return null;

  const canonical = canonicalHandle(handle);
  if (canonical.length === 0) return null;

  const { data, error } = await db().rpc('lire_profil_public', { p_canonical: canonical });
  if (error) throw new Error(`lire_profil_public : ${error.message}`);
  if (!data) return null;

  const brut = data as ProfilPublicBrut;
  return {
    playerId: brut.player.id,
    handle: brut.player.handle,
    createdAt: new Date(brut.player.created_at),
    division: brut.division ?? STARTING_DIVISION,
    profiles: brut.profiles.map((p) => ({
      chapterNumber: p.chapter_number,
      total: p.total,
      percentile: p.percentile === null ? null : Number(p.percentile),
      risk: Number(p.risk),
      synergyShare: Number(p.synergy_share),
      averagePickRate: Number(p.average_pick_rate),
    })),
    ownedIds: brut.owned,
    awards: brut.awards.map((a) => ({ award: a.award, chapterNumber: a.chapter_number })),
    lastTeam: brut.last_team
      ? {
          chapterNumber: brut.last_team.chapter_number,
          characterIds: brut.last_team.character_ids,
          total: brut.last_team.total,
        }
      : null,
  };
}

/** Plafond de résultats : au-delà, l'administrateur affine, il ne fait pas défiler. */
const MAX_RESULTATS = 8;

/**
 * Les joueurs dont le pseudo contient le terme.
 *
 * Deux caractères au moins : une lettre seule ramènerait la moitié du jeu.
 * La comparaison se fait sur la forme canonique des deux côtés — accents,
 * casse, points et tirets ignorés — et `%`/`_` sont échappés : sans quoi une
 * recherche sur « _ » ramènerait tout le monde.
 */
export async function chercherJoueurs(terme: string): Promise<{ handle: string }[]> {
  if (!isDatabaseConfigured()) return [];

  const canonical = canonicalHandle(terme.trim());
  if (canonical.length < 2) return [];

  const motif = canonical.replace(/[%_\\]/g, (c) => `\\${c}`);
  const { data } = await db()
    .from('players')
    .select('handle')
    .ilike('handle_canonical', `%${motif}%`)
    .order('handle')
    .limit(MAX_RESULTATS);

  return (data ?? []) as { handle: string }[];
}
