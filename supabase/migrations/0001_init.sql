-- One Piece Quest — schéma initial (Phase 0 / MVP)
--
-- Principes appliqués :
--   §4.1  le chapitre est une entité unique, source de vérité
--   §4.3  chapter_number UNIQUE
--   §8    on stocke les faits bruts, jamais le score seul
--   §77   snapshot immuable à la publication
--   §78   scoring_version et data_version figées par chapitre
--   §83   historique des équipes avant verrouillage
--   §92   idempotence via client_request_id
--   §93   wallet versionné contre la concurrence
--   §99   le client n'est jamais source de vérité

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Référentiel
-- ---------------------------------------------------------------------------

create type rarity as enum ('COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC');
create type presence_expectation as enum ('LOW', 'MEDIUM', 'HIGH');
create type relation_kind as enum
  ('CREW', 'ALLIANCE', 'FACTION', 'RIVALRY', 'MENTOR', 'FAMILY');

create table characters (
  id            text primary key,
  name          text not null,
  rarity        rarity not null,
  affiliations  text[] not null default '{}',
  abilities     text[] not null default '{}',
  -- Estimation éditoriale révisée chaque semaine, jamais un spoiler.
  presence_expectation presence_expectation not null,
  created_at    timestamptz not null default now()
);

create table character_relations (
  from_id  text not null references characters(id) on delete cascade,
  to_id    text not null references characters(id) on delete cascade,
  kind     relation_kind not null,
  primary key (from_id, to_id, kind),
  constraint no_self_relation check (from_id <> to_id)
);

-- ---------------------------------------------------------------------------
-- Chapitres
-- ---------------------------------------------------------------------------

create type chapter_status as enum
  ('NORMAL', 'HIATUS', 'DELAYED', 'CANCELLED', 'PUBLISHED', 'RESULTS_PUBLISHED');

create table chapter_events (
  id                    uuid primary key default gen_random_uuid(),
  -- §4.3 : un même chapitre ne peut jamais être créé deux fois.
  chapter_number        integer not null unique,
  status                chapter_status not null default 'NORMAL',
  -- Toutes les dates critiques sont en UTC (§2.2).
  team_lock_at          timestamptz not null,
  official_release_at   timestamptz,
  results_published_at  timestamptz,
  -- §78 : figées à la création, jamais réécrites rétroactivement.
  scoring_version       text not null,
  data_version          text not null,
  created_at            timestamptz not null default now(),
  validated_at          timestamptz,
  constraint results_require_publication
    check (results_published_at is null or official_release_at is not null)
);

create index chapter_events_status_idx on chapter_events (status);

-- Faits bruts validés humainement avant publication (§5.2, §8).
create table chapter_appearances (
  chapter_id    uuid not null references chapter_events(id) on delete cascade,
  character_id  text not null references characters(id),
  appearances   integer not null check (appearances >= 0),
  -- Traçabilité de la validation : jamais de correction silencieuse (§79).
  validated_by  uuid,
  validated_at  timestamptz,
  primary key (chapter_id, character_id)
);

-- ---------------------------------------------------------------------------
-- Joueurs, équipes, verrouillage
-- ---------------------------------------------------------------------------

create table players (
  id          uuid primary key default gen_random_uuid(),
  handle      text not null unique,
  created_at  timestamptz not null default now()
);

-- Postgres interdit les sous-requêtes dans une contrainte CHECK : on passe
-- par une fonction immuable pour vérifier l'unicité des personnages.
create function array_is_distinct(arr text[])
  returns boolean
  language sql
  immutable
  returns null on null input
as $$
  select cardinality(arr) = (select count(distinct e) from unnest(arr) as e);
$$;

-- Équipe courante : exactement 3 personnages (§2.1).
create table teams (
  id            uuid primary key default gen_random_uuid(),
  player_id     uuid not null references players(id) on delete cascade,
  chapter_id    uuid not null references chapter_events(id) on delete cascade,
  character_ids text[] not null,
  locked_at     timestamptz,
  updated_at    timestamptz not null default now(),
  unique (player_id, chapter_id),
  constraint exactly_three_characters
    check (array_length(character_ids, 1) = 3),
  constraint no_duplicate_characters
    check (array_is_distinct(character_ids))
);

-- §83 : historique complet avant verrouillage, pour arbitrer les litiges.
create table team_snapshots (
  id            bigserial primary key,
  team_id       uuid not null references teams(id) on delete cascade,
  character_ids text[] not null,
  taken_at      timestamptz not null default now(),
  is_final      boolean not null default false
);

create index team_snapshots_team_idx on team_snapshots (team_id, taken_at desc);

-- ---------------------------------------------------------------------------
-- Résultats — calculés par un worker, jamais à la volée (§75)
-- ---------------------------------------------------------------------------

create table team_scores (
  team_id         uuid primary key references teams(id) on delete cascade,
  chapter_id      uuid not null references chapter_events(id) on delete cascade,
  base_total      integer not null,
  synergy_total   integer not null,
  risk_total      integer not null,
  total           integer not null,
  -- Détail par personnage, pour le replay de performance (§65).
  breakdown       jsonb not null,
  -- §78 : la version ayant réellement produit ce score.
  scoring_version text not null,
  computed_at     timestamptz not null default now()
);

create index team_scores_ranking_idx on team_scores (chapter_id, total desc);

-- ---------------------------------------------------------------------------
-- Économie
-- ---------------------------------------------------------------------------

create table wallets (
  player_id  uuid primary key references players(id) on delete cascade,
  berries    bigint not null default 0 check (berries >= 0),
  -- §93 : verrou optimiste contre les dépenses concurrentes.
  version    bigint not null default 0
);

create table inventory (
  id            uuid primary key default gen_random_uuid(),
  player_id     uuid not null references players(id) on delete cascade,
  character_id  text not null references characters(id),
  -- §46 : provenance conservée, sans blockchain ni NFT.
  obtained_from text not null,
  obtained_at   timestamptz not null default now()
);

create index inventory_player_idx on inventory (player_id);

create table character_shards (
  player_id     uuid not null references players(id) on delete cascade,
  character_id  text not null references characters(id),
  shards        integer not null default 0 check (shards >= 0),
  primary key (player_id, character_id)
);

-- §92 : toute action sensible est idempotente.
create table idempotency_keys (
  client_request_id text primary key,
  player_id         uuid not null references players(id) on delete cascade,
  action            text not null,
  response          jsonb,
  created_at        timestamptz not null default now()
);

-- §100 : journal structuré, sans données sensibles.
create table audit_log (
  id          bigserial primary key,
  player_id   uuid,
  action      text not null,
  status      text not null,
  request_id  text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index audit_log_created_idx on audit_log (created_at desc);
