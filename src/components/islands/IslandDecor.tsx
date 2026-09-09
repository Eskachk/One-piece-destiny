import type { IslandId } from '@/domain/islands';
import {
  Astre,
  AtmosphereDefs,
  Brume,
  Finition,
  Fumee,
  Oiseaux,
  Reflets,
} from './atmosphere';

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
      {/*
        La lumière vient d'en haut à droite, comme partout ailleurs dans le
        produit. Elbaf est la page la plus fréquentée : c'est ici que la
        cohérence se remarque, et c'est ici qu'une incohérence se remarquerait.
      */}
      <AtmosphereDefs id="elb" lumiere="#fff0c4" air="#c7dbe4" />

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

      {/* La brume passe **entre** la lande et les huttes : c'est sa place dans
          l'ordre de dessin qui recule les reliefs, pas sa couleur. Sans elle,
          un mont à l'horizon et une hutte à vingt mètres avaient la même
          densité, et la lande semblait collée derrière les toits. */}
      <Brume id="elb" y={168} hauteur={86} opacite={0.75} />

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

      {/* Ombre de l'arbre, vers la gauche. C'est le plus grand objet du décor
          et le seul dont l'absence d'ombre se voyait : il flottait au-dessus
          de la lande. L'ellipse est très allongée — un soleil haut mais pas au
          zénith. */}
      <ellipse cx="322" cy="274" rx="236" ry="18" fill="#2c4a2e" opacity=".22" />

      {/*
        ## L'arbre d'Adam, à deux étages

        La version précédente était un tronc droit surmonté de six ellipses
        vertes. Elle disait « grand arbre » et rien de plus.

        Ce qui fait celui-ci, et qu'aucune ellipse ne donne :

          — **deux étages de ramure**, empilés et séparés par du vide. C'est
            la silhouette entière : on voit à travers, entre les deux, et
            c'est ce vide qui dit la hauteur ;
          — **un bord supérieur festonné**. Une ellipse lisse est un nuage ;
            une suite de lobes qui se chevauchent est du feuillage ;
          — **des branches noueuses et horizontales**, qui partent du tronc
            sous chaque étage et fourchent. Elles portent la ramure au lieu de
            disparaître dedans ;
          — **un tronc cannelé qui s'évase**, avec des contreforts au sol. Un
            tronc à bords parallèles se lit comme un poteau.

        L'ordre de tracé fait tout : contreforts, tronc, branches basses,
        ramure basse, branches hautes, ramure haute. Chaque étage recouvre ce
        qui le porte, exactement comme on le voit d'en dessous.
      */}

      {/* Contreforts : le pied s'étale bien plus large que le fût. */}
      <g fill="#4a3320" opacity=".72">
        <path d="M368 272 q26 -44 62 -52 l0 52Z" />
        <path d="M532 272 q-26 -44 -62 -52 l0 52Z" />
        <path d="M396 274 q18 -30 44 -36 l0 36Z" />
        <path d="M504 274 q-18 -30 -44 -36 l0 36Z" />
      </g>

      {/* Fût. Évasé en bas, resserré en haut, et il monte jusqu'au second
          étage — il ne s'arrête pas sous le premier. */}
      <path
        d="M414 268 Q404 180 420 84 L482 84 Q498 180 488 268Z"
        fill="#5c422c"
        opacity=".78"
      />

      {/* Cannelures. Sept traits d'épaisseurs et de longueurs inégales : sept
          traits identiques feraient un rideau, pas une écorce. */}
      <g stroke="#3d2b1c" strokeLinecap="round" fill="none" opacity=".4">
        <path d="M428 262 Q422 180 432 104" strokeWidth="3.5" />
        <path d="M446 266 Q442 184 448 100" strokeWidth="2.5" />
        <path d="M462 264 Q460 182 462 102" strokeWidth="3" />
        <path d="M476 260 Q478 178 474 106" strokeWidth="2" />
        <path d="M418 250 Q414 190 424 130" strokeWidth="2" />
        <path d="M486 252 Q490 192 480 132" strokeWidth="2.5" />
      </g>

      {/* Côté éclairé du fût, à droite comme partout. */}
      <path d="M470 268 Q480 180 474 84 L482 84 Q498 180 488 268Z" fill="#7a5a3c" opacity=".5" />

      {/* --- Étage bas ------------------------------------------------------
          Branches d'abord : elles sortent du tronc, fourchent, et vont
          chercher les bords de la ramure. */}
      <g stroke="#4a3320" fill="none" strokeLinecap="round" opacity=".7">
        <path d="M418 178 q-52 -6 -84 12 q-26 12 -52 8" strokeWidth="11" />
        <path d="M334 190 q-14 -20 -38 -24" strokeWidth="7" />
        <path d="M484 176 q56 -8 92 10 q28 12 56 6" strokeWidth="11" />
        <path d="M576 186 q16 -20 42 -24" strokeWidth="7" />
      </g>

      {/* Ramure basse : une masse, puis les lobes du bord haut.

          Elle se balance autour du **pied du tronc** : le haut parcourt
          plusieurs pixels quand la base ne bouge pas, ce qui est exactement ce
          qu'on voit d'un arbre de cette taille — la cime respire, le tronc
          non. */}
      <g className="elbaf-ramure" opacity=".68">
        <path d="M148 204 Q160 168 262 164 Q450 146 640 166 Q744 170 754 204 Q640 224 450 222 Q260 224 148 204Z" fill="#2f6b3c" />
        {[
          [188, 182, 27],
          [246, 168, 33],
          [316, 160, 36],
          [396, 156, 37],
          [478, 158, 36],
          [558, 164, 34],
          [634, 172, 30],
          [700, 186, 25],
        ].map(([cx, cy, r]) => (
          <circle key={`b${cx}`} cx={cx} cy={cy} r={r} fill="#2f6b3c" />
        ))}
        {/* Lobes qui prennent le jour, côté droit. */}
        {[
          [478, 154, 26],
          [558, 160, 24],
          [634, 168, 20],
        ].map(([cx, cy, r]) => (
          <circle key={`bl${cx}`} cx={cx} cy={cy} r={r} fill="#4f9451" opacity=".55" />
        ))}
      </g>

      {/* --- Étage haut ----------------------------------------------------- */}
      <g stroke="#4a3320" fill="none" strokeLinecap="round" opacity=".7">
        <path d="M424 96 q-46 -4 -74 8 q-22 8 -44 4" strokeWidth="9" />
        <path d="M478 94 q48 -6 78 8 q24 8 48 2" strokeWidth="9" />
      </g>

      {/* L'étage haut se balance un peu plus : il est plus loin du pivot. */}
      <g className="elbaf-ramure elbaf-ramure--haute" opacity=".7">
        <path d="M182 78 Q194 40 288 34 Q450 14 616 36 Q712 42 722 78 Q616 98 450 96 Q288 98 182 78Z" fill="#377a44" />
        {[
          [222, 54, 28],
          [284, 38, 35],
          [356, 28, 39],
          [434, 22, 41],
          [514, 26, 39],
          [590, 36, 35],
          [664, 52, 28],
        ].map(([cx, cy, r]) => (
          <circle key={`h${cx}`} cx={cx} cy={cy} r={r} fill="#377a44" />
        ))}
        {/* Le feuillage qui prend la lumière : deux masses claires posées
            par-dessus, en haut à droite. C'est ce qui donne à la ramure un
            dessus et un dessous. */}
        {[
          [514, 20, 30],
          [590, 30, 25],
          [452, 14, 24],
        ].map(([cx, cy, r]) => (
          <circle key={`hl${cx}`} cx={cx} cy={cy} r={r} fill="#63a860" opacity=".5" />
        ))}
      </g>

      {/*
        ## Le hibou géant

        Il est posé sur la branche maîtresse de gauche, à l'étage bas — la
        seule qui soit assez dégagée pour qu'une silhouette s'y lise.

        Sa taille est le sujet : il fait la hauteur d'une hutte de géants, qui
        est elle-même bâtie pour des géants. C'est cette comparaison-là qui
        donne l'échelle de l'arbre, mieux que n'importe quel détail ajouté au
        tronc.

        §122 : des formes géométriques. Un corps est un œuf, une aile un arc,
        une aigrette un triangle, un œil deux disques.
      */}
      <g opacity=".82">
        {/* Corps. */}
        <ellipse cx="300" cy="150" rx="34" ry="42" fill="#6b5540" />
        {/* Aile repliée, côté ombre. */}
        <path d="M276 136 q-14 26 2 50 q12 -14 14 -46Z" fill="#54432f" />
        {/* Poitrail plus clair, côté lumière. */}
        <path d="M312 128 q18 24 8 52 q-14 8 -22 -4 q10 -22 14 -48Z" fill="#8d7458" opacity=".8" />
        {/* Aigrettes. */}
        <path d="M278 118 l8 -26 l14 20Z" fill="#6b5540" />
        <path d="M322 118 l-8 -26 l-14 20Z" fill="#6b5540" />
        {/* Face : le disque facial, puis les yeux, puis le bec. */}
        <ellipse cx="300" cy="130" rx="26" ry="22" fill="#8d7458" opacity=".7" />
        {[288, 312].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy="128" r="9" fill="#f2e6c8" />
            <circle cx={cx} cy="128" r="4.5" fill="#1e1913" />
          </g>
        ))}
        <path d="M300 136 l-5 9 h10Z" fill="#d8a13c" />
        {/* Serres refermées sur la branche. */}
        <g stroke="#d8a13c" strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M290 190 v8 M300 191 v9 M310 190 v8" />
        </g>
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

      {/* Sol, en deux plans, du plus clair au plus dense en approchant. */}
      <path d="M0 258 Q170 240 340 254 T680 246 T900 258 V300 H0Z" fill="#5c8752" opacity=".55" />
      <path d="M0 280 Q230 266 470 278 T900 272 V300 H0Z" fill="#33573a" opacity=".6" />

      <Finition id="elb" />
    </svg>
  );
}

