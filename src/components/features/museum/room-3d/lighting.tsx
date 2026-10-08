"use client";

import { Environment, Lightformer } from "@react-three/drei";
import { memo } from "react";

import { LIGHTS } from "./config";

/** Warm afternoon key, cool-neutral fill, a floor bounce and a code-built environment (no HDR download). */
export const Lighting = memo(function Lighting() {
  const { ambient, key, fill, bounce, environmentIntensity } = LIGHTS;
  return (
    <>
      <ambientLight color={ambient.color} intensity={ambient.intensity} />
      <directionalLight
        castShadow
        color={key.color}
        intensity={key.intensity}
        position={key.position}
        shadow-bias={-0.0004}
        shadow-camera-bottom={-14}
        shadow-camera-far={60}
        shadow-camera-left={-14}
        shadow-camera-near={1}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-mapSize={[key.shadowSize, key.shadowSize]}
        shadow-normalBias={0.02}
        shadow-radius={6}
      />
      <directionalLight color={fill.color} intensity={fill.intensity} position={fill.position} />
      <pointLight color={bounce.color} decay={2} distance={9} intensity={bounce.intensity * 6} position={bounce.position} />

      <Environment environmentIntensity={environmentIntensity} frames={1} resolution={256}>
        <color args={["#d9d8d2"]} attach="background" />
        <Lightformer color="#fff4e2" form="rect" intensity={2.2} position={[6, 6, 4]} rotation={[0, Math.PI / 2.4, 0]} scale={[8, 6, 1]} />
        <Lightformer color="#eef3ff" form="rect" intensity={1.1} position={[0, 5, 8]} scale={[10, 5, 1]} />
        <Lightformer color="#fff0dc" form="ring" intensity={0.8} position={[0, 9, 0]} rotation={[Math.PI / 2, 0, 0]} scale={6} />
      </Environment>
    </>
  );
});
