'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  angleLevitation,
  hakiColorAt,
  type CeremonyPlan,
} from '@/domain/collection/chest-ceremony';
import { ChestModel, HARBOR_PALETTE, ROYAL_PALETTE } from './ChestModel';

/**
 * Ouverture de coffre en 3D (cahier §56, §57, §61).
 *
 * Contraintes tenues :
 *
 *   §57  la 3D est réservée aux moments forts. Ce module est chargé
 *        dynamiquement, uniquement quand un coffre s'ouvre — les pages
 *        courantes ne portent pas son poids.
 *   §61  la mise en scène est découpée en trois temps **séparés** :
 *        `charge` (le coffre encaisse), `hold` (tout se fige — c'est le
 *        silence qui fait la promesse), `burst` (le couvercle cède). Une
 *        animation continue n'aurait pas de suspense, seulement une durée.
 *   §107 aucune texture ni modèle externe : tout est géométrie procédurale,
 *        donc rien à télécharger et rien à décoder. Le bois est fait de
 *        planches distinctes légèrement désaccordées en teinte — c'est ce qui
 *        lui donne du relief sans la moindre image.
 */

type Phase = 'charge' | 'hold' | 'burst';

/**
 * Découpe temporelle de la cérémonie.
 *
 * Un seul endroit lit l'horloge et décide de la phase : les composants
 * n'ont plus qu'à consulter le résultat, et ne peuvent pas diverger sur
 * « où en est-on ».
 */
function useCeremonyClock(plan: CeremonyPlan) {
  const elapsed = useRef(0);
  const [phase, setPhase] = useState<Phase>('charge');

  useFrame((_, delta) => {
    elapsed.current += delta;
    const holdAt = plan.shakeSeconds;
    const burstAt = holdAt + plan.suspenseSeconds;

    if (elapsed.current >= burstAt) setPhase('burst');
    else if (elapsed.current >= holdAt) setPhase('hold');
  });

  return { phase, elapsed };
}

/**
 * Éclairs de Haki.
 *
 * ## Deux natures, une seule géométrie
 *
 * `RARITY` — des traits fins, colorés par la rampe des raretés, en fusion
 * additive : ils s'ajoutent au fond et brillent. Ils montent pendant la charge
 * et s'éteignent au silence (§61).
 *
 * `CONQUEROR` — le Haki des Rois du coffre royal : un **cœur noir bordé de
 * rouge**, présent du premier au dernier instant.
 *
 * ## Pourquoi des rubans et non des lignes
 *
 * Un cœur noir est impossible à obtenir en `LineSegments` :
 *
 *   1. la fusion additive n'ajoute rien pour du noir — le fichier documentait
 *      déjà ce piège, rencontré sur un violet trop sombre qui restait
 *      parfaitement invisible ;
 *   2. `linewidth` est **ignoré** par WebGL sur presque tous les navigateurs :
 *      une ligne fait un pixel, quoi qu'on demande. Sans épaisseur, pas de
 *      bordure possible.
 *
 * Chaque éclair est donc un **ruban** : deux sommets par point de la brisure,
 * décalés de part et d'autre de la trajectoire. On en dessine deux superposés
 * — un large rouge en fusion additive, un plus étroit en noir opaque par-dessus
 * — et c'est ce débord rouge de chaque côté qui fait la bordure.
 *
 * ## Pourquoi les éclairs sont plats
 *
 * Ils vivent dans le plan de l'écran, pas autour du coffre. Une brisure en
 * volume se lit de biais et perd sa forme ; à plat, face à la caméra, elle
 * garde le dessin franc d'un éclair d'animation. La profondeur vient d'autre
 * chose : un éclair sur deux passe **derrière** le coffre, qui l'occulte.
 *
 * ## Le rythme
 *
 * Les sommets sont retirés au sort à intervalle fixe, pas à chaque image : un
 * éclair qui change soixante fois par seconde se lit comme du bruit, alors
 * qu'à douze fois par seconde on voit un crépitement.
 */

/** Points par éclair, extrémités comprises. */
const POINTS = 9;

/**
 * Remplit les sommets d'un ruban le long d'une brisure.
 *
 * `points` est la brisure en (x, y) ; `out` reçoit deux sommets par point,
 * décalés perpendiculairement à la trajectoire. La largeur s'amincit vers la
 * pointe : un éclair est épais à sa source et se perd en fil.
 */
