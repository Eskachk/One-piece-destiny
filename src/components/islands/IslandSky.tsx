import type { IslandId } from '@/domain/islands';

/**
 * Le **haut et le milieu** du décor d'une île (cahier §50 à §54, §122).
 *
 * ## Ce qui manquait
 *
 * `IslandDecor` pose une silhouette au ras du bas de l'écran, dans un cadre
 * large de 3 pour 1. C'est la bonne place pour un colisée ou un torii — mais
 * cela laisse les deux tiers supérieurs de la page entièrement vides, et le
 * bord haut de la bande tranchait net tout ce qui montait : les rais de
 * lumière de l'Île des hommes-poissons s'arrêtaient d'un coup au milieu de la
 * page, sans rien pour les continuer.
 *
 * Un tapis de dégradés animés (`.isl-fx`) occupait cette hauteur. Il convient
 * à ce qui est innombrable — pluie, neige, pétales — et à rien d'autre. Un
 * banc de poissons n'est pas une trame : il a une direction, une silhouette,
 * et il traverse.
 *
 * ## Ce que cette couche fait
 *
 * Elle couvre **toute** la page et n'y met que du vivant : ce qui nage, vole,
 * monte ou dérive. Rien n'y est posé au sol — le sol est l'affaire de
 * `IslandDecor`, et les deux ne se recouvrent pas.
 *
 * `slice` plutôt que `meet` : la couche doit **couvrir** le cadre quelles que
 * soient ses proportions. Le recadrage est ici sans conséquence, à la
 * différence de la silhouette : ces éléments sont faits pour entrer et sortir
 * du champ, c'est même tout leur propos.
 *
 * ## Le mouvement
 *
 * Trois gestes suffisent, et ils sont paramétrés par variables CSS plutôt que
 * par une classe par élément : `--duree`, `--retard`, `--depart`, `--arrivee`.
 * Quarante poissons ne font donc que trois règles de style.
 *
 * §122 : aucun visuel de l'œuvre. Ce sont des formes géométriques — un poisson
 * est un losange et une queue, une méduse une coupole et des fils.
 */

const CADRE = {
  viewBox: '0 0 1200 800',
  preserveAspectRatio: 'xMidYMid slice',
} as const;

/**
 * Variables de trajectoire, passées en style pour ne pas multiplier les règles.
 *
 * `transformOrigin` y figure aussi : ce n'est **pas** un attribut SVG que React
 * accepte en propriété, il faut passer par le style. L'écrire en attribut
 * compile mais ne produit rien.
 */
type Course = {
  '--duree'?: string;
  '--retard'?: string;
  '--depart'?: string;
  '--arrivee'?: string;
} & React.CSSProperties;

const course = (v: Course) => v;

/* ---------------------------------------------------------------------------
   Briques réutilisées.
   --------------------------------------------------------------------------- */

/** Un poisson : un losange et une queue. Rien de plus ne se lit à cette taille. */
function Poisson({ x, y, l, teinte }: { x: number; y: number; l: number; teinte: string }) {
  return (
    <path
      d={`M${x} ${y} q${l * 0.55} ${-l * 0.34} ${l} 0 q${-l * 0.55} ${l * 0.34} ${-l} 0Z
          m0 0 l${-l * 0.42} ${-l * 0.3} v${l * 0.6}Z`}
      fill={teinte}
    />
  );
}

/** Un banc : des poissons de tailles inégales, jamais alignés. */
function Banc({
  x,
  y,
  teinte,
  n = 7,
}: {
  x: number;
  y: number;
  teinte: string;
  n?: number;
}) {
  // Écarts irréguliers, choisis une fois : une grille régulière lit comme un
  // motif, pas comme un banc.
  const places = [
    [0, 0, 1],
    [34, -14, 0.85],
    [66, 10, 0.95],
    [98, -6, 0.75],
    [128, 18, 0.9],
    [156, -20, 0.7],
    [188, 4, 0.8],
    [216, -12, 0.65],
  ].slice(0, n);

  return (
    <g fill={teinte}>
      {places.map(([dx, dy, e]) => (
        <Poisson key={`${dx}-${dy}`} x={x + dx} y={y + dy} l={26 * e} teinte={teinte} />
      ))}
    </g>
  );
}

/** Un oiseau : deux arcs. La taille dit la distance. */
function Oiseau({ x, y, e = 1 }: { x: number; y: number; e?: number }) {
  return <path d={`M${x - 11 * e} ${y} q${11 * e} ${-8 * e} ${11 * e} 0 q0 ${-8 * e} ${11 * e} 0`} />;
}

/* ---------------------------------------------------------------------------
   Les ciels.
   --------------------------------------------------------------------------- */

