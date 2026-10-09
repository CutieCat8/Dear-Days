"use client";

import { useId, useState, type ReactNode, type TransitionEvent } from "react";

import { ChevronDownIcon, SearchIcon } from "@/components/shared/icons";

import styles from "./filter-panel.module.css";

type FilterPanelProps = {
  title?: string;
  /** How many filters are active right now; shown next to the title while the panel is folded. */
  activeCount?: number;
  /** Start unfolded (e.g. when the page was opened with filters in the URL). */
  defaultOpen?: boolean;
  children: ReactNode;
};

/** A panel that folds into a single header row and grows downwards when opened. The form inside keeps its values while folded. */
export function FilterPanel({ title = "Filters", activeCount = 0, defaultOpen = false, children }: FilterPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  // While the panel animates its contents are clipped; once fully open they may overflow (dropdown menus hang below the fields).
  const [settled, setSettled] = useState(defaultOpen);
  const bodyId = useId();

  const toggle = () => {
    setOpen((value) => !value);
    setSettled(false);
  };

  const onTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && open) setSettled(true);
  };

  return (
    <section aria-label="Gallery filters" className="panel mt-5">
      <button aria-controls={bodyId} aria-expanded={open} className={styles.header} onClick={toggle} type="button">
        <span className={styles.title}>
          <SearchIcon className="size-4 text-[var(--color-sage-strong)]" />
          {title}
          {activeCount > 0 ? <span className={styles.count}>{activeCount} active</span> : null}
        </span>
        <ChevronDownIcon aria-hidden="true" className={styles.chevron} data-open={open || undefined} />
      </button>
      <div className={styles.body} data-open={open || undefined} id={bodyId} inert={!open} onTransitionEnd={onTransitionEnd}>
        <div className={styles.inner} data-settled={settled || undefined}>
          <div className={styles.content}>{children}</div>
        </div>
      </div>
    </section>
  );
}
