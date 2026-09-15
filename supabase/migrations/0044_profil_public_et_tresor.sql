/*
 * Profil public d'un joueur, et trésor d'un compte vu du Poste de commandement.
 *
 * ## Le profil public
 *
 * Le classement montre des pseudos ; il ne menait nulle part. `lire_profil_public`
 * rend, en un aller-retour, ce qu'un joueur accepte que les autres voient de
 * lui : son pseudo, sa division, ses dernières semaines (score et rang en
 * pourcentage), ses distinctions, sa collection **en nombre**, et l'équipage
 * de son dernier chapitre **publié** — jamais celui de la semaine en cours,
 * qui est un pari en train de se jouer.
 *
 * Rien de personnel n'en sort : ni adresse, ni date de naissance, ni
 * identifiant de compte, ni Berries. La recherche se fait sur la forme
 * canonique du pseudo (`handle_canonical`, migration 0025), la même que celle
 * qui garantit l'unicité : « Sh_anks » et « shanks » sont le même joueur.
 *
 * ## Le trésor, et son ajustement
 *
 * Un bug de duplication finit toujours par exister. Quand il arrive, il faut
 * pouvoir **voir** ce qu'un compte détient — Berries, coffres, coffres royaux,
 * fragments, cartes — et le **corriger** : reprendre ce qui a été dupliqué,
 * ou rendre à un joueur ce qu'un incident lui a coûté.
 *
 * `ajuster_tresor` fait cela dans une seule transaction, en relatif (des
 * deltas, jamais des valeurs absolues : « −3 coffres » ne dépend pas d'un
 * chiffre lu une seconde plus tôt), et **jamais sous zéro** — reprendre dix
 * coffres à qui en a quatre en laisse zéro, pas moins six. Elle rend l'avant
 * et l'après, pour que le journal d'audit dise exactement ce qui a changé.
 *
 * Ce que la fonction ne fait pas, à dessein : toucher aux cartes. Une carte a
 * un numéro de série et un historique de propriété (`card_ownership`) ; la
 * reprendre est une opération de marché, pas un compteur qu'on décrémente.
 */

-- ---------------------------------------------------------------------------
-- Profil public.
-- ---------------------------------------------------------------------------

create or replace function public.lire_profil_public(p_canonical text)
returns jsonb
language sql
stable
set search_path = pg_catalog, public
as $$
  with joueur as (
    select id, handle, created_at
      from players
     where handle_canonical = p_canonical
     limit 1
  )
  select case when (select id from joueur) is null then null else jsonb_build_object(
    'player', (
      select jsonb_build_object('id', j.id, 'handle', j.handle, 'created_at', j.created_at)
        from joueur j
    ),
    'division', (
      select p.division
        from player_progress p
       where p.player_id = (select id from joueur)
    ),
    'profiles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'chapter_number', c.chapter_number,
        'total', w.total,
        'percentile', w.percentile,
        'risk', w.risk,
        'synergy_share', w.synergy_share,
        'average_pick_rate', w.average_pick_rate
      ) order by c.chapter_number desc)
        from (
          select * from weekly_profiles
           where player_id = (select id from joueur)
           order by recorded_at desc
           limit 12
        ) w
        join chapter_events c on c.id = w.chapter_id
    ), '[]'::jsonb),
    'owned', coalesce((
      select jsonb_agg(i.character_id)
        from inventory i
       where i.player_id = (select id from joueur)
    ), '[]'::jsonb),
    'awards', coalesce((
      select jsonb_agg(jsonb_build_object(
        'award', a.award,
        'chapter_number', c.chapter_number
      ) order by c.chapter_number desc)
        from chapter_awards a
        join chapter_events c on c.id = a.chapter_id
       where a.player_id = (select id from joueur)
         and c.results_published_at is not null
    ), '[]'::jsonb),
    -- L'équipage du dernier chapitre **publié** seulement.
    'last_team', (
      select jsonb_build_object(
        'chapter_number', c.chapter_number,
        'character_ids', to_jsonb(t.character_ids),
        'total', s.total
      )
        from teams t
        join chapter_events c on c.id = t.chapter_id
        left join team_scores s on s.team_id = t.id
       where t.player_id = (select id from joueur)
         and c.results_published_at is not null
       order by c.chapter_number desc
       limit 1
    )
  ) end;
