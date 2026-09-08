-- L'ouverture d'un coffre devient une seule transaction.
--
-- ## Le défaut corrigé, et ce qu'il coûtait au joueur
--
-- `applyChestOpening` enchaînait jusqu'à **quatorze allers-retours HTTP** sans
-- transaction : la clé d'idempotence, l'inventaire, une frappe et une ligne de
-- propriété **par carte**, la progression, les fragments.
--
-- La clé d'idempotence était posée **en premier**, et le coffre déjà décompté
-- avant l'appel. Si quoi que ce soit échouait ensuite — délai PostgREST,
-- expiration de la fonction, coupure réseau — le joueur avait payé son coffre,
-- ne recevait rien, et **le rejeu était refusé** : la clé existait déjà, la
-- fonction répondait « déjà appliqué ». Il n'y avait aucun recours, et rien
-- dans le produit ne permettait même de s'en apercevoir.
--
-- Ici, tout est dans une fonction plpgsql : Postgres l'exécute dans une
-- transaction unique. Elle aboutit entièrement, ou elle ne laisse rien.
--
-- ## Le gain de charge vient par-dessus
--
-- Quatorze allers-retours deviennent **un**. Chaque aller-retour vers Supabase
-- a été mesuré entre 20 et 60 ms depuis la plateforme ; sur le geste le plus
-- fréquent du produit, c'est plusieurs centaines de millisecondes rendues au
-- joueur et autant de pression en moins sur le pool de connexions, qui est le
-- goulot mesuré de l'application.
--
-- ## Ce que la fonction ne fait pas
--
-- Elle ne décompte pas le coffre. Ce geste-là est déjà atomique et appartient
-- à l'appelant, qui doit pouvoir refuser avant de tirer les cartes.

create or replace function public.apply_chest_opening(
  p_player            uuid,
  p_kind              text,
  p_cards             jsonb,
  p_pity_counter      integer,
  p_pity_triggered    boolean,
  p_client_request_id text,
  p_tradable_lock_ms  integer default null
) returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_claim        uuid;
  v_source       text;
  v_obtenu       text;
  v_tradable     timestamptz;
  v_fragments    integer;
  v_carte        record;
  v_inventaire   uuid;
  v_numero       integer;
  v_code         text;
begin
  /*
   * La clé d'idempotence, toujours en premier — mais désormais **dans** la
   * transaction. Un double envoi du même formulaire trouve la ligne et
   * ressort sans rien appliquer ; un échec plus loin annule aussi la clé, et
   * le rejeu redevient possible.
   */
  insert into chest_openings (player_id, kind, cards, pity_triggered, client_request_id)
  values (p_player, p_kind, p_cards, p_pity_triggered, p_client_request_id)
  on conflict (client_request_id) do nothing
  returning id into v_claim;

  if v_claim is null then
    return 'already-applied';
  end if;

  v_source := case when p_kind = 'STARTER' then 'STARTER_CHEST' else 'CHEST' end;
  v_obtenu := case when p_kind = 'STARTER' then 'Coffre d''inscription' else 'Coffre' end;

  /*
   * Verrou des cartes d'inscription (§43, anti-abus).
   *
   * Les cartes du coffre offert à l'arrivée ne sont pas échangeables pendant
   * une période fixée. C'est la protection la plus efficace du dispositif, et
   * la seule qui ne se trompe sur personne : elle ne détecte rien, elle rend
   * simplement immobile la valeur qu'une ferme de comptes concentrerait.
   */
  v_tradable := case
    when p_tradable_lock_ms is null then null
    else now() + make_interval(secs => p_tradable_lock_ms / 1000.0)
  end;

  for v_carte in
    select value ->> 'characterId' as character_id
    from jsonb_array_elements(p_cards)
    where coalesce((value ->> 'duplicate')::boolean, false) = false
  loop
    /*
     * `do nothing` et non `do update` : deux coffres ouverts en même temps ne
     * doivent pas produire deux lignes pour le même personnage, et le second
     * ne doit surtout pas réécrire la date d'acquisition du premier — ni sa
     * frappe, qui est l'identité de l'exemplaire.
     */
    insert into inventory (
      player_id, character_id, obtained_from, source, acquired_at, tradable_from
    )
    values (p_player, v_carte.character_id, v_obtenu, v_source, now(), v_tradable)
    on conflict (player_id, character_id) do nothing
    returning id into v_inventaire;

    -- Déjà possédée : rien à frapper, rien à tracer.
    continue when v_inventaire is null;

    -- Frappe : numéro d'émission et code unique, tirés **en base**. Le hasard
    -- ne vient jamais du client (§97).
    insert into character_mint_counters (character_id, minted)
    values (v_carte.character_id, 1)
    on conflict (character_id) do update
      set minted = character_mint_counters.minted + 1
    returning minted into v_numero;

    v_code := 'GLW-' || upper(
      substr(encode(gen_random_bytes(6), 'hex'), 1, 4) || '-' ||
      substr(encode(gen_random_bytes(6), 'hex'), 1, 4) || '-' ||
      substr(encode(gen_random_bytes(6), 'hex'), 1, 4)
    );

    update inventory
       set serial_code = v_code, mint_number = v_numero
     where id = v_inventaire;

    -- Premier maillon de la chaîne de propriété. Il porte la **source**, ce
    -- qui rend traçable, des mois plus tard, qu'une carte trouvée sur le
    -- compte principal venait du coffre d'inscription d'un autre.
    insert into card_ownership (serial_code, character_id, player_id, source)
    values (v_code, v_carte.character_id, p_player, v_source);
  end loop;

  /*
   * Les fragments des doublons vont dans la réserve **unique** du joueur.
   *
   * Une seule écriture, incrémentale : un `upsert` qui écrirait une valeur
   * ferait perdre les fragments d'un coffre ouvert en parallèle.
   */
  select coalesce(sum((value ->> 'shards')::integer), 0)
    into v_fragments
    from jsonb_array_elements(p_cards)
   where coalesce((value ->> 'duplicate')::boolean, false) = true;

  insert into player_progress (player_id, pity_counter, shards, starter_chest_opened_at, updated_at)
  values (
    p_player,
    p_pity_counter,
    v_fragments,
    case when p_kind = 'STARTER' then now() else null end,
    now()
  )
  on conflict (player_id) do update
    set pity_counter = excluded.pity_counter,
        shards = player_progress.shards + v_fragments,
        starter_chest_opened_at = coalesce(
          player_progress.starter_chest_opened_at,
          excluded.starter_chest_opened_at
        ),
        updated_at = now();

  return 'applied';
end;
$$;

-- Hors de portée de l'API publique, comme les seize autres (migration 0031).
revoke execute on function public.apply_chest_opening(
  uuid, text, jsonb, integer, boolean, text, integer
) from public, anon, authenticated;
