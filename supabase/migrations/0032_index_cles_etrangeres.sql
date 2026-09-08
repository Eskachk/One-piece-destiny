-- Index sur les clés étrangères qui n'en avaient pas.
--
-- ## Ce que coûte une clé étrangère sans index
--
-- Postgres n'indexe **pas** automatiquement le côté enfant d'une clé
-- étrangère. À chaque suppression d'une ligne parente, il doit prouver
-- qu'aucun enfant ne la référence — et sans index, cette preuve est un
-- parcours complet de la table enfant.
--
-- Concrètement : supprimer un compte (droit à l'effacement) déclenche
-- aujourd'hui un parcours de `market_transactions`, `chapter_comments`,
-- `comment_likes`, `craft_log` et des autres. Sur cinq lignes, c'est gratuit ;
-- sur un an de trafic, la suppression d'un seul compte lit la table entière du
-- Marché, plusieurs fois.
--
-- Le second gain est ordinaire : ces colonnes sont aussi celles par lesquelles
-- on cherche — les transactions d'un vendeur, les alertes sur un personnage,
-- les événements d'un paiement.
--
-- ## Ce qui n'est pas indexé, et pourquoi
--
-- Quatre colonnes d'administration sont laissées de côté :
-- `account_restrictions.set_by`, `app_settings.updated_by`,
-- `chapter_corrections.applied_by`, `risk_assessments.reviewed_by`. Elles
-- pointent toutes vers le même unique administrateur, ne servent jamais de
-- critère de recherche, et leurs tables comptent quelques dizaines de lignes.
-- Un index y coûterait une écriture de plus sans jamais être lu.

create index if not exists card_ownership_character_idx
  on public.card_ownership (character_id);

create index if not exists chapter_awards_player_idx
  on public.chapter_awards (player_id);

create index if not exists chapter_comments_player_idx
  on public.chapter_comments (player_id);

create index if not exists chapter_events_season_idx
  on public.chapter_events (season_id);

create index if not exists character_relations_to_idx
  on public.character_relations (to_id);

create index if not exists character_shards_character_idx
  on public.character_shards (character_id);

create index if not exists comment_likes_player_idx
  on public.comment_likes (player_id);

create index if not exists comment_reports_reporter_idx
  on public.comment_reports (reporter_id);

create index if not exists craft_log_character_idx
  on public.craft_log (character_id);

create index if not exists idempotency_keys_player_idx
  on public.idempotency_keys (player_id);

create index if not exists leagues_owner_idx
  on public.leagues (owner_id);

create index if not exists market_cancellations_listing_idx
  on public.market_cancellations (listing_id);

create index if not exists market_transactions_listing_idx
  on public.market_transactions (listing_id);

create index if not exists market_transactions_seller_idx
  on public.market_transactions (seller_id);

create index if not exists market_watchlist_character_idx
  on public.market_watchlist (character_id);

create index if not exists payment_events_intent_idx
  on public.payment_events (intent_id);
