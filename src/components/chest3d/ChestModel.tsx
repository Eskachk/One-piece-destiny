'use client';

import { forwardRef, useMemo } from 'react';
import * as THREE from 'three';

/**
 * Le coffre lui-même (cahier §107, §122).
 *
 * Séparé de la scène : `ChestScene` s'occupe du temps — phases, éclairs,
 * caméra — et ce fichier de la forme. Les deux changeaient ensemble alors
 * qu'ils ne changent jamais pour les mêmes raisons.
 *
 * **Tout est géométrie procédurale.** Aucune texture, aucun modèle, aucun
 * fichier à télécharger (§107) — et aucun visuel repris de l'œuvre (§122).
 * Le coffre est un coffre de trésor générique : caisse à panneaux peints,
 * cadre en bois clair, couvercle bombé, ferrures.
 *
 * L'usure du rouge est faite de **plaques posées devant** le panneau plutôt
 * que d'une texture : quelques plans irréguliers en gris-bleu, décalés d'un
 * millimètre pour éviter la lutte de profondeur. C'est la seule façon
 * d'obtenir une peinture écaillée sans image.
 */

/** Bois clair du cadre, éclairé et ombré par ses propres faces. */
const WOOD = '#e2bd85';
const WOOD_DARK = '#c39a5e';
const WOOD_DEEP = '#a97c44';
/** Rouge des panneaux peints. */
const PAINT = '#bf3a30';
/** Gris-bleu de la peinture écaillée. */
const WORN = '#5d7b88';

function Wood({
  position,
  size,
  color = WOOD,
  rotation,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
  rotation?: [number, number, number];
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.78} metalness={0.02} />
    </mesh>
  );
}

/** Clou à tête bombée. Six segments suffisent à cette taille. */
function Rivet({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} castShadow>
      <sphereGeometry args={[0.045, 10, 8]} />
      <meshStandardMaterial color={WOOD} roughness={0.5} metalness={0.15} />
    </mesh>
  );
}

/**
 * Plaques d'usure sur un panneau peint.
 *
 * Les positions sont tirées une seule fois, à partir d'une graine fixe : un
 * coffre dont l'usure change à chaque ouverture ne se lirait pas comme un
 * objet, mais comme un bruit.
 */
