"use client";

import { Canvas } from "@react-three/fiber";
import { memo, useEffect, useMemo, type MutableRefObject } from "react";
import { NeutralToneMapping } from "three";

import type { Memory } from "@/lib/contracts/types";

import { CameraController, type CameraApi, type CameraState, type SceneLayout } from "./camera-controller";
import { CAMERA, cameraDirection, ROOM_CENTER } from "./config";
import { DiaryObject, FrameObject } from "./display-items";
import { Furniture } from "./furniture";
import { Lighting } from "./lighting";
import { createMaterials, MaterialsContext } from "./materials";
import { OutsideFoliage } from "./plants";
import { RoomShell } from "./room-shell";
import { assignMemories, type FramePins } from "./slots";

export type RoomCanvasProps = {
  memories: Memory[];
  /** Photos the members pinned to specific frames; other frames fill automatically. */
  pins: FramePins;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Filled with the camera controls (focus wall, back, reset, zoom) once the canvas is ready. */
  apiRef: MutableRefObject<CameraApi | null>;
  onStateChange: (state: CameraState) => void;
  /** Stage + aside rectangles (canvas px) so framing follows the real page layout. */
  getLayout: () => SceneLayout;
  /** Fired once the scene (materials + geometry) has mounted. */
  onReady?: () => void;
  /** Fired when a memory photo could not be loaded (the frame then shows a placeholder painting). */
  onImageError?: () => void;
};

function Ready({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);
  return null;
}

/**
 * One permanent warm light that follows the selection. It is always in the scene (intensity 0 when nothing is
 * selected), so selecting never changes the light count and never forces every material to recompile.
 */
function SelectionLight({ frames, diaries, selectedId }: { frames: ReturnType<typeof assignMemories>["frames"]; diaries: ReturnType<typeof assignMemories>["diaries"]; selectedId: string | null }) {
  const position = useMemo<[number, number, number]>(() => {
    const frame = frames.find((item) => item.memory.id === selectedId);
    if (frame) {
      const [x, y, z] = frame.slot.position;
      if (frame.slot.mount === "wall-left") return [x + 0.4, y + frame.slot.size[1] / 2 + 0.1, z];
      if (frame.slot.mount === "wall-right") return [x, y + frame.slot.size[1] / 2 + 0.1, z + 0.4];
      return [x + 0.3, y + 0.6, z + 0.3];
    }
    const diary = diaries.find((item) => item.memory.id === selectedId);
    if (diary) return [diary.slot.position[0] + 0.35, diary.slot.position[1] + 0.8, diary.slot.position[2]];
    return [0, 5, 0];
  }, [frames, diaries, selectedId]);
  return <pointLight color="#ffd9a0" decay={2} distance={2} intensity={selectedId ? 1.5 : 0} position={position} />;
}

const Scene = memo(function Scene({ memories, pins, selectedId, onSelect, onImageError }: Omit<RoomCanvasProps, "apiRef" | "onStateChange" | "getLayout" | "onReady">) {
  const materials = useMemo(() => createMaterials(), []);
  const { frames, diaries } = useMemo(() => assignMemories(memories, pins), [memories, pins]);

  return (
    <MaterialsContext.Provider value={materials}>
      <Lighting />
      <RoomShell />
      <Furniture />
      <OutsideFoliage />
      <SelectionLight diaries={diaries} frames={frames} selectedId={selectedId} />
      {frames.map((assignment) => (
        <FrameObject assignment={assignment} key={assignment.slot.id} onImageError={onImageError} onSelect={onSelect} selectedId={selectedId} />
      ))}
      {diaries.map((assignment) => (
        <DiaryObject assignment={assignment} key={assignment.slot.id} onSelect={onSelect} selectedId={selectedId} />
      ))}
    </MaterialsContext.Provider>
  );
});

// Module-level so the Canvas never sees a new camera config (R3F would rebuild the camera on every render).
const INITIAL_CAMERA = {
  near: 0.1,
  far: 120,
  zoom: 60,
  position: [
    ROOM_CENTER[0] + cameraDirection()[0] * CAMERA.distance,
    ROOM_CENTER[1] + cameraDirection()[1] * CAMERA.distance,
    ROOM_CENTER[2] + cameraDirection()[2] * CAMERA.distance,
  ] as [number, number, number],
};

export default function RoomCanvas({ memories, pins, selectedId, onSelect, apiRef, onStateChange, getLayout, onReady, onImageError }: RoomCanvasProps) {
  return (
    <Canvas
      camera={INITIAL_CAMERA}
      dpr={[1, 2]}
      frameloop="demand"
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = NeutralToneMapping;
        gl.toneMappingExposure = 1;
      }}
      orthographic
      shadows="percentage"
    >
      <CameraController apiRef={apiRef} getLayout={getLayout} onStateChange={onStateChange}>
        <Scene memories={memories} pins={pins} onImageError={onImageError} onSelect={onSelect} selectedId={selectedId} />
        <Ready onReady={onReady} />
      </CameraController>
    </Canvas>
  );
}