/**
 * Une ligne de créneaux.
 *
 * Trois murs en portent dans le palais d'Alabasta, à trois hauteurs
 * différentes. Écrits trois fois à la main, ils auraient divergé au premier
 * réglage.
 */
function Creneaux({
  x,
  y,
  n,
  pas = 13,
  largeur = 7,
  hauteur = 7,
  fill,
}: {
  x: number;
  y: number;
  n: number;
  pas?: number;
  largeur?: number;
  hauteur?: number;
  fill: string;
}) {
  return (
    <g fill={fill}>
      {Array.from({ length: n }, (_, i) => (
        <rect key={i} x={x + i * pas} y={y - hauteur} width={largeur} height={hauteur} />
      ))}
    </g>
  );
}

/**
 * Alabasta — le royaume du désert : plateau, palais à coupoles, grand escalier.
 *
 * ## Ce que la version précédente ne disait pas
 *
 * C'était un corps de bâtiment, deux ailes, deux dômes et un obélisque, posés
 * à plat sur une dune. Ça se lisait « bâtiment clair dans le sable », jamais
 * « capitale ». Trois choses manquaient :
 *
 *   — **la hauteur.** Le palais domine un plateau de roche, il n'est pas au
 *     niveau du désert. C'est le plateau qui fait le royaume : sans lui, le
 *     même bâtiment n'est qu'une grande maison ;
 *   — **la ville.** Un palais isolé est un monument ; entouré d'un semis de
 *     petites coupoles de couleurs différentes, il devient une capitale ;
 *   — **le chemin.** Un grand escalier monte au centre, dans l'axe du palais.
 *     C'est lui qui donne l'échelle de tout le reste — on mesure la taille du
 *     bâtiment à ce qu'il faut gravir pour l'atteindre — et c'est lui qui dit
 *     que le lieu est habité.
 *
 * Au sommet, un drapeau au soleil. Il flotte, et c'est le seul mouvement de
 * l'île avec le vol d'oiseaux : sur un désert, le vent est la seule chose qui
 * bouge.
 *
 * ## La lumière n'est pas discutable ici
 *
 * `IslandSky` pose déjà le soleil d'Alabasta à droite du cadre. Toutes les
 * ombres portées tombent donc **vers la gauche**, toutes les faces claires
 * regardent à droite. Un second astre ajouté dans le décor — la première
 * version en avait mis un — donnait deux jeux d'ombres contradictoires, ce qui
 * est la façon la plus sûre d'aplatir un paysage.
 *
 * ## La profondeur se fait par la valeur, pas par les formes
 *
 * Du très pâle au loin — c'est l'air chargé de sable qui mange les reliefs —
 * au franchement chaud au premier plan. C'est ce seul écart qui creuse le
 * désert ; des montagnes mieux dessinées mais de densité voisine resteraient
 * un décor plat.
 *
 * §122 : des formes géométriques. Une coupole est un demi-disque, un soleil un
 * disque et douze langues, un escalier une suite de segments.
 */
