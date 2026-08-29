import { HarborScene } from '@/components/HarborScene';
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
    <HarborScene variant="page">
      {/* `aria-busy` plutôt qu'un texte « Chargement… » : un lecteur d'écran
          annonce l'état de la région, sans qu'on ajoute une ligne de texte que
          les autres devraient voir clignoter à chaque navigation. */}
      <div aria-busy="true" aria-live="polite">
        <span className="sr-only">Chargement de la page…</span>

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
