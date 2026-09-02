import type { IslandId } from '@/domain/islands';

/**
 * Décor d'une île (cahier §50 à §54, §122).
 *
 * Composant **serveur, sans une ligne de JavaScript client**, et surtout : seul
 * le décor de l'île courante est rendu. Les dessiner tous puis en masquer sept
 * en CSS coûterait à chaque requête de chaque joueur — c'est exactement le
 * défaut qu'a révélé le tir de charge sur le pont du port.
 *
 * ## Un cadre unique, large, et jamais rogné
 *
 * Tous les décors partagent `viewBox="0 0 900 300"`, soit exactement 3:1, et la
 * feuille de style donne au SVG le même `aspect-ratio`. Conséquence : le dessin
 * remplit **toujours** la largeur au pixel près — jamais de bande vide sur les
 * côtés, jamais de silhouette tranchée.
 *
 * C'est ce qui manquait. Les décors étaient dessinés dans un cadre 400×220,
 * presque carré ; sur un écran de bureau, large et bas, la mise à l'échelle
 * « entière » les laissait flotter au milieu avec deux cents pixels de vide de
 * chaque côté. Et plusieurs dessins débordaient de leur propre cadre — le mont
 * de Wano allait jusqu'à x=410 dans une boîte large de 400, les toits de
 * Dressrosa jusqu'à 412 : le SVG les tranchait net, quelle que soit la mise à
 * l'échelle.
 *
 * D'où la règle tenue ici sans exception : **toute coordonnée reste dans
 * `0 ≤ x ≤ 900` et `0 ≤ y ≤ 300`.**
 *
 * ## La zone sûre
 *
 * Sur un téléphone, un cadre 3:1 réduit à la largeur de l'écran ne ferait plus
 * qu'une centaine de pixels de haut. La feuille de style l'élargit donc et
 * laisse les bords sortir du champ. Ce qui **nomme** l'île — le torii, le
 * colisée, l'échafaud, l'arbre d'Adam — est pour cette raison placé au centre,
 * entre x=210 et x=690 ; les bords ne reçoivent que du secondaire — palmiers,
 * sapins, coraux — dont l'absence ne change rien à ce qu'on reconnaît.
 *
 * ## Lisibilité avant décor (§51)
 *
 * Tout est en arrière-plan fixe, `aria-hidden`, sans interception de clic, et
 * atténué : le contenu des pages intérieures repose sur un voile, et rien ici
 * ne doit remonter au travers. Un décor qui dispute la lecture d'un classement
 * est un décor raté.
 *
 * §122 : aucun visuel de l'œuvre. Ce sont des formes géométriques — un torii
 * est deux montants et deux traverses, une pagode trois trapèzes empilés.
 */

/** Le cadre partagé. 3:1, et la feuille de style tient le même rapport. */
const CADRE = {
  viewBox: '0 0 900 300',
  preserveAspectRatio: 'xMidYMax meet',
} as const;

/**
 * Elbaf — l'île des géants : l'arbre d'Adam, l'arc-en-ciel, les huttes.
 *
 * L'échelle est le sujet. Un arbre ordinaire au milieu d'un décor ordinaire ne
 * dirait rien ; ici le tronc fait à lui seul le neuvième de la largeur, la
 * ramure couvre plus de la moitié du cadre, et les huttes à côté paraissent
 * petites alors que leur porte fait deux étages.
 */
