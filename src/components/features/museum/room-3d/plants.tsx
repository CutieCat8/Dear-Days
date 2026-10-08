"use client";

import { useFrame } from "@react-three/fiber";
import { memo, useMemo, useRef } from "react";
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Quaternion, Vector3, type Group, type Material } from "three";

import { useCameraApi } from "./camera-controller";
import { LIGHTS } from "./config";
import { useMaterials } from "./materials";
import { Lathe } from "./parts";

function mulberry(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Leaf blade: tapered, with a centre fold and a slight forward curl. Base at origin, tip along +Y. */
function buildLeaf() {
  const cols = 4;
  const rows = 8;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let r = 0; r <= rows; r++) {
    const v = r / rows;
    const width = Math.sin(Math.PI * Math.pow(v, 0.75)) * 0.5;
    for (let c = 0; c <= cols; c++) {
      const u = c / cols - 0.5;
      const fold = Math.abs(u) * 0.28 * width;
      positions.push(u * 2 * width, v, fold - v * v * 0.2);
      uvs.push(c / cols, v);
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const a = r * (cols + 1) + c;
      const b = a + 1;
      const d = a + cols + 1;
      indices.push(a, d, b, b, d, d + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const POT_PROFILE: [number, number][] = [
  [0, 0],
  [0.8, 0],
  [1, 0.12],
  [1.08, 0.7],
  [1.12, 1],
  [1.04, 1],
  [1.0, 0.92],
  [0, 0.92],
];

const DEFAULT_STEM: [number, number] = [0.4, 1.1];
const DEFAULT_LEAF: [number, number] = [0.5, 0.78];

type PlantProps = {
  position: [number, number, number];
  seed: number;
  /** Pot radius in metres. */
  potRadius?: number;
  potHeight?: number;
  leafCount?: number;
  /** Stem length range. */
  stem?: [number, number];
  /** Leaf blade length range. */
  leaf?: [number, number];
  pot?: "ceramic" | "terracotta" | "stone";
  /** Fades out (and is hidden) while a wall is focused, so it never covers the frames. */
  occluder?: boolean;
};

export function Plant({ position, seed, potRadius = 0.28, potHeight = 0.5, leafCount = 12, stem = DEFAULT_STEM, leaf = DEFAULT_LEAF, pot = "ceramic", occluder = false }: PlantProps) {
  const shared = useMaterials();
  const { occluderFade } = useCameraApi();
  const group = useRef<Group>(null);
  // Occluding plants get their own transparent copies so fading never touches other objects.
  const m = useMemo(() => {
    if (!occluder) return shared;
    const own = (material: Material) => {
      const copy = material.clone();
      copy.transparent = true;
      return copy;
    };
    return { ...shared, leaves: shared.leaves.map(own), ceramic: own(shared.ceramic), stoneWhite: own(shared.stoneWhite), terracotta: own(shared.terracotta), soil: own(shared.soil) } as typeof shared;
  }, [shared, occluder]);
  useFrame(() => {
    if (!occluder || !group.current) return;
    const opacity = occluderFade.current;
    group.current.visible = opacity > 0.02;
    for (const material of [...m.leaves, m.ceramic, m.stoneWhite, m.terracotta, m.soil]) material.opacity = opacity;
  });
  const geometry = useMemo(() => buildLeaf(), []);
  const leaves = useMemo(() => {
    const rand = mulberry(seed);
    return Array.from({ length: leafCount }, (_, i) => {
      const angle = (i / leafCount) * Math.PI * 2 + rand() * 0.7;
      const stemLen = stem[0] + rand() * (stem[1] - stem[0]);
      return {
        angle,
        stemLen,
        stemTilt: 0.12 + rand() * 0.5,
        leafTilt: 0.9 + rand() * 0.7,
        size: leaf[0] + rand() * (leaf[1] - leaf[0]),
        spin: (rand() - 0.5) * 0.6,
        side: rand() > 0.35,
        sideAt: 0.45 + rand() * 0.25,
        sideAngle: (rand() > 0.5 ? 1 : -1) * (0.9 + rand() * 0.6),
        material: m.leaves[Math.floor(rand() * m.leaves.length)],
      };
    });
  }, [seed, leafCount, stem, leaf, m.leaves]);

  const potMaterial = pot === "terracotta" ? m.terracotta : pot === "stone" ? m.stoneWhite : m.ceramic;

  return (
    <group position={position} ref={group}>
      <Lathe material={potMaterial} profile={POT_PROFILE} scale={[potRadius, potHeight, potRadius]} />
      <mesh material={m.soil} position={[0, potHeight * 0.9, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[potRadius * 0.97, 24]} />
      </mesh>
      <group position={[0, potHeight * 0.9, 0]}>
        {leaves.map((l, i) => (
          <group key={i} rotation={[0, l.angle, 0]}>
            <group rotation={[l.stemTilt, 0, 0]}>
              <mesh castShadow material={m.leaves[0]} position={[0, l.stemLen / 2, 0]}>
                <cylinderGeometry args={[0.008, 0.012, l.stemLen, 5]} />
              </mesh>
              {l.side && (
                <group position={[0, l.stemLen * l.sideAt, 0]} rotation={[0.5, l.sideAngle, 0.3]}>
                  <mesh castShadow geometry={geometry} material={l.material} receiveShadow scale={[l.size * 0.5, l.size * 0.6, l.size * 0.6]} />
                </group>
              )}
              <group position={[0, l.stemLen, 0]} rotation={[l.leafTilt - l.stemTilt, l.spin, 0]}>
                <mesh castShadow geometry={geometry} material={l.material} receiveShadow scale={[l.size * 0.9, l.size, l.size]} />
              </group>
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}

const OUTSIDE_DISTANCE = 11;

/**
 * Foliage outside the frame that only casts shadows (colour + depth writes off, so it is never visible).
 * It hangs between the key light and the room, so dappled leaf shadows land on the walls, floor and the outside ground.
 */
export const OutsideFoliage = memo(function OutsideFoliage() {
  const geometry = useMemo(() => buildLeaf(), []);
  const { quaternion, leaves } = useMemo(() => {
    const dir = new Vector3(...LIGHTS.key.position).normalize();
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), dir);
    const e1 = new Vector3(0, 1, 0).cross(dir).normalize();
    const e2 = dir.clone().cross(e1).normalize();
    const rand = mulberry(77);
    // Each cluster is placed so its shadow lands on a chosen world-space target along the key light's direction
    // (target + dir * distance), so every leaf shadow is a projection of the same sun as the room's own shadow.
    const targets: [number, number, number, number][] = [
      [-2.5, 2.6, -1.4, 1.1], // back-left wall, upper
      [-2.5, 2.3, 1.2, 0.9], // back-left wall, near end
      [0.2, 2.5, -4, 1.0], // back-right wall
      [0.6, 0, 0.6, 1.0], // floor, centre
      [1.4, 0, 3.0, 0.9], // floor, front
      [-4.8, -0.5, 0.5, 1.2], // outside ground, left
      [-1.5, -0.5, -5.8, 1.2], // outside ground, behind
    ];
    const items = targets.flatMap(([tx, ty, tz, r]) => {
      const base = new Vector3(tx, ty, tz).add(dir.clone().multiplyScalar(OUTSIDE_DISTANCE));
      return Array.from({ length: 26 }, () => {
        const angle = rand() * Math.PI * 2;
        const dist = Math.sqrt(rand()) * r;
        const p = base.clone().add(e1.clone().multiplyScalar(Math.cos(angle) * dist)).add(e2.clone().multiplyScalar(Math.sin(angle) * dist));
        return { position: p.toArray() as [number, number, number], spin: rand() * Math.PI * 2, size: 0.3 + rand() * 0.32 };
      });
    });
    return { quaternion: q, leaves: items };
  }, []);

  return (
    <group>
      {leaves.map((leaf, i) => (
        <group key={i} position={leaf.position} quaternion={quaternion}>
          <group rotation={[0, 0, leaf.spin]}>
            <mesh castShadow geometry={geometry} rotation={[0.35, 0, 0]} scale={[leaf.size * 0.9, leaf.size, leaf.size]}>
              <meshBasicMaterial colorWrite={false} depthWrite={false} side={DoubleSide} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
});
