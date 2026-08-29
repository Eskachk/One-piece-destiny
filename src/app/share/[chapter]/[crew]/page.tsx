import type { Metadata } from 'next';
import Link from 'next/link';
import { CHARACTER_INDEX } from '@/data/characters';
import { teamRisk } from '@/domain/risk';
import type { Character } from '@/domain/types';

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
  const { chapter } = await params;
  return {
    title: `Ma prédiction — Chapitre ${chapter}`,
    description: 'Le chapitre est le spectacle. Ta prédiction est le jeu.',
    openGraph: { title: `Ma prédiction — Chapitre ${chapter}` },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ chapter: string; crew: string }>;
}) {
  const { chapter, crew } = await params;

  const picked = decodeURIComponent(crew)
    .split(',')
    .map((id) => CHARACTER_INDEX.get(id.trim()))
    .filter((c): c is Character => c !== undefined)
    .slice(0, 3);

  const risk = teamRisk(picked);

  return (
    <main className="mx-auto w-full max-w-[430px] px-5 py-12">
      <p className="text-xs uppercase tracking-[0.25em] text-turquoise">
        Grand Line Weekly
      </p>
      <h1 className="mt-1 font-display text-3xl text-parchment">
        Chapitre {chapter}
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
          Risk {risk.value} / 100 · {risk.band}
        </p>
      )}

      {/* Aucun score n'apparaît : la carte se partage avant la sortie du
          chapitre, l'afficher en ferait un canal de spoiler (§3). */}
      <p className="mt-6 text-sm text-parchment/60">🔒 Prédiction verrouillée</p>

      <Link
        href="/"
        className="transition-quick mt-8 block rounded-xl bg-treasure px-4 py-3 text-center font-semibold text-abyss"
      >
        Faire ma propre prédiction
      </Link>
    </main>
  );
}
