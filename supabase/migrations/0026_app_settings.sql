-- 0026 — Réglages d'exploitation, modifiables sans redéployer.
--
-- ## Le problème
--
-- L'ancrage du calendrier de parution — « le chapitre N a été jugé le
-- dimanche D » — vivait dans une constante du code (`domain/chapter/schedule.ts`).
-- Tout le calcul du numéro de la semaine en découle.
--
-- Conséquence : quand la réalité s'écarte de l'ancrage — une pause non
-- annoncée, une renumérotation, ou simplement un ancrage saisi de travers — la
-- seule correction possible était **une modification du code et un
-- redéploiement**. Un dimanche soir, pendant que les joueurs attendent.
--
-- La source externe ne peut pas servir de garde-fou : api-onepiece.com est
-- figée au chapitre 1085 (voir `STALE_SOURCE_GAP`). Personne ne rattrape donc
-- l'erreur automatiquement.
--
-- ## La forme
--
-- Une table clé-valeur plutôt qu'une colonne par réglage. Ces valeurs sont peu
-- nombreuses, hétérogènes et rares : une table par réglage serait absurde, et
-- une table à colonnes fixes demanderait une migration à chaque nouveau
-- réglage — soit exactement le problème qu'on résout.
--
-- `jsonb` parce qu'un ancrage est une paire (numéro, date) et non une chaîne.
--
-- ## Accès
--
-- Aucune policy : la table est fermée comme les autres (voir 0003_rls.sql).
-- Seule la clé de service y accède, c'est-à-dire le code serveur, derrière
-- `requireAdmin()`.

create table if not exists app_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references players(id)
);

comment on table app_settings is
  'Réglages d''exploitation modifiables sans redéploiement. Lecture serveur uniquement.';

comment on column app_settings.updated_by is
  'Administrateur ayant posé la valeur. Une correction de calendrier doit être imputable.';

alter table app_settings enable row level security;
revoke all on app_settings from anon, authenticated;
