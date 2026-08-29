-- Double authentification administrateur (cahier §86)

alter table user_accounts
  -- Secret TOTP en base32. Renseigné dès l'inscription à la MFA, mais
  -- `mfa_enabled` ne bascule qu'après un premier code vérifié : on ne veut
  -- pas verrouiller un compte sur un secret mal recopié.
  add column mfa_secret text,
  add column mfa_enabled boolean not null default false,
  -- Dernier pas de temps consommé : interdit le rejeu d'un code intercepté
  -- pendant les 30 secondes où il resterait sinon valide.
  add column mfa_last_step bigint,
  add column mfa_activated_at timestamptz;

-- Codes de secours : indispensables, sinon un téléphone perdu ferme
-- définitivement l'accès au Chapter HQ.
create table mfa_recovery_codes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references user_accounts(id) on delete cascade,
  -- Haché comme un mot de passe : la base ne contient jamais le code en clair.
  code_hash  text not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create index mfa_recovery_codes_user_idx on mfa_recovery_codes (user_id);

-- Une session issue du mot de passe seul est « en attente » : elle permet de
-- saisir le second facteur, rien d'autre. Elle n'authentifie personne.
alter table sessions
  add column mfa_pending boolean not null default false;

-- Refus par défaut, cohérent avec 0003_rls.sql.
alter table mfa_recovery_codes enable row level security;
revoke all on mfa_recovery_codes from anon, authenticated;
