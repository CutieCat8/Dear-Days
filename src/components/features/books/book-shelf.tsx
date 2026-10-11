"use client";

import { BOOK_INFO, BOOK_KINDS, type BookKind } from "@/lib/books/books";

import { BookCover } from "./book-cover";
import { useRoomBooks } from "./room-books";
import styles from "./books.module.css";

const SHELF_SUBTITLE: Record<BookKind, string> = { monthly: "This month", yearbook: "This year", highlights: "Starred" };

/** The three books as covers, for small screens (where the 3D room is not the way in) and as a plain button path. */
export function BookShelf() {
  const { openBook } = useRoomBooks();
  return (
    <section aria-labelledby="books-heading">
      <h2 className="title-md mb-3" id="books-heading">Books</h2>
      <ul className={styles.shelf}>
        {BOOK_KINDS.map((kind) => (
          <li key={kind}>
            <button aria-label={`Open the ${BOOK_INFO[kind].title} book: ${BOOK_INFO[kind].tagline}`} className={styles.shelfBook} onClick={() => openBook(kind)} type="button">
              <BookCover kind={kind} subtitle={SHELF_SUBTITLE[kind]} />
            </button>
            <p className="mt-2 text-center text-xs text-[var(--color-muted)]">{BOOK_INFO[kind].tagline}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
