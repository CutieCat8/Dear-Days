"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { ArrowLeftIcon, ArrowRightIcon, CloseIcon, ImageIcon } from "@/components/shared/icons";
import { placePhotos } from "@/lib/books/photo-layout";

import styles from "./books.module.css";

export type FramePhoto = { id: string; url: string | null; alt: string };

function Cell({ photo, index, total, sizes, onOpen }: { photo: FramePhoto; index: number; total: number; sizes: string; onOpen: (index: number) => void }) {
  const [failed, setFailed] = useState(false);
  const usable = photo.url && !failed;
  return (
    <button
      aria-label={usable ? `View photo ${index + 1} of ${total} full size: ${photo.alt}` : `Photo ${index + 1} of ${total} could not be shown`}
      className={styles.cell}
      disabled={!usable}
      onClick={() => onOpen(index)}
      type="button"
    >
      {usable ? (
        // unoptimized: signed Storage links are not in images.remotePatterns, and mock files are already web-sized.
        <Image alt="" className={styles.cellImage} fill onError={() => setFailed(true)} sizes={sizes} src={photo.url!} unoptimized />
      ) : (
        <span className={styles.cellEmpty}><ImageIcon className="size-5" /></span>
      )}
    </button>
  );
}

/**
 * The photos of one memory inside a frame: each column fills the same height, the gap is the same everywhere,
 * the photos keep their original order and are cropped (never stretched or repeated) to fit their cell.
 * The layout comes from `lib/books/photo-layout.ts`; this component only draws what it returns.
 */
export function PhotoFrame({ photos, height, width, measure = false, onOpen }: { photos: FramePhoto[]; height: number; width: number; measure?: boolean; onOpen: (index: number) => void }) {
  if (measure) return <div className={styles.frame} style={{ height }} />;
  const indexed = photos.map((photo, index) => ({ photo, index }));
  const columns = placePhotos(indexed);
  return (
    <div aria-label={`${photos.length} ${photos.length === 1 ? "photo" : "photos"}`} className={styles.frame} role="group" style={{ height }}>
      {columns.map((column, columnIndex) => (
        <div className={styles.frameCol} key={columnIndex} style={{ flexGrow: column.span, gridTemplateRows: `repeat(${column.photos.length}, minmax(0, 1fr))` }}>
          {column.photos.map(({ photo, index }) => (
            <Cell index={index} key={photo.id} onOpen={onOpen} photo={photo} sizes={`${Math.round(width / columns.length)}px`} total={photos.length} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Full-size view of one memory's photos. Escape or the close button leaves it; the arrow keys move between photos. */
export function PhotoLightbox({ photos, startIndex, title, onClose }: { photos: FramePhoto[]; startIndex: number; title: string; onClose: () => void }) {
  const [index, setIndex] = useState(startIndex);
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const closeRef = useRef<HTMLButtonElement>(null);
  const current = photos[index];
  const step = (delta: number) => setIndex((value) => (value + delta + photos.length) % photos.length);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowLeft" && photos.length > 1) setIndex((value) => (value - 1 + photos.length) % photos.length);
      else if (event.key === "ArrowRight" && photos.length > 1) setIndex((value) => (value + 1) % photos.length);
      else return;
      event.preventDefault();
      event.stopPropagation(); // the book underneath must not turn its page
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose, photos.length]);

  if (!current) return null;
  const usable = current.url && !failed.has(current.id);

  return (
    <div aria-label={`Photo ${index + 1} of ${photos.length}, ${title}`} aria-modal="true" className={styles.lightbox} onClick={onClose} role="dialog">
      <div className={styles.lightboxStage} onClick={(event) => event.stopPropagation()}>
        {usable ? (
          <Image alt={current.alt} className={styles.lightboxImage} fill key={current.id} onError={() => setFailed((value) => new Set(value).add(current.id))} sizes="100vw" src={current.url!} unoptimized />
        ) : (
          <p className={styles.lightboxMissing} role="status">This photo could not be loaded.</p>
        )}
      </div>
      <button aria-label="Close photo" className={styles.lightboxClose} onClick={onClose} ref={closeRef} type="button"><CloseIcon className="size-5" /></button>
      {photos.length > 1 && (
        <>
          <button aria-label="Previous photo" className={`${styles.lightboxNav} ${styles.lightboxPrev}`} onClick={(event) => { event.stopPropagation(); step(-1); }} type="button"><ArrowLeftIcon className="size-5" /></button>
          <button aria-label="Next photo" className={`${styles.lightboxNav} ${styles.lightboxNext}`} onClick={(event) => { event.stopPropagation(); step(1); }} type="button"><ArrowRightIcon className="size-5" /></button>
          <p className={styles.lightboxCount}>{index + 1} / {photos.length}</p>
        </>
      )}
    </div>
  );
}
