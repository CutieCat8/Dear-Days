"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode, Ref } from "react";

import { BookIcon, LeafIcon, PlusIcon } from "@/components/shared/icons";
import { MoodBadge } from "@/components/shared/mood-badge";
import { MOOD_LABELS } from "@/lib/contracts/constants";
import type { Memory } from "@/lib/contracts/types";
import type { BookKind } from "@/lib/books/books";
import { FOOT, type PageMetrics } from "@/lib/books/metrics";
import type { BookLayout, BookPage } from "@/lib/books/outline";
import { formatDay, monthGrid, monthName, type YearMonth } from "@/lib/books/period";
import { frameHeightRatio } from "@/lib/books/photo-layout";
import { monthCoverMemory, type YearStats } from "@/lib/books/stats";

import { BookCover } from "./book-cover";
import { StarToggle } from "./favorite-button";
import { PhotoFrame, type FramePhoto } from "./photo-frame";
import styles from "./books.module.css";

/** Everything a page needs to draw itself and to act (turn to another page, open a photo, star a memory). */
export type PageEnv = {
  kind: BookKind;
  roomId: string;
  roomName: string;
  /** "October 2026", "2026", "All highlights" … */
  label: string;
  period: YearMonth | null;
  memories: ReadonlyMap<string, Memory>;
  months: Memory[][];
  stats: YearStats;
  layout: BookLayout;
  metrics: PageMetrics;
  /** Highlights only: a month or year filter is on, so "nothing here" means nothing in that period. */
  filtered: boolean;
  goToPage: (page: number) => void;
  openPhoto: (memoryId: string, index: number) => void;
  isStarred: (memoryId: string) => boolean;
  isStarPending: (memoryId: string) => boolean;
  starDisabled: boolean;
  onStar: (memoryId: string) => void;
};

type Side = "left" | "right" | "single";

export function pageVars(metrics: PageMetrics): CSSProperties {
  return { "--pad": `${metrics.pad}px`, "--foot": `${FOOT}px` } as CSSProperties;
}

function PageFoot({ index, side, text }: { index: number; side: Side; text: string }) {
  return (
    <footer className={styles.foot} data-side={side}>
      <span className={styles.footText}>{text}</span>
      <span className={styles.footNumber}>{index}</span>
    </footer>
  );
}

/** The photos of a memory, in their saved order, as the frame and the full-size viewer need them. */
export function framePhotos(memory: Memory): FramePhoto[] {
  return [...memory.media].sort((a, b) => a.position - b.position).map((item) => ({ id: item.id, url: item.signed_url, alt: item.alt_text || memory.title }));
}

type MemoryBodyProps = {
  memory: Memory;
  part: number;
  parts: number;
  text: string;
  metrics: PageMetrics;
  index: number;
  side: Side;
  /** A layout probe: same boxes, no photos, empty text that the measurer fills to see how much fits. */
  measure?: boolean;
  textRef?: Ref<HTMLParagraphElement>;
  starred?: boolean;
  starPending?: boolean;
  starDisabled?: boolean;
  onStar?: () => void;
  onOpenPhoto?: (index: number) => void;
};

/** One page of a memory: the photos in a frame first, then date, title, mood and the diary text; later pages continue the text. */
export function MemoryPageBody({ memory, part, parts, text, metrics, index, side, measure = false, textRef, starred = false, starPending = false, starDisabled = false, onStar, onOpenPhoto }: MemoryBodyProps) {
  const photos = framePhotos(memory);
  const first = part === 0;
  const frameHeight = first ? Math.round(metrics.innerH * frameHeightRatio(photos.length, metrics.compact)) : 0;
  const pending = first && text === "" && parts > 1 && !measure;

  return (
    <div className={styles.inner} style={pageVars(metrics)}>
      {first && photos.length > 0 && <PhotoFrame height={frameHeight} measure={measure} onOpen={onOpenPhoto ?? (() => {})} photos={photos} width={metrics.innerW} />}

      {first ? (
        <header className={styles.memHead}>
          <div className={styles.memDateRow}>
            <time className={styles.memDate} dateTime={memory.memory_date}>{formatDay(memory.memory_date)}</time>
            <StarToggle disabled={starDisabled || measure} label={memory.title} onToggle={onStar ?? (() => {})} pending={starPending} starred={starred} tabIndex={measure ? -1 : undefined} />
          </div>
          <h3 className={styles.memTitle}>{memory.title}</h3>
          {memory.mood ? <div><MoodBadge mood={memory.mood} /></div> : null}
        </header>
      ) : (
        <p className={styles.memRunning}>{memory.title} · continued</p>
      )}

      <p className={styles.memText} data-measure-text ref={textRef}>{measure ? "" : text}</p>
      {pending && <p className={styles.memMore}>The story continues on the next page →</p>}
      <PageFoot index={index} side={side} text={parts > 1 ? `${part + 1} / ${parts}` : formatDay(memory.memory_date)} />
    </div>
  );
}

