import { HarborScene } from '@/components/HarborScene';
import { HatLoader } from '@/components/ChopperHat';
import { MainNav } from '@/components/MainNav';

/**
 * Écran d'attente de navigation (cahier §55, §60).
 *
 * Toutes les pages du jeu sont en `force-dynamic` : elles interrogent la base
 * à chaque affichage, parce que l'heure de verrouillage et le classement ne
 * peuvent pas être figés au build (§76). Next ne peut donc pas les
 * précharger entièrement — et sans ce fichier, un clic sur « Classement »
 * laissait la page précédente à l'écran, figée, le temps de l'aller-retour.
 * Rien ne bougeait : l'application paraissait bloquée, alors qu'elle
 * travaillait.
 *
 * Ce composant est, lui, **entièrement statique**. Next le précharge avec le
 * lien et l'affiche à l'instant du clic : le décor du port, la barre de
 * navigation avec le bon onglet actif, et des blocs à la place du contenu. La
 * page réelle vient les remplacer dès qu'elle est prête.
 *
 * La barre de navigation en fait partie **à dessein** : c'est le seul élément
 * commun à toutes les pages, et le voir survivre à la transition est ce qui
 * fait la différence entre « ça charge » et « ça a planté ».
 *
 * ## `decor={false}`
 *
 * Le squelette et la page qui arrive coexistent à l'écran le temps de la
 * transition. Avec le décor, celui-ci était donc monté en double — deux jeux
 * de SVG et huit animations plein écran — juste au moment où l'appareil a le
 * plus à faire. Et il montrait le port quelle que soit la destination, cet
 * écran ne la connaissant pas : on voyait le port clignoter avant Alabasta.
 *
 * Le ciel reste, sa teinte venant de la coquille : le fond ne bouge pas d'un
 * pixel entre l'attente et la page.
 */

/** Bloc gris à la place d'un contenu à venir. */
function Bar({ width, height = '1rem' }: { width: string; height?: string }) {
  return (
    <span
      className="hb-skeleton"
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

export default function Loading() {
  return (
    <HarborScene variant="page" decor={false}>
      {/* `aria-busy` plutôt qu'un texte « Chargement… » : un lecteur d'écran
          annonce l'état de la région, sans qu'on ajoute une ligne de texte que
          les autres devraient voir clignoter à chaque navigation. */}
      <div aria-busy="true" aria-live="polite">
        <span className="sr-only">Chargement de la page…</span>

        {/* Le seul moment du produit où l'on demande au joueur d'attendre est
            aussi le seul où une animation gagne sa place. Le chapeau frémit
            pendant la seconde où il n'y a rien à lire. */}
        <div className="hb-attente">
          <HatLoader className="hb-attente__chapeau" />
        </div>

        <Bar width="7rem" height="0.7rem" />
        <div className="mt-3">
          <Bar width="60%" height="2.4rem" />
        </div>

        <div className="hb-card mt-5">
          <Bar width="40%" height="0.7rem" />
          <div className="mt-3">
            <Bar width="100%" height="1.6rem" />
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="hb-card">
              <Bar width={`${75 - row * 9}%`} />
            </div>
          ))}
        </div>
      </div>

      <MainNav />
    </HarborScene>
  );
}
