"use client";

import dynamic from "next/dynamic";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { createBrowserDataSource } from "@/lib/data/browser";
import type { BookKind } from "@/lib/books/books";

/** The reader (and everything it needs: the flip engine, page layouts) is only downloaded when a book is opened. */
const BookReader = dynamic(() => import("./book-reader"), { ssr: false });

export type RoomBooksValue = {
  roomId: string;
  roomName: string;
  /** Years that already hold memories or the room itself, so the year pickers start somewhere sensible. */
  yearAnchors: number[];
  openBook: (kind: BookKind) => void;
  /** The signed-in person's own stars. `available` is false when they could not be loaded: stars are then disabled. */
  favoriteIds: ReadonlySet<string>;
  favoritesAvailable: boolean;
  pendingFavoriteIds: ReadonlySet<string>;
  /** Stars or un-stars a memory for the signed-in person. Resolves to an error message, or null when it was saved. */
  toggleFavorite: (memoryId: string) => Promise<string | null>;
};

const RoomBooksContext = createContext<RoomBooksValue | null>(null);

export function useRoomBooks(): RoomBooksValue {
  const value = useContext(RoomBooksContext);
  if (!value) throw new Error("useRoomBooks must be used inside <RoomBooksProvider>");
  return value;
}

type ProviderProps = {
  roomId: string;
  roomName: string;
  yearAnchors: number[];
  /** null: the stars could not be read on the server (they are not guessed). */
  initialFavoriteIds: string[] | null;
  children: ReactNode;
};

/** Holds which book is open and the person's stars for one room, and renders the reader above the page. */
export function RoomBooksProvider({ roomId, roomName, yearAnchors, initialFavoriteIds, children }: ProviderProps) {
  const [openKind, setOpenKind] = useState<BookKind | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<ReadonlySet<string>>(() => new Set(initialFavoriteIds ?? []));
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set());
  const favoritesAvailable = initialFavoriteIds !== null;
  const latest = useRef(favoriteIds);
  useEffect(() => {
    latest.current = favoriteIds;
  }, [favoriteIds]);
  const inFlight = useRef(new Set<string>());

  const openBook = useCallback((kind: BookKind) => setOpenKind(kind), []);
  const closeBook = useCallback(() => setOpenKind(null), []);

  const toggleFavorite = useCallback(
    async (memoryId: string) => {
      if (inFlight.current.has(memoryId)) return null;
      inFlight.current.add(memoryId);
      setPending(new Set(inFlight.current));
      const want = !latest.current.has(memoryId);
      const result = await createBrowserDataSource().setMemoryFavorite(roomId, memoryId, want);
      inFlight.current.delete(memoryId);
      setPending(new Set(inFlight.current));
      if (!result.ok) return result.error.message;
      setFavoriteIds((current) => {
        const next = new Set(current);
        if (want) next.add(memoryId);
        else next.delete(memoryId);
        return next;
      });
      return null;
    },
    [roomId],
  );

  const value = useMemo<RoomBooksValue>(
    () => ({ roomId, roomName, yearAnchors, openBook, favoriteIds, favoritesAvailable, pendingFavoriteIds: pending, toggleFavorite }),
    [roomId, roomName, yearAnchors, openBook, favoriteIds, favoritesAvailable, pending, toggleFavorite],
  );

  return (
    <RoomBooksContext.Provider value={value}>
      {children}
      {openKind && <BookReader initialKind={openKind} onClose={closeBook} />}
    </RoomBooksContext.Provider>
  );
}
