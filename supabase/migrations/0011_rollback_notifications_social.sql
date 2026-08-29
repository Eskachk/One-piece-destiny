-- Rollback (§79), notifications (§108), social (§70, §71)

-- ---------------------------------------------------------------------------
-- Corrections de chapitre (cahier §79)
--
-- « Aucune correction silencieuse. » Chaque correction conserve l'état
-- antérieur, sa raison et son auteur : un joueur doit pouvoir savoir pourquoi
-- son score a changé.
-- ---------------------------------------------------------------------------
create table chapter_corrections (
  id                    uuid primary key default gen_random_uuid(),
  chapter_id            uuid not null references chapter_events(id) on delete cascade,
  reason                text not null check (length(trim(reason)) >= 10),
  previous_appearances  jsonb not null,
  previous_results      jsonb not null,
  applied_by            uuid not null references user_accounts(id),
  applied_at            timestamptz not null default now()
);

create index chapter_corrections_chapter_idx
  on chapter_corrections (chapter_id, applied_at desc);

-- ---------------------------------------------------------------------------
-- Notifications (cahier §108)
--
-- En base et consultées dans l'application. Aucun envoi externe : sans
-- fournisseur de push ni d'e-mail, une notification promise mais jamais
-- délivrée serait pire que pas de notification du tout.
-- ---------------------------------------------------------------------------
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  player_id  uuid not null references players(id) on delete cascade,
  kind       text not null,
  title      text not null,
  body       text,
  href       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_player_idx
  on notifications (player_id, created_at desc);

-- Déduplication (§92) : republier un chapitre ne notifie pas deux fois.
create table notification_keys (
  dedupe_key text primary key,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Commentaires (cahier §70) — rattachés à un chapitre, pas de chat global (§119)
-- ---------------------------------------------------------------------------
create table chapter_comments (
  id         uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapter_events(id) on delete cascade,
  player_id  uuid not null references players(id) on delete cascade,
  body       text not null check (length(trim(body)) between 1 and 2000),
  -- Suppression logique : un fil ne perd pas son contexte.
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index chapter_comments_chapter_idx
  on chapter_comments (chapter_id, created_at desc);

create table comment_likes (
  comment_id uuid not null references chapter_comments(id) on delete cascade,
  player_id  uuid not null references players(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, player_id)
);

create table comment_reports (
  id          uuid primary key default gen_random_uuid(),
  comment_id  uuid not null references chapter_comments(id) on delete cascade,
  reporter_id uuid not null references players(id) on delete cascade,
  reason      text,
  created_at  timestamptz not null default now(),
  unique (comment_id, reporter_id)
);

-- ---------------------------------------------------------------------------
-- Parrainage (cahier §71) — volontairement minimal
-- ---------------------------------------------------------------------------
alter table players
  add column referral_code text unique;

create table referrals (
  referred_id uuid primary key references players(id) on delete cascade,
  referrer_id uuid not null references players(id) on delete cascade,
  rewarded_at timestamptz,
  created_at  timestamptz not null default now(),
  constraint no_self_referral check (referrer_id <> referred_id)
);

create index referrals_referrer_idx on referrals (referrer_id);

alter table chapter_corrections enable row level security;
alter table notifications       enable row level security;
alter table notification_keys   enable row level security;
alter table chapter_comments    enable row level security;
alter table comment_likes       enable row level security;
alter table comment_reports     enable row level security;
alter table referrals           enable row level security;

revoke all on chapter_corrections from anon, authenticated;
revoke all on notifications       from anon, authenticated;
revoke all on notification_keys   from anon, authenticated;
revoke all on chapter_comments    from anon, authenticated;
revoke all on comment_likes       from anon, authenticated;
revoke all on comment_reports     from anon, authenticated;
revoke all on referrals           from anon, authenticated;
