/**
 * Éternal Pose posé sur le pont de la page de connexion.
 *
 * ⚠️ §122 : ce n'est **pas** un visuel de l'œuvre. C'est un instrument de
 * navigation dessiné en formes géométriques — deux plateaux de bois tournés,
 * trois colonnes, une sphère de verre et une aiguille — comme le sont la roue
 * de gouvernail, le coffre et le chapeau de paille. Aucune planche, aucune
 * illustration, aucun élément protégé n'est repris. La gravure du plateau dit
 * la destination, ce qui est le principe même de l'objet.
 *
 * Le verre est rendu par deux dégradés et un reflet en arc : une sphère
 * opaque avec un liseré aurait lu comme une bille. Ce qui fait « verre », c'est
 * qu'on voie l'aiguille **au travers**, donc l'aiguille est dessinée entre le
 * fond de la sphère et son reflet.
 *
 * Aucune image, aucun téléchargement : quelques centaines d'octets de SVG,
 * nets à toutes les tailles.
 */
export function EternalPose({
  className,
  destination = 'LAUGH TALE',
}: {
  className?: string;
  /** Gravure du plateau supérieur. */
  destination?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 150"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="pose-wood" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#6b3f1e" />
          <stop offset="28%" stopColor="#a9713c" />
          <stop offset="52%" stopColor="#c68d51" />
          <stop offset="78%" stopColor="#8b5629" />
          <stop offset="100%" stopColor="#59331a" />
        </linearGradient>
        <linearGradient id="pose-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d29b5f" />
          <stop offset="60%" stopColor="#a86e39" />
          <stop offset="100%" stopColor="#7a4a22" />
        </linearGradient>
        <radialGradient id="pose-glass" cx="35%" cy="28%" r="75%">
          <stop offset="0%" stopColor="rgba(255,255,255,.85)" />
          <stop offset="42%" stopColor="rgba(206,232,244,.32)" />
          <stop offset="100%" stopColor="rgba(120,165,196,.42)" />
        </radialGradient>
      </defs>

      {/* --- Plateau supérieur, vu de trois quarts ------------------------ */}
      <ellipse cx="60" cy="20" rx="46" ry="14" fill="#7a4a22" />
      <ellipse cx="60" cy="17" rx="46" ry="14" fill="url(#pose-top)" />
      {/* Rosace gravée au centre du plateau. */}
      <g fill="none" stroke="rgba(72,40,14,.45)" strokeWidth="1.1">
        <ellipse cx="60" cy="16" rx="30" ry="8.5" />
        <ellipse cx="60" cy="16" rx="17" ry="4.8" />
        <ellipse cx="60" cy="16" rx="6" ry="1.9" />
      </g>

      {/* Tranche du plateau, sur laquelle court la gravure. */}
      <path d="M14 17v9a46 14 0 0 0 92 0v-9a46 14 0 0 1-92 0Z" fill="url(#pose-wood)" />
      {/*
        La destination est gravée dans la tranche. `textLength` la contraint à
        la largeur du bois : une chaîne plus longue se resserre au lieu de
        déborder sur les colonnes.
      */}
      <text
        x="60"
        y="30"
        textAnchor="middle"
        fontSize="7.5"
        letterSpacing="1.6"
        fontFamily="var(--font-poster), Georgia, serif"
        fill="#4a2a10"
        textLength="62"
        lengthAdjust="spacingAndGlyphs"
      >
        {destination}
      </text>

      {/* --- Colonnes ------------------------------------------------------ */}
      {[22, 60, 98].map((x) => (
        <g key={x}>
          <rect x={x - 5} y="32" width="10" height="82" rx="3" fill="url(#pose-wood)" />
          {/* Renflements tournés : trois bagues suffisent à faire « tourné ». */}
          <ellipse cx={x} cy="40" rx="7" ry="4" fill="url(#pose-top)" />
          <ellipse cx={x} cy="73" rx="7.5" ry="4.2" fill="url(#pose-top)" />
          <ellipse cx={x} cy="106" rx="7" ry="4" fill="url(#pose-top)" />
        </g>
      ))}

      {/* --- Sphère de verre ----------------------------------------------- */}
      <circle cx="60" cy="74" r="31" fill="url(#pose-glass)" />

      {/* Aiguille, suspendue à l'axe. Elle est dessinée **dans** la sphère,
          entre le fond et le reflet : c'est ce qui fait lire le verre. */}
      <line x1="60" y1="44" x2="60" y2="70" stroke="#3b2410" strokeWidth="1.6" />
      <path d="M60 74 96 68 60 78Z" fill="#e6edf3" stroke="#9db3c4" strokeWidth="0.6" />
      <path d="M60 74 30 80 60 70Z" fill="#c9302c" stroke="#8d1f1c" strokeWidth="0.6" />
      <circle cx="60" cy="74" r="3" fill="#4a2a10" />

      {/* Reflet : un arc clair en haut à gauche, et rien d'autre. Un halo
          complet ferait bille de verre pleine. */}
      <path
        d="M40 60a24 24 0 0 1 16-14"
        fill="none"
        stroke="rgba(255,255,255,.75)"
        strokeWidth="3.4"
        strokeLinecap="round"
      />

      {/* --- Socle --------------------------------------------------------- */}
      <ellipse cx="60" cy="126" rx="50" ry="15" fill="url(#pose-top)" />
      <path d="M10 126v8a50 15 0 0 0 100 0v-8a50 15 0 0 1-100 0Z" fill="url(#pose-wood)" />
      <g fill="none" stroke="rgba(72,40,14,.4)" strokeWidth="1.1">
        <ellipse cx="60" cy="125" rx="34" ry="9.5" />
        <ellipse cx="60" cy="125" rx="19" ry="5.3" />
      </g>

      {/* Ombre portée sur les planches. */}
      <ellipse cx="60" cy="142" rx="46" ry="7" fill="rgba(80,46,12,.32)" />
    </svg>
  );
}
