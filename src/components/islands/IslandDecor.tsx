import type { IslandId } from '@/domain/islands';

/**
 * Décor d'une île (cahier §50 à §54, §122).
 *
 * Composant **serveur, sans une ligne de JavaScript client**, et surtout : seul
 * le décor de l'île courante est rendu. Les dessiner tous puis en masquer cinq
 * en CSS coûterait à chaque requête de chaque joueur — c'est exactement le
 * défaut qu'a révélé le tir de charge sur le pont du port.
 *
 * ## Ce qui fait qu'on reconnaît une île
 *
 * La **silhouette**, pas la couleur. Un dégradé rose ne dit pas Wano ; un
 * torii, si. Chaque décor pose donc deux ou trois formes franches, lisibles à
 * la taille d'un téléphone, plutôt qu'une profusion de détails qui deviennent
 * du bruit sous 400 px de large.
 *
 * ## Lisibilité avant décor (§51)
 *
 * Tout est en arrière-plan fixe, `aria-hidden`, sans interception de clic, et
 * **atténué** : le contenu des pages intérieures repose sur un voile opaque, et
 * rien ici ne doit remonter au travers. Un décor qui dispute la lecture d'un
 * classement est un décor raté.
 *
 * §122 : aucun visuel de l'œuvre. Ce sont des formes géométriques — un torii
 * est deux montants et deux traverses, une pagode trois trapèzes empilés.
 */

/** Dressrosa — le pays des jouets : arènes, tuiles, moulins, confettis. */
function Dressrosa() {
  return (
    <svg
      className="isl isl--dressrosa"
      viewBox="0 0 400 220"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      {/* Collines et moulins, au fond. */}
      <path d="M0 150 Q70 118 140 146 T290 138 T400 152 V220 H0Z" fill="#d9a86b" opacity=".5" />
      {[60, 330].map((x) => (
        <g key={x} opacity=".45" fill="#8a5a33">
          <rect x={x - 3} y="112" width="6" height="38" />
          {[0, 90, 180, 270].map((a) => (
            <rect
              key={a}
              x={x - 1.5}
              y="90"
              width="3"
              height="22"
              transform={`rotate(${a + 25} ${x} 112)`}
            />
          ))}
        </g>
      ))}

      {/* Toits de tuiles, en enfilade. Deux rangs décalés suffisent à faire
          « ville » ; un troisième deviendrait une texture. */}
      <g opacity=".55">
        {[20, 78, 136, 250, 308, 366].map((x, i) => (
          <g key={x}>
            <rect x={x} y={150 - (i % 2) * 12} width="46" height="70" fill="#e8dcc6" />
            <path
              d={`M${x - 6} ${150 - (i % 2) * 12} L${x + 23} ${132 - (i % 2) * 12} L${x + 52} ${150 - (i % 2) * 12}Z`}
              fill="#b8503a"
            />
          </g>
        ))}
      </g>

      {/* Colisée Corrida : deux rangs d'arcades. C'est la forme qui nomme
          l'île — elle est donc au centre et plus opaque que le reste. */}
      <g opacity=".72">
        <rect x="150" y="120" width="100" height="100" fill="#efe3cb" />
        <path d="M150 120 H250 L244 108 H156Z" fill="#b8503a" />
        {[0, 1].map((rang) =>
          [0, 1, 2, 3].map((i) => {
            const x = 158 + i * 22;
            const y = 132 + rang * 36;
            return (
              <path
                key={`arc-${rang}-${i}`}
                d={`M${x} ${y + 26} V${y + 9} a8 9 0 0 1 16 0 V${y + 26}Z`}
                fill="#8a5a33"
                opacity=".55"
              />
            );
          }),
        )}
      </g>

      {/* Champ de fleurs au premier plan. */}
      <path d="M0 196 Q100 184 200 194 T400 190 V220 H0Z" fill="#d4607a" opacity=".38" />
    </svg>
  );
}

