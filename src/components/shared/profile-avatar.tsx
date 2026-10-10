"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ProfileAvatarProps = {
  className?: string;
  imageClassName?: string;
  name: string;
  src: string | null;
};

function stableImageKey(src: string) {
  try {
    return new URL(src).pathname;
  } catch {
    return src.split("?")[0];
  }
}

/** Shared avatar with initials fallback and one signed-URL refresh attempt per Storage object. */
export function ProfileAvatar({ className = "size-10", imageClassName = "", name, src }: ProfileAvatarProps) {
  const router = useRouter();
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  function handleError() {
    setFailedSrc(src);
    if (!src) return;
    const key = `dear-days:profile-media-refresh:${stableImageKey(src)}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    router.refresh();
  }

  return (
    <span aria-hidden="true" className={`font-display relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-green)] text-white ${className}`}>
      {src && failedSrc !== src ? (
        // eslint-disable-next-line @next/next/no-img-element -- private signed URLs refresh through the component's error handler
        <img alt="" className={`size-full object-cover ${imageClassName}`} onError={handleError} src={src} />
      ) : name.charAt(0).toUpperCase()}
    </span>
  );
}
