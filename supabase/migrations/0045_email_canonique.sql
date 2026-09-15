/*
 * Une boîte, un compte : forme canonique de l'adresse e-mail (§43, §71).
 *
 * L'unicité des comptes se jugeait sur l'adresse en minuscules. Une seule
 * boîte Gmail répond pourtant à `luffy+1@gmail.com`, `luffy+2@gmail.com`,
 * `l.u.f.f.y@gmail.com`… Chaque variante ouvrait un compte, recevait son lien
 * de confirmation, et comptait donc pour une « adresse confirmée » de plus,
 * c'est-à-dire pour une personne de plus aux yeux du parrainage et du
 * Marché.
 *
 * La colonne est **générée** : elle suit l'adresse sans qu'aucun code
 * applicatif n'ait à y penser, et l'index unique dessus refuse la deuxième
 * variante à l'insertion. La règle est la même que `canonicalEmail` côté
 * application (src/domain/auth/email.ts) : casse, étiquette « +… », et pour
 * Gmail seulement les points et le domaine googlemail.
 *
 * L'adresse saisie reste celle qu'on affiche, à laquelle on écrit, et avec
 * laquelle on se connecte.
 */

create or replace function public.email_canonique(p_email text)
returns text
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select case
    when e !~ '^.+@[^@]*$' then e
    when d in ('gmail.com', 'googlemail.com') then replace(l, '.', '') || '@gmail.com'
    else l || '@' || d
  end
  from (
    select e,
           -- Partie locale sans son étiquette « +… » (seulement si quelque
           -- chose la précède : « +bizarre » reste tel quel).
           regexp_replace(regexp_replace(e, '@[^@]*$', ''), '^([^+]+)\+.*$', '\1') as l,
           substring(e from '@([^@]*)$') as d
    from (select lower(btrim(p_email)) as e) brut
  ) parts;
$$;

alter table public.user_accounts
  add column if not exists email_canonical text
  generated always as (public.email_canonique(email)) stored;

-- Unique : la seconde variante d'une même boîte est refusée à l'insertion, et
-- l'application traduit ce refus par son message habituel, qui ne dit pas
-- quelle adresse existe déjà.
create unique index if not exists user_accounts_email_canonical_key
  on public.user_accounts (email_canonical);
