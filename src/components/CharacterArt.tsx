import type { Attribute } from '@/domain/collection/attributes';
import type { Rarity } from '@/domain/types';
import { RARITY_COLOR } from '@/domain/collection/rarity';
import {
  PIXEL_GRID,
  artLevelOf,
  emojiFor,
  paletteOf,
  pixelPortrait,
  spriteTraits,
  type PortraitPalette,
  type PortraitSubject,
  type SpriteTraits,
} from '@/domain/collection/portrait';
import { signatureOf } from '@/domain/collection/signatures';

/**
 * Illustration d'une carte (cahier §24, §122).
 *
 * Composant **serveur, sans une ligne de JavaScript client** : tout est du SVG
 * calculé au rendu. Les effets du Mythique sont des animations CSS, pas une
 * boucle en JavaScript — ils tournent donc sans occuper le fil principal, ce
 * qui compte quand une collection affiche cinquante cartes.
 *
 * §122 : aucun visuel de l'œuvre. La figurine est la **même** pour tout le
 * monde — une tête ovale, un manteau trapézoïdal, des membres rectangulaires.
 * Seuls ses couleurs et ses accessoires changent, d'après les faits
 * d'apparence rassemblés dans `domain/collection/signatures.ts`.
 */

/** Portrait en pixels — Épique. */
function PixelPortrait({
  grid,
  palette,
}: {
  grid: (string | null)[][];
  palette: PortraitPalette;
}) {
  return (
    <svg
      viewBox={`0 0 ${PIXEL_GRID} ${PIXEL_GRID}`}
      className="hb-art__svg"
      aria-hidden="true"
      focusable="false"
      // `crispEdges` : sans lui, le navigateur lisse les bords et un portrait
      // en pixels devient une tache floue — soit exactement le contraire de
      // l'effet recherché.
      shapeRendering="crispEdges"
    >
      <rect width={PIXEL_GRID} height={PIXEL_GRID} fill={palette.accent} opacity="0.14" />
      {grid.map((row, y) =>
        row.map((colour, x) =>
          colour === null ? null : (
            <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={colour} />
          ),
        ),
      )}
    </svg>
  );
}

/* ===========================================================================
   Figurine — Légendaire et Mythique.

   Repères fixes, valables pour toutes les pièces ci-dessous : la tête est
   centrée en (32, 18) et mesure 9 sur 10 ; les yeux sont à y = 18 ; le torse
   commence à y = 30 et s'arrête à 58 ; le sol est à y = 70.

   Tout ce qui couvre le front doit s'arrêter **au-dessus de 17**, sinon il
   mange les yeux — c'est le défaut qu'avait la première version, où une
   chevelure sombre recouvrait un regard sombre et la tête devenait une tache.
   =========================================================================== */

/** Chevelure **derrière** la tête : masse longue, queue, afro. */
function ArriereChevelure({ traits }: { traits: SpriteTraits }) {
  const { cut, hair } = traits;

  if (cut === 'afro') {
    // Une seule grosse masse, plus large que haute : un cercle parfait lit
    // comme un casque.
    return <ellipse cx="32" cy="13" rx="17" ry="15" fill={hair} />;
  }
  if (cut === 'long' || cut === 'wavy') {
    return <path d="M21 18c0-10 5-15 11-15s11 5 11 15v16c-4 2-18 2-22 0Z" fill={hair} />;
  }
  if (cut === 'ponytail') {
    return (
      <>
        <path d="M23 16c0-9 4-13 9-13s9 4 9 13v6c-3 1.5-15 1.5-18 0Z" fill={hair} />
        {/* La queue part de la nuque et retombe : sans la courbe, on lit une
            antenne. */}
        <path d="M41 14q7 2 6 12t-4 14q4-14-2-24Z" fill={hair} />
      </>
    );
  }
  if (cut === 'topknot') {
    return (
      <>
        <path d="M23 16c0-9 4-13 9-13s9 4 9 13v3c-3 1.5-15 1.5-18 0Z" fill={hair} />
        <ellipse cx="32" cy="3.5" rx="4.5" ry="3.5" fill={hair} />
      </>
    );
  }
  return null;
}

/** Ce qui couvre le front. Quatre formes suffisent à changer la silhouette. */
function Frange({ traits }: { traits: SpriteTraits }) {
  const { cut, hair } = traits;

  if (cut === 'bald') return null;

  if (cut === 'mohawk') {
    return (
      <>
        <path d="M23 15c0-7 4-11 9-11s9 4 9 11c-4 1.5-14 1.5-18 0Z" fill="#00000022" />
        <path d="M29 13c0-9 1.5-13 3-13s3 4 3 13c-2 1-4 1-6 0Z" fill={hair} />
      </>
    );
  }
  if (cut === 'spiky') {
    return <path d="M23 15 26 6l3 6 3-8 3 8 3-6 3 9c-4 1.5-14 1.5-18 0Z" fill={hair} />;
  }
  if (cut === 'wavy') {
    // Deux creux dans la frange : c'est ce qui distingue l'ondulé du lisse à
    // cette taille.
    return (
      <path d="M23 15c0-8 4-12 9-12s9 4 9 12c-3 2-4-2-6 0-2 2-4-2-6 0-2 1.6-4 1.6-6 0Z" fill={hair} />
    );
  }
  // Frange commune au court, au long, à la queue et au chignon.
  return <path d="M23 15c0-8 4-12 9-12s9 4 9 12c-4 1.5-14 1.5-18 0Z" fill={hair} />;
}

