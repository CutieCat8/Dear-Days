"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { CloseIcon, SearchIcon } from "@/components/shared/icons";
import dropdown from "@/components/ui/dropdown.module.css";

type PlaceOption = { id: string; label: string };

type PlaceFilterProps = {
  /** Every place tag of the room. */
  places: PlaceOption[];
  /** Places already in the URL when the page loaded. */
  selectedIds: string[];
  /** Name of the form field; one hidden input per selected place is submitted under it. */
  name: string;
};

/** Type to search the room's places, pick one or more, and they stay as removable chips (submitted with the filter form). */
export function PlaceFilter({ places, selectedIds, name }: PlaceFilterProps) {
  const [selected, setSelected] = useState<string[]>(selectedIds);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const listId = useId();

  const byId = useMemo(() => new Map(places.map((place) => [place.id, place])), [places]);
  const matches = useMemo(() => {
    const needle = draft.trim().toLowerCase();
    return places.filter((place) => !selected.includes(place.id) && (!needle || place.label.toLowerCase().includes(needle)));
  }, [places, selected, draft]);

  const pick = (id: string) => {
    setSelected((current) => (current.includes(id) ? current : [...current, id]));
    setDraft("");
    setActive(0);
    inputRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) => Math.min(Math.max(0, matches.length - 1), Math.max(0, index + step)));
    } else if (event.key === "Enter") {
      // Enter picks the highlighted place instead of submitting the filter form.
      if (open && matches[active]) {
        event.preventDefault();
        pick(matches[active].id);
      } else if (open) {
        event.preventDefault();
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    } else if (event.key === "Backspace" && !draft && selected.length) {
      setSelected((current) => current.slice(0, -1));
    }
  };

  const showList = open && places.length > 0;

  return (
    <div>
      <label className="field-label" htmlFor={inputId}>Places</label>
      {selected.map((id) => <input key={id} name={name} type="hidden" value={id} />)}
      <div className="relative">
        <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-paper)] transition focus-within:border-[var(--color-green)] focus-within:shadow-[0_0_0_3px_rgb(47_90_74/0.16)]">
          {selected.length ? (
            <ul aria-label="Selected places" className="flex flex-wrap gap-1.5 px-2.5 pt-2.5">
              {selected.map((id) => {
                const label = byId.get(id)?.label ?? "Place";
                return (
                  <li className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-cream-100)] py-1 pl-2.5 pr-1 text-[0.78rem] font-medium text-[var(--color-green-deep)]" key={id}>
                    {label}
                    <button aria-label={`Remove ${label}`} className="flex size-5 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-black/10" onClick={() => setSelected((current) => current.filter((item) => item !== id))} type="button">
                      <CloseIcon className="size-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
          <div className="flex items-center gap-2 px-3">
            <SearchIcon className="size-4 shrink-0 text-[var(--color-muted)]" />
            <input
              aria-autocomplete="list"
              aria-controls={listId}
              aria-expanded={showList}
              autoComplete="off"
              className="min-h-10 w-full bg-transparent text-[0.9rem] !outline-none placeholder:text-[#9ea49f]"
              id={inputId}
              onBlur={() => setOpen(false)}
              onChange={(event) => {
                setDraft(event.target.value);
                setActive(0);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              placeholder="Search places"
              ref={inputRef}
              role="combobox"
              value={draft}
            />
          </div>
        </div>

        <div className={dropdown.menu} data-open={showList || undefined}>
          <div className={dropdown.menuInner}>
            <ul className={dropdown.list} id={listId} role="listbox">
              {matches.length ? matches.map((place, index) => (
                <li
                  aria-selected={index === active}
                  className={dropdown.option}
                  data-active={index === active || undefined}
                  key={place.id}
                  // mousedown (not click): the input must not lose focus before the pick lands
                  onMouseDown={(event) => {
                    event.preventDefault();
                    pick(place.id);
                  }}
                  onPointerEnter={() => setActive(index)}
                  role="option"
                  style={{ ["--i" as string]: Math.min(index, 8), background: index === active ? "color-mix(in srgb, var(--color-sage) 70%, transparent)" : undefined }}
                >
                  {place.label}
                </li>
              )) : (
                <li className={dropdown.option} role="presentation" style={{ ["--i" as string]: 0 }}>
                  {draft.trim() ? "No matching places" : "All places are selected"}
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
      {places.length === 0 ? <p className="mt-1.5 text-xs text-[var(--color-muted)]">No places yet</p> : null}
    </div>
  );
}
