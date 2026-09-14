import type { IslandId } from '@/domain/islands';

/**
 * Les particules d'une île — ce qui tombe, monte, dérive ou scintille.
 *
 * ## Pourquoi ce n'est plus un dégradé répété
 *
 * La neige de Drum, les pétales de Wano, le sable d'Alabasta étaient des
 * `radial-gradient` posés en tuile et translatés. Économique, mais une tuile
 * se voit : chaque flocon avait un jumeau exactement 130 px plus loin, et
 * tous tombaient du même pas. Sur une capture d'écran, la neige était une
 * grille de points ; le pollen d'Elbaf, un quadrillage. Ce que l'œil lit
 * dans une chute de neige, c'est justement qu'aucun flocon ne ressemble au
 * voisin — taille, vitesse, louvoiement, tout diffère.
 *
 * Ici chaque particule est **un élément**, avec sa position, sa taille, sa
 * durée, son amplitude et son retard tirés d'un générateur pseudo-aléatoire
 * **à graine fixe**. Deux conséquences qui comptent :
 *
 *   — le rendu est **déterministe** : le serveur et le navigateur produisent
 *     le même balisage, donc aucune divergence à l'hydratation, et deux
 *     visites de la même île donnent la même neige ;
 *   — rien n'est calculé côté client. Ce composant est un composant serveur,
 *     comme le reste du décor : le navigateur ne reçoit que des `<i>` et des
 *     variables CSS.
 *
 * ## Le mouvement
 *
 * Tout est en `transform` et `opacity`, sur deux éléments emboîtés : l'enveloppe
 * porte la trajectoire (chute, montée, rafale), l'intérieur porte le
 * balancement et la rotation. Deux animations sur deux éléments, plutôt qu'une
 * animation savante sur un seul : chaque particule a ainsi **quatre** libertés
 * (vitesse de chute, période et amplitude du balancement, phase) pour le prix
 * de deux règles CSS. Voir `.pt` dans `globals.css`.
 *
 * ## Le coût
 *
 * Entre quarante et quatre-vingt-dix éléments par île, chacun composé sans
 * repaint. Le plan le plus lointain (`pt--p2`) disparaît sous 640 px : un
 * téléphone n'a pas besoin de trois plans de profondeur, et c'est là que
 * chaque couche coûte. Sous « animations réduites », tout s'arrête et les
 * particules restent posées là où le générateur les a mises.
 *
 * §122 : aucun visuel de l'œuvre. Un flocon est un disque, un pétale une
 * ellipse, un confetti un rectangle.
 */

/* ---------------------------------------------------------------------------
   Le générateur.
   --------------------------------------------------------------------------- */

