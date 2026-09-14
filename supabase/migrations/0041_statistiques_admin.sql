-- Statistiques du poste de commandement, en un appel.
--
-- La page `/admin/stats` faisait quinze requêtes, dont deux fausses depuis
-- des mois : elle lisait `wallets.unopened_chests` (colonne inexistante —
-- les coffres sont dans `player_progress`) et `market_transactions.at`
-- (la colonne s'appelle `sold_at`). Les deux échouaient en silence et la
-- page affichait 0 Berries en circulation et 0 vente, quoi qu'il se passe.
--
-- Tout est recalculé ici, côté base, par une seule fonction : les
-- agrégations — les plus vendus, les plus alignés, les plus possédés —
-- n'ont aucun sens à faire en JavaScript après avoir rapatrié des tables
-- entières. Réservée à la clé de service, comme les autres.

create or replace function public.statistiques_admin()
returns jsonb
language sql
stable
set search_path = pg_catalog, public
as $$
  with
    j1 as (select now() - interval '1 day' as t),
    j7 as (select now() - interval '7 days' as t),
    j30 as (select now() - interval '30 days' as t),
    courant as (
      select id from chapter_events
       where status not in ('RESULTS_PUBLISHED', 'CANCELLED')
       order by chapter_number desc limit 1
    )
  select jsonb_build_object(
    'joueurs', jsonb_build_object(
      'total', (select count(*) from players),
      'crees_24h', (select count(*) from user_accounts where created_at >= (select t from j1)),
      'crees_7j', (select count(*) from user_accounts where created_at >= (select t from j7)),
      'crees_30j', (select count(*) from user_accounts where created_at >= (select t from j30)),
      'verifies', (select count(*) from user_accounts where email_verified_at is not null),
      'google', (select count(distinct user_id) from oauth_identities where provider = 'google'),
      'coffre_arrivee', (select count(*) from player_progress where starter_chest_opened_at is not null),
      'ont_joue', (select count(distinct player_id) from teams),
      'fideles', (select count(*) from (select player_id from teams group by player_id having count(*) >= 2) f),
      'actifs_24h', (select count(distinct user_id) from sessions where revoked_at is null and last_seen_at >= (select t from j1)),
      'actifs_7j', (select count(distinct user_id) from sessions where revoked_at is null and last_seen_at >= (select t from j7)),
      'parrainages', (select count(*) from referrals),
      'parrainages_recompenses', (select count(*) from referrals where rewarded_at is not null),
      'restreints', (select count(*) from account_restrictions where until is null or until > now()),
      'divisions', coalesce((
        select jsonb_agg(jsonb_build_object('division', d.division, 'n', d.n) order by d.n desc)
          from (select division, count(*) as n from player_progress group by division) d
      ), '[]'::jsonb)
    ),
    'economie', jsonb_build_object(
      'berries', coalesce((select sum(berries) from wallets), 0),
      'berries_attente', coalesce((select sum(pending_berries) from wallets), 0),
      'coffres_royaux', coalesce((select sum(royal_chests) from wallets), 0),
      'coffres_reserve', coalesce((select sum(unopened_chests) from player_progress), 0),
      'fragments', coalesce((select sum(shards) from player_progress), 0),
      'cartes', (select count(*) from inventory),
      'cartes_frappees', (select count(*) from inventory where serial_code is not null),
      'coffres_ouverts_total', (select count(*) from chest_openings),
      'coffres_ouverts_7j', (select count(*) from chest_openings where opened_at >= (select t from j7)),
      'coffres_par_type', coalesce((
        select jsonb_agg(jsonb_build_object('kind', k.kind, 'n', k.n) order by k.n desc)
          from (select kind, count(*) as n from chest_openings group by kind) k
      ), '[]'::jsonb),
      'pitie_declenchee', (select count(*) from chest_openings where pity_triggered),
      'fabrications_total', (select count(*) from craft_log),
      'fabrications_7j', (select count(*) from craft_log where crafted_at >= (select t from j7)),
      'fragments_depenses', coalesce((select sum(shards_spent) from craft_log), 0)
    ),
    'boutique', jsonb_build_object(
      'revenu_total', coalesce((select sum(amount_cents) from payment_intents where status = 'PAID'), 0),
      'revenu_30j', coalesce((select sum(amount_cents) from payment_intents where status = 'PAID' and settled_at >= (select t from j30)), 0),
      'revenu_7j', coalesce((select sum(amount_cents) from payment_intents where status = 'PAID' and settled_at >= (select t from j7)), 0),
      'achats_total', (select count(*) from payment_intents where status = 'PAID'),
      'achats_30j', (select count(*) from payment_intents where status = 'PAID' and settled_at >= (select t from j30)),
      'acheteurs', (select count(distinct player_id) from payment_intents where status = 'PAID'),
      'intentions_30j', (select count(*) from payment_intents where created_at >= (select t from j30)),
      'echecs_30j', (select count(*) from payment_intents where status = 'FAILED' and created_at >= (select t from j30)),
      'dernier_achat', (select max(settled_at) from payment_intents where status = 'PAID'),
      'produits', coalesce((
        select jsonb_agg(jsonb_build_object('product_id', p.product_id, 'achats', p.n, 'cents', p.cents) order by p.n desc, p.cents desc)
          from (
            select product_id, count(*) as n, sum(amount_cents) as cents
              from payment_intents where status = 'PAID' group by product_id
          ) p
      ), '[]'::jsonb)
    ),
    'marche', jsonb_build_object(
      'annonces_actives', (select count(*) from market_listings where status = 'ACTIVE'),
      'ventes_total', (select count(*) from market_transactions),
      'ventes_7j', (select count(*) from market_transactions where sold_at >= (select t from j7)),
      'ventes_30j', (select count(*) from market_transactions where sold_at >= (select t from j30)),
      'volume_total', coalesce((select sum(price) from market_transactions), 0),
      'volume_7j', coalesce((select sum(price) from market_transactions where sold_at >= (select t from j7)), 0),
      'volume_30j', coalesce((select sum(price) from market_transactions where sold_at >= (select t from j30)), 0),
      'taxe_total', coalesce((select sum(fee) from market_transactions), 0),
      'prix_moyen_30j', (select round(avg(price)) from market_transactions where sold_at >= (select t from j30)),
      'plus_vendus', coalesce((
        select jsonb_agg(jsonb_build_object('character_id', v.character_id, 'ventes', v.n, 'volume', v.volume, 'prix_moyen', v.moyen) order by v.n desc, v.volume desc)
          from (
            select character_id, count(*) as n, sum(price) as volume, round(avg(price)) as moyen
              from market_transactions group by character_id order by count(*) desc, sum(price) desc limit 10
          ) v
      ), '[]'::jsonb),
      'plus_chers', coalesce((
        select jsonb_agg(jsonb_build_object('character_id', c.character_id, 'prix_max', c.pmax, 'prix_moyen', c.moyen, 'ventes', c.n) order by c.pmax desc)
          from (
            select character_id, max(price) as pmax, round(avg(price)) as moyen, count(*) as n
              from market_transactions group by character_id order by max(price) desc limit 10
          ) c
      ), '[]'::jsonb),
      'vendeurs', coalesce((
        select jsonb_agg(jsonb_build_object('handle', s.handle, 'ventes', s.n, 'volume', s.volume) order by s.n desc)
          from (
            select pl.handle, count(*) as n, sum(t.price) as volume
              from market_transactions t join players pl on pl.id = t.seller_id
             group by pl.handle order by count(*) desc limit 5
          ) s
      ), '[]'::jsonb),
      'surveilles', coalesce((
        select jsonb_agg(jsonb_build_object('character_id', w.character_id, 'n', w.n) order by w.n desc)
          from (select character_id, count(*) as n from market_watchlist group by character_id order by count(*) desc limit 10) w
      ), '[]'::jsonb)
    ),
    'collection', jsonb_build_object(
      'par_rarete', coalesce((
        select jsonb_agg(jsonb_build_object('rarity', r.rarity, 'n', r.n) order by r.n desc)
          from (
            select c.rarity::text as rarity, count(*) as n
              from inventory i join characters c on c.id = i.character_id group by c.rarity
          ) r
      ), '[]'::jsonb),
      'par_source', coalesce((
        select jsonb_agg(jsonb_build_object('source', s.source, 'n', s.n) order by s.n desc)
          from (select coalesce(source, obtained_from) as source, count(*) as n from inventory group by 1) s
      ), '[]'::jsonb),
      'plus_possedes', coalesce((
        select jsonb_agg(jsonb_build_object('character_id', p.character_id, 'n', p.n) order by p.n desc)
          from (select character_id, count(*) as n from inventory group by character_id order by count(*) desc limit 10) p
      ), '[]'::jsonb),
      'plus_fabriques', coalesce((
        select jsonb_agg(jsonb_build_object('character_id', f.character_id, 'n', f.n) order by f.n desc)
          from (select character_id, count(*) as n from craft_log group by character_id order by count(*) desc limit 10) f
      ), '[]'::jsonb),
      'collectionneurs', coalesce((
        select jsonb_agg(jsonb_build_object('handle', k.handle, 'cartes', k.n) order by k.n desc)
          from (
            select pl.handle, count(*) as n from inventory i join players pl on pl.id = i.player_id
             group by pl.handle order by count(*) desc limit 5
          ) k
      ), '[]'::jsonb)
    ),
    'jeu', jsonb_build_object(
      'chapitres', coalesce((
        select jsonb_agg(jsonb_build_object(
          'chapter_number', c.chapter_number,
          'status', c.status,
          'equipes', (select count(*) from teams t where t.chapter_id = c.id),
          'moyenne', (select round(avg(total)) from team_scores s where s.chapter_id = c.id),
          'meilleur', (select max(total) from team_scores s where s.chapter_id = c.id),
          'reponses', (select count(*) from question_answers a join chapter_questions q on q.id = a.question_id where q.chapter_id = c.id),
          'questions', (select count(*) from chapter_questions q where q.chapter_id = c.id)
        ) order by c.chapter_number desc)
          from (select * from chapter_events order by chapter_number desc limit 8) c
      ), '[]'::jsonb),
      'plus_alignes', coalesce((
        select jsonb_agg(jsonb_build_object('character_id', a.character_id, 'n', a.n) order by a.n desc)
          from (
            select x.character_id, count(*) as n
              from teams t, unnest(t.character_ids) as x(character_id)
             group by x.character_id order by count(*) desc limit 10
          ) a
      ), '[]'::jsonb),
      'plus_alignes_courant', coalesce((
        select jsonb_agg(jsonb_build_object('character_id', a.character_id, 'n', a.n) order by a.n desc)
          from (
            select x.character_id, count(*) as n
              from teams t, unnest(t.character_ids) as x(character_id)
             where t.chapter_id = (select id from courant)
             group by x.character_id order by count(*) desc limit 10
          ) a
      ), '[]'::jsonb),
      'equipes_courant', (select count(*) from teams where chapter_id = (select id from courant)),
      'reponses_total', (select count(*) from question_answers),
      'ligues', (select count(*) from leagues),
      'commentaires', (select count(*) from chapter_comments where deleted_at is null)
    ),
    'courrier', jsonb_build_object(
      'en_attente', (select count(*) from email_outbox where status = 'PENDING'),
      'envoyes', (select count(*) from email_outbox where status = 'SENT'),
      'envoyes_7j', (select count(*) from email_outbox where status = 'SENT' and sent_at >= (select t from j7)),
      'morts', (select count(*) from email_outbox where status = 'DEAD'),
      'notifications_7j', (select count(*) from notifications where created_at >= (select t from j7)),
      'notifications_non_lues', (select count(*) from notifications where read_at is null)
    ),
    'risque', jsonb_build_object(
      'a_examiner', (select count(*) from risk_assessments where reviewed_at is null and level in ('REVIEW', 'RESTRICTED', 'HIGH_RISK')),
      'restreints', (select count(*) from account_restrictions where until is null or until > now()),
      'faux_positifs', (select count(*) from risk_assessments where verdict = 'FALSE_POSITIVE'),
      'evaluations_7j', (select count(*) from risk_assessments where at >= (select t from j7))
    ),
    'genere_le', now()
  );
$$;

revoke execute on function public.statistiques_admin() from public, anon, authenticated;
