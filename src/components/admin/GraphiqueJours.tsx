/**
 * Colonnes par jour, en SVG rendu par le serveur.
 *
 * Une série par graphique, jamais deux : inscriptions et ventes ne se
 * mesurent pas dans la même unité, et deux axes sur un même dessin font
 * lire une corrélation qui n'existe pas. Trois petits graphiques côte à
 * côte disent la même chose sans mentir.
 *
 * Pas de bibliothèque : trente rectangles et quatre lignes de texte. Le
 * SVG part dans le HTML, sans script — la page d'administration n'a pas à
 * charger un moteur de tracé pour ça. Le survol d'une colonne montre la
 * valeur (`<title>`), et le tableau replié en dessous donne tout au clavier
 * comme au lecteur d'écran.
 */

export interface PointJour {
  /** `YYYY-MM-DD`. */
  jour: string;
  valeur: number;
}

const LARGEUR = 320;
const HAUTEUR = 120;
const MARGE = { haut: 18, bas: 22, gauche: 8, droite: 8 };
const EPAISSEUR_MAX = 12;
const ECART = 2;

const formatJour = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

export function GraphiqueJours({
  titre,
  points,
  unite = '',
  formatValeur = (v: number) => v.toLocaleString('fr-FR'),
}: {
  titre: string;
  points: PointJour[];
  /** Suffixe affiché après la valeur dans l'infobulle et le tableau. */
  unite?: string;
  formatValeur?: (v: number) => string;
}) {
  const max = Math.max(0, ...points.map((p) => p.valeur));
  const total = points.reduce((a, p) => a + p.valeur, 0);
  const largeurUtile = LARGEUR - MARGE.gauche - MARGE.droite;
  const hauteurUtile = HAUTEUR - MARGE.haut - MARGE.bas;
  const pas = points.length > 0 ? largeurUtile / points.length : largeurUtile;
  const epaisseur = Math.min(EPAISSEUR_MAX, Math.max(2, pas - ECART));
  const ligneBase = MARGE.haut + hauteurUtile;
  const indexMax = points.findIndex((p) => p.valeur === max && max > 0);

  // Une seule ligne de repère, à mi-hauteur : assez pour lire l'échelle,
  // pas assez pour concurrencer les colonnes.
  const repere = max > 0 ? Math.ceil(max / 2) : 0;

  return (
    <figure className="rounded-lg border border-turquoise/20 bg-navy/40 p-3">
      <figcaption className="flex items-baseline justify-between">
        <span className="text-[11px] uppercase tracking-widest text-parchment/60">{titre}</span>
        <span className="font-mono text-xs text-parchment/60">
          {formatValeur(total)}
          {unite} sur 30 j
        </span>
      </figcaption>

      <svg
        viewBox={`0 0 ${LARGEUR} ${HAUTEUR}`}
        className="mt-2 block w-full"
        role="img"
        aria-label={`${titre}, par jour sur les trente derniers jours`}
      >
        {/* Repère à mi-hauteur, en filet. */}
        {repere > 0 && (
          <>
            <line
              x1={MARGE.gauche}
              x2={LARGEUR - MARGE.droite}
              y1={ligneBase - (repere / max) * hauteurUtile}
              y2={ligneBase - (repere / max) * hauteurUtile}
              stroke="rgba(245, 232, 200, 0.14)"
              strokeWidth={1}
            />
            <text
              x={LARGEUR - MARGE.droite}
              y={ligneBase - (repere / max) * hauteurUtile - 3}
              textAnchor="end"
              fontSize={9}
              fill="rgba(245, 232, 200, 0.5)"
              fontFamily="ui-monospace, monospace"
            >
              {formatValeur(repere)}
            </text>
          </>
        )}

        {/* Ligne de base. */}
        <line
          x1={MARGE.gauche}
          x2={LARGEUR - MARGE.droite}
          y1={ligneBase}
          y2={ligneBase}
          stroke="rgba(245, 232, 200, 0.25)"
          strokeWidth={1}
        />

        {points.map((p, i) => {
          const h = max > 0 ? (p.valeur / max) * hauteurUtile : 0;
          const x = MARGE.gauche + i * pas + (pas - epaisseur) / 2;
          const y = ligneBase - h;
          // Sommet arrondi, pied carré : le chemin dessine la colonne depuis
          // la ligne de base, avec un rayon de 3 aux deux coins du haut.
          const r = Math.min(3, epaisseur / 2, h);
          const d =
            h <= 0
              ? ''
              : `M${x},${ligneBase} V${y + r} a${r},${r} 0 0 1 ${r},-${r} h${epaisseur - 2 * r} a${r},${r} 0 0 1 ${r},${r} V${ligneBase} Z`;
          return (
            <g key={p.jour}>
              {/* Cible de survol plus large que la colonne, sur toute la hauteur. */}
              <rect
                x={MARGE.gauche + i * pas}
                y={MARGE.haut}
                width={pas}
                height={hauteurUtile}
                fill="transparent"
              >
                <title>
                  {formatJour(p.jour)} : {formatValeur(p.valeur)}
                  {unite}
                </title>
              </rect>
              {d && <path d={d} fill="var(--color-turquoise)" pointerEvents="none" />}
              {i === indexMax && (
                <text
                  x={x + epaisseur / 2}
                  y={y - 4}
                  textAnchor="middle"
                  fontSize={9}
                  fill="rgba(245, 232, 200, 0.85)"
                  fontFamily="ui-monospace, monospace"
                  pointerEvents="none"
                >
                  {formatValeur(p.valeur)}
                </text>
              )}
            </g>
          );
        })}

        {/* Deux dates : la première et la dernière. Les autres se lisent au survol. */}
        {points.length > 0 && (
          <>
            <text
              x={MARGE.gauche}
              y={HAUTEUR - 6}
              fontSize={9}
              fill="rgba(245, 232, 200, 0.5)"
            >
              {formatJour(points[0].jour)}
            </text>
            <text
              x={LARGEUR - MARGE.droite}
              y={HAUTEUR - 6}
              textAnchor="end"
              fontSize={9}
              fill="rgba(245, 232, 200, 0.5)"
            >
              {formatJour(points[points.length - 1].jour)}
            </text>
          </>
        )}
      </svg>

      <details className="mt-1">
        <summary className="cursor-pointer text-[11px] text-parchment/60">Voir les valeurs</summary>
        <table className="mt-1 w-full text-[11px]">
          <tbody>
            {points
              .filter((p) => p.valeur > 0)
              .map((p) => (
                <tr key={p.jour} className="text-parchment/70">
                  <td className="py-0.5">{formatJour(p.jour)}</td>
                  <td className="py-0.5 text-right font-mono">
                    {formatValeur(p.valeur)}
                    {unite}
                  </td>
                </tr>
              ))}
            {total === 0 && (
              <tr>
                <td className="py-0.5 text-parchment/60">Rien sur la période.</td>
              </tr>
            )}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
