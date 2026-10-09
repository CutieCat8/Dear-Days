import Image from "next/image";
import type { ReactNode } from "react";

import { DitherCover } from "@/components/shared/dither-cover";
import type { Room } from "@/lib/contracts/types";

export const THEME_LABELS: Record<Room["theme"], string> = {
  sunrise: "Sunrise",
  rose: "Rose",
  night: "Night",
};

const THEME_COVER_IMAGES: Record<Room["theme"], string> = {
  sunrise: "/covers/themes/sunrise.webp",
  rose: "/covers/themes/rose.webp",
  night: "/covers/themes/night.webp",
};

/** Default dithered cover until rooms can store their own image (next step). */
export const DEFAULT_ROOM_COVER_IMAGE = "/covers/foggy-mountains.jpg";

type RoomCoverProps = {
  theme: Room["theme"];
  className?: string;
  children?: ReactNode;
  /** When set, the image is dithered as the cover instead of the theme photograph. */
  image?: string;
};

/** Theme photograph; pass `image` to use a dithered custom cover instead. */
export function RoomCover({ theme, className = "", children, image }: RoomCoverProps) {
  if (image) {
    return (
      <div className={`relative isolate overflow-hidden bg-[var(--color-cream-200)] ${className}`}>
        <DitherCover src={image} />
        {children}
      </div>
    );
  }

  return (
    <div className={`relative isolate overflow-hidden bg-[var(--color-cream-200)] ${className}`}>
      <Image
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-10 size-full object-cover"
        fill
        sizes="(min-width: 1024px) 40vw, (min-width: 640px) 50vw, 100vw"
        src={THEME_COVER_IMAGES[theme]}
      />
      {children}
    </div>
  );
}
