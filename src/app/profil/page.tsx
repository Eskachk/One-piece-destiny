import type { Metadata } from 'next';
import Link from 'next/link';
import { HarborScene } from '@/components/HarborScene';
import { Nav } from '@/components/Nav';
import { collectionSummary } from '@/domain/collection/sets';
import { CHARACTERS } from '@/data/characters';
import { deriveStyle, MIN_WEEKS_FOR_STYLE, STYLE_DESCRIPTION, STYLE_LABEL } from '@/domain/player/style';
import { DIVISION_LABEL, DIVISIONS, divisionRank } from '@/domain/season/divisions';
import { SEASON_01, seasonStanding } from '@/domain/season/season';
import {
  NotificationCenter,
  ReferralPanel,
} from '@/components/ProfileSocial';
import { AccountStatus } from '@/components/AccountStatus';
import { HouseRules } from '@/components/HouseRules';
import { NotificationPreferences } from '@/components/NotificationPreferences';
import { restrictionsForBirthDate } from '@/domain/compliance/age';
import {
  MAX_REWARDED_REFERRALS,
  REFERRAL_BERRIES_REFERRER,
  REFERRAL_MIN_CHAPTERS,
  SIGNUP_BERRIES_REFERRED,
  referralLink,
} from '@/domain/social/referral';
import { baseUrl } from '@/lib/email/templates';
import { db } from '@/lib/supabase-admin';
import { preferencesOf } from '@/lib/notifications/dispatch';
import { requireSession } from '@/lib/auth/guards';
import * as social from '@/lib/social/repository';
import { getRepository } from '@/lib/repository';
import { AdBanner } from '@/components/AdBanner';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Journal de bord',
  robots: { index: false, follow: false },
};

/**
 * Journal de bord (cahier §66) — profil du joueur.
 *
 * Rassemble ce qui donne une identité sur la durée : division (§19), saison
 * (§20), style de jeu (§16) et historique des prédictions. Rien ici n'influe
 * sur le score : c'est de la reconnaissance, pas de la puissance.
 */
