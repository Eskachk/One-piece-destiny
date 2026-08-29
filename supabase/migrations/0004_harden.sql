-- Durcissement remonté par le linter Supabase.

-- 1. `array_is_distinct` est appelée depuis une contrainte CHECK sur `teams`.
-- Avec un search_path mutable, un rôle pourrait interposer ses propres
-- `cardinality` ou `unnest` et fausser la validation d'un équipage.
-- On fige le chemin de résolution sur pg_catalog.
create or replace function array_is_distinct(arr text[])
  returns boolean
  language sql
  immutable
  returns null on null input
  set search_path = pg_catalog
as $$
  select cardinality(arr) = (select count(distinct e) from unnest(arr) as e);
$$;

-- 2. `citext` ne doit pas vivre dans le schéma public : une extension y est
-- exposée aux rôles applicatifs. Les colonnes déjà typées `citext`
-- conservent leur type, seule la résolution du nom change.
create schema if not exists extensions;
alter extension citext set schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;
