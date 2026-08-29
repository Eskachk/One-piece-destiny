-- 0019 — Connexion par fournisseur externe (Google).
--
-- Table séparée plutôt que des colonnes sur `user_accounts` : un compte peut
-- avoir plusieurs identités (mot de passe + Google), et le jour où un second
-- fournisseur arrive, rien à changer.
create table if not exists oauth_identities (
  provider     text        not null,
  -- Identifiant stable chez le fournisseur (`sub` chez Google). Ce n'est
  -- **pas** l'adresse e-mail : celle-ci peut changer, `sub` non.
  subject      text        not null,
  user_id      uuid        not null references user_accounts(id) on delete cascade,
  email        text        not null,
  linked_at    timestamptz not null default now(),
  last_used_at timestamptz,
  primary key (provider, subject)
);

create unique index if not exists oauth_identities_user_provider_idx
  on oauth_identities (user_id, provider);

alter table oauth_identities enable row level security;

-- `password_hash` devient facultatif : un compte créé par Google n'a pas de
-- mot de passe. Il peut en définir un plus tard par « mot de passe oublié ».
alter table user_accounts alter column password_hash drop not null;