function Alabasta() {
  return (
    <svg className="isl isl--alabasta" {...CADRE} aria-hidden="true">
      <AtmosphereDefs id="alb" lumiere="#ffe6ad" air="#f6e3bb" />

      {/* Chaîne lointaine, à peine plus dense que le ciel. */}
      <path
        d="M0 196 L74 138 L132 170 L198 124 L268 168 L330 140 L404 182 L470 132 L548 176 L618 128 L698 170 L764 136 L838 174 L900 146 V300 H0Z"
        fill="#dba97f"
        opacity=".34"
      />

      {/* La brume mange le pied de cette chaîne-là seulement : posée plus bas,
          elle voilerait aussi le palais, qui doit rester net. */}
      <Brume id="alb" y={138} hauteur={80} opacite={0.92} />

      {/* Oiseaux très haut et minuscules — c'est l'échelle qui fait le désert.
          Dessinés **avant** le palais : ils passent derrière le minaret, ce qui
          est la seule position juste pour des oiseaux lointains. Lents, quatre-
          vingts secondes pour traverser : un vol rapide donnerait une fuite. */}
      <Oiseaux y={62} teinte="#9a6b33" duree={80} echelle={0.9} />

      {/* Chaîne plus proche, plus chaude, et sur les côtés seulement : au
          centre, c'est le palais qui doit occuper le regard. */}
      <path d="M0 208 L58 154 L120 190 L186 148 L252 196 L316 206 H0Z" fill="#c07f57" opacity=".4" />
      <path
        d="M900 208 L842 152 L780 190 L714 146 L648 196 L584 206 H900Z"
        fill="#c07f57"
        opacity=".4"
      />

      {/* --- Le plateau ------------------------------------------------------
          Bord supérieur irrégulier : une falaise rectiligne se lit comme un
          mur de soutènement, pas comme de la roche.

          ## Pourquoi la falaise est nettement plus sombre que le sable

          Au premier essai, roche et sable partageaient la même valeur : le
          palais paraissait posé sur une dune, et les soixante-dix unités de
          hauteur que je venais de lui donner ne se voyaient nulle part. Une
          falaise ne se lit pas à sa forme — elle se lit à l'écart de valeur
          avec ce qui est devant elle. D'où cette masse franchement plus dense,
          et le sable repoussé tout en bas, en simple bande. */}
      <path
        d="M0 208 Q118 196 236 202 Q340 194 452 198 Q566 194 668 202 Q790 196 900 206 V300 H0Z"
        fill="#ab7130"
        opacity=".86"
      />

      {/* Le pied de la falaise, encore plus dense : c'est là que la roche
          reçoit le moins de ciel. Sans cet assombrissement, le mur remontait
          uniformément et se lisait comme un aplat. */}
      <path
        d="M0 244 Q220 236 452 242 Q680 236 900 244 V300 H0Z"
        fill="#7f4f1e"
        opacity=".3"
      />

      {/* Le dessus du plateau prend le jour : une bande claire le long de la
          crête. Sans elle, la falaise et sa table ont la même valeur, et le
          plateau redevient une découpe. */}
      <path
        d="M0 208 Q118 196 236 202 Q340 194 452 198 Q566 194 668 202 Q790 196 900 206 V218 Q790 208 668 214 Q566 206 452 210 Q340 206 236 214 Q118 208 0 220Z"
        fill="#e8b96e"
        opacity=".42"
      />

      {/* L'arête du plateau. C'est elle qui sépare la table de la paroi :
          sans trait ici, les deux se confondaient et le palais flottait
          au-dessus de sa propre falaise. Deux traits, pas un — un liseré clair
          pour le dessus qui prend le jour, un trait sombre juste dessous pour
          l'ombre que la corniche porte sur le vide. */}
      <path
        d="M0 208 Q118 196 236 202 Q340 194 452 198 Q566 194 668 202 Q790 196 900 206"
        fill="none"
        stroke="#ffe1a8"
        strokeWidth="3"
        opacity=".5"
      />
      <path
        d="M0 212 Q118 200 236 206 Q340 198 452 202 Q566 198 668 206 Q790 200 900 210"
        fill="none"
        stroke="#6d4318"
        strokeWidth="2.5"
        opacity=".22"
      />

      {/* Strates. Une roche sédimentaire se lit d'abord à ses couches
          horizontales, avant ses fissures verticales — et deux bandes très
          ténues suffisent à le dire. */}
      <path
        d="M0 226 Q220 220 452 226 Q680 220 900 228 V234 Q680 226 452 232 Q220 226 0 232Z"
        fill="#7f4f1e"
        opacity=".16"
      />
      <path
        d="M0 250 Q220 244 452 250 Q680 244 900 252 V256 Q680 248 452 254 Q220 248 0 254Z"
        fill="#7f4f1e"
        opacity=".13"
      />

      {/* Ravines d'érosion.

          ## Ce que le premier essai avait raté

          C'étaient quatorze traits d'égale épaisseur, régulièrement espacés,
          verticaux. Sur une paroi lisse, ça ne se lisait pas comme de la roche
          fendue : ça se lisait comme une **rangée de poteaux** plantés devant
          la falaise.

          Trois corrections, et c'est le lot qui fonctionne, pas l'une d'elles :

            — des **coins** plutôt que des traits. Une ravine est large en haut,
              là où l'eau entre, et se perd en descendant ;
            — un **fruit** : elles penchent toutes légèrement dans le même sens,
              comme un ruissellement, au lieu de tomber à la verticale ;
            — un **groupement** irrégulier. L'eau ne creuse pas à intervalles
              réguliers : elle revient là où elle a déjà creusé. Elles vont donc
              par deux ou trois, avec de larges pans intacts entre les groupes.

          Aucune au centre : c'est là que passe l'escalier. */}
      {[
        { x: 38, y: 212, h: 46, l: 9 },
        { x: 56, y: 216, h: 30, l: 5 },
        { x: 72, y: 214, h: 38, l: 6 },
        { x: 140, y: 210, h: 50, l: 11 },
        { x: 162, y: 218, h: 32, l: 6 },
        { x: 246, y: 210, h: 52, l: 10 },
        { x: 266, y: 216, h: 34, l: 5 },
        { x: 284, y: 212, h: 42, l: 7 },
        { x: 342, y: 214, h: 40, l: 8 },
        { x: 558, y: 212, h: 44, l: 8 },
        { x: 578, y: 218, h: 30, l: 5 },
        { x: 646, y: 208, h: 54, l: 12 },
        { x: 670, y: 216, h: 34, l: 6 },
        { x: 688, y: 212, h: 44, l: 7 },
        { x: 762, y: 210, h: 48, l: 10 },
        { x: 784, y: 218, h: 30, l: 5 },
        { x: 846, y: 212, h: 44, l: 9 },
        { x: 866, y: 218, h: 32, l: 5 },
      ].map(({ x, y, h, l }) => (
        <path
          key={x}
          d={`M${x} ${y} l${l} 2 l${-l * 0.4} ${h} l${-l * 0.28} -1Z`}
          fill="#6d4318"
          opacity=".24"
        />
      ))}

      {/* --- La ville basse --------------------------------------------------
          Un semis de petites coupoles de part et d'autre du palais. Elles ne
          sont pas décoratives : c'est leur présence qui transforme un monument
          isolé en capitale, et leur petitesse qui donne sa taille au palais.
          Couleurs volontairement variées — un quartier monochrome se lirait
          comme une aile du bâtiment principal. */}
      {[
        { x: 150, l: 40, h: 34, dome: '#93ac93' },
        { x: 200, l: 28, h: 24, dome: '#c2a05f' },
        { x: 240, l: 46, h: 44, dome: '#9d86ac' },
        { x: 296, l: 32, h: 28, dome: '#93ac93' },
        { x: 336, l: 26, h: 20, dome: '#c2a05f' },
        { x: 566, l: 26, h: 20, dome: '#9d86ac' },
        { x: 604, l: 32, h: 28, dome: '#93ac93' },
        { x: 646, l: 46, h: 42, dome: '#c2a05f' },
        { x: 702, l: 28, h: 24, dome: '#9d86ac' },
        { x: 742, l: 40, h: 32, dome: '#93ac93' },
      ].map(({ x, l, h, dome }) => {
        const sol = 202;
        const haut = sol - h;
        return (
          <g key={x} opacity=".72">
            {/* Ombre au sol, vers la gauche comme tout le reste de l'île. */}
            <ellipse
              cx={x - l * 0.35}
              cy={sol + 1}
              rx={l * 0.6}
              ry={3}
              fill="#a9702f"
              opacity=".22"
            />
            <rect x={x - l / 2} y={haut} width={l} height={h} fill="#e3cba1" />
            {/* Face éclairée, à droite. */}
            <rect x={x + l / 2 - 5} y={haut} width="5" height={h} fill="#fbf0d6" opacity=".7" />
            <path
              d={`M${x - l / 2 - 2} ${haut} a${l / 2 + 2} ${l / 2 - 2} 0 0 1 ${l + 4} 0Z`}
              fill={dome}
            />
            {/* Croissant de lumière sur la coupole : une coupole mate se lit
                comme un demi-cercle découpé. */}
            <path
              d={`M${x + 2} ${haut - l / 2 + 3} a${l / 3} ${l / 3} 0 0 1 ${l / 2 - 2} ${l / 2 - 4} a${l / 2 + 2} ${l / 2 - 2} 0 0 0 -${l / 2 - 2} -${l / 2 - 4}Z`}
              fill="#fbf0d6"
              opacity=".4"
            />
            <rect x={x - 1} y={haut - l / 2 - 5} width="2" height="6" fill="#c98f52" />
          </g>
        );
      })}

      {/* --- Le palais -------------------------------------------------------
          Au centre du cadre, entre x=330 et x=570 : la seule zone qu'un
          téléphone montre toujours. */}

      {/* Ombre portée sur la table du plateau, vers la gauche. Sans elle, tout
          le bâtiment flotte au-dessus de sa propre falaise. */}
      <path d="M330 198 l-70 12 H540 l6 -12Z" fill="#a9702f" opacity=".2" />

      <g opacity=".86">
        {/* Soubassement : le palais est bâti sur une terrasse, pas posé. */}
        <rect x="326" y="186" width="248" height="14" fill="#c98f52" />
        <rect x="326" y="186" width="248" height="4" fill="#fbf0d6" opacity=".5" />

        {/* Ailes, puis corps central, puis bloc supérieur : du plus bas au plus
            haut, chaque volume recouvrant celui qui le porte. */}
        <g fill="#e3cba1">
          <rect x="336" y="140" width="44" height="48" />
          <rect x="520" y="140" width="44" height="48" />
          <rect x="380" y="114" width="140" height="74" />
          <rect x="404" y="92" width="92" height="24" />
        </g>

        {/* Faces éclairées, côté soleil. C'est le seul détail qui transforme
            une découpe en volume. */}
        <g fill="#fbf0d6" opacity=".72">
          <rect x="552" y="140" width="12" height="48" />
          <rect x="506" y="114" width="14" height="74" />
          <rect x="482" y="92" width="14" height="24" />
          <rect x="368" y="140" width="12" height="48" />
        </g>

        {/* Créneaux, aux trois hauteurs. Ceux du corps central s'arrêtent aux
            épaules du bloc supérieur : les poser dessous les rendrait
            invisibles, les poser dessus ferait un mur au milieu d'un toit. */}
        <Creneaux x={338} y={140} n={3} pas={14} fill="#d8bd90" />
        <Creneaux x={522} y={140} n={3} pas={14} fill="#d8bd90" />
        <Creneaux x={382} y={114} n={2} pas={12} fill="#d8bd90" />
        <Creneaux x={496} y={114} n={2} pas={12} fill="#d8bd90" />
        <Creneaux x={406} y={92} n={7} pas={13} fill="#d8bd90" />

        {/* Arcade du corps central : quatre arcs, tentures rouges au fond.
            C'est le seul rouge du décor, et il tient là où l'œil arrive. */}
        {[0, 1, 2, 3].map((i) => {
          const x = 392 + i * 34;
          return (
            <g key={x}>
              <path d={`M${x} 184 V150 a11 12 0 0 1 22 0 V184Z`} fill="#9c3a4c" opacity=".62" />
              <path d={`M${x + 4} 184 V151 a7 8 0 0 1 14 0 V184Z`} fill="#c05468" opacity=".5" />
            </g>
          );
        })}

        {/* Un arc plus petit dans chaque aile. */}
        {[350, 534].map((x) => (
          <path key={x} d={`M${x} 186 V166 a8 9 0 0 1 16 0 V186Z`} fill="#9c3a4c" opacity=".55" />
        ))}

        {/* Les trois coupoles d'or. La centrale est plus haute et posée sur un
            tambour : trois coupoles alignées à la même hauteur feraient une
            rangée d'oignons, pas une couronne. */}
        {[424, 476].map((cx) => (
          <g key={cx}>
            <path d={`M${cx - 15} 92 a15 15 0 0 1 30 0Z`} fill="#d9a93a" />
            <path
              d={`M${cx + 2} 79 a9 9 0 0 1 12 12 a15 15 0 0 0 -12 -12Z`}
              fill="#f7dd8c"
              opacity=".75"
            />
          </g>
        ))}

        <rect x="436" y="76" width="28" height="16" fill="#e3cba1" />
        <rect x="456" y="76" width="8" height="16" fill="#fbf0d6" opacity=".7" />
        <path d="M431 76 a19 19 0 0 1 38 0Z" fill="#d9a93a" />
        <path d="M452 58 a12 12 0 0 1 15 16 a19 19 0 0 0 -15 -16Z" fill="#f7dd8c" opacity=".8" />

        {/* Le minaret, au-dessus de tout. */}
        <rect x="446" y="44" width="8" height="16" fill="#e3cba1" />
        <rect x="451" y="44" width="3" height="16" fill="#fbf0d6" opacity=".7" />
        <path d="M443 44 L450 30 L457 44Z" fill="#c98f52" />
        <circle cx="450" cy="28" r="3" fill="#d9a93a" />
      </g>

      {/* --- Le drapeau au soleil -------------------------------------------
          Hampe fine, drapeau à droite du mât, et le tout oscille lentement
          autour du mât. `transform-box: fill-box` avec une origine à gauche :
          c'est ce qui fait tourner le tissu **autour de sa hampe** et non
          autour de son propre centre — seule différence entre un drapeau qui
          flotte et un panneau qui pivote. */}
      <line x1="450" y1="28" x2="450" y2="12" stroke="#c98f52" strokeWidth="2.5" />
      <g className="isl-drapeau">
        <path
          d="M452 14 Q472 10 492 16 L492 34 Q472 40 452 34Z"
          fill="#fdf6e6"
          stroke="#d8c49a"
          strokeWidth="1"
          opacity=".95"
        />
        {/* Le soleil : un disque et douze langues. Les langues sont ce qui
            distingue un soleil d'un point — un disque seul se lirait comme une
            pastille de couleur. */}
        <g fill="#e2842c">
          {Array.from({ length: 12 }, (_, i) => (
            <path
              key={i}
              d="M472 14 q3.4 4.6 0 9.2 q-3.4 -4.6 0 -9.2Z"
              transform={`rotate(${i * 30} 472 25)`}
            />
          ))}
          <circle cx="472" cy="25" r="6" />
        </g>
      </g>

      {/* --- Le premier plan -------------------------------------------------
          La dune la plus chaude et la plus dense, creusée au centre : c'est
          dans ce vallon que l'escalier vient poser son pied. Une dune bombée
          au milieu aurait enterré ses six dernières marches. */}
      <path
        d="M0 262 Q150 244 292 258 Q380 270 450 280 Q520 270 610 256 Q752 238 900 254 V300 H0Z"
        fill="#cf8f42"
        opacity=".72"
      />
      <path
        d="M0 262 Q150 244 292 258 Q380 270 450 280 Q520 270 610 256 Q752 238 900 254"
        fill="none"
        stroke="#ffe1a8"
        strokeWidth="2.5"
        opacity=".3"
      />

      {/* --- Le grand escalier -----------------------------------------------
          Dessiné après la dune, donc devant elle : c'est la seule façon de le
          voir entier, et un escalier dont on ne voit pas le pied ne mène nulle
          part. Un tablier de sable, à la fin, enterre ses dernières marches et
          rattrape la profondeur. */}
      <g opacity=".88">
        <path d="M406 286 L432 200 H468 L494 286Z" fill="#e8ddc4" opacity=".7" />

        {/* Marches. L'écart se resserre en montant : c'est ce raccourci, et lui
            seul, qui donne la pente. Régulièrement espacées, elles feraient une
            échelle vue à plat. */}
        {Array.from({ length: 17 }, (_, i) => {
          const t = i / 16;
          const e = t * (2 - t);
          const y = 286 - 86 * e;
          const demi = 44 - 26 * e;
          return (
            <path
              key={i}
              d={`M${450 - demi} ${y} H${450 + demi}`}
              stroke="#b09b71"
              strokeWidth="1.5"
              opacity=".5"
            />
          );
        })}

        {/* Rampes. Celle de droite est plus claire — même soleil que partout. */}
        <path d="M406 286 L432 200 h-9 L397 286Z" fill="#cbbb98" opacity=".75" />
        <path d="M494 286 L468 200 h9 L503 286Z" fill="#efe6cf" opacity=".8" />

        {/* Les deux pylônes du bas. Ils gardent l'entrée et donnent, à eux
            seuls, la hauteur de la falaise : on lit un plateau à ce qui le
            dépasse. */}
        {[388, 512].map((x) => (
          <g key={x}>
            <ellipse cx={x - 9} cy="288" rx="13" ry="3" fill="#a9702f" opacity=".25" />
            <rect x={x - 7} y="228" width="14" height="60" fill="#dcd0b4" />
            <rect x={x + 3} y="228" width="4" height="60" fill="#fbf0d6" opacity=".75" />
            <path d={`M${x - 10} 228 h20 l-10 -13Z`} fill="#c98f52" />
          </g>
        ))}

        <ellipse cx="450" cy="287" rx="70" ry="8" fill="#cf8f42" opacity=".6" />
      </g>

      {/* Palmiers, sur les bords : du secondaire, dont l'absence sur un écran
          étroit ne change rien à ce qu'on reconnaît. Trois, jamais alignés ni
          de même taille — trois copies identiques feraient un motif. */}
      {[
        { x: 96, sens: 1, ech: 0.74 },
        { x: 202, sens: -1, ech: 0.6 },
        { x: 812, sens: -1, ech: 0.8 },
      ].map(({ x, sens, ech }) => {
        const cx = x + 6 * sens * ech;
        const cy = 290 - 68 * ech;
        return (
          <g key={x} opacity=".62">
            <ellipse cx={x - 16 * ech} cy="292" rx={22 * ech} ry={4} fill="#a9702f" opacity=".3" />
            <path
              d={`M${x} 290 q${14 * sens} -34 ${6 * sens} -${62 * ech}`}
              stroke="#7d5527"
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
                // Palmes du côté du soleil plus claires : la lumière traverse
                // la fronde, elle ne s'arrête pas dessus.
                fill={a > 0 ? '#7aad5f' : '#4f7a3c'}
                transform={`rotate(${a} ${cx} ${cy + 2})`}
              />
            ))}
          </g>
        );
      })}

      <Finition id="alb" />
    </svg>
  );
}

