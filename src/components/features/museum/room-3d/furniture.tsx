"use client";

import { memo } from "react";

import { LIGHTS } from "./config";
import { useMaterials, type RoomMaterials } from "./materials";
import { Bevel, Lathe } from "./parts";
import { Plant } from "./plants";

type Vec3 = [number, number, number];

const VASE_PROFILE: [number, number][] = [
  [0, 0],
  [0.55, 0],
  [0.9, 0.18],
  [1, 0.4],
  [0.8, 0.75],
  [0.38, 0.92],
  [0.42, 1],
  [0.34, 1],
  [0.3, 0.9],
  [0, 0.9],
];

const MUG_PROFILE: [number, number][] = [
  [0, 0],
  [0.8, 0],
  [1, 0.1],
  [1, 1],
  [0.9, 1],
  [0.9, 0.12],
  [0, 0.12],
];

const LAMP_BASE_PROFILE: [number, number][] = [
  [0, 0],
  [0.7, 0],
  [1, 0.2],
  [0.95, 0.55],
  [0.5, 0.85],
  [0.2, 0.97],
  [0.15, 1],
  [0, 1],
];

/** All static furniture + props. Positions are in world space (floor top y = 0). */
export const Furniture = memo(function Furniture() {
  const m = useMaterials();
  return (
    <group>
      <Rug m={m} />
      <Sideboard m={m} />
      <TableLamp m={m} position={[-2.17, 0.85, 0.5]} />
      <CoffeeTable m={m} position={[0.2, 0, 1.0]} />
      <Pouf color={m.fabricSageDark} position={[-0.7, 0.19, 2.35]} rotationY={0.2} size={[1.0, 0.38, 1.0]} />
      <Pouf color={m.fabricCream} position={[0.75, 0.18, 2.95]} rotationY={0.5} size={[0.9, 0.36, 0.9]} />
      <Armchair m={m} position={[1.85, 0, 1.6]} />
      <Desk m={m} />
      <SideTable m={m} position={[2.0, 0, 3.15]} />

      <Plant leafCount={13} pot="ceramic" position={[-1.55, 0, 3.25]} potHeight={0.55} potRadius={0.3} seed={4} />
      <Plant leaf={[0.55, 0.8]} leafCount={12} occluder pot="stone" position={[-1.3, 0, -3.4]} potHeight={0.6} potRadius={0.3} seed={9} stem={[0.6, 1.2]} />
      <Plant leaf={[0.2, 0.36]} leafCount={10} pot="terracotta" position={[-2.0, 0, 2.45]} potHeight={0.4} potRadius={0.17} seed={29} stem={[0.25, 0.65]} />
      <Plant leaf={[0.18, 0.3]} leafCount={8} pot="ceramic" position={[2.1, 0.8, -3.6]} potHeight={0.2} potRadius={0.1} seed={13} stem={[0.12, 0.3]} />
      <Plant leaf={[0.22, 0.34]} leafCount={9} pot="terracotta" position={[2.0, 0.46, 3.15]} potHeight={0.22} potRadius={0.14} seed={17} stem={[0.15, 0.35]} />
      <Plant leaf={[0.14, 0.24]} leafCount={7} pot="ceramic" position={[-2.17, 0.85, 1.45]} potHeight={0.16} potRadius={0.08} seed={21} stem={[0.1, 0.24]} />
    </group>
  );
});

type PartProps = { m: RoomMaterials };

function Rug({ m }: PartProps) {
  return (
    <group position={[0.2, 0, 1.3]}>
      <Bevel args={[2.9, 0.026, 3.7]} cast={false} material={m.fabricCream} position={[0, 0.013, 0]} radius={0.01} />
      <mesh material={m.rug} position={[0, 0.0275, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.88, 3.68]} />
      </mesh>
    </group>
  );
}

