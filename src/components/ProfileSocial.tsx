'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { markNotificationsReadAction } from '@/app/actions/social';

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
            aria-busy={pending}
            // `startTransition` sur une fonction **synchrone** rend la main
            // aussitôt : `pending` retombait avant que la requête ne parte, et
            // le `disabled` juste au-dessus ne protégeait rien. Marquer comme
            // lu est idempotent, donc rien ne se cassait — mais le bouton
            // partait autant de fois qu'on cliquait.
            onClick={() =>
              startTransition(async () => {
                await markNotificationsReadAction();
              })
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

/**
 * Lien d'invitation (cahier §71).
 *
 * Il n'y a plus de code à dicter ni à recopier : le joueur partage une URL,
 * son invité clique, et le bonus lui est acquis sans qu'il ait rien à saisir.
 * Un champ « saisis ton code de parrainage » était le seul endroit du produit
 * où l'on demandait à quelqu'un de retaper une chaîne de huit caractères sans
 * voyelles — c'était aussi celui où l'on perdait le plus de monde.
 *
 * Le lien est fabriqué **côté serveur**, à partir de l'origine réelle de la
 * requête : construit ici avec `window.location`, il aurait pointé vers
 * l'aperçu Vercel du jour pour qui l'aurait copié depuis une préproduction.
 */
export function ReferralPanel({
  link,
  referredCount,
  referrerBerries,
  referredBerries,
  maxRewarded,
  minChapters,
}: {
  link: string | null;
  referredCount: number;
  referrerBerries: number;
  referredBerries: number;
  maxRewarded: number;
  /** Chapitres que le filleul doit avoir joués pour que le parrain soit payé. */
  minChapters: number;
}) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    if (!link) return;

    // `navigator.share` ouvre le partage natif du téléphone — le geste
    // attendu sur mobile, qui est la cible du produit (§55). Il n'existe pas
    // partout : le presse-papiers reste le repli, et le lien est de toute
    // façon affiché en clair au-dessus, sélectionnable à la main.
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          title: 'Grand Line Weekly',
          text: `Rejoins-moi : tu démarres avec ${referredBerries} Berries.`,
          url: link,
        });
        return;
      }
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Partage annulé ou presse-papiers refusé : rien à signaler, le lien
      // reste visible et copiable manuellement.
    }
  };

  return (
    <section className="hb-card mt-6">
      <h2 className="hb-legend">Invite un équipier</h2>

      <p className="hb-muted mt-2 text-sm">
        Qui arrive par ton lien démarre avec{' '}
        <span className="hb-num">{referredBerries}</span> Berries au lieu de{' '}
        <span className="hb-num">{referredBerries / 2}</span> — débloquées à son
        premier équipage verrouillé.
      </p>

      {link ? (
        <>
          <p className="hb-serial mt-3 break-all" aria-label="Ton lien d’invitation">
            {link}
          </p>
          <button type="button" onClick={share} className="hb-btn mt-3 w-full">
            {copied ? 'Lien copié ✓' : 'Partager mon lien'}
          </button>
        </>
      ) : (
        <p className="hb-muted mt-3 text-sm">
          Ton lien n&apos;est pas encore disponible. Recharge la page.
        </p>
      )}

      <p className="hb-muted mt-3 text-xs">
        Tu reçois <span className="hb-num">{referrerBerries}</span> Berries par
        filleul, une fois qu&apos;il a{' '}
        <strong>confirmé son adresse et joué {minChapters} chapitres</strong> —
        pas à son inscription. Un compte créé pour la forme ne rapporte donc
        rien, et attendre trois semaines pour rien non plus. Plafond :{' '}
        {maxRewarded} filleuls récompensés.
      </p>

      <p className="hb-muted mt-2 text-xs">
        {referredCount} / {maxRewarded} parrainages récompensés.
      </p>
    </section>
  );
}
