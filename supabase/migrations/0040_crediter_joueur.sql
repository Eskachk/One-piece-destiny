-- Crédit atomique de Berries et de coffres.
--
-- `grantBerriesAndChests` (dépôt Postgres) lisait la bourse, puis l'écrivait
-- avec sa version comme condition — sans vérifier qu'une ligne avait bien
-- été touchée. Si le joueur dépensait au même instant, la version avait
-- changé, la mise à jour ne trouvait rien, et la récompense de la semaine
-- disparaissait sans erreur. Le même schéma lecture-puis-écriture, sans
-- version du tout, servait pour les coffres.
--
-- Une addition côté base ne perd rien : deux écritures concurrentes sont
-- sérialisées par la ligne, et chacune ajoute son montant à la valeur que
-- l'autre a laissée.

create or replace function public.crediter_joueur(
  p_player  uuid,
  p_berries integer,
  p_chests  integer
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_berries < 0 or p_chests < 0 then
    raise exception 'crediter_joueur : montants négatifs refusés (%, %)', p_berries, p_chests;
  end if;

  if p_berries > 0 then
    insert into wallets (player_id, berries)
    values (p_player, p_berries)
    on conflict (player_id) do update
      set berries = wallets.berries + p_berries,
          version = wallets.version + 1;
  end if;

  if p_chests > 0 then
    insert into player_progress (player_id, unopened_chests, updated_at)
    values (p_player, p_chests, now())
    on conflict (player_id) do update
      set unopened_chests = player_progress.unopened_chests + p_chests,
          updated_at      = now();
  end if;
end;
$$;

revoke execute on function public.crediter_joueur(uuid, integer, integer)
  from public, anon, authenticated;