/** Le couvre-chef, posé par-dessus la chevelure. */
function Couvrechef({ traits, accent }: { traits: SpriteTraits; accent: string }) {
  const { head } = traits;
  // La couleur vient de la signature, **pas** de la rareté. Elle valait
  // `accent` faute de mieux : toutes les casquettes du jeu étaient donc du
  // même or, celle de Chopper comme celle de Law.
  const tissu = traits.accessory;

  switch (head) {
    case 'strawhat':
      return (
        <>
          <ellipse cx="32" cy="11" rx="17" ry="4.8" fill="#e8c87a" />
          <path d="M23 11c0-7 4-11 9-11s9 4 9 11c0 2-4 3-9 3s-9-1-9-3Z" fill="#e8c87a" />
          <rect x="23" y="8.6" width="18" height="2.8" fill={tissu} />
        </>
      );
    case 'brim':
      return (
        <>
          <ellipse cx="32" cy="11" rx="16" ry="4.4" fill={tissu} />
          <path d="M24 11c0-6.5 3.6-10 8-10s8 3.5 8 10c0 1.8-3.6 2.8-8 2.8s-8-1-8-2.8Z" fill={tissu} />
          <rect x="24" y="9" width="16" height="2.4" fill="#00000055" />
        </>
      );
    case 'tricorne':
      // Trois pointes relevées : c'est ce qui la distingue d'un chapeau rond.
      return (
        <path
          d="M15 13q6-11 17-11t17 11q-6-3-17-3T15 13Z"
          fill={tissu}
        />
      );
    case 'tophat':
      return (
        <>
          <ellipse cx="32" cy="8" rx="13" ry="3.4" fill={tissu} />
          <rect x="24" y="-6" width="16" height="14" rx="1" fill={tissu} />
          <rect x="24" y="4.4" width="16" height="2.6" fill={accent} opacity=".75" />
        </>
      );
    case 'cap':
      return (
        <>
          <path d="M23 12c0-7 4-11 9-11s9 4 9 11c-4 1.6-14 1.6-18 0Z" fill={tissu} />
          <path d="M41 11q7 0.5 8 3-8 1.5-8 0Z" fill={tissu} />
        </>
      );
    case 'bandana':
      return (
        <>
          <path d="M23 13.6q9 2.4 18 0v3q-9 2.4-18 0Z" fill={tissu} />
          <path d="M23 15q-5 1-6 4 4-1 6-2Z" fill={tissu} />
        </>
      );
    case 'horns':
      return (
        <>
          <path d="M24 8 20 -1l8 6Z" fill="#d8cfc0" />
          <path d="M40 8 44 -1l-8 6Z" fill="#d8cfc0" />
        </>
      );
    case 'crown':
      return <path d="M24 8 26 1l6 5 6-5 2 7q-8 2-16 0Z" fill="#e8c85a" />;
    case 'hood':
      // La capuche mange le haut du visage : c'est le propos.
      return (
        <>
          <path d="M19 26c0-16 6-24 13-24s13 8 13 24q-13 4-26 0Z" fill={traits.coat ?? '#1a1622'} />
          <ellipse cx="32" cy="19" rx="8" ry="8.5" fill="#00000066" />
        </>
      );
    case 'mask':
      return (
        <>
          <rect x="23" y="8" width="18" height="20" rx="6" fill="#2a2a33" />
          <rect x="26.5" y="15" width="3" height="6" rx="1.5" fill={accent} opacity=".85" />
          <rect x="34.5" y="15" width="3" height="6" rx="1.5" fill={accent} opacity=".85" />
        </>
      );
    default:
      return null;
  }
}

