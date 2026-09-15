'use client';

import Link from 'next/link';
import { useT } from '@/components/LocaleProvider';

/**
 * Chercher un joueur par son pseudo, depuis le classement.
 *
 * Un formulaire **GET**, pas une action : la recherche est une lecture, elle
 * doit se partager par son adresse (`/classement?q=luffy`) et survivre à un
 * rechargement. Le serveur fait la requête ; ce composant n'est client que
 * pour traduire ses libellés.
 *
 * `resultats` vaut `null` tant qu'on n'a rien cherché — l'absence de
 * résultats n'est pas la même chose que l'absence de recherche.
 */
export function RechercheJoueur({
  terme,
  resultats,
}: {
  terme: string;
  resultats: { handle: string }[] | null;
}) {
  const { t } = useT();
  const tropCourt = terme.length > 0 && terme.length < 2;

  return (
    <section className="hb-card mt-6">
      <form method="get" action="/classement" className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="hb-legend block">{t('lb.search.title')}</span>
          <input
            type="search"
            name="q"
            defaultValue={terme}
            placeholder={t('lb.search.placeholder')}
            autoComplete="off"
            maxLength={40}
            className="hb-filtres__saisie mt-1 w-full"
          />
        </label>
        <button type="submit" className="hb-btn shrink-0" style={{ width: 'auto', paddingInline: '1.1rem' }}>
          {t('lb.search.go')}
        </button>
      </form>

      {tropCourt && <p className="hb-muted mt-2 text-xs">{t('lb.search.short')}</p>}

      {resultats !== null && !tropCourt && (
        resultats.length === 0 ? (
          <p className="hb-muted mt-3 text-sm">{t('lb.search.none')}</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {resultats.map((r) => (
              <li key={r.handle}>
                <Link
                  href={`/joueur/${encodeURIComponent(r.handle)}`}
                  className="hb-tile hb-link block text-sm font-semibold"
                >
                  {r.handle}
                </Link>
              </li>
            ))}
          </ul>
        )
      )}

      {resultats === null && <p className="hb-muted mt-2 text-xs">{t('lb.search.hint')}</p>}
    </section>
  );
}
