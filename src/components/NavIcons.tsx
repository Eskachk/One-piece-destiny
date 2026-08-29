/**
 * Jeu d'icônes de la navigation.
 *
 * Elles remplacent les emoji, et le changement n'est pas cosmétique : un emoji
 * est **rendu par le système**, pas par le site. Le drapeau noir était un
 * rectangle sur Windows, la carte du monde n'avait pas la même couleur sur
 * Android et sur iPhone, et l'ancre changeait carrément de forme. Six symboles
 * dessinés au même trait, eux, se ressemblent partout.
 *
 * Règles communes à tout le jeu :
 *
 *   — grille de 24, trait de 1,9 px, extrémités et jointures arrondies ;
 *   — `currentColor` partout : l'icône prend la couleur de l'onglet, y compris
 *     quand celui-ci passe en actif sur fond doré ;
 *   — aucun aplat, ou presque : le trait tient à 20 px comme à 40 px.
 *
 * §122 : aucune forme reprise de l'œuvre. Ce sont des objets de marine —
 * gouvernail, coupe, carte, ancre, pièce, parchemin, longue-vue.
 */

interface IconProps {
  className?: string;
}

function Frame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

/**
 * Équipage — un gouvernail.
 *
 * C'est déjà l'emblème du site (il remplace le pavillon protégé sur la page
 * d'accueil) : le réutiliser ici fait de l'onglet « Équipage » le retour au
 * poste de commandement, et non un onglet de plus.
 */
export function IconCrew({ className }: IconProps) {
  return (
    <Frame className={className}>
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="8.2" />
      <path d="M12 3.8v-2M12 22.2v-2M3.8 12h-2M22.2 12h2" />
      <path d="M6.2 6.2 4.8 4.8M17.8 6.2l1.4-1.4M6.2 17.8l-1.4 1.4M17.8 17.8l1.4 1.4" />
    </Frame>
  );
}

/** Classement — une coupe posée sur son socle. */
export function IconRanking({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      {/* Anses : ce sont elles qui font lire « trophée » plutôt que « verre ». */}
      <path d="M7 5.5H4.5v1.8A3.2 3.2 0 0 0 7 10.4M17 5.5h2.5v1.8a3.2 3.2 0 0 1-2.5 3.1" />
      <path d="M12 14v3.5" />
      <path d="M8.5 20.5h7l-.8-3h-5.4l-.8 3Z" />
    </Frame>
  );
}

/** Collection — une carte pliée en trois volets, avec sa croix. */
export function IconCollection({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M9 4.2 3.5 6.4v13.4L9 17.6l6 2.2 5.5-2.2V4.2L15 6.4 9 4.2Z" />
      <path d="M9 4.2v13.4M15 6.4v13.4" />
      {/* La croix du trésor, seul élément qui n'est pas une pliure. */}
      <path d="M11 10.5l2 2M13 10.5l-2 2" />
    </Frame>
  );
}

/** Market — une ancre. Le commerce se fait au port. */
export function IconMarket({ className }: IconProps) {
  return (
    <Frame className={className}>
      <circle cx="12" cy="5" r="2.2" />
      <path d="M12 7.2v13" />
      <path d="M7.5 10h9" />
      <path d="M4.5 14.2a7.5 7.5 0 0 0 15 0" />
      <path d="M4.5 14.2h2.6M19.5 14.2h-2.6" />
    </Frame>
  );
}

/**
 * Boutique — une pièce frappée.
 *
 * Volontairement **différente** de l'ancre du Market : les deux onglets
 * traitent d'échange, et deux symboles voisins les rendraient interchangeables.
 * Ici l'argent réel, là le port.
 */
export function IconShop({ className }: IconProps) {
  return (
    <Frame className={className}>
      <circle cx="12" cy="12" r="8.2" />
      <circle cx="12" cy="12" r="4.6" />
      <path d="M12 9.4v5.2M10.2 10.6h3.6M10.2 13.4h3.6" />
    </Frame>
  );
}

/** Profil — un parchemin roulé. Le journal de bord du capitaine. */
export function IconProfile({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M6.5 4h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-10" />
      {/* Rouleau de gauche : deux arcs suffisent à suggérer l'enroulement. */}
      <path d="M6.5 4a2 2 0 0 0 0 4h2M6.5 20a2 2 0 0 0 0-4h2" />
      <path d="M9.5 9.5h6M9.5 12.5h6M9.5 15.5h3.5" />
    </Frame>
  );
}

/**
 * Administrateur — une longue-vue.
 *
 * L'outil de celui qui regarde loin et voit venir. Elle ne ressemble à aucune
 * autre icône de la barre : cet onglet n'apparaît que pour un seul compte, il
 * ne doit pas se confondre avec les autres au premier coup d'œil.
 */
export function IconAdmin({ className }: IconProps) {
  return (
    <Frame className={className}>
      <path d="M3.4 13.6 8 8.4l3.4 2.6-4.6 5.2a1.6 1.6 0 0 1-2.3.1l-1-.9a1.6 1.6 0 0 1-.1-2.3Z" />
      <path d="M8 8.4 13 3.6a1.6 1.6 0 0 1 2.3-.1l1.4 1.3a1.6 1.6 0 0 1 .1 2.3l-5.4 4.5" />
      <path d="M16.6 12.6v1.8M20.4 15.4l-1.6.8M19.4 20.4l-1-1.6" />
    </Frame>
  );
}