/** Drum — le royaume enneigé : aiguilles, château perché, sapins. */
function Drum() {
  return (
    <svg className="isl isl--drum" {...CADRE} aria-hidden="true">
      {/* Lumière **froide**, et c'est le seul décor dans ce cas. Un soleil
          chaud sur de la neige donne une plage ; ce qu'on cherche ici est la
          clarté sans chaleur d'un ciel couvert d'hiver. */}
      <AtmosphereDefs id="drm" lumiere="#eaf4ff" air="#cfe0ee" />

      {/* Les Drum Rockies : des aiguilles, pas des collines. C'est leur
          verticalité qui les distingue de n'importe quelle montagne. */}
      <path d="M0 300 L128 116 L214 206 L308 92 L430 300Z" fill="#b8cadd" opacity=".6" />
      {/* Brume de vallée : elle mange le pied des aiguilles. C'est ce qui les
          éloigne — sans elle, un sommet à dix kilomètres était aussi net qu'un
          sapin à vingt mètres. */}
      <Brume id="drm" y={186} hauteur={78} opacite={0.8} />
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

      {/* Fumée du château. Dans un paysage de neige, c'est le seul signe
          possible qu'on y vit : tout le reste est minéral et immobile. */}
      <Fumee x={392} y={128} teinte="#dfe9f2" duree={11} />

      {/* Congère au premier plan : le blanc rejoint le bas du cadre. */}
      <path d="M0 274 Q220 258 450 272 T900 266 V300 H0Z" fill="#eef5fb" opacity=".62" />

      {/* Crête éclairée de la congère. Sur la neige, c'est le seul relief
          possible : tout y est de la même couleur, et seule l'arête attrape
          la lumière. Sans elle, le premier plan était un aplat blanc. */}
      <path
        d="M0 274 Q220 258 450 272 T900 266"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3"
        opacity=".7"
      />

      <Finition id="drm" />
    </svg>
  );
}