/** La marque du visage. Une seule : deux et la vignette sature. */
function Marque({ traits }: { traits: SpriteTraits }) {
  switch (traits.mark) {
    case 'scar-eye':
      return <path d="M27.6 13.6 27.6 23.4" stroke="#8a3a30" strokeWidth="1" strokeLinecap="round" />;
    case 'scar-face':
      return <path d="M24 24 41 13" stroke="#8a3a30" strokeWidth="1.1" strokeLinecap="round" />;
    case 'beard':
      return <path d="M24 21q8 12 16 0 1 10-8 12t-8-12Z" fill={traits.hair} />;
    case 'moustache':
      return <path d="M25 23q7 5 14 0-3 3.4-7 3.4T25 23Z" fill={traits.hair} />;
    case 'goatee':
      return <path d="M29.5 24.5h5v3.5q-2.5 1.5-5 0Z" fill={traits.hair} />;
    case 'cigarette':
      return (
        <>
          <rect x="36" y="23.2" width="8" height="1.4" rx="0.7" fill="#f2efe6" />
          <circle cx="44.4" cy="23.9" r="1" fill="#e8842c" />
        </>
      );
    case 'cigar':
      return (
        <>
          <rect x="36" y="22.6" width="10" height="2.4" rx="1.2" fill="#6a4a2a" />
          <circle cx="46.6" cy="23.8" r="1.3" fill="#e8842c" />
        </>
      );
    case 'glasses':
      return (
        <g fill="none" stroke="#2a2a33" strokeWidth="0.9">
          <circle cx="29" cy="19.2" r="3.1" />
          <circle cx="35" cy="19.2" r="3.1" />
          <path d="M32.1 19.2h-0.2" />
        </g>
      );
    case 'shades':
      return (
        <>
          <rect x="25.4" y="16.8" width="6" height="4" rx="1.4" fill="#1a1a22" />
          <rect x="32.6" y="16.8" width="6" height="4" rx="1.4" fill="#1a1a22" />
          <rect x="31.2" y="18.2" width="1.6" height="1" fill="#1a1a22" />
        </>
      );
    case 'blind':
      return <rect x="22.6" y="16.4" width="18.8" height="4.4" rx="1.4" fill="#e6e0d2" />;
    case 'freckles':
      return (
        <g fill="#a8623a" opacity=".7">
          {[
            [26.6, 22],
            [29, 23],
            [35, 23],
            [37.4, 22],
          ].map(([cx, cy]) => (
            <circle key={cx} cx={cx} cy={cy} r="0.7" />
          ))}
        </g>
      );
    case 'skull':
      // Un crâne : orbites creuses et fente nasale. Il **remplace** le regard,
      // il ne s'y ajoute pas — voir `Regard`.
      return (
        <>
          <ellipse cx="28.6" cy="18.6" rx="3" ry="3.4" fill="#1a1a20" />
          <ellipse cx="35.4" cy="18.6" rx="3" ry="3.4" fill="#1a1a20" />
          <path d="M32 21.6 30.6 25h2.8Z" fill="#1a1a20" />
          <path d="M27 27h10" stroke="#1a1a20" strokeWidth="0.8" />
        </>
      );
    default:
      return null;
  }
}

/** Le regard. Deux traits cerclés de blanc : des pupilles rondes fixent. */
function Regard({ traits }: { traits: SpriteTraits }) {
  // Un masque, un bandeau ou un crâne tiennent lieu de regard : superposer des
  // yeux par-dessus donnerait une figure à quatre yeux.
  if (traits.head === 'mask' || traits.mark === 'blind' || traits.mark === 'skull') return null;

  return (
    <>
      <rect x="27.4" y="17.4" width="3.2" height="3.8" rx="1.4" fill="#ffffff" opacity="0.9" />
      <rect x="33.4" y="17.4" width="3.2" height="3.8" rx="1.4" fill="#ffffff" opacity="0.9" />
      <rect x="28.2" y="18" width="1.6" height="2.6" rx="0.8" fill="#171a20" />
      <rect x="34.2" y="18" width="1.6" height="2.6" rx="0.8" fill="#171a20" />
    </>
  );
}

