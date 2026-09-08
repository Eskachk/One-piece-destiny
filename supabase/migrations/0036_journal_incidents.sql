-- Journal des incidents.
--
-- ## Ce qui manquait
--
-- L'application journalise proprement — trente-huit points de trace préfixés
-- `[shop]`, `[email]`, `[auth]` — mais uniquement vers `console`. Sur Vercel,
-- ces lignes vivent une heure environ, sans recherche ni alerte. Autrement
-- dit : une panne du dimanche soir était invisible le lundi matin, et
-- personne n'aurait rien su avant qu'un joueur n'écrive.
--
-- Cette table est la mémoire qui manquait. Elle ne remplace pas un service
-- d'observation dédié — Sentry reste la marche suivante, avec ses alertes et
-- ses regroupements — mais elle donne dès maintenant la rétention, la
-- recherche et un écran d'administration.
--
-- ## Ce qu'elle ne contient jamais
--
-- Ni mot de passe, ni jeton, ni adresse électronique. Le message d'erreur est
-- tronqué et l'appelant est responsable de ce qu'il y met : un journal
-- d'incidents qui devient une fuite de données est pire que pas de journal.

create table if not exists public.error_log (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  -- D'où vient l'incident : 'rendu', 'action:coffre', 'job:hebdo'…
  scope       text not null,
  message     text not null,
  -- Le condensat que Next affiche au joueur. C'est le pont entre « code de
  -- l'incident » lu à l'écran et la ligne exacte du journal.
  digest      text,
  -- Contexte non nominatif : chemin, navigateur, identifiant de joueur.
  metadata    jsonb not null default '{}'::jsonb,
  player_id   uuid references public.players(id) on delete set null
);

alter table public.error_log enable row level security;

create index if not exists error_log_at_idx on public.error_log (at desc);
create index if not exists error_log_scope_idx on public.error_log (scope, at desc);
create index if not exists error_log_player_idx on public.error_log (player_id);

/*
 * Purge automatique.
 *
 * Trente jours suffisent à comprendre un incident, et une table qui grossit
 * sans fin finit par coûter plus cher que ce qu'elle apprend. La purge est
 * appelée par la tâche quotidienne, pas par un déclencheur : une écriture
 * d'incident ne doit jamais payer le ménage.
 */
create or replace function public.purge_error_log()
returns integer
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_supprimes integer;
begin
  delete from error_log where at < now() - interval '30 days';
  get diagnostics v_supprimes = row_count;
  return v_supprimes;
end;
$$;

revoke execute on function public.purge_error_log() from public, anon, authenticated;
