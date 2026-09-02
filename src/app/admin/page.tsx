import type { Metadata } from 'next';
import Link from 'next/link';
import { AppearanceImportForm } from '@/components/AppearanceImportForm';
import { ChapterCorrection } from '@/components/ChapterCorrection';
import { ChapterSimulator } from '@/components/ChapterSimulator';
import { ChapterNumberControls } from '@/components/ChapterNumberControls';
import { OpenChapterForm } from '@/components/OpenChapterForm';
import { isTeamEditable, spoilerState } from '@/domain/chapter/lock';
import { requireAdmin } from '@/lib/auth/guards';
import { getRepository, PERSISTENCE_MODE } from '@/lib/repository';
import { chapterAnchorIsStored, getChapterAnchor } from '@/lib/settings/anchor';
import { Nav } from '@/components/Nav';

export const dynamic = 'force-dynamic';

/** Le HQ ne doit jamais être indexé (cahier §105 : /admin est privé). */
/**
 * Titre neutre, et ce n’est pas un oubli.
 *
 * Les métadonnées de Next sont résolues indépendamment du rendu : quand
 * `requireAdmin` déclenche `notFound()`, le contenu devient bien une page
 * introuvable — mais le `<title>` déjà calculé, lui, subsiste. Un visiteur
 * anonyme recevait donc un 404 intitulé du nom exact de la page, ce qui
 * confirme précisément ce que ce 404 est censé taire (§105).
 *
 * Le titre reste donc celui du site. `robots` interdit l’indexation.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/** Ligne du Health Dashboard (cahier §82). */
function Check({ label, done }: { label: string; done: boolean }) {
  return (
    <li className="flex items-center justify-between border-b border-turquoise/10 py-2">
      <span className="text-sm text-parchment/80">{label}</span>
      <span className={done ? 'text-turquoise' : 'text-orange'}>
        {done ? '✅' : '⚠️'}
      </span>
    </li>
  );
}

