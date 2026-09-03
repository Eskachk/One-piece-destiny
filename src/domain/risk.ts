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

import { riskRankOf } from './scoring/prominence';
import type { Character, PresenceExpectation } from './types';

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
 * @param picked les personnages sélectionnés
 */
export function teamRisk(picked: Character[]): RiskMeter {
  if (picked.length === 0) return { value: 0, band: 'SAFE' };

  /*
   * La jauge et les points lisent désormais **la même** formule.
   *
   * Elles étaient calculées séparément : ici l'attendu de présence et le taux
   * de sélection, dans le moteur de score la même chose recopiée. Deux
   * formules pour une seule question finissent par diverger, et c'est le
   * joueur qui découvre l'écart après la publication — il compose sur une
   * jauge qui ne dit pas ce qui sera compté.
   *
   * `riskRankOf` croise quatre estimateurs — attendu de présence, rareté de
   * la carte, stature décrite par les attributs, taux de sélection — puis lit
   * le résultat comme un **rang** parmi tout le référentiel.
   *
   * Ce dernier point est ce qui rend la jauge honnête. Sur la valeur brute, la
   * médiane du référentiel est à 84 sur 100 : la jauge annonçait « risque
   * extrême » pour un choix parfaitement banal, et le joueur qui la croyait
   * composait à l'aveugle. Sur le rang, 50 veut dire cinquante — la moitié du
   * référentiel est plus sûre, l'autre moitié plus hasardeuse.
   *
   * Le taux de sélection n'entre plus ici : au v6 il ne modifie plus le
   * risque, il escompte le score entier (voir `scoring/v6.ts`). L'y laisser
   * ferait compter deux fois la même chose.
   */
  const perCharacter = picked.map((character) => riskRankOf(character));

  const average = perCharacter.reduce((a, b) => a + b, 0) / perCharacter.length;
  const value = Math.round(average * 100);
  return { value, band: bandOf(value) };
}

/** Libellé destiné aux joueurs casual (cahier §12). */
export function presenceLabel(expectation: PresenceExpectation): string {
  return { HIGH: 'Élevée', MEDIUM: 'Moyenne', LOW: 'Faible' }[expectation];
}
