-- Réinitialisation de mot de passe (cahier §86)

create table password_reset_tokens (
  -- Empreinte SHA-256 du jeton, jamais le jeton : un jeton de
  -- réinitialisation est un mot de passe temporaire, une fuite de la table
  -- ne doit donner aucun accès.
  token_hash   text primary key,
  user_id      uuid not null references user_accounts(id) on delete cascade,
  -- Adresse demandée, conservée même si aucun compte ne correspond : c'est
  -- ce qui permet de limiter les demandes sans révéler qui a un compte.
  email        extensions.citext not null,
  requested_ip text,
  expires_at   timestamptz not null,
  used_at      timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);

create index password_reset_tokens_user_idx  on password_reset_tokens (user_id);
create index password_reset_tokens_email_idx on password_reset_tokens (email, created_at desc);
create index password_reset_tokens_ip_idx    on password_reset_tokens (requested_ip, created_at desc);

alter table password_reset_tokens enable row level security;
revoke all on password_reset_tokens from anon, authenticated;
