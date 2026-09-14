-- Réparation de `grant_purchase_v2` : les coffres achetés n'étaient jamais crédités.
--
-- La fonction (0023) écrivait `wallets.unopened_chests`. Cette colonne
-- n'existe pas : les coffres à ouvrir vivent dans `player_progress`
-- (0008), la bourse ne porte que les Berries et les coffres royaux. Une
-- fonction plpgsql n'est vérifiée qu'à l'exécution, la migration était donc
-- passée sans bruit — et le premier vrai paiement aurait échoué **après**
-- l'encaissement : le webhook répondait 500, Stripe réessayait pendant trois
-- jours, le joueur avait payé et ne voyait rien arriver.
--
-- Trouvé le 14 septembre 2026 par une sonde en transaction annulée
-- (« column "unopened_chests" of relation "wallets" does not exist »),
-- avant tout achat réel : aucune intention n'est jamais passée à PAID.
--
-- Même signature, même idempotence, mêmes garanties. Seule change la table
-- qui reçoit les coffres.

create or replace function public.grant_purchase_v2(
  p_player_id    uuid,
  p_berries      integer,
  p_chests       integer,
  p_royal_chests integer,
  p_character_id text,
  p_intent_id    uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_claimed boolean;
  v_inventory uuid;
begin
  -- Idempotence : l'intention ne passe à PAID qu'une fois.
  update payment_intents
     set status = 'PAID', settled_at = now()
   where id = p_intent_id
     and status <> 'PAID';

  get diagnostics v_claimed = row_count;
  if not v_claimed then
    return false;
  end if;

  insert into wallets (player_id, berries, royal_chests)
  values (p_player_id, p_berries, p_royal_chests)
  on conflict (player_id) do update
    set berries      = wallets.berries + p_berries,
        royal_chests = wallets.royal_chests + p_royal_chests,
        version      = wallets.version + 1;

  if p_chests > 0 then
    insert into player_progress (player_id, unopened_chests, updated_at)
    values (p_player_id, p_chests, now())
    on conflict (player_id) do update
      set unopened_chests = player_progress.unopened_chests + p_chests,
          updated_at      = now();
  end if;

  if p_character_id is not null then
    insert into inventory (player_id, character_id, obtained_from, source, acquired_at)
    values (p_player_id, p_character_id, 'Boutique', 'PURCHASE', now())
    on conflict (player_id, character_id) do nothing
    returning id into v_inventory;

    if v_inventory is not null then
      perform mint_card(v_inventory);
    end if;
  end if;

  return true;
end;
$$;
