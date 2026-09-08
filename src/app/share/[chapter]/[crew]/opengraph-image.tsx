import { ImageResponse } from 'next/og';
import { CHARACTER_INDEX } from '@/data/characters';
import { lireChapitre, lireEquipage } from '@/domain/social/partage';
import { teamRisk } from '@/domain/risk';
import type { Character } from '@/domain/types';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Carte de partage (cahier §69).
 *
 * Générée côté serveur par `next/og` : aucune dépendance externe, aucun
 * service tiers, et surtout aucune donnée envoyée ailleurs.
 *
 * **Elle ne révèle jamais un score.** Le partage a lieu après verrouillage
 * mais avant la sortie du chapitre : afficher des points ferait de cette
 * carte un canal de spoiler (§3). On montre l'équipage et le risque assumé,
 * qui sont des informations d'avant-chapitre.
 */

const ABYSS = '#071c2c';
const NAVY = '#0e3045';
const TURQUOISE = '#25c7c5';
const PARCHMENT = '#f5e8c8';
const TREASURE = '#f4c84a';

export default async function ShareImage({
  params,
}: {
  params: Promise<{ chapter: string; crew: string }>;
}) {
  // Next ne transmet pas les paramètres de requête aux générateurs d'image :
  // l'équipage doit donc voyager dans le chemin.
  const { chapter, crew } = await params;

  /*
   * Le numéro est **validé**, pas seulement affiché.
   *
   * Il partait tel quel dans l'image, sous le nom du jeu et dans sa
   * typographie. N'importe qui pouvait donc fabriquer une carte officielle
   * disant ce qu'il voulait, et la partager : « Chapitre » suivi d'une phrase
   * entière. Le titre de la page avait le même défaut.
   *
   * Un chapitre est un nombre. Tout le reste devient une carte sans numéro,
   * ce qui reste une carte honnête.
   */
  const numero = lireChapitre(chapter);

  /*
   * Le découpage est **borné avant** d'être fait.
   *
   * `split(',')` puis `slice(0, 3)` allouait d'abord le tableau entier : une
   * chaîne d'un mégaoctet de virgules produisait un million d'entrées pour
   * n'en garder que trois, à chaque requête. Le chemin vient du réseau, et la
   * génération d'image est déjà ce que le serveur fait de plus cher.
   */
  const picked = lireEquipage(crew)
    .map((id) => CHARACTER_INDEX.get(id))
    .filter((c): c is Character => c !== undefined);

  const risk = teamRisk(picked);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          background: `linear-gradient(160deg, ${NAVY} 0%, ${ABYSS} 60%)`,
          color: PARCHMENT,
          fontFamily: 'Georgia, serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontSize: 24,
              letterSpacing: 8,
              color: TURQUOISE,
              textTransform: 'uppercase',
            }}
          >
            One Piece Quest
          </span>
          <span style={{ fontSize: 64, marginTop: 8 }}>
            {numero ? `Chapitre ${numero}` : 'Ma prédiction'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 24 }}>
          {picked.length > 0 ? (
            picked.map((character) => (
              <div
                key={character.id}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  padding: 28,
                  borderRadius: 20,
                  border: `2px solid ${TURQUOISE}55`,
                  background: '#0e304588',
                }}
              >
                <span style={{ fontSize: 34 }}>{character.name}</span>
                <span
                  style={{
                    fontSize: 20,
                    marginTop: 10,
                    color: TREASURE,
                    letterSpacing: 3,
                    textTransform: 'uppercase',
                  }}
                >
                  {character.rarity}
                </span>
              </div>
            ))
          ) : (
            <span style={{ fontSize: 32, opacity: 0.6 }}>
              Équipage non communiqué
            </span>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 20, letterSpacing: 4, opacity: 0.6 }}>
              RISK
            </span>
            <span style={{ fontSize: 48, color: TREASURE }}>
              {risk.value} / 100 · {risk.band}
            </span>
          </div>
          <span style={{ fontSize: 28, color: TURQUOISE }}>
            🔒 Prediction locked
          </span>
        </div>
      </div>
    ),
    size,
  );
}
