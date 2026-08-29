-- Coffres récurrents et fabrication (cahier §29, §36, §72)

alter table player_progress
  add column unopened_chests integer not null default 0
    check (unopened_chests >= 0);

-- Récompenses hebdomadaires, une ligne par joueur et par chapitre.
-- La clé primaire composite rend l'attribution idempotente (§92) : republier
-- un chapitre ne distribue pas deux fois les Berries.
create table weekly_rewards (
  player_id  uuid not null references players(id) on delete cascade,
  chapter_id uuid not null references chapter_events(id) on delete cascade,
  berries    integer not null check (berries >= 0),
  chests     integer not null check (chests >= 0),
  percentile numeric(5,1),
  granted_at timestamptz not null default now(),
  primary key (player_id, chapter_id)
);

create index weekly_rewards_chapter_idx on weekly_rewards (chapter_id);

create table craft_log (
  id           uuid primary key default gen_random_uuid(),
  player_id    uuid not null references players(id) on delete cascade,
  character_id text not null references characters(id),
  shards_spent integer not null check (shards_spent > 0),
  crafted_at   timestamptz not null default now()
);

create index craft_log_player_idx on craft_log (player_id, crafted_at desc);

alter table weekly_rewards enable row level security;
alter table craft_log      enable row level security;
revoke all on weekly_rewards from anon, authenticated;
revoke all on craft_log      from anon, authenticated;

-- §93 : dépense atomique de Berries avec verrou optimiste.
-- Lecture et écriture en une seule opération : deux requêtes concurrentes ne
-- peuvent pas dépenser le même solde.
create or replace function spend_berries(
  p_player_id uuid,
  p_amount    integer,
  p_expected_version bigint
)
  returns bigint
  language plpgsql
  set search_path = pg_catalog, public
as $$
declare
  new_version bigint;
begin
  if p_amount < 0 then
    raise exception 'Montant negatif';
  end if;

  update wallets
     set berries = berries - p_amount,
         version = version + 1
   where player_id = p_player_id
     and version   = p_expected_version
     and berries  >= p_amount
  returning version into new_version;

  return new_version;
end;
$$;
