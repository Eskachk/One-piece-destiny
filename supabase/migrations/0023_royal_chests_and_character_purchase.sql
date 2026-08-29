-- 0023 — Coffres royaux et achat de personnage.

-- Réserve distincte des coffres ordinaires.
--
-- Un seul compteur n'aurait pas suffi : le coffre royal a sa propre mise en
-- scène et sa propre garantie, donc l'ouverture doit savoir lequel elle
-- consomme. Les mélanger aurait fait ouvrir un coffre payé avec la cérémonie
-- d'un coffre hebdomadaire.
alter table wallets add column if not exists royal_chests integer not null default 0;

alter table wallets drop constraint if exists wallets_royal_chests_positive;
alter table wallets add constraint wallets_royal_chests_positive check (royal_chests >= 0);

-- Consomme un coffre royal, une seule fois.
--
-- Même forme que le reste de l'économie : la décision est dans la requête, pas
-- dans l'application. Deux ouvertures simultanées ne peuvent pas consommer le
-- même coffre, car la seconde ne trouve plus `royal_chests > 0`.
create or replace function consume_royal_chest(p_player_id uuid)
returns boolean
language plpgsql
security definer
as $$
declare
  v_ok boolean;
begin
  update wallets
     set royal_chests = royal_chests - 1,
         version = version + 1
   where player_id = p_player_id
     and royal_chests > 0;

  get diagnostics v_ok = row_count;
  return v_ok;
end;
$$;

-- Octroi d'achat étendu : coffres royaux et personnages nommés.
--
-- Tout ce que cette fonction reçoit vient du catalogue serveur, jamais du
-- webhook : le prestataire dit qu'un produit a été payé, il ne dit pas ce que
-- ce produit contient.
--
-- L'insertion de personnage est en `on conflict do nothing` : racheter un
-- personnage déjà possédé ne crée pas de doublon silencieux. L'application
-- refuse en amont ; ceci est la ceinture.
create or replace function grant_purchase_v2(
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

  insert into wallets (player_id, berries, unopened_chests, royal_chests)
  values (p_player_id, p_berries, p_chests, p_royal_chests)
  on conflict (player_id) do update
    set berries         = wallets.berries + p_berries,
        unopened_chests = wallets.unopened_chests + p_chests,
        royal_chests    = wallets.royal_chests + p_royal_chests,
        version         = wallets.version + 1;

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