function Sideboard({ m }: PartProps) {
  const doors = [-3.0, -1.6, -0.2, 1.2];
  return (
    <group>
      <Bevel args={[0.52, 0.12, 5.5]} material={m.walnut} position={[-2.18, 0.06, -0.85]} radius={0.015} />
      <Bevel args={[0.58, 0.68, 5.66]} material={m.oakMid} position={[-2.17, 0.46, -0.85]} radius={0.02} />
      <Bevel args={[0.64, 0.05, 5.74]} material={m.oakLight} position={[-2.15, 0.825, -0.85]} radius={0.02} />
      {doors.map((z) => (
        <group key={z}>
          <Bevel args={[0.025, 0.56, 1.3]} material={m.oakLight} position={[-1.875, 0.46, z]} radius={0.01} />
          <mesh castShadow material={m.brass} position={[-1.85, 0.5, z + 0.53]}>
            <sphereGeometry args={[0.022, 12, 8]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function TableLamp({ m, position }: PartProps & { position: Vec3 }) {
  return (
    <group position={position}>
      <Lathe material={m.ceramicSage} profile={LAMP_BASE_PROFILE} scale={[0.1, 0.34, 0.1]} />
      <mesh castShadow material={m.brass} position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.1, 8]} />
      </mesh>
      <mesh material={m.lampShade} position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.11, 0.19, 0.27, 28, 1, true]} />
      </mesh>
      <pointLight color={LIGHTS.lamp.color} decay={2} distance={LIGHTS.lamp.distance} intensity={LIGHTS.lamp.intensity} position={[0, 0.55, 0]} />
    </group>
  );
}

function CoffeeTable({ m, position }: PartProps & { position: Vec3 }) {
  const legs: [number, number][] = [
    [0.38, 0.38],
    [-0.38, 0.38],
    [0.38, -0.38],
    [-0.38, -0.38],
  ];
  return (
    <group position={position}>
      <mesh castShadow material={m.oakLight} position={[0, 0.5, 0]} receiveShadow>
        <cylinderGeometry args={[0.72, 0.72, 0.07, 48]} />
      </mesh>
      <mesh castShadow material={m.oakMid} position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.72, 0.035, 10, 56]} />
      </mesh>
      <mesh castShadow material={m.oakMid} position={[0, 0.2, 0]} receiveShadow>
        <cylinderGeometry args={[0.52, 0.52, 0.035, 40]} />
      </mesh>
      {legs.map(([x, z]) => (
        <mesh castShadow key={`${x}${z}`} material={m.oakDark} position={[x, 0.24, z]} rotation={[z > 0 ? 0.1 : -0.1, 0, x > 0 ? -0.1 : 0.1]}>
          <cylinderGeometry args={[0.028, 0.022, 0.5, 12]} />
        </mesh>
      ))}

      {/* books + mug */}
      <Bevel args={[0.36, 0.045, 0.26]} material={m.fabricSageDark} position={[-0.2, 0.575, 0.12]} radius={0.01} rotation={[0, 0.2, 0]} />
      <Bevel args={[0.32, 0.04, 0.24]} material={m.fabricCream} position={[-0.2, 0.618, 0.12]} radius={0.01} rotation={[0, -0.1, 0]} />
      <Bevel args={[0.3, 0.035, 0.22]} material={m.oakDark} position={[-0.2, 0.656, 0.12]} radius={0.01} rotation={[0, 0.25, 0]} />
      <group position={[-0.2, 0.675, 0.12]}>
        <Lathe material={m.ceramic} profile={MUG_PROFILE} scale={[0.065, 0.1, 0.065]} />
        <mesh castShadow material={m.ceramic} position={[0.07, 0.055, 0]}>
          <torusGeometry args={[0.032, 0.008, 8, 16]} />
        </mesh>
      </group>
      <Bevel args={[0.15, 0.025, 0.15]} material={m.paper} position={[0.28, 0.552, -0.2]} radius={0.008} rotation={[0, 0.4, 0]} />
      <Lathe material={m.ceramicSage} profile={VASE_PROFILE} position={[0.25, 0.535, -0.22]} scale={[0.07, 0.15, 0.07]} />
    </group>
  );
}

function Pouf({ color, position, size, rotationY = 0 }: { color: RoomMaterials["fabricSage"]; position: Vec3; size: Vec3; rotationY?: number }) {
  return <Bevel args={size} material={color} position={position} radius={0.17} rotation={[0, rotationY, 0]} smoothness={6} />;
}

