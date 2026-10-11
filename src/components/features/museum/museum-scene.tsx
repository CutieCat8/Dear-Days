"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { ArrowLeftIcon, ArrowRightIcon, BookIcon, CloseIcon, PinIcon } from "@/components/shared/icons";
import { useSceneHost } from "@/components/layout/scene-host";
import { RoomMemoryStar } from "@/components/features/books/favorite-button";
import { useRoomBooks } from "@/components/features/books/room-books";
import { MoodBadge } from "@/components/shared/mood-badge";
import type { Memory } from "@/lib/contracts/types";
import { createBrowserDataSource } from "@/lib/data/browser";

import { FramePicker } from "./frame-picker";
import { resolveMemoryCover } from "./memory-cover";
import { useFreshMemories } from "./use-fresh-memories";
import styles from "./museum-scene.module.css";
import type { CameraApi, CameraState, SceneLayout } from "./room-3d/camera-controller";
import { panelWidthFor } from "./room-3d/config";
import { SceneErrorBoundary } from "./room-3d/error-boundary";
import { assignMemories, displayedPins, placeInFrame, visibleMemories, type FramePins } from "./room-3d/slots";

type MuseumSceneProps = {
  memories: Memory[];
  roomId: string;
  /** Photos the members pinned to specific frames when the page was loaded. */
  initialPins: FramePins;
};

/** Three.js is client-only and heavy: load it lazily, never during SSR. */
const RoomCanvas = dynamic(() => import("./room-3d/room-canvas"), {
  ssr: false,
  loading: () => <SceneStatus>Preparing the room…</SceneStatus>,
});

