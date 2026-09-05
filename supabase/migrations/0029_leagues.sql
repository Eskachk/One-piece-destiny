-- 0029 — Ligues privées.
--
-- Le classement mondial affiche cinquante lignes. À douze joueurs tout le
-- monde y figure ; à mille, le joueur médian est quatre-centième et le
-- classement cesse de le concerner. Les divisions adoucissent la chute mais
-- restent une progression solitaire : on y monte seul, contre un percentile.
--
-- Une ligue **filtre** un classement déjà calculé. Elle ne distribue ni
-- Berries, ni coffres, ni avantage (§48, §72) — sans quoi il suffirait d'en
-- créer une de deux pour y finir premier chaque semaine. Conséquence directe
-- sur le schéma : **aucune écriture au moment de la publication**, aucune
-- ligne de plus par joueur et par semaine. Deux tables et rien d'autre.

create table if not exists leagues (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  -- Six caractères sans voyelle ni caractère ambigu. Il se dit à voix haute
  -- et n'a pas à résister à une attaque : rejoindre une ligue ne donne accès
  -- à rien d'autre qu'un classement de pseudonymes déjà publics.
  code        text        not null unique,
  owner_id    uuid        not null references players(id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint league_name_length check (char_length(name) between 3 and 30)
);

create table if not exists league_members (
  league_id  uuid        not null references leagues(id) on delete cascade,
  player_id  uuid        not null references players(id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (league_id, player_id)
);

-- « Mes ligues » part du joueur : sans cet index, la lecture balaie une table
-- qui grandit avec le produit, à chaque affichage du classement.
create index if not exists league_members_player_idx
  on league_members (player_id);

-- Le code est la seule façon d'entrer : la recherche par code doit être une
-- lecture sur index, pas un balayage. `unique` en pose déjà un ; on s'appuie
-- dessus plutôt que d'en créer un second.

/*
 * Adhésion atomique.
 *
 * Trois vérifications et une insertion. Les séparer laisserait deux joueurs
 * franchir ensemble la cinquantième place, ou un même joueur dépasser son
 * quota en ouvrant deux onglets — le contrôle serait passé deux fois avant
 * que l'une des insertions n'ait lieu.
 *
 * Renvoie un code de refus, ou `NULL` si l'adhésion a eu lieu. Pas une
 * exception : un refus est un cas normal du produit, pas un incident.
 */
create or replace function join_league(p_player uuid, p_code text)
returns text
language plpgsql
as $$
declare
  v_league uuid;
  v_membres integer;
  v_ligues integer;
begin
  /*
   * `for update` sur **la ligue**, pas sur le compte de ses membres.
   *
   * La première version verrouillait les lignes comptées :
   *
   *     select count(*) into v_membres from league_members ... for update;
   *
   * Postgres le refuse — « FOR UPDATE is not allowed with aggregate
   * functions » — et la fonction levait à **chaque** adhésion. Le sondage en
   * base l'a montré avant le premier joueur ; aucun test d'application ne
   * l'aurait vu, puisque le dépôt en mémoire n'exécute pas ce SQL.
   *
   * Verrouiller la ligne de la ligue produit le même effet et davantage :
   * deux adhésions simultanées à la même ligue se sérialisent ici, avant même
   * de compter. Deux adhésions à des ligues différentes ne s'attendent pas.
   */
  select id into v_league from leagues where code = p_code for update;
  if v_league is null then
    return 'CODE_INCONNU';
  end if;

  if exists (
    select 1 from league_members
     where league_id = v_league and player_id = p_player
  ) then
    return 'DEJA_MEMBRE';
  end if;

  -- Le verrou est déjà pris sur la ligue : ce comptage est sérialisé.
  select count(*) into v_membres
    from league_members where league_id = v_league;
  if v_membres >= 50 then
    return 'LIGUE_PLEINE';
  end if;

  select count(*) into v_ligues
    from league_members where player_id = p_player;
  if v_ligues >= 5 then
    return 'TROP_DE_LIGUES';
  end if;

  insert into league_members (league_id, player_id)
  values (v_league, p_player);

  return null;
end;
$$;

-- Même régime que le reste : le serveur seul y touche (§89).
alter table leagues        enable row level security;
alter table league_members enable row level security;
revoke all on leagues        from anon, authenticated;
revoke all on league_members from anon, authenticated;
