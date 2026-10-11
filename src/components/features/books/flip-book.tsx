"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

import { autoPull, corner, curl, limitPull, type Pt, type TurnDirection } from "@/lib/books/curl";

import styles from "./books.module.css";

type Slot = number | null;
type Side = "left" | "right" | "single";

type FlipBookProps = {
  /** The spread (two pages) or page (single mode) to show. Changing it turns the page(s). */
  spread: number;
  spreadCount: number;
  double: boolean;
  pageW: number;
  pageH: number;
  pagesOf: (spread: number) => [Slot, Slot];
  renderPage: (index: number, side: Side) => ReactNode;
  reducedMotion: boolean;
  /** The person turned the page by dragging it. */
  onTurn: (spread: number) => void;
};

export function FlipBook(props: FlipBookProps) {
  return props.double ? <CurlBook {...props} /> : <SingleBook {...props} />;
}

const AUTO_MS = 950;
const SETTLE_MS = 340;
const DRAG_START_PX = 7;

type Flip = { from: number; to: number; direction: TurnDirection; cornerY: number; mode: "auto" | "drag" };

/**
 * Two pages side by side. The page being turned is a sheet that folds along a line, like paper pulled by its corner:
 * drag a page with the mouse or a finger and it follows (letting go past the middle finishes the turn, otherwise it
 * falls back); the buttons and the arrow keys play the same turn by themselves. Every frame is computed from `curl()`
 * and written straight to the layers, so dragging never re-renders the pages.
 */
