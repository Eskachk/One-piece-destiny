/**
 * Emblèmes de la boutique.
 *
 * Un coffre dessiné pour les coffres, une bourse pour les Berries. Même trait
 * que les icônes de navigation — grille de 24, `currentColor` — pour que les
 * deux jeux se reconnaissent comme appartenant au même produit.
 *
 * Le coffre **reprend la silhouette du modèle 3D** : couvercle bombé, cadre,
 * fermoir central. Un joueur qui voit la fiche en boutique doit reconnaître
 * l'objet qu'il ouvrira ensuite ; deux dessins sans rapport auraient donné
 * l'impression de deux produits différents.
 *
 * §122 : formes génériques, rien de repris de l'œuvre.
 */

interface IconProps {
  className?: string;
}

/** Coffre ordinaire — couvercle bombé, cerclage, fermoir. */
export function IconChest({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {/* Voûte du couvercle */}
      <path d="M4 15a12 12 0 0 1 24 0" />
      {/* Corps */}
      <path d="M4 15v10a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V15" />
      {/* Cerclage horizontal, à la jonction couvercle / caisse */}
      <path d="M3 15h26" />
      {/* Cerclages verticaux */}
      <path d="M10 6.6V27M22 6.6V27" />
      {/* Fermoir */}
      <path d="M14.5 13h3v5h-3z" />
    </svg>
  );
}

/**
 * Coffre royal — même silhouette, plus une couronne.
 *
 * Volontairement **la même forme de base** : c'est un coffre, pas un autre
 * objet. La couronne dit « celui-là est particulier » sans qu'on ait à lire
 * le libellé.
 */
export function IconRoyalChest({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 17a12 12 0 0 1 24 0" />
      <path d="M4 17v9a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2v-9" />
      <path d="M3 17h26" />
      <path d="M10 9.2V28M22 9.2V28" />
      <path d="M14.5 15h3v5h-3z" />
      {/* Couronne posée sur la voûte */}
      <path d="M11.5 7.5 13 3l3 3 3-3 1.5 4.5z" />
    </svg>
  );
}

/** Bourse de Berries. */
export function IconPouch({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {/* Col de la bourse, resserré par un lien */}
      <path d="M12 8.5c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5" />
      <path d="M10.5 8.5h11" />
      {/* Corps */}
      <path d="M11 9c-3.5 2.4-6 6-6 10a8 8 0 0 0 8 8h6a8 8 0 0 0 8-8c0-4-2.5-7.6-6-10" />
      {/* Pièce */}
      <circle cx="16" cy="19.5" r="3.6" />
      <path d="M16 17.4v4.2M14.6 18.6h2.8M14.6 20.4h2.8" />
    </svg>
  );
}

/** Silhouette de personnage, pour le rayon dédié. */
export function IconCharacter({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {/* Carte */}
      <rect x="6" y="3.5" width="20" height="25" rx="2.5" />
      {/* Buste stylisé */}
      <circle cx="16" cy="13" r="3.6" />
      <path d="M9.8 24.5a6.5 6.5 0 0 1 12.4 0" />
    </svg>
  );
}
