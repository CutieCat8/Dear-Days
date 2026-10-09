"use client";

import { useEffect, useRef, useState } from "react";

import DitherImage from "@/components/ui/dither-image";

// Brand ramp (deep green -> cream) so the dither matches the app instead of black/white.
const COVER_PALETTE = ["#21463a", "#f5f2e9"];

type DitherCoverProps = {
  src: string;
  alt?: string;
};

/**
 * Fills its (positioned) parent with a dithered image. DitherImage needs a pixel
 * size, so we measure the parent and re-render when it resizes.
 */
export function DitherCover({ src, alt = "" }: DitherCoverProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width > 0 && height > 0) setSize({ width: Math.round(width), height: Math.round(height) });
    };

    measure();
    const observer = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(measure, 120);
    });
    observer.observe(element);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  return (
    <div aria-hidden={alt === "" ? true : undefined} className="absolute inset-0 -z-10" ref={ref}>
      {size ? (
        <DitherImage
          algorithm="bayer"
          alt={alt}
          className="rounded-none"
          height={size.height}
          levels={4}
          palette={COVER_PALETTE}
          pixelSize={3}
          src={src}
          width={size.width}
        />
      ) : null}
    </div>
  );
}