/** Île des hommes-poissons — l'eau au-dessus de la Forêt aux Coraux. */
function CielFishman() {
  return (
    <svg className="isl-ciel" {...CADRE} aria-hidden="true">
      {/* Les rais de lumière traversent maintenant **toute** la page. Ils
          étaient dans la bande du bas et s'arrêtaient à son bord supérieur :
          une colonne de lumière tranchée à l'horizontale au milieu de l'écran,
          ce qui ne ressemble à rien. Ils respirent, chacun à son rythme. */}
      <g fill="#ffffff">
        {[
          { x: 60, w: 54, o: 0.16, d: '17s' },
          { x: 250, w: 78, o: 0.2, d: '23s' },
          { x: 470, w: 46, o: 0.14, d: '19s' },
          { x: 700, w: 92, o: 0.18, d: '27s' },
          { x: 950, w: 60, o: 0.15, d: '21s' },
        ].map(({ x, w, o, d }) => (
          <path
            key={x}
            className="ciel-respire"
            style={course({ '--duree': d, opacity: o })}
            d={`M${x} 0 h${w} l${w * 1.5} 800 h-${w * 2.4}Z`}
          />
        ))}
      </g>

      {/* Trois bancs, à trois profondeurs et trois vitesses. Le plus profond est
          le plus pâle et le plus lent : c'est ce décalage qui fait l'eau. */}
      <g className="ciel-traverse" style={course({ '--duree': '38s', '--depart': '-260px', '--arrivee': '1300px' })}>
        <Banc x={0} y={168} teinte="rgba(20,85,92,.42)" />
      </g>
      <g
        className="ciel-traverse"
        style={course({ '--duree': '26s', '--retard': '-9s', '--depart': '-320px', '--arrivee': '1320px' })}
      >
        <Banc x={0} y={392} teinte="rgba(20,85,92,.55)" n={6} />
      </g>
      {/* Celui-ci remonte le courant : deux bancs dans le même sens donneraient
          un défilement, pas un milieu vivant. */}
      <g
        className="ciel-traverse"
        style={course({ '--duree': '46s', '--retard': '-20s', '--depart': '1320px', '--arrivee': '-320px' })}
      >
        <g transform="scale(-1 1)" style={{ transformOrigin: '120px 0' }}>
          <Banc x={0} y={280} teinte="rgba(20,85,92,.32)" n={5} />
        </g>
      </g>

      {/* Méduses. La coupole pulse et les fils suivent : c'est la seule façon de
          faire lire « méduse » plutôt que « parapluie ». */}
      {[
        { x: 180, y: 520, e: 1, d: '5.5s', m: '34s' },
        { x: 880, y: 610, e: 0.72, d: '4.2s', m: '41s' },
      ].map(({ x, y, e, d, m }) => (
        <g
          key={x}
          className="ciel-monte"
          style={course({ '--duree': m, '--depart': '80px', '--arrivee': '-780px' })}
        >
          <g className="ciel-pulse" style={course({ '--duree': d })} transform={`translate(${x} ${y}) scale(${e})`}>
            <path d="M-34 0 a34 30 0 0 1 68 0Z" fill="rgba(226,210,255,.5)" />
            <path
              d="M-22 2 q-4 30 4 46 M-7 3 q-3 34 3 52 M8 3 q4 32 -2 50 M23 1 q6 28 -2 44"
              stroke="rgba(226,210,255,.42)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          </g>
        </g>
      ))}

      {/* Colonnes de bulles : elles rétrécissent en montant, sinon elles lisent
          comme des perles enfilées. */}
      {[
        { x: 420, d: '13s', r: '0s' },
        { x: 760, d: '17s', r: '-6s' },
        { x: 1080, d: '15s', r: '-11s' },
      ].map(({ x, d, r }) => (
        <g
          key={x}
          className="ciel-monte"
          style={course({ '--duree': d, '--retard': r, '--depart': '120px', '--arrivee': '-900px' })}
          fill="rgba(255,255,255,.5)"
        >
          <circle cx={x} cy={760} r="7" />
          <circle cx={x + 12} cy={700} r="5" />
          <circle cx={x + 4} cy={648} r="3.6" />
          <circle cx={x + 16} cy={600} r="2.4" />
        </g>
      ))}

      {/* Une silhouette lointaine qui traverse très lentement. C'est elle qui
          donne l'échelle : tout le reste devient petit. */}
      <g
        className="ciel-traverse"
        style={course({ '--duree': '95s', '--depart': '-500px', '--arrivee': '1500px', opacity: 0.14 })}
        fill="#0b4653"
      >
        <path d="M0 120 q120 -46 250 0 q-40 26 -108 30 l16 26 -46 -24 q-70 -8 -112 -32Z" />
      </g>
    </svg>
  );
}

