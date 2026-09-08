-- Les statistiques de la liste de surveillance, sans attendre la liste.
--
-- ## La vague qu'on supprime
--
-- La page du Marché enchaînait trois attentes :
--
--   1. la session ;
--   2. annonces, portefeuille, inventaire, **liste de surveillance**, ventes ;
--   3. prix les plus bas et historiques de vente — pour les personnages de la
--      liste, donc après l'avoir lue.
--
-- Un aller-retour vers Supabase coûte de 80 à 130 ms depuis la plateforme. La
-- troisième vague ajoutait donc un dixième de seconde pour une raison purement
-- mécanique : les deux requêtes filtraient sur `character_id in (…)`, et cette
-- liste venait de la vague précédente.
--
-- Un sous-select fait le même filtre **en base**. Les deux lectures ne
-- dépendent plus que de l'identifiant du joueur, connu dès la première vague :
-- elles rejoignent la deuxième, et la troisième disparaît.
--
-- ## Un défaut corrigé au passage
--
-- `lowestAsks` rapatriait toutes les annonces actives triées par prix et
-- gardait la première de chaque personnage. C'était juste **tant que le
-- résultat n'était pas tronqué** : au-delà de mille annonces moins chères, un
-- personnage disparaissait de la liste des prix. `min()` en base ne connaît
-- pas ce problème, et ne transporte qu'une ligne par personnage au lieu de
-- toutes.
--
-- ## Le calcul reste dans le domaine
--
-- Ces fonctions ne calculent **aucune statistique** : elles filtrent et
-- agrègent le minimum, rien de plus. La moyenne, la variation hebdomadaire et
-- les seuils restent dans `domain/market`, où ils sont testés. Une règle
-- métier écrite deux fois finit par diverger, et c'est toujours la copie SQL
-- qu'on oublie.

create or replace function public.lowest_asks_for_watchlist(p_player uuid)
returns table (character_id text, price integer)
language sql
stable
set search_path = pg_catalog, public
as $$
  select l.character_id, min(l.price)::integer
    from market_listings l
   where l.status = 'ACTIVE'
     and l.character_id in (
       select w.character_id from market_watchlist w where w.player_id = p_player
     )
   group by l.character_id;
$$;

create or replace function public.sales_for_watchlist(p_player uuid)
returns table (character_id text, price integer, sold_at timestamptz)
language sql
stable
set search_path = pg_catalog, public
as $$
  select t.character_id, t.price, t.sold_at
    from market_transactions t
   where t.character_id in (
     select w.character_id from market_watchlist w where w.player_id = p_player
   )
   order by t.sold_at desc
   limit 500;
$$;

revoke execute on function public.lowest_asks_for_watchlist(uuid)
  from public, anon, authenticated;
revoke execute on function public.sales_for_watchlist(uuid)
  from public, anon, authenticated;
