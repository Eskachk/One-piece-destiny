-- Journal d'audit (§100) et détection de comptes liés (§43)

-- Le cahier §100 liste l'IP parmi les champs du journal.
alter table audit_log
  add column ip text;

-- Empreinte d'inscription, pour la détection de comptes liés du §43.
--
-- ⚠️ Deux comptes derrière la même IP ne sont PAS forcément liés : foyer,
-- université, opérateur mobile. Ce signal ne sert qu'à refuser une
-- transaction suspecte, jamais à sanctionner un compte.
alter table user_accounts
  add column signup_ip text;

create index user_accounts_signup_ip_idx
  on user_accounts (signup_ip)
  where signup_ip is not null;
