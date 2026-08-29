/**
 * Styles de joueur (cahier §16).
 *
 * Après plusieurs semaines, le profil identifie une manière de jouer. Le but
 * est de donner une identité, pas de classer : aucun style n'est meilleur
 * qu'un autre, et le style n'entre dans aucun calcul de score.
 */

export type PlayStyle =
  | 'SAFE_CAPTAIN'
  | 'GAMBLER'
  | 'SYNERGY_MASTER'
  | 'META_HUNTER'
  | 'UNDECIDED';

export const STYLE_LABEL: Record<PlayStyle, string> = {
  SAFE_CAPTAIN: 'The Safe Captain',
  GAMBLER: 'The Gambler',
  SYNERGY_MASTER: 'The Synergy Master',
  META_HUNTER: 'The Meta Hunter',
  UNDECIDED: 'Capitaine sans étiquette',
};

export const STYLE_DESCRIPTION: Record<PlayStyle, string> = {
  SAFE_CAPTAIN: 'Tu construis sur des valeurs sûres et tu encaisses.',
  GAMBLER: 'Tu joues l\'improbable, et parfois ça paie très fort.',
  SYNERGY_MASTER: 'Tu lis les relations avant de lire les probabilités.',
  META_HUNTER: 'Tu vises ce que les autres délaissent.',
  UNDECIDED: 'Encore trop peu de semaines pour se prononcer.',
};

/** Un style ne s'attribue qu'avec assez de recul. */
export const MIN_WEEKS_FOR_STYLE = 4;

export interface WeeklyProfile {
  /** Risque moyen de l'équipe, 0–100 (cahier §11). */
  risk: number;
  /** Part du score venant de la synergie, 0–1. */
  synergyShare: number;
  /** Taux de sélection moyen des personnages choisis, 0–1. */
  averagePickRate: number;
}

export interface StyleVerdict {
  style: PlayStyle;
  /** Moyennes ayant conduit au verdict, pour l'afficher au joueur. */
  averages: WeeklyProfile;
  weeks: number;
}

/**
 * Déduit un style à partir de l'historique.
 *
 * L'ordre des tests compte : un joueur peut être à la fois risqué et
 * anti-méta, on retient le trait le plus marqué. La synergie passe en premier
 * parce que c'est le trait le plus délibéré des trois.
 */
export function deriveStyle(history: WeeklyProfile[]): StyleVerdict {
  const weeks = history.length;

  const averages: WeeklyProfile = {
    risk: average(history.map((h) => h.risk)),
    synergyShare: average(history.map((h) => h.synergyShare)),
    averagePickRate: average(history.map((h) => h.averagePickRate)),
  };

  if (weeks < MIN_WEEKS_FOR_STYLE) {
    return { style: 'UNDECIDED', averages, weeks };
  }

  if (averages.synergyShare >= 0.3) {
    return { style: 'SYNERGY_MASTER', averages, weeks };
  }

  if (averages.averagePickRate <= 0.2) {
    return { style: 'META_HUNTER', averages, weeks };
  }

  if (averages.risk >= 60) {
    return { style: 'GAMBLER', averages, weeks };
  }

  if (averages.risk <= 35) {
    return { style: 'SAFE_CAPTAIN', averages, weeks };
  }

  return { style: 'UNDECIDED', averages, weeks };
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
