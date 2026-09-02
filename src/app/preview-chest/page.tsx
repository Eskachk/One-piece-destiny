import { notFound } from 'next/navigation';
import { ChestOpening } from '@/components/chest3d/ChestOpening';
import { RarityCard } from '@/components/RarityCard';
import { IslandDecor } from '@/components/islands/IslandDecor';
import { IslandSky } from '@/components/islands/IslandSky';
import { ISLANDS, type IslandId } from '@/domain/islands';
import { CharacterArt } from '@/components/CharacterArt';
import { CHARACTERS } from '@/data/characters';
import { signatureOf } from '@/domain/collection/signatures';
import type { RevealedCard } from '@/app/actions/collection';

/** Les cartes dessinées en figurine, dans l'ordre du référentiel. */
const HEROS = CHARACTERS.filter(
  (c) => c.rarity === 'LEGENDARY' || c.rarity === 'MYTHIC',
);

export const dynamic = 'force-dynamic';

/** Page de vérification visuelle, indisponible hors développement. */
export default function PreviewChestPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  // Le nom est fourni ici comme il l'est par le serveur en vrai : la
  // cérémonie ne cherche jamais dans le référentiel.
  const legendary: RevealedCard[] = [
    { characterId: 'shanks', name: 'Shanks', rarity: 'MYTHIC', duplicate: false, shards: 0, attributes: [{ id: 'conqueror', symbol: '👑', label: 'Haki des Rois' }, { id: 'pirate', symbol: '🏴', label: 'Pirate' }] },
    { characterId: 'luffy', name: 'Monkey D. Luffy', rarity: 'LEGENDARY', duplicate: true, shards: 200, attributes: [{ id: 'conqueror', symbol: '👑', label: 'Haki des Rois' }, { id: 'fruit', symbol: '🍎', label: 'Fruit du démon' }] },
    { characterId: 'koby', name: 'Koby', rarity: 'RARE', duplicate: false, shards: 0, attributes: [{ id: 'marine', symbol: '⚓', label: 'Marine' }] },
    { characterId: 'nami', name: 'Nami', rarity: 'EPIC', duplicate: false, shards: 0, attributes: [{ id: 'navigator', symbol: '🧭', label: 'Navigation' }] },
    { characterId: 'helmeppo', name: 'Helmeppo', rarity: 'COMMON', duplicate: false, shards: 0, attributes: [{ id: 'marine', symbol: '⚓', label: 'Marine' }] },
  ];

  return (
    <main className="mx-auto w-full max-w-[430px] px-5 py-10">
      <h1 className="font-display text-2xl text-parchment">Aperçu coffre</h1>
      <div className="mt-6 rounded-xl border border-turquoise/25 bg-navy/40 p-5">
        <ChestOpening cards={legendary} />
      </div>

      {/*
        Les cinq niveaux d'illustration côte à côte.

        La cérémonie ne montre qu'un tirage à la fois, derrière une animation
        de plusieurs secondes : impossible d'y comparer un Épique et un
        Mythique. Ici les cinq raretés sont sur le même écran, ce qui est la
        seule façon de voir si la progression se lit — c'est tout l'intérêt de
        faire monter l'illustration avec la rareté.
      */}
      <h2 className="mt-10 font-display text-2xl text-parchment">
        Aperçu des cartes
      </h2>
      <ul className="mt-4 grid grid-cols-2 gap-2">
        {legendary.map((card) => (
          <li key={card.characterId}>
            <RarityCard
              characterId={card.characterId}
              name={card.name}
              rarity={card.rarity}
              attributes={card.attributes}
            />
          </li>
        ))}
      </ul>
      {/*
        Les huit décors d'île côte à côte.

        Chacun ne s'affiche autrement que sur sa propre page, et la plupart
        exigent une session : les comparer demandait de se connecter et de
        naviguer. Ici on voit d'un coup si une silhouette est reconnaissable —
        c'est la seule question qui compte pour un décor.

        Le cadre a exactement le rapport du dessin, 3 pour 1 : c'est aussi ce
        qu'on vérifie ici, qu'aucun décor ne déborde de sa `viewBox`.
      */}
      {/*
        Les cinquante-huit figurines côte à côte.

        C'est le seul moyen de répondre à la question qui compte : deux cartes
        différentes se distinguent-elles ? Le défaut d'origine ne se voyait pas
        carte par carte — chacune paraissait convenable — mais sautait aux yeux
        dès qu'on en posait dix l'une à côté de l'autre : c'étaient dix fois le
        même bonhomme.

        La description physique est affichée sous chaque figurine : on vérifie
        ainsi que le dessin dit bien ce que la signature annonce.
      */}
      <h2 className="mt-10 font-display text-2xl text-parchment">
        Figurines — Légendaires et Mythiques
      </h2>
      <ul className="mt-4 grid grid-cols-3 gap-2 md:grid-cols-4 xl:grid-cols-6">
        {HEROS.map((hero) => (
          <li
            key={hero.id}
            className="rounded-lg border border-turquoise/20 bg-navy/40 p-1.5"
          >
            <CharacterArt
              characterId={hero.id}
              rarity={hero.rarity}
              attributes={[]}
            />
            <p className="mt-1 text-[10px] leading-tight text-parchment/80">{hero.name}</p>
            <p className="text-[9px] leading-tight text-parchment/45">
              {signatureOf(hero.id)?.note}
            </p>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 font-display text-2xl text-parchment">
        Aperçu des îles
      </h2>
      <ul className="mt-4 space-y-4">
        {([
            'elbaf',
            'alabasta',
            'drum',
            'dressrosa',
            'fishman',
            'wano',
            'logue',
            'sabaody',
          ] as IslandId[]).map(
          (id) => (
            <li key={id}>
              <div
                data-island={id}
                className="overflow-hidden rounded-xl border border-turquoise/25"
              >
                {/* Cadre d'aperçu : le décor est en position absolue dans la
                    page réelle, il lui faut donc ici un conteneur qui lui donne
                    une hauteur. */}
                <div className="isl-preview">
                  {/* Le ciel d'abord : il est derrière la silhouette, comme
                      sur une vraie page. */}
                  <IslandSky island={id} />
                  <IslandDecor island={id} />
                  {/* L'ambiance fait partie de l'île autant que sa silhouette :
                      l'aperçu serait trompeur sans elle. */}
                  <div className="isl-fx" />
                  <span className="isl-name">{ISLANDS[id].name}</span>
                </div>
              </div>
              <ul className="mt-1 px-1 text-[11px] text-parchment/55">
                {ISLANDS[id].elements.map((element) => (
                  <li key={element}>· {element}</li>
                ))}
              </ul>
            </li>
          ),
        )}
      </ul>
    </main>
  );
}
