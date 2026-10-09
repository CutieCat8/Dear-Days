"use client";

import { ContactShadows } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { memo, useRef } from "react";
import { Raycaster, type Group, type Intersection, type Material, type Mesh } from "three";

import { useCameraApi } from "./camera-controller";
import { CAMERA, FOOTPRINT, ROOM, type WallSide } from "./config";
import { useMaterials } from "./materials";
import { Bevel } from "./parts";

const { halfX: HX, halfZ: HZ, wallHeight: WH, wallThickness: T, floorThickness: FT, baseboardHeight: BB } = ROOM;
const { sizeX: SPAN_X, sizeZ: SPAN_Z, centreX: CX, centreZ: CZ } = FOOTPRINT;

/** Y of the ground that receives the room's shadow and the outside foliage shadows. */
export const GROUND_Y = -FT - 0.17;

/** Static architecture: thick floor, two thick walls, baseboards and the shadow-receiving ground. */
export const RoomShell = memo(function RoomShell() {
  const m = useMaterials();
  const scene = useThree((state) => state.scene);
  const { api, isAnimating, focusSide, occluderFade } = useCameraApi();
  const leftWall = useRef<Group>(null);
  const rightWall = useRef<Group>(null);
  // While one wall is focused the other (edge-on) wall is hidden, and comes back with the overview.
  useFrame(() => {
    const hide = occluderFade.current < 0.5;
    if (leftWall.current) leftWall.current.visible = !(hide && focusSide.current === "right");
    if (rightWall.current) rightWall.current.visible = !(hide && focusSide.current === "left");
  });

  /**
   * Clicking bare wall focuses it. A click only counts when it is a real click (not the end of an orbit drag),
   * and when the wall is the nearest solid surface under the pointer, so furniture and plants in front do not trigger it.
   */
  const focusOnClick = (side: WallSide) => (event: ThreeEvent<MouseEvent>) => {
    if (event.delta > CAMERA.dragThresholdPx || isAnimating()) return;
    const solid = new Raycaster(event.ray.origin, event.ray.direction).intersectObjects(scene.children, true).find((hit: Intersection) => {
      const mesh = hit.object as Mesh;
      const material = mesh.material as Material | Material[] | undefined;
      if (!mesh.visible || !material || Array.isArray(material)) return false;
      return material.type !== "ShadowMaterial" && material.colorWrite !== false;
    });
    if (solid?.object !== event.object) return;
    event.stopPropagation();
    api.focusWall(side);
  };

  return (
    <group>
      {/* floor slab + plinth */}
      <Bevel args={[SPAN_X, FT, SPAN_Z]} material={m.floorEdge} position={[CX, -FT / 2 - 0.004, CZ]} radius={0.04} />
      <Bevel args={[SPAN_X - 0.28, 0.16, SPAN_Z - 0.28]} material={m.oakDark} position={[CX, -FT - 0.08, CZ]} radius={0.03} />
      <mesh material={m.floorTop} position={[CX, 0, CZ]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[SPAN_X, SPAN_Z]} />
      </mesh>

      <group ref={leftWall}>
      {/* back-left wall (x = -HX, long), inner face looks toward +x */}
      <Bevel args={[T, WH, SPAN_Z]} material={m.wall} onClick={focusOnClick("left")} position={[-HX - T / 2, WH / 2, CZ]} radius={0.015} />
      <Bevel args={[T + 0.02, 0.05, SPAN_Z + 0.02]} material={m.wallCap} position={[-HX - T / 2, WH + 0.02, CZ]} radius={0.02} />
      <Bevel args={[0.05, BB, HZ * 2]} material={m.baseboard} position={[-HX + 0.025, BB / 2, 0]} radius={0.012} />
      <Bevel args={[0.07, 0.03, HZ * 2]} material={m.baseboard} position={[-HX + 0.035, BB + 0.01, 0]} radius={0.012} />
      </group>
      <group ref={rightWall}>
      {/* back-right wall (z = -HZ, short), inner face looks toward +z */}
      <Bevel args={[HX * 2, WH, T]} material={m.wall} onClick={focusOnClick("right")} position={[0, WH / 2, -HZ - T / 2]} radius={0.015} />
      <Bevel args={[HX * 2 + 0.02, 0.05, T + 0.02]} material={m.wallCap} position={[0, WH + 0.02, -HZ - T / 2]} radius={0.02} />
      <Bevel args={[HX * 2 - 0.05, BB, 0.05]} material={m.baseboard} position={[0.025, BB / 2, -HZ + 0.025]} radius={0.012} />
      <Bevel args={[HX * 2 - 0.07, 0.03, 0.07]} material={m.baseboard} position={[0.035, BB + 0.01, -HZ + 0.035]} radius={0.012} />
      </group>

      {/* inner corner seam: a hairline, like the seams between floor planks, where the two walls meet, so the corner reads with depth */}
      <Bevel args={[0.012, WH - BB, 0.012]} cast={false} material={m.cornerLine} position={[-HX + 0.006, BB + (WH - BB) / 2, -HZ + 0.006]} radius={0.002} smoothness={1} />

      <ContactShadows blur={2.4} far={3.2} opacity={0.4} position={[CX, 0.006, CZ]} resolution={1024} scale={[SPAN_X + 0.5, SPAN_Z + 0.5]} />

      {/* Ground: only draws shadows (room + outside foliage), so it has no visible edge on the page background. */}
      <mesh position={[0, GROUND_Y, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[60, 60]} />
        <shadowMaterial color="#35483c" opacity={0.1} />
      </mesh>
    </group>
  );
});
