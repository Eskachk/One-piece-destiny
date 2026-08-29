/**
 * Types partagés du domaine One Piece Quest.
 *
 * Règle structurante (cahier §8) : les données brutes du chapitre sont
 * séparées du calcul. On ne stocke jamais « Luffy = 42 points », on stocke
 * « chapitre 1180, Luffy, 12 apparitions » puis on applique un moteur versionné.
 */

export type Rarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';

/** Attendu d'apparition, exposé au joueur en Low/Medium/High (cahier §12). */
export type PresenceExpectation = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Type de lien narratif entre deux personnages. Les synergies doivent avoir
 * une logique narrative (cahier §9.2) — pas un simple partage de tag.
 */
export type RelationKind =
  | 'CREW' // même équipage
  | 'ALLIANCE' // alliance explicite dans l'œuvre
  | 'FACTION' // même faction large (Marine, Cross Guild…)
  | 'RIVALRY' // rivalité identifiée
  | 'MENTOR' // lien maître / élève
  | 'FAMILY';

export interface CharacterRelation {
  /** Id de l'autre personnage. */
  to: string;
  kind: RelationKind;
}

export interface Character {
  id: string;
  name: string;
  rarity: Rarity;
  /**
   * Rareté = valeur de collection, pas puissance (cahier §25).
   * Le moteur de score n'utilise jamais `rarity`.
   */
  affiliations: string[];
  relations: CharacterRelation[];
  /** Tags de capacités (Haki, fruit du démon…), utilisés avec parcimonie (§9.3). */
  abilities: string[];
  presenceExpectation: PresenceExpectation;
}

/** Fait brut observé dans un chapitre, après validation humaine (cahier §5.2). */
export interface ChapterAppearance {
  characterId: string;
  appearances: number;
}

/** Équipe verrouillée : exactement 3 personnages (cahier §2.1). */
export interface LockedTeam {
  userId: string;
  chapterId: string;
  characterIds: [string, string, string];
  lockedAt: Date;
}

export type ChapterStatus =
  | 'NORMAL'
  | 'HIATUS'
  | 'DELAYED'
  | 'CANCELLED'
  | 'PUBLISHED'
  | 'RESULTS_PUBLISHED';

/**
 * Entité chapitre — source de vérité unique (cahier §4.1).
 * Toutes les dates sont en UTC.
 */
export interface ChapterEvent {
  id: string;
  chapterNumber: number;
  status: ChapterStatus;
  teamLockAt: Date;
  officialReleaseAt: Date | null;
  resultsPublishedAt: Date | null;
  scoringVersion: string;
  dataVersion: string;
}
