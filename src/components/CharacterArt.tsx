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

/**
 * Illustration d'une carte (cahier §24, §122).
 *
 * Composant **serveur, sans une ligne de JavaScript client** : tout est du SVG
 * calculé au rendu. Les effets du Mythique sont des animations CSS, pas une
 * boucle d'animation en JavaScript — ils tournent donc sans occuper le fil
 * principal, ce qui compte quand une collection affiche cinquante cartes.
 *
 * §122 : aucun visuel de l'œuvre. Chaque image est **générée** à partir de
 * l'identifiant du personnage. Voir `domain/collection/portrait.ts`.
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
      <rect
        width={PIXEL_GRID}
        height={PIXEL_GRID}
        fill={palette.accent}
        opacity="0.14"
      />
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

/** Figurine en pied — Légendaire et Mythique. */
function SpriteFigure({
  traits,
  palette,
}: {
  traits: SpriteTraits;
  palette: PortraitPalette;
}) {
  // La carrure ne change que deux nombres : la largeur du torse et celle des
  // épaules. C'est suffisant — au-delà, il faudrait redessiner chaque membre,
  // et la figurine cesserait d'être lisible en vignette.
  const torso = traits.build === 'giant' ? 20 : traits.build === 'broad' ? 16 : 12;
  const shoulders = torso + 6;

  return (
    <svg
      viewBox="0 0 64 80"
      className="hb-art__svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`cloth-${palette.outfit.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={palette.outfit} />
          <stop offset="100%" stopColor="#00000055" />
        </linearGradient>
      </defs>

      {/* Halo de rareté, en fond. Il donne son assise à la figurine : sans lui,
          elle flotte au milieu du cadre. */}
      <ellipse cx="32" cy="70" rx="22" ry="5" fill={palette.accent} opacity="0.32" />

      {traits.effects && (
        <>
          {/* Aura du Mythique. Deux anneaux qui respirent à des rythmes
              différents : au même rythme, ils lisent comme un seul trait
              épais. */}
          <circle
            className="hb-art__aura hb-art__aura--slow"
            cx="32"
            cy="34"
            r="27"
            fill="none"
            stroke={palette.accent}
            strokeWidth="1.6"
          />
          <circle
            className="hb-art__aura"
            cx="32"
            cy="34"
            r="21"
            fill="none"
            stroke={palette.accent}
            strokeWidth="1"
          />
        </>
      )}

      {/* Jambes */}
      <rect x={32 - torso / 2 + 1} y="54" width={torso / 2 - 2} height="16" rx="2" fill="#2b2f38" />
      <rect x={32 + 1} y="54" width={torso / 2 - 2} height="16" rx="2" fill="#2b2f38" />

      {/* Manteau : ce qui fait la silhouette. Il tombe plus bas que le torse et
          s'évase — une veste droite donnerait une boîte. */}
      <path
        d={`M${32 - shoulders / 2} 30 L${32 + shoulders / 2} 30 L${32 + shoulders / 2 + 3} 58 L${32 - shoulders / 2 - 3} 58 Z`}
        fill={`url(#cloth-${palette.outfit.slice(1)})`}
      />

      {/* Bras */}
      <rect x={32 - shoulders / 2 - 4} y="31" width="4" height="20" rx="2" fill={palette.outfit} />
      <rect x={32 + shoulders / 2} y="31" width="4" height="20" rx="2" fill={palette.outfit} />

      {/* Cou et tête */}
      <rect x="30" y="24" width="4" height="6" fill={palette.skin} />
      <ellipse cx="32" cy="18" rx="9" ry="10" fill={palette.skin} />

      {/* Coiffure. Quatre formes seulement, mais elles changent complètement la
          silhouette en vignette — c'est là que se joue la reconnaissance. */}
      {traits.hair === 'hat' ? (
        <>
          <ellipse cx="32" cy="11" rx="16" ry="4.5" fill={palette.hair} />
          <path d="M23 11c0-7 4-11 9-11s9 4 9 11c0 2-4 3-9 3s-9-1-9-3Z" fill={palette.hair} />
          <rect x="23" y="9" width="18" height="2.6" fill={palette.accent} />
        </>
      ) : traits.hair === 'long' ? (
        <path
          d="M23 16c0-9 4-13 9-13s9 4 9 13v14c-3 2-15 2-18 0Z"
          fill={palette.hair}
        />
      ) : traits.hair === 'spiky' ? (
        <path
          d="M23 15 26 6l3 6 3-8 3 8 3-6 3 9c-3 2-15 2-18 0Z"
          fill={palette.hair}
        />
      ) : (
        <path d="M23 16c0-8 4-12 9-12s9 4 9 12c-3 2-15 2-18 0Z" fill={palette.hair} />
      )}

      {/* Yeux : deux traits. Des pupilles rondes à cette taille donnent un
          regard fixe et vaguement inquiétant. */}
      <rect x="28" y="18" width="2" height="2.6" rx="1" fill="#171a20" />
      <rect x="34" y="18" width="2" height="2.6" rx="1" fill="#171a20" />

      {/* Accessoire */}
      {traits.prop === 'sword' && (
        <g>
          <rect x="49" y="18" width="2.4" height="34" rx="1" fill="#dfe6ee" />
          <rect x="47" y="50" width="6.5" height="2.6" rx="1" fill={palette.accent} />
          <rect x="49" y="52" width="2.4" height="7" rx="1" fill="#3b2a1b" />
        </g>
      )}
      {traits.prop === 'staff' && (
        <g>
          <rect x="49" y="22" width="2.2" height="34" rx="1" fill="#5c3d22" />
          <circle cx="50" cy="20" r="4" fill={palette.accent} opacity="0.85" />
        </g>
      )}
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

  const palette = paletteOf(subject, RARITY_COLOR[rarity]);

  return (
    <div
      className={`hb-art hb-art--${level}${className ? ` ${className}` : ''}`}
      style={{ ['--rarity' as string]: RARITY_COLOR[rarity] }}
    >
      {level === 'emoji' && (
        <span className="hb-art__emoji" aria-hidden="true">
          {emojiFor(subject)}
        </span>
      )}
      {level === 'pixel' && (
        <PixelPortrait grid={pixelPortrait(subject, palette)} palette={palette} />
      )}
      {level === 'sprite' && (
        <SpriteFigure traits={spriteTraits(subject)} palette={palette} />
      )}
    </div>
  );
}
