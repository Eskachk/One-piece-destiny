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

/**
 * Deux palettes, une seule géométrie.
 *
 * Le coffre royal n'est pas un second modèle : ce serait deux fois le même
 * assemblage à maintenir, et ils finiraient par diverger. C'est le **même**
 * coffre, repeint — bois d'ébène, ferrures dorées, panneaux pourpres.
 */
export interface ChestPalette {
  wood: string;
  woodDark: string;
  woodDeep: string;
  paint: string;
  worn: string;
  /**
   * Ce que portent les panneaux.
   *
   * `WEAR` — des plaques ternes : de la peinture écaillée.
   * `CLOUD` — des volutes dorées : un décor peint, intact.
   *
   * C'est le même emplacement dans la géométrie, et c'est volontaire : un
   * coffre ordinaire s'use, un coffre royal se décore. Deux modèles séparés
   * auraient fini par diverger sur tout le reste.
   */
  ornament: 'WEAR' | 'CLOUD';
  /** Éclat des ferrures. La laque et l'or ne réagissent pas comme du bois. */
  metalness: number;
  roughness: number;
  /**
   * Éclat des panneaux.
   *
   * Distinct de celui des ferrures : sur le coffre royal, la laque est plus
   * lisse que l'or, ce qui est exactement ce qui la fait lire comme de la
   * laque. Une seule valeur pour les deux donnait un objet en une seule
   * matière — et un objet en une seule matière ne ressemble à rien.
   */
  paintRoughness: number;
  /**
   * Comment la caisse est charpentée.
   *
   * `PLANKS` — planches et montants : un coffre de marine, assemblé.
   * `PANEL` — un grand panneau bordé : un coffre de cérémonie, laqué.
   *
   * Le premier jet donnait au royal l'ossature du coffre du port : montant
   * central, traverse médiane, montants d'angle épais. Le résultat était un
   * coffre **doré**, pas un coffre noir et or — l'or occupait les deux tiers de
   * la face, les volutes n'avaient nulle part où se voir, et la laque se
   * réduisait à quatre bandes sombres.
   */
  framing: 'PLANKS' | 'PANEL';
  /** Cordage de cérémonie, s'il y en a un. */
  cord?: string;
}

export const HARBOR_PALETTE: ChestPalette = {
  wood: '#e2bd85',
  woodDark: '#c39a5e',
  woodDeep: '#a97c44',
  paint: '#bf3a30',
  worn: '#5d7b88',
  ornament: 'WEAR',
  metalness: 0.02,
  roughness: 0.78,
  paintRoughness: 0.62,
  framing: 'PLANKS',
};

/**
 * Coffre royal : laque noire, or franc, cordage écarlate.
 *
 * Le registre est celui d'un coffre de cérémonie laqué — panneaux presque
 * noirs, encadrement doré épais, volutes peintes à l'or, corde nouée sur le
 * couvercle. C'est une **famille d'ornements**, pas un décalque : rien n'est
 * relevé sur une image, tout est reconstruit en géométrie (§122, §107).
 *
 * Le violet de la version précédente lisait « mauve » plutôt que « précieux ».
 * Sur fond de nuit, c'est le contraste entre le noir profond et l'or qui fait
 * la richesse — pas la quantité de dorure, ni une seconde couleur.
 */
export const ROYAL_PALETTE: ChestPalette = {
  wood: '#f0cd57',
  woodDark: '#c69f2c',
  woodDeep: '#8a6b16',
  paint: '#100d12',
  // Les volutes, dans un or légèrement plus sourd que les ferrures : peintes
  // sur la laque, elles ne renvoient pas la lumière comme du métal.
  worn: '#d4ab3c',
  ornament: 'CLOUD',
  metalness: 0.55,
  roughness: 0.32,
  // Presque un miroir : c'est le reflet le long des arêtes qui dit « laqué »,
  // et sans lui le noir n'est qu'un trou dans l'image.
  paintRoughness: 0.16,
  framing: 'PANEL',
  cord: '#a81f2d',
};

function Wood({
  position,
  size,
  color,
  rotation,
  palette,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  rotation?: [number, number, number];
  palette: ChestPalette;
}) {
  return (
    <mesh position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={size} />
      {/* La matière vient de la palette, pas de constantes : du bois mat sur
          le coffre du port, de l'or poli sur le royal. Sans cela, un
          encadrement doré rendait exactement comme une planche. */}
      <meshStandardMaterial
        color={color}
        roughness={palette.roughness}
        metalness={palette.metalness}
      />
    </mesh>
  );
}

