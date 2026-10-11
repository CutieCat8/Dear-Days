import { CalendarIcon, LeafIcon, StarIcon } from "@/components/shared/icons";
import { BOOK_INFO, type BookKind } from "@/lib/books/books";

import styles from "./books.module.css";

function Emblem({ kind }: { kind: BookKind }) {
  if (kind === "monthly") return <CalendarIcon className={styles.emblem} />;
  if (kind === "highlights") return <StarIcon className={styles.emblem} fill="currentColor" />;
  return <LeafIcon className={styles.emblem} />;
}

/** The front cover of a book. Each book has its own colour, emblem and title; the size follows the font size of its parent. */
export function BookCover({ kind, subtitle, roomName }: { kind: BookKind; subtitle: string; roomName?: string }) {
  const info = BOOK_INFO[kind];
  return (
    <div className={`${styles.cover} ${styles[`cover_${kind}`]}`}>
      <div className={styles.coverFrame}>
        <p className={styles.coverBrand}>Dear Days</p>
        <Emblem kind={kind} />
        <h2 className={styles.coverTitle}>{info.title}</h2>
        <p className={styles.coverSubtitle}>{subtitle}</p>
        <p className={styles.coverTagline}>{info.tagline}</p>
        {roomName ? <p className={styles.coverRoom}>{roomName}</p> : null}
      </div>
      <span aria-hidden="true" className={styles.coverRibbon} />
    </div>
  );
}
