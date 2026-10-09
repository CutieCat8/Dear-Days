"use client";

import { Fragment, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { ChevronDownIcon } from "@/components/shared/icons";
import { cn } from "@/lib/utils";

import styles from "./dropdown.module.css";

export type DropdownOption = {
  value: string;
  label: string;
  icon?: ReactNode;
  /** Text color of this option while it is hovered, focused or selected. */
  color?: string;
  /** Draws a divider line under this option, to set it apart from the ones below (e.g. "All"). */
  separatorAfter?: boolean;
};

type DropdownProps = {
  options: DropdownOption[];
  /** Controlled value. Leave out and use `defaultValue` for an uncontrolled dropdown. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Submitted with the surrounding form under this name (as a hidden input). */
  name?: string;
  /** Id of the trigger button, so a <label htmlFor> can point at it. */
  id?: string;
  /** Icon shown in front of the label while closed. */
  icon?: ReactNode;
  /** Shown when nothing is selected. */
  placeholder?: string;
  disabled?: boolean;
  /** Accessible name when there is no visible <label>. */
  "aria-label"?: string;
  className?: string;
  /** Extra classes for the trigger, e.g. a smaller size. */
  triggerClassName?: string;
  /** "field" looks like a text field; "bare" is just icon + label + chevron, with no box, for filter rows. */
  variant?: "field" | "bare";
};

/**
 * Replacement for the native <select>: icon + label + chevron when closed; a box that drops down and reveals its
 * options one after another when open; and a soft highlight that glides to the option under the pointer or keyboard.
 */
export function Dropdown({ options, value, defaultValue, onChange, name, id, icon, placeholder = "Select", disabled, className, triggerClassName, variant = "field", ...rest }: DropdownProps) {
  const [inner, setInner] = useState(defaultValue ?? options[0]?.value ?? "");
  const current = value ?? inner;
  const selectedIndex = options.findIndex((option) => option.value === current);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(selectedIndex);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [highlight, setHighlight] = useState<{ top: number; height: number } | null>(null);
  const listId = useId();

  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    if (value === undefined) setInner(option.value);
    if (option.value !== current) onChange?.(option.value);
    close(true);
  };

  const openList = () => {
    setActive(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  };

  // The highlight rests on the active option (the selected one on open; the hovered or arrowed-to one afterwards).
  useLayoutEffect(() => {
    const item = itemRefs.current[active];
    setHighlight(open && item ? { top: item.offsetTop, height: item.offsetHeight } : null);
  }, [active, open]);

  // Keep the arrowed-to option visible in a long list.
  useEffect(() => {
    if (open) itemRefs.current[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const onKeyDown = (event: KeyboardEvent) => {
    const last = options.length - 1;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp": {
        event.preventDefault();
        if (!open) return openList();
        const step = event.key === "ArrowDown" ? 1 : -1;
        setActive((index) => Math.min(last, Math.max(0, index + step)));
        return;
      }
      case "Home":
      case "End":
        if (!open) return;
        event.preventDefault();
        setActive(event.key === "Home" ? 0 : last);
        return;
      case "Enter":
      case " ":
        if (!open) return; // the button's own click opens it
        event.preventDefault();
        choose(active);
        return;
      case "Escape":
        if (!open) return;
        event.preventDefault();
        close(true);
        return;
      case "Tab":
        setOpen(false);
        return;
    }
  };

  return (
    <div className={cn(styles.root, className)} onKeyDown={onKeyDown} ref={rootRef}>
      {name ? <input name={name} type="hidden" value={current} /> : null}
      <button
        aria-controls={listId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={rest["aria-label"]}
        className={cn(variant === "field" ? "field-input" : styles.bare, styles.trigger, triggerClassName)}
        disabled={disabled}
        id={id}
        onClick={() => (open ? close(false) : openList())}
        ref={triggerRef}
        type="button"
      >
        {icon ? <span aria-hidden="true" className={styles.icon}>{icon}</span> : null}
        <span className={cn(styles.label, !selected && styles.placeholder)}>{selected?.label ?? placeholder}</span>
        <ChevronDownIcon aria-hidden="true" className={styles.chevron} data-open={open || undefined} />
      </button>

      <div className={styles.menu} data-open={open || undefined}>
        <div className={styles.menuInner}>
          <ul aria-label={rest["aria-label"]} className={styles.list} id={listId} onPointerLeave={() => setActive(selectedIndex)} role="listbox" tabIndex={-1}>
            <li aria-hidden="true" className={styles.highlight} style={highlight ? { height: highlight.height, opacity: 1, transform: `translateY(${highlight.top}px)` } : undefined} />
            {options.map((option, index) => (
              <Fragment key={option.value}>
              <li
                aria-selected={index === selectedIndex}
                className={styles.option}
                data-active={(open && index === active) || undefined}
                data-selected={index === selectedIndex || undefined}
                onClick={() => choose(index)}
                onPointerEnter={() => setActive(index)}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                role="option"
                style={{ ["--i" as string]: index, ...(option.color ? { ["--option-color" as string]: option.color } : null) }}
              >
                {option.icon ? <span aria-hidden="true" className={styles.icon}>{option.icon}</span> : null}
                <span>{option.label}</span>
              </li>
              {option.separatorAfter ? <li aria-hidden="true" className={styles.separator} role="presentation" /> : null}
              </Fragment>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
