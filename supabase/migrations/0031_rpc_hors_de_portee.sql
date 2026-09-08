-- Les fonctions ne sont plus appelables depuis l'API publique.
--
-- ## Ce qui était ouvert
--
-- Supabase expose chaque fonction de `public` en point d'entrée REST
-- (`/rest/v1/rpc/<nom>`), et accorde par défaut `EXECUTE` à `anon` et
-- `authenticated`. Seize fonctions étaient dans ce cas, dont huit en
-- `SECURITY DEFINER` — qui s'exécutent avec les droits du propriétaire et
-- traversent donc RLS sans le voir.
--
-- Parmi elles, `grant_purchase_v2` crédite Berries, coffres, coffres royaux et
-- personnages. Qui pouvait l'appeler pouvait se donner l'économie entière du
-- jeu, sans compte, sans achat et sans trace côté application.
--
-- ## Pourquoi ce n'était pas encore exploité
--
-- L'appel demande la clé anonyme du projet, et celle-ci n'est nulle part dans
-- le paquet envoyé au navigateur : le serveur seul parle à Supabase, avec la
-- clé de service. Une clé anonyme n'est pourtant **pas un secret** — sa raison
-- d'être est d'être publiée. Le jour où une fonctionnalité côté client en
-- aurait besoin, les huit portes se seraient ouvertes d'un coup, et rien dans
-- le code n'aurait signalé le rapport entre les deux gestes.
--
-- C'est ce qui rend le correctif urgent bien qu'aucun abus ne soit constaté :
-- on ne répare pas une porte parce qu'on a vu quelqu'un entrer.
--
-- ## Ce que ça ne casse pas
--
-- `service_role` garde un privilège explicite (`service_role=X/postgres`), et
-- c'est la clé que le serveur utilise. Révoquer `anon`, `authenticated` et
-- `PUBLIC` ne le touche pas.

do $$
declare
  fonction record;
begin
  for fonction in
    select p.oid,
           p.proname,
           pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
  loop
    /*
     * `PUBLIC` en plus des deux rôles : le privilège par défaut de Postgres
     * sur une fonction est `=X/postgres`, c'est-à-dire « tout le monde ». Ne
     * révoquer que `anon` et `authenticated` laisserait ce `=X` en place, et
     * la porte grande ouverte pour tout rôle créé plus tard.
     */
    execute format(
      'revoke execute on function public.%I(%s) from public, anon, authenticated',
      fonction.proname, fonction.args
    );

    /*
     * `search_path` figé.
     *
     * Sans lui, la résolution des noms dans une fonction `SECURITY DEFINER`
     * dépend du `search_path` de l'appelant. Un rôle qui peut créer un schéma
     * y place sa propre `now()` ou son propre `wallets`, l'insère devant, et
     * la fonction — qui tourne avec les droits du propriétaire — exécute son
     * code à lui. C'est l'escalade classique, et elle ne coûte qu'une ligne à
     * fermer.
     *
     * `pg_catalog` d'abord, comme les deux fonctions déjà durcies du projet
     * (`spend_berries`, `purchase_listing`) : les types et opérateurs de base
     * se résolvent alors avant tout schéma applicatif.
     */
    execute format(
      'alter function public.%I(%s) set search_path = pg_catalog, public',
      fonction.proname, fonction.args
    );
  end loop;
end
$$;

/*
 * Les privilèges par défaut, pour les fonctions à venir.
 *
 * Sans cette ligne, la prochaine fonction créée dans `public` naîtrait de
 * nouveau exposée, et il faudrait se souvenir de la refermer. Une règle qu'il
 * faut se rappeler d'appliquer est une règle qui finit par manquer.
 */
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
