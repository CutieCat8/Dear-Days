"use client";

import { useCursor, useTexture } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Suspense, useMemo, useRef, useState } from "react";
import { SRGBColorSpace, type Group, type Texture } from "three";

import { resolveMemoryCover } from "../memory-cover";
import { useCameraApi } from "./camera-controller";
import { CAMERA } from "./config";
import { SceneErrorBoundary } from "./error-boundary";
import { useMaterials } from "./materials";
import { Bevel } from "./parts";

import type { DiarySlot, FrameSlot, SlotAssignment } from "./slots";
import { artTexture, diaryCoverTexture, labelTexture } from "./textures";

type SelectionProps = {
  selectedId: string | null;
  onSelect: (id: string) => void;
};

/** Cover-fit a texture into a surface of the given aspect ratio without distorting it. */
function useCoverFit(base: Texture, aspect: number) {
  return useMemo(() => {
    const texture = base.clone();
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 8;
    const image = base.image as { width?: number; height?: number } | undefined;
    const imageAspect = image?.width && image?.height ? image.width / image.height : aspect;
    if (imageAspect > aspect) {
      texture.repeat.set(aspect / imageAspect, 1);
      texture.offset.set((1 - aspect / imageAspect) / 2, 0);
    } else {
      texture.repeat.set(1, imageAspect / aspect);
      texture.offset.set(0, (1 - imageAspect / aspect) / 2);
    }
    texture.needsUpdate = true;
    return texture;
  }, [base, aspect]);
}

function Surface({ texture, size }: { texture: Texture; size: [number, number] }) {
  return (
    <mesh position={[0, 0, 0.033]} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial emissive="#ffffff" emissiveIntensity={0.16} emissiveMap={texture} map={texture} roughness={0.55} />
    </mesh>
  );
}

function PhotoSurface({ url, size }: { url: string; size: [number, number] }) {
  const base = useTexture(url);
  return <Surface size={size} texture={useCoverFit(base, size[0] / size[1])} />;
}

function ArtSurface({ variant, size }: { variant: number; size: [number, number] }) {
  return <Surface size={size} texture={useCoverFit(artTexture(variant), size[0] / size[1])} />;
}

function PaperSurface({ size }: { size: [number, number] }) {
  const m = useMaterials();
  return (
    <mesh material={m.paper} position={[0, 0, 0.033]}>
      <planeGeometry args={size} />
    </mesh>
  );
}

const FRAME_DEPTH = 0.07;

type FrameProps = {
  onImageError?: () => void;
  size: [number, number];
  art: number;
  coverUrl: string | null;
  selected: boolean;
  hovered: boolean;
};

/** Picture frame in local space: faces +z, centred on the origin, back plane at z = 0. */
function FrameBody({ size: [w, h], art, coverUrl, selected, hovered, onImageError }: FrameProps) {
  const m = useMaterials();
  const b = Math.min(0.085, Math.max(0.055, Math.min(w, h) * 0.085));
  const wood = selected || hovered ? m.frameWoodGlow : m.frameWood;
  const innerW = w - b * 2;
  const innerH = h - b * 2;
  const matBorder = Math.min(innerW, innerH) * 0.07;
  const photoSize: [number, number] = [innerW - matBorder * 2, innerH - matBorder * 2];

  return (
    <group>
      <Bevel args={[w, b, FRAME_DEPTH]} material={wood} position={[0, h / 2 - b / 2, FRAME_DEPTH / 2]} radius={0.014} />
      <Bevel args={[w, b, FRAME_DEPTH]} material={wood} position={[0, -h / 2 + b / 2, FRAME_DEPTH / 2]} radius={0.014} />
      <Bevel args={[b, h - b * 2 + 0.01, FRAME_DEPTH]} material={wood} position={[-w / 2 + b / 2, 0, FRAME_DEPTH / 2]} radius={0.014} />
      <Bevel args={[b, h - b * 2 + 0.01, FRAME_DEPTH]} material={wood} position={[w / 2 - b / 2, 0, FRAME_DEPTH / 2]} radius={0.014} />
      {/* inner lip so the opening reads as recessed */}
      <Bevel args={[innerW + 0.012, innerH + 0.012, 0.012]} cast={false} material={m.frameWoodDark} position={[0, 0, 0.012]} radius={0.004} />
      {/* mat board */}
      <Bevel args={[innerW, innerH, 0.012]} cast={false} material={m.paper} position={[0, 0, 0.02]} radius={0.003} />

      {coverUrl ? (
        <SceneErrorBoundary fallback={<ArtSurface size={photoSize} variant={art} />} onError={onImageError}>
          <Suspense fallback={<PaperSurface size={photoSize} />}>
            <PhotoSurface size={photoSize} url={coverUrl} />
          </Suspense>
        </SceneErrorBoundary>
      ) : (
        <ArtSurface size={photoSize} variant={art} />
      )}

      <mesh material={m.glass} position={[0, 0, FRAME_DEPTH - 0.018]} renderOrder={2}>
        <planeGeometry args={[innerW, innerH]} />
      </mesh>
    </group>
  );
}

/** Brass picture light fixture, only on the selected frame (the warm light itself is the scene's single SelectionLight). */
function PictureLight({ height }: { height: number }) {
  const m = useMaterials();
  return (
    <group position={[0, height / 2 + 0.13, 0.06]}>
      <mesh castShadow material={m.brass} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, 0.34, 14]} />
      </mesh>
      <mesh castShadow material={m.brass} position={[0, 0, 0.1]}>
        <boxGeometry args={[0.012, 0.012, 0.2]} />
      </mesh>
    </group>
  );
}

