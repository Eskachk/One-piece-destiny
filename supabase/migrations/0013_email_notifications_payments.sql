-- 0013 — Envoi d'e-mails, préférences de notification, âge, paiements (préparés).
--
-- Aucun paiement réel n'est activé par cette migration : les tables existent
-- pour que le webhook soit vérifiable, idempotent et journalisé le jour où
-- l'audit juridique (§122) le permettra.

-- ---------------------------------------------------------------------------
-- File d'envoi des e-mails.
--
-- Postgres plutôt que Redis : le projet n'a pas de worker permanent, et la
-- base est déjà transactionnelle. `dedupe_key` porte l'idempotence — un même
-- événement rejoué ne produit pas un second message.
-- ---------------------------------------------------------------------------
create table if not exists email_outbox (
  id            uuid primary key default gen_random_uuid(),
  recipient     text        not null,
  subject       text        not null,
  html          text        not null,
  body_text     text        not null,
  dedupe_key    text        not null unique,
  status        text        not null default 'PENDING'
                  check (status in ('PENDING','SENT','FAILED','DEAD')),
  attempts      integer     not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error    text,
  provider_id   text,
  created_at    timestamptz not null default now(),
  sent_at       timestamptz
);

-- Le worker ne lit que ce qui est dû : index partiel plutôt que balayage.
create index if not exists email_outbox_due_idx
  on email_outbox (next_attempt_at)
  where status = 'PENDING';

alter table email_outbox enable row level security;
-- Aucune policy : seul le service_role (serveur) y accède. RLS refuse le reste.

-- ---------------------------------------------------------------------------
-- Préférences de notification.
--
-- Les alertes de sécurité n'ont volontairement pas de colonne : elles ne sont
-- pas désactivables, et offrir l'interrupteur reviendrait à promettre qu'on
-- peut les couper.
-- ---------------------------------------------------------------------------
create table if not exists notification_preferences (
  player_id       uuid primary key references players(id) on delete cascade,
  weekly_email    boolean not null default true,
  rewards_email   boolean not null default true,
  -- Prospection : désactivée par défaut, le consentement ne se présume pas.
  marketing_email boolean not null default false,
  weekly_in_app   boolean not null default true,
  rewards_in_app  boolean not null default true,
  updated_at      timestamptz not null default now()
);

alter table notification_preferences enable row level security;

-- ---------------------------------------------------------------------------
-- Âge déclaré (§114).
--
-- Déclaratif, pas vérifié : le cahier ne prévoit aucune vérification
-- d'identité. La colonne permet d'appliquer des restrictions, elle ne prouve
-- rien.
-- ---------------------------------------------------------------------------
alter table user_accounts add column if not exists birth_date date;
alter table user_accounts add column if not exists parental_consent_at timestamptz;

-- ---------------------------------------------------------------------------
-- Paiements — PRÉPARÉS, NON ACTIFS.
-- ---------------------------------------------------------------------------
create table if not exists payment_intents (
  id             uuid primary key default gen_random_uuid(),
  player_id      uuid        not null references players(id) on delete cascade,
  product_id     text        not null,
  amount_cents   integer     not null check (amount_cents > 0),
  currency       text        not null default 'EUR',
  status         text        not null default 'CREATED'
                   check (status in ('CREATED','PAID','FAILED','CANCELLED')),
  provider       text        not null,
  provider_ref   text,
  created_at     timestamptz not null default now(),
  settled_at     timestamptz
);

create index if not exists payment_intents_player_idx
  on payment_intents (player_id, created_at desc);

-- Idempotence des webhooks : la clé primaire est l'identifiant d'événement du
-- prestataire. Un même événement rejoué échoue à l'insertion, donc n'accorde
-- rien une seconde fois. C'est la protection contre le replay.
create table if not exists payment_events (
  event_id     text        primary key,
  provider     text        not null,
  intent_id    uuid        references payment_intents(id) on delete set null,
  verdict      text        not null,
  received_at  timestamptz not null default now()
);

alter table payment_intents enable row level security;
alter table payment_events  enable row level security;

