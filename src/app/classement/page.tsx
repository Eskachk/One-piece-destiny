import type { Metadata } from 'next';
import { HarborScene } from '@/components/HarborScene';
import {
  getCachedChapterAnalysis,
  getCachedChapterAwards,
  getCachedCurrentChapter,
  getCachedLatestPublishedChapter,
  getCachedLeaderboard,
} from '@/lib/cache';
import { Nav } from '@/components/Nav';
import Link from 'next/link';
import { CHARACTER_INDEX } from '@/data/characters';
import { spoilerState } from '@/domain/chapter/lock';
import { SpoilerVeil } from '@/components/SpoilerVeil';
import { readDisplaySettings } from '@/lib/settings/store';
import { percentileFromRank } from '@/domain/scoring/chapter-results';
import {
  AWARD_LABEL,
  type ChapterAnalysis,
  type SpecialAward,
} from '@/domain/scoring/chapter-analysis';
import type { CharacterScore } from '@/domain/scoring';
import { getAuthenticatedSession } from '@/lib/auth/session-store';
import { AdBanner } from '@/components/AdBanner';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Classement hebdomadaire',
  description:
    'Le classement de la semaine : meilleures prédictions, plus beaux paris et percentile de chaque capitaine.',
};

const MEDALS = ['🥇', '🥈', '🥉'];

const name = (characterId: string) =>
  CHARACTER_INDEX.get(characterId)?.name ?? characterId;

const percent = (ratio: number) => `${Math.round(ratio * 100)}%`;

/**
 * Classement hebdomadaire (cahier §17) et replay de performance (§65).
 *
 * Deux règles structurent cette page :
 *
 *   - rien ne s'affiche tant que les résultats ne sont pas publiés (§3) ;
 *   - les scores sont lus tels qu'ils ont été calculés, jamais recalculés à
 *     la consultation (§75).
 */