export default async function AdminPage() {
  const session = await requireAdmin();

  const repository = getRepository();

  // L'ancrage part avec le chapitre : les deux branches de cette page
  // l'affichent, et les enchaîner ajouterait un aller-retour à un écran déjà
  // bavard.
  const [chapter, anchor, anchorIsStored] = await Promise.all([
    repository.getCurrentChapter(),
    getChapterAnchor(),
    chapterAnchorIsStored(),
  ]);

  // `<input type="date">` attend AAAA-MM-JJ, pas un instant ISO complet.
  const anchorDay = anchor.weekOf.toISOString().slice(0, 10);

  // Aucun chapitre ouvert : on propose d'en ouvrir un — et on garde l'accès
  // à la correction du dernier chapitre publié, qui n'est plus « courant »
  // mais reste corrigeable (§79).
  if (!chapter) {
    const proposed = await repository.proposeNextChapterNumber();
    const lastPublished = await repository.getLatestPublishedChapter();
    return (
      <main className="hb-page mx-auto w-full max-w-3xl px-5 py-8">
        <p className="text-xs uppercase tracking-[0.25em] text-turquoise">
          One Piece Quest
        </p>
        <h1 className="font-display text-3xl text-parchment">Poste de commandement</h1>

      <nav className="mt-4 flex gap-3 text-sm">
        <Link href="/admin/stats" className="text-turquoise underline">Statistiques</Link>
        <Link href="/admin/fraude" className="text-turquoise underline">Fraude</Link>
      </nav>

        <nav className="mt-4 flex gap-3 text-sm">
          <Link href="/admin/stats" className="text-turquoise underline">Statistiques</Link>
          <Link href="/admin/fraude" className="text-turquoise underline">Fraude</Link>
        </nav>

        <p className="mt-4 rounded-lg border border-turquoise/25 bg-navy/50 p-3 text-sm text-parchment/70">
          Connecté en administrateur —{' '}
          <span className="text-parchment">{session.email}</span>
        </p>

        <section className="mt-8 max-w-md rounded-xl border border-turquoise/20 bg-navy/40 p-5">
          <h2 className="text-xs uppercase tracking-widest text-parchment/60">
            Aucun chapitre ouvert
          </h2>
          <div className="mt-4">
            <OpenChapterForm proposed={proposed} />
          </div>
        </section>

        <section className="mt-6 max-w-md rounded-xl border border-turquoise/20 bg-navy/40 p-5">
          <h2 className="text-xs uppercase tracking-widest text-parchment/60">
            Numéro de chapitre
          </h2>
          <div className="mt-4">
            <ChapterNumberControls
              openChapterNumber={null}
              anchor={{ chapterNumber: anchor.chapterNumber, weekOf: anchorDay }}
              anchorIsStored={anchorIsStored}
            />
          </div>
        </section>

        {lastPublished && (
          <section className="mt-6 max-w-md rounded-xl border border-orange/25 bg-navy/40 p-5">
            <h2 className="text-xs uppercase tracking-widest text-parchment/60">
              Correction (§79)
            </h2>
            <div className="mt-4">
              <ChapterCorrection chapterNumber={lastPublished.chapterNumber} />
            </div>
          </section>
        )}
        <Nav />
      </main>
    );
  }

  const now = new Date();

  const teams = await repository.listTeams(chapter.id);
  const appearances = await repository.getAppearances(chapter.id);
  const leaderboard = await repository.getLeaderboard(chapter.id);

  const teamsLocked = !isTeamEditable(chapter, now);
  const published = chapter.status === 'RESULTS_PUBLISHED';

  return (
    <main className="hb-page mx-auto w-full max-w-3xl px-5 py-8">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] text-turquoise">
          One Piece Quest
        </p>
        <h1 className="font-display text-3xl text-parchment">Poste de commandement</h1>
      </header>

      <p className="mt-4 flex items-center justify-between rounded-lg border border-turquoise/25 bg-navy/50 p-3 text-sm text-parchment/70">
        <span>
          Connecté en administrateur — <span className="text-parchment">{session.email}</span>
        </span>
        <span className="text-turquoise">MFA active</span>
      </p>

      {PERSISTENCE_MODE === 'memory' && (
        <p className="mt-3 rounded-lg border border-orange/40 bg-orange/10 p-3 text-sm text-parchment/80">
          Persistance en mémoire : les données sont perdues au redémarrage du
          serveur.
        </p>
      )}

      <section className="mt-8 rounded-xl border border-turquoise/20 bg-navy/40 p-5">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-parchment/60">
              Current event
            </p>
            <p className="font-display text-2xl text-parchment">
              Chapitre {chapter.chapterNumber}
            </p>
          </div>
          <span className="font-mono text-xs text-turquoise">
            {chapter.status}
          </span>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-parchment/50">Verrouillage</dt>
            <dd className="font-mono text-parchment/90">
              {chapter.teamLockAt.toISOString()}
            </dd>
          </div>
          <div>
            <dt className="text-parchment/50">Équipes</dt>
            <dd className="font-mono text-treasure">{teams.length}</dd>
          </div>
          <div>
            <dt className="text-parchment/50">Moteur de score</dt>
            <dd className="font-mono text-parchment/90">
              {chapter.scoringVersion}
            </dd>
          </div>
          <div>
            <dt className="text-parchment/50">Anti-spoiler</dt>
            <dd className="font-mono text-parchment/90">
              {spoilerState(chapter)}
            </dd>
          </div>
        </dl>
      </section>

      {/*
        Maîtrise du numéro de chapitre.

        Placée juste après l'état du chapitre courant : c'est en le lisant qu'on
        s'aperçoit qu'il est faux, et c'est à ce moment-là qu'on veut le
        corriger. L'enterrer en bas de page reviendrait à demander de chercher.
      */}
      <section className="mt-6 rounded-xl border border-turquoise/20 bg-navy/40 p-5">
        <h2 className="text-xs uppercase tracking-widest text-parchment/60">
          Numéro de chapitre
        </h2>
        <div className="mt-4">
          <ChapterNumberControls
            openChapterNumber={chapter.chapterNumber}
            anchor={{ chapterNumber: anchor.chapterNumber, weekOf: anchorDay }}
            anchorIsStored={anchorIsStored}
          />
        </div>
      </section>

      {/* Health Dashboard (cahier §82) */}
      <section className="mt-6 rounded-xl border border-turquoise/20 bg-navy/40 p-5">
        <h2 className="text-xs uppercase tracking-widest text-parchment/60">
          Health dashboard
        </h2>
        <ul className="mt-3">
          <Check label="Apparitions validées" done={appearances.length > 0} />
          <Check label="Équipages verrouillés" done={teamsLocked} />
          <Check label="Résultats publiés" done={published} />
        </ul>
        <p className="mt-4 text-sm">
          <span className="text-parchment/60">Ready to publish : </span>
          <span
            className={
              appearances.length > 0 && teamsLocked && !published
                ? 'text-turquoise'
                : 'text-danger'
            }
          >
            {appearances.length > 0 && teamsLocked && !published ? '✅' : '❌'}
          </span>
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-turquoise/20 bg-navy/40 p-5">
        <h2 className="text-xs uppercase tracking-widest text-parchment/60">
          Chapter data
        </h2>
        <div className="mt-4">
          <AppearanceImportForm
            teamsLocked={teamsLocked}
            alreadyPublished={published}
          />
        </div>
      </section>

      {/* Chapter Simulator (cahier §80, §81) */}
      <section className="mt-6 rounded-xl border border-turquoise/20 bg-navy/40 p-5">
        <h2 className="text-xs uppercase tracking-widest text-parchment/60">
          Simulation
        </h2>
        <div className="mt-4">
          <ChapterSimulator />
        </div>
      </section>

      {published && (
        <section className="mt-6 rounded-xl border border-orange/25 bg-navy/40 p-5">
          <h2 className="text-xs uppercase tracking-widest text-parchment/60">
            Correction (§79)
          </h2>
          <div className="mt-4">
            <ChapterCorrection chapterNumber={chapter.chapterNumber} />
          </div>
        </section>
      )}

      {leaderboard.length > 0 && (
        <section className="mt-6 rounded-xl border border-turquoise/20 bg-navy/40 p-5">
          <h2 className="text-xs uppercase tracking-widest text-parchment/60">
            Classement calculé
          </h2>
          <ol className="mt-3 space-y-1 font-mono text-sm">
            {leaderboard.slice(0, 20).map((row, index) => (
              <li key={row.playerId} className="flex justify-between">
                <span className="text-parchment/70">
                  #{index + 1} {row.handle}
                </span>
                <span className="text-treasure">{row.total} pts</span>
              </li>
            ))}
          </ol>
        </section>
      )}
      <Nav />
    </main>
  );
}
