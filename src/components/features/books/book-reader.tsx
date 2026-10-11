"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";

import { ArrowLeftIcon, ArrowRightIcon, CloseIcon } from "@/components/shared/icons";
import { BOOK_INFO, BOOK_KINDS, type BookKind } from "@/lib/books/books";
import { bookSize, contentsCapacity, pageMetrics } from "@/lib/books/metrics";
import { buildBook, pagesOfSpread, spreadCount, spreadOfPage, type BookInput, type HighlightFilter } from "@/lib/books/outline";
import { currentYearMonth, formatMonthYear, groupByMonth, monthGrid, monthName, yearMonthOf, yearOptions, yearsOf, type YearMonth } from "@/lib/books/period";
import { photosNeedOwnPage } from "@/lib/books/photo-layout";
import { yearStats } from "@/lib/books/stats";
import { splitTextIntoPages } from "@/lib/books/text-pages";
import type { Memory } from "@/lib/contracts/types";

import { framePhotos, MemoryPageBody, renderBookPage, type PageEnv } from "./book-pages";
import { FlipBook } from "./flip-book";
import { PhotoLightbox } from "./photo-frame";
import { useRoomBooks } from "./room-books";
import { useBookData, type BookSpec } from "./use-book-data";
import styles from "./books.module.css";

const subscribeMotion = (notify: () => void) => {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The free space for the book, debounced so dragging a window edge does not re-cut the pages on every pixel. */
function useStageSize(element: HTMLElement | null) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  useEffect(() => {
    if (!element) return;
    let timer: number | undefined;
    const read = () => setSize({ width: Math.floor(element.clientWidth), height: Math.floor(element.clientHeight) });
    read();
    const observer = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(read, 140);
    });
    observer.observe(element);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [element]);
  return size;
}

function filterLabel(filter: HighlightFilter): string {
  if (filter.year === null && filter.month === null) return "All highlights";
  if (filter.year !== null && filter.month !== null) return formatMonthYear({ year: filter.year, month: filter.month });
  return filter.year !== null ? String(filter.year) : `Every ${monthName(filter.month as number)}`;
}

function matchesFilter(memory: Memory, filter: HighlightFilter): boolean {
  const { year, month } = yearMonthOf(memory.memory_date);
  return (filter.year === null || filter.year === year) && (filter.month === null || filter.month === month);
}

type Measured = { memories: readonly Memory[]; pageW: number; pageH: number; texts: Map<string, string[]> };

type ReaderProps = { initialKind: BookKind; onClose: () => void };

