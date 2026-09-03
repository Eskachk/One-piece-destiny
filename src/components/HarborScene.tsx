/**
 * Scène du port — décor des pages d'authentification.
 *
 * **Composant serveur, sans une ligne de JavaScript client.** Tout est en
 * dégradés CSS et en SVG en ligne : aucune image à télécharger, rien qui
 * puisse être bloqué, et aucun poids ajouté au bundle. C'est délibéré — la
 * page d'accueil est la première chose que voit un visiteur, et elle vient de
 * passer de 129 à 110 Ko.
 *
 * Rupture de direction artistique assumée : le reste du produit est en bleu
 * nuit, cette page est en plein jour. On part du ponton à l'aube, on entre
 * ensuite dans la Grand Line. Le contraste raconte le passage.
 */

import { ISLANDS, type IslandId } from '@/domain/islands';
import { IslandDecor } from './islands/IslandDecor';
import { IslandSky } from './islands/IslandSky';
import { EternalPose } from './EternalPose';
import { StrawHat } from './StrawHat';

/**
 * Tracés des vagues, définis une fois puis répétés à 1200 px pour que le
 * défilement boucle sans couture visible.
 */
const WAVE_FRONT =
  'M0 48c120-26 200 22 320 12s180-40 300-30 200 46 320 34 180-32 260-40v96H0Z';
const WAVE_BACK =
  'M0 72c140-22 220 18 350 10s200-34 320-24 190 40 300 28 160-26 230-32v70H0Z';

/**
 * Nuage.
 *
 * Des ellipses en dégradé lisaient comme des taches : un nuage a des lobes
 * qui se chevauchent et une base plus plate que son sommet. On dessine donc
 * une silhouette, avec un ventre légèrement ombré — la lumière vient du haut.
 *
 * `opacity` et `scale` sont passés en propriétés : quatre nuages identiques
 * se remarqueraient, quatre variantes d'un même dessin non.
 */
function Cloud({
  className,
  flip = false,
}: {
  className?: string;
  flip?: boolean;
}) {
  // Des cercles qui se chevauchent plutôt qu'un tracé d'arcs écrit à la main :
  // une première version en `path` produisait un bord droit disgracieux, et
  // les commandes d'arc sont pénibles à corriger. Ici la forme est évidente à
  // lire et impossible à casser.
  const id = flip ? 'cloud-b' : 'cloud-a';

  return (
    <svg
      viewBox="0 0 200 92"
      className={className}
      aria-hidden="true"
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#f2faff" />
          <stop offset="100%" stopColor="#d5eaf7" />
        </linearGradient>
      </defs>

      <g fill={`url(#${id})`}>
        {/* Base plate : un nuage repose sur l'horizontale. */}
        <rect x="24" y="56" width="152" height="26" rx="13" />
        {/* Lobes, du plus gros au plus petit. */}
        <circle cx="74" cy="46" r="30" />
        <circle cx="118" cy="38" r="26" />
        <circle cx="150" cy="54" r="22" />
        <circle cx="44" cy="60" r="20" />
      </g>
    </svg>
  );
}

/** Roue de gouvernail — emblème du produit. Dessin original. */
function ShipWheel({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
    >
      <circle cx="24" cy="24" r="9" />
      <circle cx="24" cy="24" r="3.2" fill="currentColor" stroke="none" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <line
          key={angle}
          x1="24"
          y1="24"
          x2="24"
          y2="6"
          transform={`rotate(${angle} 24 24)`}
        />
      ))}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <circle
          key={`h-${angle}`}
          cx="24"
          cy="6"
          r="2.1"
          fill="currentColor"
          stroke="none"
          transform={`rotate(${angle} 24 24)`}
        />
      ))}
    </svg>
  );
}

/**
 * Nombre de lés du pavillon.
 *
 * Douze : en dessous, l'onde se lit comme une succession de marches ; au-delà,
 * on paie des nœuds de plus pour un mouvement que l'œil ne distingue plus.
 */
const LES = 12;
const LARGEUR_LE = 132 / LES;