/** Elbaf — le grand nord après l'averse. */
function CielElbaf() {
  return (
    <svg className="isl-ciel" {...CADRE} aria-hidden="true">
      {/* Nuages hauts, très lents. Ils ne servent qu'à ce que le ciel ne soit
          pas un aplat. */}
      <g fill="rgba(255,255,255,.4)">
        {[
          { y: 90, e: 1, d: '110s', r: '0s' },
          { y: 210, e: 0.7, d: '150s', r: '-40s' },
          { y: 330, e: 0.5, d: '190s', r: '-90s' },
        ].map(({ y, e, d, r }) => (
          <g
            key={y}
            className="ciel-traverse"
            style={course({ '--duree': d, '--retard': r, '--depart': '-460px', '--arrivee': '1400px' })}
          >
            <g transform={`translate(0 ${y}) scale(${e})`}>
              <ellipse cx="120" cy="0" rx="120" ry="34" />
              <ellipse cx="230" cy="14" rx="86" ry="26" />
              <ellipse cx="40" cy="16" rx="70" ry="22" />
            </g>
          </g>
        ))}
      </g>

      {/* Un second vol, plus haut et plus petit que celui posé dans la
          silhouette : deux distances valent mieux qu'une. */}
      <g
        className="ciel-traverse"
        style={course({ '--duree': '54s', '--retard': '-12s', '--depart': '-300px', '--arrivee': '1400px' })}
        fill="none"
        stroke="#3c5266"
        strokeWidth="2.6"
        strokeLinecap="round"
        opacity=".5"
      >
        <g className="ciel-bat">
          <Oiseau x={0} y={150} e={0.9} />
          <Oiseau x={46} y={176} e={0.7} />
          <Oiseau x={92} y={140} e={0.8} />
          <Oiseau x={134} y={182} e={0.6} />
          <Oiseau x={178} y={158} e={0.75} />
        </g>
      </g>
    </svg>
  );
}

/** Alabasta — le désert, et la chaleur qui monte. */
function CielAlabasta() {
  return (
    <svg className="isl-ciel" {...CADRE} aria-hidden="true">
      {/* Ici le soleil a sa place : il est haut, blanc, écrasant. C'est le
          contraire du soleil levant de l'écran de connexion, qui traînait sur
          toutes les pages faute d'avoir été rangé. */}
      <g className="ciel-pulse" style={course({ '--duree': '9s', transformOrigin: '980px 130px' })}>
        <circle cx="980" cy="130" r="66" fill="rgba(255,250,224,.75)" />
        <circle cx="980" cy="130" r="118" fill="rgba(255,244,198,.22)" />
      </g>

      {/* Rapaces en cercle. Ils tournent autour d'un point, ils ne traversent
          pas : c'est ce qui distingue un vautour d'une mouette. */}
      {[
        { cx: 320, cy: 250, r: 130, d: '34s', e: 1 },
        { cx: 360, cy: 300, r: 190, d: '48s', e: 0.72 },
      ].map(({ cx, cy, r, d, e }) => (
        <g key={r} className="ciel-orbite" style={course({ '--duree': d, transformOrigin: `${cx}px ${cy}px` })}>
          <g
            fill="none"
            stroke="#6b4a2a"
            strokeWidth={2.8 * e}
            strokeLinecap="round"
            opacity=".45"
            className="ciel-bat"
          >
            <Oiseau x={cx + r} y={cy} e={1.4 * e} />
          </g>
        </g>
      ))}

      {/* Voiles de sable en altitude : le vent du désert soulève aussi haut. */}
      <g fill="rgba(226,196,138,.2)">
        {[
          { y: 430, d: '26s', r: '0s' },
          { y: 560, d: '19s', r: '-8s' },
        ].map(({ y, d, r }) => (
          <g
            key={y}
            className="ciel-traverse"
            style={course({ '--duree': d, '--retard': r, '--depart': '-500px', '--arrivee': '1400px' })}
          >
            <path d={`M0 ${y} q200 -26 400 0 q-200 34 -400 0Z`} />
          </g>
        ))}
      </g>
    </svg>
  );
}