/** The book reader: a full-screen layer above the page (and the 3D room, which stays mounted and untouched underneath). */
export default function BookReader({ initialKind, onClose }: ReaderProps) {
  const books = useRoomBooks();
  const { roomId, roomName, yearAnchors, favoriteIds, favoritesAvailable, pendingFavoriteIds, toggleFavorite } = books;
  const titleId = useId();

  const [today] = useState(() => currentYearMonth());
  const [kind, setKind] = useState<BookKind>(initialKind);
  const [monthly, setMonthly] = useState<YearMonth>(today);
  const [yearbookYear, setYearbookYear] = useState(today.year);
  const [filter, setFilter] = useState<HighlightFilter>({ year: null, month: null });
  const [stamp, setStamp] = useState(0);
  const [page, setPage] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ memoryId: string; index: number } | null>(null);
  const [dialog, setDialog] = useState<HTMLDivElement | null>(null);
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const [measureRoot, setMeasureRoot] = useState<HTMLDivElement | null>(null);
  const [measured, setMeasured] = useState<Measured | null>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const reducedMotion = useSyncExternalStore(subscribeMotion, prefersReducedMotion, () => false);

  const spec: BookSpec = kind === "monthly" ? { kind, period: monthly } : kind === "yearbook" ? { kind, year: yearbookYear } : { kind, stamp };
  const data = useBookData(roomId, spec);
  const loaded = data.status === "ready" ? data.memories : null;

  // The memories this book actually shows (Highlights are narrowed by the month/year filter; the other books are already one period).
  const memories = useMemo(() => (loaded === null ? null : kind === "highlights" ? loaded.filter((memory) => matchesFilter(memory, filter)) : loaded), [loaded, kind, filter]);
  const label = kind === "monthly" ? formatMonthYear(monthly) : kind === "yearbook" ? String(yearbookYear) : filterLabel(filter);

  // ---- layout: how big a page is, then where each diary text breaks
  const size = useStageSize(stage);
  const double = size !== null && size.width >= 860 && size.height >= 420;
  const { pageW, pageH } = useMemo(() => (size ? bookSize({ width: double ? size.width - 120 : size.width - 24, height: size.height - 8 }, double) : { pageW: 0, pageH: 0 }), [size, double]);
  const metrics = useMemo(() => pageMetrics(pageW, pageH), [pageW, pageH]);

  useEffect(() => {
    if (!memories || !measureRoot || pageW === 0) return;
    let cancelled = false;
    void (async () => {
      await document.fonts?.ready;
      if (cancelled) return;
      const pagesEls = Array.from(measureRoot.children) as HTMLElement[];
      const textOf = (el: HTMLElement | undefined) => el?.querySelector<HTMLElement>("[data-measure-text]") ?? null;
      const rest = textOf(pagesEls[0]);
      const fitsIn = (el: HTMLElement | null) => (candidate: string) => {
        if (!el) return true;
        el.textContent = candidate;
        return el.scrollHeight <= el.clientHeight + 1;
      };
      const texts = new Map<string, string[]>();
      memories.forEach((memory, index) => {
        const first = textOf(pagesEls[index + 1]);
        const fitsFirst = fitsIn(first);
        const fitsRest = fitsIn(rest);
        const ownPage = photosNeedOwnPage(memory.media.length, metrics.compact);
        texts.set(memory.id, splitTextIntoPages(memory.body, (candidate, pageIndex) => (pageIndex === 0 ? fitsFirst(candidate) : fitsRest(candidate)), !ownPage));
        if (first) first.textContent = "";
      });
      if (rest) rest.textContent = "";
      if (!cancelled) setMeasured({ memories, pageW, pageH, texts });
    })();
    return () => {
      cancelled = true;
    };
  }, [memories, measureRoot, pageW, pageH, metrics.compact]);

  const ready = memories !== null && measured !== null && measured.memories === memories && measured.pageW === pageW && measured.pageH === pageH;

  const layout = useMemo(() => {
    if (!ready || !memories || !measured) return null;
    const input: BookInput = kind === "monthly" ? { kind, period: monthly, memories } : kind === "yearbook" ? { kind, year: yearbookYear, memories } : { kind, filter, memories };
    const { leading, days } = monthGrid(monthly);
    return buildBook(input, {
      capacity: contentsCapacity(metrics, Math.ceil((leading + days) / 7)),
      textPages: (memory) => measured.texts.get(memory.id) ?? [memory.body],
    });
  }, [ready, memories, measured, kind, monthly, yearbookYear, filter, metrics]);

  const pageCount = layout?.pages.length ?? 0;
  const spreads = layout ? spreadCount(pageCount, double) : 0;
  const currentPage = Math.min(page, Math.max(0, pageCount - 1));
  const spread = spreadOfPage(currentPage, double);
  const pagesOf = useCallback((value: number) => pagesOfSpread(value, pageCount, double), [pageCount, double]);

  const goSpread = (target: number) => {
    const clamped = Math.max(0, Math.min(spreads - 1, target));
    const [left, right] = pagesOf(clamped);
    setPage(right ?? left ?? 0);
  };
  const next = () => goSpread(spread + 1);
  const previous = () => goSpread(spread - 1);

  // ---- changing what the book is about always starts again at its cover
  const switchKind = (value: BookKind) => {
    if (value === kind) return;
    setKind(value);
    setPage(0);
    setNotice(null);
  };
  const changeMonthly = (value: YearMonth) => {
    setMonthly(value);
    setPage(0);
  };
  const changeYear = (year: number) => {
    setYearbookYear(year);
    setPage(0);
  };
  const changeFilter = (value: HighlightFilter) => {
    setFilter(value);
    setPage(0);
  };
  const stepMonth = (delta: number) => {
    const index = monthly.year * 12 + (monthly.month - 1) + delta;
    changeMonthly({ year: Math.floor(index / 12), month: (index % 12) + 1 });
  };

  const onStar = async (memoryId: string) => {
    const message = await toggleFavorite(memoryId);
    setNotice(message);
    if (!message && kind !== "highlights") setStamp((value) => value + 1);
  };

  // ---- the page environment (what every page can show and do)
  const memoryMap = useMemo(() => new Map((memories ?? []).map((memory) => [memory.id, memory])), [memories]);
  const months = useMemo(() => groupByMonth(memories ?? []), [memories]);
  const stats = useMemo(() => yearStats(memories ?? []), [memories]);
  const env: PageEnv | null = layout
    ? {
        kind,
        roomId,
        roomName,
        label,
        period: kind === "monthly" ? monthly : null,
        memories: memoryMap,
        months,
        stats,
        layout,
        metrics,
        filtered: filter.year !== null || filter.month !== null,
        goToPage: setPage,
        openPhoto: (memoryId, index) => setViewer({ memoryId, index }),
        isStarred: (memoryId) => favoriteIds.has(memoryId),
        isStarPending: (memoryId) => pendingFavoriteIds.has(memoryId),
        starDisabled: !favoritesAvailable,
        onStar: (memoryId) => void onStar(memoryId),
      }
    : null;

  // ---- keyboard: arrows turn pages, Escape closes (the 3D room underneath never sees these keys)
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (viewer) return; // the photo viewer has the keys while it is open
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      } else if ((event.key === "ArrowRight" || event.key === "ArrowLeft") && !typing && !event.altKey && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        event.stopPropagation();
        if (event.key === "ArrowRight") next();
        else previous();
      } else if (event.key === "Tab" && dialog) {
        const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]):not([tabindex="-1"]), select:not([disabled]), a[href], [tabindex="0"]')).filter((el) => el.offsetParent !== null);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && (active === first || active === dialog)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first.focus();
        } else if (!dialog.contains(active)) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  });

  // ---- focus in, focus back out, and nothing behind the book reacts to the pointer or the wheel
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    dialog?.focus();
    return () => {
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [dialog]);

  // Wheel and touch gestures stop at the book: the page and the 3D room behind it never scroll, orbit or zoom.
  // (The page's own scroll bar is left alone: hiding it would resize the room's canvas and move its camera.)
  useEffect(() => {
    const block = (event: Event) => event.preventDefault();
    dialog?.addEventListener("wheel", block, { passive: false });
    return () => dialog?.removeEventListener("wheel", block);
  }, [dialog]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const onPointerDown = (event: ReactPointerEvent) => {
    if (double || event.pointerType === "mouse") return; // two-page books are dragged by the book itself
    swipe.current = { x: event.clientX, y: event.clientY };
    swiped.current = false;
  };
  const onPointerUp = (event: ReactPointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || viewer) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      swiped.current = true;
      if (dx < 0) next();
      else previous();
    }
  };

  const viewerMemory = viewer ? memoryMap.get(viewer.memoryId) : undefined;
  const years = yearOptions([...yearAnchors, ...(loaded ? yearsOf(loaded) : [])], kind === "monthly" ? monthly.year : yearbookYear, today);
  const highlightYears = loaded ? yearsOf(loaded) : [];
  const status = !layout ? "" : currentPage === 0 ? "Cover" : double ? `Pages ${pagesOf(spread)[0] ?? "–"}–${pagesOf(spread)[1] ?? "–"} of ${pageCount - 1}` : `Page ${currentPage} of ${pageCount - 1}`;

  const body = (
    <div
      aria-labelledby={titleId}
      aria-modal="true"
      className={styles.overlay}
      ref={setDialog}
      role="dialog"
      tabIndex={-1}
    >
      <h2 className={styles.srOnly} id={titleId}>{BOOK_INFO[kind].title} book, {label}</h2>

      <header className={styles.toolbar}>
        <div aria-label="Choose a book" className={styles.tabs} role="group">
          {BOOK_KINDS.map((value) => (
            <button aria-pressed={value === kind} className={styles.tab} key={value} onClick={() => switchKind(value)} type="button">{BOOK_INFO[value].title}</button>
          ))}
        </div>

        <div className={styles.period}>
          {kind === "monthly" && (
            <>
              <button aria-label="Previous month" className={styles.roundButton} onClick={() => stepMonth(-1)} type="button"><ArrowLeftIcon className="size-4" /></button>
              <select aria-label="Month" className={styles.select} onChange={(event) => changeMonthly({ year: monthly.year, month: Number(event.target.value) })} value={monthly.month}>
                {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{monthName(i + 1)}</option>)}
              </select>
              <select aria-label="Year" className={styles.select} onChange={(event) => changeMonthly({ year: Number(event.target.value), month: monthly.month })} value={monthly.year}>
                {years.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
              <button aria-label="Next month" className={styles.roundButton} onClick={() => stepMonth(1)} type="button"><ArrowRightIcon className="size-4" /></button>
            </>
          )}
          {kind === "yearbook" && (
            <>
              <button aria-label="Previous year" className={styles.roundButton} onClick={() => changeYear(yearbookYear - 1)} type="button"><ArrowLeftIcon className="size-4" /></button>
              <select aria-label="Year" className={styles.select} onChange={(event) => changeYear(Number(event.target.value))} value={yearbookYear}>
                {years.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
              <button aria-label="Next year" className={styles.roundButton} onClick={() => changeYear(yearbookYear + 1)} type="button"><ArrowRightIcon className="size-4" /></button>
              <select
                aria-label="Jump to month"
                className={styles.select}
                disabled={!layout}
                onChange={(event) => {
                  const target = layout?.monthPage.get(Number(event.target.value));
                  if (target !== undefined) setPage(target);
                }}
                value=""
              >
                <option value="">Jump to month…</option>
                {months.map((inMonth, i) => (
                  <option disabled={!layout?.monthPage.has(i + 1)} key={i} value={i + 1}>{monthName(i + 1)}{inMonth.length > 0 ? ` (${inMonth.length})` : ""}</option>
                ))}
              </select>
            </>
          )}
          {kind === "highlights" && (
            <>
              <select aria-label="Year" className={styles.select} onChange={(event) => changeFilter({ ...filter, year: event.target.value === "" ? null : Number(event.target.value) })} value={filter.year ?? ""}>
                <option value="">All years</option>
                {[...new Set([...highlightYears, ...(filter.year !== null ? [filter.year] : [])])].sort((a, b) => b - a).map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
              <select aria-label="Month" className={styles.select} onChange={(event) => changeFilter({ ...filter, month: event.target.value === "" ? null : Number(event.target.value) })} value={filter.month ?? ""}>
                <option value="">All months</option>
                {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{monthName(i + 1)}</option>)}
              </select>
            </>
          )}
        </div>

        <button className={styles.closeButton} onClick={onClose} type="button"><CloseIcon className="size-4" /> <span>Back to room</span></button>
      </header>

      <div
        className={styles.stage}
        onClickCapture={(event) => {
          if (swiped.current) {
            swiped.current = false;
            event.preventDefault();
            event.stopPropagation();
          }
        }}
        onPointerCancel={() => { swipe.current = null; }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        ref={setStage}
      >
        {data.status === "error" ? (
          <div className={styles.status} role="alert">
            <p>{data.message}</p>
            <button className="btn btn-secondary btn-sm" onClick={data.retry} type="button">Try again</button>
          </div>
        ) : !layout || !env ? (
          <div className={styles.status} role="status"><span aria-hidden="true" className={styles.spinner} />Opening the book…</div>
        ) : (
          <>
            <FlipBook
              double={double}
              key={`${kind}|${label}|${pageW}x${pageH}`}
              pageH={pageH}
              pageW={pageW}
              pagesOf={pagesOf}
              onTurn={goSpread}
              reducedMotion={reducedMotion}
              renderPage={(index, side) => renderBookPage(layout.pages[index], index, side, env)}
              spread={spread}
              spreadCount={spreads}
            />
            {double && (
              <>
                <button aria-hidden="true" className={`${styles.sideNav} ${styles.sideNavLeft}`} disabled={spread === 0} onClick={previous} tabIndex={-1} type="button"><ArrowLeftIcon className="size-5" /></button>
                <button aria-hidden="true" className={`${styles.sideNav} ${styles.sideNavRight}`} disabled={spread >= spreads - 1} onClick={next} tabIndex={-1} type="button"><ArrowRightIcon className="size-5" /></button>
              </>
            )}
          </>
        )}
      </div>

      <footer className={styles.bottomBar}>
        <button className={styles.pillButton} disabled={!layout || spread === 0} onClick={previous} type="button"><ArrowLeftIcon className="size-4" /> Previous</button>
        <p aria-live="polite" className={styles.pageStatus}>{status}</p>
        <button className={styles.pillButton} disabled={!layout || spread >= spreads - 1} onClick={next} type="button">Next <ArrowRightIcon className="size-4" /></button>
      </footer>
      {notice && <p className={styles.notice} role="alert">{notice}</p>}

      {viewer && viewerMemory && <PhotoLightbox onClose={() => setViewer(null)} photos={framePhotos(viewerMemory)} startIndex={viewer.index} title={viewerMemory.title} />}

      {/* invisible page probes: the diary text is cut into pages by measuring it in boxes identical to the real pages */}
      {memories && pageW > 0 && (
        <div aria-hidden="true" className={styles.measure} inert ref={setMeasureRoot} style={{ width: pageW, height: pageH, "--pw": `${pageW}px`, "--ph": `${pageH}px` } as CSSProperties}>
          {memories.length > 0 && (
            <div className={styles.measurePage}><MemoryPageBody index={1} memory={memories[0]} measure metrics={metrics} part={1} parts={2} side="right" text="" /></div>
          )}
          {memories.map((memory) => (
            <div className={styles.measurePage} key={memory.id}><MemoryPageBody index={1} measure memory={memory} metrics={metrics} part={0} parts={1} side="right" text="" /></div>
          ))}
        </div>
      )}
    </div>
  );

  return createPortal(body, document.body);
}