/**
 * Pavillon pirate, hissé au mât du ponton.
 *
 * ## Comment on fait flotter un drapeau sans une ligne de JavaScript
 *
 * Une étoffe qui claque, ce n'est pas un rectangle qui oscille : c'est une
 * **onde qui la parcourt**, de la drisse vers le battant. Un seul élément
 * animé en rotation donnerait un panneau rigide qui bascule — l'effet
 * girouette, pas l'effet drapeau.
 *
 * On découpe donc le dessin en douze lés verticaux. Chacun est le **même**
 * dessin, vu par une fenêtre différente (`clipPath`), et chacun monte et
 * descend avec un décalage de phase constant. La crête voyage ainsi de gauche
 * à droite, comme le vent.
 *
 * Deux détails font tout le reste :
 *
 * - **L'amplitude croît avec la distance au mât.** Près de la drisse l'étoffe
 *   est tenue, elle ne bouge presque pas ; au battant elle est libre. Une
 *   amplitude constante donnerait une tôle ondulée.
 * - **Chaque lé s'assombrit quand il descend.** Un pli qui se creuse tourne le
 *   dos à la lumière. Sans cette ombre en opposition de phase, l'onde est
 *   géométriquement juste et visuellement plate.
 *
 * §122 : tête de mort et tibias croisés, l'emblème pirate du domaine public.
 * Ce n'est le pavillon d'aucun équipage de l'œuvre.
 */
function PirateFlag() {
  return (
    <svg
      className="harbor__flag"
      viewBox="0 0 132 88"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Le dessin, une seule fois. Les douze lés le réutilisent. */}
        <g id="pav-art">
          <rect width="132" height="88" rx="2" fill="#141a24" />
          {/* Liseré clair au guindant : l'ourlet cousu sur la drisse. */}
          <rect width="5" height="88" fill="#2b3546" />

          <g fill="#f6f2e6">
            {/* Tibias croisés, derrière le crâne. */}
            <g stroke="#f6f2e6" strokeWidth="7" strokeLinecap="round">
              <line x1="36" y1="30" x2="98" y2="66" />
              <line x1="98" y1="30" x2="36" y2="66" />
            </g>
            <g>
              <circle cx="36" cy="27" r="6" />
              <circle cx="36" cy="69" r="6" />
              <circle cx="98" cy="27" r="6" />
              <circle cx="98" cy="69" r="6" />
            </g>

            {/* Crâne : calotte, pommettes, mâchoire. */}
            <path d="M67 20c14 0 24 10 24 23 0 8-4 13-8 16v7c0 3-3 5-6 5H57c-3 0-6-2-6-5v-7c-4-3-8-8-8-16 0-13 10-23 24-23Z" />
          </g>

          {/* Orbites et cavité nasale, évidées dans le crâne. */}
          <g fill="#141a24">
            <ellipse cx="58" cy="42" rx="6.5" ry="7.5" />
            <ellipse cx="76" cy="42" rx="6.5" ry="7.5" />
            <path d="M67 50l4 8h-8Z" />
            {/* Dents : trois fentes, pas un peigne régulier. */}
            <rect x="60" y="62" width="2.4" height="9" rx="1" />
            <rect x="66" y="62" width="2.4" height="9" rx="1" />
            <rect x="72" y="62" width="2.4" height="9" rx="1" />
          </g>
        </g>

        {/* Une fenêtre par lé. Elles débordent en haut et en bas : le lé se
            déplace verticalement, et une fenêtre à ras du dessin laisserait
            apparaître un liseré vide au sommet de l'onde. */}
        {Array.from({ length: LES }, (_, i) => (
          <clipPath key={i} id={`pav-le-${i}`}>
            <rect
              x={i * LARGEUR_LE}
              y="-12"
              /* Un demi-pixel de recouvrement : sans lui, l'anticrénelage
                 laisse un trait clair entre deux lés. */
              width={LARGEUR_LE + 0.5}
              height="112"
            />
          </clipPath>
        ))}
      </defs>

      {Array.from({ length: LES }, (_, i) => {
        const style = {
          '--i': i,
          // Tenue au mât, libre au battant.
          '--amp': `${(i / (LES - 1)) ** 1.4 * 5.5}px`,
        } as React.CSSProperties;

        return (
          <g
            key={i}
            className="harbor__flagLe"
            clipPath={`url(#pav-le-${i})`}
            style={style}
          >
            <use href="#pav-art" />
            <rect
              className="harbor__flagPli"
              x={i * LARGEUR_LE}
              y="-12"
              width={LARGEUR_LE + 0.5}
              height="112"
            />
          </g>
        );
      })}
    </svg>
  );
}

