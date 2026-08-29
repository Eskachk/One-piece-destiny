-- 0018 — Identité unique de carte.
--
-- ⚠️ Ce n'est **pas** un NFT : aucune chaîne de blocs, aucun jeton, aucune
-- valeur en argent réel. C'est un numéro de série. Le cloisonnement de
-- l'économie tient : une carte ne s'échange que contre des Berries.
--
--   `serial_code`  identifie cet exemplaire précis, et le suit lorsqu'il change
--                  de propriétaire au Market ;
--   `mint_number`  dit à quel rang il a été frappé pour ce personnage.

alter table inventory add column if not exists serial_code text;
alter table inventory add column if not exists mint_number integer;

-- Compteur d'émission par personnage. Une table dédiée plutôt qu'un `count(*)`
-- sur l'inventaire : une carte détruite ne doit pas faire réattribuer son
-- numéro à la suivante.
create table if not exists character_mint_counters (
  character_id text primary key references characters(id) on delete cascade,
  minted       integer not null default 0
);

alter table character_mint_counters enable row level security;

-- Réserve le prochain numéro et pose un code unique. L'`insert … on conflict
-- do update` incrémente sous verrou de ligne : deux ouvertures simultanées sur
-- le même personnage obtiennent deux numéros distincts.
create or replace function mint_card(p_inventory_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  v_character text;
  v_number    integer;
  v_code      text;
begin
  select character_id into v_character from inventory where id = p_inventory_id;
  if v_character is null then
    return null;
  end if;

  insert into character_mint_counters (character_id, minted)
  values (v_character, 1)
  on conflict (character_id) do update
    set minted = character_mint_counters.minted + 1
  returning minted into v_number;

  -- Code lisible et non devinable : le hasard vient du serveur (§97).
  v_code := 'GLW-' || upper(
    substr(encode(gen_random_bytes(6), 'hex'), 1, 4) || '-' ||
    substr(encode(gen_random_bytes(6), 'hex'), 1, 4) || '-' ||
    substr(encode(gen_random_bytes(6), 'hex'), 1, 4)
  );

  update inventory
     set serial_code = v_code, mint_number = v_number
   where id = p_inventory_id;

  return v_code;
end;
$$;

create unique index if not exists inventory_serial_code_idx
  on inventory (serial_code) where serial_code is not null;

create unique index if not exists inventory_mint_number_idx
  on inventory (character_id, mint_number) where mint_number is not null;
