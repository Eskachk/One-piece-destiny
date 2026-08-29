/**
 * Risk Meter (cahier §11 et §12).
 *
 * Indicateur calculé AVANT la sortie du chapitre : il ne consomme que des
 * données publiques d'avant-chapitre (attendu de présence, taux de sélection
 * de la semaine en cours). Il ne révèle donc jamais de spoiler.
 *
 * Le cahier §12 met en garde : ne pas afficher une valeur si précise qu'elle
 * résout le jeu. On expose la valeur brute côté serveur pour les statistiques,
 * et un libellé Low/Medium/High côté joueur casual.
 */

import type { Character, PresenceExpectation } from './types';

/** Contribution au risque, de 0 (choix évident) à 1 (pari total). */
const PRESENCE_RISK: Record<PresenceExpectation, number> = {
  HIGH: 0.15,
  MEDIUM: 0.5,
  LOW: 1,
};

export type RiskBand = 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';

export interface RiskMeter {
  /** 0–100. Réservé aux vues internes et aux statistiques. */
  value: number;
  band: RiskBand;
}

function bandOf(value: number): RiskBand {
  if (value < 20) return 'SAFE';
  if (value < 40) return 'LOW';
  if (value < 60) return 'MEDIUM';
  if (value < 80) return 'HIGH';
  return 'EXTREME';
}

/**
 * Risque d'une équipe de 3 personnages.
 *
 * @param picked      les personnages sélectionnés
 * @param pickRates   taux de sélection observés (0–1) de la semaine en cours
 */
export function teamRisk(
  picked: Character[],
  pickRates?: Map<string, number>,
): RiskMeter {
  if (picked.length === 0) return { value: 0, band: 'SAFE' };

  const perCharacter = picked.map((character) => {
    const presence = PRESENCE_RISK[character.presenceExpectation];
    const pickRate = pickRates?.get(character.id);
    // Un personnage boudé par la communauté augmente le risque assumé.
    return pickRate === undefined ? presence : (presence + (1 - pickRate)) / 2;
  });

  const average = perCharacter.reduce((a, b) => a + b, 0) / perCharacter.length;
  const value = Math.round(average * 100);
  return { value, band: bandOf(value) };
}

/** Libellé destiné aux joueurs casual (cahier §12). */
export function presenceLabel(expectation: PresenceExpectation): string {
  return { HIGH: 'Élevée', MEDIUM: 'Moyenne', LOW: 'Faible' }[expectation];
}
