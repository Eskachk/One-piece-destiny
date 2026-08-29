import type { PresenceExpectation, RelationKind } from './types';

/**
 * Libellés destinés au joueur.
 *
 * Les identifiants du domaine restent en anglais — ils sont stables et servent
 * de clés. Ce qui s'affiche, en revanche, doit être en français : le détail du
 * score est la pièce maîtresse de la transparence (§17), et un joueur qui lit
 * « FAMILY avec Koby » comprend moins bien qu'avec « Famille ».
 */

export const RELATION_LABEL: Record<RelationKind, string> = {
  CREW: 'Équipage',
  ALLIANCE: 'Alliance',
  FACTION: 'Faction',
  RIVALRY: 'Rivalité',
  MENTOR: 'Mentor',
  FAMILY: 'Famille',
};

export const EXPECTATION_LABEL: Record<PresenceExpectation, string> = {
  LOW: 'improbable',
  MEDIUM: 'incertain',
  HIGH: 'attendu',
};
