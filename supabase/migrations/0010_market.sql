-- Grand Line Market (cahier §35 à §43)
--
-- Périmètre restreint au §45 : prix fixe et achat direct. Les enchères et
-- l'échange direct (§44) restent repoussés, comme le demande le §120.

create type listing_status as enum ('ACTIVE', 'SOLD', 'CANCELLED');

create table market_listings (
  id           uuid primary key default gen_random_uuid(),
  seller_id    uuid not null references players(id) on delete cascade,
  character_id text not null references characters(id),
  price        integer not null check (price > 0),
  status       listing_status not null default 'ACTIVE',
  listed_at    timestamptz not null default now(),
  closed_at    timestamptz,
  constraint closed_has_date
    check ((status = 'ACTIVE') = (closed_at is null))
);

create index market_listings_active_idx
  on market_listings (character_id, price)
  where status = 'ACTIVE';

create index market_listings_seller_idx on market_listings (seller_id, listed_at desc);

-- Une seule annonce active par personnage et par vendeur.
create unique index market_listings_one_active_per_character
  on market_listings (seller_id, character_id)
  where status = 'ACTIVE';

-- §43 : historique complet, jamais purgé.
create table market_transactions (
  id           uuid primary key default gen_random_uuid(),
  listing_id   uuid not null references market_listings(id),
  character_id text not null references characters(id),
  seller_id    uuid not null references players(id),
  buyer_id     uuid not null references players(id),
  price        integer not null check (price > 0),
  fee          integer not null check (fee >= 0),
  sold_at      timestamptz not null default now(),
  constraint no_self_trade check (seller_id <> buyer_id)
);

create index market_transactions_character_idx
  on market_transactions (character_id, sold_at desc);
create index market_transactions_pair_idx
  on market_transactions (buyer_id, seller_id, sold_at desc);

create table market_cancellations (
  id         bigserial primary key,
  player_id  uuid not null references players(id) on delete cascade,
  listing_id uuid not null references market_listings(id),
  at         timestamptz not null default now()
);

create index market_cancellations_player_idx on market_cancellations (player_id, at desc);

-- Provenance (§46) et délai de revente (§43).
alter table inventory
  add column acquired_from_market_at timestamptz;

create table market_watchlist (
  player_id    uuid not null references players(id) on delete cascade,
  character_id text not null references characters(id) on delete cascade,
  added_at     timestamptz not null default now(),
  primary key (player_id, character_id)
);

alter table market_listings      enable row level security;
alter table market_transactions  enable row level security;
alter table market_cancellations enable row level security;
alter table market_watchlist     enable row level security;

revoke all on market_listings      from anon, authenticated;
revoke all on market_transactions  from anon, authenticated;
revoke all on market_cancellations from anon, authenticated;
revoke all on market_watchlist     from anon, authenticated;

-- §93 appliqué au Market : achat atomique.
-- Débit acheteur, crédit vendeur, transfert de la carte et clôture de
-- l'annonce en une seule opération verrouillée. Deux acheteurs simultanés :
-- un seul aboutit, parce que la clôture est conditionnée au statut ACTIVE.
--
-- Les deux portefeuilles sont créés au besoin : sans cela, un vendeur n'ayant
-- jamais consulté le sien perdait son paiement en silence.
create or replace function purchase_listing(
  p_listing_id uuid,
  p_buyer_id   uuid,
  p_fee        integer
)
  returns uuid
  language plpgsql
  set search_path = pg_catalog, public
as $$
declare
  v_listing market_listings%rowtype;
  v_balance bigint;
  v_txn_id  uuid;
  v_paid    integer;
begin
  select * into v_listing
    from market_listings
   where id = p_listing_id and status = 'ACTIVE'
     for update;

  if not found then
    return null;
  end if;

  if v_listing.seller_id = p_buyer_id then
    return null;
  end if;

  insert into wallets (player_id) values (p_buyer_id)
    on conflict (player_id) do nothing;
  insert into wallets (player_id) values (v_listing.seller_id)
    on conflict (player_id) do nothing;

  select berries into v_balance
    from wallets where player_id = p_buyer_id for update;

  if v_balance < v_listing.price then
    return null;
  end if;

  update wallets
     set berries = berries - v_listing.price, version = version + 1
   where player_id = p_buyer_id;

  v_paid := v_listing.price - p_fee;

  update wallets
     set berries = berries + v_paid, version = version + 1
   where player_id = v_listing.seller_id;

  if not found then
    raise exception 'Credit du vendeur impossible (portefeuille introuvable)';
  end if;

  delete from inventory
   where player_id = v_listing.seller_id
     and character_id = v_listing.character_id;

  insert into inventory (player_id, character_id, obtained_from, acquired_from_market_at)
  values (p_buyer_id, v_listing.character_id, 'Grand Line Market', now())
  on conflict (player_id, character_id) do nothing;

  update market_listings
     set status = 'SOLD', closed_at = now()
   where id = p_listing_id;

  insert into market_transactions
    (listing_id, character_id, seller_id, buyer_id, price, fee)
  values
    (p_listing_id, v_listing.character_id, v_listing.seller_id, p_buyer_id,
     v_listing.price, p_fee)
  returning id into v_txn_id;

  return v_txn_id;
end;
$$;
