/**
 * Static configuration for the 3D room: dimensions, palette, camera and lights.
 * World units are metres-ish. Floor top is y = 0; the interior spans x ∈ [-halfX, halfX], z ∈ [-halfZ, halfZ]
 * (about 1.6 : 1). The back-left wall is the plane x = -halfX, the back-right wall is z = -halfZ.
 */
export const ROOM = {
  halfX: 2.5,
  halfZ: 4,
  wallHeight: 3.7,
  wallThickness: 0.24,
  floorThickness: 0.34,
  baseboardHeight: 0.26,
} as const;

export const PALETTE = {
  wall: "#f4eee2",
  baseboard: "#f7f0e0",
  oakLight: "#cfa070",
  oakMid: "#b98756",
  oakDark: "#8d5f3a",
  walnut: "#7b5336",
  sage: "#82977b",
  sageDark: "#617a62",
  sageLight: "#a9b99f",
  cream: "#eadfc6",
  ceramic: "#f1ebdc",
  brass: "#c59a4b",
  leaf: ["#5f8260", "#76996d", "#4f7352"],
} as const;

export const CAMERA = {
  /** Overview azimuth around the Y axis (45° = corner view) and the allowed orbit either side of it. */
  azimuthDeg: 45,
  orbitRangeDeg: 30,
  /** Overview elevation above the floor plane (locked: no orbit in elevation). */
  elevationDeg: 30,
  distance: 40,
  /** Share of the stage height the room's projected bounds use in the default overview. */
  overviewFill: 0.84,
  /** Where the projected room's centre sits in the viewport (fractions of width / height from the top-left). */
  overviewCenterX: 0.6,
  overviewCenterY: 0.52,
  /** Zoom limits, relative to the fitted zoom of the current view. */
  minZoom: 0.8,
  maxZoom: 2.2,
  /** Safe margin (px) around the wall in wall focus. */
  marginPx: 32,
  /** Gap (px) kept between the focused wall and the floating panel. */
  panelGapPx: 20,
  /** Wall focus animation length (ms) — 0 with prefers-reduced-motion. */
  focusMs: 800,
  /** Pointer travel (CSS px) beyond which a press is a drag, not a click. */
  dragThresholdPx: 6,
};

const rad = (deg: number) => (deg * Math.PI) / 180;

export function cameraDirection(azDeg = CAMERA.azimuthDeg, elDeg = CAMERA.elevationDeg): [number, number, number] {
  const az = rad(azDeg);
  const el = rad(elDeg);
  return [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)];
}

/** Right vector of the camera in world space (screen x axis). */
export function cameraRight(azDeg = CAMERA.azimuthDeg): [number, number, number] {
  const az = rad(azDeg);
  return [Math.cos(az), 0, -Math.sin(az)];
}

/** Up vector of the camera in world space (screen y axis). */
export function cameraUp(azDeg = CAMERA.azimuthDeg, elDeg = CAMERA.elevationDeg): [number, number, number] {
  const d = cameraDirection(azDeg, elDeg);
  const k = d[1];
  const u = [-d[0] * k, 1 - d[1] * k, -d[2] * k];
  const len = Math.hypot(u[0], u[1], u[2]);
  return [u[0] / len, u[1] / len, u[2] / len];
}

/**
 * The room's footprint in world space (outer faces of the walls to the open front edges): one axis-aligned
 * rectangle, 90° corners. The floor slab, plinth, floor top, walls, caps, baseboards, shadows and camera bounds
 * are all derived from it so no piece can drift out of line.
 */
export const FOOTPRINT = (() => {
  const { halfX, halfZ, wallThickness: t } = ROOM;
  const minX = -halfX - t;
  const maxX = halfX;
  const minZ = -halfZ - t;
  const maxZ = halfZ;
  return { minX, maxX, minZ, maxZ, sizeX: maxX - minX, sizeZ: maxZ - minZ, centreX: (minX + maxX) / 2, centreZ: (minZ + maxZ) / 2 };
})();

const BOX = (() => {
  const { wallHeight, floorThickness } = ROOM;
  return {
    xs: [FOOTPRINT.minX, FOOTPRINT.maxX] as const,
    zs: [FOOTPRINT.minZ, FOOTPRINT.maxZ] as const,
    ys: [-floorThickness - 0.16, wallHeight + 0.05] as const,
  };
})();

/** Centre of the room's bounding box: the orbit target, so orbiting never moves the room on screen. */
export const ROOM_CENTER: [number, number, number] = [
  (BOX.xs[0] + BOX.xs[1]) / 2,
  (BOX.ys[0] + BOX.ys[1]) / 2,
  (BOX.zs[0] + BOX.zs[1]) / 2,
];

/**
 * Width/height (world units) of the room's own bounding box (outer wall faces, caps, floor slab, plinth)
 * as seen from the given camera angles. Shadows and outside foliage are deliberately not included.
 */
export function roomBounds(azDeg = CAMERA.azimuthDeg, elDeg = CAMERA.elevationDeg) {
  const right = cameraRight(azDeg);
  const up = cameraUp(azDeg, elDeg);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const x of BOX.xs) for (const y of BOX.ys) for (const z of BOX.zs) {
    const sx = x * right[0] + y * right[1] + z * right[2];
    const sy = x * up[0] + y * up[1] + z * up[2];
    minX = Math.min(minX, sx); maxX = Math.max(maxX, sx);
    minY = Math.min(minY, sy); maxY = Math.max(maxY, sy);
  }
  return { width: maxX - minX, height: maxY - minY };
}

export type WallSide = "left" | "right";

/**
 * Front-elevation pose of a wall, derived from world-space geometry (wall plane, inward normal and bounds):
 * the camera sits on the room side along the wall normal at elevation 0 with world-up kept, so the wall is
 * seen perpendicular and its frames are not foreshortened.
 */
export function wallFocus(side: WallSide) {
  const { halfX, halfZ, wallHeight, wallThickness } = ROOM;
  // Framed with the floor slab under the wall so the wall and its base sit centred together.
  const bottom = -ROOM.floorThickness - 0.16;
  const top = wallHeight + 0.05;
  const centreY = (top + bottom) / 2;
  const height = top - bottom;
  if (side === "left") {
    // plane x = -halfX, inward normal +x, runs along z
    const length = halfZ * 2 + wallThickness;
    return { azimuthDeg: 90, target: [-halfX, centreY, -wallThickness / 2] as [number, number, number], width: length, height };
  }
  // plane z = -halfZ, inward normal +z, runs along x
  const length = halfX * 2 + wallThickness;
  return { azimuthDeg: 0, target: [-wallThickness / 2, centreY, -halfZ] as [number, number, number], width: length, height };
}

/** Width of the floating panel in px for a given stage width (must match the CSS clamp). */
export function panelWidthFor(stageWidth: number) {
  return Math.min(360, Math.max(320, stageWidth * 0.26));
}

export const LIGHTS = {
  ambient: { color: "#f6f4ee", intensity: 0.55 },
  key: { color: "#fff0dc", intensity: 2.6, position: [9, 8.5, 4.5] as [number, number, number], shadowSize: 3072 },
  fill: { color: "#eef2f8", intensity: 0.9, position: [3, 5, 10] as [number, number, number] },
  bounce: { color: "#fff0dc", intensity: 0.4, position: [0, 0.6, 0] as [number, number, number] },
  lamp: { color: "#ffd9a0", intensity: 2.6, distance: 3 },
  environmentIntensity: 0.5,
};