/** Dressrosa — le pays des jouets : arènes, tuiles, moulins, fleurs. */
function Dressrosa() {
  return (
    <svg className="isl isl--dressrosa" {...CADRE} aria-hidden="true">
      <AtmosphereDefs id="drs" lumiere="#ffdfa6" air="#f0cfa8" />

      {/* Collines et moulins, au fond. */}
      <path d="M0 196 Q150 156 300 190 T620 178 T900 198 V300 H0Z" fill="#d9a86b" opacity=".5" />
      <Brume id="drs" y={164} hauteur={72} opacite={0.7} />
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
      <path d="M0 264 Q200 250 400 262 T900 256 V300 H0Z" fill="#c4593f" opacity=".48" />
      <g fill="#d4607a" opacity=".5">
        {[24, 92, 160, 228, 296, 364, 432, 500, 568, 636, 704, 772, 840].map((x, i) => (
          <circle key={x} cx={x} cy={274 + (i % 3) * 7} r={5 + (i % 2) * 2} />
        ))}
      </g>

      {/* Un vol bas au-dessus des toits. Dressrosa est la seule île où l'on a
          des tuiles et des places : ce qui la rend vivante, c'est ce qui
          survole une ville, pas ce qui plane au-dessus d'un désert. */}
      <Oiseaux y={72} teinte="#8a4632" duree={54} retard={-12} echelle={1.1} />

      <Finition id="drs" />
    </svg>
  );
}

