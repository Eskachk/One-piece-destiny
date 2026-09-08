/**
 * Atmosphère des îles — lumière, profondeur, vie.
 *
 * ## Ce qui manquait aux décors
 *
 * Les silhouettes étaient justes : un torii se lit comme un torii, un colisée
 * comme un colisée. Mais tout était peint en **aplats à opacité uniforme**,
 * et il manquait les trois choses qui font qu'un paysage existe :
 *
 *   — **une source de lumière.** Sans elle, rien ne dit l'heure qu'il est, et
 *     aucune forme n'a de côté éclairé ni de côté sombre ;
 *   — **la profondeur atmosphérique.** Au loin, l'air s'interpose : les
 *     reliefs pâlissent et virent vers la couleur du ciel. Sans ce lavis, un
 *     mont à dix kilomètres et une hutte à vingt mètres ont la même densité,
 *     et le dessin s'aplatit ;
 *   — **du vivant.** Un décor parfaitement immobile se lit comme une image
 *     collée derrière la page, pas comme un lieu.
 *
 * ## Pourquoi des primitives, et non dix dessins retouchés
 *
 * Dix îles corrigées à la main auraient divergé dès la première retouche :
 * un soleil ici, une brume là, chacun avec ses valeurs. Ici, la lumière et la
 * brume sont **le même objet** partout, réglé par quelques paramètres. Une
 * amélioration profite aux dix.
 *
 * ## Le coût, qui compte : ce décor est sur toutes les pages
 *
 * Tout est du SVG rendu **côté serveur**, sans une ligne de JavaScript client.
 * Les mouvements sont des animations CSS sur `transform` et `opacity`, les
 * deux propriétés que le compositeur traite sans repeindre. Aucun élément
 * n'est ajouté par île au-delà de ce qui se voit, et les identifiants de
 * dégradés sont préfixés : la page d'aperçu affiche les dix décors à la fois,
 * et deux `<defs>` qui partagent un identifiant se volent leurs couleurs.
 *
 * §122 : aucun visuel de l'œuvre. Un soleil est un disque, une brume est un
 * dégradé, un oiseau est deux arcs.
 */

/** Le cadre du décor de sol, repris ici pour situer les coordonnées. */
export const CIEL_HAUT = 0;

interface Teintes {
  /** Couleur de la lumière. Chaude au couchant, froide sous la neige. */
  lumiere: string;
  /** Couleur de l'air au loin : c'est vers elle que pâlissent les lointains. */
  air: string;
}

/**
 * Les `<defs>` d'une île : dégradés de lumière, de brume et de vignette.
 *
 * Un seul appel par décor, en tête du SVG. `id` préfixe tout ce qui est
 * défini ici.
 */
