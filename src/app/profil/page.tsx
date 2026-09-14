import type { Metadata } from 'next';
import Link from 'next/link';
import { HarborScene } from '@/components/HarborScene';
import { islandOf } from '@/domain/islands';
import { Nav } from '@/components/Nav';
import { Tutorial } from '@/components/Tutorial';
import { collectionSummary } from '@/domain/collection/sets';
import { CHARACTERS } from '@/data/characters';
import { deriveStyle, MIN_WEEKS_FOR_STYLE } from '@/domain/player/style';
import { traduire } from '@/lib/i18n';
import { libelleAge, libelleStyle, libelleStyleDescription } from '@/domain/i18n/libelles';
import { DIVISION_LABEL, DIVISIONS, divisionRank } from '@/domain/season/divisions';
import { SEASON_01, seasonStanding } from '@/domain/season/season';
import {
  NotificationCenter,
  ReferralPanel,
} from '@/components/ProfileSocial';
import { AccountStatus } from '@/components/AccountStatus';
import { HouseRules } from '@/components/HouseRules';
import { NotificationPreferences } from '@/components/NotificationPreferences';
import { bandOf } from '@/domain/compliance/age';
import {
  MAX_REWARDED_REFERRALS,
  REFERRAL_BERRIES_REFERRER,
  REFERRAL_MIN_CHAPTERS,
  SIGNUP_BERRIES_REFERRED,
  referralLink,
} from '@/domain/social/referral';
import { baseUrl } from '@/lib/email/templates';
import { lireProfil } from '@/lib/lectures';
import { requireSession } from '@/lib/auth/guards';
import * as social from '@/lib/social/repository';
import { AdBanner } from '@/components/AdBanner';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await traduire();
  return { title: t('pf.meta.title'), robots: { index: false, follow: false } };
}

/**
 * Journal de bord (cahier §66) — profil du joueur.
 *
 * Rassemble ce qui donne une identité sur la durée : division (§19), saison
 * (§20), style de jeu (§16) et historique des prédictions. Rien ici n'influe
 * sur le score : c'est de la reconnaissance, pas de la puissance.
 */
