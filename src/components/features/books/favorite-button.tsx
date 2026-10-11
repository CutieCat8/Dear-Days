"use client";

import { useState } from "react";

import { StarIcon } from "@/components/shared/icons";
import { createBrowserDataSource } from "@/lib/data/browser";
import { cn } from "@/lib/utils";

import { useRoomBooks } from "./room-books";

type StarToggleProps = {
  starred: boolean;
  pending?: boolean;
  disabled?: boolean;
  /** Short name of what is starred, for screen readers: "A perfect study break". */
  label: string;
  onToggle: () => void;
  withLabel?: boolean;
  className?: string;
  tabIndex?: number;
};

/** One star button for every place a memory can be starred: the reader pages, the 3D panel and the memory page. */
export function StarToggle({ starred, pending = false, disabled = false, label, onToggle, withLabel = false, className, tabIndex }: StarToggleProps) {
  return (
    <button
      aria-label={starred ? `Remove “${label}” from your favorites` : `Add “${label}” to your favorites`}
      aria-pressed={starred}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full border text-xs font-medium transition-colors focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-55",
        withLabel ? "h-8 px-3" : "size-8",
        starred
          ? "border-[var(--color-honey)] bg-[var(--color-honey)]/30 text-[#8a6410]"
          : "border-[var(--color-border-strong)] bg-white/60 text-[var(--color-muted)] hover:border-[var(--color-honey)] hover:text-[#8a6410]",
        className,
      )}
      disabled={disabled || pending}
      onClick={onToggle}
      tabIndex={tabIndex}
      title={disabled ? "Favorites are unavailable right now" : starred ? "Remove from favorites" : "Add to favorites"}
      type="button"
    >
      <StarIcon className="size-4" fill={starred ? "currentColor" : "none"} />
      {withLabel ? <span>{starred ? "Favorited" : "Favorite"}</span> : null}
    </button>
  );
}

/** The star inside a room (3D panel): uses the room's shared favorites state, so the books and the panel always agree. */
export function RoomMemoryStar({ memoryId, title }: { memoryId: string; title: string }) {
  const { favoriteIds, favoritesAvailable, pendingFavoriteIds, toggleFavorite } = useRoomBooks();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-1">
      <StarToggle
        disabled={!favoritesAvailable}
        label={title}
        onToggle={async () => setError(await toggleFavorite(memoryId))}
        pending={pendingFavoriteIds.has(memoryId)}
        starred={favoriteIds.has(memoryId)}
        withLabel
      />
      {error ? <p className="text-xs text-[#86472f]" role="alert">{error}</p> : null}
    </div>
  );
}

/** The star on a memory's own page, which is outside a room scene: it reads and saves just this one memory. */
export function MemoryFavoriteButton({ roomId, memoryId, title, initialStarred, available }: { roomId: string; memoryId: string; title: string; initialStarred: boolean; available: boolean }) {
  const [starred, setStarred] = useState(initialStarred);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    setPending(true);
    setError(null);
    const want = !starred;
    const result = await createBrowserDataSource().setMemoryFavorite(roomId, memoryId, want);
    setPending(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setStarred(want);
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <StarToggle disabled={!available} label={title} onToggle={toggle} pending={pending} starred={starred} withLabel />
      {error ? <p className="text-xs text-[#86472f]" role="alert">{error}</p> : null}
    </div>
  );
}