function Elbaf() {
  return (
    <svg className="isl isl--elbaf" {...CADRE} aria-hidden="true">
      {/* Arc-en-ciel, tout au fond : six bandes concentriques centrées sur le
          bas du cadre, si bien qu'on n'en voit que la voûte. L'arbre passera
          devant et n'en laissera que les deux flancs — c'est voulu : un
          arc-en-ciel entier et net lirait comme un autocollant. */}
      <g className="elbaf-arc" fill="none" strokeWidth="11" opacity=".5">
        {[
          { teinte: '#d95f4a', r: 296 },
          { teinte: '#e79a4a', r: 285 },
          { teinte: '#e9cf5c', r: 274 },
          { teinte: '#6fae5c', r: 263 },
          { teinte: '#4d92c4', r: 252 },
          { teinte: '#7a68b8', r: 241 },
        ].map(({ teinte, r }) => (
          <path key={r} d={`M${450 - r} 300 A${r} ${r} 0 0 1 ${450 + r} 300`} stroke={teinte} />
        ))}
      </g>

      {/* Reliefs du fond : la lande d'Elbaf, rase et froide. */}
      <path d="M0 236 L104 182 L196 236Z" fill="#7d94a0" opacity=".38" />
      <path d="M688 238 L792 174 L892 238Z" fill="#7d94a0" opacity=".34" />

      {/* Huttes de géants. Le toit est démesurément haut par rapport à la
          largeur, et la porte fait les deux tiers du mur : c'est ce qui les
          fait lire « bâties pour des géants » plutôt que « chalets ». */}
      {[
        { x: 70, y: 196, w: 120, h: 56 },
        { x: 712, y: 204, w: 110, h: 48 },
      ].map(({ x, y, w, h }) => (
        <g key={x} opacity=".6">
          <rect x={x} y={y} width={w} height={h} fill="#6b4a30" />
          <path d={`M${x - 12} ${y} L${x + w / 2} ${y - 50} L${x + w + 12} ${y}Z`} fill="#4c3421" />
          {/* Rondins : trois traits, pas plus — au-delà, on lit une texture au
              lieu d'un mur. */}
          <path
            d={`M${x} ${y + h / 4} h${w} M${x} ${y + h / 2} h${w} M${x} ${y + (h * 3) / 4} h${w}`}
            stroke="#4c3421"
            strokeWidth="2"
            opacity=".5"
          />
          <rect x={x + w / 2 - 17} y={y + h - 38} width="34" height="38" fill="#2f2013" opacity=".7" />
        </g>
      ))}

      {/* Fumée des foyers. C'est le détail qui dit qu'on **habite** là : une
          hutte sans fumée est une maquette. Trois bouffées par toit, décalées
          dans le temps — synchronisées, on lirait un clignotant. */}
      <g className="elbaf-fumee" fill="#ffffff">
        {[
          { x: 130, y: 146 },
          { x: 767, y: 154 },
        ].flatMap(({ x, y }) =>
          [0, 1, 2].map((n) => (
            <circle
              key={`${x}-${n}`}
              className="elbaf-bouffee"
              cx={x}
              cy={y - 6}
              r={5 + n}
              style={{ animationDelay: `${n * 2.3 + (x > 400 ? 1.1 : 0)}s` }}
            />
          )),
        )}
      </g>

      {/* Piques plantées et boucliers ronds posés au sol. Le détail qui dit
          qu'on est chez des guerriers, sans dessiner un guerrier. */}
      <g opacity=".5">
        {[240, 268, 646, 674].map((x) => (
          <g key={x}>
            <rect x={x - 2} y="196" width="4" height="60" fill="#5b4630" />
            <path d={`M${x - 6} 196 L${x} 176 L${x + 6} 196Z`} fill="#8d99a6" />
          </g>
        ))}
        {[302, 612].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy="236" r="16" fill="#8a4b32" />
            <circle cx={cx} cy="236" r="16" fill="none" stroke="#5b4630" strokeWidth="3" />
            <circle cx={cx} cy="236" r="4.5" fill="#8d99a6" />
          </g>
        ))}
      </g>

      {/* L'arbre d'Adam. Contreforts d'abord, tronc ensuite, ramure par-dessus
          — l'ordre de tracé fait la profondeur. */}
      <g opacity=".72">
        <path
          d="M404 262 q-46 -6 -78 14 M496 262 q46 -6 78 14"
          stroke="#4a3320"
          strokeWidth="20"
          strokeLinecap="round"
          fill="none"
        />
        <path d="M400 268 L420 104 L480 104 L500 268Z" fill="#5c422c" />
        <path
          d="M430 262 V112 M462 264 V110"
          stroke="#3d2b1c"
          strokeWidth="3"
          opacity=".45"
          fill="none"
        />
        {/* Deux maîtresses branches, qui partent chercher la ramure. */}
        <path
          d="M424 150 q-64 -14 -96 -46 M478 142 q66 -16 100 -50"
          stroke="#5c422c"
          strokeWidth="13"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {/* Ramure : six masses qui se chevauchent. Une seule ellipse lirait comme
          un nuage ; c'est le chevauchement qui fait le feuillage.

          Elle se balance (`elbaf-ramure`), très peu — moins d'un degré — mais
          autour du **pied du tronc**, si bien que le haut parcourt plusieurs
          pixels quand la base ne bouge pas. C'est ce qu'on voit d'un arbre de
          cette taille : la cime respire, le tronc non. */}
      <g className="elbaf-ramure" opacity=".62">
        <ellipse cx="450" cy="66" rx="236" ry="60" fill="#2f6b3c" />
        <ellipse cx="450" cy="46" rx="168" ry="40" fill="#377a44" />
        <ellipse cx="322" cy="92" rx="132" ry="44" fill="#356f3f" />
        <ellipse cx="580" cy="88" rx="144" ry="46" fill="#3b8248" />
        <ellipse cx="392" cy="118" rx="86" ry="30" fill="#2b6237" />
        <ellipse cx="522" cy="120" rx="94" ry="30" fill="#2b6237" />
      </g>

      {/* Un vol qui traverse. Rien ne dit « vivant » comme quelque chose qui
          entre par un bord et sort par l'autre : les oiseaux partent hors du
          cadre et y reviennent, et c'est le SVG qui les rogne aux bords. */}
      <g className="elbaf-vol" fill="none" stroke="#2f4658" strokeWidth="2.4" strokeLinecap="round">
        {[
          { x: 60, y: 42, e: 1 },
          { x: 96, y: 58, e: 0.8 },
          { x: 134, y: 36, e: 0.9 },
          { x: 168, y: 62, e: 0.7 },
        ].map(({ x, y, e }) => (
          <path
            key={x}
            className="elbaf-oiseau"
            d={`M${x - 9 * e} ${y} q${9 * e} ${-7 * e} ${9 * e} 0 q0 ${-7 * e} ${9 * e} 0`}
            style={{ animationDelay: `${(x % 40) * 0.09}s` }}
          />
        ))}
      </g>

      {/* Sol, en deux plans. */}
      <path d="M0 258 Q170 240 340 254 T680 246 T900 258 V300 H0Z" fill="#4f7a4a" opacity=".5" />
      <path d="M0 280 Q230 266 470 278 T900 272 V300 H0Z" fill="#3d6440" opacity=".5" />
    </svg>
  );
}