/** Ce qu'il tient, à droite de la figurine. */
function Arme({ traits, accent }: { traits: SpriteTraits; accent: string }) {
  switch (traits.prop) {
    case 'sword':
      return (
        <g>
          <rect x="49" y="18" width="2.4" height="34" rx="1" fill="#dfe6ee" />
          <rect x="47" y="50" width="6.5" height="2.6" rx="1" fill={accent} />
          <rect x="49" y="52" width="2.4" height="7" rx="1" fill="#3b2a1b" />
        </g>
      );
    case 'katana3':
      // Trois lames en éventail : c'est le nombre qui se lit, pas le détail.
      return (
        <g>
          {[-11, 0, 11].map((a, i) => (
            <g key={a} transform={`rotate(${a} 50 52)`}>
              <rect x={49 + i * 0.2} y="20" width="2" height="32" rx="1" fill="#dfe6ee" />
              <rect x={47 + i * 0.2} y="50" width="6" height="2.4" rx="1" fill={accent} />
            </g>
          ))}
        </g>
      );
    case 'greatsword':
      return (
        <g>
          <path d="M46 14 55 14 53 52 48 52Z" fill="#1e1a22" />
          <path d="M46 14 55 14 54.4 18 46.6 18Z" fill="#3a3444" />
          <rect x="45" y="52" width="11" height="3" rx="1.4" fill={accent} />
          <rect x="49" y="55" width="3" height="8" rx="1.4" fill="#2a2028" />
        </g>
      );
    case 'staff':
      return (
        <g>
          <rect x="49" y="22" width="2.2" height="34" rx="1" fill="#5c3d22" />
          <circle cx="50" cy="20" r="4" fill={accent} opacity="0.85" />
        </g>
      );
    case 'axe':
      return (
        <g>
          <rect x="49" y="22" width="2.4" height="34" rx="1" fill="#5c3d22" />
          <path d="M50 20q9-2 11 6-8 4-11 1Z" fill="#c9ced8" />
        </g>
      );
    case 'club':
      return (
        <g>
          <rect x="49" y="30" width="3" height="28" rx="1.4" fill="#4a3320" />
          <rect x="45.5" y="12" width="10" height="20" rx="3" fill="#6a4a2a" />
          {[15, 20, 25].map((y) => (
            <g key={y} fill="#c9ced8">
              <circle cx="47.5" cy={y} r="1.2" />
              <circle cx="53.5" cy={y + 2.5} r="1.2" />
            </g>
          ))}
        </g>
      );
    case 'gun':
      return (
        <g fill="#b8a888">
          <rect x="46" y="34" width="12" height="3.2" rx="1.2" />
          <path d="M48 37h4v6l-4 2Z" />
        </g>
      );
    case 'knives':
      return (
        <g>
          {[-24, 24].map((a) => (
            <g key={a} transform={`rotate(${a} 50 40)`}>
              <rect x="49" y="24" width="2" height="18" rx="1" fill="#dfe6ee" />
              <rect x="48" y="42" width="4" height="5" rx="1" fill="#3b2a1b" />
            </g>
          ))}
        </g>
      );
    case 'cane':
      return (
        <g>
          <rect x="50" y="24" width="2" height="34" rx="1" fill="#2a2028" />
          <path d="M50 24q0-5 5-5t4 4" fill="none" stroke="#2a2028" strokeWidth="2" strokeLinecap="round" />
        </g>
      );
    default:
      return null;
  }
}

/* ---------------------------------------------------------------------------
   Les détails ajoutés au patron.

   Ils sont répartis en quatre groupes, et l'ordre de tracé n'est pas
   indifférent : ce qui passe derrière la figurine — cape, ailes — doit être
   posé avant elle, ce qui se pose sur le torse après lui, et ce qui touche au
   visage tout à la fin.
   --------------------------------------------------------------------------- */

/** Ce qui passe **derrière** la figurine. */
function ExtrasArriere({ traits }: { traits: SpriteTraits }) {
  const a = new Set(traits.extras);
  return (
    <>
      {a.has('cape') && (
        <path d="M20 30q12-6 24 0l7 32q-19 5-38 0Z" fill={traits.coat ?? '#1b1b22'} opacity="0.9" />
      )}
      {a.has('wings') && (
        <g fill={traits.coat ?? '#15151c'} opacity="0.85">
          <path d="M22 30 4 20q-2 18 14 24Z" />
          <path d="M42 30 60 20q2 18-14 24Z" />
        </g>
      )}
    </>
  );
}

