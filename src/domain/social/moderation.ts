/**
 * Commentaires et modération (cahier §70).
 *
 * Le cahier veut des commentaires, des likes, des réponses et du signalement,
 * mais **pas de chat global au lancement** (§119). D'où le rattachement à un
 * chapitre : la discussion a un sujet, elle ne dérive pas.
 *
 * Les règles de publication sont pures et testables — la modération ne doit
 * pas dépendre de l'humeur d'un rendu.
 */

export const COMMENT_MAX_LENGTH = 2000;
export const COMMENT_MIN_LENGTH = 2;

/** Délai minimal entre deux commentaires d'un même joueur. */
export const COMMENT_COOLDOWN_MS = 20 * 1000;

/** Signalements à partir desquels un message est masqué automatiquement. */
export const REPORTS_BEFORE_HIDING = 3;

export type CommentRefusal =
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'COOLDOWN'
  | 'SPOILER_LOCKED';

export type CommentDecision =
  | { allowed: true; body: string }
  | { allowed: false; reason: CommentRefusal };

export interface CommentContext {
  body: string;
  lastCommentAt: Date | null;
  /**
   * Les résultats du chapitre sont-ils publiés ?
   *
   * Avant publication, la discussion est fermée : un commentaire est le canal
   * de spoiler le plus évident qui soit (§3). Le cahier veut protéger la
   * surprise, pas seulement masquer les scores.
   */
  resultsPublished: boolean;
  now: Date;
}

export function evaluateComment(context: CommentContext): CommentDecision {
  if (!context.resultsPublished) {
    return { allowed: false, reason: 'SPOILER_LOCKED' };
  }

  const body = context.body.trim();

  if (body.length < COMMENT_MIN_LENGTH) {
    return { allowed: false, reason: 'TOO_SHORT' };
  }
  if (body.length > COMMENT_MAX_LENGTH) {
    return { allowed: false, reason: 'TOO_LONG' };
  }

  if (
    context.lastCommentAt &&
    context.now.getTime() - context.lastCommentAt.getTime() < COMMENT_COOLDOWN_MS
  ) {
    return { allowed: false, reason: 'COOLDOWN' };
  }

  return { allowed: true, body };
}

export function describeCommentRefusal(reason: CommentRefusal): string {
  switch (reason) {
    case 'TOO_SHORT':
      return 'Ton commentaire est trop court.';
    case 'TOO_LONG':
      return `Maximum ${COMMENT_MAX_LENGTH} caractères.`;
    case 'COOLDOWN':
      return 'Attends quelques secondes entre deux commentaires.';
    case 'SPOILER_LOCKED':
      return 'La discussion ouvre une fois les résultats publiés.';
  }
}

/**
 * Un message doit-il être masqué au vu des signalements ?
 *
 * Le masquage est automatique mais **réversible et non punitif** : le message
 * est retiré de la vue, pas supprimé, et aucun compte n'est sanctionné. Un
 * seuil de signalements dit qu'il faut regarder, pas qui a tort.
 */
export function shouldHide(reportCount: number): boolean {
  return reportCount >= REPORTS_BEFORE_HIDING;
}
