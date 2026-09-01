/**
 * Saisons (cahier §20).
 *
 * Une saison couvre 24 à 26 chapitres, et **seuls les meilleurs résultats
 * comptent**. C'est la règle importante : sans elle, une semaine d'absence —
 * vacances, hiatus, vie — ruinerait une saison entière et donnerait une
 * raison d'arrêter plutôt que de revenir.
 */

export interface SeasonConfig {
  id: string;
  name: string;
  /** Nombre de chapitres que couvre la saison. */
  chapters: number;
  /** Nombre de résultats retenus pour le total (§20 : 20 sur 26). */
  countedResults: number;
}

export const SEASON_01: SeasonConfig = {
  id: 'season-01',
  name: 'Saison 01',
  chapters: 26,
  countedResults: 20,
};

export interface SeasonEntry {
  chapterNumber: number;
  total: number;
}

export interface SeasonStanding {
  /** Somme des meilleurs résultats retenus. */
  total: number;
  /** Résultats effectivement comptés, du meilleur au moins bon. */
  counted: SeasonEntry[];
  /** Résultats écartés parce qu'au-delà du quota. */
  dropped: SeasonEntry[];
  /** Semaines jouées, indépendamment du quota. */
  played: number;
  /** Semaines encore jouables pour améliorer le total. */
  remaining: number;
}

/**
 * Calcule le classement de saison d'un joueur.
 *
 * Fonction pure et déterministe : un recalcul contrôlé (§79) redonne
 * exactement le même total.
 */
export function seasonStanding(
  entries: SeasonEntry[],
  config: SeasonConfig = SEASON_01,
): SeasonStanding {
  // Tri décroissant ; à égalité, le chapitre le plus ancien passe devant pour
  // que le résultat ne dépende pas de l'ordre d'arrivée des lignes.
  const sorted = [...entries].sort(
    (a, b) => b.total - a.total || a.chapterNumber - b.chapterNumber,
  );

  const counted = sorted.slice(0, config.countedResults);
  const dropped = sorted.slice(config.countedResults);

  return {
    total: counted.reduce((sum, entry) => sum + entry.total, 0),
    counted,
    dropped,
    played: entries.length,
    remaining: Math.max(0, config.chapters - entries.length),
  };
}

/**
 * Un résultat de ce score améliorerait-il le total de saison ?
 *
 * Sert à dire au joueur ce qu'il a à gagner cette semaine, plutôt que de le
 * laisser deviner.
 */
export function wouldImproveSeason(
  entries: SeasonEntry[],
  candidateScore: number,
  config: SeasonConfig = SEASON_01,
): boolean {
  const standing = seasonStanding(entries, config);

  // Quota non atteint : tout résultat compte.
  if (standing.counted.length < config.countedResults) return true;

  const worstCounted = standing.counted.at(-1);
  return worstCounted !== undefined && candidateScore > worstCounted.total;
}

/** Paliers de récompense de fin de saison (cahier §20). */
export const SEASON_TIERS = [
  { label: 'Top 1', maxRank: 1 },
  { label: 'Top 10', maxRank: 10 },
  { label: 'Top 100', maxRank: 100 },
] as const;

/** Palier atteint en fin de saison, ou `null`. */
export function seasonTier(rank: number, totalPlayers: number): string | null {
  for (const tier of SEASON_TIERS) {
    if (rank <= tier.maxRank) return tier.label;
  }
  // Top 1 % : palier relatif, utile quand la population est grande.
  if (totalPlayers > 0 && rank / totalPlayers <= 0.01) return 'Top 1%';
  return null;
}