/** Ce qui se pose sur le torse. */
function ExtrasTorse({ traits, shoulders }: { traits: SpriteTraits; shoulders: number }) {
  const a = new Set(traits.extras);
  const g = 32 - shoulders / 2;
  const d = 32 + shoulders / 2;

  return (
    <>
      {/* Torse nu : on repeint le buste à la couleur de peau et on garde la
          tenue en bas. Sans quoi Barbe Blanche et Kaidô portent une chemise. */}
      {a.has('bare-chest') && (
        <>
          <path d={`M${g} 30 L${d} 30 L${d + 1} 46 L${g - 1} 46 Z`} fill={traits.skin} />
          <path d="M27 34q5 4 10 0" fill="none" stroke="#00000033" strokeWidth="1.2" />
        </>
      )}
      {/* Gilet ou chemise ouverte : deux pans, et la peau entre les deux. */}
      {a.has('open-vest') && (
        <>
          <path d="M28 30 L36 30 L35 48 L29 48 Z" fill={traits.skin} />
          <path d={`M${g} 30 L29 30 L28 52 L${g - 1} 52 Z`} fill={traits.outfit} />
          <path d={`M35 30 L${d} 30 L${d + 1} 52 L36 52 Z`} fill={traits.outfit} />
        </>
      )}
      {/* Ceinture ventrale : une bande large en bas du torse. */}
      {a.has('haramaki') && (
        <rect x={g} y="44" width={shoulders} height="9" rx="1.5" fill={traits.accessory} />
      )}
      {a.has('fur-collar') && (
        <path d={`M${g - 2} 31q10-6 20 0-4 6-10 6t-10-6Z`} fill="#c9bda6" />
      )}
      {/* Manteau de plumes : une frange dentelée sur les épaules, qui est ce
          qu'on en voit en vignette. */}
      {a.has('feather-coat') && (
        <path
          d={`M${g - 4} 30 L${d + 4} 30 L${d + 5} 40 l-4-4-4 5-4-5-4 5-4-5-4 5-4-4Z`}
          fill={traits.coat ?? '#e87aa8'}
        />
      )}
      {/* Manteau porté sur les épaules, manches vides : la silhouette de la
          Marine. */}
      {a.has('coat-shoulders') && (
        <>
          <path d={`M${g - 3} 29 L${d + 3} 29 L${d + 5} 56 L${d - 1} 56 L${d - 2} 34 Z`} fill="#f0ede4" />
          <path d={`M${g - 3} 29 L${g + 2} 34 L${g + 1} 56 L${g - 5} 56 Z`} fill="#f0ede4" />
        </>
      )}
      {/* Côtes : un squelette n'a pas de torse plein. */}
      {a.has('ribs') && (
        <g stroke={traits.skin} strokeWidth="1.4" strokeLinecap="round" fill="none">
          {[34, 38, 42].map((y) => (
            <path key={y} d={`M27 ${y}h10`} />
          ))}
          <path d="M32 31v14" strokeWidth="1.8" />
        </g>
      )}
      {/* Taille dégagée : une bande de peau entre le haut et le bas. Sans
          elle, toutes les tenues courtes lisent comme une combinaison. */}
      {a.has('bare-midriff') && (
        <rect x={g} y="43" width={shoulders} height="7" fill={traits.skin} />
      )}
      {/* Bras croisés sur la poitrine : c'est une **posture**, et c'est
          justement ce qui identifie le personnage mieux qu'un vêtement. */}
      {a.has('crossed-arms') && (
        <g fill={traits.skin} stroke="#00000022" strokeWidth="0.5">
          <rect x={g + 1} y="35" width={shoulders - 2} height="4.4" rx="2.2" transform={`rotate(-9 32 37)`} />
          <rect x={g + 1} y="40" width={shoulders - 2} height="4.4" rx="2.2" transform={`rotate(9 32 42)`} />
        </g>
      )}
      {/* Épaulettes : le galon d'un officier. Deux traits, et l'uniforme cesse
          d'être une chemise. */}
      {a.has('epaulettes') && (
        <g fill={traits.accessory}>
          <rect x={g - 3} y="29.5" width="8" height="3.4" rx="1.4" />
          <rect x={d - 5} y="29.5" width="8" height="3.4" rx="1.4" />
        </g>
      )}
      {/* Bandoulière et besace : ce qui trahit celui qui transporte son
          matériel. */}
      {a.has('satchel') && (
        <>
          <path d={`M${g + 1} 31 L${d - 1} 46`} stroke="#7a5a34" strokeWidth="2.4" fill="none" />
          <rect x={d - 4} y="45" width="8" height="7" rx="1.6" fill="#7a5a34" />
        </>
      )}
      {a.has('pendant') && (
        <>
          <path d="M28 30q4 4 8 0" fill="none" stroke="#c9ced8" strokeWidth="0.8" />
          <path d="M31.2 33h1.6v3h-1.6Z M30 34h4v1.4h-4Z" fill="#c9ced8" />
        </>
      )}
      {a.has('cards') && (
        <g fill="#f0ece2" stroke="#8a6a3a" strokeWidth="0.5">
          {[-14, 0, 14].map((r) => (
            <rect key={r} x={g - 8} y="40" width="5" height="8" rx="0.8" transform={`rotate(${r} ${g - 5.5} 48)`} />
          ))}
        </g>
      )}
      {a.has('arm-tattoo') && (
        <g fill={traits.accessory} opacity="0.85">
          <circle cx={g - 2} cy="36" r="1.6" />
          <path d={`M${g - 4.4} 39h5v1.4h-5Z`} />
        </g>
      )}

      {/* Nageoires d'avant-bras : la marque de l'homme-poisson. */}
      {a.has('fins') && (
        <g fill={traits.skin} opacity="0.9">
          <path d={`M${g - 5} 38 l-5 6 5 3Z`} />
          <path d={`M${d + 5} 38 l5 6-5 3Z`} />
        </g>
      )}
    </>
  );
}

