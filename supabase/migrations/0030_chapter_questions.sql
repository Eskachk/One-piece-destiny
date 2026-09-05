-- 0030 — Pronostics secondaires.
--
-- Le jeu tient en une décision par semaine, prise en trente secondes le
-- dimanche. Entre la publication et le verrouillage suivant, rien n'appelle le
-- joueur à revenir. Une ou deux questions ouvertes toute la semaine donnent
-- une seconde raison de passer, et une seconde chose à discuter.
--
-- **Le bonus est en Berries, jamais en points** — §25, §48, §72, et la règle
-- déjà écrite dans `missions.ts` pour un cas identique. Conséquence sur le
-- schéma : rien ici ne touche `team_scores`, et le moteur de score ignore
-- l'existence de ces tables.

create table if not exists chapter_questions (
  id          uuid    primary key default gen_random_uuid(),
  chapter_id  uuid    not null references chapter_events(id) on delete cascade,
  prompt      text    not null,
  options     text[]  not null,
  /*
   * Index de la bonne réponse, `null` tant que le chapitre n'est pas publié.
   *
   * ⚠️ Cette colonne est un **spoiler** au même titre que les apparitions : la
   * lecture destinée au joueur la retire avant l'envoi, elle ne se contente
   * pas de ne pas l'afficher.
   */
  answer      integer,
  position    integer not null default 0,

  constraint question_prompt_length check (char_length(prompt) between 8 and 120),
  constraint question_options_count check (
    array_length(options, 1) between 2 and 4
  ),
  -- La réponse doit désigner un choix qui existe. Sans cette borne, une saisie
  -- à 9 rendrait la question impossible à gagner, sans erreur ni signal.
  constraint question_answer_in_range check (
    answer is null or (answer >= 0 and answer < array_length(options, 1))
  ),
  -- Trois questions au plus par chapitre : les positions 0, 1 et 2.
  constraint question_position_range check (position between 0 and 2),
  unique (chapter_id, position)
);

create table if not exists question_answers (
  question_id uuid        not null references chapter_questions(id) on delete cascade,
  player_id   uuid        not null references players(id) on delete cascade,
  choice      integer     not null check (choice >= 0),
  answered_at timestamptz not null default now(),
  primary key (question_id, player_id)
);

-- Le calcul du bonus part du chapitre et lit toutes les réponses d'un coup.
create index if not exists question_answers_player_idx
  on question_answers (player_id);

alter table chapter_questions enable row level security;
alter table question_answers  enable row level security;
revoke all on chapter_questions from anon, authenticated;
revoke all on question_answers  from anon, authenticated;
