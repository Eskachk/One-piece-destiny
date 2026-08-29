import 'server-only';

import { db, isDatabaseConfigured } from '@/lib/supabase-admin';

/**
 * Provenance des cartes (cahier §43, cadrage §15).
 *
 * Chaque exemplaire porte déjà un code de série unique, posé à la frappe
 * (migration 0018). Ce module lui ajoute ce qui manquait : **la chaîne de ses
 * propriétaires successifs**.
 *
 * C'est l'outil le plus décisif du dispositif, parce qu'il ne repose sur
 * aucune heuristique. Il ne dit pas « ce compte semble suspect » ; il dit
 * « ces quinze cartes trouvées sur ce compte viennent des coffres
 * d'inscription de quinze comptes créés le même jour ». Un score se conteste,
 * une chaîne de propriété se lit.
 *
 * L'historique est **ajouté, jamais modifié**. Une ligne fausse resterait
 * visible et corrigible ; une ligne réécrite serait invisible.
 */

export interface OwnershipEntry {
  serialCode: string;
  characterId: string;
  playerId: string;
  handle: string | null;
  source: string;
  at: Date;
}

/**
 * Enregistre un changement de propriétaire.
 *
 * Silencieux en cas d'échec : perdre un maillon d'historique est regrettable,
 * annuler une vente déjà réglée en base le serait bien davantage.
 */
export async function recordTransfer(input: {
  playerId: string;
  characterId: string;
  source: 'MARKET' | 'CRAFT' | 'PURCHASE';
}): Promise<void> {
  if (!isDatabaseConfigured()) return;

  try {
    // Le code de série suit la carte : on le relit sur la ligne d'inventaire
    // du nouveau propriétaire plutôt que de le transporter dans l'appel, où
    // il pourrait se désynchroniser de la carte réellement transférée.
    const { data } = await db()
      .from('inventory')
      .select('serial_code')
      .eq('player_id', input.playerId)
      .eq('character_id', input.characterId)
      .maybeSingle();

    if (!data?.serial_code) return;

    await db().from('card_ownership').insert({
      serial_code: data.serial_code,
      character_id: input.characterId,
      player_id: input.playerId,
      source: input.source,
    });
  } catch (error) {
    console.warn('[antiabuse] provenance non enregistrée', (error as Error).message);
  }
}

/**
 * Chaîne complète d'un exemplaire, du premier propriétaire au dernier.
 *
 * Destinée au Fraud Center. `players!inner` joint le pseudonyme : un
 * administrateur qui lit une chaîne a besoin de noms, pas d'UUID.
 */
export async function ownershipChain(
  serialCode: string,
): Promise<OwnershipEntry[]> {
  if (!isDatabaseConfigured()) return [];

  const { data } = await db()
    .from('card_ownership')
    .select('serial_code, character_id, player_id, source, at, players!inner(handle)')
    .eq('serial_code', serialCode)
    .order('at', { ascending: true });

  return (data ?? []).map((row) => ({
    serialCode: row.serial_code,
    characterId: row.character_id,
    playerId: row.player_id,
    handle: (row.players as unknown as { handle: string } | null)?.handle ?? null,
    source: row.source,
    at: new Date(row.at),
  }));
}

/**
 * Cartes détenues par un joueur mais **nées ailleurs**.
 *
 * C'est la requête qui met au jour la ferme de comptes : elle liste les
 * exemplaires dont le premier propriétaire n'est pas le propriétaire actuel,
 * et dont l'origine est un coffre d'inscription.
 */
export async function foreignStarterCards(playerId: string): Promise<
  { serialCode: string; characterId: string; originHandle: string | null }[]
> {
  if (!isDatabaseConfigured()) return [];

  const { data: mine } = await db()
    .from('inventory')
    .select('serial_code, character_id')
    .eq('player_id', playerId)
    .not('serial_code', 'is', null);

  const codes = (mine ?? []).map((row) => row.serial_code as string);
  if (codes.length === 0) return [];

  const { data: origins } = await db()
    .from('card_ownership')
    .select('serial_code, character_id, player_id, source, at, players!inner(handle)')
    .in('serial_code', codes)
    .eq('source', 'STARTER_CHEST');

  return (origins ?? [])
    .filter((row) => row.player_id !== playerId)
    .map((row) => ({
      serialCode: row.serial_code,
      characterId: row.character_id,
      originHandle:
        (row.players as unknown as { handle: string } | null)?.handle ?? null,
    }));
}
