import 'server-only';

import { db } from '@/lib/supabase-admin';
import {
  MAX_QUESTIONS,
  type Question,
  type ReponseJoueur,
} from '@/domain/chapter/pronostics';

/**
 * Pronostics secondaires : lecture et écriture.
 *
 * Module à part, comme le Marché et les ligues. Le moteur de score n'a aucune
 * raison de connaître ces tables : le bonus est en Berries, il ne touche pas
 * `team_scores`.
 */

/**
 * Questions d'un chapitre, **avec** la bonne réponse.
 *
 * Réservé au serveur : à l'administration, et au calcul du bonus à la
 * publication. Ce que le joueur reçoit passe par `sansReponse`.
 */
export async function questionsDe(chapterId: string): Promise<Question[]> {
  const { data, error } = await db()
    .from('chapter_questions')
    .select('id, prompt, options, answer, position')
    .eq('chapter_id', chapterId)
    .order('position', { ascending: true })
    .limit(MAX_QUESTIONS);

  if (error) throw new Error(`chapter_questions.select : ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    prompt: row.prompt,
    options: row.options as string[],
    answer: row.answer,
  }));
}

/** Réponses d'un joueur sur un chapitre. */
export async function reponsesDe(
  chapterId: string,
  playerId: string,
): Promise<Map<string, number>> {
  const { data, error } = await db()
    .from('question_answers')
    .select('question_id, choice, chapter_questions!inner(chapter_id)')
    .eq('player_id', playerId)
    .eq('chapter_questions.chapter_id', chapterId);

  if (error) throw new Error(`question_answers.select : ${error.message}`);

  return new Map((data ?? []).map((row) => [row.question_id, row.choice]));
}

/**
 * Enregistre — ou remplace — la réponse d'un joueur.
 *
 * `upsert` plutôt qu'un `insert` : on peut changer d'avis jusqu'au
 * verrouillage, exactement comme pour l'équipage. L'échéance est vérifiée par
 * l'appelant, qui seul connaît le chapitre.
 */
export async function repondre(
  playerId: string,
  questionId: string,
  choice: number,
): Promise<void> {
  const { error } = await db()
    .from('question_answers')
    .upsert(
      { question_id: questionId, player_id: playerId, choice },
      { onConflict: 'question_id,player_id' },
    );

  if (error) throw new Error(`question_answers.upsert : ${error.message}`);
}

/**
 * Toutes les réponses d'un chapitre, groupées par joueur.
 *
 * Une seule requête pour la publication entière : un appel par joueur ferait
 * un aller-retour par participant, sur le chemin le plus chargé du produit.
 */
export async function reponsesDuChapitre(
  chapterId: string,
): Promise<Map<string, ReponseJoueur[]>> {
  const { data, error } = await db()
    .from('question_answers')
    .select('player_id, question_id, choice, chapter_questions!inner(chapter_id)')
    .eq('chapter_questions.chapter_id', chapterId);

  if (error) throw new Error(`question_answers.chapter : ${error.message}`);

  const out = new Map<string, ReponseJoueur[]>();
  for (const row of data ?? []) {
    const liste = out.get(row.player_id) ?? [];
    liste.push({ questionId: row.question_id, choice: row.choice });
    out.set(row.player_id, liste);
  }
  return out;
}

/** Ajoute une question au chapitre. La position est la première libre. */
export async function ajouterQuestion(
  chapterId: string,
  prompt: string,
  options: string[],
): Promise<'ok' | 'COMPLET'> {
  const existantes = await questionsDe(chapterId);
  if (existantes.length >= MAX_QUESTIONS) return 'COMPLET';

  const { error } = await db().from('chapter_questions').insert({
    chapter_id: chapterId,
    prompt,
    options,
    position: existantes.length,
  });

  if (error) throw new Error(`chapter_questions.insert : ${error.message}`);
  return 'ok';
}

export async function supprimerQuestion(
  chapterId: string,
  questionId: string,
): Promise<void> {
  // Le chapitre est dans la clause : sans lui, un identifiant venu du
  // navigateur permettrait de supprimer la question d'un autre chapitre.
  const { error } = await db()
    .from('chapter_questions')
    .delete()
    .eq('id', questionId)
    .eq('chapter_id', chapterId);

  if (error) throw new Error(`chapter_questions.delete : ${error.message}`);
}

/** Fixe la bonne réponse d'une question, à la publication. */
export async function trancherQuestion(
  chapterId: string,
  questionId: string,
  answer: number,
): Promise<void> {
  const { error } = await db()
    .from('chapter_questions')
    .update({ answer })
    .eq('id', questionId)
    .eq('chapter_id', chapterId);

  if (error) throw new Error(`chapter_questions.answer : ${error.message}`);
}