/** mulberry32 — court, sans dépendance, largement suffisant pour de la neige. */
function graine(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const entre = (alea: () => number, min: number, max: number) => min + alea() * (max - min);
const arrondi = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

/* ---------------------------------------------------------------------------
   Les sortes.
   --------------------------------------------------------------------------- */

/**
 * Trajectoire d'une sorte :
 *   — `chute` : traverse l'écran de haut en bas, en louvoyant ;
 *   — `montee` : de bas en haut, en se dandinant (bulles, poussière d'aube) ;
 *   — `rafale` : de droite à gauche, vite, par bourrasques (sable) ;
 *   — `flotte` : reste dans sa zone et dérive lentement (plancton, pollen) ;
 *   — `scintille` : ne bouge pas, s'allume et s'éteint (givre, paillettes).
 */
type Trajet = 'chute' | 'montee' | 'rafale' | 'flotte' | 'scintille';

interface Sorte {
  /** Suffixe de classe : `pt--flocon`, `pt--petale`… La forme est en CSS. */
  forme: string;
  trajet: Trajet;
  n: number;
  /** Taille en pixels, de la plus lointaine à la plus proche. */
  taille: [number, number];
  /** Durée d'un trajet complet, en secondes. */
  duree: [number, number];
  /** Amplitude du balancement, en pixels. */
  balance: [number, number];
  /** Période du balancement, en secondes. */
  periode: [number, number];
  opacite: [number, number];
  /** Zone verticale de départ, en % de la hauteur — pour `flotte` et `scintille`. */
  zone?: [number, number];
  /** Rotation continue (feuilles, pétales, confettis). */
  tourne?: boolean;
  /** Teintes possibles ; une par particule, tirée au sort. */
  teintes?: string[];
}

const AMBIANCES: Partial<Record<IslandId, Sorte[]>> = {
  /* Drum — la neige. Trois plans : loin, petit, lent et pâle ; près, gros,
     rapide et franc. Et le givre qui accroche la lumière sur le sol. */
  drum: [
    { forme: 'flocon', trajet: 'chute', n: 72, taille: [2, 7], duree: [13, 32], balance: [18, 70], periode: [3, 7], opacite: [0.45, 0.95] },
    { forme: 'givre', trajet: 'scintille', n: 22, taille: [2, 4], duree: [2.5, 6], balance: [0, 0], periode: [1, 1], opacite: [0.5, 1], zone: [58, 96] },
  ],

  /* Elbaf — les feuilles que l'arbre d'Adam laisse tomber, larges et lentes,
     et le pollen qui flotte dans la lumière de la clairière. */
  elbaf: [
    { forme: 'feuille', trajet: 'chute', n: 30, taille: [6, 13], duree: [17, 34], balance: [50, 150], periode: [4, 8], opacite: [0.55, 0.9], tourne: true, teintes: ['#8fbf5a', '#b9d47a', '#6ea549', '#d6e39a'] },
    { forme: 'pollen', trajet: 'flotte', n: 34, taille: [2, 3.5], duree: [8, 18], balance: [14, 40], periode: [5, 11], opacite: [0.35, 0.85], zone: [8, 70] },
  ],

  /* Alabasta — le sable, en traînées presque horizontales poussées par
     rafales, et une poussière chaude qui flotte dans l'air brûlant. */
  alabasta: [
    { forme: 'grain', trajet: 'rafale', n: 54, taille: [14, 44], duree: [3.6, 9], balance: [4, 18], periode: [1.2, 3], opacite: [0.3, 0.75], zone: [6, 96] },
    { forme: 'poussiere', trajet: 'flotte', n: 22, taille: [1.5, 3], duree: [9, 20], balance: [10, 30], periode: [6, 12], opacite: [0.3, 0.7], zone: [30, 90], teintes: ['#ffe9b8', '#fff3d6'] },
  ],

  /* Dressrosa — les confettis de la fête, qui tombent en tournoyant, et les
     paillettes d'or qui restent accrochées aux façades. */
  dressrosa: [
    { forme: 'confetti', trajet: 'chute', n: 52, taille: [4, 8], duree: [9, 20], balance: [30, 90], periode: [2.5, 6], opacite: [0.6, 0.95], tourne: true, teintes: ['#ff5c6c', '#ffce5c', '#7ed8ff', '#c88cff', '#ffffff', '#ff9a3c'] },
    { forme: 'paillette', trajet: 'scintille', n: 16, taille: [2, 4], duree: [2, 5], balance: [0, 0], periode: [1, 1], opacite: [0.5, 1], zone: [55, 92] },
  ],

  /* Île des hommes-poissons — les bulles qui montent, et le plancton qui
     luit et dérive dans le courant. */
  fishman: [
    { forme: 'bulle', trajet: 'montee', n: 38, taille: [4, 15], duree: [13, 30], balance: [8, 34], periode: [2.5, 6], opacite: [0.35, 0.8] },
    { forme: 'plancton', trajet: 'flotte', n: 44, taille: [1.5, 3.5], duree: [7, 16], balance: [12, 36], periode: [5, 12], opacite: [0.3, 0.9], zone: [5, 95] },
  ],

  /* Wano — les pétales de cerisier, qui planent loin de côté, et les
     lucioles de la fin d'après-midi au ras des toits. */
  wano: [
    { forme: 'petale', trajet: 'chute', n: 48, taille: [5, 10], duree: [12, 26], balance: [50, 130], periode: [3, 7], opacite: [0.55, 0.95], tourne: true, teintes: ['#ffd0de', '#ffe4ee', '#ffb8cc', '#fff0f5'] },
    { forme: 'luciole', trajet: 'flotte', n: 14, taille: [2, 3.5], duree: [6, 14], balance: [16, 44], periode: [4, 9], opacite: [0.3, 0.9], zone: [48, 90] },
  ],

  /* Logue Town — la pluie. Fine, dense, rapide, à peine inclinée. */
  logue: [
    { forme: 'goutte', trajet: 'chute', n: 88, taille: [12, 24], duree: [0.9, 1.7], balance: [0, 0], periode: [1, 1], opacite: [0.25, 0.6] },
  ],

  /* Sabaody — les bulles de résine, grosses et lentes, qui montent jusqu'en
     haut de la page ; et quelques reflets qui accrochent la lumière. */
  sabaody: [
    { forme: 'bulle', trajet: 'montee', n: 42, taille: [6, 24], duree: [16, 38], balance: [10, 40], periode: [3, 8], opacite: [0.3, 0.75] },
    { forme: 'paillette', trajet: 'scintille', n: 12, taille: [2, 3.5], duree: [2.5, 6], balance: [0, 0], periode: [1, 1], opacite: [0.4, 0.9], zone: [10, 80] },
  ],

  /* Le port, à l'aube — la poussière dans la lumière rasante. Rien qui tombe :
     ce qu'on voit flotter monte plus qu'il ne descend. */
  harbor: [
    { forme: 'poussiere', trajet: 'montee', n: 36, taille: [1.5, 3.5], duree: [22, 46], balance: [10, 36], periode: [5, 11], opacite: [0.3, 0.75], teintes: ['#fff5d6', '#fffbe8'] },
  ],
};

/** Graine par île : la même neige à chaque visite, et une neige différente des pétales. */
const GRAINES: Record<string, number> = {
  drum: 0x4d52554d,
  elbaf: 0x454c4241,
  alabasta: 0x414c4142,
  dressrosa: 0x44524553,
  fishman: 0x46495348,
  wano: 0x57414e4f,
  logue: 0x4c4f4755,
  sabaody: 0x53414241,
  harbor: 0x48415242,
};

/* ---------------------------------------------------------------------------
   Le composant.
   --------------------------------------------------------------------------- */

type StylePt = React.CSSProperties & Record<`--${string}`, string | number>;

export function Particules({ island }: { island: IslandId }) {
  const sortes = AMBIANCES[island];
  if (!sortes) return null;

  const alea = graine(GRAINES[island] ?? 1);
  const elements: React.ReactElement[] = [];

  sortes.forEach((sorte, s) => {
    for (let i = 0; i < sorte.n; i += 1) {
      // Le plan de profondeur décide de tout le reste : le lointain est petit,
      // lent et pâle ; le proche est gros, rapide et franc. Tirer les valeurs
      // indépendamment donnerait des gros flocons lents à l'horizon.
      const plan = alea();
      const p = (a: [number, number]) => a[0] + plan * (a[1] - a[0]);
      const bruit = (v: number, part = 0.25) => v * (1 + (alea() - 0.5) * 2 * part);

      const taille = arrondi(bruit(p(sorte.taille)));
      const duree = arrondi(bruit(sorte.duree[1] - plan * (sorte.duree[1] - sorte.duree[0])));
      const balance = arrondi(bruit(p(sorte.balance)));
      const periode = arrondi(bruit(entre(alea, sorte.periode[0], sorte.periode[1])));
      const opacite = arrondi(bruit(p(sorte.opacite), 0.15), 2);
      const x = arrondi(entre(alea, -2, 102));
      const y = arrondi(sorte.zone ? entre(alea, sorte.zone[0], sorte.zone[1]) : entre(alea, 0, 100));
      const teinte = sorte.teintes?.[Math.floor(alea() * sorte.teintes.length)];

      const style: StylePt = {
        // En `vw` et `vh`, pas en % : les trajectoires (`.pt--chute`…) les
        // retranchent dans un `calc()` avec des longueurs d'écran, et un
        // pourcentage dans un `transform` se rapporterait à la particule
        // elle-même, pas à l'écran.
        '--x': `${x}vw`,
        '--y': `${y}vh`,
        '--t': `${taille}px`,
        '--d': `${duree}s`,
        // Retard négatif : chaque particule est déjà en route au chargement.
        // Sans lui, toute la neige partirait du haut en même temps.
        '--r': `${arrondi(-alea() * duree)}s`,
        '--b': `${balance}px`,
        '--pb': `${periode}s`,
        '--rb': `${arrondi(-alea() * periode)}s`,
        '--o': Math.min(1, opacite),
      };
      if (teinte) style['--c'] = teinte;

      elements.push(
        <i
          key={`${s}-${i}`}
          className={`pt pt--${sorte.forme} pt--${sorte.trajet} pt--p${Math.min(2, Math.floor(plan * 3))}${sorte.tourne ? ' pt--tourne' : ''}`}
          style={style}
        >
          <b />
        </i>,
      );
    }
  });

  return (
    <div className="isl-part" aria-hidden="true">
      {elements}
    </div>
  );
}

/**
 * Les ombres des nuages qui passent sur le sol.
 *
 * C'est le jeu de lumière qu'on ne remarque pas et qui change tout : une
 * lande, une dune ou une place de fête sur laquelle passe lentement l'ombre
 * d'un nuage **existe** — la même sans ombre est une image. Deux taches
 * molles, en `multiply`, qui traversent en deux à trois minutes.
 *
 * Réservé aux îles ensoleillées : sous la mer ou sous l'orage, une ombre de
 * nuage n'aurait pas de sens.
 */
const ENSOLEILLEES: ReadonlySet<IslandId> = new Set(['harbor', 'elbaf', 'alabasta', 'dressrosa', 'sabaody', 'wano']);

export function OmbresNuages({ island }: { island: IslandId }) {
  if (!ENSOLEILLEES.has(island)) return null;
  return (
    <div className="isl-ombres" aria-hidden="true">
      <i />
      <i />
    </div>
  );
}
