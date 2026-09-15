import 'server-only';

import { CHARACTER_INDEX } from '@/data/characters';
import { db, isDatabaseConfigured } from '@/lib/supabase-admin';

/**
 * Le trésor d'un compte, vu du Poste de commandement.
 *
 * Ce qu'un joueur détient — Berries, coffres, coffres royaux, fragments,
 * cartes — n'était visible nulle part côté administration. Le jour où un bug
 * de duplication apparaît, c'est pourtant la première chose à regarder : qui
 * a quoi, depuis quand, et d'où ça vient.
 *
 * Lecture en un aller-retour (`tresor_du_compte`, migration 0044). Elle est
 * **réservée à l'administrateur** — c'est exactement ce que le profil public
 * ne montre pas — et consultée comme le reste du journal : chaque lecture est
 * auditée par la page qui l'appelle.
 */

export interface Tresor {
  berries: number;
  pendingBerries: number;
  royalChests: number;
  unopenedChests: number;
  shards: number;
  cards: number;
  /** Comptées avec les données du jeu, la seule source de vérité des raretés. */
  cardsByRarity: Record<string, number>;
  /** Les huit dernières cartes obtenues, les plus récentes d'abord. */
  recent: { characterId: string; serialCode: string | null; source: string | null; at: string | null }[];
  purchases: number;
  chestsOpened: number;
}

interface TresorBrut {
  berries: number;
  pending_berries: number;
  royal_chests: number;
  unopened_chests: number;
  shards: number;
  character_ids: string[];
  recent: { character_id: string; serial_code: string | null; source: string | null; at: string | null }[];
  purchases: number;
  chests_opened: number;
}

export async function tresorDuCompte(playerId: string): Promise<Tresor | null> {
  if (!isDatabaseConfigured()) return null;

  const { data, error } = await db().rpc('tresor_du_compte', { p_player: playerId });
  if (error) throw new Error(`tresor_du_compte : ${error.message}`);
  const brut = data as TresorBrut;

  return {
    berries: brut.berries,
    pendingBerries: brut.pending_berries,
    royalChests: brut.royal_chests,
    unopenedChests: brut.unopened_chests,
    shards: brut.shards,
    cards: brut.character_ids.length,
    cardsByRarity: brut.character_ids.reduce<Record<string, number>>((acc, id) => {
      const rarete = CHARACTER_INDEX.get(id)?.rarity ?? 'INCONNU';
      acc[rarete] = (acc[rarete] ?? 0) + 1;
      return acc;
    }, {}),
    recent: brut.recent.map((r) => ({
      characterId: r.character_id,
      serialCode: r.serial_code,
      source: r.source,
      at: r.at,
    })),
    purchases: brut.purchases,
    chestsOpened: brut.chests_opened,
  };
}

export interface Ajustement {
  berries: number;
  chests: number;
  royalChests: number;
}

export interface Solde {
  berries: number;
  royal_chests: number;
  unopened_chests: number;
}

/**
 * Applique un ajustement, en relatif, dans une seule transaction, jamais sous
 * zéro. Rend l'avant et l'après — c'est ce que le journal d'audit enregistre.
 */
export async function ajusterTresor(
  playerId: string,
  delta: Ajustement,
): Promise<{ avant: Solde; apres: Solde }> {
  const { data, error } = await db().rpc('ajuster_tresor', {
    p_player: playerId,
    p_berries: delta.berries,
    p_chests: delta.chests,
    p_royal_chests: delta.royalChests,
  });
  if (error) throw new Error(`ajuster_tresor : ${error.message}`);
  return data as { avant: Solde; apres: Solde };
}
