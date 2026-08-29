'use client';

import { attempt } from './attempt';
import { useState, useTransition } from 'react';
import {
  deleteCommentAction,
  postCommentAction,
  reportCommentAction,
  toggleLikeAction,
} from '@/app/actions/social';
import {
  COMMENT_MAX_LENGTH,
  shouldHide,
} from '@/domain/social/moderation';

/**
 * Discussion du chapitre (cahier §70).
 *
 * Rattachée à un chapitre publié : pas de chat global au lancement (§119), et
 * la discussion n'ouvre qu'après publication pour ne pas devenir un canal de
 * spoiler (§3).
 */

export interface CommentView {
  id: string;
  handle: string;
  body: string;
  likes: number;
  likedByMe: boolean;
  reports: number;
  isMine: boolean;
  createdAt: string;
}

export function Comments({ comments }: { comments: CommentView[] }) {
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok: boolean } & Record<string, unknown>>) => {
    startTransition(async () => {
      const result = await attempt(action());
      setError(result.ok ? null : String(result.error));
      if (result.ok) setBody('');
    });
  };

  const reveal = (id: string) =>
    setRevealed((current) => new Set(current).add(id));

  return (
    <section className="mt-8">
      <h2 className="text-sm uppercase tracking-widest hb-ink-soft">
        Discussion
      </h2>

      <div className="mt-3">
        <label htmlFor="comment" className="sr-only">
          Ton commentaire
        </label>
        <textarea
          id="comment"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={3}
          maxLength={COMMENT_MAX_LENGTH}
          placeholder="Ton analyse du chapitre…"
          className="w-full rounded-lg border hb-border hb-input p-3 text-sm hb-ink placeholder:text-[#9aa8bf]"
        />

        {error && (
          <p role="alert" className="mt-2 text-sm hb-ko">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={pending || body.trim().length < 2}
          onClick={() => run(() => postCommentAction(body))}
          className="transition-quick mt-2 w-full rounded-lg hb-goldfill px-4 py-2 text-sm font-semibold hb-on-gold disabled:opacity-50 disabled:hb-ink-soft"
        >
          {pending ? 'Envoi…' : 'Publier'}
        </button>
      </div>

      {comments.length === 0 ? (
        <p className="mt-4 text-sm hb-ink-soft">
          Personne n&apos;a encore réagi à ce chapitre.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {comments.map((comment) => {
            // Masquage automatique au-delà du seuil de signalements. Le
            // message reste consultable d'un clic : on met de côté, on ne
            // censure pas (§70).
            const hidden =
              shouldHide(comment.reports) && !revealed.has(comment.id);

            return (
              <li
                key={comment.id}
                className="rounded-xl hb-surface p-3"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-sm hb-ink">{comment.handle}</span>
                  <span className="text-[11px] hb-ink-soft">
                    {comment.createdAt}
                  </span>
                </div>

                {hidden ? (
                  <p className="mt-2 text-sm hb-ink-soft">
                    Message masqué après plusieurs signalements.{' '}
                    <button
                      type="button"
                      onClick={() => reveal(comment.id)}
                      className="hb-accent underline"
                    >
                      Afficher quand même
                    </button>
                  </p>
                ) : (
                  <p className="mt-2 whitespace-pre-wrap text-sm hb-ink">
                    {comment.body}
                  </p>
                )}

                <div className="mt-2 flex gap-4 text-[11px]">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => toggleLikeAction(comment.id))}
                    aria-pressed={comment.likedByMe}
                    className={
                      comment.likedByMe ? 'hb-gold' : 'hb-ink-soft'
                    }
                  >
                    {comment.likedByMe ? '★' : '☆'} {comment.likes}
                  </button>

                  {comment.isMine ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => deleteCommentAction(comment.id))}
                      className="hb-ink-soft underline"
                    >
                      Supprimer
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => reportCommentAction(comment.id))}
                      className="hb-ink-soft underline"
                    >
                      Signaler
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
