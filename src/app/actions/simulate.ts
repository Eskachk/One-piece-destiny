'use server';

import { CHARACTERS } from '@/data/characters';
import { detectAnomalies, type Anomaly } from '@/domain/admin/anomalies';
import {
  HISTORY_WINDOW,
  suggestCounts,
  suggestionsAsImportText,
} from '@/domain/admin/assisted-count';
import { simulateChapter } from '@/domain/admin/simulator';
import { requireAdmin } from '@/lib/auth/guards';
import { assertSameOrigin } from '@/lib/auth/request-guard';
import { getRepository } from '@/lib/repository';

/**
 * Simulation avant publication (cahier §80, §81).
 *
 * Lecture seule : rien n'est écrit, rien n'est publié. C'est un outil pour
 * décider, pas une étape du pipeline — la publication reste une action
 * humaine distincte et explicite (§5.2).
 */

export interface SimulationSummary {
  best: { characterId: string; name: string; total: number }[];
  maxTeamScore: number;
  jackpot: { characterId: string; name: string; total: number } | null;
  trap: { characterId: string; name: string } | null;
  averageSynergyShare: number;
  anomalies: Anomaly[];
}

export type SimulateResult =
  | { ok: true; summary: SimulationSummary }
  | { ok: false; error: string };

const nameOf = (characterId: string) =>
  CHARACTERS.find((c) => c.id === characterId)?.name ?? characterId;

export type SuggestResult =
  | { ok: true; text: string; note: string }
  | { ok: false; error: string };

/**
 * Comptage assisté (cahier §7).
 *
 * Propose un point de départ à partir de l'historique, **pas une lecture du
 * chapitre**. L'administrateur corrige et valide : sa saisie fait foi (§5.2).
 */
export async function suggestAppearances(): Promise<SuggestResult> {
  await assertSameOrigin();
  await requireAdmin();

  const repository = getRepository();
  const chapter = await repository.getCurrentChapter();
  if (!chapter) return { ok: false, error: 'Aucun chapitre ouvert.' };

  const history = await repository.getAppearanceHistory(HISTORY_WINDOW);
  const suggestions = suggestCounts(history, CHARACTERS, chapter.chapterNumber);

  if (suggestions.length === 0) {
    return {
      ok: false,
      error: 'Pas encore assez de chapitres passés pour proposer un comptage.',
    };
  }

  return {
    ok: true,
    text: suggestionsAsImportText(suggestions, CHARACTERS),
    note: `${suggestions.length} personnage(s) proposé(s) d'après les ${HISTORY_WINDOW} derniers chapitres. À corriger avant validation.`,
  };
}

export async function simulateCurrentChapter(): Promise<SimulateResult> {
  await assertSameOrigin();
  await requireAdmin();

  const repository = getRepository();
  const chapter = await repository.getCurrentChapter();
  if (!chapter) return { ok: false, error: 'Aucun chapitre ouvert.' };

  const appearances = await repository.getAppearances(chapter.id);

  if (appearances.length === 0) {
    return { ok: false, error: 'Valide d\'abord les apparitions du chapitre.' };
  }

  const simulation = simulateChapter({
    appearances,
    roster: CHARACTERS,
    // Version figée du chapitre : simuler avec un autre moteur donnerait un
    // aperçu qui ne correspond pas à ce qui sera publié (§78).
    scoringVersion: chapter.scoringVersion,
  });

  const anomalies = detectAnomalies({
    appearances,
    roster: CHARACTERS,
    simulation,
  });

  return {
    ok: true,
    summary: {
      best: simulation.characters.slice(0, 5).map((entry) => ({
        characterId: entry.characterId,
        name: nameOf(entry.characterId),
        total: entry.score.total,
      })),
      maxTeamScore: simulation.maxTeamScore,
      jackpot: simulation.jackpot
        ? {
            characterId: simulation.jackpot.characterId,
            name: nameOf(simulation.jackpot.characterId),
            total: simulation.jackpot.score.total,
          }
        : null,
      trap: simulation.trap
        ? {
            characterId: simulation.trap.characterId,
            name: nameOf(simulation.trap.characterId),
          }
        : null,
      averageSynergyShare: simulation.averageSynergyShare,
      anomalies,
    },
  };
}