function ribbon(
  points: Float32Array,
  out: Float32Array,
  offset: number,
  width: number,
  z: number,
) {
  for (let i = 0; i < POINTS; i += 1) {
    const x = points[i * 2];
    const y = points[i * 2 + 1];

    // Tangente : le segment suivant, ou le précédent pour le dernier point.
    const j = i === POINTS - 1 ? i - 1 : i + 1;
    const dx = points[j * 2] - x;
    const dy = points[j * 2 + 1] - y;
    const longueur = Math.hypot(dx, dy) || 1;
    const signe = i === POINTS - 1 ? -1 : 1;

    // Perpendiculaire normalisée.
    const nx = (-dy / longueur) * signe;
    const ny = (dx / longueur) * signe;

    // Effilement : pleine largeur à la source, un cinquième à la pointe.
    const demi = (width * (1 - (i / (POINTS - 1)) * 0.8)) / 2;

    const base = offset + i * 6;
    out[base] = x + nx * demi;
    out[base + 1] = y + ny * demi;
    out[base + 2] = z;
    out[base + 3] = x - nx * demi;
    out[base + 4] = y - ny * demi;
    out[base + 5] = z;
  }
}

function HakiBolts({
  plan,
  elapsed,
  active,
}: {
  plan: CeremonyPlan;
  elapsed: { current: number };
  active: boolean;
}) {
  const count = plan.bolts;
  const conquerant = plan.boltStyle === 'CONQUEROR';

  const coeur = useRef<THREE.Mesh>(null);
  const bord = useRef<THREE.Mesh>(null);
  const matCoeur = useRef<THREE.MeshBasicMaterial>(null);
  const matBord = useRef<THREE.MeshBasicMaterial>(null);
  const lastRedraw = useRef(-1);

  /*
   * Tampons et indices, alloués une fois.
   *
   * Les indices ne changent jamais — c'est le même maillage de quadrilatères
   * image après image, seuls les sommets bougent. Les recalculer à chaque
   * redessin serait du travail pur perte, soixante fois par seconde.
   */
  const { coeurPos, bordPos, index, brisure } = useMemo(() => {
    const sommets = count * POINTS * 2 * 3;
    const index = new Uint16Array(count * (POINTS - 1) * 6);

    for (let bolt = 0; bolt < count; bolt += 1) {
      for (let seg = 0; seg < POINTS - 1; seg += 1) {
        const v = (bolt * POINTS + seg) * 2;
        const i = (bolt * (POINTS - 1) + seg) * 6;
        index[i] = v;
        index[i + 1] = v + 1;
        index[i + 2] = v + 2;
        index[i + 3] = v + 1;
        index[i + 4] = v + 3;
        index[i + 5] = v + 2;
      }
    }

    return {
      coeurPos: new Float32Array(sommets),
      bordPos: new Float32Array(sommets),
      index,
      brisure: new Float32Array(POINTS * 2),
    };
  }, [count]);

  useFrame(() => {
    if (!coeur.current || !bord.current) return;
    if (!matCoeur.current || !matBord.current) return;

    const t = elapsed.current;
    const progress = plan.shakeSeconds > 0 ? t / plan.shakeSeconds : 1;

    /*
     * Intensité.
     *
     * Le Haki des Rois ne s'éteint pas : il est là tout du long, à pleine
     * force. Les éclairs de rareté, eux, naissent, montent, puis disparaissent
     * au silence — leur disparition **est** l'effet.
     */
    const intensite = conquerant
      ? 1
      : active
        ? Math.min(1, progress * 1.6)
        : 0;

    matCoeur.current.opacity = intensite;
    matBord.current.opacity = intensite * (conquerant ? 0.95 : 1);
    if (!conquerant) {
      matCoeur.current.color.set(hakiColorAt(plan, Math.min(1, progress)));
      matBord.current.color.set(hakiColorAt(plan, Math.min(1, progress)));
    }

    if (intensite === 0 || t - lastRedraw.current < 0.08) return;
    lastRedraw.current = t;

    for (let bolt = 0; bolt < count; bolt += 1) {
      /*
       * Angle et portée fortement dispersés.
       *
       * Le premier jet répartissait les éclairs à intervalles réguliers, tous
       * de même longueur : le résultat était un **soleil**, pas un orage. Il
       * faut casser les deux régularités — l'écart entre deux rayons et leur
       * portée — pour que l'œil cesse d'y lire une figure géométrique.
       */
      const angle =
        (bolt / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.9;
      const portee = 1.5 + Math.random() * 1.9;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      /*
       * L'écart latéral est une **marche aléatoire**, non un bruit.
       *
       * Un écart tiré indépendamment à chaque point donne une ligne floue,
       * qui tremble autour de sa trajectoire. En cumulant les pas, la brisure
       * part réellement de côté puis se reprend : c'est ce qui fait les angles
       * francs d'un éclair au lieu d'un fil vibrant.
       */
      let ecart = 0;
      for (let i = 0; i < POINTS; i += 1) {
        const avancement = i / (POINTS - 1);
        /*
         * Le départ est à distance du coffre, et non collé dessus.
         *
         * À 0,42, les onze bases se rejoignaient au centre : leurs rubans se
         * recouvraient en un disque noir qui masquait le coffre. L'éclair naît
         * **au bord** de l'objet, il ne le traverse pas.
         */
        const long = 0.78 + portee * avancement;
        ecart += (Math.random() - 0.5) * 0.34 * avancement;
        brisure[i * 2] = cos * long - sin * ecart;
        brisure[i * 2 + 1] = sin * long + cos * ecart + 0.15;
      }

      // Un éclair sur deux derrière le coffre : c'est ce qui donne du volume à
      // une figure entièrement plate.
      const z = bolt % 2 === 0 ? 0.95 : -0.95;
      const decalage = bolt * POINTS * 6;

      /*
       * Fin, et non épais.
       *
       * Les premières largeurs (0,13 et 0,07) donnaient des bandes noires
       * larges comme le poing du coffre : à cette échelle un éclair n'est plus
       * un trait, c'est une tache. L'écart entre les deux rubans reste le
       * même — c'est lui, et lui seul, qui fait l'épaisseur de la bordure
       * rouge visible de chaque côté du cœur.
       */
      ribbon(brisure, bordPos, decalage, conquerant ? 0.082 : 0.05, z);
      ribbon(brisure, coeurPos, decalage, conquerant ? 0.048 : 0.025, z);
    }

    coeur.current.geometry.attributes.position.needsUpdate = true;
    bord.current.geometry.attributes.position.needsUpdate = true;
  });

  if (count === 0) return null;

  return (
    <>
      {/* La bordure, dessous et plus large. En fusion additive, elle rayonne
          sur le fond sombre — c'est elle qui rend le cœur noir visible. */}
      <mesh ref={bord} renderOrder={1}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[bordPos, 3]}
            count={bordPos.length / 3}
          />
          <bufferAttribute attach="index" args={[index, 1]} count={index.length} />
        </bufferGeometry>
        <meshBasicMaterial
          ref={matBord}
          color={conquerant ? '#ff2118' : '#ffffff'}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Le cœur, dessus et plus étroit. **Sans fusion additive** pour le Haki
          des Rois : du noir additif n'ajoute rigoureusement rien, et l'éclair
          entier disparaîtrait. */}
      <mesh ref={coeur} renderOrder={2}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[coeurPos, 3]}
            count={coeurPos.length / 3}
          />
          <bufferAttribute attach="index" args={[index, 1]} count={index.length} />
        </bufferGeometry>
        <meshBasicMaterial
          ref={matCoeur}
          color={conquerant ? '#08060a' : '#ffffff'}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={conquerant ? THREE.NormalBlending : THREE.AdditiveBlending}
        />
      </mesh>
    </>
  );
}

