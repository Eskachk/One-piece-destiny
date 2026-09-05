import 'server-only';

import { db } from '@/lib/supabase-admin';
import {
  MAX_LIGUES_PAR_JOUEUR,
  genererCodeLigue,
  type LigneLigue,
  type RefusAdhesion,
} from '@/domain/league/league';

/**
 * Accès aux ligues privées.
 *
 * Module séparé du dépôt principal, comme le Marché : les ligues sont une
 * fonctionnalité entière avec ses propres tables, et les fondre dans
 * `Repository` gonflerait une interface que le moteur de score n'a aucune
 * raison de connaître.
 */

export interface Ligue {
  id: string;
  nom: string;
  code: string;
  membres: number;
  proprietaire: boolean;
}

export interface MembreLigue {
  playerId: string;
  handle: string;
}

/** Les ligues d'un joueur, avec le nombre de membres de chacune. */
export async function liguesDe(playerId: string): Promise<Ligue[]> {
  const { data, error } = await db()
    .from('league_members')
    .select('league_id, leagues!inner(id, name, code, owner_id)')
    .eq('player_id', playerId)
    .order('joined_at', { ascending: true })
    .limit(MAX_LIGUES_PAR_JOUEUR);

  if (error) throw new Error(`league_members.select : ${error.message}`);

  const lignes = (data ?? []).map((row) => {
    const ligue = row.leagues as unknown as {
      id: string;
      name: string;
      code: string;
      owner_id: string;
    };
    return ligue;
  });

  if (lignes.length === 0) return [];

  /*
   * Le compte des membres, en **une** requête pour toutes les ligues.
   *
   * Un `count` par ligue ferait cinq allers-retours sur une page déjà chargée.
   * Les ligues plafonnent à cinquante membres et le joueur à cinq ligues :
   * deux cent cinquante lignes au pire, qu'on compte en mémoire.
   */
  const { data: membres, error: erreurMembres } = await db()
    .from('league_members')
    .select('league_id')
    .in('league_id', lignes.map((l) => l.id));

  if (erreurMembres) {
    throw new Error(`league_members.count : ${erreurMembres.message}`);
  }

  const comptes = new Map<string, number>();
  for (const row of membres ?? []) {
    comptes.set(row.league_id, (comptes.get(row.league_id) ?? 0) + 1);
  }

  return lignes.map((ligue) => ({
    id: ligue.id,
    nom: ligue.name,
    code: ligue.code,
    membres: comptes.get(ligue.id) ?? 0,
    proprietaire: ligue.owner_id === playerId,
  }));
}

export type CreationLigue =
  | { ok: true; ligue: Ligue }
  | { ok: false; raison: 'TROP_DE_LIGUES' | 'CODE_INDISPONIBLE' };

/**
 * Crée une ligue et y inscrit son fondateur.
 *
 * Le code est tiré au hasard ; une collision est improbable — trente-deux
 * caractères à la puissance six — mais pas impossible, et la contrainte
 * d'unicité la rattraperait par une erreur brute. On réessaie donc quelques
 * fois avant d'abandonner proprement.
 */
export async function creerLigue(
  playerId: string,
  nom: string,
): Promise<CreationLigue> {
  const dejaMembre = await db()
    .from('league_members')
    .select('league_id', { count: 'exact', head: true })
    .eq('player_id', playerId);

  if ((dejaMembre.count ?? 0) >= MAX_LIGUES_PAR_JOUEUR) {
    return { ok: false, raison: 'TROP_DE_LIGUES' };
  }

  for (let essai = 0; essai < 5; essai += 1) {
    const code = genererCodeLigue();
    const { data, error } = await db()
      .from('leagues')
      .insert({ name: nom, code, owner_id: playerId })
      .select('id, name, code')
      .maybeSingle();

    // 23505 = violation d'unicité : le code est déjà pris, on retire.
    if (error?.code === '23505') continue;
    if (error) throw new Error(`leagues.insert : ${error.message}`);
    if (!data) continue;

    const { error: erreurMembre } = await db()
      .from('league_members')
      .insert({ league_id: data.id, player_id: playerId });

    if (erreurMembre) {
      throw new Error(`league_members.insert : ${erreurMembre.message}`);
    }

    return {
      ok: true,
      ligue: {
        id: data.id,
        nom: data.name,
        code: data.code,
        membres: 1,
        proprietaire: true,
      },
    };
  }

  return { ok: false, raison: 'CODE_INDISPONIBLE' };
}