/**
 * Un poisson-ruban qui traverse la fosse.
 *
 * ## Comment on ondule sans repeindre
 *
 * Le corps n'est pas un tracé qu'on déforme : c'est une **file d'anneaux**,
 * chacun animé pour son compte, chacun reprenant le mouvement du précédent
 * avec un temps de retard. Ce décalage, et lui seul, fait remonter une vague
 * le long du corps ; au même rythme, les treize anneaux monteraient et
 * descendraient ensemble et on lirait un ruban secoué, pas un poisson.
 *
 * C'est aussi la seule écriture qui tienne le budget de la page. Déformer un
 * `path` demanderait de recalculer sa géométrie à chaque image, sur le fil
 * principal, derrière l'interface — sur toutes les pages du jeu. Ici, chaque
 * anneau ne fait qu'un `translateY` : le compositeur s'en charge **sans
 * repeindre**.
 *
 * Les anneaux se chevauchent largement. C'est ce qui interdit au corps de se
 * fendre au milieu d'une ondulation : espacés de 26 pour un rayon de 17, deux
 * voisins restent soudés même à l'écart maximal.
 *
 * §122 : des formes géométriques. Un anneau est une ellipse, une nageoire un
 * triangle, un filament un arc.
 */
function PoissonRuban({
  y,
  duree,
  retard,
  echelle,
}: {
  y: number;
  duree: number;
  retard: number;
  echelle: number;
}) {
  const ANNEAUX = 11;

  return (
    <g
      className="isl-nage"
      style={{ ['--duree' as string]: `${duree}s`, ['--retard' as string]: `${retard}s` }}
      aria-hidden="true"
    >
      <g transform={`translate(0 ${y}) scale(${echelle})`} opacity=".55">
        {Array.from({ length: ANNEAUX }, (_, i) => {
          const x = i * 23;
          // Le corps s'affine vers la queue. Un ruban d'épaisseur constante se
          // lirait comme une écharpe.
          const rx = 19 - i * 0.55;
          const ry = 14 - i * 0.85;
          return (
            <g
              key={i}
              className="isl-ondule"
              // Retard **négatif** : l'animation démarre déjà entamée, donc la
              // vague est en place dès la première image plutôt que de se
              // former pendant les trois premières secondes.
              style={{ ['--phase' as string]: `${(-i * 0.19).toFixed(2)}s` }}
            >
              {/* La crête dorsale, avant le corps : une barre arrondie plus
                  large que l'espacement des anneaux, donc chevauchant sa
                  voisine. C'est ce chevauchement qui fait une **frange
                  continue** — les triangles séparés du premier essai se
                  lisaient comme une file de petites tentes. */}
              <rect
                x={x - rx * 0.9}
                y={-ry - 4}
                width={rx * 1.8}
                height="5"
                rx="2.5"
                fill="#d4566a"
                opacity=".7"
              />
              <ellipse cx={x} cy="0" rx={rx} ry={ry} fill="#c7dee0" />
              {/* Barres sombres, un anneau sur trois. Sur tous, elles feraient
                  une rayure de maillot ; le ventre clair que portait chaque
                  anneau, lui, découpait le corps en perles et a sauté. */}
              {i % 3 === 1 && (
                <ellipse
                  cx={x}
                  cy={-ry * 0.15}
                  rx={rx * 0.34}
                  ry={ry * 0.6}
                  fill="#2b5f6b"
                  opacity=".5"
                />
              )}
            </g>
          );
        })}

        {/* La tête : l'œil, et le panache de filaments qui la coiffe. C'est ce
            panache qui nomme la bête — sans lui, on lirait une anguille. */}
        <g className="isl-ondule" style={{ ['--phase' as string]: '0s' }}>
          <circle cx="-6" cy="-2" r="2.6" fill="#173f45" />
          <g stroke="#d4566a" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity=".8">
            <path className="isl-filament" style={{ ['--phase' as string]: '0s' }} d="M2 -9 q-6 -18 -20 -24" />
            <path className="isl-filament" style={{ ['--phase' as string]: '-0.5s' }} d="M6 -9 q-2 -20 -12 -28" />
            <path className="isl-filament" style={{ ['--phase' as string]: '-1s' }} d="M10 -9 q2 -19 -3 -29" />
            <path className="isl-filament" style={{ ['--phase' as string]: '-1.5s' }} d="M14 -9 q6 -16 4 -26" />
          </g>
        </g>
      </g>
    </g>
  );
}

/**
 * Le grand poisson tacheté, tête à gauche, qui traverse dans l'autre sens.
 *
 * ## Pourquoi il va à contresens du ruban
 *
 * Deux silhouettes qui dérivent dans le même sens, à la même profondeur, se
 * lisent comme un banc — donc comme un seul objet. En sens contraires et à
 * deux profondeurs, elles se croisent : c'est le croisement qui donne son
 * volume à la fosse.
 *
 * Il n'ondule pas, et c'est délibéré. Une masse de cette taille se déplace
 * d'un bloc ; seules les nageoires travaillent. Lui faire onduler le corps
 * l'aurait rendu élastique, donc petit.
 */
