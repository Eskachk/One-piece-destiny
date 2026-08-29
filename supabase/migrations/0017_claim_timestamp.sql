-- 0017 — Horodatage de la réservation d'un e-mail.
--
-- Le filet anti-blocage testait `next_attempt_at`, qui est par construction
-- dans le passé au moment de la réservation : toute ligne réservée aurait été
-- remise en file au passage suivant, y compris pendant son envoi. Il faut
-- dater la réservation elle-même.
alter table email_outbox add column if not exists claimed_at timestamptz;

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
