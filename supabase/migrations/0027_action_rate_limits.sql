-- 0027 — Limitation de cadence des actions serveur.
--
-- `domain/auth/rate-limit.ts` protège la connexion et la réinitialisation de
-- mot de passe. C'est du bon travail, et il ne servait qu'à ça : rien ne
-- limitait la **cadence** d'un client par ailleurs légitime — création de
-- compte, ouverture de coffre, dépôt d'annonce au Marché.
--
-- Le moteur anti-abus existe et repère les schémas suspects, mais après coup :
-- c'est une détection, pas un frein. Une boucle qui reste sous ses seuils
-- passait.
--
-- ## Pourquoi en base, et pas en mémoire
--
-- Une fenêtre en mémoire ne limite rien sur Vercel : chaque requête peut être
-- servie par une instance différente, et un compteur par instance se remet à
-- zéro à chaque montée en charge — c'est-à-dire précisément quand l'abus se
-- produit. Le compteur doit être partagé, donc en base.
--
-- ## Pourquoi une fonction, et pas un select puis un update
--
-- Lire le compteur puis l'écrire laisse une fenêtre entre les deux : deux
-- requêtes simultanées lisent la même valeur et l'incrémentent chacune de un.
-- La limite se contourne alors en tirant en parallèle — exactement ce que fait
-- un script. `insert … on conflict do update … returning` est **une seule
-- instruction** : le verrou de ligne de Postgres sérialise les concurrents, et
-- le compte renvoyé est celui d'après l'incrément.

create table if not exists action_rate_limits (
  -- « action:portée » — par exemple `register:ip:203.0.113.4` ou
  -- `chest:player:<uuid>`. La portée fait partie de la clé : c'est ce qui
  -- permet de limiter par joueur et par adresse avec la même table.
  bucket        text        primary key,
  window_start  timestamptz not null default now(),
  hits          integer     not null default 0
);

-- Pour la purge des fenêtres périmées, seule lecture qui balaie la table.
create index if not exists action_rate_limits_window_idx
  on action_rate_limits (window_start);

/*
 * Consomme un jeton et dit si l'appelant peut continuer.
 *
 * Fenêtre **fixe** et non glissante : elle se réinitialise d'un bloc quand la
 * précédente est expirée. Une fenêtre glissante serait plus juste aux bords,
 * au prix d'une ligne par tentative — soit la table de journal qu'on veut
 * justement éviter ici, puisqu'elle est écrite à chaque action de chaque
 * joueur.
 *
 * Renvoie toujours une ligne, y compris en cas de refus : l'appelant a besoin
 * de `retry_at` pour dire au joueur **quand** réessayer. « Trop de tentatives »
 * sans échéance est un message qui ne sert à rien.
 */
create or replace function consume_rate_limit(
  p_bucket  text,
  p_limit   integer,
  p_window_seconds integer
)
returns table (allowed boolean, remaining integer, retry_at timestamptz)
language plpgsql
as $$
declare
  v_start timestamptz;
  v_hits  integer;
  v_expiree boolean;
begin
  insert into action_rate_limits as a (bucket, window_start, hits)
  values (p_bucket, now(), 1)
  on conflict (bucket) do update
    set
      window_start = case
        when a.window_start < now() - make_interval(secs => p_window_seconds)
          then now()
        else a.window_start
      end,
      hits = case
        when a.window_start < now() - make_interval(secs => p_window_seconds)
          then 1
        else a.hits + 1
      end
  returning a.window_start, a.hits into v_start, v_hits;

  return query
    select
      v_hits <= p_limit,
      greatest(p_limit - v_hits, 0),
      v_start + make_interval(secs => p_window_seconds);
end;
$$;

/*
 * Purge des fenêtres périmées.
 *
 * Sans elle, la table garde une ligne par joueur et par action pour toujours.
 * Appelée par le travail quotidien ; le délai d'un jour est très au-delà de la
 * plus longue fenêtre configurée (une heure).
 */
create or replace function purge_rate_limits()
returns integer
language plpgsql
as $$
declare
  v_supprimees integer;
begin
  delete from action_rate_limits where window_start < now() - interval '1 day';
  get diagnostics v_supprimees = row_count;
  return v_supprimees;
end;
$$;

-- Même régime que les autres tables de contrôle : le serveur seul y touche.
alter table action_rate_limits enable row level security;
revoke all on action_rate_limits from anon, authenticated;