$$;

revoke execute on function public.lire_profil_public(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Trésor d'un compte, pour le Poste de commandement.
-- ---------------------------------------------------------------------------

create or replace function public.tresor_du_compte(p_player uuid)
returns jsonb
language sql
stable
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'berries', coalesce((select w.berries from wallets w where w.player_id = p_player), 0),
    'pending_berries', coalesce((select w.pending_berries from wallets w where w.player_id = p_player), 0),
    'royal_chests', coalesce((select w.royal_chests from wallets w where w.player_id = p_player), 0),
    'unopened_chests', coalesce((select p.unopened_chests from player_progress p where p.player_id = p_player), 0),
    'shards', coalesce((select p.shards from player_progress p where p.player_id = p_player), 0),
    -- Les raretés se comptent dans l'application, pas dans la table
    -- `characters`, dont la rareté peut retarder sur les données du jeu : la
    -- fonction rend la liste des cartes et laisse le code compter.
    'character_ids', coalesce((
      select jsonb_agg(i.character_id) from inventory i where i.player_id = p_player
    ), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object(
        'character_id', i.character_id,
        'serial_code', i.serial_code,
        'source', coalesce(i.source, i.obtained_from),
        'at', coalesce(i.acquired_at, i.obtained_at)
      ) order by coalesce(i.acquired_at, i.obtained_at) desc)
        from (
          select * from inventory
           where player_id = p_player
           order by coalesce(acquired_at, obtained_at) desc
           limit 8
        ) i
    ), '[]'::jsonb),
    'purchases', (
      select count(*) from payment_intents pi where pi.player_id = p_player and pi.status = 'PAID'
    ),
    'chests_opened', (
      select count(*) from chest_openings o where o.player_id = p_player
    )
  );
$$;

revoke execute on function public.tresor_du_compte(uuid) from public, anon, authenticated;

create or replace function public.ajuster_tresor(
  p_player uuid,
  p_berries integer,
  p_chests integer,
  p_royal_chests integer
)
returns jsonb
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_avant jsonb;
  v_apres jsonb;
begin
  -- Les lignes doivent exister pour être verrouillées : un compte tout neuf
  -- peut n'avoir ni portefeuille ni progression.
  insert into wallets (player_id, berries) values (p_player, 0)
    on conflict (player_id) do nothing;
  insert into player_progress (player_id) values (p_player)
    on conflict (player_id) do nothing;

  select jsonb_build_object(
    'berries', w.berries, 'royal_chests', w.royal_chests, 'unopened_chests', p.unopened_chests
  ) into v_avant
    from wallets w
    join player_progress p on p.player_id = w.player_id
   where w.player_id = p_player
   for update of w, p;

  update wallets
     set berries = greatest(0, berries + p_berries),
         royal_chests = greatest(0, royal_chests + p_royal_chests),
         version = version + 1
   where player_id = p_player;

  update player_progress
     set unopened_chests = greatest(0, unopened_chests + p_chests),
         updated_at = now()
   where player_id = p_player;

  select jsonb_build_object(
    'berries', w.berries, 'royal_chests', w.royal_chests, 'unopened_chests', p.unopened_chests
  ) into v_apres
    from wallets w
    join player_progress p on p.player_id = w.player_id
   where w.player_id = p_player;

  return jsonb_build_object('avant', v_avant, 'apres', v_apres);
end;
$$;

revoke execute on function public.ajuster_tresor(uuid, integer, integer, integer) from public, anon, authenticated;