export function AtmosphereDefs({
  id,
  lumiere,
  air,
}: { id: string } & Teintes) {
  return (
    <defs>
      {/* Halo du soleil : franc au centre, éteint avant le bord. Un halo qui
          va jusqu'au bord fait un voile gris sur tout le dessin. */}
      <radialGradient id={`${id}-halo`}>
        <stop offset="0%" stopColor={lumiere} stopOpacity="0.85" />
        <stop offset="35%" stopColor={lumiere} stopOpacity="0.32" />
        <stop offset="100%" stopColor={lumiere} stopOpacity="0" />
      </radialGradient>

      {/* Brume de distance : dense à l'horizon, nulle en montant. C'est
          l'inverse d'un dégradé de ciel, et c'est ce qui creuse la profondeur. */}
      <linearGradient id={`${id}-brume`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={air} stopOpacity="0" />
        <stop offset="65%" stopColor={air} stopOpacity="0.42" />
        <stop offset="100%" stopColor={air} stopOpacity="0.72" />
      </linearGradient>

      {/* Lavis rasant, dans l'axe de la lumière : il réchauffe le côté éclairé
          du dessin sans toucher aux formes elles-mêmes. */}
      <linearGradient id={`${id}-rasant`} x1="0" y1="0" x2="1" y2="0.35">
        <stop offset="0%" stopColor={lumiere} stopOpacity="0" />
        <stop offset="100%" stopColor={lumiere} stopOpacity="0.28" />
      </linearGradient>

      {/* Vignette : les angles s'assombrissent à peine. C'est ce qui empêche
          un décor plein cadre de « fuir » par les bords, et cela pousse l'œil
          vers le centre, où se trouve le contenu de la page. */}
      <radialGradient id={`${id}-vignette`} cx="50%" cy="45%" r="75%">
        <stop offset="55%" stopColor="#0a2233" stopOpacity="0" />
        <stop offset="100%" stopColor="#0a2233" stopOpacity="0.22" />
      </radialGradient>
    </defs>
  );
}

/**
 * L'astre et son halo.
 *
 * `rayons` ajoute une couronne de rais lents. Réservé aux îles où la lumière
 * est le sujet — un ciel de neige n'en a pas — parce que douze rais sur dix
 * décors feraient de la roue de loterie une signature involontaire.
 */
export function Astre({
  id,
  cx,
  cy,
  r,
  lumiere,
  rayons = false,
}: {
  id: string;
  cx: number;
  cy: number;
  r: number;
  lumiere: string;
  rayons?: boolean;
}) {
  return (
    <g className="isl-astre" aria-hidden="true">
      {rayons && (
        <g className="isl-rais" style={{ transformOrigin: `${cx}px ${cy}px` }}>
          {Array.from({ length: 12 }, (_, i) => (
            <path
              key={i}
              d={`M${cx} ${cy} l${r * 9} -${r * 0.55} l0 ${r * 1.1}Z`}
              fill={lumiere}
              opacity="0.07"
              transform={`rotate(${i * 30} ${cx} ${cy})`}
            />
          ))}
        </g>
      )}

      {/* Le halo est cinq fois le disque : c'est la diffusion dans l'air, et
          c'est elle qu'on voit, bien plus que l'astre lui-même. */}
      <circle cx={cx} cy={cy} r={r * 5} fill={`url(#${id}-halo)`} />
      <circle className="isl-astre__disque" cx={cx} cy={cy} r={r} fill={lumiere} opacity="0.9" />
    </g>
  );
}

/**
 * La brume de distance, posée entre deux plans.
 *
 * À appeler **après** ce qui est loin et **avant** ce qui est près : c'est sa
 * position dans l'ordre de dessin qui crée la profondeur, pas sa couleur.
 */
export function Brume({
  id,
  y,
  hauteur = 90,
  opacite = 1,
}: {
  id: string;
  y: number;
  hauteur?: number;
  opacite?: number;
}) {
  return (
    <rect
      x="0"
      y={y}
      width="900"
      height={hauteur}
      fill={`url(#${id}-brume)`}
      opacity={opacite}
    />
  );
}

/** Le lavis rasant et la vignette, posés en dernier sur tout le cadre. */
export function Finition({ id }: { id: string }) {
  return (
    <>
      <rect x="0" y="0" width="900" height="300" fill={`url(#${id}-rasant)`} />
      <rect x="0" y="0" width="900" height="300" fill={`url(#${id}-vignette)`} />
    </>
  );
}

/**
 * Un vol d'oiseaux qui traverse.
 *
 * Chaque oiseau est **deux arcs** — l'écriture la plus économe d'une aile vue
 * de loin — et la troupe entière est un seul groupe animé. Les battements sont
 * décalés : au même rythme, cinq oiseaux lisent comme un seul objet articulé.
 */
export function Oiseaux({
  y,
  teinte = '#2b3f55',
  duree = 46,
  retard = 0,
  echelle = 1,
}: {
  y: number;
  teinte?: string;
  duree?: number;
  retard?: number;
  echelle?: number;
}) {
  const troupe = [
    { dx: 0, dy: 0, e: 1 },
    { dx: 26, dy: 12, e: 0.82 },
    { dx: 48, dy: -8, e: 0.9 },
    { dx: 74, dy: 6, e: 0.7 },
    { dx: 96, dy: 18, e: 0.78 },
  ];

  return (
    <g
      className="isl-vol"
      style={{ ['--duree' as string]: `${duree}s`, ['--retard' as string]: `${retard}s` }}
      aria-hidden="true"
    >
      {troupe.map((o, i) => (
        <path
          key={i}
          className="isl-aile"
          style={{ ['--retard' as string]: `${i * 0.23}s` }}
          d={`M${o.dx} ${y + o.dy} q5 -4 9 0 q4 -4 9 0`}
          fill="none"
          stroke={teinte}
          strokeWidth={1.7 / (echelle * o.e)}
          strokeLinecap="round"
          opacity="0.5"
          transform={`scale(${echelle * o.e})`}
        />
      ))}
    </g>
  );
}

/**
 * Une fumée qui monte, en trois bouffées.
 *
 * Elles montent en s'élargissant et en s'effaçant : une fumée d'opacité
 * constante se lit comme un ruban, pas comme de l'air chaud.
 */
export function Fumee({
  x,
  y,
  teinte = '#ffffff',
  duree = 9,
}: {
  x: number;
  y: number;
  teinte?: string;
  duree?: number;
}) {
  return (
    <g className="isl-fumee" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <circle
          key={i}
          className="isl-bouffee"
          style={{
            ['--duree' as string]: `${duree}s`,
            ['--retard' as string]: `${i * (duree / 3)}s`,
          }}
          cx={x}
          cy={y}
          r="7"
          fill={teinte}
          opacity="0"
        />
      ))}
    </g>
  );
}

/**
 * Scintillement sur l'eau : quelques traits horizontaux qui s'allument.
 *
 * Ils ne se déplacent pas — un reflet ne dérive pas, il apparaît et
 * disparaît là où la vague accroche la lumière.
 */
export function Reflets({
  y,
  largeur = 900,
  teinte = '#ffffff',
  n = 9,
}: {
  y: number;
  largeur?: number;
  teinte?: string;
  n?: number;
}) {
  return (
    <g aria-hidden="true">
      {Array.from({ length: n }, (_, i) => {
        // Réparties par un pas irrégulier : un espacement constant ferait une
        // règle graduée flottant sur la mer.
        const x = ((i * 137) % (largeur - 80)) + 40;
        const dy = (i % 4) * 7;
        return (
          <rect
            key={i}
            className="isl-reflet"
            style={{ ['--retard' as string]: `${(i % 5) * 1.3}s` }}
            x={x}
            y={y + dy}
            width={18 + (i % 3) * 11}
            height="2"
            rx="1"
            fill={teinte}
            opacity="0"
          />
        );
      })}
    </g>
  );
}
