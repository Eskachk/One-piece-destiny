-- Collection et coffres (cahier §26 à §33)

create table player_progress (
  player_id                uuid primary key references players(id) on delete cascade,
  -- Coffres ouverts depuis le dernier légendaire (§31). La règle est
  -- publique : elle doit être annoncée avant l'ouverture.
  pity_counter             integer not null default 0 check (pity_counter >= 0),
  starter_chest_opened_at  timestamptz,
  updated_at               timestamptz not null default now()
);

create table chest_openings (
  id                uuid primary key default gen_random_uuid(),
  player_id         uuid not null references players(id) on delete cascade,
  kind              text not null,
  -- Contenu figé du coffre : ce qui a été réellement tiré, pour pouvoir
  -- arbitrer une réclamation sans rejouer le hasard (§79).
  cards             jsonb not null,
  pity_triggered    boolean not null default false,
  -- §92 : deux envois du même formulaire ne doivent pas ouvrir deux coffres.
  client_request_id text unique,
  opened_at         timestamptz not null default now()
);

create index chest_openings_player_idx on chest_openings (player_id, opened_at desc);

-- Un même personnage ne peut être possédé qu'une fois : les exemplaires
-- supplémentaires deviennent des fragments (§28), pas des lignes en double.
create unique index inventory_player_character_idx
  on inventory (player_id, character_id);

alter table player_progress enable row level security;
alter table chest_openings  enable row level security;
revoke all on player_progress from anon, authenticated;
revoke all on chest_openings  from anon, authenticated;