function MonthCalendar({ period, env }: { period: YearMonth; env: PageEnv }) {
  const { leading, days } = monthGrid(period);
  const cells: (number | null)[] = [...Array<null>(leading).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const key = (day: number) => `${period.year}-${String(period.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return (
    <div className={styles.calendarWrap}>
      <p className={styles.calCaption}>{monthName(period.month)} {period.year}</p>
      <div aria-label={`${monthName(period.month)} ${period.year} calendar`} className={styles.calendar} role="group">
        {["S", "M", "T", "W", "T", "F", "S"].map((letter, i) => <span aria-hidden="true" className={styles.calWeekday} key={i}>{letter}</span>)}
        {cells.map((day, i) => {
          if (day === null) return <span key={`blank-${i}`} />;
          const page = env.layout.dayPage.get(key(day));
          return page === undefined ? (
            <span className={styles.calDay} key={day}>{day}</span>
          ) : (
            <button aria-label={`${formatDay(key(day))}: open this day`} className={`${styles.calDay} ${styles.calHas}`} key={day} onClick={() => env.goToPage(page)} type="button">{day}</button>
          );
        })}
      </div>
    </div>
  );
}

function ContentsPage({ page, index, side, env }: { page: Extract<BookPage, { type: "contents" }>; index: number; side: Side; env: PageEnv }) {
  return (
    <div className={styles.inner} style={pageVars(env.metrics)}>
      <h3 className={styles.pageTitle}>Contents{page.parts > 1 ? <span className={styles.pageTitleNote}> {page.part + 1}/{page.parts}</span> : null}</h3>
      {page.calendar && env.period && <MonthCalendar env={env} period={env.period} />}
      <ol className={styles.toc}>
        {page.entries.map((entry) => (
          <li key={entry.key}>
            <button className={styles.tocRow} disabled={entry.page === null} onClick={() => entry.page !== null && env.goToPage(entry.page)} type="button">
              <span className={styles.tocLabel}>{entry.label}</span>
              <span className={styles.tocDetail}>{entry.detail}</span>
              <span aria-hidden="true" className={styles.tocDots} />
              <span className={styles.tocPage}>{entry.page ?? "–"}</span>
            </button>
          </li>
        ))}
      </ol>
      <PageFoot index={index} side={side} text={env.label} />
    </div>
  );
}

function StatsPage({ index, side, env }: { index: number; side: Side; env: PageEnv }) {
  const { stats } = env;
  const items: { value: string; label: string }[] = [
    { value: String(stats.memories), label: stats.memories === 1 ? "memory" : "memories" },
    { value: String(stats.photos), label: stats.photos === 1 ? "photo" : "photos" },
    { value: `${stats.activeMonths} / 12`, label: "months with memories" },
    { value: stats.busiestMonth ? monthName(stats.busiestMonth.month, "short") : "–", label: stats.busiestMonth ? `busiest month · ${stats.busiestMonth.count}` : "busiest month" },
    { value: stats.topMood ? MOOD_LABELS[stats.topMood.mood] : "–", label: stats.topMood ? `most common mood · ${stats.topMood.count}` : "most common mood" },
    { value: String(stats.places), label: stats.places === 1 ? "place" : "places" },
  ];
  return (
    <div className={styles.inner} style={pageVars(env.metrics)}>
      <h3 className={styles.pageTitle}>{env.label} in numbers</h3>
      <dl className={styles.stats}>
        {items.map((item) => (
          <div className={styles.stat} key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
      <p className={styles.statsNote}>Counted from the memories in this year, nothing more.</p>
      <PageFoot index={index} side={side} text={env.label} />
    </div>
  );
}

function MonthTileImage({ memory, sizes }: { memory: Memory | null; sizes: string }) {
  const item = memory?.media.find((media) => media.signed_url);
  if (!memory || !item?.signed_url) return <span className={styles.tileEmpty}><BookIcon className="size-5" /></span>;
  return <Image alt="" className={styles.tileImage} fill sizes={sizes} src={item.signed_url} unoptimized />;
}

function MonthGridPage({ index, side, env }: { index: number; side: Side; env: PageEnv }) {
  return (
    <div className={styles.inner} style={pageVars(env.metrics)}>
      <h3 className={styles.pageTitle}>Month by month</h3>
      <ul className={styles.monthGrid}>
        {env.months.map((memories, monthIndex) => {
          const page = env.layout.monthPage.get(monthIndex + 1);
          const content = (
            <>
              <span className={styles.tileMedia}><MonthTileImage memory={monthCoverMemory(memories)} sizes="160px" /></span>
              <span className={styles.tileName}>{monthName(monthIndex + 1, "short")}</span>
              <span className={styles.tileCount}>{memories.length === 0 ? "none" : memories.length}</span>
            </>
          );
          return (
            <li key={monthIndex}>
              {page === undefined ? (
                <div aria-label={`${monthName(monthIndex + 1)}: no memories`} className={`${styles.tile} ${styles.tileNone}`}>{content}</div>
              ) : (
                <button aria-label={`${monthName(monthIndex + 1)}: ${memories.length} ${memories.length === 1 ? "memory" : "memories"}, open`} className={styles.tile} onClick={() => env.goToPage(page)} type="button">{content}</button>
              )}
            </li>
          );
        })}
      </ul>
      <PageFoot index={index} side={side} text={env.label} />
    </div>
  );
}

function MonthDividerPage({ month, index, side, env }: { month: number; index: number; side: Side; env: PageEnv }) {
  const memories = env.months[month - 1] ?? [];
  return (
    <div className={`${styles.inner} ${styles.divider}`} style={pageVars(env.metrics)}>
      <div className={styles.dividerMedia}><MonthTileImage memory={monthCoverMemory(memories)} sizes="400px" /></div>
      <h3 className={styles.dividerMonth}>{monthName(month)}</h3>
      <p className={styles.dividerCount}>{memories.length} {memories.length === 1 ? "memory" : "memories"}</p>
      <PageFoot index={index} side={side} text={env.label} />
    </div>
  );
}

function EmptyPage({ index, side, env }: { index: number; side: Side; env: PageEnv }) {
  const addHref = `/rooms/${env.roomId}/memories/new`;
  let heading: string;
  let body: string;
  let action: ReactNode = null;
  if (env.kind === "highlights") {
    heading = env.filtered ? "No highlights in this period" : "No highlights yet";
    body = env.filtered ? "None of the memories you starred fall in the month or year you chose. Try another period, or show all." : "Tap the star on a memory you want to keep close, such as a birthday or an anniversary, and it will be gathered here. Only you see your stars.";
  } else {
    heading = `Nothing in ${env.label} yet`;
    body = "No memories are dated in this period. Choose another one, or write down a day you would like to keep.";
    action = <Link className="btn btn-secondary btn-sm" href={addHref}><PlusIcon className="size-3.5" /> Add a memory</Link>;
  }
  return (
    <div className={`${styles.inner} ${styles.centered}`} style={pageVars(env.metrics)}>
      <LeafIcon className={styles.emptyIcon} />
      <h3 className={styles.emptyTitle}>{heading}</h3>
      <p className={styles.emptyBody}>{body}</p>
      {action}
      <PageFoot index={index} side={side} text={env.label} />
    </div>
  );
}

function ClosingPage({ index, side, env }: { index: number; side: Side; env: PageEnv }) {
  return (
    <div className={`${styles.inner} ${styles.centered}`} style={pageVars(env.metrics)}>
      <LeafIcon className={styles.emptyIcon} />
      <h3 className={styles.emptyTitle}>That is all for {env.label}</h3>
      <p className={styles.emptyBody}>{env.roomName}</p>
      <PageFoot index={index} side={side} text="Dear Days" />
    </div>
  );
}

export function renderBookPage(page: BookPage, index: number, side: Side, env: PageEnv): ReactNode {
  switch (page.type) {
    case "cover":
      return <BookCover kind={env.kind} roomName={env.roomName} subtitle={env.label} />;
    case "contents":
      return <ContentsPage env={env} index={index} page={page} side={side} />;
    case "stats":
      return <StatsPage env={env} index={index} side={side} />;
    case "month-grid":
      return <MonthGridPage env={env} index={index} side={side} />;
    case "month-divider":
      return <MonthDividerPage env={env} index={index} month={page.month} side={side} />;
    case "empty":
      return <EmptyPage env={env} index={index} side={side} />;
    case "closing":
      return <ClosingPage env={env} index={index} side={side} />;
    case "memory": {
      const memory = env.memories.get(page.memoryId);
      if (!memory) return null;
      return (
        <MemoryPageBody
          index={index}
          memory={memory}
          metrics={env.metrics}
          onOpenPhoto={(photoIndex) => env.openPhoto(memory.id, photoIndex)}
          onStar={() => env.onStar(memory.id)}
          part={page.part}
          parts={page.parts}
          side={side}
          starDisabled={env.starDisabled}
          starPending={env.isStarPending(memory.id)}
          starred={env.isStarred(memory.id)}
          text={page.text}
        />
      );
    }
  }
}
