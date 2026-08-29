-- 0014 — Attribution d'un achat vérifié, en une seule transaction.
--
-- Le crédit et le passage de l'intention à l'état réglé doivent être
-- atomiques : créditer puis échouer à marquer l'intention permettrait à un
-- second webhook de créditer une seconde fois.
create or replace function grant_purchase(
  p_intent_id  uuid,
  p_berries    integer,
  p_chests     integer
) returns boolean
language plpgsql
security definer
as $$
declare
  v_player uuid;
  v_rows   integer;
begin
  update payment_intents
     set status = 'PAID', settled_at = now()
   where id = p_intent_id
     and status = 'CREATED'
  returning player_id into v_player;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    return false; -- déjà réglée, ou inexistante : aucun crédit.
  end if;

  if p_berries > 0 then
    insert into wallets (player_id, berries)
    values (v_player, p_berries)
    on conflict (player_id) do update
      set berries = wallets.berries + excluded.berries,
          version = wallets.version + 1;
  end if;

  if p_chests > 0 then
    insert into player_progress (player_id, unopened_chests)
    values (v_player, p_chests)
    on conflict (player_id) do update
      set unopened_chests = player_progress.unopened_chests + excluded.unopened_chests,
          updated_at = now();
  end if;

  return true;
end;
$$;
