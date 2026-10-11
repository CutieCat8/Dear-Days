/**
 * Frame templates for the photos of one memory. A template is a row of columns; each column stacks `rows` equal
 * cells, so every column fills the same total height and the gaps are the same everywhere.
 * Photos are placed column by column, top to bottom, in their original order. Edit this table to change a layout;
 * nothing else depends on the shape of a particular count.
 *
 *   8 photos:  small ×3 │ large ×2 │ small ×3
 */
export type PhotoTemplate = { columns: { span: number; rows: number }[] };

export const MAX_FRAME_PHOTOS = 8;

const TEMPLATES: Record<number, PhotoTemplate> = {
  1: { columns: [{ span: 1, rows: 1 }] },
  2: { columns: [{ span: 1, rows: 1 }, { span: 1, rows: 1 }] },
  3: { columns: [{ span: 1.3, rows: 1 }, { span: 1, rows: 2 }] },
  4: { columns: [{ span: 1, rows: 2 }, { span: 1, rows: 2 }] },
  5: { columns: [{ span: 1, rows: 2 }, { span: 1.3, rows: 1 }, { span: 1, rows: 2 }] },
  6: { columns: [{ span: 1, rows: 2 }, { span: 1, rows: 2 }, { span: 1, rows: 2 }] },
  7: { columns: [{ span: 1, rows: 3 }, { span: 1.3, rows: 1 }, { span: 1, rows: 3 }] },
  8: { columns: [{ span: 1, rows: 3 }, { span: 1.3, rows: 2 }, { span: 1, rows: 3 }] },
};

export function photoTemplate(count: number): PhotoTemplate | null {
  return TEMPLATES[count] ?? null;
}

/** Splits the photos into the template's columns without repeating, dropping or reordering any. */
export function placePhotos<T>(photos: readonly T[]): { span: number; photos: T[] }[] {
  const template = photoTemplate(Math.min(photos.length, MAX_FRAME_PHOTOS));
  if (!template) return [];
  let next = 0;
  return template.columns.map((column) => {
    const cells = photos.slice(next, next + column.rows);
    next += column.rows;
    return { span: column.span, photos: cells };
  });
}

/** The share of a page's content height the frame takes on a first page, by photo count and page width. */
export function frameHeightRatio(count: number, compact: boolean): number {
  if (count <= 0) return 0;
  if (compact) return count >= 5 ? 0.62 : 0.34;
  return count >= 5 ? 0.46 : 0.4;
}

/** A narrow page cannot hold a readable many-photo frame and the start of the story: the photos get their own page. */
export function photosNeedOwnPage(count: number, compact: boolean): boolean {
  return compact && count >= 5;
}
