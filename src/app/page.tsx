import type { Metadata } from 'next';
import Link from 'next/link';
import { logoutAction } from '@/app/actions/auth';
import { Countdown } from '@/components/Countdown';
import { CrewSelector } from '@/components/CrewSelector';
import { HarborScene } from '@/components/HarborScene';
import { islandOf } from '@/domain/islands';
import { Nav } from '@/components/Nav';
import { Tutorial } from '@/components/Tutorial';
import { traduire } from '@/lib/i18n';
import { CHARACTER_INDEX } from '@/data/characters';
import {
  attributesOf,
  catalogueAttributs,
} from '@/domain/collection/attributes';
import type { Character } from '@/domain/types';
import { isTeamEditable, msUntilLock, spoilerState } from '@/domain/chapter/lock';
import { redirect } from 'next/navigation';
import { getAuthenticatedSession } from '@/lib/auth/session-store';
import {
  getCachedCurrentChapter,
  getCachedRecurrences,
} from '@/lib/cache';
import { PronosticPanel } from '@/components/PronosticPanel';
import { sansReponse } from '@/domain/chapter/pronostics';
import { questionsDe, reponsesDe } from '@/lib/chapter/questions';
import { getRepository } from '@/lib/repository';
import { AdBanner } from '@/components/AdBanner';

/**
 * Home (cahier §55). Elle doit rester extrêmement simple : le joueur doit
 * comprendre en quelques secondes qu'il construit une stratégie, pas une
 * simple liste de personnages.
 *
 * Rendu côté serveur pour le SEO (§106) et pour que la décision de
 * verrouillage vienne de l'horloge serveur (§76).
 */
/**
 * Rendu à chaque requête, jamais prérendu : un prérendu statique figerait
 * `teamLockAt` et `now` au moment du build, ce qui viderait de son sens la
 * décision de verrouillage côté serveur (cahier §76).
 */
export const dynamic = 'force-dynamic';

/**
 * La page la plus importante du site n'avait aucune métadonnée propre.
 *
 * Elle héritait du titre et de la description du gabarit racine, donc les
 * mêmes que quatre autres pages. Elle est pourtant la seule en tête du
 * sitemap, avec la priorité maximale.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await traduire();
  return {
    title: { absolute: t('home.meta.title') },
    description: t('home.meta.description'),
    // URL de référence. Sans elle, une même page atteinte avec un paramètre
    // de campagne ou depuis un domaine d'aperçu compte comme plusieurs pages,
    // et le signal se divise entre elles.
    alternates: { canonical: '/' },
  };
}

/**
 * HUD capitaine (cahier §54), présent quel que soit l'état du chapitre.
 *
 * Plus de cas anonyme : la page redirige vers la connexion avant d'arriver
 * ici. Garder la branche entretiendrait l'idée qu'elle peut se produire.
 */
async function Hud() {
  const { t } = await traduire();
  return (
    <header className="flex items-center justify-between">
      <span className="hb-eyebrow">{t('brand')}</span>
      <form action={logoutAction}>
        <button type="submit" className="hb-link" style={{ fontSize: '0.78rem' }}>
          {t('action.signOut')}
        </button>
      </form>
    </header>
  );
}

