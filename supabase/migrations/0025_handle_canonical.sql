-- 0025 — Forme canonique du pseudo, indexée et unique.
--
-- ## Le problème
--
-- Le contrôle « ce pseudo est-il déjà pris ? » comparait la forme *lue* du
-- pseudo — sans accents, sans ponctuation, sans casse — pour que `Sh_anks` ne
-- puisse pas se faire passer pour `Shanks` sur une annonce du Marché.
--
-- Faute de colonne, il fallait ramener des lignes puis comparer côté
-- application : un `ilike '%…%'` sur `players`, donc un balayage de table, à
-- **chaque inscription**. Sur une table de mille joueurs c'est invisible ; à
-- l'échelle visée, c'est un balayage par inscription, en concurrence avec tout
-- le reste.
--
-- Et il ne garantissait rien : deux inscriptions simultanées le passaient
-- toutes les deux, puis la contrainte `unique (handle)` les laissait passer
-- aussi — elle compare les octets, pas la lecture.
--
-- ## La solution
--
-- Une colonne générée, donc toujours d'accord avec `handle`, et un index
-- unique dessus. Le contrôle devient une recherche par égalité sur index, et
-- l'unicité devient une **garantie de la base** au lieu d'une intention de
-- l'application.
--
-- ## Pourquoi `translate` et pas `unaccent`
--
-- `unaccent()` est déclarée STABLE, pas IMMUTABLE : Postgres refuse de s'en
-- servir dans une colonne générée. `translate`, `lower` et `regexp_replace`
-- sont immutables. La table de translittération ci-dessous couvre le français
-- et les langues voisines — largement de quoi empêcher qu'« Océane » et
-- « Oceane » soient deux joueuses différentes.
--
-- ⚠️ Si des doublons canoniques existent déjà (comptes créés avant ce jour,
-- dont le pseudo était fabriqué à partir de l'adresse e-mail), la création de
-- l'index échouera en nommant les lignes fautives. C'est le comportement
-- voulu : mieux vaut une migration qui s'arrête et se laisse corriger à la
-- main qu'un index posé sur des données incohérentes.

alter table players
  add column if not exists handle_canonical text
  generated always as (
    regexp_replace(
      lower(
        translate(
          handle,
          'àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ',
          'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY'
        )
      ),
      '[._-]', '', 'g'
    )
  ) stored;

create unique index if not exists players_handle_canonical_key
  on players (handle_canonical);

comment on column players.handle_canonical is
  'Pseudo sous sa forme lue : sans accents, sans ponctuation, sans casse. '
  'Unique — c''est ce qui empêche Sh_anks de se faire passer pour Shanks.';