/** Le Pays des Wa — grues et lanternes. */
function CielWano() {
  return (
    <svg className="isl-ciel" {...CADRE} aria-hidden="true">
      {/* Vol de grues en V. La formation est la signature ; des oiseaux épars
          auraient pu être n'importe où. */}
      <g
        className="ciel-traverse"
        style={course({ '--duree': '62s', '--depart': '-340px', '--arrivee': '1420px' })}
        fill="none"
        stroke="#8c4b5a"
        strokeWidth="3"
        strokeLinecap="round"
        opacity=".45"
      >
        <g className="ciel-bat">
          <Oiseau x={0} y={120} e={1.1} />
          <Oiseau x={-40} y={148} e={0.95} />
          <Oiseau x={40} y={150} e={0.95} />
          <Oiseau x={-80} y={178} e={0.8} />
          <Oiseau x={80} y={180} e={0.8} />
        </g>
      </g>

      {/* Lanternes lâchées sur l'eau, qui montent en se balançant. Le halo est
          ce qui les fait lire comme une flamme et non comme un ballon. */}
      {[
        { x: 210, e: 1, d: '44s', r: '0s' },
        { x: 540, e: 0.72, d: '58s', r: '-20s' },
        { x: 820, e: 0.9, d: '50s', r: '-34s' },
        { x: 1050, e: 0.6, d: '66s', r: '-48s' },
      ].map(({ x, e, d, r }) => (
        <g
          key={x}
          className="ciel-monte"
          style={course({ '--duree': d, '--retard': r, '--depart': '160px', '--arrivee': '-900px' })}
        >
          <g className="ciel-balance" transform={`translate(${x} 720) scale(${e})`}>
            <ellipse cx="0" cy="0" rx="26" ry="20" fill="rgba(255,220,160,.3)" />
            <path d="M-13 -12 h26 l4 20 q-17 9 -34 0Z" fill="#f3d06a" opacity=".8" />
            <path d="M-13 -12 h26" stroke="#8c2b2b" strokeWidth="2.5" opacity=".7" />
          </g>
        </g>
      ))}
    </svg>
  );
}

/** Logue Town — le ciel se charge. */
function CielLogue() {
  return (
    <svg className="isl-ciel" {...CADRE} aria-hidden="true">
      {/* Nuages d'orage : bas, lourds, plus sombres en dessous. */}
      <g>
        {[
          { y: 70, e: 1, d: '74s', r: '0s', o: 0.42 },
          { y: 190, e: 0.72, d: '96s', r: '-30s', o: 0.3 },
          { y: 300, e: 0.55, d: '120s', r: '-70s', o: 0.22 },
        ].map(({ y, e, d, r, o }) => (
          <g
            key={y}
            className="ciel-traverse"
            style={course({ '--duree': d, '--retard': r, '--depart': '-520px', '--arrivee': '1420px', opacity: o })}
          >
            <g transform={`translate(0 ${y}) scale(${e})`} fill="#54617a">
              <ellipse cx="140" cy="0" rx="150" ry="44" />
              <ellipse cx="290" cy="18" rx="104" ry="32" />
              <ellipse cx="30" cy="20" rx="88" ry="28" />
              <ellipse cx="160" cy="34" rx="180" ry="20" fill="#3f4a60" />
            </g>
          </g>
        ))}
      </g>

      {/* Mouettes : elles planent, elles ne battent pas — d'où l'absence de
          `ciel-bat` ici, et une trajectoire qui monte doucement. */}
      <g
        className="ciel-traverse"
        style={course({ '--duree': '43s', '--retard': '-14s', '--depart': '1400px', '--arrivee': '-260px' })}
        fill="none"
        stroke="#f0f4fa"
        strokeWidth="3"
        strokeLinecap="round"
        opacity=".55"
      >
        <Oiseau x={0} y={430} e={1.2} />
        <Oiseau x={70} y={396} e={0.9} />
        <Oiseau x={132} y={452} e={0.75} />
      </g>
    </svg>
  );
}

