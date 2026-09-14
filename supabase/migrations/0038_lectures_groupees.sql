-- Lectures groupées : une page, un aller-retour.
--
-- Mesuré au tir de charge du 14 septembre 2026 : l'API de la base plafonne
-- autour de 45 requêtes par seconde, quel que soit le nombre de connexions —
-- c'est la limite du palier de calcul, pas des requêtes elles-mêmes, qui
-- prennent 0,1 ms chacune. Or l'accueil en faisait quatre par affichage, la
-- collection quatre, le marché sept, le journal de bord dix. À ce prix, le
-- jeu servait dix pages par seconde et pas une de plus.
--
-- Chaque fonction ci-dessous rend en un seul appel tout ce qu'une page lit
-- sur un joueur. Le contenu est strictement celui des lectures qu'elle
-- remplace ; seul le nombre d'allers-retours change.
--
-- Toutes sont `stable` (lecture seule) et `security definer` n'est pas
-- nécessaire : elles sont appelées avec la clé de service, et leur exécution
-- est retirée aux rôles publics comme pour les fonctions du marché (0037).

-- ---------------------------------------------------------------------------
-- Le joueur : équipage du chapitre, cartes, progression, bourse, questions
-- du chapitre et réponses données. Sert l'accueil, la collection et le
-- classement.
-- ---------------------------------------------------------------------------
create or replace function public.lire_joueur(p_player uuid, p_chapter uuid default null)
returns jsonb
language sql
stable
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'team', (
      select jsonb_build_object(
        'character_ids', t.character_ids,
        'updated_at', t.updated_at
      )
        from teams t
       where t.player_id = p_player and t.chapter_id = p_chapter
    ),
    'cards', coalesce((
      select jsonb_agg(jsonb_build_object(
        'character_id', i.character_id,
        'serial_code', i.serial_code,
        'mint_number', i.mint_number,
        'obtained_from', i.obtained_from,
        'obtained_at', i.obtained_at
      ))
        from inventory i
       where i.player_id = p_player
    ), '[]'::jsonb),
    'progress', (
      select jsonb_build_object(
        'pity_counter', p.pity_counter,
        'starter_chest_opened_at', p.starter_chest_opened_at,
        'unopened_chests', p.unopened_chests,
        'shards', p.shards,
        'division', p.division,
        'promotion_streak', p.promotion_streak,
        'relegation_streak', p.relegation_streak
      )
        from player_progress p
       where p.player_id = p_player
    ),
    'wallet', (
      select jsonb_build_object(
        'berries', w.berries,
        'pending_berries', w.pending_berries,
        'royal_chests', w.royal_chests,
        'version', w.version
      )
        from wallets w
       where w.player_id = p_player
    ),
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id,
        'prompt', q.prompt,
        'options', q.options,
        'answer', q.answer,
        'position', q.position
      ) order by q.position)
        from chapter_questions q
       where q.chapter_id = p_chapter
    ), '[]'::jsonb),
    'answers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'question_id', a.question_id,
        'choice', a.choice
      ))
        from question_answers a
        join chapter_questions q on q.id = a.question_id
       where a.player_id = p_player and q.chapter_id = p_chapter
    ), '[]'::jsonb),
    'result', (
      select jsonb_build_object(
        'total', s.total,
        'breakdown', s.breakdown,
        'rank', (
          select count(*) + 1
            from team_scores d
           where d.chapter_id = p_chapter and d.total > s.total
        )
      )
        from team_scores s
        join teams t on t.id = s.team_id
       where s.chapter_id = p_chapter and t.player_id = p_player
    ),
    'reward', (
      select jsonb_build_object('berries', r.berries, 'chests', r.chests)
        from weekly_rewards r
       where r.player_id = p_player and r.chapter_id = p_chapter
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- Le journal de bord : progression, historique, cartes possédées,
-- notifications, parrainage, préférences et compte.
-- ---------------------------------------------------------------------------
create or replace function public.lire_profil(p_player uuid)
returns jsonb
language sql
stable
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'progress', (
      select jsonb_build_object(
        'division', p.division,
        'promotion_streak', p.promotion_streak,
        'relegation_streak', p.relegation_streak
      )
        from player_progress p
       where p.player_id = p_player
    ),
    'profiles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'chapter_id', w.chapter_id,
        'chapter_number', c.chapter_number,
        'risk', w.risk,
        'synergy_share', w.synergy_share,
        'average_pick_rate', w.average_pick_rate,
        'total', w.total,
        'percentile', w.percentile
      ) order by w.recorded_at desc)
        from (
          select * from weekly_profiles
           where player_id = p_player
           order by recorded_at desc
           limit 60
        ) w
        join chapter_events c on c.id = w.chapter_id
    ), '[]'::jsonb),
    'owned', coalesce((
      select jsonb_agg(i.character_id)
        from inventory i
       where i.player_id = p_player
    ), '[]'::jsonb),
    'notifications', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id,
        'kind', n.kind,
        'title', n.title,
        'body', n.body,
        'href', n.href,
        'read_at', n.read_at,
        'created_at', n.created_at
      ) order by n.created_at desc)
        from (
          select * from notifications
           where player_id = p_player
           order by created_at desc
           limit 30
        ) n
    ), '[]'::jsonb),
    'referral_code', (select pl.referral_code from players pl where pl.id = p_player),
    'handle', (select pl.handle from players pl where pl.id = p_player),
    'already_referred', exists(select 1 from referrals r where r.referred_id = p_player),
    'referred_count', (
      select count(*) from referrals r
       where r.referrer_id = p_player and r.rewarded_at is not null
    ),
    'preferences', (
      select jsonb_build_object(
        'weekly_email', np.weekly_email,
        'rewards_email', np.rewards_email,
        'marketing_email', np.marketing_email,
        'weekly_in_app', np.weekly_in_app,
        'rewards_in_app', np.rewards_in_app
      )
        from notification_preferences np
       where np.player_id = p_player
    ),
    'account', (
      select jsonb_build_object(
        'email_verified_at', ua.email_verified_at,
        'birth_date', ua.birth_date
      )
        from user_accounts ua
       where ua.player_id = p_player
       limit 1
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- Le marché, côté joueur : bourse, cartes possédées, liste de surveillance
-- avec meilleur prix, ventes récentes et seuils d'alerte.
-- ---------------------------------------------------------------------------
create or replace function public.lire_marche(p_player uuid)
returns jsonb
language sql
stable
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'wallet', (
      select jsonb_build_object(
        'berries', w.berries,
        'pending_berries', w.pending_berries,
        'royal_chests', w.royal_chests,
        'version', w.version
      )
        from wallets w
       where w.player_id = p_player
    ),
    'owned', coalesce((
      select jsonb_agg(i.character_id) from inventory i where i.player_id = p_player
    ), '[]'::jsonb),
    'watchlist', coalesce((
      select jsonb_agg(jsonb_build_object(
        'character_id', mw.character_id,
        'alert_below', mw.alert_below
      ) order by mw.added_at)
        from market_watchlist mw
       where mw.player_id = p_player
    ), '[]'::jsonb),
    'asks', coalesce((
      select jsonb_agg(jsonb_build_object('character_id', a.character_id, 'price', a.price))
        from public.lowest_asks_for_watchlist(p_player) a
    ), '[]'::jsonb),
    'sales', coalesce((
      select jsonb_agg(jsonb_build_object(
        'character_id', s.character_id, 'price', s.price, 'sold_at', s.sold_at
      ))
        from public.sales_for_watchlist(p_player) s
    ), '[]'::jsonb)
  );
$$;

revoke execute on function public.lire_joueur(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.lire_profil(uuid) from public, anon, authenticated;
revoke execute on function public.lire_marche(uuid) from public, anon, authenticated;
