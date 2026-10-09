"use client";

import Image from "next/image";
import { useState } from "react";

import { ArrowLeftIcon, ArrowRightIcon } from "@/components/shared/icons";

type ViewerPhoto = { id: string; url: string; alt: string };

export function PhotoViewer({ photos, initialId, title }: { photos: ViewerPhoto[]; initialId?: string; title: string }) {
  const start = Math.max(0, photos.findIndex((photo) => photo.id === initialId));
  const [index, setIndex] = useState(start);
  const current = photos[index];

  if (!current) return null;

  const go = (delta: number) => setIndex((value) => (value + delta + photos.length) % photos.length);

  return (
    <div className="min-w-0">
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[var(--color-sage)] shadow-[var(--shadow-card)]">
        <Image alt={current.alt || title} className="object-cover" fill priority sizes="(max-width: 1280px) 100vw, 520px" src={current.url} />
        {photos.length > 1 ? (
          <>
            <span className="absolute right-2.5 top-2.5 rounded-full bg-black/45 px-2.5 py-0.5 text-[0.68rem] font-medium text-white">{index + 1} / {photos.length}</span>
            <button aria-label="Previous photo" className="absolute left-2.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[var(--color-green-deep)] backdrop-blur-sm transition-colors hover:bg-white" onClick={() => go(-1)} type="button">
              <ArrowLeftIcon className="size-4" />
            </button>
            <button aria-label="Next photo" className="absolute right-2.5 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-[var(--color-green-deep)] backdrop-blur-sm transition-colors hover:bg-white" onClick={() => go(1)} type="button">
              <ArrowRightIcon className="size-4" />
            </button>
          </>
        ) : null}
      </div>

      {photos.length > 1 ? (
        <ul aria-label="All photos" className="mt-2 grid grid-cols-4 gap-2">
          {photos.map((photo, photoIndex) => (
            <li key={photo.id}>
              <button
                aria-current={photoIndex === index ? "true" : undefined}
                aria-label={`Show photo ${photoIndex + 1}`}
                className={`relative block aspect-[4/3] w-full overflow-hidden rounded-lg bg-[var(--color-sage)] transition-shadow ${photoIndex === index ? "ring-2 ring-[var(--color-button)] ring-offset-2 ring-offset-[var(--color-paper)]" : "opacity-80 hover:opacity-100"}`}
                onClick={() => setIndex(photoIndex)}
                type="button"
              >
                <Image alt="" className="object-cover" fill sizes="120px" src={photo.url} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
