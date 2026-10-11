export const BOOK_KINDS = ["monthly", "yearbook", "highlights"] as const;
export type BookKind = (typeof BOOK_KINDS)[number];

/** Names and one-line descriptions shared by the 3D books, the reader covers and the mobile shelf. */
export const BOOK_INFO: Record<BookKind, { title: string; tagline: string }> = {
  monthly: { title: "Monthly", tagline: "One month, day by day" },
  yearbook: { title: "Yearbook", tagline: "A whole year at a glance" },
  highlights: { title: "Highlights", tagline: "The days you starred" },
};
