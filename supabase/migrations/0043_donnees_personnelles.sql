/*
 * Données personnelles : moins en garder, moins longtemps.
 *
 * Trois choses, dans l'ordre où elles protègent :
 *
 *   1. Les adresses IP écrites en clair jusqu'ici sont **effacées**. À partir
 *      de cette version l'application n'écrit plus que des empreintes à clé
 *      (`h:…`, voir `src/lib/privacy/empreinte.ts`), et ces empreintes ne se
 *      calculent pas en SQL — la clé vit dans l'environnement, pas en base.
 *      On ne peut donc pas convertir l'ancien ; on le retire. Ce qui est perdu
 *      tient en quelques signaux anti-abus sur une dizaine de comptes ; ce qui
 *      est gagné, c'est qu'aucune adresse réelle ne subsiste nulle part.
 *
 *   2. Les courriers déjà envoyés perdent leur texte. Un lien de
 *      réinitialisation ou de confirmation y figure avec son jeton **en
 *      clair** ; l'application ne le garde plus après envoi, et le passé
 *      s'aligne.
 *
 *   3. Une purge quotidienne, `purger_donnees_personnelles`, borne la durée de
 *      vie de tout ce qui n'a de valeur que sur le moment : tentatives de
 *      connexion, sessions échues, jetons périmés, empreintes du journal
 *      d'audit, événements de parcours. Le journal d'audit lui-même reste —
 *      c'est la trace des actions — mais son empreinte d'origine s'efface à
 *      trois mois, parce qu'à trois mois elle n'explique plus rien.
 *
 * Les fenêtres sont larges par rapport à ce que le code regarde (quinze
 * minutes pour les tentatives, quatorze jours pour les signaux économiques,
 * sept jours pour la durée absolue d'une session) : on garde de quoi
 * comprendre un incident après coup, pas de quoi profiler quelqu'un.
 */

-- 1. Adresses en clair : effacées.
update public.user_accounts set signup_ip = null
 where signup_ip is not null and signup_ip not like 'h:%';
update public.login_attempts set ip = null
 where ip is not null and ip not like 'h:%';
update public.sessions set ip = null
 where ip is not null and ip not like 'h:%';
update public.audit_log set ip = null
 where ip is not null and ip not like 'h:%';
update public.account_events set ip = null
 where ip is not null and ip not like 'h:%';
update public.password_reset_tokens set requested_ip = null
 where requested_ip is not null and requested_ip not like 'h:%';

-- 2. Courriers déjà partis (ou abandonnés) : le texte s'en va, la ligne reste.
update public.email_outbox set html = '', body_text = ''
 where status in ('SENT', 'DEAD') and (html <> '' or body_text <> '');

-- 3. Purge quotidienne.
create or replace function public.purger_donnees_personnelles()
returns jsonb
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  v_tentatives integer;
  v_sessions integer;
  v_jetons_reset integer;
  v_jetons_verif integer;
  v_courriers integer;
  v_evenements integer;
  v_audit integer;
  v_idempotence integer;
begin
  -- Tentatives de connexion : le verrou regarde quinze minutes, on garde
  -- quatre-vingt-dix jours pour reconstituer une attaque après coup.
  delete from login_attempts where at < now() - interval '90 days';
  get diagnostics v_tentatives = row_count;

  -- Sessions qui ne peuvent plus servir : révoquées, ou au-delà de la durée
  -- absolue de sept jours, ou inactives depuis bien plus que les deux heures
  -- de tolérance. Chaque ligne porte une empreinte et un navigateur.
  delete from sessions
   where revoked_at < now() - interval '1 day'
      or created_at < now() - interval '8 days'
      or last_seen_at < now() - interval '2 days';
  get diagnostics v_sessions = row_count;

  -- Jetons périmés : ils ne peuvent plus rien ouvrir, ils n'ont plus à
  -- associer une adresse à une empreinte.
  delete from password_reset_tokens where expires_at < now() - interval '7 days';
  get diagnostics v_jetons_reset = row_count;
  delete from email_verification_tokens where expires_at < now() - interval '7 days';
  get diagnostics v_jetons_verif = row_count;

  -- Courriers : le texte est déjà retiré à l'envoi ; la ligne (destinataire,
  -- sujet) s'efface à quatre-vingt-dix jours.
  delete from email_outbox
   where status in ('SENT', 'DEAD')
     and coalesce(sent_at, created_at) < now() - interval '90 days';
  get diagnostics v_courriers = row_count;

  -- Événements de parcours : les règles de vélocité regardent au plus
  -- quatorze jours ; six mois laissent de quoi juger une contestation.
  delete from account_events where at < now() - interval '180 days';
  get diagnostics v_evenements = row_count;

  -- Journal d'audit : la ligne reste, l'empreinte d'origine s'efface.
  update audit_log set ip = null
   where ip is not null and created_at < now() - interval '90 days';
  get diagnostics v_audit = row_count;

  -- Clés d'idempotence : une réponse rejouable n'a de sens que quelques jours.
  delete from idempotency_keys where created_at < now() - interval '7 days';
  get diagnostics v_idempotence = row_count;

  return jsonb_build_object(
    'tentatives', v_tentatives,
    'sessions', v_sessions,
    'jetons_reinitialisation', v_jetons_reset,
    'jetons_verification', v_jetons_verif,
    'courriers', v_courriers,
    'evenements', v_evenements,
    'empreintes_audit', v_audit,
    'idempotence', v_idempotence
  );
end;
$$;

revoke execute on function public.purger_donnees_personnelles() from public, anon, authenticated;
