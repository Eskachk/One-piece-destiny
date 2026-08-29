import type { Character, ChapterAppearance } from '../types';
import { CAPS } from '../scoring/v1';
import type { SimulationResult } from './simulator';

/**
 * Détection d'anomalies (cahier §81).
 *
 *
 * Ces contrôles **signalent, ils ne bloquent pas**. La publication reste une
 * décision humaine (§5.2, §7) : un chapitre peut légitimement être atypique,
 * et un système qui refuserait de publier sur la foi d'un seuil finirait par
 * être contourné plutôt que corrigé.
 */

export type AnomalyKind =
  | 'UNKNOWN_CHARACTER'
  | 'IMPLAUSIBLE_APPEARANCES'
  | 'SCORE_OUTLIER'
  | 'SYNERGY_TOO_PROFITABLE'
  | 'NO_RISK_REWARD';

export type Severity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface Anomaly {
  kind: AnomalyKind;
  severity: Severity;
  message: string;
  characterId?: string;
}

/**
 * Au-delà de ce nombre d'apparitions, la saisie est probablement une faute de
 * frappe : un chapitre fait une vingtaine de pages.
 */
export const IMPLAUSIBLE_APPEARANCES = 60;

/** Part de synergie au-delà de laquelle un score n'est plus porté par la présence. */
export const SYNERGY_SHARE_ALERT = 0.6;

/** Écart-types au-dessus de la moyenne à partir desquels un score détonne. */
export const OUTLIER_SIGMA = 2.5;

export interface AnomalyInput {
  appearances: ChapterAppearance[];
  roster: Character[];
  simulation: SimulationResult;
}

function standardDeviation(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
    (values.length - 1);
  return Math.sqrt(variance);
}

export function detectAnomalies(input: AnomalyInput): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const known = new Map(input.roster.map((c) => [c.id, c]));

  // 1. Données incohérentes — le plus grave, parce qu'un score juste calculé
  // sur une donnée fausse reste faux.
  for (const appearance of input.appearances) {
    if (!known.has(appearance.characterId)) {
      anomalies.push({
        kind: 'UNKNOWN_CHARACTER',
        severity: 'CRITICAL',
        characterId: appearance.characterId,
        message: `« ${appearance.characterId} » n'existe pas dans le référentiel.`,
      });
      continue;
    }

    if (appearance.appearances > IMPLAUSIBLE_APPEARANCES) {
      anomalies.push({
        kind: 'IMPLAUSIBLE_APPEARANCES',
        severity: 'WARNING',
        characterId: appearance.characterId,
        message: `${appearance.appearances} apparitions : vérifier la saisie.`,
      });
    }
  }

  const scoring = input.simulation.characters.filter((c) => c.score.total > 0);

  // 2. Score qui détonne par rapport au reste du chapitre.
  if (scoring.length >= 4) {
    const totals = scoring.map((c) => c.score.total);
    const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
    const sigma = standardDeviation(totals, mean);

    if (sigma > 0) {
      for (const entry of scoring) {
        if (entry.score.total > mean + OUTLIER_SIGMA * sigma) {
          anomalies.push({
            kind: 'SCORE_OUTLIER',
            severity: 'WARNING',
            characterId: entry.characterId,
            message: `${entry.score.total} pts, très au-dessus de la moyenne du chapitre (${Math.round(mean)}).`,
          });
        }
      }
    }
  }

  // 3. Synergie trop rentable : le score ne vient plus de la présence.
  for (const entry of scoring) {
    const share = entry.score.synergy / entry.score.total;
    if (share >= SYNERGY_SHARE_ALERT) {
      anomalies.push({
        kind: 'SYNERGY_TOO_PROFITABLE',
        severity: 'WARNING',
        characterId: entry.characterId,
        message: `${Math.round(share * 100)} % du score vient de la synergie.`,
      });
    }
  }

  // Note : la protection contre le « personnage parfait » (§14) ne vit pas
  // ici. Le cahier parle de domination **durable** — sur un seul chapitre,
  // qu'un personnage très présent soit aussi le meilleur score est le
  // résultat attendu, pas une anomalie. Ce contrôle est dans `flagMeta`,
  // qui observe plusieurs semaines.

  // 4. Le risque ne paie pas cette semaine : aucun pari improbable n'aboutit.
  const anyRiskPaid = scoring.some((c) => c.score.risk > CAPS.risk / 2);
  if (scoring.length >= 5 && !anyRiskPaid) {
    anomalies.push({
      kind: 'NO_RISK_REWARD',
      severity: 'INFO',
      message:
        'Aucun pari risqué ne rapporte vraiment : la semaine favorise les choix évidents.',
    });
  }

  return anomalies;
}

/** Y a-t-il de quoi bloquer un administrateur avant publication ? */
export function hasBlockingAnomaly(anomalies: Anomaly[]): boolean {
  return anomalies.some((anomaly) => anomaly.severity === 'CRITICAL');
}