/** Alabasta — le royaume du désert : dunes, palais, palmiers. */
function Alabasta() {
  return (
    <svg className="isl isl--alabasta" {...CADRE} aria-hidden="true">
      {/* Dunes, en deux plans dont les crêtes se croisent. Parallèles, elles
          liraient comme des rayures. */}
      <path d="M0 214 Q180 176 360 208 T720 190 T900 206 V300 H0Z" fill="#e0b06a" opacity=".55" />
      <path d="M0 252 Q240 216 480 248 T900 236 V300 H0Z" fill="#d29a52" opacity=".6" />

      {/* Le palais : un corps, deux ailes, deux tours à dôme, un obélisque.
          C'est cette silhouette qui nomme le lieu, donc elle est au centre du
          cadre — la seule zone qu'un téléphone montre toujours. */}
      <g opacity=".66" fill="#e8d5b0">
        <rect x="330" y="188" width="46" height="64" />
        <rect x="524" y="188" width="46" height="64" />
        <rect x="372" y="152" width="156" height="100" />
        <path d="M372 152 h156 l-16 -18 h-124Z" fill="#c98f52" />
        {[398, 502].map((x) => (
          <g key={x}>
            <rect x={x - 18} y="112" width="36" height="44" />
            <path d={`M${x - 21} 112 a21 24 0 0 1 42 0Z`} fill="#c98f52" />
            <rect x={x - 2} y="90" width="4" height="16" fill="#c98f52" />
          </g>
        ))}
        <path d="M442 152 V96 h16 v56Z" />
        <path d="M442 96 l8 -18 l8 18Z" fill="#c98f52" />
      </g>

      {/* Palmiers. Trois, jamais alignés ni de même taille : trois copies
          identiques feraient un motif, pas une oasis. */}
      {[
        { x: 108, sens: 1, ech: 1 },
        { x: 232, sens: -1, ech: 0.8 },
        { x: 786, sens: -1, ech: 1.05 },
      ].map(({ x, sens, ech }) => {
        const cx = x + 6 * sens * ech;
        const cy = 258 - 68 * ech;
        return (
          <g key={x} opacity=".5">
            <path
              d={`M${x} 258 q${14 * sens} -34 ${6 * sens} -${62 * ech}`}
              stroke="#8a6234"
              strokeWidth={6 * ech}
              fill="none"
              strokeLinecap="round"
            />
            {[-42, -20, 0, 20, 42].map((a) => (
              <ellipse
                key={a}
                cx={cx}
                cy={cy}
                rx={26 * ech}
                ry={6 * ech}
                fill="#5f8f4a"
                transform={`rotate(${a} ${cx} ${cy + 2})`}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

/** Drum — le royaume enneigé : aiguilles, château perché, sapins. */
function Drum() {
  return (
    <svg className="isl isl--drum" {...CADRE} aria-hidden="true">
      {/* Les Drum Rockies : des aiguilles, pas des collines. C'est leur
          verticalité qui les distingue de n'importe quelle montagne. */}
      <path d="M0 300 L128 116 L214 206 L308 92 L430 300Z" fill="#b8cadd" opacity=".6" />
      <path d="M330 300 L470 62 L558 178 L640 104 L790 300Z" fill="#a7bdd3" opacity=".55" />
      <path d="M716 300 L820 138 L900 262 V300Z" fill="#b8cadd" opacity=".45" />

      {/* Neige des sommets : un triangle blanc qui déborde en festons sur les
          flancs, sinon on lit un capuchon posé. */}
      <g fill="#ffffff" opacity=".8">
        <path d="M288 120 L308 92 L328 120 q-20 11 -40 0Z" />
        <path d="M446 96 L470 62 L494 96 q-24 12 -48 0Z" />
        <path d="M800 168 L820 138 L840 168 q-20 11 -40 0Z" />
      </g>

      {/* Château perché sur la crête, au centre du cadre : donjon, deux tours
          coiffées, corps de garde en contrebas. */}
      <g opacity=".66" fill="#dbe6f0">
        <rect x="448" y="98" width="46" height="58" />
        <path d="M445 98 h52 l-9 -14 h-34Z" fill="#5d7b9c" />
        {[440, 502].map((x) => (
          <g key={x}>
            <rect x={x - 10} y="110" width="20" height="46" />
            <path d={`M${x - 13} 110 l13 -18 l13 18Z`} fill="#5d7b9c" />
          </g>
        ))}
        <rect x="424" y="156" width="94" height="26" />
        <path d="M424 156 h94 l-8 -10 h-78Z" fill="#5d7b9c" />
      </g>

      {/* Sapins alourdis de neige : trois étages, du plus large au plus étroit,
          et un liseré clair sur chacun. */}
      {[
        { x: 58, ech: 1 },
        { x: 116, ech: 0.82 },
        { x: 246, ech: 0.7 },
        { x: 668, ech: 0.72 },
        { x: 790, ech: 0.9 },
        { x: 858, ech: 1 },
      ].map(({ x, ech }) => (
        <g key={x} opacity={0.42 + ech * 0.18}>
          <rect x={x - 3} y="256" width="6" height="22" fill="#4a5f4a" />
          {[0, 1, 2].map((n) => {
            const y = 256 - n * 26 * ech;
            const w = (26 - n * 6) * ech;
            const h = 34 * ech;
            return (
              <g key={n}>
                <path d={`M${x - w} ${y} L${x} ${y - h} L${x + w} ${y}Z`} fill="#3f5f4a" />
                <path d={`M${x - w} ${y} L${x} ${y - h / 3} L${x + w} ${y}Z`} fill="#eef5fb" opacity=".7" />
              </g>
            );
          })}
        </g>
      ))}

      {/* Congère au premier plan : le blanc rejoint le bas du cadre. */}
      <path d="M0 274 Q220 258 450 272 T900 266 V300 H0Z" fill="#eef5fb" opacity=".55" />
    </svg>
  );
}

/** Dressrosa — le pays des jouets : arènes, tuiles, moulins, fleurs. */
function Dressrosa() {
  return (
    <svg className="isl isl--dressrosa" {...CADRE} aria-hidden="true">
      {/* Collines et moulins, au fond. */}
      <path d="M0 196 Q150 156 300 190 T620 178 T900 198 V300 H0Z" fill="#d9a86b" opacity=".5" />
      {[112, 764].map((x) => (
        <g key={x} opacity=".45" fill="#8a5a33">
          <rect x={x - 4} y="146" width="8" height="52" />
          {[0, 90, 180, 270].map((a) => (
            <rect key={a} x={x - 2} y="116" width="4" height="30" transform={`rotate(${a + 25} ${x} 146)`} />
          ))}
        </g>
      ))}

      {/* Toits de tuiles, en enfilade. Deux rangs décalés font « ville » ; un
          troisième deviendrait une texture. */}
      <g opacity=".55">
        {[16, 90, 164, 238, 578, 652, 726, 800].map((x, i) => (
          <g key={x}>
            <rect x={x} y={202 - (i % 2) * 16} width="60" height="98" fill="#e8dcc6" />
            <path
              d={`M${x - 8} ${202 - (i % 2) * 16} L${x + 30} ${178 - (i % 2) * 16} L${x + 68} ${202 - (i % 2) * 16}Z`}
              fill="#b8503a"
            />
          </g>
        ))}
      </g>

      {/* Le Colisée : deux rangs d'arcades. C'est la forme qui nomme l'île, et
          elle occupe donc le centre — la zone qu'un téléphone montre toujours. */}
      <g opacity=".74">
        <rect x="336" y="146" width="228" height="154" fill="#efe3cb" />
        <path d="M336 146 H564 L550 128 H350Z" fill="#b8503a" />
        {[0, 1].map((rang) =>
          [0, 1, 2, 3, 4, 5].map((i) => {
            const x = 350 + i * 36;
            const y = 162 + rang * 56;
            return (
              <path
                key={`arc-${rang}-${i}`}
                d={`M${x} ${y + 42} V${y + 15} a13 15 0 0 1 26 0 V${y + 42}Z`}
                fill="#8a5a33"
                opacity=".55"
              />
            );
          }),
        )}
      </g>

      {/* Champ de fleurs au premier plan : un rang de corolles posées sur une
          bande de terre, plutôt qu'un aplat rose. */}
      <path d="M0 264 Q200 250 400 262 T900 256 V300 H0Z" fill="#c4593f" opacity=".4" />
      <g fill="#d4607a" opacity=".45">
        {[24, 92, 160, 228, 296, 364, 432, 500, 568, 636, 704, 772, 840].map((x, i) => (
          <circle key={x} cx={x} cy={274 + (i % 3) * 7} r={5 + (i % 2) * 2} />
        ))}
      </g>
    </svg>
  );
}

/** Île des hommes-poissons — sous la mer, mais éclairée. */
function Fishman() {
  return (
    <svg className="isl isl--fishman" {...CADRE} aria-hidden="true">
      {/* Rayons filtrés depuis la surface : ce qui dit « on est dessous ». Ils
          s'évasent vers le bas — la lumière vient d'un point lointain, au-dessus
          de dix mille mètres d'eau. */}
      <g opacity=".24" fill="#ffffff">
        {[30, 190, 370, 560, 700].map((x, i) => (
          <path key={x} d={`M${x} 0 h${30 + i * 5} l${58 + i * 10} 300 h-${76 + i * 8}Z`} />
        ))}
      </g>

      {/* La bulle géante qui enferme l'île. Ses deux pieds touchent exactement
          le bas du cadre : elle est entière, aucun bord ne la tranche. */}
      <path
        d="M40 300 A420 262 0 0 1 860 300"
        fill="rgba(255,255,255,.13)"
        stroke="rgba(255,255,255,.55)"
        strokeWidth="3"
      />

      {/* L'Arbre Eve, au centre. Racines contrefortes : un tronc droit poserait
          comme un poteau. */}
      <path
        d="M424 300 q-40 -46 -84 -66 M476 300 q40 -46 84 -66"
        stroke="#5c422c"
        strokeWidth="15"
        strokeLinecap="round"
        fill="none"
        opacity=".45"
      />
      <path d="M420 300 V128 h60 v172Z" fill="#5c422c" opacity=".55" />
      <ellipse cx="450" cy="80" rx="212" ry="60" fill="#2f7f66" opacity=".5" />
      <ellipse cx="450" cy="58" rx="146" ry="40" fill="#3f9578" opacity=".45" />
      <ellipse cx="330" cy="106" rx="106" ry="32" fill="#2f7f66" opacity=".4" />
      <ellipse cx="572" cy="102" rx="112" ry="34" fill="#3f9578" opacity=".38" />

      {/* Coraux, sur le fond. Trois branches par touffe, jamais symétriques. */}
      <g stroke="#e0748a" strokeWidth="6" strokeLinecap="round" fill="none" opacity=".55">
        {[
          { x: 50, h: -44, g: -18, d: 20 },
          { x: 126, h: -34, g: -16, d: 16 },
          { x: 240, h: -28, g: -14, d: 14 },
          { x: 672, h: -30, g: -16, d: 16 },
          { x: 782, h: -50, g: -20, d: 22 },
          { x: 856, h: -36, g: -14, d: 18 },
        ].map(({ x, h, g, d }) => (
          <path key={x} d={`M${x} 300 v${h} m0 ${h / 2} l${g} ${h / 2} m0 ${h / 4} l${d} ${h / 2}`} />
        ))}
      </g>

      {/* Chapelets de bulles qui montent, de plus en plus petites. */}
      <g fill="rgba(255,255,255,.55)">
        {[
          [200, 240, 7],
          [210, 206, 5],
          [220, 174, 3.4],
          [700, 254, 8],
          [712, 214, 5.4],
          [722, 178, 3.6],
        ].map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
        ))}
      </g>

      {/* Banc de poissons : des losanges à queue, alignés en biais. */}
      <g fill="#14555c" opacity=".36">
        {[
          [110, 126],
          [140, 110],
          [170, 136],
          [200, 118],
          [706, 152],
          [738, 134],
          [770, 158],
        ].map(([x, y]) => (
          <path key={`${x}-${y}`} d={`M${x} ${y} q13 -8 26 0 q-13 8 -26 0Z m0 0 l-10 -7 v14Z`} />
        ))}
      </g>

      {/* Le fond de la fosse. */}
      <path d="M0 282 Q220 268 450 280 T900 274 V300 H0Z" fill="#14555c" opacity=".3" />
    </svg>
  );
}

/** Wano — torii, pagode, mont, cerisiers. */
function Wano() {
  return (
    <svg className="isl isl--wano" {...CADRE} aria-hidden="true">
      {/* Mont enneigé, au lointain. Il s'arrête à x=880 : dans la version
          précédente il allait jusqu'à 410 dans un cadre large de 400, et le SVG
          le tranchait net. */}
      <path d="M556 300 L718 92 L880 300Z" fill="#b9c6d8" opacity=".5" />
      <path d="M690 134 L718 92 L746 134 q-14 9 -28 0 q-14 -9 -28 0Z" fill="#ffffff" opacity=".65" />

      {/* Pagode : trois toits, du plus large en bas au plus étroit en haut, et
          des avant-toits retroussés. Droits, on lirait une tour. */}
      <g opacity=".55">
        <rect x="180" y="170" width="64" height="130" fill="#e8d9d2" />
        <rect x="210" y="150" width="4" height="22" fill="#8c2b2b" />
        {[
          { y: 170, demi: 44 },
          { y: 208, demi: 54 },
          { y: 246, demi: 64 },
        ].map(({ y, demi }, i) => (
          <path
            key={y}
            d={`M${212 - demi - 12} ${y + 22} Q212 ${y + 11} ${212 + demi + 12} ${y + 22} L${212 + demi} ${y} H${212 - demi}Z`}
            fill="#8c2b2b"
            opacity={0.9 - i * 0.05}
          />
        ))}
      </g>

      {/* Le torii, au centre. Deux montants, deux traverses, et l'inclinaison
          du linteau — sans elle, on lit « portique ». */}
      <g fill="#b8332f" opacity=".8">
        <path d="M414 300 V190 h18 v110Z" />
        <path d="M598 300 V190 h18 v110Z" />
        <path d="M392 186 Q515 170 638 186 L634 202 Q515 187 396 202Z" />
        <rect x="408" y="220" width="214" height="13" />
      </g>

      {/* Lanternes suspendues au linteau. */}
      <g opacity=".6" fill="#f3d06a">
        {[452, 515, 578].map((x) => (
          <g key={x}>
            <rect x={x - 1} y="233" width="2" height="12" fill="#8c2b2b" />
            <ellipse cx={x} cy="256" rx="9" ry="12" />
          </g>
        ))}
      </g>

      {/* Cerisiers : un tronc penché et une masse de fleurs, aux deux bords.
          Le rose est franc, presque soutenu : le ciel de Wano est lui-même
          rose, et des fleurs pâles s'y dissolvaient — on ne voyait plus que
          deux taches claires sans forme. */}
      {[
        { x: 60, sens: 1 },
        { x: 828, sens: -1 },
      ].map(({ x, sens }) => (
        <g key={x} opacity=".62">
          <path
            d={`M${x} 300 q${18 * sens} -66 ${54 * sens} -94`}
            stroke="#6b4a3a"
            strokeWidth="12"
            fill="none"
            strokeLinecap="round"
          />
          <ellipse cx={x + 62 * sens} cy="192" rx="62" ry="36" fill="#dd6f90" />
          <ellipse cx={x + 20 * sens} cy="216" rx="38" ry="24" fill="#e88ba6" />
        </g>
      ))}

      {/* Rizière en terrasses, au premier plan. */}
      <path d="M0 272 Q230 258 460 270 T900 264 V300 H0Z" fill="#8a9a68" opacity=".4" />
    </svg>
  );
}

/** Logue Town — la ville du commencement et de la fin, sous l'orage. */
function Logue() {
  return (
    <svg className="isl isl--logue" {...CADRE} aria-hidden="true">
      {/* Éclair lointain : Logue Town s'achève sous la foudre. */}
      <path d="M694 26 l-20 62 h18 l-24 60 44 -70 h-18Z" fill="#fdf4c8" opacity=".5" />

      {/* Phare, sur la droite, hors de la zone centrale : c'est un accent, pas
          la signature du lieu. */}
      <g opacity=".5" fill="#cbd3de">
        <path d="M818 300 V116 h26 v184Z" />
        <rect x="812" y="102" width="38" height="16" />
        <path d="M820 102 l11 -18 l11 18Z" fill="#8a3b1c" />
      </g>

      {/* Toits et cheminées du port, de part et d'autre de la place. */}
      <g opacity=".55">
        {[8, 80, 152, 224, 296, 570, 642, 714, 786].map((x, i) => (
          <g key={x}>
            {/* La hauteur se rétracte d'autant que le toit descend : sinon la
                rangée basse passait sous le bas du cadre, et le SVG la
                tranchait. */}
            <rect x={x} y={200 + (i % 2) * 14} width="62" height={100 - (i % 2) * 14} fill="#dde3ec" />
            <path
              d={`M${x - 7} ${200 + (i % 2) * 14} L${x + 31} ${176 + (i % 2) * 14} L${x + 69} ${200 + (i % 2) * 14}Z`}
              fill="#8a4a30"
            />
            <rect x={x + 44} y={166 + (i % 2) * 14} width="9" height="22" fill="#9aa6b5" />
          </g>
        ))}
      </g>

      {/* L'échafaud, au centre. La forme reste sobre — c'est un lieu, pas une
          scène — mais l'escalier latéral est nécessaire : sans lui, on lit un
          socle. */}
      <g opacity=".7" fill="#aab4c2">
        <rect x="404" y="204" width="92" height="96" />
        <rect x="388" y="188" width="124" height="18" />
        <rect x="414" y="142" width="12" height="46" />
        <rect x="474" y="142" width="12" height="46" />
        <rect x="404" y="130" width="92" height="14" fill="#8f99a8" />
        {[0, 1, 2, 3].map((n) => (
          <rect key={n} x={496 + n * 16} y={216 + n * 20} width="16" height={84 - n * 20} />
        ))}
      </g>

      {/* Pavés mouillés, au premier plan. */}
      <path d="M0 276 Q240 264 470 274 T900 268 V300 H0Z" fill="#5c6a82" opacity=".38" />

      {/* Quelques traits de pluie dans le dessin lui-même. L'averse animée est
          en CSS ; ceci n'en est que l'amorce, pour que le décor tienne aussi
          quand le joueur a demandé moins d'animations. */}
      <g stroke="#ffffff" strokeWidth="1.6" opacity=".26" strokeLinecap="round">
        {[60, 176, 300, 424, 548, 672, 796].map((x, i) => (
          <line key={x} x1={x} y1={24 + i * 12} x2={x - 12} y2={60 + i * 12} />
        ))}
      </g>
    </svg>
  );
}

/** Sabaody — mangroves géantes et bulles de résine. */
function Sabaody() {
  return (
    <svg className="isl isl--sabaody" {...CADRE} aria-hidden="true">
      {/* Voûte de feuillage : la lumière arrive filtrée par le haut. */}
      <path d="M0 0 H900 V54 Q676 104 450 62 Q224 20 0 66Z" fill="#3f6b2c" opacity=".45" />

      {/* Troncs. Leur **largeur** dit l'échelle : à Sabaody, un arbre fait la
          taille d'une ville. Deux d'entre eux sont au centre du cadre — sans
          quoi un téléphone ne montrerait que des bulles. */}
      <g fill="#4a3220" opacity=".62">
        <path d="M14 300 V52 q30 -20 66 0 V300Z" />
        <path d="M268 300 V36 q36 -22 78 0 V300Z" />
        <path d="M596 300 V44 q34 -22 74 0 V300Z" />
        <path d="M822 300 V60 q28 -18 62 0 V300Z" />
      </g>

      {/* Veinage : deux traits par tronc suffisent à faire « écorce ». */}
      <g stroke="#2f1f12" strokeWidth="2.5" opacity=".3" fill="none">
        <path d="M34 300 V58 M58 300 V56" />
        <path d="M292 300 V44 M322 300 V42" />
        <path d="M618 300 V52 M650 300 V50" />
        <path d="M842 300 V66 M866 300 V64" />
      </g>

      {/* Racines aériennes qui replongent : la signature de la mangrove. */}
      <g fill="none" stroke="#4a3220" strokeWidth="9" opacity=".45" strokeLinecap="round">
        <path d="M80 152 q36 32 32 120" />
        <path d="M268 128 q-40 34 -34 122" />
        <path d="M346 140 q42 30 38 116" />
        <path d="M596 136 q-38 32 -32 118" />
        <path d="M884 158 q22 30 10 116" />
      </g>

      {/* Bulles de résine : grandes, rares, avec un reflet franc. Petites et
          nombreuses, elles liraient comme de la mousse. */}
      <g>
        {[
          [430, 128, 46],
          [530, 196, 30],
          [396, 232, 20],
          [560, 82, 17],
          [180, 214, 24],
          [742, 190, 27],
        ].map(([cx, cy, r]) => (
          <g key={`${cx}-${cy}`}>
            <circle cx={cx} cy={cy} r={r} fill="rgba(255,255,255,.26)" />
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(232,220,255,.72)" strokeWidth="2" />
            <circle
              cx={cx - r * 0.34}
              cy={cy - r * 0.38}
              r={Math.max(2.5, r * 0.22)}
              fill="rgba(255,255,255,.8)"
            />
          </g>
        ))}
      </g>

      {/* Sol de bosquet. */}
      <path d="M0 278 Q220 266 450 276 T900 270 V300 H0Z" fill="#3f6b2c" opacity=".45" />
    </svg>
  );
}

const DECORS: Partial<Record<IslandId, () => React.ReactElement>> = {
  elbaf: Elbaf,
  alabasta: Alabasta,
  drum: Drum,
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
