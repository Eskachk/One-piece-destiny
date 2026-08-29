'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
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
 * Chaque éclair est une ligne brisée qui part du coffre et se perd vers le
 * haut. Les sommets sont **retirés au sort à intervalle fixe**, pas à chaque
 * image : un éclair qui change soixante fois par seconde se lit comme du
 * bruit, alors qu'à douze fois par seconde on voit un crépitement.
 *
 * La couleur vient du plan (`hakiColorAt`) et progresse avec la charge : le
 * dernier palier est la couleur de la meilleure carte du coffre.
 */
function HakiBolts({
  plan,
  elapsed,
  active,
}: {
  plan: CeremonyPlan;
  elapsed: { current: number };
  active: boolean;
}) {
  const SEGMENTS = 7;
  const lines = useRef<THREE.LineSegments>(null);
  const material = useRef<THREE.LineBasicMaterial>(null);
  const lastRedraw = useRef(0);

  // Deux sommets par segment : `LineSegments` dessine des tronçons
  // indépendants, ce qui évite de relier la fin d'un éclair au début du
  // suivant — un trait parasite qui traverserait toute la scène.
  const positions = useMemo(
    () => new Float32Array(plan.bolts * SEGMENTS * 2 * 3),
    [plan.bolts],
  );

  useFrame(() => {
    if (!lines.current || !material.current) return;

    const t = elapsed.current;
    const progress = plan.shakeSeconds > 0 ? t / plan.shakeSeconds : 1;

    // Intensité : les éclairs naissent, montent, puis s'éteignent d'un coup
    // au silence. Leur disparition est ce qui rend le silence audible.
    material.current.opacity = active ? Math.min(1, progress * 1.6) : 0;
    material.current.color.set(hakiColorAt(plan, progress));

    if (!active || t - lastRedraw.current < 0.08) return;
    lastRedraw.current = t;

    const attribute = lines.current.geometry.attributes.position;
    const array = attribute.array as Float32Array;

    for (let bolt = 0; bolt < plan.bolts; bolt += 1) {
      const angle = (bolt / plan.bolts) * Math.PI * 2 + Math.random() * 0.5;
      const reach = 1.2 + Math.random() * 1.4;

      // Les éclairs naissent **au niveau du joint**, pas au centre de la
      // caisse : partis d'en dessous, leurs premiers segments étaient à
      // l'intérieur du coffre, donc masqués par le bois.
      let x = Math.cos(angle) * 0.45;
      let y = 0.18;
      let z = Math.sin(angle) * 0.45;

      for (let segment = 0; segment < SEGMENTS; segment += 1) {
        const base = (bolt * SEGMENTS + segment) * 6;
        const step = reach / SEGMENTS;

        array[base] = x;
        array[base + 1] = y;
        array[base + 2] = z;

        x += Math.cos(angle) * step * 0.6 + (Math.random() - 0.5) * 0.34;
        y += step + (Math.random() - 0.5) * 0.2;
        z += Math.sin(angle) * step * 0.6 + (Math.random() - 0.5) * 0.34;

        array[base + 3] = x;
        array[base + 4] = y;
        array[base + 5] = z;
      }
    }

    attribute.needsUpdate = true;
  });

  if (plan.bolts === 0) return null;

  return (
    <lineSegments ref={lines}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={positions.length / 3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        ref={material}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  );
}

function Chest({ plan, onReady }: { plan: CeremonyPlan; onReady?: () => void }) {
  const group = useRef<THREE.Group>(null);
  const lid = useRef<THREE.Group>(null);
  const glow = useRef<THREE.PointLight>(null);
  const seam = useRef<THREE.Mesh>(null);
  const { phase, elapsed } = useCeremonyClock(plan);
  const announced = useRef(false);

  const premium = plan.tier === 'PREMIUM';

  useFrame((state) => {
    // La cérémonie ne doit commencer qu'une fois la scène réellement à
    // l'écran : sinon le minuteur court pendant le téléchargement de
    // Three.js et la révélation arrive avant le coffre.
    if (!announced.current) {
      announced.current = true;
      onReady?.();
    }

    const t = elapsed.current;
    const progress = plan.shakeSeconds > 0 ? Math.min(1, t / plan.shakeSeconds) : 1;

    if (group.current) {
      if (phase === 'charge') {
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
      } else if (phase === 'hold') {
        // Immobilité franche. C'est le §61 : le silence avant la révélation.
        group.current.rotation.z *= 0.7;
        group.current.rotation.y *= 0.7;
        group.current.position.x *= 0.7;
        group.current.position.y *= 0.7;
      } else {
        group.current.rotation.z *= 0.85;
        group.current.rotation.y *= 0.85;
        group.current.position.x *= 0.85;
        group.current.position.y *= 0.85;
      }
    }

    if (lid.current) {
      if (phase === 'charge') {
        // Le couvercle claque contre la serrure, de plus en plus fort, sans
        // jamais s'ouvrir. Il ne doit rien laisser voir : entrouvert, il
        // vendrait la mèche avant le silence.
        const rattle = Math.max(0, Math.sin(t * 13)) ** 2;
        lid.current.rotation.x = -rattle * 0.05 * progress;
      } else {
        const target = phase === 'burst' ? -Math.PI * 0.7 : 0;
        lid.current.rotation.x += (target - lid.current.rotation.x) * 0.14;
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
        palette={plan.skin === 'ROYAL' ? ROYAL_PALETTE : HARBOR_PALETTE}
      />

      {/* Lumière intérieure. Sa couleur est celle de la rareté obtenue : le
          coffre s'éclaire de ce qu'il contient. */}
      <pointLight
        ref={glow}
        position={[0, 0.1, 0]}
        color={plan.hakiColors.at(-1)}
        intensity={0}
        distance={7}
      />

      <HakiBolts plan={plan} elapsed={elapsed} active={phase === 'charge'} />

      {/* Rayon lumineux, uniquement pour un légendaire (§56) */}
      {premium && phase === 'burst' && (
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
