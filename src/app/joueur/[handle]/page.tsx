import type { Metadata } from 'next';
import Link from 'next/link';
import { HarborScene } from '@/components/HarborScene';
import { Nav } from '@/components/Nav';
import { CHARACTERS, CHARACTER_INDEX } from '@/data/characters';
import { collectionSummary } from '@/domain/collection/sets';
import { RARITY_ORDER } from '@/domain/collection/rarity';
import { libelleRarete, libelleStyle, libelleStyleDescription } from '@/domain/i18n/libelles';
import type { MessageKey } from '@/domain/i18n/locales';
import { islandOf } from '@/domain/islands';
import { deriveStyle, MIN_WEEKS_FOR_STYLE } from '@/domain/player/style';
import type { SpecialAward } from '@/domain/scoring/chapter-analysis';
import type { Rarity } from '@/domain/types';
import { DIVISION_LABEL, DIVISIONS, divisionRank } from '@/domain/season/divisions';
import { requireSession } from '@/lib/auth/guards';
import { traduire } from '@/lib/i18n';
import { lireProfilPublic } from '@/lib/joueurs/public';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const [{ handle }, { t }] = await Promise.all([params, traduire()]);
  return {
    title: t('jp.meta.title', { handle: decodeURIComponent(handle) }),
    // Une page par joueur, derrière la connexion : rien à indexer.
    robots: { index: false, follow: false },
  };
}

/**
 * Profil public d'un joueur (cahier §16, §19, §68).
 *
 * Ce que le classement laissait en suspens : un pseudo devant soi, et rien
 * pour savoir qui c'est. Cette page montre ce que le jeu montre déjà ailleurs
 * — division, résultats publiés, distinctions — plus la collection en nombre
 * et l'équipage du dernier chapitre publié. Rien du compte : ni adresse, ni
 * âge, ni Berries, ni coffres (voir `lib/joueurs/public.ts`).
 *
 * Réservée aux joueurs connectés : c'est une page *entre* joueurs, pas une
 * vitrine indexable.
 */