function Armchair({ m, position }: PartProps & { position: Vec3 }) {
  const legPos: [number, number][] = [
    [0.46, 0.4],
    [-0.46, 0.4],
    [0.46, -0.4],
    [-0.46, -0.4],
  ];
  return (
    <group position={position} rotation={[0, -Math.PI / 2, 0]}>
      {legPos.map(([x, z]) => (
        <Bevel args={[0.06, 0.32, 0.06]} key={`${x}${z}`} material={m.oakMid} position={[x, 0.16, z]} radius={0.012} />
      ))}
      <Bevel args={[1.0, 0.08, 0.9]} material={m.oakMid} position={[0, 0.34, 0]} radius={0.02} />
      {/* arms */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <Bevel args={[0.07, 0.3, 0.07]} material={m.oakMid} position={[side * 0.5, 0.55, 0.38]} radius={0.015} />
          <Bevel args={[0.09, 0.05, 0.9]} material={m.oakLight} position={[side * 0.5, 0.71, 0.0]} radius={0.02} />
          <Bevel args={[0.04, 0.12, 0.8]} material={m.oakMid} position={[side * 0.5, 0.56, -0.02]} radius={0.01} />
        </group>
      ))}
      {/* back frame */}
      {[-1, 1].map((side) => (
        <Bevel args={[0.06, 0.95, 0.06]} key={side} material={m.oakMid} position={[side * 0.5, 0.52, -0.44]} radius={0.015} rotation={[-0.22, 0, 0]} />
      ))}
      <Bevel args={[1.0, 0.07, 0.06]} material={m.oakLight} position={[0, 0.97, -0.56]} radius={0.018} rotation={[-0.22, 0, 0]} />
      {/* cushions */}
      <Bevel args={[0.88, 0.15, 0.8]} material={m.fabricSage} position={[0, 0.48, 0.02]} radius={0.06} smoothness={5} />
      <Bevel args={[0.88, 0.52, 0.15]} material={m.fabricSage} position={[0, 0.82, -0.42]} radius={0.06} rotation={[-0.22, 0, 0]} smoothness={5} />
      <Bevel args={[0.34, 0.3, 0.1]} material={m.fabricCream} position={[-0.2, 0.7, -0.22]} radius={0.04} rotation={[-0.35, 0.3, 0.1]} smoothness={5} />
      {/* plaid throw over the right arm */}
      <Bevel args={[0.36, 0.03, 0.78]} material={m.plaid} position={[0.5, 0.75, 0.02]} radius={0.012} rotation={[0, 0, -0.04]} />
      <Bevel args={[0.03, 0.5, 0.74]} material={m.plaid} position={[0.68, 0.51, 0.04]} radius={0.012} rotation={[0, 0, 0.05]} />
    </group>
  );
}

function Desk({ m }: PartProps) {
  return (
    <group>
      <Bevel args={[1.95, 0.05, 0.7]} material={m.oakLight} position={[1.42, 0.775, -3.6]} radius={0.02} />
      {[-3.28, -3.9].map((z) => (
        <Bevel args={[0.06, 0.75, 0.06]} key={z} material={m.oakMid} position={[0.52, 0.375, z]} radius={0.012} />
      ))}
      <Bevel args={[0.04, 0.12, 0.62]} material={m.oakMid} position={[0.52, 0.69, -3.6]} radius={0.01} />
      <Bevel args={[0.6, 0.72, 0.62]} material={m.oakMid} position={[2.05, 0.38, -3.62]} radius={0.02} />
      {[0.6, 0.4, 0.2].map((y) => (
        <group key={y}>
          <Bevel args={[0.52, 0.17, 0.02]} material={m.oakLight} position={[2.05, y + 0.04, -3.3]} radius={0.01} />
          <mesh castShadow material={m.brass} position={[2.05, y + 0.04, -3.285]}>
            <sphereGeometry args={[0.02, 12, 8]} />
          </mesh>
        </group>
      ))}

      <group position={[1.5, 0.8, -3.55]} rotation={[0, 0.25, 0]}>
        <Bevel args={[0.2, 0.11, 0.09]} material={m.cameraBody} position={[0, 0.055, 0]} radius={0.015} />
        <Bevel args={[0.2, 0.035, 0.092]} material={m.fabricCream} position={[0, 0.075, 0]} radius={0.01} />
        <mesh castShadow material={m.cameraLens} position={[0.02, 0.06, 0.07]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.045, 0.06, 20]} />
        </mesh>
      </group>
      <Bevel args={[0.3, 0.04, 0.22]} material={m.fabricSageDark} position={[1.1, 0.82, -3.7]} radius={0.01} rotation={[0, 0.15, 0]} />
      <Bevel args={[0.27, 0.035, 0.2]} material={m.fabricCream} position={[1.1, 0.857, -3.7]} radius={0.01} rotation={[0, -0.1, 0]} />
    </group>
  );
}

function SideTable({ m, position }: PartProps & { position: Vec3 }) {
  return (
    <group position={position}>
      <mesh castShadow material={m.oakLight} position={[0, 0.44, 0]} receiveShadow>
        <cylinderGeometry args={[0.24, 0.24, 0.04, 32]} />
      </mesh>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + 0.5;
        return (
          <mesh castShadow key={i} material={m.oakMid} position={[Math.cos(a) * 0.15, 0.22, Math.sin(a) * 0.15]} rotation={[Math.sin(a) * 0.08, 0, -Math.cos(a) * 0.08]}>
            <cylinderGeometry args={[0.022, 0.018, 0.44, 10]} />
          </mesh>
        );
      })}
    </group>
  );
}
