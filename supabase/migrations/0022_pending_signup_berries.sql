-- 0022 — Dotation d'arrivée mise en attente (anti-abus).
--
-- Les Berries d'inscription étaient créditées immédiatement. Créer un compte
-- produisait donc de la monnaie dépensable, ce qui est exactement le circuit
-- qu'une ferme exploite : cent comptes = cent dotations, sans jouer une seule
-- semaine.
--
-- Elles sont désormais **en attente** jusqu'à ce que le joueur verrouille un
-- premier équipage. La dotation ne disparaît pas — elle se mérite en une
-- action qu'un compte fabriqué ne fait pas.

alter table wallets add column if not exists pending_berries integer not null default 0;

alter table wallets
  drop constraint if exists wallets_pending_berries_positive;
alter table wallets
  add constraint wallets_pending_berries_positive check (pending_berries >= 0);

-- Libère la dotation en attente, une seule fois, et rend le montant.
--
-- `for update` verrouille la ligne : deux verrouillages d'équipage simultanés
-- se sérialisent, le second lit `pending_berries = 0` et rend 0. C'est ce qui
-- rend le double crédit impossible, et non une convention côté application.
--
-- Écrit en plpgsql plutôt qu'en SQL : `update … returning` rend les valeurs
-- NOUVELLES, or c'est l'ancienne qu'il faut annoncer à l'appelant.
create or replace function release_pending_berries(p_player_id uuid)
returns integer
language plpgsql
security definer
as $$
declare
  v_amount integer;
begin
  select pending_berries into v_amount
    from wallets
   where player_id = p_player_id
     for update;

  if v_amount is null or v_amount = 0 then
    return 0;
  end if;

  update wallets
     set berries = berries + v_amount,
         pending_berries = 0,
         version = version + 1
   where player_id = p_player_id;

  return v_amount;
end;
$$;
