"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { createContext, useContext, useEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from "react";
import { MathUtils, Vector3, type OrthographicCamera } from "three";

import { CAMERA, ROOM_CENTER, cameraDirection, cameraRight, cameraUp, roomBounds, wallFocus, type WallSide } from "./config";

export type CameraMode = "overview" | "wall-left" | "wall-right";

/** What the HTML toolbar needs to know about the camera. */
export type CameraState = { mode: CameraMode; tilt: number };

/** Where the page's layout puts things, in canvas px (the canvas is the full viewport): the scene stage and the aside. */
export type SceneLayout = { stage: { left: number; top: number; width: number; height: number }; panelWidth: number };

/** Screen-space point in px relative to the canvas centre, x to the right, y up. */
export type Anchor = { x: number; y: number };

/** Imperative handle for the HTML controls (buttons, keyboard) around the canvas. */
export type CameraApi = {
  focusWall: (side: WallSide) => void;
  back: () => void;
  reset: () => void;
  /** Zoom by a factor around an anchor (default: canvas centre). The anchored point stays where it is on screen. */
  zoomBy: (factor: number, anchor?: Anchor) => void;
  /** Move the room left (-1) or right (+1) on screen by ~2% of the stage width. */
  panBy: (direction: -1 | 1) => void;
  /** Raise (+1) or lower (-1) the camera by one step, never below the overview baseline. */
  tilt: (direction: -1 | 1) => void;
};

type Pose = { target: Vector3; az: number; el: number; zoom: number };
type Anim = { from: Pose; to: Pose; start: number; duration: number };

type CameraContextValue = {
  api: CameraApi;
  /** 1 = tall occluders (the corner plant) visible, 0 = hidden. Eased while a wall is focused. */
  occluderFade: MutableRefObject<number>;
  /** Which wall is focused (null in overview): the opposite wall and its frames are hidden once the fade passes halfway. */
  focusSide: MutableRefObject<WallSide | null>;
  /** True while the focus animation runs (clicks on walls are ignored). */
  isAnimating: () => boolean;
};

const CameraContext = createContext<CameraContextValue | null>(null);

