"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import type { ProfileMediaKind } from "@/lib/data/profile-media";

type ImageCropperProps = {
  /** Object URL of the chosen photo. The owner creates and revokes it (an effect here would break under StrictMode). */
  url: string;
  kind: ProfileMediaKind;
  onCancel: () => void;
  /** Receives the cropped image as a JPEG file, ready to upload. */
  onConfirm: (cropped: File) => void;
};

const MAX_ZOOM = 4;
const KEY_STEP = 12;

/** Frame size in CSS pixels and the size of the exported image. The avatar is a circle, the cover a 3:1 banner. */
const SHAPES = {
  avatar: { frame: { width: 288, height: 288 }, output: { width: 640, height: 640 }, title: "Adjust profile photo", circle: true },
  cover: { frame: { width: 480, height: 160 }, output: { width: 1800, height: 600 }, title: "Adjust cover photo", circle: false },
} as const;

type Point = { x: number; y: number };

/** Instagram-style picker: drag the photo to choose which part to keep, zoom with the slider or the wheel. */
export function ImageCropper({ url, kind, onCancel, onConfirm }: ImageCropperProps) {
  const shape = SHAPES[kind];
  // on a narrow phone the frame shrinks to fit the dialog, keeping its shape
  const [frameW] = useState(() => Math.min(shape.frame.width, Math.max(160, window.innerWidth - 72)));
  const frameH = Math.round(frameW * (shape.frame.height / shape.frame.width));
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  // distance of the photo's centre from the frame's centre, in frame pixels
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [failed, setFailed] = useState(false);
  const drag = useRef<{ pointer: Point; start: Point } | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => dialogRef.current?.focus(), []);

  // cover: the photo always fills the frame, zoom only makes it larger
  const baseScale = natural ? Math.max(frameW / natural.width, frameH / natural.height) : 1;
  const scale = baseScale * zoom;

  function clamp(point: Point, nextScale = scale): Point {
    if (!natural) return point;
    const maxX = Math.max(0, (natural.width * nextScale - frameW) / 2);
    const maxY = Math.max(0, (natural.height * nextScale - frameH) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, point.x)), y: Math.min(maxY, Math.max(-maxY, point.y)) };
  }

  function changeZoom(next: number) {
    const value = Math.min(MAX_ZOOM, Math.max(1, next));
    setZoom(value);
    setOffset((current) => clamp(current, baseScale * value));
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointer: { x: event.clientX, y: event.clientY }, start: offset };
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const { pointer, start } = drag.current;
    setOffset(clamp({ x: start.x + event.clientX - pointer.x, y: start.y + event.clientY - pointer.y }));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") return onCancel();
    const moves: Record<string, Point> = { ArrowLeft: { x: KEY_STEP, y: 0 }, ArrowRight: { x: -KEY_STEP, y: 0 }, ArrowUp: { x: 0, y: KEY_STEP }, ArrowDown: { x: 0, y: -KEY_STEP } };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    setOffset((current) => clamp({ x: current.x + move.x, y: current.y + move.y }));
  }

  function confirm() {
    const image = imageRef.current;
    if (!image || !natural) return;
    const { output } = shape;
    const canvas = document.createElement("canvas");
    canvas.width = output.width;
    canvas.height = output.height;
    const context = canvas.getContext("2d");
    if (!context) return setFailed(true);
    // the part of the photo that sits inside the frame, in the photo's own pixels
    const sourceW = frameW / scale;
    const sourceH = frameH / scale;
    const sourceX = (natural.width * scale / 2 - frameW / 2 - offset.x) / scale;
    const sourceY = (natural.height * scale / 2 - frameH / 2 - offset.y) / scale;
    context.fillStyle = "#fff"; // transparent PNGs would turn black as JPEG
    context.fillRect(0, 0, output.width, output.height);
    context.drawImage(image, sourceX, sourceY, sourceW, sourceH, 0, 0, output.width, output.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return setFailed(true);
        onConfirm(new File([blob], `${kind}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4" onClick={onCancel}>
      <div
        aria-labelledby="cropper-title"
        aria-modal="true"
        className="w-full max-w-[34rem] rounded-2xl bg-[var(--color-paper)] p-5 shadow-[var(--shadow-soft)] outline-none sm:p-6"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={onKeyDown}
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
      >
        <h2 className="title-md text-center" id="cropper-title">{shape.title}</h2>
        <p className="mt-1 text-center text-xs text-[var(--color-muted)]">Drag the photo to choose which part to keep.</p>

        <div className="mt-4 flex justify-center">
          <div
            aria-label="Photo position. Drag, or use the arrow keys, to move the photo."
            className="relative cursor-grab touch-none select-none overflow-hidden bg-black active:cursor-grabbing"
            onPointerCancel={() => { drag.current = null; }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => { drag.current = null; }}
            onWheel={(event) => changeZoom(zoom - event.deltaY * 0.002)}
            style={{ width: frameW, height: frameH, borderRadius: shape.circle ? "9999px" : "0.75rem" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- a local blob preview, not an optimizable asset */}
            <img
              alt=""
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
              draggable={false}
              onError={() => setFailed(true)}
              onLoad={(event) => setNatural({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
              ref={imageRef}
              src={url}
              style={natural ? { width: natural.width * scale, height: natural.height * scale, transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))` } : { visibility: "hidden" }}
            />
            {/* rule-of-thirds guide, like the phone picker */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,transparent_33.2%,white_33.3%,transparent_33.5%,transparent_66.5%,white_66.6%,transparent_66.8%),linear-gradient(to_bottom,transparent_33.2%,white_33.3%,transparent_33.5%,transparent_66.5%,white_66.6%,transparent_66.8%)]" />
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3 px-1">
          <span aria-hidden="true" className="text-xs text-[var(--color-muted)]">−</span>
          <input
            aria-label="Zoom"
            className="h-1.5 flex-1 cursor-pointer accent-[var(--color-green)]"
            max={MAX_ZOOM}
            min={1}
            onChange={(event) => changeZoom(Number(event.target.value))}
            step={0.01}
            type="range"
            value={zoom}
          />
          <span aria-hidden="true" className="text-xs text-[var(--color-muted)]">+</span>
        </div>

        {failed ? <p className="mt-3 rounded-lg bg-[#f8e3e3] px-3 py-2 text-xs text-[#8a3a3a]" role="alert">We could not open this image. Please choose another one.</p> : null}

        <div className="mt-5 flex justify-end gap-2">
          <button className="btn btn-secondary btn-sm" onClick={onCancel} type="button">Cancel</button>
          <button className="btn btn-primary btn-sm" disabled={!natural || failed} onClick={confirm} type="button">Save</button>
        </div>
      </div>
    </div>
  );
}