function CurlBook({ spread, spreadCount, pageW: W, pageH: H, pagesOf, renderPage, reducedMotion, onTurn }: FlipBookProps) {
  const [shown, setShown] = useState(spread);
  const [flip, setFlip] = useState<Flip | null>(null);
  const container = useRef<HTMLDivElement>(null);
  const book = useRef<HTMLDivElement>(null);
  const frontClip = useRef<HTMLDivElement>(null);
  const flapOuter = useRef<HTMLDivElement>(null);
  const flapClip = useRef<HTMLDivElement>(null);
  const flapBox = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const pull = useRef<Pt>({ x: 0, y: 0 });
  const raf = useRef(0);
  const press = useRef<{ id: number; x: number; y: number; started: boolean } | null>(null);
  const swallowClick = useRef(false);

  // A new target starts a turn once the previous one has landed (derived state: no effect round-trip).
  if (!flip && spread !== shown) {
    if (reducedMotion) setShown(spread);
    else setFlip({ from: shown, to: spread, direction: spread > shown ? "next" : "prev", cornerY: H, mode: "auto" });
  }

  const restingOffset = (value: number) => (value === 0 ? `translateX(${-W / 2}px)` : "");

  /** Writes one frame: where the fold is, what is clipped, where the folded part sits. */
  const paint = useCallback(
    (raw: Pt, current: Flip) => {
      const g = curl(raw, current.direction, W, H, current.cornerY);
      pull.current = g.p;
      const toPolygon = (points: Pt[]) => (points.length < 3 ? "inset(100%)" : `polygon(${points.map((q) => `${q.x + W}px ${q.y}px`).join(",")})`);
      if (frontClip.current) frontClip.current.style.clipPath = toPolygon(g.flat_polygon);
      if (flapClip.current && flapBox.current && flapOuter.current) {
        flapOuter.current.style.visibility = g.flat ? "hidden" : "visible";
        flapClip.current.style.clipPath = toPolygon(g.flap_polygon);
        const [a, b, c, d, e, f] = g.matrix;
        flapBox.current.style.transform = `matrix(${a},${b},${c},${d},${e + W},${f})`;
      }
      if (bar.current && !g.flat) {
        const angle = Math.atan2(-g.normal.x, g.normal.y);
        bar.current.style.transform = `translate(${g.mid.x + W}px, ${g.mid.y}px) rotate(${angle}rad)`;
      }
      if (book.current) {
        // the closed book is centred on its cover: slide towards / away from the centre as the cover opens or closes
        const closing = current.direction === "next" ? current.from === 0 : current.to === 0;
        const amount = current.direction === "next" ? 1 - g.progress : g.progress;
        book.current.style.transform = closing ? `translateX(${(-W / 2) * amount}px)` : "";
      }
    },
    [W, H],
  );

  const finish = useCallback(
    (current: Flip, commit: boolean) => {
      cancelAnimationFrame(raf.current);
      const final = commit ? current.to : current.from;
      if (book.current) book.current.style.transform = restingOffset(final);
      setFlip(null);
      if (commit) {
        setShown(current.to);
        onTurn(current.to);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onTurn, W],
  );

  /** Moves the pulled corner from where it is to `target`, then ends the turn as finished or cancelled. */
  const settle = useCallback(
    (current: Flip, target: Pt, commit: boolean, duration: number) => {
      const start = pull.current;
      const began = performance.now();
      const step = (now: number) => {
        const t = duration <= 0 ? 1 : Math.min(1, (now - began) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        paint({ x: start.x + (target.x - start.x) * eased, y: start.y + (target.y - start.y) * eased }, current);
        if (t < 1) raf.current = requestAnimationFrame(step);
        else finish(current, commit);
      };
      raf.current = requestAnimationFrame(step);
    },
    [paint, finish],
  );

  // The layers exist now: put them in the first frame before anything is painted.
  useLayoutEffect(() => {
    if (!flip) return;
    paint(flip.mode === "auto" ? corner(flip.direction, W, flip.cornerY) : pull.current, flip);
    // let go before the first frame was drawn: fall back instead of waiting for a release that already happened
    if (flip.mode === "drag" && !press.current) settle(flip, corner(flip.direction, W, flip.cornerY), false, SETTLE_MS);
  }, [flip, paint, settle, W]);

  // A turn started by a button or a key plays by itself.
  useEffect(() => {
    if (!flip || flip.mode !== "auto") return;
    const began = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - began) / AUTO_MS);
      paint(autoPull(t, flip.direction, W, H, flip.cornerY), flip);
      if (t < 1) raf.current = requestAnimationFrame(step);
      else finish(flip, true);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [flip, paint, finish, W, H]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  // ---- dragging
  const local = (event: { clientX: number; clientY: number }): Pt => {
    const rect = container.current!.getBoundingClientRect();
    const offset = shown === 0 && !flip ? -W / 2 : 0;
    return { x: event.clientX - rect.left - W - offset, y: event.clientY - rect.top };
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (flip || (event.pointerType === "mouse" && event.button !== 0)) return;
    press.current = { id: event.pointerId, x: event.clientX, y: event.clientY, started: false };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = press.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.started) {
      if (Math.hypot(dx, dy) < DRAG_START_PX) return;
      const origin = local({ clientX: start.x, clientY: start.y });
      const direction: TurnDirection | null = origin.x > 0 && dx < 0 && shown + 1 < spreadCount ? "next" : origin.x < 0 && dx > 0 && shown > 0 ? "prev" : null;
      if (direction === null || Math.abs(dx) < Math.abs(dy) * 0.6) {
        if (Math.abs(dy) > Math.abs(dx)) press.current = null; // a vertical gesture is not a page turn
        return;
      }
      start.started = true;
      swallowClick.current = true;
      window.getSelection()?.removeAllRanges();
      container.current?.setPointerCapture(event.pointerId);
      const cornerY = origin.y < H / 2 ? 0 : H;
      const next: Flip = { from: shown, to: direction === "next" ? shown + 1 : shown - 1, direction, cornerY, mode: "drag" };
      const c = corner(direction, W, cornerY);
      pull.current = limitPull({ x: c.x + dx, y: c.y + dy }, direction, W, cornerY, H);
      setFlip(next);
      return;
    }
    if (!flip || flip.mode !== "drag") return;
    const c = corner(flip.direction, W, flip.cornerY);
    paint({ x: c.x + dx, y: c.y + dy }, flip);
  };

  const onPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = press.current;
    if (!start || start.id !== event.pointerId) return;
    press.current = null;
    if (!start.started) return;
    window.setTimeout(() => {
      swallowClick.current = false;
    }, 0);
    if (!flip || flip.mode !== "drag") return;
    const commit = flip.direction === "next" ? pull.current.x < W * 0.5 : pull.current.x > -W * 0.5;
    const c = corner(flip.direction, W, flip.cornerY);
    const done = { x: flip.direction === "next" ? -W : W, y: flip.cornerY };
    settle(flip, commit ? done : c, commit, reducedMotion ? 0 : SETTLE_MS);
  };

  const [fromLeft, fromRight] = pagesOf(flip ? flip.from : shown);
  const [toLeft, toRight] = pagesOf(flip ? flip.to : shown);
  const next = flip?.direction === "next";
  const staticLeft = flip ? (next ? fromLeft : toLeft) : fromLeft;
  const staticRight = flip ? (next ? toRight : fromRight) : fromRight;
  const front = flip ? (next ? fromRight : fromLeft) : null;
  const back = flip ? (next ? toLeft : toRight) : null;

  const face = (index: Slot, side: Side) => {
    if (index === null) return blankFace(side);
    return (
      <div className={index === 0 ? styles.board : styles.paper} data-side={side}>
        {renderPage(index, side)}
      </div>
    );
  };

  const vars = { "--pw": `${W}px`, "--ph": `${H}px` } as CSSProperties;
  return (
    <div
      className={`${styles.perspective} ${flip?.mode === "drag" ? styles.dragging : ""}`}
      onClickCapture={(event) => {
        if (swallowClick.current) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
      onPointerCancel={onPointerEnd}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      ref={container}
      style={{ ...vars, width: W * 2, height: H }}
    >
      <div className={styles.book} ref={book} style={{ transform: flip ? undefined : restingOffset(shown) || undefined }}>
        <div className={`${styles.slot} ${styles.slotLeft}`}>{face(staticLeft, "left")}</div>
        <div className={`${styles.slot} ${styles.slotRight}`}>{face(staticRight, "right")}</div>

        {flip && (
          <>
            {/* the part of the turning sheet that still lies flat */}
            <div className={styles.curlFlat} ref={frontClip}>
              <div className={styles.slot} style={{ left: next ? W : 0 }}>{face(front, next ? "right" : "left")}</div>
            </div>
            {/* the folded part: the back of the sheet, mirrored across the fold line, with a shadow */}
            <div className={styles.curlFlapOuter} ref={flapOuter}>
              <div className={styles.curlFlapClip} ref={flapClip}>
                <div className={styles.curlFlap} ref={flapBox}>{face(back, next ? "left" : "right")}</div>
                <span className={styles.curlBar} ref={bar} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/** The empty right-hand page of the last spread is blank paper; the empty left of the closed cover is empty air. */
function blankFace(side: Side) {
  return side === "right" ? <div className={`${styles.paper} ${styles.blank}`} data-side={side} /> : null;
}

const SINGLE_MS = 560;

/** One page at a time (phones): the page lifts away or lands like a turned leaf; swiping is handled by the reader. */
function SingleBook({ spread, pageW, pageH, pagesOf, renderPage, reducedMotion }: FlipBookProps) {
  const [shown, setShown] = useState(spread);
  const [anim, setAnim] = useState<{ from: number; to: number } | null>(null);

  if (!anim && spread !== shown) {
    if (reducedMotion) setShown(spread);
    else setAnim({ from: shown, to: spread });
  }

  const duration = reducedMotion ? 0 : SINGLE_MS;
  const finish = useCallback(() => {
    if (!anim) return;
    setShown(anim.to);
    setAnim(null);
  }, [anim]);

  useEffect(() => {
    if (!anim) return;
    const timer = window.setTimeout(finish, duration + 150); // animationend can be skipped (hidden tab): never get stuck
    return () => window.clearTimeout(timer);
  }, [anim, duration, finish]);

  const direction = anim ? (anim.to > anim.from ? "next" : "prev") : null;
  const fromRight = pagesOf(anim ? anim.from : shown)[1];
  const toRight = pagesOf(anim ? anim.to : shown)[1];
  const staticRight = anim ? (direction === "next" ? toRight : fromRight) : fromRight;
  const leaf = direction === "next" ? fromRight : toRight;

  const face = (index: Slot) =>
    index === null ? null : (
      <div className={index === 0 ? styles.board : styles.paper} data-side="single">
        {renderPage(index, "single")}
      </div>
    );

  const style = { "--pw": `${pageW}px`, "--ph": `${pageH}px`, "--flip": `${duration}ms` } as CSSProperties;
  return (
    <div className={styles.perspective} style={{ ...style, width: pageW, height: pageH }}>
      <div className={styles.book}>
        <div className={`${styles.slot} ${styles.slotSingle}`}>{face(staticRight)}</div>
        {anim && (
          <div
            className={`${styles.leafSingle} ${direction === "next" ? styles.leafSingleNext : styles.leafSinglePrev}`}
            onAnimationEnd={(event) => event.target === event.currentTarget && finish()}
          >
            {face(leaf)}
          </div>
        )}
      </div>
    </div>
  );
}