export default async function LeaderboardPage() {
  const session = await getAuthenticatedSession();

  // Le classement porte sur le dernier chapitre **publié**. S'il n'y en a pas
  // encore, on retombe sur le chapitre en cours pour afficher l'état
  // anti-spoiler — sinon le joueur ne verrait jamais les résultats d'un
  // chapitre qui vient d'être publié, puisqu'il n'est plus « courant ».
  // Les deux lectures sont partagées par tous les joueurs : elles passent par
  // le cache, purgé explicitement à la publication et à la correction.
  const chapter =
    (await getCachedLatestPublishedChapter()) ?? (await getCachedCurrentChapter());

  if (!chapter) {
    return (
      <HarborScene variant="page">
        <h1 className="hb-title">
          Classement hebdomadaire
        </h1>
        <p className="hb-card mt-5 text-sm">
          Aucun chapitre en cours.
        </p>
        <AdBanner />
        <Nav />
      </HarborScene>
    );
  }

  // Anti-spoiler : avant publication, la page existe mais ne révèle rien.
  if (spoilerState(chapter) === 'SPOILER_LOCK') {
    return (
      <HarborScene variant="page">
        <h1 className="hb-title">
          Classement hebdomadaire
        </h1>
        <p className="hb-card mt-5 text-sm">
          🔒 Les résultats du chapitre {chapter.chapterNumber} ne sont pas encore
          publiés. Rien n&apos;est révélé avant la sortie officielle.
        </p>
        <AdBanner />
        <Nav />
      </HarborScene>
    );
  }

  // Trois requêtes indépendantes, lancées ensemble : enchaînées, elles
  // cumulaient trois allers-retours sur la page consultée par tout le monde
  // en même temps, le dimanche soir.
  const [leaderboard, rawAnalysis, awards, display] = await Promise.all([
    getCachedLeaderboard(chapter.id),
    getCachedChapterAnalysis(chapter.id),
    getCachedChapterAwards(chapter.id),
    readDisplaySettings(),
  ]);
  const analysis = rawAnalysis as ChapterAnalysis | null;

  const myIndex = session
    ? leaderboard.findIndex((row) => row.playerId === session.playerId)
    : -1;
  const mine = myIndex >= 0 ? leaderboard[myIndex] : null;
  const percentile =
    myIndex >= 0 ? percentileFromRank(myIndex + 1, leaderboard.length) : null;

  return (
    <HarborScene variant="page">
      <p className="hb-eyebrow">
        Chapitre {chapter.chapterNumber}
      </p>
      <h1 className="hb-title mt-1">Prime hebdomadaire</h1>

      {/* Voile personnel (paramètres). Distinct du verrou du §3 : celui-ci
          intervient après publication, pour le joueur qui n'a pas encore lu le
          chapitre. Tout ce qui suit révèle des apparitions. */}
      <SpoilerVeil
        active={display.spoilerShield}
        label={`Afficher les résultats du chapitre ${chapter.chapterNumber}`}
      >

      {/* Position personnelle : le percentile parle plus qu'un rang absolu. */}
      {mine && (
        <section className="hb-card hb-card--wood mt-5">
          <p className="hb-legend">
            Ta position
          </p>
          <p className="hb-title" style={{ fontSize: '2.6rem' }}>#{myIndex + 1}</p>
          <p className="hb-num mt-1">{mine.total} pts</p>
          {percentile !== null && (
            <p className="mt-3 text-sm">
              Top <span className="hb-num">{percentile}%</span>{' '}
              sur {leaderboard.length} capitaine
              {leaderboard.length > 1 ? 's' : ''}
            </p>
          )}
        </section>
      )}

      {/* Replay de performance (cahier §65) */}
      {mine && Array.isArray(mine.breakdown) && (
        <section className="mt-6">
          <h2 className="hb-legend">
            Comment ton équipage a performé
          </h2>
          <ul className="mt-3 space-y-3">
            {(mine.breakdown as CharacterScore[]).map((score) => (
              <li
                key={score.characterId}
                className="hb-card"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold">
                    {CHARACTER_INDEX.get(score.characterId)?.name ??
                      score.characterId}
                  </span>
                  <span className="hb-num">{score.total} pts</span>
                </div>
                <ul className="hb-muted mt-2 space-y-0.5 text-xs">
                  {score.breakdown.map((line, index) => (
                    <li key={index}>{line}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Analyse post-chapitre (cahier §64) */}
      {analysis && (
        <section className="mt-8">
          <h2 className="hb-legend">
            Chapitre {chapter.chapterNumber} — analyse
          </h2>
          <dl className="mt-3 space-y-2">
            {(
              [
                [
                  'Le plus choisi',
                  analysis.mostPicked &&
                    `${name(analysis.mostPicked.characterId)} — ${percent(analysis.mostPicked.pickRate)}`,
                ],
                [
                  'Meilleur rendement',
                  analysis.bestPerformer &&
                    `${name(analysis.bestPerformer.characterId)} — ${analysis.bestPerformer.points} pts`,
                ],
                [
                  'Plus belle surprise',
                  analysis.biggestSurprise &&
                    `${name(analysis.biggestSurprise.characterId)} — ${analysis.biggestSurprise.points} pts, choisi par ${percent(analysis.biggestSurprise.pickRate)}`,
                ],
                [
                  'Piège de la semaine',
                  analysis.biggestTrap &&
                    `${name(analysis.biggestTrap.characterId)} — ${analysis.biggestTrap.points} pts malgré ${percent(analysis.biggestTrap.pickRate)} de sélection`,
                ],
                ['Score moyen', String(analysis.averageScore)],
                ['Score médian', String(analysis.medianScore)],
              ] as const
            ).map(([label, value]) =>
              value ? (
                <div key={String(label)} className="hb-tile">
                  <dt className="hb-legend">
                    {label}
                  </dt>
                  <dd className="text-sm font-semibold">{value}</dd>
                </div>
              ) : null,
            )}
          </dl>
        </section>
      )}

      {/* Classements spécialisés (cahier §18) */}
      {awards.length > 0 && (
        <section className="mt-8">
          <h2 className="hb-legend">
            Distinctions
          </h2>
          <ul className="mt-3 space-y-1">
            {awards.map((award) => (
              <li
                key={award.award}
                className="hb-tile flex items-baseline justify-between"
              >
                <span className="hb-legend">
                  {AWARD_LABEL[award.award as SpecialAward] ?? award.award}
                </span>
                <span className="text-sm font-semibold">
                  {award.handle ?? award.playerId.slice(0, 8)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="hb-legend">
          Classement
        </h2>

        {leaderboard.length === 0 ? (
          <p className="hb-muted mt-3 text-sm">
            Aucune équipe classée pour ce chapitre.
          </p>
        ) : (
          <ol className="mt-3 space-y-1">
            {leaderboard.slice(0, 50).map((row, index) => {
              const isMine = row.playerId === session?.playerId;
              return (
                <li
                  key={row.playerId}
                  className={`flex items-baseline justify-between rounded-lg px-3 py-2 ${
                    isMine ? 'hb-row hb-row--mine' : 'hb-row'
                  }`}
                >
                  <span className="text-sm">
                    <span className="hb-muted mr-2 font-mono">
                      {MEDALS[index] ?? `#${index + 1}`}
                    </span>
                    {row.handle}
                  </span>
                  <span className="hb-num text-sm">
                    {row.total}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      </SpoilerVeil>

      <Link href="/" className="hb-link mt-6 block text-center text-sm">
        Retour à l&apos;équipage
      </Link>

      {/* La barre d'onglets manquait sur ce retour — celui que voient tous les
          joueurs le dimanche soir, une fois les résultats publiés. On sortait
          du classement par le lien de bas de page ou par le bouton retour du
          navigateur. */}
      <AdBanner />
      <Nav />
    </HarborScene>
  );
}
