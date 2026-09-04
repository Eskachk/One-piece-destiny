-- 0028 — Les fragments deviennent une réserve unique.
--
-- ## Le défaut : la fabrication n'a jamais pu s'exécuter
--
-- `character_shards` est indexée `(player_id, character_id)`, et n'est
-- créditée **que sur un doublon** — donc uniquement pour un personnage que le
-- joueur possède déjà. `evaluateCraft`, lui, refuse toute fabrication d'un
-- personnage possédé (`ALREADY_OWNED`).
--
-- Les deux conditions s'excluent : pour avoir des fragments de X il faut
-- posséder X, et pour fabriquer X il faut ne pas le posséder. La barre de
-- progression affichée sous chaque personnage « Recherché » lit
-- `shards.get(character.id) ?? 0` — elle valait **zéro pour tout le monde,
-- pour toujours**, sans qu'aucune erreur ne le signale.
--
-- Deux articles du cahier tombaient avec elle : le §28 (« un doublon ne doit
-- jamais être inutile » — les fragments s'accumulaient sans dépense possible)
-- et le §29 (la fabrication elle-même).
--
-- ## Pourquoi une réserve unique plutôt qu'une réserve par rareté
--
-- Une réserve par rareté paraissait plus rigoureuse — un Légendaire se paie en
-- doublons de Légendaire. La simulation la condamne : sur 260 coffres, soit
-- cinq ans d'un joueur gratuit, on accumule 10 350 fragments de Rare et
-- **800 de Légendaire** — pour un coût de 3 000 — et **zéro de Mythique**.
-- Les paliers où l'on veut viser un personnage précis (§22) seraient restés
-- exactement aussi morts qu'avant, et seuls les Communs auraient été
-- fabricables.
--
-- Une réserve unique fait ce que le §28 promet : **tout** doublon sert, quelle
-- que soit sa rareté, et l'on choisit ce qu'on en fait.
--
-- ## Aucun fragment n'est perdu
--
-- La réserve est initialisée avec la somme de ce que chaque joueur avait
-- accumulé. `character_shards` n'est ni vidée ni supprimée : elle reste comme
-- trace de provenance, et un retour arrière resterait possible.

alter table player_progress
  add column if not exists shards integer not null default 0
  check (shards >= 0);

-- Report des fragments existants dans la réserve.
--
-- `on conflict` plutôt qu'un `update` : un joueur peut avoir des fragments
-- sans ligne de progression, s'il n'a jamais ouvert de coffre par le chemin
-- qui la crée.
insert into player_progress (player_id, shards)
select cs.player_id, sum(cs.shards)
from character_shards cs
group by cs.player_id
on conflict (player_id) do update
  set shards = player_progress.shards + excluded.shards;

/*
 * Crédit de la réserve.
 *
 * Une fonction, et pas un `upsert` depuis l'application : un `upsert` **écrit**
 * une valeur, il ne l'incrémente pas. Il aurait fallu lire le solde puis
 * l'écrire, et deux coffres ouverts en même temps se seraient écrasés — le
 * joueur perdrait les fragments du premier sans que rien ne le signale.
 *
 * L'écriture de la progression et le crédit restent deux instructions, mais
 * chacune est atomique et elles ne portent pas sur les mêmes colonnes.
 */
create or replace function grant_shards(p_player uuid, p_amount integer)
returns integer
language plpgsql
as $$
declare
  v_total integer;
begin
  insert into player_progress (player_id, shards)
  values (p_player, p_amount)
  on conflict (player_id) do update
    set shards = player_progress.shards + p_amount,
        updated_at = now()
  returning shards into v_total;

  return v_total;
end;
$$;

/*
 * Débit atomique de la réserve.
 *
 * Le débit et la lecture doivent tenir dans **une seule instruction** : lire
 * le solde puis l'écrire laisse deux fabrications simultanées lire la même
 * valeur et dépenser chacune la totalité. La clause `where shards >= p_cost`
 * fait le contrôle et le débit d'un bloc — si elle ne trouve pas de ligne,
 * c'est que le solde était insuffisant, et rien n'a bougé.
 *
 * Renvoie le solde restant, ou `null` si le débit n'a pas eu lieu.
 */
create or replace function spend_shards(p_player uuid, p_cost integer)
returns integer
language plpgsql
as $$
declare
  v_restant integer;
begin
  update player_progress
     set shards = shards - p_cost,
         updated_at = now()
   where player_id = p_player
     and shards >= p_cost
  returning shards into v_restant;

  return v_restant;
end;
$$;