/** Île des hommes-poissons — sous la mer, mais éclairée. */
function Fishman() {
  return (
    <svg
      className="isl isl--fishman"
      viewBox="0 0 400 160"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      {/* Rayons filtrés depuis la surface : ce qui dit « on est dessous ». Ils
          s'évasent vers le bas — la lumière vient d'un point lointain, au-dessus
          de dix mille mètres d'eau. */}
      <g opacity=".26" fill="#ffffff">
        {[20, 110, 200, 290, 350].map((x, i) => (
          <path key={x} d={`M${x} 0 h${18 + i * 3} l${34 + i * 6} 160 h-${44 + i * 4}Z`} />
        ))}
      </g>

      {/* Bulle géante qui enferme l'île : un arc large, coupé par le cadre.
          Un cercle entier lirait comme une bordure décorative. */}
      <path
        d="M-10 168 A210 150 0 0 1 410 168"
        fill="rgba(255,255,255,.14)"
        stroke="rgba(255,255,255,.6)"
        strokeWidth="2.5"
      />

      {/* Arbre Eve. Sa couronne déborde du cadre par le haut : c'est ce qui
          donne l'échelle — l'arbre est plus grand que ce qu'on en voit. */}
      <ellipse cx="200" cy="34" rx="104" ry="46" fill="#2f7f66" opacity=".5" />
      <ellipse cx="200" cy="46" rx="72" ry="30" fill="#3f9578" opacity=".45" />
      <path d="M186 160 V64 h28 v96Z" fill="#5c422c" opacity=".55" />
      {/* Racines contrefortes : un tronc droit poserait comme un poteau. */}
      <path
        d="M186 160 q-16 -22 -34 -30 M214 160 q16 -22 34 -30"
        stroke="#5c422c"
        strokeWidth="9"
        strokeLinecap="round"
        fill="none"
        opacity=".45"
      />

      {/* Coraux, sur le fond. Trois branches par touffe, jamais symétriques. */}
      <g stroke="#e0748a" strokeWidth="5" strokeLinecap="round" fill="none" opacity=".55">
        {[
          [34, -26, -14, 16],
          [86, -20, -12, 12],
          [316, -30, -16, 18],
          [368, -22, -12, 14],
        ].map(([x, h, g, d]) => (
          <path key={x} d={`M${x} 160 v${h} m0 ${h / 2} l${g} ${h / 2} m0 ${h / 4} l${d} ${h / 2}`} />
        ))}
      </g>

      {/* Chapelets de bulles qui montent, de plus en plus petites. */}
      <g fill="rgba(255,255,255,.55)">
        {[
          [118, 130, 5],
          [124, 108, 3.5],
          [130, 88, 2.5],
          [280, 138, 6],
          [286, 112, 4],
          [292, 92, 2.6],
        ].map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
        ))}
      </g>

      {/* Banc de poissons : des losanges à queue, alignés en biais. */}
      <g fill="#14555c" opacity=".38">
        {[
          [58, 62],
          [76, 54],
          [94, 66],
          [330, 76],
          [348, 68],
        ].map(([x, y]) => (
          <path key={`${x}-${y}`} d={`M${x} ${y} q9 -6 18 0 q-9 6 -18 0Z m0 0 l-7 -5 v10Z`} />
        ))}
      </g>
    </svg>
  );
}

/** Wano — torii, pagode, mont, cerisiers. */
function Wano() {
  return (
    <svg
      className="isl isl--wano"
      viewBox="0 0 400 220"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      {/* Mont enneigé, au lointain. */}
      <path d="M250 220 L330 96 L410 220Z" fill="#b9c6d8" opacity=".5" />
      <path d="M306 134 L330 96 L354 134 q-12 8 -24 0 q-12 -8 -24 0Z" fill="#ffffff" opacity=".65" />

      {/* Pagode : trois toits, du plus large au plus étroit. */}
      <g opacity=".55">
        <rect x="66" y="126" width="52" height="94" fill="#e8d9d2" />
        {[
          [110, 44],
          [132, 36],
          [154, 30],
        ].map(([y, demi], i) => (
          <path
            key={y}
            d={`M${92 - demi - 8} ${y + 16} Q${92} ${y + 8} ${92 + demi + 8} ${y + 16} L${92 + demi} ${y} H${92 - demi}Z`}
            fill="#8c2b2b"
            opacity={0.9 - i * 0.05}
          />
        ))}
      </g>

      {/* Torii : la forme qui nomme l'arc. Deux montants, deux traverses, une
          inclinaison sur le linteau — sans elle, on lit « portique ». */}
      <g fill="#b8332f" opacity=".78">
        <path d="M232 220 V150 h10 v70Z" />
        <path d="M330 220 V150 h10 v70Z" />
        <path d="M218 148 Q286 138 354 148 L352 158 Q286 149 220 158Z" />
        <rect x="228" y="168" width="116" height="8" />
      </g>

      {/* Lanternes suspendues au linteau. */}
      <g opacity=".6" fill="#f3d06a">
        {[252, 286, 320].map((x) => (
          <g key={x}>
            <rect x={x - 0.5} y="176" width="1" height="8" fill="#8c2b2b" />
            <ellipse cx={x} cy="190" rx="6" ry="8" />
          </g>
        ))}
      </g>

      {/* Cerisier : un tronc penché et une masse de fleurs. */}
      <g opacity=".5">
        <path d="M34 220 q12 -50 36 -70" stroke="#6b4a3a" strokeWidth="9" fill="none" strokeLinecap="round" />
        <ellipse cx="78" cy="140" rx="46" ry="28" fill="#f0a8bd" />
        <ellipse cx="46" cy="158" rx="28" ry="18" fill="#f5bccd" />
      </g>
    </svg>
  );
}

