-- 0024 — Date du dernier changement de pseudo.
--
-- Le pseudo est désormais choisi par le joueur (il était fabriqué à partir de
-- son adresse e-mail) et modifiable dans les paramètres. Il est aussi son
-- identité publique sur le Marché et au classement.
--
-- Sans cette colonne, rien n'empêche d'en changer à volonté : un vendeur peut
-- conclure une vente douteuse puis se renommer, et les ventes récentes
-- désignent alors quelqu'un qui n'existe plus. Trente jours de délai laissent
-- le temps de corriger un choix qu'on regrette sans permettre d'effacer une
-- réputation.
--
-- `null` signifie « jamais changé » — donc le premier changement est libre,
-- ce qui est le bon comportement pour les comptes créés avant ce jour, dont le
-- pseudo avait été fabriqué sans qu'ils aient rien choisi.

alter table players
  add column if not exists handle_changed_at timestamptz;

comment on column players.handle_changed_at is
  'Dernier changement de pseudo. NULL = jamais changé, le prochain est libre.';
