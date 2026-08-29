-- 0020 — Index utiles à l'échelle.
--
-- Le diagnostic Supabase signale dix-huit clés étrangères sans index. On n'en
-- couvre que trois : celles dont la requête grandit avec le nombre de joueurs.
-- Les autres portent sur des tables de journal, lues rarement et par petits
-- volumes — un index y coûterait à chaque écriture sans jamais servir.

-- `listTeams(chapterId)` lit **tous** les équipages du chapitre à la
-- publication. Sans index, c'est un balayage d'une table qui grossit d'une
-- ligne par joueur et par semaine.
create index if not exists teams_chapter_idx on teams (chapter_id);

-- Historique hebdomadaire réécrit pour chaque joueur à la publication.
create index if not exists weekly_profiles_chapter_idx
  on weekly_profiles (chapter_id);

-- Le classement lit les apparitions du chapitre ; la jointure part du
-- personnage.
create index if not exists chapter_appearances_character_idx
  on chapter_appearances (character_id);