/**
 * Rejoint une ligue par son code.
 *
 * Les trois contrôles — ligue connue, place libre, quota du joueur — et
 * l'insertion tiennent dans **une fonction Postgres**. Les séparer laisserait
 * deux joueurs franchir ensemble la cinquantième place, ou un même joueur
 * dépasser son quota en ouvrant deux onglets.
 */
export async function rejoindreLigue(
  playerId: string,
  code: string,
): Promise<RefusAdhesion | null> {
  const { data, error } = await db().rpc('join_league', {
    p_player: playerId,
    p_code: code,
  });

  if (error) throw new Error(`join_league : ${error.message}`);
  return (data as RefusAdhesion | null) ?? null;
}

/**
 * Quitte une ligue.
 *
 * Le fondateur peut partir comme les autres : une ligue sans fondateur reste
 * une ligue, et bloquer sa sortie ferait d'une création un engagement à vie.
 * La ligue vidée de tous ses membres reste en base — inerte, et son code
 * cesse d'être distribuable puisque personne ne le voit plus.
 */
export async function quitterLigue(
  playerId: string,
  leagueId: string,
): Promise<void> {
  const { error } = await db()
    .from('league_members')
    .delete()
    .eq('league_id', leagueId)
    .eq('player_id', playerId);

  if (error) throw new Error(`league_members.delete : ${error.message}`);
}

/** Les membres d'une ligue, si le demandeur en fait partie. */
export async function membresDe(
  playerId: string,
  leagueId: string,
): Promise<MembreLigue[] | null> {
  /*
   * L'appartenance est vérifiée **côté serveur**, à chaque lecture.
   *
   * L'identifiant de ligue vient du navigateur. Sans ce contrôle, n'importe
   * qui pourrait lire le classement d'une ligue à laquelle il n'appartient
   * pas en devinant un uuid — improbable, mais c'est le genre de porte qu'on
   * ne laisse pas entrouverte (§99).
   */
  const { data: membre } = await db()
    .from('league_members')
    .select('player_id')
    .eq('league_id', leagueId)
    .eq('player_id', playerId)
    .maybeSingle();

  if (!membre) return null;

  const { data, error } = await db()
    .from('league_members')
    .select('player_id, players!inner(handle)')
    .eq('league_id', leagueId);

  if (error) throw new Error(`league_members.list : ${error.message}`);

  return (data ?? []).map((row) => {
    const joueur = row.players as unknown as { handle: string };
    return { playerId: row.player_id, handle: joueur.handle };
  });
}

/**
 * Scores d'un chapitre pour un ensemble de joueurs.
 *
 * Pas de pagination : une ligue plafonne à cinquante membres, et c'est
 * précisément ce que ce plafond garantit. Le `breakdown` n'est pas lu — le
 * classement d'une ligue affiche un pseudo et un total.
 */
export async function scoresDe(
  chapterId: string,
  playerIds: readonly string[],
): Promise<Map<string, number>> {
  if (playerIds.length === 0) return new Map();

  const { data, error } = await db()
    .from('team_scores')
    .select('total, teams!inner(player_id)')
    .eq('chapter_id', chapterId)
    .in('teams.player_id', [...playerIds]);

  if (error) throw new Error(`team_scores.league : ${error.message}`);

  const out = new Map<string, number>();
  for (const row of data ?? []) {
    const equipe = row.teams as unknown as { player_id: string };
    out.set(equipe.player_id, row.total);
  }
  return out;
}

/** Classement d'une ligue pour un chapitre, joueurs sans score compris. */
export async function classementLigue(
  playerId: string,
  leagueId: string,
  chapterId: string,
): Promise<{ joues: LigneLigue[]; absents: MembreLigue[] } | null> {
  const membres = await membresDe(playerId, leagueId);
  if (!membres) return null;

  const scores = await scoresDe(
    chapterId,
    membres.map((m) => m.playerId),
  );

  const joues: LigneLigue[] = [];
  const absents: MembreLigue[] = [];

  for (const membre of membres) {
    const total = scores.get(membre.playerId);
    // Un membre sans score n'a pas joué ce chapitre. Le classer dernier à zéro
    // le confondrait avec quelqu'un qui a joué et raté.
    if (total === undefined) absents.push(membre);
    else joues.push({ ...membre, total });
  }

  return { joues, absents };
}
