"use client";

import { Html, useCursor } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import { memo, useMemo, useState } from "react";

import { BOOK_INFO, type BookKind } from "@/lib/books/books";

import { CAMERA } from "./config";
import { useMaterials, type RoomMaterials } from "./materials";
import { Bevel } from "./parts";
import { DIARY_SLOTS } from "./slots";
import { diaryCoverTexture, labelTexture } from "./textures";

type BookSpec = { kind: BookKind; slot: number; color: string; dark: boolean; body: (m: RoomMaterials) => RoomMaterials["fabricCream"] };

/** The three books standing on the sideboard, left to right as seen from the room: they take the places of the old diaries. */
const BOOKS: BookSpec[] = [
  { kind: "monthly", slot: 2, color: "#5d7a5e", dark: true, body: (m) => m.fabricSageDark },
  { kind: "yearbook", slot: 1, color: "#9a6a43", dark: true, body: (m) => m.oakDark },
  { kind: "highlights", slot: 0, color: "#e6dcc3", dark: false, body: (m) => m.fabricCream },
];

function ShelfBook({ spec, onOpen }: { spec: BookSpec; onOpen: (kind: BookKind) => void }) {
  const m = useMaterials();
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const info = BOOK_INFO[spec.kind];
  const slot = DIARY_SLOTS[spec.slot];
  const cover = useMemo(() => diaryCoverTexture(spec.color, spec.dark), [spec.color, spec.dark]);
  const label = useMemo(() => labelTexture(info.title, "open book"), [info.title]);
  const body = spec.body(m);
  const [bw, bh, bd] = [0.54, 0.7, 0.085];

  return (
    <group
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation();
        // A press that travelled is an orbit drag, not a click.
        if (event.delta > CAMERA.dragThresholdPx) return;
        onOpen(spec.kind);
      }}
      onPointerOut={() => setHovered(false)}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation();
        setHovered(true);
      }}
      position={slot.position}
      rotation={[0, slot.rotationY, 0]}
      scale={hovered ? 1.05 : 1}
    >
      <group position={[0, bh / 2 + 0.004, 0]} rotation={[-slot.lean, 0, 0]}>
        <Bevel args={[bw, bh, 0.012]} material={body} position={[0, 0, bd / 2 - 0.006]} radius={0.006} />
        <Bevel args={[bw, bh, 0.012]} material={body} position={[0, 0, -bd / 2 + 0.006]} radius={0.006} />
        <Bevel args={[bw - 0.03, bh - 0.03, bd - 0.02]} material={m.pageEdge} position={[0.012, 0, 0]} radius={0.004} />
        <Bevel args={[0.034, bh, bd + 0.004]} material={body} position={[-bw / 2 + 0.017, 0, 0]} radius={0.012} />
        <mesh position={[0.006, 0, bd / 2 + 0.0004]}>
          <planeGeometry args={[bw - 0.04, bh - 0.02]} />
          <meshStandardMaterial emissive="#ffffff" emissiveIntensity={hovered ? 0.25 : 0} emissiveMap={cover} map={cover} roughness={0.9} />
        </mesh>
        <mesh material={m.brass} position={[0.16, -bh / 2 + 0.002, bd / 2 - 0.005]}>
          <boxGeometry args={[0.012, 0.18, 0.004]} />
        </mesh>
      </group>
      <mesh castShadow position={[0, 0.115, 0.22]} rotation={[-0.3, 0, 0]}>
        <boxGeometry args={[0.42, 0.21, 0.01]} />
        <meshStandardMaterial map={label} roughness={0.9} />
      </mesh>
      {hovered && (
        <Html center position={[0, bh + 0.2, 0]} style={{ pointerEvents: "none" }} zIndexRange={[20, 0]}>
          <span style={{ display: "block", padding: "4px 10px", borderRadius: 999, background: "rgba(37,48,43,0.92)", color: "#fffaf0", font: "500 12px system-ui, sans-serif", whiteSpace: "nowrap" }}>
            {info.title} · {info.tagline}
          </span>
        </Html>
      )}
    </group>
  );
}

/** Monthly, Yearbook and Highlights, standing against the wall. Clicking one opens it in the reader. */
export const Books = memo(function Books({ onOpen }: { onOpen: (kind: BookKind) => void }) {
  return (
    <group>
      {BOOKS.map((spec) => <ShelfBook key={spec.kind} onOpen={onOpen} spec={spec} />)}
    </group>
  );
});