/** Clou à tête bombée. Six segments suffisent à cette taille. */
function Rivet({
  position,
  color,
}: {
  position: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={position} castShadow>
      <sphereGeometry args={[0.045, 10, 8]} />
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.15} />
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
/**
 * Ce que reçoit un décor de panneau.
 *
 * La palette entière, et non deux ou trois couleurs choisies : `Wear` et
 * `Clouds` occupent le même emplacement et sont interchangeables, donc ils
 * doivent avoir la **même** signature. Leur passer chacun les couleurs dont il
 * a besoin obligeait l'appelant à savoir lequel des deux il monte — ce qu'il
 * choisit précisément pour ne plus avoir à y penser.
 */
interface DecorPanneau {
  seed: number;
  z: number;
  palette: ChestPalette;
  rotationY?: number;
}

function Wear({ seed, z, palette, rotationY = 0 }: DecorPanneau) {
  const color = palette.worn;
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
        <mesh
          key={index}
          position={[patch.x, patch.y, 0]}
          rotation={[0, 0, patch.r]}
        >
          <planeGeometry args={[patch.w, patch.h]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Volutes dorées sur un panneau laqué.
 *
 * Le pendant exact de `Wear`, au même endroit de la géométrie : là où le
 * coffre du port s'écaille, le coffre royal se décore.
 *
 * Une volute est faite de **cercles qui se chevauchent** — trois lobes et une
 * base — plutôt que d'un tracé. C'est la construction d'un nuage stylisé, elle
 * coûte quatre disques, et surtout elle se lit à la taille où on la verra :
 * une courbe extrudée aurait demandé cent fois plus de triangles pour un motif
 * de quinze pixels de haut.
 *
 * Les positions sont tirées d'une graine fixe, comme l'usure : un décor qui
 * change à chaque ouverture ne se lit pas comme un objet.
 */
function Clouds({ seed, z, palette, rotationY = 0 }: DecorPanneau) {
  const color = palette.worn;
  /** L'œil de la spirale est un creux : c'est le panneau qu'on y revoit. */
  const creux = palette.paint;
  const volutes = useMemo(() => {
    let state = seed;
    const next = () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };

    /*
     * Six volutes, réparties de part et d'autre du fermoir.
     *
     * Elles s'enroulent **vers l'extérieur** : `miroir` donne à celles de
     * gauche le sens inverse de celles de droite, et la face se lit comme un
     * décor symétrique plutôt que comme six motifs posés au hasard.
     *
     * Le centre reste dégagé — c'est là que passent le fermoir et le cordage,
     * et un motif dessous les rendrait illisibles.
     */
    return Array.from({ length: 6 }, (_, index) => {
      const cote = index % 2 === 0 ? -1 : 1;
      return {
        x: cote * (0.26 + next() * 0.4),
        y: (next() - 0.5) * 0.62 - 0.1,
        r: 0.1 + next() * 0.07,
        miroir: cote,
      };
    });
  }, [seed]);

  return (
    <group position={[0, 0, z]} rotation={[0, rotationY, 0]}>
      {volutes.map((volute, index) => (
        <group key={index} position={[volute.x, volute.y, 0]}>
          {/* Quatre lobes décroissants, posés sur un quart de cercle : c'est
              l'enroulement d'une volute, en réduction. */}
          {[
            [0, 0, 1],
            [volute.r * 1.35 * volute.miroir, volute.r * 0.75, 0.7],
            [volute.r * 2.1 * volute.miroir, volute.r * 1.35, 0.44],
            [volute.r * 2.4 * volute.miroir, volute.r * 2, 0.24],
          ].map(([dx, dy, echelle], lobe) => (
            <mesh key={lobe} position={[dx, dy, 0]}>
              <circleGeometry args={[volute.r * echelle, 14]} />
              <meshStandardMaterial
                color={color}
                roughness={0.45}
                metalness={0.35}
              />
            </mesh>
          ))}

          {/*
            L'œil de la spirale.

            Un disque de la couleur du panneau, au centre du plus gros lobe.
            C'est **lui** qui fait la volute : sans creux, les lobes se lisent
            comme une pastille dorée un peu bosselée, et la face du coffre
            ressemblait à un semis de piécettes. Un enroulement se reconnaît à
            son vide central, pas à sa courbe.
          */}
          <mesh position={[0, 0, 0.002]}>
            <circleGeometry args={[volute.r * 0.42, 12]} />
            <meshStandardMaterial color={creux} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * Cordage de cérémonie, noué sur le couvercle.
 *
 * Deux brins qui enjambent la voûte et deux glands qui pendent sur la face
 * avant. Il n'appartient qu'au coffre royal, et la scène s'en sert comme
 * **repère du récit** : tant qu'il est là, le coffre est scellé. Il se rompt
 * à l'instant précis où le couvercle cède, ce qui donne à l'ouverture une
 * cause visible au lieu d'un simple pivot.
 */
function Cord({
  color,
  groupRef,
}: {
  color: string;
  groupRef: React.Ref<THREE.Group>;
}) {
  return (
    <group ref={groupRef}>
      {[-0.26, 0.26].map((x) => (
        <mesh key={x} position={[x, 0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
          {/* Un tore ouvert sur un demi-tour épouse exactement la voûte du
              couvercle, qui est elle-même un demi-cylindre. */}
          <torusGeometry args={[0.6, 0.032, 8, 22, Math.PI]} />
          <meshStandardMaterial color={color} roughness={0.85} />
        </mesh>
      ))}

      {/* Glands : une olive et sa frange, sur la face avant. */}
      {[-0.26, 0.26].map((x) => (
        <group key={`g${x}`} position={[x, -0.18, 0.6]}>
          <mesh>
            <sphereGeometry args={[0.055, 10, 8]} />
            <meshStandardMaterial color={color} roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.11, 0]}>
            <coneGeometry args={[0.06, 0.18, 10]} />
            <meshStandardMaterial color={color} roughness={0.95} />
          </mesh>
        </group>
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
function Clasp({ palette }: { palette: ChestPalette }) {
  return (
    <group position={[0, -0.06, 0.63]}>
      {[-0.11, 0.11].map((x) => (
        <mesh key={x} position={[x, 0.08, 0]} castShadow>
          <sphereGeometry args={[0.15, 14, 12]} />
          <meshStandardMaterial color={palette.wood} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, -0.09, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[0.21, 0.21, 0.1]} />
        <meshStandardMaterial color={palette.wood} roughness={0.6} />
      </mesh>

      {/* Moraillon : la languette métallique qui retient le couvercle. */}
      <mesh position={[0, 0.04, 0.09]} castShadow>
        <boxGeometry args={[0.16, 0.3, 0.05]} />
        <meshStandardMaterial
          color={palette.woodDark}
          roughness={0.45}
          metalness={0.25}
        />
      </mesh>
      <mesh position={[0, 0.02, 0.13]}>
        <boxGeometry args={[0.05, 0.11, 0.02]} />
        <meshStandardMaterial color="#7a2a20" roughness={0.8} />
      </mesh>
    </group>
  );
}

/** Anneau de poignée, sur les flancs. */
function Handle({ x, palette }: { x: number; palette: ChestPalette }) {
  return (
    <group position={[x, 0.02, 0]} rotation={[0, Math.PI / 2, 0]}>
      <mesh castShadow>
        <torusGeometry args={[0.16, 0.045, 8, 20]} />
        <meshStandardMaterial color={palette.wood} roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.06, 12]} />
        <meshStandardMaterial color={palette.woodDark} roughness={0.6} />
      </mesh>
    </group>
  );
}

export interface ChestModelProps {
  /** Groupe du couvercle, animé par la scène. */
  lidRef: React.Ref<THREE.Group>;
  /** Plan lumineux du joint, animé par la scène. */
  seamRef: React.Ref<THREE.Mesh>;
  /** Palette. Le coffre royal est le même modèle, repeint et redécoré. */
  palette?: ChestPalette;
  /** Cordage du coffre royal, rompu par la scène à l'ouverture. */
  cordRef?: React.Ref<THREE.Group>;
}

export const ChestModel = forwardRef<THREE.Group, ChestModelProps>(
  function ChestModel(
    { lidRef, seamRef, palette = HARBOR_PALETTE, cordRef },
    ref,
  ) {
    // Un seul point de décision pour le décor des panneaux : le motif est
    // choisi ici, et les quatre emplacements le reçoivent. Répéter le test à
    // chaque appel finirait par en laisser un derrière.
    const Panneau = palette.ornament === 'CLOUD' ? Clouds : Wear;
    // Un coffre laqué se borde, il ne se charpente pas : ni montant central,
    // ni traverse médiane, et des montants d'angle deux fois plus fins. C'est
    // ce qui laisse au noir la place d'être vu.
    const planches = palette.framing === 'PLANKS';
    const angle = planches ? 0.16 : 0.09;

    return (
      <group ref={ref}>
        {/* ---------------------------------------------------------------
            Caisse : panneau peint, puis cadre clair par-dessus.
            L'ordre compte — le cadre doit border la peinture, pas l'inverse.
            --------------------------------------------------------------- */}
        <mesh position={[0, -0.28, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.5, 0.86, 1.1]} />
          <meshStandardMaterial
            color={palette.paint}
            roughness={palette.paintRoughness}
            metalness={palette.ornament === 'CLOUD' ? 0.2 : 0}
          />
        </mesh>

        <Panneau seed={7} z={0.552} palette={palette} />
        <Panneau seed={91} z={-0.552} palette={palette} rotationY={Math.PI} />

        {/* Montants d'angle */}
        {[-0.72, 0.72].map((x) =>
          [-0.52, 0.52].map((z) => (
            <Wood
              key={`${x}:${z}`}
              position={[x, -0.28, z]}
              size={[angle, 0.94, angle]}
              color={palette.wood}
              palette={palette}
            />
          )),
        )}

        {/* Traverses horizontales : haute, médiane, basse. */}
        <Wood
          position={[0, 0.13, 0]}
          size={[1.56, 0.13, 1.16]}
          color={palette.wood}
          palette={palette}
        />
        {planches && (
          <Wood
            position={[0, -0.24, 0]}
            size={[1.56, 0.1, 1.15]}
            color={palette.woodDark}
            palette={palette}
          />
        )}
        <Wood
          position={[0, -0.68, 0]}
          size={[1.6, 0.16, 1.2]}
          color={palette.woodDeep}
          palette={palette}
        />

        {/* Montant central, avant et arrière */}
        {planches &&
          [0.56, -0.56].map((z) => (
            <Wood
              key={z}
              position={[0, -0.28, z]}
              size={[0.2, 0.92, 0.06]}
              color={palette.wood}
              palette={palette}
            />
          ))}

        {/* Clous, alignés sur les traverses. */}
        {[-0.72, -0.36, 0.36, 0.72].map((x) => (
          <Rivet
            color={palette.wood}
            key={`t${x}`}
            position={[x, 0.13, 0.59]}
          />
        ))}
        {[-0.72, -0.36, 0.36, 0.72].map((x) => (
          <Rivet
            color={palette.wood}
            key={`b${x}`}
            position={[x, -0.68, 0.61]}
          />
        ))}
        {[-0.72, 0.72].map((x) =>
          [-0.5, -0.08].map((y) => (
            <Rivet
              color={palette.wood}
              key={`c${x}:${y}`}
              position={[x, y, 0.58]}
            />
          )),
        )}

        <Handle x={-0.79} palette={palette} />
        <Handle x={0.79} palette={palette} />
        <Clasp palette={palette} />

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
                color={palette.paint}
                roughness={palette.paintRoughness}
                metalness={palette.ornament === 'CLOUD' ? 0.2 : 0}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Usure sur le dessus du couvercle. */}
            <group position={[0, 0.36, 0.24]} rotation={[-0.5, 0, 0]}>
              <Panneau seed={313} z={0.02} palette={palette} />
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
                  color={x === 0 ? palette.wood : palette.woodDark}
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
                  color={palette.wood}
                  roughness={0.8}
                  side={THREE.DoubleSide}
                />
              </mesh>
            ))}

            {/* Bordure basse du couvercle : elle vient couvrir le joint. */}
            <mesh position={[0, -0.02, 0]} castShadow>
              <boxGeometry args={[1.58, 0.13, 1.16]} />
              <meshStandardMaterial color={palette.wood} roughness={0.75} />
            </mesh>

            {[-0.72, -0.36, 0.36, 0.72].map((x) => (
              <Rivet
                color={palette.wood}
                key={`l${x}`}
                position={[x, -0.02, 0.59]}
              />
            ))}

            {/* Le cordage est **dans** le groupe du couvercle : il doit
                basculer avec lui, sinon il resterait suspendu en l'air au
                moment de l'ouverture. */}
            {palette.cord && (
              <Cord color={palette.cord} groupRef={cordRef ?? null} />
            )}
          </group>
        </group>
      </group>
    );
  },
);