function Wear({
  seed,
  z,
  rotationY = 0,
}: {
  seed: number;
  z: number;
  rotationY?: number;
}) {
  const patches = useMemo(() => {
    // Générateur déterministe minuscule : `Math.random` rendrait le coffre
    // différent à chaque rendu, y compris entre le serveur et le client.
    let state = seed;
    const next = () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };

    // Beaucoup de petites plaques plutôt que quelques grandes : la peinture
    // s'écaille par éclats. Sept larges rectangles se lisaient comme des
    // panneaux gris posés là, pas comme de l'usure.
    return Array.from({ length: 14 }, () => ({
      x: (next() - 0.5) * 1.3,
      y: (next() - 0.5) * 0.66 - 0.18,
      w: 0.07 + next() * 0.17,
      h: 0.05 + next() * 0.12,
      r: (next() - 0.5) * 1.4,
    }));
  }, [seed]);

  return (
    <group position={[0, 0, z]} rotation={[0, rotationY, 0]}>
      {patches.map((patch, index) => (
        <mesh key={index} position={[patch.x, patch.y, 0]} rotation={[0, 0, patch.r]}>
          <planeGeometry args={[patch.w, patch.h]} />
          <meshStandardMaterial color={WORN} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Fermoir en écu.
 *
 * Trois volumes empilés — deux lobes et une pointe — plutôt qu'un tracé
 * découpé : la forme se lit de loin, et une extrusion sur mesure coûterait
 * bien plus de triangles pour un détail de vingt pixels.
 */
function Clasp() {
  return (
    <group position={[0, -0.06, 0.63]}>
      {[-0.11, 0.11].map((x) => (
        <mesh key={x} position={[x, 0.08, 0]} castShadow>
          <sphereGeometry args={[0.15, 14, 12]} />
          <meshStandardMaterial color={WOOD} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, -0.09, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[0.21, 0.21, 0.1]} />
        <meshStandardMaterial color={WOOD} roughness={0.6} />
      </mesh>

      {/* Moraillon : la languette métallique qui retient le couvercle. */}
      <mesh position={[0, 0.04, 0.09]} castShadow>
        <boxGeometry args={[0.16, 0.3, 0.05]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.45} metalness={0.25} />
      </mesh>
      <mesh position={[0, 0.02, 0.13]}>
        <boxGeometry args={[0.05, 0.11, 0.02]} />
        <meshStandardMaterial color="#7a2a20" roughness={0.8} />
      </mesh>
    </group>
  );
}

/** Anneau de poignée, sur les flancs. */
function Handle({ x }: { x: number }) {
  return (
    <group position={[x, 0.02, 0]} rotation={[0, Math.PI / 2, 0]}>
      <mesh castShadow>
        <torusGeometry args={[0.16, 0.045, 8, 20]} />
        <meshStandardMaterial color={WOOD} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.06, 12]} />
        <meshStandardMaterial color={WOOD_DARK} roughness={0.6} />
      </mesh>
    </group>
  );
}

export interface ChestModelProps {
  /** Groupe du couvercle, animé par la scène. */
  lidRef: React.Ref<THREE.Group>;
  /** Plan lumineux du joint, animé par la scène. */
  seamRef: React.Ref<THREE.Mesh>;
}

export const ChestModel = forwardRef<THREE.Group, ChestModelProps>(
  function ChestModel({ lidRef, seamRef }, ref) {
    return (
      <group ref={ref}>
        {/* ---------------------------------------------------------------
            Caisse : panneau peint, puis cadre clair par-dessus.
            L'ordre compte — le cadre doit border la peinture, pas l'inverse.
            --------------------------------------------------------------- */}
        <mesh position={[0, -0.28, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.5, 0.86, 1.1]} />
          <meshStandardMaterial color={PAINT} roughness={0.62} />
        </mesh>

        <Wear seed={7} z={0.552} />
        <Wear seed={91} z={-0.552} rotationY={Math.PI} />

        {/* Montants d'angle */}
        {[-0.72, 0.72].map((x) =>
          [-0.52, 0.52].map((z) => (
            <Wood
              key={`${x}:${z}`}
              position={[x, -0.28, z]}
              size={[0.16, 0.94, 0.16]}
            />
          )),
        )}

        {/* Traverses horizontales : haute, médiane, basse. */}
        <Wood position={[0, 0.13, 0]} size={[1.56, 0.13, 1.16]} />
        <Wood position={[0, -0.24, 0]} size={[1.56, 0.1, 1.15]} color={WOOD_DARK} />
        <Wood position={[0, -0.68, 0]} size={[1.6, 0.16, 1.2]} color={WOOD_DEEP} />

        {/* Montant central, avant et arrière */}
        {[0.56, -0.56].map((z) => (
          <Wood key={z} position={[0, -0.28, z]} size={[0.2, 0.92, 0.06]} />
        ))}

        {/* Clous, alignés sur les traverses. */}
        {[-0.72, -0.36, 0.36, 0.72].map((x) => (
          <Rivet key={`t${x}`} position={[x, 0.13, 0.59]} />
        ))}
        {[-0.72, -0.36, 0.36, 0.72].map((x) => (
          <Rivet key={`b${x}`} position={[x, -0.68, 0.61]} />
        ))}
        {[-0.72, 0.72].map((x) =>
          [-0.5, -0.08].map((y) => (
            <Rivet key={`c${x}:${y}`} position={[x, y, 0.58]} />
          )),
        )}

        <Handle x={-0.79} />
        <Handle x={0.79} />
        <Clasp />

        {/* Rai de lumière au joint. Posé devant la face avant, pas dessus :
            coplanaires, les deux surfaces se disputeraient le même plan et le
            rai ne s'afficherait pas. */}
        <mesh ref={seamRef} position={[0, 0.2, 0.63]}>
          <planeGeometry args={[1.4, 0.07]} />
          <meshBasicMaterial
            color="#fff2c4"
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>

        {/* ---------------------------------------------------------------
            Couvercle bombé, pivotant sur l'arête arrière.
            --------------------------------------------------------------- */}
        <group ref={lidRef} position={[0, 0.19, -0.55]}>
          <group position={[0, 0, 0.55]}>
            {/* Demi-cylindre : c'est ce qui donne la voûte. Trois caisses
                empilées suggéraient la courbe de loin et se voyaient de près. */}
            <mesh
              position={[0, 0.02, 0]}
              rotation={[0, 0, Math.PI / 2]}
              castShadow
              receiveShadow
            >
              <cylinderGeometry
                args={[0.55, 0.55, 1.5, 28, 1, false, 0, Math.PI]}
              />
              <meshStandardMaterial
                color={PAINT}
                roughness={0.6}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Usure sur le dessus du couvercle. */}
            <group position={[0, 0.36, 0.24]} rotation={[-0.5, 0, 0]}>
              <Wear seed={313} z={0.02} />
            </group>

            {/* Cerclages de bois clair suivant la voûte. */}
            {[-0.55, 0, 0.55].map((x) => (
              <mesh
                key={x}
                position={[x, 0.02, 0]}
                rotation={[0, 0, Math.PI / 2]}
                castShadow
              >
                <cylinderGeometry
                  args={[0.575, 0.575, 0.15, 24, 1, true, 0, Math.PI]}
                />
                <meshStandardMaterial
                  color={x === 0 ? WOOD : WOOD_DARK}
                  roughness={0.75}
                  side={THREE.DoubleSide}
                />
              </mesh>
            ))}

            {/* Joues latérales, pour fermer le demi-cylindre. */}
            {[-0.75, 0.75].map((x) => (
              <mesh key={x} position={[x, 0.02, 0]} rotation={[0, 0, 0]}>
                <circleGeometry args={[0.55, 24, 0, Math.PI]} />
                <meshStandardMaterial
                  color={WOOD}
                  roughness={0.8}
                  side={THREE.DoubleSide}
                />
              </mesh>
            ))}

            {/* Bordure basse du couvercle : elle vient couvrir le joint. */}
            <mesh position={[0, -0.02, 0]} castShadow>
              <boxGeometry args={[1.58, 0.13, 1.16]} />
              <meshStandardMaterial color={WOOD} roughness={0.75} />
            </mesh>

            {[-0.72, -0.36, 0.36, 0.72].map((x) => (
              <Rivet key={`l${x}`} position={[x, -0.02, 0.59]} />
            ))}
          </group>
        </group>
      </group>
    );
  },
);
