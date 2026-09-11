import type { Metadata } from 'next';
import Link from 'next/link';
import { CHARACTER_INDEX } from '@/data/characters';
import { lireChapitre, lireEquipage } from '@/domain/social/partage';
import { teamRisk } from '@/domain/risk';
import type { Character } from '@/domain/types';
import { traduire } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/**
 * Page de partage d'une prédiction (cahier §69).
 *
 * L'équipage voyage dans l'URL, pas en base : la carte est partageable par
 * quiconque reçoit le lien, sans exposer de compte ni nécessiter de session.
 * Rien de sensible n'y transite — seulement trois identifiants de personnages
 * déjà publics.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ chapter: string; crew: string }>;
}): Promise<Metadata> {
  const [{ chapter }, { t }] = await Promise.all([params, traduire()]);
  const numero = lireChapitre(chapter);
  const titre = numero ? t('share.meta.title', { n: numero }) : t('share.meta.title.none');

  return {
    title: titre,
    description: t('share.meta.description'),
    openGraph: { title: titre },
    /*
     * Hors index, et c'est une mesure de charge autant que de référencement.
     *
     * L'équipage voyage dans le chemin : l'espace d'adresses est infini, et
     * chacune coûte la génération d'une image. Un moteur qui suit ces liens
     * explore sans fond et fait payer chaque pas au serveur.
     *
     * `noindex` plutôt qu'un `Disallow` dans `robots.txt` : les robots des
     * réseaux sociaux respectent le second et cesseraient d'aller chercher la
     * carte, ce qui viderait le partage de son intérêt. La méta les laisse
     * passer et retire seulement la page de l'index.
     */
    robots: { index: false, follow: false },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ chapter: string; crew: string }>;
}) {
  const [{ chapter, crew }, { t }] = await Promise.all([params, traduire()]);
  // Même contrôle que dans la carte : le numéro est réaffiché, il doit être
  // un numéro. Un chemin quelconque devenait le titre de la page.
  const numero = lireChapitre(chapter);

  const picked = lireEquipage(crew)
    .map((id) => CHARACTER_INDEX.get(id))
    .filter((c): c is Character => c !== undefined)
    .slice(0, 3);

  const risk = teamRisk(picked);

  return (
    <main className="mx-auto w-full max-w-[430px] px-5 py-12">
      <p className="text-xs uppercase tracking-[0.25em] text-turquoise">
        One Piece Quest
      </p>
      <h1 className="mt-1 font-display text-3xl text-parchment">
        {numero ? t('share.chapter', { n: numero }) : t('share.meta.title.none')}
      </h1>

      <ul className="mt-6 space-y-2">
        {picked.map((character) => (
          <li
            key={character.id}
            className="flex items-baseline justify-between rounded-xl border border-turquoise/25 bg-navy/40 px-4 py-3"
          >
            <span className="text-parchment">{character.name}</span>
            <span className="text-[11px] uppercase tracking-wider text-treasure">
              {character.rarity}
            </span>
          </li>
        ))}
      </ul>

      {picked.length > 0 && (
        <p className="mt-4 font-mono text-sm text-parchment/70">
          {t('share.risk', { n: risk.value, band: risk.band })}
        </p>
      )}

      {/* Aucun score n'apparaît : la carte se partage avant la sortie du
          chapitre, l'afficher en ferait un canal de spoiler (§3). */}
      <p className="mt-6 text-sm text-parchment/60">{t('share.locked')}</p>

      <Link
        href="/"
        className="transition-quick mt-8 block rounded-xl bg-treasure px-4 py-3 text-center font-semibold text-abyss"
      >
        {t('share.cta')}
      </Link>
    </main>
  );
}