export function HarborScene({
  children,
  variant = 'hero',
  island = 'harbor',
}: {
  children: React.ReactNode;
  /**
   * Île dont le décor est rendu.
   *
   * Passée **explicitement** par chaque page plutôt que déduite du chemin :
   * ce composant est rendu côté serveur, où il n'y a pas de `pathname`, et
   * seul le décor demandé doit être fabriqué. Les rendre tous puis en masquer
   * cinq en CSS, c'est le défaut que le tir de charge a trouvé sur le pont.
   */
  island?: IslandId;
  /**
   * `hero` — scène complète, pour l'entrée dans le produit.
   * `page` — même monde, mais rayons atténués, mer plus basse et pont plus
   * fin. À l'intérieur, le décor ne doit jamais disputer la lecture d'un
   * classement ou d'un détail de score (§51).
   */
  variant?: 'hero' | 'page';
}) {
  return (
    <div className={variant === 'page' ? 'harbor harbor--page' : 'harbor'}>
      {/* --- Décor, en arrière-plan fixe ---------------------------------- */}
      <div className="harbor__backdrop" aria-hidden="true">
        <div className="harbor__sky" />

        {/*
          Le lever de soleil, **et lui seul sur la scène d'entrée**.

          Il était rendu partout. Sur les pages intérieures, où il n'y a plus
          ni mer ni horizon pour l'accueillir, son disque de 26 vmax se
          retrouvait posé n'importe où — le plus souvent à moitié hors du
          cadre, coupé net par un bord. Et il n'y avait aucune raison qu'un
          soleil levant traîne au fond de l'Île des hommes-poissons, à dix
          mille mètres sous la surface.

          Chaque île a désormais son ciel à elle (`IslandSky`), avec ce qui lui
          revient : des rais de lumière sous la mer, un soleil de plomb à
          Alabasta, des nuages d'orage à Logue Town.
        */}
        {variant === 'hero' && (
          <>
            <div className="harbor__sunrays" />
            <div className="harbor__sun" />
          </>
        )}

        {/*
          Décor de l'île, **dans le fond**, derrière tout le contenu.

          Il est posé avant les nuages, donc sous eux : les nuages appartiennent
          au ciel, l'île à l'horizon.

          Ce qui rend cela lisible n'est pas le décor mais ce qui passe
          par-dessus : le voile du contenu s'est allégé et ne couvre plus que
          la colonne de texte. Voir `.harbor__header` dans `globals.css` — c'est
          là que se joue l'équilibre entre « on voit l'île » et « on lit le
          classement » (§51).
        */}
        <IslandDecor island={island} />

        {/* Le haut et le milieu du décor : ce qui nage, vole, monte ou dérive.

            La silhouette occupe le tiers inférieur ; au-dessus, il n'y avait
            qu'un tapis de dégradés. Convenable pour ce qui est innombrable —
            pluie, neige, pétales — et inapte au reste : un banc de poissons a
            une direction et une silhouette, ce n'est pas une trame. */}
        <IslandSky island={island} />

        {/* Les jeux de lumière : nappes qui dérivent et rais qui balaient.

            Couche à part, et non un dégradé de plus sur `.isl-fx` : la lumière
            se compose en `screen` avec ce qu'il y a dessous, alors que la pluie
            ou les pétales se posent dessus en opaque. Les mêler sur un seul
            élément imposerait un seul mode de fusion, donc de renoncer à l'un
            des deux. Voir `.isl-lux` dans `globals.css`. */}
        <div className="isl-lux" aria-hidden="true" />

        {/* Ambiance : ce qui tombe, monte ou dérive. C'est cette couche qui
            occupe la hauteur de l'écran — le décor, lui, est posé en bas. Tout
            est en CSS (`.isl-fx`), donc rien n'est ajouté au balisage. */}
        <div className="isl-fx" aria-hidden="true" />

        <span className="isl-name" aria-hidden="true">
          {island !== 'harbor' && island !== 'hq' ? ISLANDS[island].name : ''}
        </span>

        <div className="harbor__clouds">
          <Cloud className="harbor__cloud harbor__cloud--1" />
          <Cloud className="harbor__cloud harbor__cloud--2" flip />
          <Cloud className="harbor__cloud harbor__cloud--3" />
          <Cloud className="harbor__cloud harbor__cloud--4" flip />
        </div>

        {/*
          Mer, pont et mât : **uniquement sur la scène d'entrée**.

          Les pages intérieures les masquaient en CSS (`display: none`). Le
          serveur les rendait donc, les sérialisait dans le HTML, puis les
          répétait dans la charge RSC — pour un décor que personne ne voit.
          Mesuré au tir de charge : 9 Ko sur les 63 Ko de `/classement`, soit
          14 % de la page, à chaque requête de chaque joueur.

          `display: none` cache ; il n'économise rien. La différence est de
          nature, pas de degré.
        */}
        {variant === 'hero' && (
          <>
            <div className="harbor__sea">
              {/* viewBox de 1200 pour une largeur de motif de 1200 : chaque
                  tracé est répété une fois à droite, et l'animation décale
                  exactement de 1200 — la reprise ne se voit pas. */}
              <svg
                className="harbor__waves"
                viewBox="0 0 1200 120"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <g className="harbor__wave harbor__wave--back">
                  <path
                    d={`${WAVE_BACK} ${WAVE_BACK.replace('M0', 'M1200')}`}
                    fill="rgba(255,255,255,.13)"
                  />
                </g>
                <g className="harbor__wave harbor__wave--front">
                  <path
                    d={`${WAVE_FRONT} ${WAVE_FRONT.replace('M0', 'M1200')}`}
                    fill="rgba(255,255,255,.22)"
                  />
                </g>
              </svg>
            </div>

            {/* Pont : planches en dégradés répétés plutôt qu'une image. */}
            <div className="harbor__deck">
              <div className="harbor__deckEdge" />

              {/* Chapeau de paille et Éternal Pose posés sur le pont. Ils sont
                  dans le décor, pas dans le contenu : purement ornementaux,
                  ils ne doivent ni être lus par un lecteur d'écran ni capter le
                  moindre clic.

                  Tous deux sont visibles sur téléphone. Le chapeau y
                  disparaissait sous 560 px — c'est-à-dire sur la quasi-totalité
                  des mobiles, soit la cible du produit (§55) : la seule scène
                  signée du site n'existait que sur ordinateur. Le pont a été
                  rehaussé et la carte remontée pour leur faire place, plutôt
                  que de les masquer. */}
              <StrawHat className="harbor__hat" />
              <EternalPose className="harbor__pose" />
            </div>

            {/* Mât et pavillon, sur le bord gauche. Le mât s'amincit sur
                petit écran plutôt que de disparaître : il ne mangeait la
                largeur du formulaire qu'à cause de ses 46 px, et le supprimer
                emportait le pavillon avec lui — c'est-à-dire le seul élément
                animé de la scène, sur la plateforme d'où viennent la plupart
                des joueurs (§55). */}
            <div className="harbor__mast">
              <PirateFlag />
            </div>
          </>
        )}
      </div>

      {/* --- Contenu ------------------------------------------------------ */}
      <main className="harbor__content">
        {variant === 'hero' ? (
          <header className="harbor__header">
            <p className="harbor__eyebrow">One Piece Quest</p>
            <ShipWheel className="harbor__wheel" />
            {children}
          </header>
        ) : (
          /* `harbor__content` est un conteneur flex : cette colonne porte la
             largeur du contenu et le garde sur un seul rang. */
          <div className="harbor__column">
            <div className="harbor__header">{children}</div>
          </div>
        )}
      </main>
    </div>
  );
}

/**
 * Titre d'une page d'authentification.
 *
 * Le mot est traité en affiche : très grand, condensé, encre marine. C'est le
 * seul endroit de la page où la typographie prend toute la place.
 */
export function HarborTitle({
  title,
  tagline,
}: {
  title: string;
  tagline: string;
}) {
  return (
    <>
      <h1 className="harbor__title">{title}</h1>
      <p className="harbor__banner">
        <span>{tagline}</span>
      </p>
    </>
  );
}