export function useCameraApi() {
  const value = useContext(CameraContext);
  if (!value) throw new Error("useCameraApi must be used inside <CameraController>");
  return value;
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clonePose = (p: Pose): Pose => ({ target: p.target.clone(), az: p.az, el: p.el, zoom: p.zoom });
const v3 = (a: [number, number, number]) => new Vector3(a[0], a[1], a[2]);

const TILT_MAX = 8;
const TILT_STEP = 2;
const PAN_RANGE = 0.1; // overview pan: ±10% of the stage width
const PAN_STEP = 0.02; // arrow buttons: 2% of the stage width
const EDGE_PX = 24;

type Props = {
  children: ReactNode;
  apiRef: MutableRefObject<CameraApi | null>;
  onStateChange: (state: CameraState) => void;
  getLayout: () => SceneLayout;
};

/**
 * The single owner of the camera. Orthographic, three states: overview / wall-left / wall-right.
 *  - overview: orbit around the room centre (azimuth ±orbitRangeDeg, damped), optional tilt (0…+8° above the
 *    baseline elevation), horizontal pan (±10% of the stage width), zoom.
 *  - wall focus: eased move to a front-elevation pose from the wall's world-space plane/normal/bounds; orbit is
 *    locked, pan (both axes) and zoom work, always perpendicular to the wall.
 * Pan and zoom are applied immediately (no inertia). Zoom is anchored to the pointer: for an orthographic camera
 * every point of the view moves by the same screen offset, so shifting the target by anchor·(1/zoomOld − 1/zoomNew)
 * keeps the point under the cursor fixed on any reference plane (floor, wall, …).
 * The camera is the only thing that moves: geometry is never rotated or scaled.
 */
export function CameraController({ children, apiRef, onStateChange, getLayout }: Props) {
  const size = useThree((state) => state.size);
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  const sizeRef = useRef(size);
  const stateCallback = useRef(onStateChange);
  const layoutRef = useRef(getLayout);
  const fade = useRef(1);
  const focusSide = useRef<WallSide | null>(null);

  const S = useRef({
    mode: "overview" as CameraMode,
    az: CAMERA.azimuthDeg,
    azGoal: CAMERA.azimuthDeg,
    rel: 1,
    tilt: 0,
    tiltGoal: 0,
    pan: new Vector3(),
    wallRel: 1,
    wallPan: new Vector3(),
    saved: { az: CAMERA.azimuthDeg, rel: 1, pan: new Vector3(), tilt: 0 },
    anim: null as Anim | null,
    last: null as Pose | null,
  });

  useEffect(() => {
    sizeRef.current = size;
    stateCallback.current = onStateChange;
    layoutRef.current = getLayout;
    invalidate();
  }, [size, onStateChange, getLayout, invalidate]);

  const helpers = useMemo(() => {
    const defaultBounds = roomBounds();
    const defaultRight = v3(cameraRight(CAMERA.azimuthDeg));
    const defaultUp = v3(cameraUp());
    const overviewBase = () => {
      const { width, height } = sizeRef.current;
      return Math.min((CAMERA.overviewFill * height) / defaultBounds.height, (width - 2 * EDGE_PX) / defaultBounds.width);
    };
    /** Reading area for wall focus: the stage minus the aside (always reserved), in canvas px. */
    const readingArea = () => {
      const { stage, panelWidth } = layoutRef.current();
      const width = Math.max(200, stage.width - panelWidth - CAMERA.panelGapPx);
      return { left: stage.left, top: stage.top, width, height: stage.height };
    };
    const wallBase = (side: WallSide) => {
      const area = readingArea();
      const wf = wallFocus(side);
      const m = CAMERA.marginPx;
      return Math.min((area.width - 2 * m) / wf.width, (area.height - 2 * m) / wf.height);
    };
    /**
     * Baseline offset of the overview (world units): the room's projected centre sits at overviewCenterX/Y of the
     * viewport (right of centre, a little below it), kept fully on screen horizontally. The canvas is the whole
     * viewport, so the room can run under the sidebar, the page header and the aside.
     */
    const overviewBaseOffset = () => {
      const { width, height } = sizeRef.current;
      const zoom = overviewBase();
      const roomPx = defaultBounds.width * zoom;
      let centreX = CAMERA.overviewCenterX * width;
      centreX = Math.max(EDGE_PX + roomPx / 2, Math.min(centreX, width - EDGE_PX - roomPx / 2));
      const dx = centreX - width / 2; // room right of the canvas centre
      const dy = CAMERA.overviewCenterY * height - height / 2; // room below the canvas centre
      // the target moves opposite to where the room should appear
      return defaultRight.clone().multiplyScalar(-dx / zoom).addScaledVector(defaultUp, dy / zoom);
    };
    /** Keeps pan inside its range; returns the clamped copy. */
    const clampPan = (pan: Vector3, mode: CameraMode, az: number, el: number, zoom: number, rel: number) => {
      const { width } = sizeRef.current;
      const out = pan.clone();
      let right: Vector3;
      let up: Vector3;
      let limR: number;
      let limU: number;
      if (mode === "overview") {
        right = v3(cameraRight(az));
        up = v3(cameraUp(az, el));
        // ±10% of the stage at the default zoom; the range opens up smoothly with zoom so every part of the room
        // can be brought under the cursor when zoomed in (0 at ×1 → half the room at the maximum zoom)
        const open = MathUtils.clamp((rel - 1) / (CAMERA.maxZoom - 1), 0, 1);
        limR = (PAN_RANGE * width) / zoom + (defaultBounds.width / 2) * open;
        limU = (defaultBounds.height / 2) * open;
      } else {
        const wf = wallFocus(mode === "wall-left" ? "left" : "right");
        right = v3(cameraRight(wf.azimuthDeg));
        up = new Vector3(0, 1, 0);
        limR = wf.width / 2; // the wall can slide until its edge reaches the view centre, never fully off screen
        limU = wf.height / 2;
      }
      const dR = out.dot(right);
      const dU = out.dot(up);
      out.addScaledVector(right, MathUtils.clamp(dR, -limR, limR) - dR);
      out.addScaledVector(up, MathUtils.clamp(dU, -limU, limU) - dU);
      return out;
    };
    const overviewPose = (az: number, rel: number, pan: Vector3, tilt: number): Pose => ({
      target: v3(ROOM_CENTER).add(overviewBaseOffset()).add(pan),
      az,
      el: CAMERA.elevationDeg + tilt,
      zoom: overviewBase() * rel,
    });
    const wallPose = (side: WallSide, rel: number, pan: Vector3): Pose => {
      const wf = wallFocus(side);
      const base = wallBase(side);
      const { width, height } = sizeRef.current;
      const area = readingArea();
      const right = v3(cameraRight(wf.azimuthDeg));
      // centre the wall in the reading area (left of the aside, below the header)
      const dx = area.left + area.width / 2 - width / 2;
      const dy = area.top + area.height / 2 - height / 2;
      const target = v3(wf.target).addScaledVector(right, -dx / base).addScaledVector(new Vector3(0, 1, 0), dy / base).add(pan);
      return { target, az: wf.azimuthDeg, el: 0, zoom: base * rel };
    };
    /** Current screen axes and zoom for whichever view is active. */
    const viewOf = (s: { mode: CameraMode; az: number; tilt: number; rel: number; wallRel: number }) => {
      if (s.mode === "overview") {
        const el = CAMERA.elevationDeg + s.tilt;
        return { right: v3(cameraRight(s.az)), up: v3(cameraUp(s.az, el)), zoom: overviewBase() * s.rel, az: s.az, el };
      }
      const side: WallSide = s.mode === "wall-left" ? "left" : "right";
      const wf = wallFocus(side);
      return { right: v3(cameraRight(wf.azimuthDeg)), up: new Vector3(0, 1, 0), zoom: wallBase(side) * s.wallRel, az: wf.azimuthDeg, el: 0 };
    };
    return { overviewBase, wallBase, overviewPose, wallPose, clampPan, viewOf };
  }, []);

  const api = useMemo<CameraApi>(() => {
    const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const notify = () => stateCallback.current({ mode: S.current.mode, tilt: S.current.tiltGoal });
    const start = (to: Pose) => {
      const s = S.current;
      const from = s.last ? clonePose(s.last) : clonePose(to);
      s.anim = { from, to, start: performance.now(), duration: reduced() ? 1 : CAMERA.focusMs };
      invalidate();
    };
    const setMode = (mode: CameraMode) => {
      S.current.mode = mode;
      focusSide.current = mode === "wall-left" ? "left" : mode === "wall-right" ? "right" : null;
      notify();
    };
    const activePan = () => (S.current.mode === "overview" ? S.current.pan : S.current.wallPan);

    const back = () => {
      const s = S.current;
      if (s.mode === "overview") return;
      s.az = s.azGoal = s.saved.az;
      s.rel = s.saved.rel;
      s.pan.copy(s.saved.pan);
      s.tilt = s.tiltGoal = s.saved.tilt;
      setMode("overview");
      start(helpers.overviewPose(s.az, s.rel, s.pan, s.tilt));
    };
    return {
      focusWall: (side) => {
        const s = S.current;
        const mode: CameraMode = side === "left" ? "wall-left" : "wall-right";
        if (s.mode === mode) return;
        if (s.mode === "overview") s.saved = { az: s.azGoal, rel: s.rel, pan: s.pan.clone(), tilt: s.tiltGoal };
        s.wallRel = 1;
        s.wallPan.set(0, 0, 0);
        setMode(mode);
        start(helpers.wallPose(side, 1, s.wallPan));
      },
      back,
      reset: () => {
        const s = S.current;
        if (s.mode !== "overview") return back();
        s.azGoal = CAMERA.azimuthDeg;
        s.tiltGoal = 0;
        s.rel = 1;
        s.pan.set(0, 0, 0);
        notify();
        invalidate();
      },
      zoomBy: (factor, anchor = { x: 0, y: 0 }) => {
        const s = S.current;
        if (s.anim) return;
        const v = helpers.viewOf(s);
        const oldRel = s.mode === "overview" ? s.rel : s.wallRel;
        const newRel = MathUtils.clamp(oldRel * factor, CAMERA.minZoom, CAMERA.maxZoom);
        if (newRel === oldRel) return;
        const zoomNew = v.zoom * (newRel / oldRel);
        const shift = 1 / v.zoom - 1 / zoomNew;
        if (s.mode === "overview") s.rel = newRel;
        else s.wallRel = newRel;
        const pan = activePan().clone().addScaledVector(v.right, anchor.x * shift).addScaledVector(v.up, anchor.y * shift);
        activePan().copy(helpers.clampPan(pan, s.mode, v.az, v.el, zoomNew, newRel));
        invalidate();
      },
      panBy: (direction) => {
        const s = S.current;
        if (s.anim) return;
        const v = helpers.viewOf(s);
        const px = PAN_STEP * sizeRef.current.width * direction;
        // the room moves `direction` on screen, so the view target moves the opposite way
        const pan = activePan().clone().addScaledVector(v.right, -px / v.zoom);
        activePan().copy(helpers.clampPan(pan, s.mode, v.az, v.el, v.zoom, s.mode === "overview" ? s.rel : s.wallRel));
        invalidate();
      },
      tilt: (direction) => {
        const s = S.current;
        if (s.mode !== "overview" || s.anim) return;
        s.tiltGoal = MathUtils.clamp(s.tiltGoal + direction * TILT_STEP, 0, TILT_MAX);
        if (reduced()) s.tilt = s.tiltGoal;
        notify();
        invalidate();
      },
    };
  }, [helpers, invalidate]);

  // Hand the controls to the HTML toolbar.
  useEffect(() => {
    apiRef.current = api;
    return () => {
      apiRef.current = null;
    };
  }, [api, apiRef]);

  // Pointer / wheel input on the canvas element only (the aside, toolbar and page keep their own events).
  useEffect(() => {
    const el = gl.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    let dragMode: "orbit" | "pan" = "orbit";
    let pinch = 0;
    const clampAz = (v: number) => MathUtils.clamp(v, CAMERA.azimuthDeg - CAMERA.orbitRangeDeg, CAMERA.azimuthDeg + CAMERA.orbitRangeDeg);
    const anchorOf = (clientX: number, clientY: number): Anchor => {
      const rect = el.getBoundingClientRect();
      return { x: clientX - rect.left - rect.width / 2, y: -(clientY - rect.top - rect.height / 2) };
    };

    const onDown = (event: PointerEvent) => {
      if (event.button > 2) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 1) dragMode = event.button === 2 || event.shiftKey ? "pan" : "orbit";
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };
    const onMove = (event: PointerEvent) => {
      const prev = pointers.get(event.pointerId);
      if (!prev) return;
      const s = S.current;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (s.anim) return;
      const dx = event.clientX - prev.x;
      const dy = event.clientY - prev.y;
      if (pointers.size === 1) {
        if (dragMode === "pan") {
          // follows the hand immediately: the grabbed point stays under the pointer
          const v = helpers.viewOf(s);
          const pan = (s.mode === "overview" ? s.pan : s.wallPan).clone().addScaledVector(v.right, -dx / v.zoom);
          if (s.mode !== "overview") pan.addScaledVector(v.up, dy / v.zoom);
          (s.mode === "overview" ? s.pan : s.wallPan).copy(helpers.clampPan(pan, s.mode, v.az, v.el, v.zoom, s.mode === "overview" ? s.rel : s.wallRel));
          el.style.cursor = "move";
          invalidate();
        } else if (s.mode === "overview") {
          s.azGoal = clampAz(s.azGoal - dx * 0.2);
          el.style.cursor = "grabbing";
          invalidate();
        }
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch > 0 && dist > 0) api.zoomBy(dist / pinch, anchorOf((a.x + b.x) / 2, (a.y + b.y) / 2));
        pinch = dist;
      }
    };
    const onUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (pointers.size < 2) pinch = 0;
      if (pointers.size === 0) el.style.cursor = "";
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
      api.zoomBy(Math.exp(-delta * 0.0015), anchorOf(event.clientX, event.clientY));
    };
    const onContextMenu = (event: Event) => event.preventDefault();

    el.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("contextmenu", onContextMenu);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("contextmenu", onContextMenu);
    };
  }, [gl, api, helpers, invalidate]);

  useFrame((state, delta) => {
    const s = S.current;
    let pose: Pose;
    let moving = false;

    if (s.anim) {
      const { from, to, start, duration } = s.anim;
      const t = MathUtils.clamp((performance.now() - start) / duration, 0, 1);
      const e = easeInOut(t);
      pose = {
        target: from.target.clone().lerp(to.target, e),
        az: MathUtils.lerp(from.az, to.az, e),
        el: MathUtils.lerp(from.el, to.el, e),
        zoom: Math.exp(MathUtils.lerp(Math.log(from.zoom), Math.log(to.zoom), e)),
      };
      if (t >= 1) s.anim = null;
      moving = true;
    } else if (s.mode === "overview") {
      s.az += (s.azGoal - s.az) * (1 - Math.exp(-delta * 12));
      if (Math.abs(s.azGoal - s.az) < 0.02) s.az = s.azGoal;
      // tilt settles in ~170 ms
      s.tilt += (s.tiltGoal - s.tilt) * (1 - Math.exp(-delta * 26));
      if (Math.abs(s.tiltGoal - s.tilt) < 0.02) s.tilt = s.tiltGoal;
      moving = s.az !== s.azGoal || s.tilt !== s.tiltGoal;
      const v = helpers.viewOf(s);
      s.pan.copy(helpers.clampPan(s.pan, "overview", v.az, v.el, v.zoom, s.rel));
      pose = helpers.overviewPose(s.az, s.rel, s.pan, s.tilt);
    } else {
      const v = helpers.viewOf(s);
      s.wallPan.copy(helpers.clampPan(s.wallPan, s.mode, v.az, v.el, v.zoom, s.wallRel));
      pose = helpers.wallPose(s.mode === "wall-left" ? "left" : "right", s.wallRel, s.wallPan);
    }

    const fadeGoal = s.mode === "overview" ? 1 : 0;
    fade.current += (fadeGoal - fade.current) * (1 - Math.exp(-delta * 12));
    if (Math.abs(fadeGoal - fade.current) < 0.01) fade.current = fadeGoal;
    else moving = true;

    const camera = state.camera as OrthographicCamera;
    const dir = cameraDirection(pose.az, pose.el);
    camera.position.set(pose.target.x + dir[0] * CAMERA.distance, pose.target.y + dir[1] * CAMERA.distance, pose.target.z + dir[2] * CAMERA.distance);
    camera.zoom = pose.zoom;
    camera.up.set(0, 1, 0);
    camera.lookAt(pose.target);
    camera.updateProjectionMatrix();
    s.last = pose;

    if (moving) state.invalidate();
  });

  const value = useMemo<CameraContextValue>(() => ({ api, occluderFade: fade, focusSide, isAnimating: () => S.current.anim !== null }), [api]);
  return <CameraContext.Provider value={value}>{children}</CameraContext.Provider>;
}
