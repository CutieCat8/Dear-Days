"use client";

import Image from "next/image";

import { CloseIcon } from "@/components/shared/icons";
import type { Memory } from "@/lib/contracts/types";

import { resolveMemoryCover } from "./memory-cover";
import styles from "./museum-scene.module.css";

type FramePickerProps = {
  /** Photo memories that can hang in a frame, newest first. */
  photos: Memory[];
  /** Memory currently in the chosen frame. */
  currentId: string;
  /** Memories that hang in some other frame right now. */
  hangingIds: Set<string>;
  saving: boolean;
  error: string | null;
  onChoose: (memoryId: string) => void;
  onClose: () => void;
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

/** Side panel in "Arrange frames" mode: pick which photo memory hangs in the selected frame. */
export function FramePicker({ photos, currentId, hangingIds, saving, error, onChoose, onClose }: FramePickerProps) {
  return (
    <aside aria-label="Choose a photo for this frame" className={styles.panel}>
      <div className={styles.panelHead}>
        <h2 className={styles.panelTitle}>Choose a photo for this frame</h2>
        <div className={styles.iconRow}>
          <button aria-label="Close frame picker" className={styles.iconButton} onClick={onClose} type="button"><CloseIcon className="size-4" /></button>
        </div>
      </div>
      <p className={styles.pickerHint}>Pick a memory to hang here. If it is already in another frame, the two frames swap.</p>
      {error && <p className={styles.pickerError} role="alert">{error}</p>}
      <ul aria-busy={saving} className={styles.pickerList}>
        {photos.map((memory) => {
          const cover = resolveMemoryCover(memory);
          const here = memory.id === currentId;
          return (
            <li key={memory.id}>
              <button aria-pressed={here} className={styles.pickerItem} data-current={here || undefined} disabled={saving || here} onClick={() => onChoose(memory.id)} type="button">
                <span className={styles.pickerThumb}>
                  {cover && <Image alt="" fill sizes="56px" src={cover.url} unoptimized />}
                </span>
                <span className={styles.pickerText}>
                  <span className={styles.pickerTitle}>{memory.title}</span>
                  <span className={styles.pickerMeta}>
                    {formatDate(memory.memory_date)}
                    {here ? " · In this frame" : hangingIds.has(memory.id) ? " · In another frame" : ""}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
