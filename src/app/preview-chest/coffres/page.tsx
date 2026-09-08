import { notFound } from 'next/navigation';
import { ChestOpening } from '@/components/chest3d/ChestOpening';
import { attributesOf } from '@/domain/collection/attributes';
import { CHARACTER_INDEX } from '@/data/characters';
import type { RevealedCard } from '@/app/actions/collection';

export const dynamic = 'force-dynamic';

/**
 * Les deux coffres, seuls sur leur page.
 *
 * ## Pourquoi une page à part de `/preview-chest`
 *
 * L'aperçu principal rend quatre-vingt-dix-sept cartes avant d'arriver aux
 * coffres. Chacune porte une figurine en SVG, et l'hydratation de la page
 * devenait assez lourde pour **ne pas aboutir de façon fiable** : la scène 3D
 * restait à l'état d'attente, sans erreur, une fois sur deux. On ne peut pas
 * juger une animation qu'on n'arrive pas à faire démarrer.
 *
 * Ici, deux composants et rien d'autre. C'est aussi la seule façon de voir les
 * deux coffres se suivre — le port puis le royal — ce que le jeu interdit,
 * puisqu'on n'en ouvre jamais deux à la fois.
 */

const tirage = (ids: string[]): RevealedCard[] =>
  ids.flatMap((id) => {
    const personnage = CHARACTER_INDEX.get(id);
    // Un identifiant inconnu ne produit pas de carte factice : la cérémonie se
    // règle sur la meilleure rareté du tirage, et un « Commun » fantôme
    // fausserait exactement ce qu'on vient observer.
    if (!personnage) return [];
    return [
      {
        characterId: id,
        name: personnage.name,
        rarity: personnage.rarity,
        attributes: attributesOf(personnage),
        duplicate: false,
        shards: 0,
      },
    ];
  });

export default async function PreviewCoffresPage({
  searchParams,
}: {
  searchParams: Promise<{ royal?: string }>;
}) {
  if (process.env.NODE_ENV === 'production') notFound();

  const royal = (await searchParams).royal === '1';
  const cartes = tirage(['kaido', 'koby', 'helmeppo']);

  return (
    <main className="mx-auto w-full max-w-[430px] px-5 py-10">
      <h1 className="font-display text-2xl text-parchment">
        {royal ? 'Coffre royal' : 'Coffre du port'}
      </h1>
      <p className="mt-2 text-xs text-parchment/60">
        Même tirage, deux mises en scène. Le coffre du port tremble et
        sursaute ; le royal s&apos;élève, tourne, et rompt son cordage.
      </p>

      {/*
        Un seul coffre à l'écran, et c'est une contrainte technique autant
        qu'une fidélité au jeu.

        Deux `Canvas` sur la même page, ce sont deux contextes WebGL — et le
        navigateur en perd un : « THREE.WebGLRenderer: Context Lost », la scène
        se démonte, et l'on croit à un bogue de la cérémonie. En jeu on n'ouvre
        jamais deux coffres à la fois ; l'aperçu s'aligne, et l'on bascule par
        le lien ci-dessous.
      */}
      <nav className="mt-4 flex gap-3 text-sm">
        <a
          href="/preview-chest/coffres"
          className={royal ? 'hb-link' : 'hb-link font-bold'}
        >
          Port
        </a>
        <a
          href="/preview-chest/coffres?royal=1"
          className={royal ? 'hb-link font-bold' : 'hb-link'}
        >
          Royal
        </a>
      </nav>

      <div
        className={`mt-4 rounded-xl border bg-navy/40 p-5 ${
          royal ? 'border-gold/30' : 'border-turquoise/25'
        }`}
      >
        {/* La clé force un remontage au changement de coffre : sans elle,
            React réutiliserait la scène et la cérémonie ne repartirait pas. */}
        <ChestOpening key={royal ? 'royal' : 'port'} cards={cartes} royal={royal} />
      </div>
    </main>
  );
}