function useInteractive(memoryId: string | null, onSelect: (id: string) => void) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && !!memoryId);
  if (!memoryId) return { hovered: false, handlers: {} };
  return {
    hovered,
    handlers: {
      onClick: (event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        // A press that travelled is an orbit drag, not a selection.
        if (event.delta > CAMERA.dragThresholdPx) return;
        onSelect(memoryId);
      },
      onPointerOver: (event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        setHovered(true);
      },
      onPointerOut: () => setHovered(false),
    },
  };
}

type FrameObjectProps = SelectionProps & { assignment: SlotAssignment<FrameSlot>; onImageError?: () => void };

export function FrameObject({ assignment, selectedId, onSelect, onImageError }: FrameObjectProps) {
  const m = useMaterials();
  const { slot, memory } = assignment;
  const { hovered, handlers } = useInteractive(memory?.id ?? null, onSelect);
  const selected = !!memory && memory.id === selectedId;
  const [w, h] = slot.size;
  const standing = slot.mount === "shelf" || slot.mount === "desk";
  const { focusSide, occluderFade } = useCameraApi();
  const group = useRef<Group>(null);
  // Frames on the wall that is edge-on while the other wall is focused are hidden (they would only be slivers).
  useFrame(() => {
    if (!group.current) return;
    const side = focusSide.current;
    const hide = occluderFade.current < 0.5 && ((side === "left" && slot.mount === "wall-right") || (side === "right" && slot.mount === "wall-left"));
    group.current.visible = !hide;
  });

  const placement = useMemo(() => {
    const [x, y, z] = slot.position;
    if (slot.mount === "wall-left") return { position: [x, y, z] as [number, number, number], rotation: [0, Math.PI / 2, 0] as [number, number, number] };
    if (slot.mount === "wall-right") return { position: [x, y, z] as [number, number, number], rotation: [0, 0, 0] as [number, number, number] };
    if (slot.mount === "shelf") return { position: [x, y + h / 2 - 0.02, z] as [number, number, number], rotation: [-0.14, Math.PI / 2, 0] as [number, number, number] };
    return { position: [x, y + h / 2 - 0.02, z] as [number, number, number], rotation: [-0.14, 0.45, 0] as [number, number, number] };
  }, [slot, h]);

  return (
    <group position={placement.position} ref={group} rotation={placement.rotation} scale={selected ? 1.025 : 1} {...handlers}>
      <FrameBody art={slot.art} coverUrl={memory ? (resolveMemoryCover(memory)?.url ?? null) : null} hovered={hovered} onImageError={onImageError} selected={selected} size={slot.size} />
      {standing && (
        <Bevel args={[w * 0.28, h * 0.82, 0.03]} material={m.frameWoodDark} position={[0, -h * 0.06, -0.035]} radius={0.008} rotation={[0.38, 0, 0]} />
      )}
      {selected && !standing && <PictureLight height={h} />}
    </group>
  );
}

type DiaryObjectProps = SelectionProps & { assignment: SlotAssignment<DiarySlot> };

export function DiaryObject({ assignment, selectedId, onSelect }: DiaryObjectProps) {
  const m = useMaterials();
  const { slot, memory } = assignment;
  const { hovered, handlers } = useInteractive(memory?.id ?? null, onSelect);
  const dark = slot.color === "#5d7a5e";
  const cover = useMemo(() => diaryCoverTexture(slot.color, dark), [slot.color, dark]);
  const title = memory?.title;
  const date = memory?.memory_date;
  const label = useMemo(() => (title && date ? labelTexture(title, formatMonth(date)) : null), [title, date]);
  if (!memory) return null;

  const selected = memory.id === selectedId;
  const [bw, bh, bd] = [0.54, 0.7, 0.085];

  return (
    <group position={slot.position} rotation={[0, slot.rotationY, 0]} scale={selected || hovered ? 1.035 : 1} {...handlers}>
      <group position={[0, bh / 2 + 0.004, 0]} rotation={[-slot.lean, 0, 0]}>
        <Bevel args={[bw, bh, 0.012]} material={dark ? m.fabricSageDark : m.fabricCream} position={[0, 0, bd / 2 - 0.006]} radius={0.006} />
        <Bevel args={[bw, bh, 0.012]} material={dark ? m.fabricSageDark : m.fabricCream} position={[0, 0, -bd / 2 + 0.006]} radius={0.006} />
        <Bevel args={[bw - 0.03, bh - 0.03, bd - 0.02]} material={m.pageEdge} position={[0.012, 0, 0]} radius={0.004} />
        <Bevel args={[0.034, bh, bd + 0.004]} material={dark ? m.fabricSageDark : m.fabricCream} position={[-bw / 2 + 0.017, 0, 0]} radius={0.012} />
        <mesh position={[0.006, 0, bd / 2 + 0.0004]}>
          <planeGeometry args={[bw - 0.04, bh - 0.02]} />
          <meshStandardMaterial map={cover} roughness={0.9} />
        </mesh>
        <mesh material={m.brass} position={[0.16, -bh / 2 + 0.002, bd / 2 - 0.005]}>
          <boxGeometry args={[0.012, 0.18, 0.004]} />
        </mesh>
      </group>
      {label && (
        <mesh castShadow position={[0, 0.115, 0.22]} rotation={[-0.3, 0, 0]}>
          <boxGeometry args={[0.42, 0.21, 0.01]} />
          <meshStandardMaterial map={label} roughness={0.9} />
        </mesh>
      )}
    </group>
  );
}

function formatMonth(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}