/** Ce qui touche au visage et à la tête. */
function ExtrasTete({ traits }: { traits: SpriteTraits }) {
  const a = new Set(traits.extras);
  return (
    <>
      {/* Crinière : une masse derrière et autour du visage. */}
      {a.has('mane') && (
        <path
          d="M19 20q0-16 13-16t13 16q0 10-4 14 2-10-9-10t-9 10q-4-4-4-14Z"
          fill={traits.hair}
          opacity="0.9"
        />
      )}
      {a.has('antlers') && (
        <g stroke="#b98a52" strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M26 8 22 1M24 4.6 19.5 4M38 8 42 1M40 4.6 44.5 4" />
        </g>
      )}
      {a.has('long-nose') && (
        <path d="M41 19q10 1.5 12 3-12 3.5-12 2Z" fill={traits.skin} stroke="#00000022" strokeWidth="0.6" />
      )}
      {a.has('clown-nose') && <circle cx="32" cy="21.5" r="3" fill="#d0342c" />}
      {a.has('sawnose') && (
        <path d="M41 20 55 21l-2 2 2 2-2 2 2 2-14 1Z" fill={traits.skin} stroke="#00000033" strokeWidth="0.5" />
      )}
      {a.has('sharp-teeth') && (
        <path d="M26 24h12l-1.5 3-1.5-2-1.5 2-1.5-2-1.5 2-1.5-2-1.5 2Z" fill="#f2efe6" />
      )}
      {/* Sourcil en spirale : le trait le plus reconnaissable de tout le
          casting, et il tient en une courbe. */}
      {a.has('curly-brow') && (
        <path
          d="M34.4 14.2q2.6-2.6 3.6 0t-2.4 1.2"
          fill="none"
          stroke={traits.hair}
          strokeWidth="1.1"
          strokeLinecap="round"
        />
      )}
      {/* Trois anneaux à l'oreille gauche : ils tintent, on les voit. */}
      {a.has('earrings') && (
        <g fill="none" stroke="#e8c85a" strokeWidth="0.9">
          <circle cx="23.4" cy="21" r="1.5" />
          <circle cx="23.4" cy="24" r="1.5" />
          <circle cx="23.4" cy="27" r="1.5" />
        </g>
      )}
      {/* Deux couettes, une de chaque côté : c'est la symétrie qui les
          distingue d'une queue. */}
      {a.has('twin-tails') && (
        <g fill={traits.hair}>
          <path d="M22 16q-7 3-6 12t4 10q-4-14 3-18Z" />
          <path d="M42 16q7 3 6 12t-4 10q4-14-3-18Z" />
        </g>
      )}
      {/* Taches de la toque de fourrure. */}
      {a.has('spotted-hat') && (
        <g fill="#4a4a52" opacity="0.75">
          <circle cx="27" cy="6" r="1.6" />
          <circle cx="34" cy="4.4" r="1.4" />
          <circle cx="38" cy="8" r="1.5" />
        </g>
      )}
      {/* Points de suture : deux croix sur la joue. */}
      {a.has('stitches') && (
        <g stroke="#3a2a2a" strokeWidth="0.8" strokeLinecap="round">
          <path d="M25.4 15.6 27.8 18M27.8 15.6 25.4 18" />
          <path d="M24.6 20.6 27 23M27 20.6 24.6 23" />
        </g>
      )}
      {a.has('cravat') && (
        <path d="M29 26h6l-1 5-2-2-2 2Z" fill="#eee8db" />
      )}
      {/* Lunettes d'aviateur, relevées sur le chapeau — pas sur les yeux. */}
      {a.has('goggles') && (
        <g>
          <rect x="23" y="4.6" width="18" height="2.6" rx="1.2" fill="#5a4a34" />
          <circle cx="27.4" cy="5.9" r="2.4" fill="#8ab8c8" stroke="#5a4a34" strokeWidth="0.9" />
          <circle cx="36.6" cy="5.9" r="2.4" fill="#8ab8c8" stroke="#5a4a34" strokeWidth="0.9" />
        </g>
      )}
      {/* Perles enfilées dans la chevelure ou au cou. */}
      {a.has('beads') && (
        <g fill="#e8c85a">
          {[24, 28, 32, 36, 40].map((x, i) => (
            <circle key={x} cx={x} cy={27 + (i % 2) * 1.2} r="1.3" />
          ))}
        </g>
      )}
      {a.has('tusks') && (
        <g fill="#e6e0d0">
          <path d="M27 24q-2 5 0 7 2-3 2-7Z" />
          <path d="M37 24q2 5 0 7-2-3-2-7Z" />
        </g>
      )}
    </>
  );
}

/** Ce qui se perche sur une épaule. */
function ExtrasEpaule({ traits, shoulders }: { traits: SpriteTraits; shoulders: number }) {
  const a = new Set(traits.extras);
  const d = 32 + shoulders / 2;
  return (
    <>
      {a.has('pigeon') && (
        <g>
          <ellipse cx={d + 2} cy="26" rx="4.5" ry="3.4" fill="#e2e6ec" />
          <circle cx={d + 5.6} cy="23.6" r="2.4" fill="#e2e6ec" />
          <path d={`M${d + 7.6} 23.4 l3 0.8-3 1Z`} fill="#d8a03a" />
          <circle cx={d + 6.2} cy="23.2" r="0.6" fill="#171a20" />
        </g>
      )}
      {a.has('snake') && (
        <path
          d={`M${32 - shoulders / 2 - 2} 30q-8 4-4 10t10 2`}
          fill="none"
          stroke="#7a9a4a"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      )}
    </>
  );
}

