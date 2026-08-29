/**
 * Chapeau de paille posé sur le bois de la barre de navigation.
 *
 * ⚠️ §122 : ce n'est **pas** un visuel de l'œuvre. C'est un chapeau de paille
 * dessiné en formes géométriques — calotte, bord, ruban rouge — comme le sont
 * la roue de gouvernail et le coffre. Aucune planche, aucune illustration,
 * aucun élément protégé n'est repris.
 *
 * Le tressage est fait de trois arcs concentriques plutôt que d'une texture :
 * il tient en quelques centaines d'octets, se met à l'échelle sans flou, et ne
 * demande aucun téléchargement.
 */
export function StrawHat({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 74"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="hat-straw" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f7d78a" />
          <stop offset="55%" stopColor="#e8b95c" />
          <stop offset="100%" stopColor="#c9923a" />
        </linearGradient>
        <linearGradient id="hat-brim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#efc873" />
          <stop offset="100%" stopColor="#b87f2e" />
        </linearGradient>
      </defs>

      {/* Bord, dessiné en premier : la calotte se pose dessus. */}
      <ellipse cx="60" cy="55" rx="56" ry="17" fill="url(#hat-brim)" />
      <ellipse cx="60" cy="52" rx="56" ry="16" fill="url(#hat-straw)" />

      {/* Calotte */}
      <path
        d="M28 52C28 30 40 14 60 14s32 16 32 38c0 6-14 9-32 9s-32-3-32-9Z"
        fill="url(#hat-straw)"
      />

      {/* Ruban rouge, la seule tache de couleur — et le repère qui fait lire
          « chapeau de paille » plutôt que « chapeau ». */}
      <path
        d="M28 47c0-3 14-6 32-6s32 3 32 6v6c0 3-14 6-32 6s-32-3-32-6Z"
        fill="#d22f27"
      />
      <path
        d="M28 47c0-3 14-6 32-6s32 3 32 6c0 1.5-14 4-32 4s-32-2.5-32-4Z"
        fill="#ee4b3f"
      />

      {/* Tressage : trois arcs, pas une texture. */}
      <g fill="none" stroke="rgba(140,92,24,.45)" strokeWidth="1.4">
        <path d="M34 44c6-20 14-28 26-28s20 8 26 28" />
        <path d="M39 36c5-13 11-18 21-18s16 5 21 18" />
        <path d="M46 28c4-7 8-10 14-10s10 3 14 10" />
      </g>

      {/* Ombre portée sur le bord, côté opposé à la lumière. */}
      <path
        d="M8 55c10 7 30 11 52 11s42-4 52-11c-6 9-27 15-52 15S14 64 8 55Z"
        fill="rgba(120,74,18,.35)"
      />
    </svg>
  );
}