export default async function ProfilePage() {
  const session = await requireSession();
  const repository = getRepository();

  const [divisionState, profiles, ownedIds] = await Promise.all([
    repository.getDivisionState(session.playerId),
    repository.getWeeklyProfiles(session.playerId),
    repository.getOwnedCharacterIds(session.playerId),
  ]);

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

  // Notifications (§108) et parrainage (§71) : uniquement avec une base.
  const available = social.isSocialAvailable();
  const notifications = available
    ? (await social.listNotifications(session.playerId)).map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        href: n.href,
        read: n.read,
        createdAt: n.createdAt.toLocaleDateString('fr-FR'),
      }))
    : [];
  // Le code est créé au premier affichage : le joueur ne doit pas avoir à
  // demander son propre lien d'invitation pour l'obtenir.
  const referralCode = available
    ? await social.ensureReferralCode(session.playerId)
    : null;
  const referralState = available
    ? await social.getReferralState(session.playerId)
    : { alreadyReferred: false, referredCount: 0 };
  const currentRank = divisionRank(divisionState.division);
  const preferences = await preferencesOf(session.playerId);

  // Etat du compte (§86, §114). Les restrictions sont recalculees ici, cote
  // serveur : le navigateur ne les recoit que pour affichage.
  const { data: account } = await db()
    .from('user_accounts')
    .select('email_verified_at, birth_date, players!inner(handle)')
    .eq('player_id', session.playerId)
    .maybeSingle();

  // Le titre de la page affichait la partie locale de l'adresse e-mail. Le
  // joueur a maintenant un pseudo, choisi par lui : c'est celui-là qu'on
  // montre. Afficher une adresse — même tronquée — sur l'écran qu'on tend à
  // quelqu'un pour lui montrer sa collection n'était pas une bonne idée.
  const player = account?.players as unknown as { handle: string } | undefined;

  const restrictions = restrictionsForBirthDate(
    account?.birth_date ? new Date(`${account.birth_date}T00:00:00Z`) : null,
    new Date(),
  );

  return (
    <HarborScene variant="page">
      <p className="hb-eyebrow">
        Journal de bord
      </p>
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="hb-title mt-1">{player?.handle ?? 'Sans nom'}</h1>
        <Link href="/parametres" className="hb-link shrink-0 text-sm">
          Paramètres
        </Link>
      </div>

      {/* Style de jeu (§16) */}
      <section className="hb-card hb-card--wood mt-5">
        <p className="hb-legend">
          Ton style
        </p>
        <p className="hb-title" style={{ fontSize: '1.9rem' }}>
          {STYLE_LABEL[style.style]}
        </p>
        <p className="hb-muted mt-1 text-sm">
          {STYLE_DESCRIPTION[style.style]}
        </p>

        {style.weeks < MIN_WEEKS_FOR_STYLE && (
          <p className="hb-muted mt-2 text-xs">
            {MIN_WEEKS_FOR_STYLE - style.weeks} semaine
            {MIN_WEEKS_FOR_STYLE - style.weeks > 1 ? 's' : ''} de plus pour
            trancher.
          </p>
        )}

        {style.weeks > 0 && (
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div>
              <dt className="hb-legend">
                Risque
              </dt>
              <dd className="hb-num text-sm">
                {Math.round(style.averages.risk)}
              </dd>
            </div>
            <div>
              <dt className="hb-legend">
                Synergie
              </dt>
              <dd className="hb-num text-sm">
                {Math.round(style.averages.synergyShare * 100)}%
              </dd>
            </div>
            <div>
              <dt className="hb-legend">
                Popularité
              </dt>
              <dd className="hb-num text-sm">
                {Math.round(style.averages.averagePickRate * 100)}%
              </dd>
            </div>
          </dl>
        )}
      </section>

      {/* Division (§19) */}
      <section className="hb-card mt-5">
        <p className="hb-legend">
          Division
        </p>
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
            (currentRank === DIVISIONS.length - 1
              ? `${divisionState.promotionStreak} semaine(s) au sommet. Il n’y a plus de division au-dessus.`
              : `${divisionState.promotionStreak} semaine(s) en zone de promotion.`)}
          {divisionState.relegationStreak > 0 &&
            (currentRank === 0
              ? `${divisionState.relegationStreak} semaine(s) difficile(s) — mais East Blue est le point de départ, on n’en descend pas.`
              : `${divisionState.relegationStreak} semaine(s) en zone de relégation.`)}
          {divisionState.promotionStreak === 0 &&
            divisionState.relegationStreak === 0 &&
            (currentRank === DIVISIONS.length - 1
              ? 'Tu es au sommet. Reste dans le haut du classement pour t’y maintenir.'
              : 'Deux bonnes semaines consécutives pour monter.')}
        </p>
      </section>

      {/* Saison (§20) */}
      <section className="hb-card mt-5">
        <div className="flex items-baseline justify-between">
          <p className="hb-legend">
            {SEASON_01.name}
          </p>
          <p className="hb-num text-lg">{standing.total} pts</p>
        </div>

        <p className="hb-muted mt-2 text-sm">
          {standing.counted.length} / {SEASON_01.countedResults} résultats
          comptés · {standing.played} semaine
          {standing.played > 1 ? 's' : ''} jouée
          {standing.played > 1 ? 's' : ''}
        </p>

        {/* La règle qui évite qu'une absence ruine la saison mérite d'être
            dite au joueur, pas seulement appliquée. */}
        <p className="hb-muted mt-2 text-xs">
          Seuls tes {SEASON_01.countedResults} meilleurs résultats sur{' '}
          {SEASON_01.chapters} comptent : une semaine manquée ne ruine pas ta
          saison.
        </p>

        {standing.dropped.length > 0 && (
          <p className="hb-muted mt-1 text-xs">
            {standing.dropped.length} résultat(s) écarté(s).
          </p>
        )}
      </section>

      {/* Historique des prédictions */}
      {profiles.length > 0 && (
        <section className="mt-6">
          <h2 className="hb-legend">
            Historique
          </h2>
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
                  risque {Math.round(profile.risk)}
                  {profile.percentile !== null && ` · top ${profile.percentile}%`}
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
        Collection : {collection.owned} / {collection.total} ({collection.percent}
        %)
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
          restrictionReason={restrictions.reason}
        />
      </div>

      <div className="mt-6">
        <NotificationPreferences initial={preferences} />
      </div>

      <HouseRules />
      <AdBanner />
      <Nav />
    </HarborScene>
  );
}