/**
 * Onde de choc, à l'instant où le couvercle cède.
 *
 * Un anneau posé à plat au pied du coffre, qui s'élargit et s'efface en une
 * demi-seconde. C'est ce qui manquait le plus à l'ouverture : le couvercle
 * partait en arrière sans que rien n'accuse le coup, et le moment le plus
 * important de la cérémonie n'avait aucun impact — seulement un mouvement.
 *
 * L'anneau est **au sol** et non face caméra : posé à plat, il se lit comme
 * une onde qui court sur le pont ; dressé, il se serait lu comme un cerceau.
 */
function Shockwave({ color, at }: { color: string; at: { current: number } }) {
  const ring = useRef<THREE.Mesh>(null);
  const DUREE = 0.55;

  useFrame((state) => {
    if (!ring.current) return;
    const t = state.clock.elapsedTime - at.current;
    const material = ring.current.material as THREE.MeshBasicMaterial;

    if (t < 0 || t > DUREE) {
      material.opacity = 0;
      return;
    }

    const p = t / DUREE;
    // Départ franc, fin molle : une onde perd sa vitesse en s'élargissant.
    const echelle = 0.4 + (1 - (1 - p) ** 3) * 3.2;
    ring.current.scale.set(echelle, echelle, echelle);
    material.opacity = (1 - p) ** 1.6 * 0.75;
  });

  return (
    <mesh ref={ring} position={[0, -0.78, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.5, 0.62, 40]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0}
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function Chest({ plan, onReady }: { plan: CeremonyPlan; onReady?: () => void }) {
  const group = useRef<THREE.Group>(null);
  const lid = useRef<THREE.Group>(null);
  const glow = useRef<THREE.PointLight>(null);
  const seam = useRef<THREE.Mesh>(null);
  const cord = useRef<THREE.Group>(null);
  const { phase, elapsed } = useCeremonyClock(plan);
  const announced = useRef(false);

  /** Vitesse angulaire du couvercle. C'est ce qui en fait un ressort. */
  const lidSpeed = useRef(0);
  /** Instant du claquement, pour déclencher l'onde. −1 tant qu'il n'a pas eu lieu. */
  const burstAt = useRef(-1);

  const premium = plan.tier === 'PREMIUM';
  const royal = plan.tier === 'ROYAL';
  const leviting = plan.motion === 'LEVITATE';

  useFrame((state, delta) => {
    // La cérémonie ne doit commencer qu'une fois la scène réellement à
    // l'écran : sinon le minuteur court pendant le téléchargement de
    // Three.js et la révélation arrive avant le coffre.
    if (!announced.current) {
      announced.current = true;
      onReady?.();
    }

    const t = elapsed.current;
    const progress = plan.shakeSeconds > 0 ? Math.min(1, t / plan.shakeSeconds) : 1;

    // L'instant exact du claquement, relevé une seule fois : l'onde de choc,
    // le contrecoup et la rupture du cordage s'y accrochent tous les trois.
    if (phase === 'burst' && burstAt.current < 0) {
      burstAt.current = state.clock.elapsedTime;
    }

    if (group.current) {
      /*
       * La rotation du coffre royal ne dépend pas de la phase.
       *
       * Une seule loi couvre la charge **et** le silence, et s'arrête d'
       * elle-même : à `u = 1`, `smootherstep` vaut exactement 1 et l'angle
       * vaut un nombre entier de tours — le coffre est de face, à la
       * milliseconde où le couvercle cède, sans que personne ne l'y ait
       * ramené. Passé ce point, `u` reste borné à 1 et l'angle ne bouge plus.
       */
      if (leviting) group.current.rotation.y = angleLevitation(plan, t);

      if (phase === 'charge' && leviting) {
        /*
         * Le coffre royal ne se débat pas : il s'élève.
         *
         * Rien ne le force de l'intérieur — il s'ouvre parce que c'est
         * l'heure. La montée est lente et régulière, la rotation continue, et
         * une respiration à peine perceptible évite l'objet parfaitement
         * immobile, qui se lit comme une image figée plutôt que comme un
         * volume.
         *
         * C'est la différence que le joueur paie : deux secondes suffisent à
         * savoir, sans lire une étiquette, qu'on n'a pas ouvert le même coffre.
         */
        group.current.position.y = (1 - (1 - progress) ** 2) * 0.42;
        group.current.rotation.z = Math.sin(t * 1.7) * 0.035;
        group.current.position.x = 0;
      } else if (phase === 'charge') {
        // Tremblement **croissant**, à l'inverse d'une version précédente qui
        // s'éteignait en avançant. Quelque chose qui pousse de l'intérieur
        // force de plus en plus fort ; l'amplitude doit monter jusqu'à la
        // rupture, sans quoi la scène raconte un coffre qui se calme.
        const intensity = 0.014 + 0.075 * progress ** 2;
        group.current.rotation.z = Math.sin(t * 44) * intensity;
        group.current.rotation.y = Math.sin(t * 17) * intensity * 0.7;
        group.current.position.x = Math.sin(t * 37) * intensity * 0.6;

        // Sursauts : le coffre décolle par à-coups, de plus en plus haut. Un
        // tremblement seul reste plat ; c'est le saut qui donne l'impression
        // que quelque chose force pour sortir.
        const hop = Math.max(0, Math.sin(t * 8.5));
        group.current.position.y = hop ** 3 * (0.03 + 0.16 * progress);
      } else if (phase === 'hold' && leviting) {
        // Il reste en l'air, presque immobile. Redescendre ici casserait la
        // promesse : le silence doit être une suspension, pas un retour au sol.
        group.current.position.y += (0.42 - group.current.position.y) * 0.1;
        group.current.rotation.z *= 0.9;
        // La rotation, elle, est déjà réglée plus haut : elle finit sa course
        // sur un tour entier au moment exact de l'ouverture.
      } else if (phase === 'hold') {
        // Immobilité franche. C'est le §61 : le silence avant la révélation.
        group.current.rotation.z *= 0.7;
        group.current.rotation.y *= 0.7;
        group.current.position.x *= 0.7;
        group.current.position.y *= 0.7;
      } else {
        /*
         * Contrecoup.
         *
         * Le coffre encaisse l'ouverture — il s'enfonce d'un cran, puis
         * remonte. Sans lui, le couvercle partait sans que la caisse ne
         * bouge : deux objets solidaires dont un seul réagit se lisent comme
         * deux objets séparés.
         */
        const depuis = burstAt.current >= 0 ? state.clock.elapsedTime - burstAt.current : 0;
        const recul = Math.max(0, 1 - depuis / 0.42);
        const assise = leviting ? 0.42 : 0;

        group.current.rotation.z *= 0.85;
        group.current.position.x *= 0.85;
        group.current.position.y +=
          (assise - recul * 0.09 - group.current.position.y) * 0.18;

        // Le coffre royal est déjà de face et immobile en rotation — la loi
        // plus haut l'y a posé. Seul celui du port a un reste de tremblement
        // à amortir.
        if (!leviting) group.current.rotation.y *= 0.85;
      }
    }

    if (lid.current) {
      if (phase === 'charge' && leviting) {
        // Rien ne claque sur un coffre qui lévite. Le couvercle respire à
        // peine — juste assez pour qu'on sache qu'il n'est pas soudé.
        lid.current.rotation.x = -(Math.sin(t * 2.2) ** 2) * 0.012;
      } else if (phase === 'charge') {
        // Le couvercle claque contre la serrure, de plus en plus fort, sans
        // jamais s'ouvrir. Il ne doit rien laisser voir : entrouvert, il
        // vendrait la mèche avant le silence.
        const rattle = Math.max(0, Math.sin(t * 13)) ** 2;
        lid.current.rotation.x = -rattle * 0.05 * progress;
      } else if (phase === 'hold') {
        lid.current.rotation.x += (0 - lid.current.rotation.x) * 0.14;
        lidSpeed.current = 0;
      } else {
        /*
         * Ressort, et non interpolation.
         *
         * L'ancienne version approchait sa cible de 14 % par image : un
         * mouvement qui ralentit en permanence et n'atteint jamais rien. Un
         * couvercle qui cède part **vite**, dépasse, et revient — c'est le
         * dépassement qui fait entendre le claquement qu'on ne joue pas.
         *
         * Raideur et amortissement sont réglés pour un seul rebond franc :
         * plus mou, le couvercle flotte ; plus raide, il vibre comme un
         * ressort de jouet.
         */
        const cible = -Math.PI * 0.72;
        const raideur = royal ? 150 : 190;
        const amorti = royal ? 15 : 17;
        const dt = Math.min(delta, 1 / 30); // pas de bond après un gel d'image

        lidSpeed.current +=
          (cible - lid.current.rotation.x) * raideur * dt -
          lidSpeed.current * amorti * dt;
        lid.current.rotation.x += lidSpeed.current * dt;
      }
    }

    /*
     * Le cordage du coffre royal se rompt à l'ouverture.
     *
     * Il ne disparaît pas : il tombe et s'efface en même temps. Une corde qui
     * s'évapore d'une image à l'autre se remarque comme un défaut d'affichage ;
     * une corde qui cède donne une **cause** au couvercle qui s'ouvre.
     */
    if (cord.current) {
      if (phase === 'burst') {
        const depuis = burstAt.current >= 0 ? state.clock.elapsedTime - burstAt.current : 0;
        cord.current.position.y -= delta * 1.9;
        cord.current.rotation.z += delta * 1.4;
        cord.current.visible = depuis < 0.9;
      } else if (phase === 'hold') {
        // Il se tend, juste avant de lâcher.
        cord.current.scale.setScalar(1 + Math.sin(t * 9) * 0.012);
      }
    }

    // Lumière : une lueur retenue pendant la charge, éteinte au silence, puis
    // pleine à l'ouverture.
    if (glow.current) {
      const target =
        phase === 'charge'
          ? 1.2 + progress * 3.5
          : phase === 'hold'
            ? 0.2
            : royal
              ? 26
              : premium
                ? 20
                : 8;
      glow.current.intensity += (target - glow.current.intensity) * 0.14;
    }

    // Rai de lumière au joint : il grandit avec la pression, et pulse au
    // rythme des claquements du couvercle.
    if (seam.current) {
      const material = seam.current.material as THREE.MeshBasicMaterial;
      material.opacity =
        phase === 'charge'
          ? Math.min(0.95, progress * (0.55 + 0.45 * Math.max(0, Math.sin(t * 13))))
          : phase === 'hold'
            ? 0.06
            : 0;
    }

    // Caméra : elle se rapproche pendant la charge, se fige au silence, puis
    // recule à l'ouverture pour laisser voir le jaillissement.
    const distance =
      phase === 'charge'
        ? 3.6 - 0.55 * progress
        : phase === 'hold'
          ? 2.95
          : 3.75;
    state.camera.position.z += (distance - state.camera.position.z) * 0.06;

    if (premium && phase === 'burst') {
      state.camera.position.x = Math.sin(state.clock.elapsedTime * 0.45) * 0.5;
    }
    state.camera.lookAt(0, 0.05, 0);
  });

  return (
    <>
      <ChestModel
        ref={group}
        lidRef={lid}
        seamRef={seam}
        cordRef={cord}
        palette={plan.skin === 'ROYAL' ? ROYAL_PALETTE : HARBOR_PALETTE}
      />

      {/* L'onde de choc reste montée en permanence : la créer au moment du
          claquement ferait compiler son matériau pile à l'image où l'on a le
          moins de temps à perdre, et le premier plan sauterait. Invisible
          tant que `burstAt` n'a pas été relevé. */}
      <Shockwave color={plan.hakiColors.at(-1) ?? '#f5c542'} at={burstAt} />

      {/* Lumière intérieure. Sa couleur est celle de la rareté obtenue : le
          coffre s'éclaire de ce qu'il contient. */}
      <pointLight
        ref={glow}
        position={[0, 0.1, 0]}
        color={plan.hakiColors.at(-1)}
        intensity={0}
        distance={7}
      />

      {/* `active` ne commande que les éclairs de rareté ; ceux du Haki des
          Rois s'allument seuls, de bout en bout, et le composant le décide à
          partir du plan. */}
      <HakiBolts plan={plan} elapsed={elapsed} active={phase === 'charge'} />

      {/* Rayon lumineux : légendaire et coffre royal (§56). Il manquait au
          royal, qui est pourtant le seul dont on soit sûr d'avance qu'il
          mérite la colonne. */}
      {(premium || royal) && phase === 'burst' && (
        <mesh position={[0, 1.7, 0]}>
          <cylinderGeometry args={[0.14, 0.8, 3.4, 24, 1, true]} />
          <meshBasicMaterial
            color={plan.hakiColors.at(-1)}
            transparent
            opacity={0.22}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </>
  );
}

/** Particules montantes, réservées aux coffres premium. */
function Particles({ count, color }: { count: number; color: string }) {
  const points = useRef<THREE.Points>(null);

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 1.5;
      positions[i * 3 + 1] = Math.random() * 0.4 - 0.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1;
      speeds[i] = 0.3 + Math.random() * 0.9;
    }
    return { positions, speeds };
  }, [count]);

  useFrame((_, delta) => {
    const geometry = points.current?.geometry;
    if (!geometry) return;

    const array = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i += 1) {
      array[i * 3 + 1] += speeds[i] * delta;
      // Recyclage : une particule sortie du cadre repart du coffre.
      if (array[i * 3 + 1] > 2.8) array[i * 3 + 1] = -0.2;
    }
    geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.05}
        transparent
        opacity={0.9}
        depthWrite={false}
      />
    </points>
  );
}

export default function ChestScene({
  plan,
  onReady,
}: {
  plan: CeremonyPlan;
  onReady?: () => void;
}) {
  const highlight = plan.hakiColors.at(-1) ?? '#f5c542';

  return (
    <Canvas
      camera={{ position: [0, 0.55, 3.6], fov: 44 }}
      // `dpr` plafonné : un écran très dense ne doit pas quadrupler le coût
      // de rendu sur mobile (§107).
      dpr={[1, 1.8]}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 5, 4]} intensity={1.2} />
      {/* Contre-jour teinté de la rareté : il détache le coffre du fond et
          colore ses arêtes du côté opposé à la lumière principale. */}
      <directionalLight position={[-3, 2, -2]} intensity={0.5} color={highlight} />

      <Chest plan={plan} onReady={onReady} />
      {plan.particles > 0 && (
        <Particles count={plan.particles} color={highlight} />
      )}
    </Canvas>
  );
}
