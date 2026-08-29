'use client';

import { attempt } from './attempt';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import {
  ensureReferralCodeAction,
  markNotificationsReadAction,
  redeemReferralAction,
} from '@/app/actions/social';
import {
  MAX_REWARDED_REFERRALS,
  REFERRAL_BERRIES_REFERRED,
} from '@/domain/social/referral';

/**
 * Notifications (cahier §108) et parrainage (§71) sur le profil.
 */

export interface NotificationView {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
}

export function NotificationCenter({
  notifications,
}: {
  notifications: NotificationView[];
}) {
  const [pending, startTransition] = useTransition();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <section className="mt-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm uppercase tracking-widest hb-ink-soft">
          Notifications {unread > 0 && `(${unread})`}
        </h2>
        {unread > 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(() => void markNotificationsReadAction())
            }
            className="text-xs hb-accent underline disabled:opacity-40"
          >
            Tout marquer comme lu
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="mt-3 text-sm hb-ink-soft">Rien de neuf.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {notifications.map((notification) => {
            const content = (
              <>
                <span className="block text-sm hb-ink">
                  {notification.title}
                </span>
                {notification.body && (
                  <span className="mt-0.5 block text-xs hb-ink-soft">
                    {notification.body}
                  </span>
                )}
                <span className="mt-1 block text-[10px] hb-ink-soft">
                  {notification.createdAt}
                </span>
              </>
            );

            const className = `block rounded-lg border px-3 py-2 ${
              notification.read
                ? 'hb-border hb-surface-quiet'
                : 'hb-border hb-hi'
            }`;

            return (
              <li key={notification.id}>
                {notification.href ? (
                  <Link href={notification.href} className={className}>
                    {content}
                  </Link>
                ) : (
                  <div className={className}>{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Le canal e-mail existe désormais ; le push, non. On ne mentionne que
          ce qui est réellement branché. */}
      <p className="mt-3 text-[11px] hb-ink-soft">
        Ces notifications s&apos;affichent ici et peuvent aussi partir par
        e-mail, selon tes préférences ci-dessous.
      </p>
    </section>
  );
}

export function ReferralPanel({
  code,
  referredCount,
  alreadyReferred,
}: {
  code: string | null;
  referredCount: number;
  alreadyReferred: boolean;
}) {
  const [myCode, setMyCode] = useState(code);
  const [input, setInput] = useState('');
  const [message, setMessage] = useState<
    { kind: 'ok' | 'error'; text: string } | null
  >(null);
  const [pending, startTransition] = useTransition();

  const generate = () => {
    startTransition(async () => {
      const result = await attempt(ensureReferralCodeAction());
      if (result.ok) setMyCode(result.code);
      else setMessage({ kind: 'error', text: result.error });
    });
  };

  const redeem = () => {
    startTransition(async () => {
      const result = await attempt(redeemReferralAction(input));
      setMessage(
        result.ok
          ? { kind: 'ok', text: 'Parrainage enregistré.' }
          : { kind: 'error', text: result.error },
      );
    });
  };

  return (
    <section className="mt-6 rounded-xl hb-surface p-5">
      <h2 className="text-sm uppercase tracking-widest hb-ink-soft">
        Parrainage
      </h2>

      <div className="mt-3">
        <p className="text-xs hb-ink-soft">Ton code</p>
        {myCode ? (
          <p className="mt-1 font-mono text-lg hb-gold">{myCode}</p>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={generate}
            className="transition-quick mt-1 rounded-lg border hb-border px-3 py-1.5 text-sm hb-accent disabled:opacity-40"
          >
            Générer mon code
          </button>
        )}
        <p className="mt-1 text-[11px] hb-ink-soft">
          {referredCount} / {MAX_REWARDED_REFERRALS} parrainages récompensés.
        </p>
      </div>

      {!alreadyReferred && (
        <div className="mt-4">
          <label htmlFor="referral" className="text-xs hb-ink-soft">
            On t&apos;a parrainé ? Saisis le code
          </label>
          <input
            id="referral"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="AB3DEF4G"
            className="mt-1 w-full rounded-lg border hb-border hb-input px-3 py-2 font-mono uppercase hb-ink placeholder:text-[#9aa8bf]"
          />
          <button
            type="button"
            disabled={pending || input.trim().length < 4}
            onClick={redeem}
            className="transition-quick mt-2 w-full rounded-lg hb-goldfill px-3 py-2 text-sm font-semibold hb-on-gold disabled:opacity-50 disabled:hb-ink-soft"
          >
            Valider — {REFERRAL_BERRIES_REFERRED} 🪙 pour vous deux
          </button>
        </div>
      )}

      {message && (
        <p
          role="status"
          className={`mt-3 text-sm ${message.kind === 'ok' ? 'hb-accent' : 'hb-ko'}`}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}