/** Sabaody — ce qui s'échappe de la résine. */
function CielSabaody() {
  return (
    <svg className="isl-ciel" {...CADRE} aria-hidden="true">
      {/* Les grandes bulles montent jusqu'en haut de la page. Dans la
          silhouette elles étaient immobiles ; c'est en montant qu'elles disent
          « résine » plutôt que « cercle ». */}
      {[
        { x: 150, r: 46, d: '30s', re: '0s' },
        { x: 420, r: 28, d: '22s', re: '-8s' },
        { x: 690, r: 60, d: '38s', re: '-19s' },
        { x: 940, r: 34, d: '26s', re: '-13s' },
        { x: 1120, r: 22, d: '20s', re: '-5s' },
      ].map(({ x, r, d, re }) => (
        <g
          key={x}
          className="ciel-monte"
          style={course({ '--duree': d, '--retard': re, '--depart': '180px', '--arrivee': '-980px' })}
        >
          <g className="ciel-balance" transform={`translate(${x} 780)`}>
            <circle cx="0" cy="0" r={r} fill="rgba(255,255,255,.22)" />
            <circle cx="0" cy="0" r={r} fill="none" stroke="rgba(232,220,255,.7)" strokeWidth="2" />
            <circle cx={-r * 0.34} cy={-r * 0.38} r={Math.max(2.5, r * 0.2)} fill="rgba(255,255,255,.8)" />
          </g>
        </g>
      ))}

      {/* Trouées de lumière dans la voûte. */}
      <g fill="#ffffff">
        {[
          { x: 300, w: 70, o: 0.12, d: '20s' },
          { x: 820, w: 96, o: 0.1, d: '26s' },
        ].map(({ x, w, o, d }) => (
          <path
            key={x}
            className="ciel-respire"
            style={course({ '--duree': d, opacity: o })}
            d={`M${x} 0 h${w} l${w * 1.3} 620 h-${w * 2.2}Z`}
          />
        ))}
      </g>
    </svg>
  );
}

/** Dressrosa — la fête ne s'arrête jamais. */
function CielDressrosa() {
  return (
    <svg className="isl-ciel" {...CADRE} aria-hidden="true">
      {/* Guirlandes de fanions entre les toits, qui ondulent. C'est le détail
          qui dit « fête permanente » sans dessiner une foule. */}
      {[
        { y: 130, d: '7s' },
        { y: 250, d: '9s', r: '-3s' },
      ].map(({ y, d, r }) => (
        <g key={y} className="ciel-onduleuse" style={course({ '--duree': d, '--retard': r ?? '0s' })}>
          <path
            d={`M-40 ${y} Q300 ${y + 60} 640 ${y} T1240 ${y}`}
            fill="none"
            stroke="rgba(184,80,58,.4)"
            strokeWidth="3"
          />
          {[40, 160, 280, 400, 520, 640, 760, 880, 1000, 1120].map((x, i) => (
            <path
              key={x}
              d={`M${x - 12} ${y + 26} h24 l-12 26Z`}
              fill={['#d4607a', '#f5c84a', '#5f8f4a', '#4d92c4'][i % 4]}
              opacity=".45"
            />
          ))}
        </g>
      ))}

      {/* Oiseaux, plus haut. */}
      <g
        className="ciel-traverse"
        style={course({ '--duree': '50s', '--depart': '-260px', '--arrivee': '1400px' })}
        fill="none"
        stroke="#8a5a33"
        strokeWidth="2.8"
        strokeLinecap="round"
        opacity=".4"
      >
        <g className="ciel-bat">
          <Oiseau x={0} y={420} e={1} />
          <Oiseau x={54} y={452} e={0.8} />
          <Oiseau x={104} y={410} e={0.7} />
        </g>
      </g>
    </svg>
  );
}

/** Le royaume de Drum — le froid, et un rapace. */
function CielDrum() {
  return (
    <svg className="isl-ciel" {...CADRE} aria-hidden="true">
      <g fill="rgba(255,255,255,.45)">
        {[
          { y: 110, e: 1, d: '120s', r: '0s' },
          { y: 260, e: 0.65, d: '160s', r: '-60s' },
        ].map(({ y, e, d, r }) => (
          <g
            key={y}
            className="ciel-traverse"
            style={course({ '--duree': d, '--retard': r, '--depart': '-460px', '--arrivee': '1400px' })}
          >
            <g transform={`translate(0 ${y}) scale(${e})`}>
              <ellipse cx="120" cy="0" rx="130" ry="32" />
              <ellipse cx="250" cy="12" rx="92" ry="24" />
            </g>
          </g>
        ))}
      </g>

      <g className="ciel-orbite" style={course({ '--duree': '40s', transformOrigin: '620px 300px' })}>
        <g fill="none" stroke="#3f5266" strokeWidth="3.4" strokeLinecap="round" opacity=".5" className="ciel-bat">
          <Oiseau x={820} y={300} e={1.5} />
        </g>
      </g>
    </svg>
  );
}

const CIELS: Partial<Record<IslandId, () => React.ReactElement>> = {
  elbaf: CielElbaf,
  alabasta: CielAlabasta,
  drum: CielDrum,
  dressrosa: CielDressrosa,
  fishman: CielFishman,
  wano: CielWano,
  logue: CielLogue,
  sabaody: CielSabaody,
};

export function IslandSky({ island }: { island: IslandId }) {
  const Ciel = CIELS[island];

  // `harbor` garde sa scène de port complète, `hq` n'a aucun décor : on doit
  // voir qu'on a quitté le jeu.
  if (!Ciel) return null;

  return <Ciel />;
}
