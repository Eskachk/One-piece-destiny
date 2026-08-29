/**
 * Registre des moteurs de score (cahier §78).
 *
 * Un chapitre conserve à vie la version avec laquelle il a été calculé.
 * Passer le système en v1.1 ne doit jamais modifier rétroactivement le
 * classement du chapitre 1180 : on recharge sa version d'origine.
 */

import * as v1 from './v1';
import * as v2 from './v2';
import type { ScoringContext, TeamScore } from './v1';

export type { ScoringContext, TeamScore, CharacterScore } from './v1';

export interface ScoringEngine {
  version: string;
  scoreTeam(ctx: ScoringContext): TeamScore;
}

const ENGINES = new Map<string, ScoringEngine>([
  [v1.SCORING_VERSION, { version: v1.SCORING_VERSION, scoreTeam: v1.scoreTeam }],
  [v2.SCORING_VERSION, { version: v2.SCORING_VERSION, scoreTeam: v2.scoreTeam }],
]);

/**
 * Version utilisée pour les **nouveaux** chapitres.
 *
 * Le v1 reste enregistré, et ce n'est pas de la politesse : les chapitres déjà
 * publiés portent leur version en base. Retirer le v1 rendrait leur classement
 * irrecalculable, donc incontestable — l'inverse de ce que demande le §78.
 */
export const CURRENT_SCORING_VERSION = v2.SCORING_VERSION;

export function getScoringEngine(version: string): ScoringEngine {
  const engine = ENGINES.get(version);
  if (!engine) {
    // Échec explicite : recalculer un ancien chapitre avec un moteur inconnu
    // corromprait un classement déjà publié.
    throw new Error(
      `Moteur de score introuvable pour la version "${version}". ` +
        `Versions disponibles : ${[...ENGINES.keys()].join(', ')}.`,
    );
  }
  return engine;
}