export default async function JoueurPage({ params }: Params) {
  const [session, { handle }, { t, locale }] = await Promise.all([
    requireSession(),
    params,
    traduire(),
  ]);

  const profil = await lireProfilPublic(decodeURIComponent(handle));

  if (!profil) {
    return (
      <HarborScene variant="page" island={islandOf('/joueur')}>
        <p className="hb-eyebrow">{t('jp.eyebrow')}</p>
        <h1 className="hb-title mt-1">{t('jp.notFound.title')}</h1>
        <p className="hb-card mt-5 text-sm">{t('jp.notFound.body')}</p>
        <Link href="/classement" className="hb-link mt-6 block text-center text-sm">
          {t('jp.backToRanking')}
        </Link>
        <Nav />
      </HarborScene>
    );
  }

  const style = deriveStyle(profil.profiles);
  const collection = collectionSummary(CHARACTERS, new Set(profil.ownedIds));
  const parRarete = RARITY_ORDER.map((rarity) => ({
    rarity,
    n: CHARACTERS.filter((c) => c.rarity === rarity && profil.ownedIds.includes(c.id)).length,
  })).filter(({ n }) => n > 0);
  const rang = divisionRank(profil.division);
  const dateLocale = locale === 'en' ? 'en-GB' : 'fr-FR';

  return (
    <HarborScene variant="page" island={islandOf('/joueur')}>
      <p className="hb-eyebrow">{t('jp.eyebrow')}</p>
      <h1 className="hb-title mt-1">{profil.handle}</h1>
      <p className="hb-muted mt-1 text-sm">
        {t('jp.since', {
          date: profil.createdAt.toLocaleDateString(dateLocale, { day: 'numeric', month: 'long', year: 'numeric' }),
        })}
      </p>

      {session.playerId === profil.playerId && (
        <p className="hb-card mt-4 text-sm">
          {t('jp.you')}{' '}
          <Link href="/profil" className="hb-link">
            {t('nav.profile' as MessageKey)}
          </Link>
        </p>
      )}

      {/* Division (§19) */}
      <section className="hb-card mt-5">
        <p className="hb-legend">{t('jp.division')}</p>
        <p className="hb-title" style={{ fontSize: '1.9rem' }}>
          {DIVISION_LABEL[profil.division]}
        </p>
        <ol className="mt-3 flex gap-1">
          {DIVISIONS.map((division, index) => (
            <li
              key={division}
              title={DIVISION_LABEL[division]}
              className={`h-1.5 flex-1 rounded-full ${
                index <= rang ? 'bg-[#f5c542]' : 'bg-[rgba(20,41,79,.18)]'
              }`}
            />
          ))}
        </ol>
      </section>

      {/* Style de jeu (§16) — sur bois, comme sur le journal de bord. */}
      <section className="hb-card hb-card--wood mt-5">
        <p className="hb-legend">{t('jp.style')}</p>
        {style.weeks >= MIN_WEEKS_FOR_STYLE ? (
          <>
            <p className="hb-title" style={{ fontSize: '1.9rem' }}>
              {libelleStyle(t, style.style)}
            </p>
            <p className="hb-muted mt-1 text-sm">{libelleStyleDescription(t, style.style)}</p>
          </>
        ) : (
          <p className="hb-muted mt-1 text-sm">{t('jp.style.unknown')}</p>
        )}
      </section>

      {/* L'équipage du dernier chapitre publié. */}
      <section className="hb-card mt-5">
        {profil.lastTeam ? (
          <>
            <div className="flex items-baseline justify-between gap-3">
              <p className="hb-legend">{t('jp.lastTeam', { n: profil.lastTeam.chapterNumber })}</p>
              {profil.lastTeam.total !== null && (
                <p className="hb-num text-sm">{t('jp.lastTeam.points', { n: profil.lastTeam.total })}</p>
              )}
            </div>
            <ul className="mt-3 flex flex-wrap gap-2">
              {profil.lastTeam.characterIds.map((id) => {
                const personnage = CHARACTER_INDEX.get(id);
                return (
                  <li key={id} className="hb-tile text-sm font-semibold">
                    {personnage?.name ?? id}
                    {personnage && (
                      <span className="hb-legend mt-0.5 block">
                        {libelleRarete(t, personnage.rarity)}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <>
            <p className="hb-legend">{t('jp.lastTeam', { n: '—' })}</p>
            <p className="hb-muted mt-1 text-sm">{t('jp.lastTeam.none')}</p>
          </>
        )}
      </section>

      {/* Dernières semaines : score et rang en pourcentage, tels que publiés. */}
      <section className="mt-6">
        <h2 className="hb-legend">{t('jp.history')}</h2>
        {profil.profiles.length === 0 ? (
          <p className="hb-muted mt-3 text-sm">{t('jp.history.none')}</p>
        ) : (
          <ul className="mt-3 space-y-1">
            {profil.profiles.map((p) => (
              <li key={p.chapterNumber} className="hb-row flex items-baseline justify-between">
                <span className="font-mono text-sm">#{p.chapterNumber}</span>
                <span className="hb-muted text-xs">
                  {p.percentile !== null && t('jp.history.top', { n: p.percentile })}
                </span>
                <span className="hb-num text-sm">{p.total}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Distinctions (§18) */}
      {profil.awards.length > 0 && (
        <section className="mt-6">
          <h2 className="hb-legend">{t('jp.awards')}</h2>
          <ul className="mt-3 space-y-1">
            {profil.awards.map((a) => (
              <li
                key={`${a.award}-${a.chapterNumber}`}
                className="hb-tile flex items-baseline justify-between"
              >
                <span className="text-sm font-semibold">
                  {t(`award.${a.award as SpecialAward}` as MessageKey)}
                </span>
                <span className="hb-muted text-xs">{t('jp.awards.chapter', { n: a.chapterNumber })}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Collection, en nombre : ce que le joueur possède, jamais quelle carte. */}
      <section className="hb-card mt-6">
        <p className="hb-legend">{t('jp.collection')}</p>
        <p className="mt-1 text-sm">
          {t('jp.collection.count', {
            owned: collection.owned,
            total: collection.total,
            percent: collection.percent,
          })}
        </p>
        {parRarete.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {parRarete.map(({ rarity, n }) => (
              <li key={rarity} className="hb-tile text-xs">
                {t('jp.collection.rarity', { n, rarity: libelleRarete(t, rarity as Rarity) })}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Link href="/classement" className="hb-link mt-6 block text-center text-sm">
        {t('jp.backToRanking')}
      </Link>
      <Nav />
    </HarborScene>
  );
}
