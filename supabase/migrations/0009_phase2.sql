-- Phase 2 — rétention (cahier §16, §18, §19, §20, §64)

create type division as enum
  ('EAST_BLUE', 'GRAND_LINE', 'NEW_WORLD', 'YONKO', 'PIRATE_KING');

create table seasons (
  id               text primary key,
  name             text not null,
  chapters         integer not null check (chapters > 0),
  -- §20 : seuls les meilleurs résultats comptent, pour qu'une absence ne
  -- ruine pas une saison entière.
  counted_results  integer not null check (counted_results > 0),
  started_at       timestamptz not null default now(),
  ended_at         timestamptz,
  constraint counted_within_chapters check (counted_results <= chapters)
);

insert into seasons (id, name, chapters, counted_results)
values ('season-01', 'Season 01', 26, 20);

alter table chapter_events
  add column season_id text references seasons(id);

-- Division et séries de promotion / relégation (§19).
alter table player_progress
  add column division           division not null default 'EAST_BLUE',
  add column promotion_streak   integer not null default 0 check (promotion_streak >= 0),
  add column relegation_streak  integer not null default 0 check (relegation_streak >= 0);

-- Profil hebdomadaire, base de la détection de style (§16) et de
-- l'historique des prédictions.
create table weekly_profiles (
  player_id         uuid not null references players(id) on delete cascade,
  chapter_id        uuid not null references chapter_events(id) on delete cascade,
  risk              numeric(5,2) not null,
  synergy_share     numeric(5,4) not null,
  average_pick_rate numeric(5,4) not null,
  total             integer not null,
  percentile        numeric(5,1),
  recorded_at       timestamptz not null default now(),
  primary key (player_id, chapter_id)
);

create index weekly_profiles_player_idx on weekly_profiles (player_id, recorded_at desc);

create table chapter_awards (
  chapter_id uuid not null references chapter_events(id) on delete cascade,
  award      text not null,
  player_id  uuid not null references players(id) on delete cascade,
  value      numeric(10,2) not null,
  primary key (chapter_id, award)
);

-- Analyse post-chapitre figée à la publication (§64, §77).
create table chapter_analysis (
  chapter_id uuid primary key references chapter_events(id) on delete cascade,
  payload    jsonb not null,
  created_at timestamptz not null default now()
);

alter table seasons          enable row level security;
alter table weekly_profiles  enable row level security;
alter table chapter_awards   enable row level security;
alter table chapter_analysis enable row level security;

revoke all on weekly_profiles  from anon, authenticated;
revoke all on chapter_awards   from anon, authenticated;
revoke all on chapter_analysis from anon, authenticated;
revoke all on seasons          from anon, authenticated;

-- Le calendrier des saisons est public, comme celui des chapitres.
grant select on seasons to anon, authenticated;
create policy "Calendrier des saisons lisible publiquement"
  on seasons for select
  to anon, authenticated
  using (true);
