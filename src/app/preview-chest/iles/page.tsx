import { notFound } from 'next/navigation';
import { IslandDecor } from '@/components/islands/IslandDecor';
import { IslandSky } from '@/components/islands/IslandSky';
import { ISLANDS, type IslandId } from '@/domain/islands';

export const dynamic = 'force-dynamic';

/**
 * Les décors d'île, en grand et un par écran.
 *
 * ## Pourquoi une page de plus
 *
 * L'aperçu principal montre déjà les dix îles — mais dans des vignettes de
 * quelques centaines de pixels, derrière quatre-vingt-dix-sept cartes. On y
 * vérifie qu'un décor **existe** ; on n'y juge ni une lumière, ni une brume de
 * distance, ni un vol d'oiseaux qui met quarante secondes à traverser.
 *
 * Ici chaque île occupe toute la largeur, à la taille où un joueur la verra,
 * avec le ciel par-dessus le sol comme dans le produit. C'est la seule
 * disposition où l'on voit ce qu'on est en train de régler.
 *
 * Dev seulement, comme ses voisines : le `notFound` ci-dessous et la garde du
 * middleware ferment `/preview-chest/*` en production.
 */

const ORDRE: IslandId[] = [
  'harbor',
  'elbaf',
  'alabasta',
  'drum',
  'dressrosa',
  'fishman',
  'wano',
  'logue',
  'sabaody',
  'hq',
];

export default function PreviewIlesPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  return (
    <main className="px-4 py-8">
      <h1 className="font-display text-2xl text-parchment">Les îles, en grand</h1>
      <p className="mt-2 max-w-[60ch] text-xs text-parchment/60">
        Chaque décor à la taille où on le voit en jeu, ciel et sol superposés.
        Les mouvements sont lents à dessein — un vol traverse en quarante à
        quatre-vingts secondes — il faut donc regarder un moment.
      </p>

      <div className="mt-8 space-y-10">
        {ORDRE.map((id) => (
          <section key={id}>
            <h2 className="font-display text-lg text-parchment">
              {ISLANDS[id].name}{' '}
              <span className="font-mono text-xs text-parchment/40">{id}</span>
            </h2>

            {/*
              `data-island` et `.isl-preview` : ce sont eux qui posent le
              dégradé de ciel de l'île, exactement comme la coquille de la page
              réelle. Sans eux, les décors — tous semi-transparents — se
              lisaient sur le fond de nuit de l'administration, donc ternes et
              faux. Un aperçu qui ne montre pas ce que le joueur voit ne sert à
              rien.

              Les deux couches d'ambiance suivent dans l'ordre du produit.
            */}
            <div
              data-island={id}
              className="mt-2 overflow-hidden rounded-xl border border-turquoise/20"
            >
              <div className="isl-preview">
                <IslandSky island={id} />
                <IslandDecor island={id} />
                <div className="isl-lux">
                  <div className="isl-lux__nappes" />
                </div>
                <div className="isl-fx" />
              </div>
            </div>

            <ul className="mt-2 text-xs text-parchment/50">
              {ISLANDS[id].elements.map((e) => (
                <li key={e}>· {e}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