/** Les bras : entiers, mécaniques, ou manquants. */
function Bras({ traits, shoulders }: { traits: SpriteTraits; shoulders: number }) {
  const a = new Set(traits.extras);
  const etoffe = traits.coat ?? traits.outfit;
  const metal = '#9aa6b8';
  const gaucheEstMetal = a.has('metal-arm') || a.has('metal-arms');

  return (
    <>
      {!a.has('missing-arm') && (
        <rect
          x={32 - shoulders / 2 - 4}
          y="31"
          width="4"
          height="20"
          rx="2"
          fill={gaucheEstMetal ? metal : etoffe}
        />
      )}
      <rect
        x={32 + shoulders / 2}
        y="31"
        width="4"
        height="20"
        rx="2"
        fill={a.has('metal-arms') ? metal : etoffe}
      />
      {/* Un avant-bras mécanique est plus **épais** que l'autre : c'est la
          différence de section qui se lit en vignette, pas la teinte. */}
      {gaucheEstMetal && (
        <rect x={32 - shoulders / 2 - 5.5} y="38" width="7" height="13" rx="2" fill={metal} />
      )}
      {a.has('metal-arms') && (
        <rect x={32 + shoulders / 2 - 1.5} y="38" width="7" height="13" rx="2" fill={metal} />
      )}
      {/* Une manche vide plutôt qu'un moignon : c'est ainsi qu'on lit un bras
          perdu sans dessiner de blessure. */}
      {a.has('missing-arm') && (
        <path
          d={`M${32 - shoulders / 2 - 3} 31 L${32 - shoulders / 2 + 1} 31 L${32 - shoulders / 2} 40 L${32 - shoulders / 2 - 4} 39 Z`}
          fill={etoffe}
        />
      )}
    </>
  );
}

/** La tête, selon le plan du corps. */
function Tete({ traits }: { traits: SpriteTraits }) {
  const { frame, skin } = traits;

  if (frame === 'reindeer') {
    return (
      <>
        {/* Oreilles avant la tête, pour qu'elles passent dessous. */}
        <ellipse cx="21" cy="17" rx="4" ry="2.6" fill={skin} />
        <ellipse cx="43" cy="17" rx="4" ry="2.6" fill={skin} />
        <ellipse cx="32" cy="17" rx="9.5" ry="9" fill={skin} />
        {/* Museau : c'est lui qui fait le renne. Une tête ronde seule reste un
            visage d'enfant. */}
        <ellipse cx="32" cy="22.5" rx="6" ry="4" fill="#e8d2b0" />
        <ellipse cx="32" cy="21.6" rx="2" ry="1.5" fill="#3a2a22" />
      </>
    );
  }

  if (frame === 'skeleton') {
    return (
      <>
        <ellipse cx="32" cy="17" rx="8.5" ry="9.5" fill={skin} />
        {/* Mâchoire : un crâne sans mâchoire lit comme un œuf. */}
        <path d="M25 23q7 7 14 0v3q-7 6-14 0Z" fill={skin} />
      </>
    );
  }

  if (frame === 'fishman') {
    return (
      <>
        <ellipse cx="32" cy="18" rx="9.5" ry="10" fill={skin} />
        {/* Branchies : trois fentes sur la joue. */}
        <g stroke="#00000044" strokeWidth="1" strokeLinecap="round">
          <path d="M23.5 20h3M23.2 22.4h3M23.6 24.6h3" />
        </g>
      </>
    );
  }

  if (frame === 'bear') {
    return (
      <>
        <circle cx="23" cy="10" r="4" fill={skin} />
        <circle cx="41" cy="10" r="4" fill={skin} />
        <ellipse cx="32" cy="18" rx="10" ry="10" fill={skin} />
      </>
    );
  }

  // Humain et oni : la même tête ; l'oni se distingue par ses cornes, sa
  // crinière et sa carrure, qui sont posées ailleurs.
  return <ellipse cx="32" cy="18" rx="9" ry="10" fill={skin} />;
}