function memoryHref(memory: Memory) {
  return `/rooms/${memory.room_id}/memories/${memory.id}`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00Z`));
}

function SceneStatus({ children, busy = true }: { children: ReactNode; busy?: boolean }) {
  return (
    <div className={styles.status} role="status">
      {busy && <span aria-hidden="true" className={styles.spinner} />}
      {children}
    </div>
  );
}

function SceneFallback({ memories }: { memories: Memory[] }) {
  return (
    <SceneStatus busy={false}>
      <p>The 3D room could not be shown on this device. You can still open every memory below.</p>
      <div className={styles.fallbackLinks}>
        {memories.map((memory) => <Link href={memoryHref(memory)} key={memory.id}>{memory.title}</Link>)}
      </div>
    </SceneStatus>
  );
}

export function MuseumScene({ memories: loaded, roomId, initialPins }: MuseumSceneProps) {
  const memories = useFreshMemories(loaded);
  const { openBook } = useRoomBooks();
  const [pins, setPins] = useState<FramePins>(initialPins);
  const [arranging, setArranging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Objects in the room, in a stable order; previous/next walk exactly these.
  const shown = useMemo(() => visibleMemories(memories, pins), [memories, pins]);
  const frames = useMemo(() => assignMemories(memories, pins).frames, [memories, pins]);
  const photos = useMemo(() => memories.filter((memory) => memory.media.length > 0), [memories]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [camera, setCamera] = useState<CameraState>({ mode: "overview", tilt: 0 });
  const mode = camera.mode;
  const stageRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<CameraApi | null>(null);
  const handleReady = useCallback(() => setReady(true), []);
  const handleImageError = useCallback(() => setPhotoFailed(true), []);

  // The canvas is rendered into the app shell's scene layer (full viewport, between the backgrounds and the text).
  const shell = useSceneHost();
  const setImmersive = shell?.setImmersive;
  const host = shell?.host ?? null;
  useEffect(() => {
    setImmersive?.(true);
    return () => setImmersive?.(false);
  }, [setImmersive]);

  /** Where the page puts the stage (below the header) and the aside, in canvas px; the canvas is the viewport. */
  const getLayout = useCallback((): SceneLayout => {
    const rect = stageRef.current?.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const stage = rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : { left: 0, top: 0, width: vw, height: vh };
    return { stage, panelWidth: panelWidthFor(stage.width) };
  }, []);

  const index = shown.findIndex((memory) => memory.id === selectedId);
  const selected = index >= 0 ? shown[index] : null;
  /** Toolbar zoom aims at the middle of the part of the scene the aside leaves visible. */
  const zoomAnchor = () => {
    const { stage, panelWidth } = getLayout();
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const visibleWidth = stage.width - (selected ? panelWidth : 0);
    return { x: stage.left + visibleWidth / 2 - vw / 2, y: -(stage.top + stage.height / 2 - vh / 2) };
  };
  const selectedFrame = frames.find((item) => item.memory.id === selectedId)?.slot ?? null;

  /** Saves the whole arrangement; on success the room shows it, on failure nothing changes. */
  const saveLayout = async (next: FramePins) => {
    setSaving(true);
    setSaveError(null);
    const result = await createBrowserDataSource().setFrameLayout(roomId, next);
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.error.message);
      return false;
    }
    setPins(next);
    return true;
  };

  /** Hangs a photo in the selected frame (swapping if it hung elsewhere). Every other frame stays exactly as it looks. */
  const chooseForFrame = async (memoryId: string) => {
    if (!selectedFrame) return;
    const next = placeInFrame(displayedPins(frames), selectedFrame.id, memoryId);
    if (await saveLayout(next)) setSelectedId(memoryId);
  };

  const resetFrames = async () => {
    if (await saveLayout({})) setSelectedId(null);
  };

  const toggleArranging = () => {
    setArranging((on) => !on);
    setSaveError(null);
    setSelectedId(null);
  };

  const step = (delta: number) => setSelectedId(shown[(index + delta + shown.length) % shown.length].id);

  // Escape closes the memory panel first; once it is closed, it leaves wall focus.
  useEffect(() => {
    if (!selectedId && mode === "overview") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (selectedId) setSelectedId(null);
      else cameraRef.current?.back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, mode]);

  const canvasNode = (
    <div className={styles.canvasWrap}>
      <SceneErrorBoundary fallback={<SceneFallback memories={shown} />}>
        <RoomCanvas memories={memories} apiRef={cameraRef} getLayout={getLayout} onImageError={handleImageError} onOpenBook={openBook} onStateChange={setCamera} onReady={handleReady} onSelect={setSelectedId} pins={pins} selectedId={selectedId} />
      </SceneErrorBoundary>
    </div>
  );
  const canvas = shell ? (host ? createPortal(canvasNode, host) : null) : canvasNode;

  return (
    <div className={styles.stage} ref={stageRef}>
      {canvas}
      {!ready && <SceneStatus>Preparing the room…</SceneStatus>}

      {/* Keyboard / screen-reader path: the canvas itself is decorative. */}
      <ul aria-label="Memories in this room" className={styles.keyList}>
        {shown.map((memory) => (
          <li key={memory.id}>
            <button onClick={() => setSelectedId(memory.id)} type="button">
              Select {memory.title}, {memory.media.length > 0 ? "photo" : "text note"}
            </button>
          </li>
        ))}
      </ul>
      {photoFailed && <p className={styles.notice} role="status">Some photos could not be loaded, so those frames show a placeholder painting.</p>}
      {ready && (
        <div className={styles.controls}>
          <div className={styles.controlRow}>
            {mode === "overview" ? (
              <>
                <button className={styles.pill} onClick={() => cameraRef.current?.focusWall("left")} type="button">View left wall</button>
                <button className={styles.pill} onClick={() => cameraRef.current?.focusWall("right")} type="button">View right wall</button>
              </>
            ) : (
              <button className={styles.pill} onClick={() => cameraRef.current?.back()} type="button"><ArrowLeftIcon className="size-3.5" /> Back to room</button>
            )}
            <span className={styles.zoomGroup}>
              <button aria-label="Zoom out" className={styles.round} onClick={() => cameraRef.current?.zoomBy(1 / 1.25, zoomAnchor())} type="button">−</button>
              <button aria-label="Zoom in" className={styles.round} onClick={() => cameraRef.current?.zoomBy(1.25, zoomAnchor())} type="button">+</button>
            </span>
            <span className={styles.zoomGroup}>
              <button aria-label="Move room left" className={styles.round} onClick={() => cameraRef.current?.panBy(-1)} type="button">←</button>
              <button aria-label="Move room right" className={styles.round} onClick={() => cameraRef.current?.panBy(1)} type="button">→</button>
            </span>
            {mode === "overview" && (
              <>
                <button className={styles.pill} disabled={camera.tilt >= 8} onClick={() => cameraRef.current?.tilt(1)} type="button">Tilt up</button>
                <button className={styles.pill} disabled={camera.tilt <= 0} onClick={() => cameraRef.current?.tilt(-1)} type="button">Reset tilt</button>
              </>
            )}
            <button className={styles.pill} onClick={() => cameraRef.current?.reset()} type="button">Reset view</button>
            {photos.length > 0 && (
              <button aria-pressed={arranging} className={styles.pill} onClick={toggleArranging} type="button">{arranging ? "Done arranging" : "Arrange frames"}</button>
            )}
            {arranging && (
              <button className={styles.pill} disabled={saving || Object.keys(pins).length === 0} onClick={resetFrames} type="button">Reset to automatic</button>
            )}
          </div>
          {arranging && <p className={styles.hint}>Click a frame to choose which photo hangs in it.</p>}
          <p className={styles.hint}>{mode === "overview" ? "Drag to rotate · Shift+drag or right-drag to move · Scroll to zoom · Click the three books on the sideboard to read them" : "Drag to slide the wall · Scroll to zoom"}</p>
        </div>
      )}

      {arranging && selected && selectedFrame ? (
        <FramePicker
          currentId={selected.id}
          error={saveError}
          hangingIds={new Set(frames.map((item) => item.memory.id))}
          onChoose={chooseForFrame}
          onClose={() => setSelectedId(null)}
          photos={photos}
          saving={saving}
        />
      ) : (
        selected && <MemoryPanel memory={selected} onClose={() => setSelectedId(null)} onStep={step} />
      )}
      {arranging && saveError && !selected && <p className={styles.notice} role="alert">{saveError}</p>}
    </div>
  );
}

function MemoryPanel({ memory, onClose, onStep }: { memory: Memory; onClose: () => void; onStep: (delta: number) => void }) {
  const cover = resolveMemoryCover(memory);
  const [photoFailed, setPhotoFailed] = useState(false);
  const people = memory.tags.filter((tag) => tag.type === "person");
  const places = memory.tags.filter((tag) => tag.type === "place");

  return (
    <aside aria-label="Selected memory" className={styles.panel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Selected memory</h2>
        <div className={styles.iconRow}>
          <button aria-label="Previous memory" className={styles.iconButton} onClick={() => onStep(-1)} type="button"><ArrowLeftIcon className="size-4" /></button>
          <button aria-label="Next memory" className={styles.iconButton} onClick={() => onStep(1)} type="button"><ArrowRightIcon className="size-4" /></button>
          <button aria-label="Close selected memory" className={styles.iconButton} onClick={onClose} type="button"><CloseIcon className="size-4" /></button>
        </div>
      </div>

      <div className={styles.panelBody} key={memory.id}>
        <div className={styles.preview}>
          {cover && !photoFailed ? (
            // unoptimized: mock files are already web-sized, and real signed URLs are not in images.remotePatterns.
            <Image alt={cover.alt} fill loading="eager" onError={() => setPhotoFailed(true)} sizes="360px" src={cover.url} unoptimized />
          ) : (
            <div className={styles.diaryPreview}>
              <div className={styles.diaryCover}>
                <BookIcon className="size-5" />
                <span>{memory.title}</span>
              </div>
              {photoFailed && <p className={styles.previewNote} role="status">Photo could not be loaded</p>}
            </div>
          )}
        </div>

        <div>
          <h3 className={styles.memoryTitle}>{memory.title}</h3>
          <div className={styles.metaLine}>
            <time dateTime={memory.memory_date}>{formatDate(memory.memory_date)}</time>
            {places[0] && <span className="inline-flex items-center gap-1"><PinIcon />{places[0].label}</span>}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {memory.mood && <MoodBadge mood={memory.mood} />}
          <RoomMemoryStar memoryId={memory.id} title={memory.title} />
        </div>

        <p className={styles.excerpt}>{memory.body}</p>

        {people.length > 0 && (
          <div className={styles.tagRow}>
            <span className={styles.tagLabel}>People</span>
            {people.map((tag) => (
              <span className={styles.person} key={tag.id}><span aria-hidden="true" className={styles.avatar}>{tag.label.charAt(0)}</span>{tag.label}</span>
            ))}
          </div>
        )}
        {places.length > 0 && (
          <div className={styles.tagRow}>
            <span className={styles.tagLabel}>Places</span>
            {places.map((tag) => <span className={styles.place} key={tag.id}><PinIcon className="size-3.5" />{tag.label}</span>)}
          </div>
        )}

      </div>

      <div className={styles.panelFooter}>
        <Link className={styles.openButton} href={memoryHref(memory)}>Open memory <ArrowRightIcon className="size-4" /></Link>
      </div>
    </aside>
  );
}
