-- Row Level Security (cahier §89, §90)
--
-- Modèle retenu : REFUS PAR DÉFAUT.
--
-- L'application accède à la base avec la clé `service_role`, qui contourne
-- RLS par conception. Ces policies ne protègent donc pas le serveur de
-- lui-même : elles ferment l'accès direct via la clé `anon`, publiable et
-- donc à considérer comme connue de tous.
--
-- Aucune policy ne s'appuie sur `auth.uid()` : l'authentification du produit
-- est maison (table `user_accounts`, sessions serveur), pas Supabase Auth.
-- `auth.uid()` serait toujours NULL — une policy qui s'y réfère donnerait une
-- illusion de cloisonnement par joueur. Le cloisonnement réel est appliqué
-- côté serveur par `requireSession()` / `requireAdmin()`.

-- ---------------------------------------------------------------------------
-- 1. RLS activé partout. Sans policy, une table est inaccessible à anon.
-- ---------------------------------------------------------------------------

alter table characters            enable row level security;
alter table character_relations   enable row level security;
alter table chapter_events        enable row level security;
alter table chapter_appearances   enable row level security;
alter table players               enable row level security;
alter table teams                 enable row level security;
alter table team_snapshots        enable row level security;
alter table team_scores           enable row level security;
alter table wallets               enable row level security;
alter table inventory             enable row level security;
alter table character_shards      enable row level security;
alter table idempotency_keys      enable row level security;
alter table audit_log             enable row level security;
alter table user_accounts         enable row level security;
alter table sessions              enable row level security;
alter table login_attempts        enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Lecture publique : uniquement le référentiel, jamais un résultat.
--
-- `chapter_appearances` et `team_scores` restent fermés : les exposer
-- viderait de son sens l'anti-spoiler du §3, puisqu'on pourrait lire les
-- apparitions avant la publication officielle.
-- ---------------------------------------------------------------------------

create policy "Référentiel personnages lisible publiquement"
  on characters for select
  to anon, authenticated
  using (true);

create policy "Relations narratives lisibles publiquement"
  on character_relations for select
  to anon, authenticated
  using (true);

-- Numéro, statut et échéance alimentent le compte à rebours public.
-- Aucune apparition ni score n'est exposé par cette table.
create policy "Calendrier des chapitres lisible publiquement"
  on chapter_events for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 3. Défense en profondeur : retirer aussi les privilèges de table.
--
-- RLS filtre les lignes, les GRANT décident de l'accès à la table. Supabase
-- accorde par défaut tous les droits à anon et authenticated sur le schéma
-- public : on les retire là où aucun accès direct n'a de raison d'exister.
-- Deux verrous valent mieux qu'un si une policy est ajoutée par erreur.
-- ---------------------------------------------------------------------------

revoke all on chapter_appearances from anon, authenticated;
revoke all on players             from anon, authenticated;
revoke all on teams               from anon, authenticated;
revoke all on team_snapshots      from anon, authenticated;
revoke all on team_scores         from anon, authenticated;
revoke all on wallets             from anon, authenticated;
revoke all on inventory           from anon, authenticated;
revoke all on character_shards    from anon, authenticated;
revoke all on idempotency_keys    from anon, authenticated;
revoke all on audit_log           from anon, authenticated;
revoke all on user_accounts       from anon, authenticated;
revoke all on sessions            from anon, authenticated;
revoke all on login_attempts      from anon, authenticated;

-- Le référentiel reste lisible, mais en lecture seule.
revoke insert, update, delete on characters          from anon, authenticated;
revoke insert, update, delete on character_relations from anon, authenticated;
revoke insert, update, delete on chapter_events      from anon, authenticated;