export default async function HomePage() {
  /*
   * ## Trois vagues d'allers-retours devenaient deux
   *
   * La page enchaînait : session, **puis** chapitre, **puis** équipage et
   * inventaire, **puis** récurrences, **puis** pronostics. Cinq attentes dont
   * trois se suivaient sans avoir à se suivre.
   *
   * Un aller-retour vers Supabase coûte de cent à cent-quatre-vingts
   * millisecondes depuis la plateforme — mesuré par la sonde de santé. Trois
   * vagues, c'est un tiers de seconde d'attente que personne n'a demandée.
   *
   * Le chapitre courant et les récurrences ne dépendent **pas** de qui
   * regarde : ils partent maintenant en même temps que la session. Les deux
   * sont en cache partagé, mais un cache froid coûte le même aller-retour que
   * le reste — et c'est précisément au premier visiteur après une purge qu'on
   * doit la page la plus rapide possible.
   */
  const [session, chapter, recurrence] = await Promise.all([
    getAuthenticatedSession(),
    getCachedCurrentChapter(),
    getCachedRecurrences(),
  ]);

  // Visiteur non connecté : la connexion **est** la page d'accueil.
  //
  // Le jeu n'a rien à montrer d'utile sans compte — on ne peut ni enregistrer
  // un équipage, ni figurer au classement. Afficher un sélecteur inerte avec
  // une invitation à se connecter faisait perdre un clic à tout le monde.
  //
  // La redirection a lieu **côté serveur**, avant tout rendu : rien de la page
  // de jeu n'est envoyé à un visiteur anonyme.
  if (!session) redirect('/login');
  const { t } = await traduire();

  const repository = getRepository();

  // Entre deux chapitres, la home ne raconte pas d'histoire : elle le dit.
  // Le reste du produit doit rester accessible — collection, profil et Market
  // ne dépendent pas d'un chapitre en cours.
  if (!chapter) {
    return (
      <HarborScene variant="page" island={islandOf('/')}>
        <Hud />
        <h1 className="hb-title mt-5">{t('home.noChapter.title')}</h1>
        <p className="hb-card mt-4 text-sm">{t('home.noChapter.body')}</p>
        <AdBanner />
        <Nav />
        <Tutorial page="accueil" />
      </HarborScene>
    );
  }

  const now = new Date();
  const editable = isTeamEditable(chapter, now);
  const spoiler = spoilerState(chapter);

  /*
   * La seconde et dernière vague.
   *
   * Les quatre lectures ne dépendent que de `chapter.id` et de
   * `session.playerId`, connus depuis la première vague. Les pronostics
   * étaient lus **après** l'équipage alors que rien ne les en empêchait : une
   * troisième attente pour une page qui n'en avait besoin que de deux.
   */
  const [team, ownedIds, questions, mesReponses] = await Promise.all([
    repository.getTeam(session.playerId, chapter.id),
    repository.getOwnedCharacterIds(session.playerId),
    questionsDe(chapter.id),
    reponsesDe(chapter.id, session.playerId),
  ]);
  const savedCrewIds = team?.characterIds ?? [];

  // Seuls les personnages possédés sont alignables. La liste est construite
  // ici, côté serveur : le client ne la déduit pas, et l'action
  // d'enregistrement revalide de toute façon la propriété (§99).
  const possedes = ownedIds
    .map((id) => CHARACTER_INDEX.get(id))
    .filter((character): character is Character => character !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  /*
   * Les attributs voyagent en **identifiants**, pas en objets.
   *
   * Le libellé et le pictogramme partent une seule fois, dans le catalogue
   * ci-dessous, au lieu d'être répétés sur chaque personnage. Et rien de tout
   * cela n'est recalculé côté client : `attributesOf` tire la table des
   * signatures physiques.
   */
  /*
   * Les pronostics de la semaine, **sans la bonne réponse**.
   *
   * `sansReponse` retire la colonne avant l'envoi ; elle n'est pas seulement
   * omise de l'affichage. Ce qui part dans la charge d'une page rendue par le
   * serveur est lisible par quiconque ouvre les outils de développement, et
   * une réponse connue d'avance est un spoiler du chapitre (§3).
   */
  const pronostics = sansReponse(questions).map((question) => ({
    id: question.id,
    prompt: question.prompt,
    options: question.options,
    choix: mesReponses.get(question.id) ?? null,
  }));

  const ownedCharacters = possedes.map((character) => ({
    ...character,
    attributs: attributesOf(character).map((attribut) => attribut.id),
    recurrence: recurrence.get(character.id),
  }));

  const catalogue = catalogueAttributs(possedes);

  return (
    <HarborScene variant="page" island={islandOf('/')}>
      <Hud />

      <section className="mt-5">
        <p className="hb-eyebrow">{t('home.chapter')}</p>
        <h1
          className="hb-title"
          style={{ fontSize: 'clamp(3rem, 14vw, 4.4rem)' }}
        >
          {chapter.chapterNumber}
        </h1>

        {/* Le compte à rebours est l'information la plus urgente de la page :
            il est sur bois, pas sur parchemin, pour peser davantage. */}
        <div className="hb-card hb-card--wood mt-4">
          <p className="hb-legend" style={{ color: '#f0d6a6' }}>
            {t('home.lock.title')}
          </p>
          <div className="mt-2">
            <Countdown
              deadlineIso={chapter.teamLockAt.toISOString()}
              initialRemainingMs={msUntilLock(chapter, now)}
            />
          </div>
          {editable && (
            <p className="mt-3 text-xs" style={{ color: '#f4dcb4' }}>
              {t('home.lock.warning')}
            </p>
          )}
        </div>

        {/* Anti-spoiler (cahier §3) : aucune apparition, aucun score et
            aucune statistique post-chapitre tant que rien n'est publié. */}
        {spoiler === 'SPOILER_LOCK' && (
          <p className="hb-muted mt-3 flex items-center gap-2 text-xs">
            <span aria-hidden>🔒</span>
            {t('home.spoiler')}
          </p>
        )}
      </section>

      <AdBanner />
      <Nav />

      {/*
        Les pronostics, sous l'équipage.

        C'est la seconde décision de la semaine et elle obéit à la même
        échéance : les mettre ailleurs qu'à côté de la première obligerait à
        aller les chercher.
      */}
      <PronosticPanel questions={pronostics} ouvert={editable} />

      <CrewSelector
        locked={!editable}
        savedCrewIds={savedCrewIds}
        authenticated
        chapterNumber={chapter.chapterNumber}
        owned={ownedCharacters}
        attributs={catalogue}
      />

      {/* Visite guidée d'arrivée. Elle décide seule si elle doit s'afficher —
          une seule fois, à la première visite — et se saute dès le premier
          écran. */}
      <Tutorial page="accueil" />
    </HarborScene>
  );
}
