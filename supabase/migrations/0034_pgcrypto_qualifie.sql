-- Réparer une régression introduite par la migration 0031.
--
-- ## Ce qui s'est passé
--
-- 0031 a figé `search_path = pg_catalog, public` sur **toutes** les fonctions,
-- pour fermer l'escalade classique d'une fonction `SECURITY DEFINER` dont la
-- résolution de noms dépend de l'appelant. La mesure est juste.
--
-- Ce qu'elle n'a pas vu : `gen_random_bytes` n'est pas dans `public`. Sur
-- Supabase, pgcrypto est installé dans le schéma **`extensions`**, absent du
-- chemin figé. `mint_card` — appelée pour chaque carte neuve de chaque coffre
-- — a donc cessé de fonctionner à l'instant même où on la durcissait.
--
-- ## Ce que ça a coûté
--
-- Dix cartes, sur quatre coffres, ont été créées **sans frappe** : ni code
-- unique, ni numéro d'émission, ni maillon dans la chaîne de propriété. Elles
-- sont bien dans l'inventaire — le joueur ne s'est aperçu de rien — mais elles
-- n'ont pas d'identité, donc ni Marché ni traçabilité. La migration les répare
-- plus bas.
--
-- L'appel JavaScript à `mint_card` ne vérifiait pas son erreur : c'est ce qui a
-- rendu la panne silencieuse. Corrigé côté application dans le même lot.
--
-- ## La correction
--
-- **Qualifier explicitement le schéma**, plutôt qu'ajouter `extensions` au
-- chemin. C'est exactement ce qu'un `search_path` figé cherche à obtenir : un
-- nom qui ne dépend de rien. Ajouter un schéma de plus au chemin rouvrirait la
-- question à la prochaine fonction qu'on y déplacerait.

create or replace function public.mint_card(p_inventory_id uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_character text;
  v_number    integer;
  v_code      text;
begin
  select character_id into v_character from inventory where id = p_inventory_id;
  if v_character is null then
    return null;
  end if;

  insert into character_mint_counters (character_id, minted)
  values (v_character, 1)
  on conflict (character_id) do update
    set minted = character_mint_counters.minted + 1
  returning minted into v_number;

  -- Code lisible et non devinable : le hasard vient du serveur, jamais du
  -- client. Douze caractères hexadécimaux en trois groupes.
  v_code := 'GLW-' || upper(
    substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 4) || '-' ||
    substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 4) || '-' ||
    substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 4)
  );

  update inventory
     set serial_code = v_code, mint_number = v_number
   where id = p_inventory_id;

  return v_code;
end;
$$;

revoke execute on function public.mint_card(uuid) from public, anon, authenticated;
