import type { Metadata } from 'next';
import { HarborScene } from '@/components/HarborScene';
import { islandOf } from '@/domain/islands';
import {
  getCachedChapterAnalysis,
  getCachedChapterAwards,
  getCachedCurrentChapter,
  getCachedLatestPublishedChapter,
  getCachedLeaderboardSize,
  getCachedLeaderboardTop,
} from '@/lib/cache';
import { Nav } from '@/components/Nav';
import { Tutorial } from '@/components/Tutorial';
import Link from 'next/link';
import { CHARACTER_INDEX } from '@/data/characters';
import { spoilerState } from '@/domain/chapter/lock';
import { SpoilerVeil } from '@/components/SpoilerVeil';
import { readDisplaySettings } from '@/lib/settings/store';
import { percentileFromRank } from '@/domain/scoring/chapter-results';
import type { ChapterAnalysis, SpecialAward } from '@/domain/scoring/chapter-analysis';
import { traduire } from '@/lib/i18n';
import { traduireDetailScore } from '@/domain/i18n/detail-score';
import type { MessageKey } from '@/domain/i18n/locales';
import type { CharacterScore } from '@/domain/scoring';
import { getAuthenticatedSession } from '@/lib/auth/session-store';
import { getRepository } from '@/lib/repository';
import { AdBanner } from '@/components/AdBanner';
import { LeaguePanel, type LigueVue } from '@/components/LeaguePanel';
import { LIGUES_ACTIVES, classer } from '@/domain/league/league';
import { classementLigue, liguesDe } from '@/lib/league/repository';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await traduire();
  return {
    // URL de référence. Sans elle, une même page atteinte avec un
    // paramètre de campagne, une barre oblique finale ou depuis un
    // domaine d'aperçu compte comme plusieurs pages, et le signal se
    // divise entre elles.
    alternates: { canonical: '/classement' },
    title: t('lb.meta.title'),
    description: t('lb.meta.description'),
  };
}

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
  /*
   * Session et chapitre publié partent ensemble.
   *
   * Le second ne dépend pas de qui regarde : le classement porte sur le même
   * chapitre pour tout le monde. Il était pourtant lu après la session, ce qui
   * ajoutait un aller-retour — de 80 à 130 ms depuis la plateforme — sur la
   * page que tout le jeu consulte le dimanche soir, en même temps.
   */
  const [session, publie, { t, tn }] = await Promise.all([
    getAuthenticatedSession(),
    getCachedLatestPublishedChapter(),
    traduire(),
  ]);

  // Le classement porte sur le dernier chapitre **publié**. S'il n'y en a pas
  // encore, on retombe sur le chapitre en cours pour afficher l'état
  // anti-spoiler — sinon le joueur ne verrait jamais les résultats d'un
  // chapitre qui vient d'être publié, puisqu'il n'est plus « courant ».
  // Les deux lectures sont partagées par tous les joueurs : elles passent par
  // le cache, purgé explicitement à la publication et à la correction.
  /*
   * Le chapitre courant n'est lu **que** faute de chapitre publié — le cas du
   * tout début, ou entre deux publications. Le demander systématiquement
   * ferait payer une lecture inutile à toutes les semaines ordinaires.
   */
  const chapter = publie ?? (await getCachedCurrentChapter());

  /*
   * Les ligues du visiteur, et leur classement pour le dernier chapitre publié.
   *
   * Lecture **personnelle** : elle ne passe pas par le cache partagé, où elle
   * serait servie à un autre joueur. Un aller-retour par ligue, cinq au plus —
   * c'est le plafond de `MAX_LIGUES_PAR_JOUEUR`, et c'est pour cela qu'il
   * existe.
   *
   * `LIGUES_ACTIVES` est à `false` : la fonctionnalité est complète mais
   * gardée pour une mise à jour ultérieure, et rien n'est lu tant qu'elle
   * dort. Tout ce qui suit décrit l'agencement voulu à la réouverture.
   *
   * Elle est faite **avant** les deux retours anticipés ci-dessous, et le
   * panneau est rendu dans les trois branches. La première version ne le
   * rendait que dans la dernière : tant qu'aucun chapitre n'était publié, la
   * page sortait par le verrou anti-spoiler et les ligues privées étaient
   * purement inaccessibles — c'est-à-dire exactement pendant la semaine où l'on
   * en crée une. Le classement d'une ligue peut être vide ; la ligue, non.
   */
  const ligues =
    LIGUES_ACTIVES && session
      ? await chargerLigues(session.playerId, publie?.id ?? null)
      : null;

  const panneauLigues = ligues !== null && (
    <LeaguePanel
      ligues={ligues}
      moi={session?.playerId ?? null}
      chapitre={publie?.chapterNumber ?? null}
    />
  );

  if (!chapter) {
    return (
      <HarborScene variant="page" island={islandOf('/classement')}>
        <h1 className="hb-title">{t('lb.title')}</h1>
        <p className="hb-card mt-5 text-sm">{t('lb.noChapter')}</p>
        {panneauLigues}
        <AdBanner />
        <Tutorial page="classement" />
        <Nav />
      </HarborScene>
    );
  }

  // Anti-spoiler : avant publication, la page existe mais ne révèle rien.
  if (spoilerState(chapter) === 'SPOILER_LOCK') {
    return (
      <HarborScene variant="page" island={islandOf('/classement')}>
        <h1 className="hb-title">{t('lb.title')}</h1>
        <p className="hb-card mt-5 text-sm">
          {t('lb.locked', { n: chapter.chapterNumber })}
        </p>
        {panneauLigues}
        <AdBanner />
        <Tutorial page="classement" />
        <Nav />
      </HarborScene>
    );
  }

  /*
   * Cinq lectures indépendantes, lancées ensemble.
   *
   * Les quatre premières sont **partagées** — identiques pour tout le monde,
   * donc mises en cache et purgées à la publication. La cinquième est
   * personnelle : le rang, le total et le détail du visiteur. Elle n'entre
   * jamais dans le cache partagé, où elle serait servie à un autre joueur.
   *
   * Cette séparation est ce qui remplace l'ancien chargement du classement
   * entier. On lisait toutes les lignes, `breakdown` de chacun compris, pour
   * en afficher cinquante et retrouver la sienne par `findIndex` — et on
   * mettait le tout en cache, jusqu'à ce que Next refuse l'entrée devenue trop
   * lourde et cesse silencieusement de cacher quoi que ce soit.
   */
  const [top, total, rawAnalysis, awards, display, mine] = await Promise.all([
    getCachedLeaderboardTop(chapter.id),
    getCachedLeaderboardSize(chapter.id),
    getCachedChapterAnalysis(chapter.id),
    getCachedChapterAwards(chapter.id),
    readDisplaySettings(),
    session
      ? getRepository().getPlayerChapterResult(chapter.id, session.playerId)
      : Promise.resolve(null),
  ]);
  const analysis = rawAnalysis as ChapterAnalysis | null;

  const percentile = mine ? percentileFromRank(mine.rank, total) : null;

  return (
    <HarborScene variant="page" island={islandOf('/classement')}>
      <p className="hb-eyebrow">{t('lb.chapter', { n: chapter.chapterNumber })}</p>
      <h1 className="hb-title mt-1">{t('lb.bounty')}</h1>

      {/* Voile personnel (paramètres). Distinct du verrou du §3 : celui-ci
          intervient après publication, pour le joueur qui n'a pas encore lu le
          chapitre. Tout ce qui suit révèle des apparitions. */}
      <SpoilerVeil
        active={display.spoilerShield}
        label={t('lb.veil', { n: chapter.chapterNumber })}
      >

      {/* Position personnelle : le percentile parle plus qu'un rang absolu. */}
      {mine && (
        <section className="hb-card hb-card--wood mt-5">
          <p className="hb-legend">{t('lb.mine')}</p>
          <p className="hb-title" style={{ fontSize: '2.6rem' }}>#{mine.rank}</p>
          <p className="hb-num mt-1">{t('lb.pts', { n: mine.total })}</p>
          {percentile !== null && (
            <p className="mt-3 text-sm">
              {tn('lb.percentile', total, { p: percentile })}
            </p>
          )}
        </section>
      )}

      {/* Replay de performance (cahier §65) */}
      {mine && Array.isArray(mine.breakdown) && (
        <section className="mt-6">
          <h2 className="hb-legend">{t('lb.replay')}</h2>
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
                  <span className="hb-num">{t('lb.pts', { n: score.total })}</span>
                </div>
                <ul className="hb-muted mt-2 space-y-0.5 text-xs">
                  {score.breakdown.map((line, index) => (
                    <li key={index}>{traduireDetailScore(t, line)}</li>
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
          <h2 className="hb-legend">{t('lb.analysis', { n: chapter.chapterNumber })}</h2>
          <dl className="mt-3 space-y-2">
            {(
              [
                [
                  t('lb.analysis.mostPicked'),
                  analysis.mostPicked &&
                    t('lb.analysis.pick', {
                      name: name(analysis.mostPicked.characterId),
                      rate: percent(analysis.mostPicked.pickRate),
                    }),
                ],
                [
                  t('lb.analysis.best'),
                  analysis.bestPerformer &&
                    t('lb.analysis.points', {
                      name: name(analysis.bestPerformer.characterId),
                      n: analysis.bestPerformer.points,
                    }),
                ],
                [
                  t('lb.analysis.surprise'),
                  analysis.biggestSurprise &&
                    t('lb.analysis.surpriseValue', {
                      name: name(analysis.biggestSurprise.characterId),
                      n: analysis.biggestSurprise.points,
                      rate: percent(analysis.biggestSurprise.pickRate),
                    }),
                ],
                [
                  t('lb.analysis.trap'),
                  analysis.biggestTrap &&
                    t('lb.analysis.trapValue', {
                      name: name(analysis.biggestTrap.characterId),
                      n: analysis.biggestTrap.points,
                      rate: percent(analysis.biggestTrap.pickRate),
                    }),
                ],
                [t('lb.analysis.average'), String(analysis.averageScore)],
                [t('lb.analysis.median'), String(analysis.medianScore)],
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
          <h2 className="hb-legend">{t('lb.awards')}</h2>
          <ul className="mt-3 space-y-1">
            {awards.map((award) => (
              <li
                key={award.award}
                className="hb-tile flex items-baseline justify-between"
              >
                <span className="hb-legend">
                  {t(`award.${award.award as SpecialAward}` as MessageKey)}
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
        <h2 className="hb-legend">{t('lb.ranking')}</h2>

        {top.length === 0 ? (
          <p className="hb-muted mt-3 text-sm">
            {t('lb.empty')}
          </p>
        ) : (
          <ol className="mt-3 space-y-1">
            {top.map((row, index) => {
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

      {/*
        Les ligues, **hors du voile anti-spoiler**.

        Le voile masque ce que le chapitre a révélé — qui est apparu, combien de
        points. Un rang entre amis n'en dit rien : on peut savoir qu'on est
        deuxième sur cinq sans rien apprendre du contenu du chapitre. Les
        ranger derrière le voile obligerait à se spoiler pour voir sa ligue.

        La section n'apparaît qu'aux joueurs connectés : une ligue est
        attachée à un compte.
      */}
      {panneauLigues}

      <Link href="/" className="hb-link mt-6 block text-center text-sm">
        {t('lb.back')}
      </Link>

      {/* La barre d'onglets manquait sur ce retour — celui que voient tous les
          joueurs le dimanche soir, une fois les résultats publiés. On sortait
          du classement par le lien de bas de page ou par le bouton retour du
          navigateur. */}
      <AdBanner />
      <Tutorial page="classement" />
      <Nav />
    </HarborScene>
  );
}

/**
 * Assemble les ligues du joueur et leur classement.
 *
 * Le rang est calculé **ici, côté serveur** : le client reçoit une liste déjà
 * ordonnée. Décider qui a gagné n'est jamais le travail du navigateur.
 */
async function chargerLigues(
  playerId: string,
  /** Le dernier chapitre publié, ou `null` s'il n'y en a aucun. */
  chapterId: string | null,
): Promise<LigueVue[]> {
  const mesLigues = await liguesDe(playerId);

  // Sans chapitre publié, il n'y a rien à classer — mais les ligues existent
  // déjà, et le joueur doit pouvoir les créer, les rejoindre et les quitter.
  if (chapterId === null) {
    return mesLigues.map((ligue) => ({ ...ligue, classement: [], absents: [] }));
  }

  return Promise.all(
    mesLigues.map(async (ligue) => {
      const classement = await classementLigue(playerId, ligue.id, chapterId);
      return {
        ...ligue,
        classement: classement ? classer(classement.joues) : [],
        absents: classement?.absents ?? [],
      };
    }),
  );
}