/** Figurine en pied — Légendaire et Mythique. */
function SpriteFigure({ traits, accent }: { traits: SpriteTraits; accent: string }) {
  // La carrure ne change que deux nombres : la largeur du torse et celle des
  // épaules. Au-delà, il faudrait redessiner chaque membre, et la figurine
  // cesserait d'être lisible en vignette.
  const torso = traits.build === 'giant' ? 21 : traits.build === 'broad' ? 17 : 13;
  const shoulders = torso + 6;
  const clothId = `cloth-${traits.outfit.slice(1)}`;

  // Un renne de la taille d'un enfant : le plan du corps change aussi
  // l'échelle, pas seulement les formes.
  const echelle = traits.frame === 'reindeer' ? 0.78 : 1;

  return (
    <svg viewBox="0 0 64 80" className="hb-art__svg" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={clothId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={traits.outfit} />
          <stop offset="100%" stopColor="#00000055" />
        </linearGradient>
      </defs>

      {/* Halo de rareté : il donne son assise à la figurine, qui sans lui
          flotte au milieu du cadre. */}
      <ellipse cx="32" cy="70" rx="22" ry="5" fill={accent} opacity="0.32" />

      {traits.effects && (
        <>
          {/* Aura du Mythique. Deux anneaux à des rythmes différents : au même
              rythme, ils lisent comme un seul trait épais. */}
          <circle
            className="hb-art__aura hb-art__aura--slow"
            cx="32"
            cy="34"
            r="27"
            fill="none"
            stroke={accent}
            strokeWidth="1.6"
          />
          <circle className="hb-art__aura" cx="32" cy="34" r="21" fill="none" stroke={accent} strokeWidth="1" />
        </>
      )}

      <g transform={echelle === 1 ? undefined : `translate(32 70) scale(${echelle}) translate(-32 -70)`}>
        <ExtrasArriere traits={traits} />

        {/* Jambes */}
        <rect x={32 - torso / 2 + 1} y="54" width={torso / 2 - 2} height="16" rx="2" fill="#2b2f38" />
        <rect x={32 + 1} y="54" width={torso / 2 - 2} height="16" rx="2" fill="#2b2f38" />

        {/* Torse, puis manteau ouvert par-dessus. Le manteau tombe plus bas et
            s'évase : une veste droite donnerait une boîte. */}
        <path
          d={`M${32 - shoulders / 2} 30 L${32 + shoulders / 2} 30 L${32 + shoulders / 2 + 3} 58 L${32 - shoulders / 2 - 3} 58 Z`}
          fill={`url(#${clothId})`}
        />
        {traits.coat && (
          <>
            <path
              d={`M${32 - shoulders / 2} 30 L29 30 L28 58 L${32 - shoulders / 2 - 3} 58 Z`}
              fill={traits.coat}
            />
            <path
              d={`M35 30 L${32 + shoulders / 2} 30 L${32 + shoulders / 2 + 3} 58 L36 58 Z`}
              fill={traits.coat}
            />
          </>
        )}

        <Bras traits={traits} shoulders={shoulders} />
        <ExtrasTorse traits={traits} shoulders={shoulders} />

        {/* Le crochet remplace la main gauche : c'est le seul accessoire qui
            tient lieu de membre, il ne peut donc pas aller avec les autres. */}
        {traits.prop === 'hook' && (
          <path
            d={`M${32 - shoulders / 2 - 2} 51q0 7 5 7t3-5`}
            fill="none"
            stroke="#c9ced8"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        )}

        <ArriereChevelure traits={traits} />

        {/* Cou : un squelette n'en a d'autre qu'une vertèbre. */}
        {traits.frame === 'skeleton' ? (
          <rect x="31" y="24" width="2" height="6" fill={traits.skin} />
        ) : (
          <rect x="30" y="24" width="4" height="6" fill={traits.skin} />
        )}

        <Tete traits={traits} />

        <Frange traits={traits} />
        <ExtrasTete traits={traits} />
        <Couvrechef traits={traits} accent={accent} />
        <Regard traits={traits} />
        <Marque traits={traits} />
        <ExtrasEpaule traits={traits} shoulders={shoulders} />
        <Arme traits={traits} accent={accent} />
      </g>
    </svg>
  );
}

export function CharacterArt({
  characterId,
  rarity,
  attributes,
  className,
}: {
  characterId: string;
  rarity: Rarity;
  attributes: readonly Attribute[];
  className?: string;
}) {
  const subject: PortraitSubject = { id: characterId, rarity, attributes };
  const level = artLevelOf(rarity);

  // Le Commun n'a pas d'illustration, et c'est délibéré : la carte reste
  // sobre, et l'apparition d'une image sur la carte suivante se remarque.
  if (level === 'none') return null;

  return (
    <div
      className={`hb-art hb-art--${level}${className ? ` ${className}` : ''}`}
      style={{ ['--rarity' as string]: RARITY_COLOR[rarity] }}
      // La description physique sert d'intitulé quand elle existe : un lecteur
      // d'écran annonce « cheveux verts, trois sabres » plutôt que rien.
      title={signatureOf(characterId)?.note}
    >
      {level === 'emoji' && (
        <span className="hb-art__emoji" aria-hidden="true">
          {emojiFor(subject)}
        </span>
      )}
      {level === 'pixel' && (
        <PixelPortrait
          grid={pixelPortrait(subject, paletteOf(subject, RARITY_COLOR[rarity]))}
          palette={paletteOf(subject, RARITY_COLOR[rarity])}
        />
      )}
      {level === 'sprite' && (
        <SpriteFigure traits={spriteTraits(subject)} accent={RARITY_COLOR[rarity]} />
      )}
    </div>
  );
}
