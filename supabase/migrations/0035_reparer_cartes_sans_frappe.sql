-- Réparer les cartes créées pendant la panne de `mint_card`.
--
-- Entre les migrations 0031 et 0034, `mint_card` échouait silencieusement (voir
-- 0034). Dix cartes, sur quatre coffres, sont entrées dans l'inventaire **sans
-- frappe** : ni code unique, ni numéro d'émission, ni maillon dans la chaîne de
-- propriété. Elles appartiennent bien à leur joueur, mais ne pouvaient ni être
-- vendues au Marché, ni tracées.
--
-- On les frappe rétroactivement. Le numéro d'émission suit le compteur actuel :
-- il ne dit donc plus l'ordre d'apparition exact pour ces dix-là. C'est le seul
-- écart qu'on ne peut pas réparer — l'information n'a jamais été écrite — et il
-- vaut mieux qu'une carte sans identité.
--
-- La migration est **idempotente** : elle ne touche que les lignes encore sans
-- code, donc la rejouer ne frappe rien deux fois.

do $$
declare
  v_ligne record;
  v_code  text;
begin
  for v_ligne in
    select id, character_id, player_id, coalesce(source, 'CHEST') as source
      from inventory
     where serial_code is null
     order by obtained_at
  loop
    v_code := mint_card(v_ligne.id);

    if v_code is null then
      raise warning 'frappe impossible pour %', v_ligne.id;
      continue;
    end if;

    -- La chaîne de propriété était posée par l'application, jamais atteinte
    -- puisque la frappe échouait avant.
    insert into card_ownership (serial_code, character_id, player_id, source)
    values (v_code, v_ligne.character_id, v_ligne.player_id, v_ligne.source)
    on conflict do nothing;
  end loop;
end $$;