function GrandPoisson({
  y,
  duree,
  retard,
  echelle,
}: {
  y: number;
  duree: number;
  retard: number;
  echelle: number;
}) {
  return (
    <g
      className="isl-nage isl-nage--envers"
      style={{ ['--duree' as string]: `${duree}s`, ['--retard' as string]: `${retard}s` }}
      aria-hidden="true"
    >
      <g transform={`translate(0 ${y}) scale(${echelle})`} opacity=".44">
        {/* Nageoires derrière le corps : elles s'y accrochent au lieu d'y être
            posées. */}
        <path
          className="isl-nageoire"
          style={{ ['--phase' as string]: '0s' }}
          d="M44 14 Q28 46 68 30Z"
          fill="#8fb6bb"
        />
        <path d="M104 20 Q106 40 126 26Z" fill="#8fb6bb" />
        <path d="M86 -24 Q100 -50 124 -22Z" fill="#8fb6bb" />
        <path d="M140 -16 Q148 -30 160 -14Z" fill="#8fb6bb" />

        {/* Corps, puis la queue en croissant. */}
        <ellipse cx="78" cy="0" rx="80" ry="27" fill="#cfe3e4" />
        <path
          className="isl-nageoire"
          style={{ ['--phase' as string]: '-0.8s' }}
          d="M152 -10 Q188 -8 208 -32 Q200 -4 210 0 Q200 4 208 32 Q188 8 152 10Z"
          fill="#b3d2d5"
        />

        {/* Les taches. Irrégulières et de tailles inégales : c'est ce qui
            distingue un pelage d'un motif imprimé. */}
        <g fill="#1d3f4a" opacity=".62">
          <path d="M16 -16 Q46 -28 70 -14 Q50 0 20 -4Z" />
          <path d="M84 -20 Q114 -24 126 -6 Q100 4 82 -4Z" />
          <path d="M40 8 Q68 4 80 18 Q54 26 38 18Z" />
          <path d="M116 6 Q140 2 148 16 Q128 22 114 16Z" />
          <path d="M2 -6 Q14 -16 26 -8 Q14 2 4 4Z" />
          <path d="M62 -4 Q78 -8 84 2 Q70 8 60 4Z" />
        </g>

        {/* L'œil, minuscule, et la bouche : deux traits qui font une tête. */}
        <circle cx="14" cy="-7" r="3.2" fill="#0e2a33" />
        <path d="M-2 5 Q16 12 34 8" stroke="#8fb6bb" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      </g>
    </g>
  );
}

/** Île des hommes-poissons — sous la mer, mais éclairée. */
function Fishman() {
  return (
    <svg className="isl isl--fishman" {...CADRE} aria-hidden="true">
      {/* Sous dix mille mètres d'eau, la lumière est turquoise et l'« air »
          est l'eau elle-même : c'est elle qui mange les lointains, et bien
          plus vite qu'une atmosphère. La brume de distance est donc plus
          dense ici que partout ailleurs. */}
      <AtmosphereDefs id="fis" lumiere="#c8f6ee" air="#6fb9bd" />

      {/* Les rais de lumière sont **dans le ciel**, pas ici.

          Ils partaient de y=0 et descendaient jusqu'en bas de ce cadre — mais
          ce cadre ne fait que le tiers inférieur de la page. Leur sommet se
          trouvait donc tranché net, à l'horizontale, en plein milieu de
          l'écran. Une colonne de lumière qui commence au milieu de nulle part
          ne ressemble à rien. Voir `IslandSky`, où ils traversent toute la
          hauteur. */}

      {/* --- Les bêtes de la fosse -------------------------------------------
          Dessinées **avant** la bulle : elles passent derrière elle, dans
          l'eau libre, ce qui est la seule position juste. Devant, elles
          seraient entrées dans la ville — et une bulle qu'on traverse n'est
          plus une bulle.

          Elles sont lentes : soixante et quatre-vingts secondes pour traverser
          le cadre. Un décor de fond ne doit pas attirer l'œil ; ce qu'on
          cherche, c'est que le joueur ne remarque rien et trouve la page
          vivante. Le retard de la seconde évite qu'elles n'entrent ensemble à
          la première seconde de chaque cycle. */}
      <GrandPoisson y={104} duree={82} retard={0} echelle={0.92} />
      <PoissonRuban y={166} duree={58} retard={11} echelle={0.82} />

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

      {/* L'eau mange les lointains bien plus vite qu'une atmosphère : la
          brume est posée haut et large. C'est ce qui fait « profondeur »
          plutôt que « pièce turquoise ». */}
      <Brume id="fis" y={150} hauteur={110} opacite={0.9} />

      {/* Le fond de la fosse, plus sombre qu'avant : c'est le point le plus
          profond du produit, il doit être le plus dense. */}
      <path d="M0 282 Q220 268 450 280 T900 274 V300 H0Z" fill="#0e454c" opacity=".42" />

      {/* Bulles qui sourdent du fond. `Fumee` fait exactement le bon geste —
          monter en s'élargissant et en s'effaçant — et une bulle d'eau
          profonde se comporte comme une bouffée d'air chaud. Trois points
          d'émission, à des rythmes différents : au même rythme, on lirait
          trois jets synchronisés, donc une machine. */}
      <Fumee x={186} y={276} teinte="#a8ede6" duree={13} />
      <Fumee x={612} y={282} teinte="#a8ede6" duree={17} />

      <Finition id="fis" />
    </svg>
  );
}

