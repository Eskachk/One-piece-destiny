-- 0021 — Anti-abus comportemental (cahier §43, §97, §100).
--
-- Le produit possédait déjà : `audit_log`, `user_accounts.signup_ip`,
-- `market_transactions`, `market_cancellations`, et les règles pures de
-- `domain/market/anti-manipulation.ts`. Cette migration ne les remplace pas —
-- elle ajoute ce qui leur manquait pour raisonner sur un **ensemble de
-- comptes** plutôt que sur une transaction isolée.
--
-- Principe directeur : on enregistre des faits, jamais des verdicts. Un
-- verdict se recalcule ; un fait perdu ne revient pas.

-- ---------------------------------------------------------------------------
-- Journal d'événements de compte
-- ---------------------------------------------------------------------------
-- Séparé d'`audit_log`, qui trace les actions sensibles pour l'exploitation.
-- Ici on trace le **parcours** d'un joueur : quand il s'inscrit, quand il
-- ouvre son premier coffre, quand il vend pour la première fois. C'est
-- l'écart entre ces instants qui distingue un joueur d'un compte fabriqué.
create table if not exists account_events (
  id         uuid primary key default gen_random_uuid(),
  player_id  uuid not null references players(id) on delete cascade,
  kind       text not null,
  at         timestamptz not null default now(),
  -- Contexte technique minimal (§34 : minimisation). Pas d'empreinte
  -- d'appareil, pas de géolocalisation, pas de tentative d'identification.
  ip         text,
  metadata   jsonb
);

create index if not exists account_events_player_idx
  on account_events (player_id, at desc);
create index if not exists account_events_kind_idx
  on account_events (kind, at desc);
-- Sert au comptage de vélocité par contexte technique.
create index if not exists account_events_ip_idx
  on account_events (ip, at desc) where ip is not null;

-- ---------------------------------------------------------------------------
-- Provenance des cartes
-- ---------------------------------------------------------------------------
-- `inventory` portait déjà `serial_code` et `mint_number` (0018). Il lui
-- manquait l'origine et l'historique : sans eux, impossible de distinguer une
-- carte gagnée d'une carte reçue d'un compte secondaire.
alter table inventory add column if not exists source text;
alter table inventory add column if not exists acquired_at timestamptz default now();
-- Verrou temporaire des cartes du coffre d'inscription. `null` = libre.
alter table inventory add column if not exists tradable_from timestamptz;

create index if not exists inventory_source_idx on inventory (source);
create index if not exists inventory_tradable_idx
  on inventory (tradable_from) where tradable_from is not null;

-- Chaîne de propriété d'un exemplaire, par code de série.
--
-- Le code de série survit au changement de propriétaire ; la ligne
-- d'inventaire, non. On indexe donc sur le code, pas sur l'identifiant de
-- ligne — sinon l'historique se romprait à chaque vente.
create table if not exists card_ownership (
  id           uuid primary key default gen_random_uuid(),
  serial_code  text not null,
  character_id text not null references characters(id) on delete cascade,
  player_id    uuid not null references players(id) on delete cascade,
  source       text not null,
  at           timestamptz not null default now()
);

create index if not exists card_ownership_serial_idx on card_ownership (serial_code, at);
create index if not exists card_ownership_player_idx on card_ownership (player_id, at desc);

-- ---------------------------------------------------------------------------
-- Évaluations de risque
-- ---------------------------------------------------------------------------
-- Une ligne par évaluation, jamais écrasée. L'historique est ce qui permet à
-- un administrateur de voir qu'un compte a été blanchi puis re-signalé.
create table if not exists risk_assessments (
  id           uuid primary key default gen_random_uuid(),
  player_id    uuid not null references players(id) on delete cascade,
  score        integer not null,
  level        text not null,
  -- Les signaux qui ont produit le score. Sans eux, un score est une
  -- accusation sans motif — inutilisable pour décider quoi que ce soit.
  signals      jsonb not null default '[]'::jsonb,
  at           timestamptz not null default now(),
  reviewed_at  timestamptz,
  reviewed_by  uuid references user_accounts(id) on delete set null,
  -- Décision d'un humain. Conservée : elle sert à mesurer les faux positifs.
  verdict      text
);

create index if not exists risk_assessments_player_idx on risk_assessments (player_id, at desc);
create index if not exists risk_assessments_level_idx on risk_assessments (level, at desc)
  where reviewed_at is null;

-- ---------------------------------------------------------------------------
-- Restrictions économiques
-- ---------------------------------------------------------------------------
-- Volontairement **économiques et temporaires**. Le cahier §43 et le cadrage
-- anti-abus sont d'accord : on limite le Market, on ne touche ni au score, ni
-- aux cartes, ni à la possibilité de jouer la semaine.
create table if not exists account_restrictions (
  player_id  uuid primary key references players(id) on delete cascade,
  level      text not null,
  reason     text,
  until      timestamptz,
  set_at     timestamptz not null default now(),
  set_by     uuid references user_accounts(id) on delete set null
);

create index if not exists account_restrictions_until_idx
  on account_restrictions (until) where until is not null;

-- ---------------------------------------------------------------------------
-- RLS : aucune policy, donc refus par défaut
-- ---------------------------------------------------------------------------
-- Seul le serveur (clé service_role) y accède. Un joueur ne doit jamais
-- pouvoir lire son propre score de risque : il en déduirait les règles.
alter table account_events      enable row level security;
alter table card_ownership      enable row level security;
alter table risk_assessments    enable row level security;
alter table account_restrictions enable row level security;

revoke all on account_events       from anon, authenticated;
revoke all on card_ownership       from anon, authenticated;
revoke all on risk_assessments     from anon, authenticated;
revoke all on account_restrictions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Comptage de comptes par contexte technique
-- ---------------------------------------------------------------------------
-- Une fonction plutôt qu'une requête applicative : elle évite de rapatrier
-- des adresses IP dans le serveur applicatif pour les recompter.
--
-- ⚠️ Le résultat n'est **pas** une preuve de fraude. Un foyer, une résidence
-- étudiante ou un opérateur mobile produisent la même valeur. Ce nombre n'est
-- qu'un signal parmi d'autres (§5 du cadrage : same IP != fraud).
create or replace function accounts_sharing_signup_ip(p_player_id uuid)
returns integer
language sql
stable
security definer
as $$
  select count(*)::integer
    from user_accounts a
   where a.signup_ip is not null
     and a.signup_ip = (
       select b.signup_ip from user_accounts b where b.player_id = p_player_id
     );
$$;
