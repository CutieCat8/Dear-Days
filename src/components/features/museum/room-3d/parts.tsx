"use client";

import { RoundedBox } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { useMemo, type ComponentProps } from "react";
import { Vector2, type Material } from "three";

type Vec3 = [number, number, number];

type BevelProps = {
  args: Vec3;
  material: Material;
  position?: Vec3;
  rotation?: Vec3;
  radius?: number;
  smoothness?: number;
  cast?: boolean;
  receive?: boolean;
  onClick?: (event: ThreeEvent<MouseEvent>) => void;
};

/** Box with softly bevelled edges. Every furniture edge goes through this so highlights catch the corners. */
export function Bevel({ args, material, position, rotation, radius = 0.018, smoothness = 3, cast = true, receive = true, onClick }: BevelProps) {
  const safe = Math.min(radius, Math.min(...args) / 2 - 0.0005);
  return (
    <RoundedBox args={args} castShadow={cast} material={material} onClick={onClick} position={position} radius={safe} receiveShadow={receive} rotation={rotation} smoothness={smoothness} />
  );
}

type LatheProps = Omit<ComponentProps<"mesh">, "material"> & {
  /** Profile as [radius, height] pairs, bottom to top. */
  profile: [number, number][];
  material: Material;
  segments?: number;
};

export function Lathe({ profile, material, segments = 28, ...rest }: LatheProps) {
  const points = useMemo(() => profile.map(([x, y]) => new Vector2(x, y)), [profile]);
  return (
    <mesh castShadow material={material} receiveShadow {...rest}>
      <latheGeometry args={[points, segments]} />
    </mesh>
  );
}