/** Wano — torii, pagode, mont, cerisiers. */
function Wano() {
  return (
    <svg className="isl isl--wano" {...CADRE} aria-hidden="true">
      {/* Lumière de fin de jour : Wano est l'île des laques rouges et des
          lanternes, elle supporte l'or bien plus que le blanc. */}
      <AtmosphereDefs id="wan" lumiere="#ffd9a0" air="#d9dfe0" />

      {/*
        Le volcan.

        C'était un mont enneigé de deux cents pixels de haut, perdu dans le
        coin droit. Il fait maintenant **toute la hauteur du cadre** et deux
        tiers de sa largeur : c'est lui le sujet du décor, la pagode devient ce
        qui donne l'échelle plutôt que l'inverse.

        Un volcan ne se dessine pas comme une montagne à qui l'on aurait ajouté
        de la fumée. Trois choses le distinguent, et il les faut toutes :

          — **un sommet tronqué**, jamais pointu. C'est la caldeira, et c'est
            le seul trait qui se lit à coup sûr, même en silhouette ;
          — **des flancs concaves**. Une montagne monte droit ; un cône de
            coulées successives se creuse en montant ;
          — **des coulées**, qui descendent du cratère en s'élargissant.

        Il reste dans `0 ≤ x ≤ 900` : la règle du cadre ne souffre pas
        d'exception, c'est elle qui empêche le SVG de trancher une silhouette.
      */}

      {/* Masse principale. Les deux courbes de Bézier creusent les flancs. */}
      <path
        d="M232 300 Q436 176 512 46 L604 46 Q690 176 892 300Z"
        fill="#8e93a6"
        opacity=".62"
      />

      {/* Face éclairée, côté soleil — la droite, comme partout ailleurs. */}
      <path
        d="M558 300 L558 46 L604 46 Q690 176 892 300Z"
        fill="#b6bccc"
        opacity=".45"
      />

      {/* Caldeira : une ellipse sombre posée sur le tronc du cône. C'est elle
          qui fait « volcan » plutôt que « montagne ». */}
      <ellipse cx="558" cy="46" rx="46" ry="11" fill="#4a4152" opacity=".7" />
      <ellipse cx="558" cy="44" rx="34" ry="7" fill="#8a3a22" opacity=".55" />

      {/* Neige résiduelle sur les hauteurs, en plaques irrégulières : un
          liseré régulier ferait un chapeau de dessin animé. */}
      <path
        d="M516 62 q22 12 42 4 q20 -8 40 4 l-8 26 q-30 -12 -60 0Z"
        fill="#ffffff"
        opacity=".5"
      />

      {/* Coulées : elles partent du cratère et s'élargissent en descendant.
          Sombres et non rouges — une coulée incandescente sur toute la
          hauteur ferait une éruption, alors qu'on veut un volcan qui fume. */}
      <g fill="#5c4a4a" opacity=".3">
        <path d="M540 52 q-26 92 -64 190 l34 6 q28 -104 46 -192Z" />
        <path d="M582 52 q22 88 58 184 l-32 8 q-30 -100 -44 -190Z" />
      </g>

      {/* Le panache. Trois bouffées lentes, très hautes : c'est le mouvement
          le plus lent du produit — vingt-deux secondes — parce qu'un panache
          rapide se lit comme une cheminée d'usine. */}
      <Fumee x={558} y={40} teinte="#cfc6c0" duree={22} />

      {/* Lueur du cratère, retenue. Elle bat au rythme du panache et ne monte
          jamais : c'est un rougeoiement au fond, pas une projection. */}
      <ellipse
        className="isl-astre__disque"
        cx="558"
        cy="44"
        rx="26"
        ry="5"
        fill="#e07a3c"
        opacity=".5"
      />

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

      {/* Brume de fond de vallée : elle sépare le mont des toits. Sans elle,
          un sommet lointain et une pagode proche avaient la même densité. */}
      <Brume id="wan" y={162} hauteur={88} opacite={0.72} />

      {/* Rizière en terrasses, au premier plan. */}
      <path d="M0 272 Q230 258 460 270 T900 264 V300 H0Z" fill="#7d9060" opacity=".5" />

      {/* L'eau des rizières prend le ciel : c'est ce qui distingue une
          terrasse inondée d'un champ. Les reflets s'allument et s'éteignent
          sans se déplacer — un reflet ne dérive pas, il accroche. */}
      <Reflets y={280} teinte="#fff2cf" n={7} />

      <Finition id="wan" />
    </svg>
  );
}

/** Logue Town — la ville du commencement et de la fin, sous l'orage. */
function Logue() {
  return (
    <svg className="isl isl--logue" {...CADRE} aria-hidden="true">
      {/* Lumière d'orage : blafarde et froide. C'est la seule île où la clarté
          ne vient pas du soleil mais de l'éclair, donc par à-coups. */}
      <AtmosphereDefs id="log" lumiere="#e7f0ff" air="#9fb0c4" />

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

      {/* Rideau de pluie au loin : sous l'orage, l'horizon disparaît avant
          tout le reste. */}
      <Brume id="log" y={140} hauteur={100} opacite={0.85} />

      {/* Des mouettes, malgré la pluie. C'est un port : ce qui s'y voit
          d'abord au-dessus de l'eau, ce sont les oiseaux qui attendent les
          barques. Basses et rapides — trente secondes — parce qu'un vent
          d'orage ne laisse pas planer. */}
      <Oiseaux y={96} teinte="#41566b" duree={30} echelle={1.15} />

      <Finition id="log" />
    </svg>
  );
}

/** Sabaody — mangroves géantes et bulles de résine. */
function Sabaody() {
  return (
    <svg className="isl isl--sabaody" {...CADRE} aria-hidden="true">
      {/* Lumière verte, filtrée par la voûte. Sur Sabaody, aucun rayon
          n'arrive direct : tout a traversé les feuilles des mangroves, et
          c'est cette teinte-là qui nomme le lieu. */}
      <AtmosphereDefs id="sab" lumiere="#dff3b8" air="#bcd6c0" />

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

      {/*
        Le numéro du bosquet, gravé sur chaque tronc.

        Sabaody se compte : ses bosquets portent un numéro, et c'est ainsi
        qu'on s'y donne rendez-vous. Un seul chiffre par arbre, dans l'ordre
        de gauche à droite — quarante à quarante-trois.

        Ils sont **peints sur l'écorce**, pas posés devant : d'où l'inclinaison
        légère, qui suit le galbe du tronc, et l'opacité basse. Un nombre net
        et droit se lirait comme une étiquette collée sur le décor.

        Le `paintOrder` met le contour derrière le remplissage : sans lui, le
        trait sombre mordrait sur les chiffres et les rendrait illisibles à
        cette taille.
      */}
      <g
        fontFamily="var(--font-poster), system-ui, sans-serif"
        fontSize="30"
        textAnchor="middle"
        fill="#e8dcc0"
        stroke="#2f1f12"
        strokeWidth="4"
        paintOrder="stroke"
        opacity=".5"
      >
        {[
          { x: 47, y: 206, n: 40, inclinaison: -3 },
          { x: 307, y: 192, n: 41, inclinaison: 2 },
          { x: 633, y: 198, n: 42, inclinaison: -2 },
          { x: 853, y: 214, n: 43, inclinaison: 3 },
        ].map(({ x, y, n, inclinaison }) => (
          <text key={n} x={x} y={y} transform={`rotate(${inclinaison} ${x} ${y})`}>
            {n}
          </text>
        ))}
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

      {/* Brume verte entre les troncs. Dans un bosquet, ce qui recule n'est
          pas plus pâle : c'est plus **vert**, parce que la lumière y a
          traversé plus de feuilles. */}
      <Brume id="sab" y={158} hauteur={94} opacite={0.68} />

      {/* Un vol court entre les mangroves. Haut et lent : sous une voûte, un
          oiseau ne traverse pas le cadre, il passe d'un arbre à l'autre. */}
      <Oiseaux y={104} teinte="#2c4a22" duree={62} echelle={0.85} />

      {/* Sol de bosquet, plus dense qu'au fond : c'est le contraste de valeur
          qui creuse le sous-bois. */}
      <path d="M0 278 Q220 266 450 276 T900 270 V300 H0Z" fill="#355b25" opacity=".55" />

      <Finition id="sab" />
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
