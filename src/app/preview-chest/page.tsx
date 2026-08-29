import { notFound } from 'next/navigation';
import { ChestOpening } from '@/components/chest3d/ChestOpening';
import type { RevealedCard } from '@/app/actions/collection';

export const dynamic = 'force-dynamic';

/** Page de vérification visuelle, indisponible hors développement. */
export default function PreviewChestPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  // Le nom est fourni ici comme il l'est par le serveur en vrai : la
  // cérémonie ne cherche jamais dans le référentiel.
  const legendary: RevealedCard[] = [
    { characterId: 'shanks', name: 'Shanks', rarity: 'MYTHIC', duplicate: false, shards: 0 },
    { characterId: 'luffy', name: 'Monkey D. Luffy', rarity: 'LEGENDARY', duplicate: true, shards: 200 },
    { characterId: 'koby', name: 'Koby', rarity: 'RARE', duplicate: false, shards: 0 },
    { characterId: 'nami', name: 'Nami', rarity: 'EPIC', duplicate: false, shards: 0 },
    { characterId: 'helmeppo', name: 'Helmeppo', rarity: 'COMMON', duplicate: false, shards: 0 },
  ];

  return (
    <main className="mx-auto w-full max-w-[430px] px-5 py-10">
      <h1 className="font-display text-2xl text-parchment">Aperçu coffre</h1>
      <div className="mt-6 rounded-xl border border-turquoise/25 bg-navy/40 p-5">
        <ChestOpening cards={legendary} />
      </div>
    </main>
  );
}
