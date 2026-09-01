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

export function HarborScene({
  children,
  variant = 'hero',
}: {
  children: React.ReactNode;
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

        {/* Signature de la page : le lever de soleil. Les rayons tournent
            très lentement — assez pour que la scène respire, pas assez pour
            distraire d'un formulaire. */}
        <div className="harbor__sunrays" />
        <div className="harbor__sun" />

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

            {/* Mât et cordage, sur le bord gauche. Masqué sur petit écran :
                il mangerait la place du formulaire. */}
            <div className="harbor__mast" />
          </>
        )}
      </div>

      {/* --- Contenu ------------------------------------------------------ */}
      <main className="harbor__content">
        {variant === 'hero' ? (
          <header className="harbor__header">
            <p className="harbor__eyebrow">Grand Line Weekly</p>
            <ShipWheel className="harbor__wheel" />
            {children}
          </header>
        ) : (
          <div className="harbor__header">{children}</div>
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
