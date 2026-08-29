-- 0015 — Vérification d'adresse e-mail (§86) et alertes de prix (§41).

alter table user_accounts add column if not exists email_verified_at timestamptz;

-- Seule l'empreinte du jeton est stockée : une fuite de la base ne doit pas
-- permettre de valider des adresses.
create table if not exists email_verification_tokens (
  token_hash  text        primary key,
  user_id     uuid        not null references user_accounts(id) on delete cascade,
  email       text        not null,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists email_verification_user_idx
  on email_verification_tokens (user_id) where used_at is null;

alter table email_verification_tokens enable row level security;

-- La watchlist existait sans seuil : il n'y avait donc rien à déclencher.
alter table market_watchlist add column if not exists alert_below integer;
alter table market_watchlist add column if not exists alerted_at timestamptz;
