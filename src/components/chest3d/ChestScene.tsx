'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { CeremonyPlan } from '@/domain/collection/chest-ceremony';

/**
 * Ouverture de coffre en 3D (cahier §56, §57).
 *
 * Contraintes tenues :
 *
 *   §57  la 3D est réservée aux moments forts. Ce module est chargé
 *        dynamiquement, uniquement quand un coffre s'ouvre — les pages
 *        courantes ne portent pas son poids.
 *   §56  coffre commun : tremblement, ouverture, lumière.
 *        coffre légendaire : caméra mobile, particules, rayon lumineux.
 *   §107 aucune texture ni modèle externe : tout est géométrie procédurale,
 *        donc rien à télécharger et rien à décoder.
 */

const WOOD = '#6b4423';
const WOOD_DARK = '#4a2f18';
const GOLD = '#f4c84a';
const TURQUOISE = '#25c7c5';

/** Phases de la cérémonie, dérivées du plan. */
function usePhase(plan: CeremonyPlan) {
  const elapsed = useRef(0);
  const [phase, setPhase] = useState<'shake' | 'opening' | 'revealed'>('shake');

  useFrame((_, delta) => {
    elapsed.current += delta;
    const openAt = plan.shakeSeconds + plan.suspenseSeconds;

    if (elapsed.current >= openAt + 0.8) setPhase('revealed');
    else if (elapsed.current >= openAt) setPhase('opening');
  });

  return { phase, elapsed };
}

function Chest({ plan, onReady }: { plan: CeremonyPlan; onReady?: () => void }) {
  const group = useRef<THREE.Group>(null);
  const lid = useRef<THREE.Group>(null);
  const glow = useRef<THREE.PointLight>(null);
  const { phase, elapsed } = usePhase(plan);
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

    if (group.current) {
      // Tremblement : amplitude décroissante, pour donner l'impression que
      // quelque chose pousse de l'intérieur.
      if (phase === 'shake' && plan.shakeSeconds > 0) {
        const intensity = 0.035 * (1 - t / Math.max(plan.shakeSeconds, 0.001));
        group.current.rotation.z = Math.sin(t * 40) * Math.max(0, intensity);
        group.current.position.x = Math.sin(t * 33) * Math.max(0, intensity) * 0.4;
      } else {
        group.current.rotation.z *= 0.85;
        group.current.position.x *= 0.85;
      }
    }

    // Le couvercle bascule vers l'arrière, puis reste ouvert.
    if (lid.current) {
      const target = phase === 'shake' ? 0 : -Math.PI * 0.62;
      lid.current.rotation.x += (target - lid.current.rotation.x) * 0.12;
    }

    // La lumière monte à l'ouverture ; plus forte pour un légendaire.
    if (glow.current) {
      const target = phase === 'shake' ? 0 : premium ? 14 : 5;
      glow.current.intensity += (target - glow.current.intensity) * 0.09;
    }

    // Caméra légèrement mobile, réservée aux coffres premium (§56).
    if (premium) {
      state.camera.position.x = Math.sin(state.clock.elapsedTime * 0.4) * 0.55;
      state.camera.lookAt(0, 0.1, 0);
    }
  });

  return (
    <group ref={group}>
      {/* Caisse */}
      <mesh position={[0, -0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 0.9, 1.1]} />
        <meshStandardMaterial color={WOOD} roughness={0.85} />
      </mesh>

      {/* Ferrures */}
      {[-0.55, 0.55].map((x) => (
        <mesh key={x} position={[x, -0.25, 0]}>
          <boxGeometry args={[0.12, 0.94, 1.14]} />
          <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.3} />
        </mesh>
      ))}

      {/* Serrure */}
      <mesh position={[0, -0.22, 0.57]}>
        <boxGeometry args={[0.26, 0.3, 0.06]} />
        <meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.25} />
      </mesh>

      {/* Couvercle, pivotant sur l'arête arrière */}
      <group ref={lid} position={[0, 0.2, -0.55]}>
        <mesh position={[0, 0.12, 0.55]} castShadow>
          <boxGeometry args={[1.6, 0.34, 1.1]} />
          <meshStandardMaterial color={WOOD_DARK} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.12, 0.55]}>
          <boxGeometry args={[1.64, 0.1, 1.14]} />
          <meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.3} />
        </mesh>
      </group>

      {/* Lumière intérieure */}
      <pointLight
        ref={glow}
        position={[0, 0.1, 0]}
        color={premium ? GOLD : TURQUOISE}
        intensity={0}
        distance={6}
      />

      {/* Rayon lumineux, uniquement pour un légendaire (§56) */}
      {premium && phase !== 'shake' && (
        <mesh position={[0, 1.6, 0]}>
          <cylinderGeometry args={[0.12, 0.75, 3.2, 24, 1, true]} />
          <meshBasicMaterial
            color={GOLD}
            transparent
            opacity={0.16}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
}

/** Particules montantes, réservées aux coffres premium. */
function Particles({ count }: { count: number }) {
  const points = useRef<THREE.Points>(null);

  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 1.5;
      positions[i * 3 + 1] = Math.random() * 0.4 - 0.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1;
      speeds[i] = 0.3 + Math.random() * 0.8;
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
      if (array[i * 3 + 1] > 2.6) array[i * 3 + 1] = -0.2;
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
        color={GOLD}
        size={0.045}
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
  return (
    <Canvas
      camera={{ position: [0, 0.9, 3.4], fov: 42 }}
      // `dpr` plafonné : un écran très dense ne doit pas quadrupler le coût
      // de rendu sur mobile (§107).
      dpr={[1, 1.8]}
      gl={{ antialias: true, alpha: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 4]} intensity={1.1} />
      <directionalLight position={[-3, 2, -2]} intensity={0.3} color={TURQUOISE} />

      <Chest plan={plan} onReady={onReady} />
      {plan.particles > 0 && <Particles count={plan.particles} />}
    </Canvas>
  );
}