/** Logue Town — la ville du commencement et de la fin, sous l'orage. */
function Logue() {
  return (
    <svg
      className="isl isl--logue"
      viewBox="0 0 400 220"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      {/* Éclair lointain : Logue Town s'achève sous la foudre. */}
      <path
        d="M336 20 l-14 46 h12 l-16 44 30 -50 h-12Z"
        fill="#fdf4c8"
        opacity=".5"
      />

      {/* Phare, sur la droite. */}
      <g opacity=".5" fill="#cbd3de">
        <path d="M356 220 V96 h18 v124Z" />
        <rect x="352" y="86" width="26" height="12" />
        <path d="M358 86 l7 -14 l7 14Z" fill="#8a3b1c" />
      </g>

      {/* Toits et cheminées du port. */}
      <g opacity=".55">
        {[0, 54, 108, 162, 250, 300].map((x, i) => (
          <g key={x}>
            <rect x={x} y={148 + (i % 2) * 10} width="48" height="72" fill="#dde3ec" />
            <path
              d={`M${x - 5} ${148 + (i % 2) * 10} L${x + 24} ${130 + (i % 2) * 10} L${x + 53} ${148 + (i % 2) * 10}Z`}
              fill="#8a4a30"
            />
            <rect x={x + 34} y={124 + (i % 2) * 10} width="7" height="16" fill="#9aa6b5" />
          </g>
        ))}
      </g>

      {/* Échafaud : plateforme de pierre au centre de la place. La forme est
          sobre — c'est un lieu, pas une scène. */}
      <g opacity=".68" fill="#aab4c2">
        <rect x="186" y="150" width="60" height="70" />
        <rect x="176" y="140" width="80" height="12" />
        <rect x="196" y="112" width="8" height="28" />
        <rect x="228" y="112" width="8" height="28" />
        <rect x="190" y="106" width="52" height="8" fill="#8f99a8" />
      </g>

      {/* Pluie : quelques traits obliques, pas un rideau. */}
      <g stroke="#ffffff" strokeWidth="1.4" opacity=".28" strokeLinecap="round">
        {[30, 96, 158, 214, 272, 340].map((x, i) => (
          <line key={x} x1={x} y1={20 + i * 9} x2={x - 8} y2={44 + i * 9} />
        ))}
      </g>
    </svg>
  );
}

/** Sabaody — mangroves géantes et bulles de résine. */
function Sabaody() {
  return (
    <svg
      className="isl isl--sabaody"
      viewBox="0 0 400 160"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      {/* Voûte de feuillage : la lumière arrive filtrée par le haut. */}
      <path d="M0 0 H400 V30 Q300 58 200 34 Q100 10 0 36Z" fill="#3f6b2c" opacity=".45" />

      {/* Troncs. Leur **largeur** dit l'échelle : à Sabaody, un arbre fait la
          taille d'une ville. Deux troncs franchement épais et contrastés valent
          mieux que six fins, qui liraient comme une forêt ordinaire — première
          version, ils se confondaient avec le fond. */}
      <g fill="#4a3220" opacity=".62">
        <path d="M8 160 V26 q26 -16 56 0 V160Z" />
        <path d="M300 160 V14 q30 -18 62 0 V160Z" />
      </g>

      {/* Veinage : deux traits par tronc suffisent à faire « écorce ». */}
      <g stroke="#2f1f12" strokeWidth="2" opacity=".3" fill="none">
        <path d="M26 160 V34 M46 160 V32" />
        <path d="M318 160 V22 M340 160 V20" />
      </g>

      {/* Racines aériennes qui replongent : la signature de la mangrove. */}
      <g fill="none" stroke="#4a3220" strokeWidth="7" opacity=".45" strokeLinecap="round">
        <path d="M64 92 q30 26 26 68" />
        <path d="M300 78 q-34 30 -28 82" />
        <path d="M362 96 q28 22 24 64" />
      </g>

      {/* Bulles de résine : grandes, rares, avec un reflet franc. Petites et
          nombreuses, elles liraient comme de la mousse. */}
      <g>
        {[
          [150, 62, 30],
          [232, 104, 21],
          [190, 130, 14],
          [268, 44, 12],
        ].map(([cx, cy, r]) => (
          <g key={`${cx}-${cy}`}>
            <circle cx={cx} cy={cy} r={r} fill="rgba(255,255,255,.28)" />
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="rgba(232,220,255,.75)"
              strokeWidth="1.8"
            />
            <circle
              cx={cx - r * 0.34}
              cy={cy - r * 0.38}
              r={Math.max(2, r * 0.22)}
              fill="rgba(255,255,255,.8)"
            />
          </g>
        ))}
      </g>
    </svg>
  );
}

const DECORS: Partial<Record<IslandId, () => React.ReactElement>> = {
  dressrosa: Dressrosa,
  fishman: Fishman,
  wano: Wano,
  logue: Logue,
  sabaody: Sabaody,
};

export function IslandDecor({ island }: { island: IslandId }) {
  const Decor = DECORS[island];

  // `harbor` a son propre décor — la scène du port, dans `HarborScene`. `hq`
  // n'en a aucun, délibérément : on doit voir qu'on a quitté le jeu.
  if (!Decor) return null;

  return (
    <div className="isl-layer" aria-hidden="true">
      <Decor />
    </div>
  );
}
