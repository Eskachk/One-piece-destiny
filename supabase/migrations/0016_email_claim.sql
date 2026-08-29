-- 0016 / 0017 — Réservation atomique des messages à envoyer.
--
-- La vidange faisait un SELECT puis un UPDATE par ligne. Deux exécutions
-- concurrentes — ce que Vercel annonce explicitement comme possible pour ses
-- crons — sélectionnaient le même lot et envoyaient deux fois le même
-- message. La `dedupe_key` ne protège pas de ce cas : elle empêche deux
-- *mises en file*, pas deux *envois* de la même ligne.

alter table email_outbox drop constraint if exists email_outbox_status_check;
alter table email_outbox add constraint email_outbox_status_check
  check (status in ('PENDING','CLAIMED','SENT','FAILED','DEAD'));

alter table email_outbox add column if not exists claimed_at timestamptz;

-- `for update skip locked` : le second appel ignore les lignes déjà réservées
-- au lieu de les attendre. Les deux progressent, sur des lots disjoints.
create or replace function claim_emails(p_batch integer default 25)
returns table (
  id uuid, recipient text, subject text, html text, body_text text, attempts integer
)
language plpgsql
security definer
as $$
begin
  return query
  with pris as (
    select e.id from email_outbox e
     where e.status = 'PENDING' and e.next_attempt_at <= now()
     order by e.next_attempt_at limit p_batch
     for update skip locked
  )
  update email_outbox o
     set status = 'CLAIMED', claimed_at = now()
    from pris where o.id = pris.id
  returning o.id, o.recipient, o.subject, o.html, o.body_text, o.attempts;
end;
$$;

-- Filet : un message réservé puis abandonné (fonction interrompue en plein
-- vol) repart au bout du délai. Le test porte sur la date de réservation, pas
-- sur `next_attempt_at` qui est par construction dans le passé.
create or replace function requeue_stale_claims(p_older_than interval default '10 minutes')
returns integer
language plpgsql
security definer
as $$
declare v_rows integer;
begin
  update email_outbox
     set status = 'PENDING', claimed_at = null
   where status = 'CLAIMED'
     and claimed_at is not null
     and claimed_at < now() - p_older_than;
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;