export default async function ProfilePage() {
  const [session, { t, tn, locale }] = await Promise.all([requireSession(), traduire()]);
  const available = social.isSocialAvailable();

  /*
   * Toutes les lectures de la page partent **ensemble** — et, depuis la
   * migration 0038, en **un seul** aller-retour (`lib/lectures.ts`) : sur le
   * palier de base actuel, chaque requête est prise sur un budget commun à
   * tous les joueurs, et le journal en dépensait dix.
   *
   * Le code de parrainage n'est créé que s'il manque encore — première
   * visite du journal — et c'est le seul cas où une seconde requête part.
   */
  const profil = await lireProfil(session.playerId);
  const divisionState = profil.division;
  const profiles = profil.profiles;
  const ownedIds = profil.ownedIds;
  const notificationsBrutes = profil.notifications;
  const referralCode =
    profil.referralCode ??
    (available ? await social.ensureReferralCode(session.playerId) : null);
  const referralState = profil.referralState;
  const preferences = profil.preferences;
  // État du compte (§86, §114). Les restrictions sont recalculées plus bas,
  // côté serveur : le navigateur ne les reçoit que pour affichage.
  const account = profil.account
    ? { email_verified_at: profil.account.emailVerifiedAt, birth_date: profil.account.birthDate }
    : null;

  const notifications = notificationsBrutes.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    href: n.href,
    read: n.read,
    createdAt: n.createdAt.toLocaleDateString(locale === 'en' ? 'en-GB' : 'fr-FR'),
  }));

  const currentRank = divisionRank(divisionState.division);

  const standing = seasonStanding(
    profiles.map((p) => ({ chapterNumber: p.chapterNumber, total: p.total })),
    SEASON_01,
  );

  const style = deriveStyle(
    profiles.map((p) => ({
      risk: p.risk,
      synergyShare: p.synergyShare,
      averagePickRate: p.averagePickRate,
    })),
  );

  const collection = collectionSummary(CHARACTERS, new Set(ownedIds));

  // Le titre de la page affichait la partie locale de l'adresse e-mail. Le
  // joueur a maintenant un pseudo, choisi par lui : c'est celui-là qu'on
  // montre. Afficher une adresse — même tronquée — sur l'écran qu'on tend à
  // quelqu'un pour lui montrer sa collection n'était pas une bonne idée.
  const player = profil.handle ? { handle: profil.handle } : undefined;

  const dateDeNaissance = account?.birth_date
    ? new Date(`${account.birth_date}T00:00:00Z`)
    : null;

  return (
    <HarborScene variant="page" island={islandOf('/profil')}>
      <p className="hb-eyebrow">{t('pf.eyebrow')}</p>
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="hb-title mt-1">{player?.handle ?? t('pf.noName')}</h1>
        <Link href="/parametres" className="hb-link shrink-0 text-sm">
          {t('pf.settings')}
        </Link>
      </div>

      {/* Style de jeu (§16) */}
      <section className="hb-card hb-card--wood mt-5">
        <p className="hb-legend">{t('pf.style')}</p>
        <p className="hb-title" style={{ fontSize: '1.9rem' }}>
          {libelleStyle(t, style.style)}
        </p>
        <p className="hb-muted mt-1 text-sm">{libelleStyleDescription(t, style.style)}</p>

        {style.weeks < MIN_WEEKS_FOR_STYLE && (
          <p className="hb-muted mt-2 text-xs">
            {tn('pf.style.more', MIN_WEEKS_FOR_STYLE - style.weeks)}
          </p>
        )}

        {style.weeks > 0 && (
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div>
              <dt className="hb-legend">{t('pf.style.risk')}</dt>
              <dd className="hb-num text-sm">
                {Math.round(style.averages.risk)}
              </dd>
            </div>
            <div>
              <dt className="hb-legend">{t('pf.style.synergy')}</dt>
              <dd className="hb-num text-sm">
                {Math.round(style.averages.synergyShare * 100)}%
              </dd>
            </div>
            <div>
              <dt className="hb-legend">{t('pf.style.popularity')}</dt>
              <dd className="hb-num text-sm">
                {Math.round(style.averages.averagePickRate * 100)}%
              </dd>
            </div>
          </dl>
        )}
      </section>

      {/* Division (§19) */}
      <section className="hb-card mt-5">
        <p className="hb-legend">{t('pf.division')}</p>
        <p className="hb-title" style={{ fontSize: '1.9rem' }}>
          {DIVISION_LABEL[divisionState.division]}
        </p>

        <ol className="mt-3 flex gap-1">
          {DIVISIONS.map((division, index) => (
            <li
              key={division}
              title={DIVISION_LABEL[division]}
              className={`h-1.5 flex-1 rounded-full ${
                index <= currentRank ? 'bg-[#f5c542]' : 'bg-[rgba(20,41,79,.18)]'
              }`}
            />
          ))}
        </ol>

        {/* Le texte doit tenir compte des extrémités : annoncer une relégation
            depuis la division la plus basse menacerait d'une conséquence que
            le moteur ne peut pas produire (`!atBottom`). */}
        <p className="hb-muted mt-3 text-xs">
          {divisionState.promotionStreak > 0 &&
            t(currentRank === DIVISIONS.length - 1 ? 'pf.division.top' : 'pf.division.promo', {
              n: divisionState.promotionStreak,
            })}
          {divisionState.relegationStreak > 0 &&
            t(currentRank === 0 ? 'pf.division.bottom' : 'pf.division.releg', {
              n: divisionState.relegationStreak,
            })}
          {divisionState.promotionStreak === 0 &&
            divisionState.relegationStreak === 0 &&
            t(currentRank === DIVISIONS.length - 1 ? 'pf.division.stayTop' : 'pf.division.climb')}
        </p>
      </section>

      {/* Saison (§20) */}
      <section className="hb-card mt-5">
        <div className="flex items-baseline justify-between">
          <p className="hb-legend">{t('pf.season', { n: '01' })}</p>
          <p className="hb-num text-lg">{t('pf.season.pts', { n: standing.total })}</p>
        </div>

        <p className="hb-muted mt-2 text-sm">
          {tn('pf.season.counted', standing.played, {
            counted: standing.counted.length,
            max: SEASON_01.countedResults,
          })}
        </p>

        {/* La règle qui évite qu'une absence ruine la saison mérite d'être
            dite au joueur, pas seulement appliquée. */}
        <p className="hb-muted mt-2 text-xs">
          {t('pf.season.rule', { max: SEASON_01.countedResults, chapters: SEASON_01.chapters })}
        </p>

        {standing.dropped.length > 0 && (
          <p className="hb-muted mt-1 text-xs">
            {t('pf.season.dropped', { n: standing.dropped.length })}
          </p>
        )}
      </section>

      {/* Historique des prédictions */}
      {profiles.length > 0 && (
        <section className="mt-6">
          <h2 className="hb-legend">{t('pf.history')}</h2>
          <ul className="mt-3 space-y-1">
            {profiles.slice(0, 12).map((profile) => (
              <li
                key={profile.chapterId}
                className="hb-row flex items-baseline justify-between"
              >
                <span className="font-mono text-sm">
                  #{profile.chapterNumber}
                </span>
                <span className="hb-muted text-xs">
                  {t('pf.history.risk', { n: Math.round(profile.risk) })}
                  {profile.percentile !== null && t('pf.history.top', { n: profile.percentile })}
                </span>
                <span className="hb-num text-sm">
                  {profile.total}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="hb-muted mt-6 text-sm">
        {t('pf.collection', {
          owned: collection.owned,
          total: collection.total,
          percent: collection.percent,
        })}
      </p>

      {available && (
        <>
          <NotificationCenter notifications={notifications} />
          <ReferralPanel
            link={referralCode ? referralLink(baseUrl(), referralCode) : null}
            referredCount={referralState.referredCount}
            referrerBerries={REFERRAL_BERRIES_REFERRER}
            referredBerries={SIGNUP_BERRIES_REFERRED}
            maxRewarded={MAX_REWARDED_REFERRALS}
            minChapters={REFERRAL_MIN_CHAPTERS}
          />
        </>
      )}

      <div className="mt-6">
        <AccountStatus
          verified={Boolean(account?.email_verified_at)}
          birthDate={account?.birth_date ?? null}
          restrictionReason={libelleAge(t, bandOf(dateDeNaissance, new Date()))}
        />
      </div>

      <div className="mt-6">
        <NotificationPreferences initial={preferences} />
      </div>

      <HouseRules />
      <AdBanner />
      <Tutorial page="profil" />
      <Nav />
    </HarborScene>
  );
}
