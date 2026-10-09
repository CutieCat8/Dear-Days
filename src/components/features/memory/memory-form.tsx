"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent } from "react";

import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { Dropdown } from "@/components/ui/dropdown";
import { CalendarIcon, CameraIcon, CloseIcon, DoorIcon, EditIcon, FrownIcon, GripIcon, InfoIcon, LeafIcon, LockIcon, MehIcon, PinIcon, SearchIcon, SmileIcon, SparkleIcon, StarIcon, TrashIcon, UsersIcon } from "@/components/shared/icons";
import { MEDIA_CONSTRAINTS, MOOD_LABELS, MOODS } from "@/lib/contracts/constants";
import type { Memory, MemoryInput, Mood, NewMediaUpload, Room, Tag } from "@/lib/contracts/types";
import { createBrowserDataSource } from "@/lib/data/browser";
import { localDateString } from "@/lib/local-date";

type MemoryFormProps = {
  mode: "create" | "edit";
  /** Room from the URL; preselected in the room picker when creating. */
  room: Room;
  /** Rooms the user can post to. Only used when creating. */
  rooms?: Room[];
  memory?: Memory;
  /** Existing tags of the rooms above, offered as suggestions (reused case-insensitively by the database). */
  tags?: Tag[];
};

type Photo = { id: string; url: string; name: string; error?: string; file?: File };

const MOOD_ICONS: Record<Mood, typeof SmileIcon> = { awful: FrownIcon, stressed: MehIcon, sad: FrownIcon, relaxed: LeafIcon, happy: SmileIcon, excited: SparkleIcon };
const MAX_BODY = 10_000;

const subscribeNever = () => () => {};

export function MemoryForm({ mode, room: initialRoom, rooms = [initialRoom], memory, tags: knownTags = [] }: MemoryFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const isEdit = mode === "edit";
  const [roomId, setRoomId] = useState(initialRoom.id);
  const room = rooms.find((item) => item.id === roomId) ?? initialRoom;
  const [title, setTitle] = useState(memory?.title ?? "");
  // The server renders in its own time zone: the default day is read on the device (the person's local day), "" while hydrating.
  const today = useSyncExternalStore(subscribeNever, () => localDateString(), () => "");
  const [pickedDate, setDate] = useState<string | null>(memory?.memory_date ?? null);
  const date = pickedDate ?? today;
  const [body, setBody] = useState(memory?.body ?? "");
  const [mood, setMood] = useState<Mood | null>(memory?.mood ?? null);
  const [people, setPeople] = useState(memory?.tags.filter((tag) => tag.type === "person").map((tag) => tag.label) ?? []);
  const [places, setPlaces] = useState(memory?.tags.filter((tag) => tag.type === "place").map((tag) => tag.label) ?? []);
  const [photos, setPhotos] = useState<Photo[]>(
    memory?.media.map((item) => ({ id: item.id, url: item.signed_url ?? "", name: item.alt_text })) ?? [],
  );
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [coverId, setCoverId] = useState<string | null>(memory?.cover_media_id ?? null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const cover = photos.find((photo) => photo.id === coverId) ?? photos[0];
  const objectUrls = useRef<string[]>([]);

  useEffect(() => {
    const urls = objectUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const next: Photo[] = [];
    let message: string | null = null;

    for (const file of Array.from(files)) {
      if (photos.length + next.length >= MEDIA_CONSTRAINTS.maxFiles) {
        message = `You can upload up to ${MEDIA_CONSTRAINTS.maxFiles} photos`;
        break;
      }
      if (!(MEDIA_CONSTRAINTS.acceptedMimeTypes as readonly string[]).includes(file.type)) {
        message = "Only JPEG, PNG and WebP files are supported";
        continue;
      }
      if (file.size > MEDIA_CONSTRAINTS.maxFileBytes) {
        message = "Each file must be 10 MB or smaller";
        continue;
      }
      const url = URL.createObjectURL(file);
      objectUrls.current.push(url);
      next.push({ id: crypto.randomUUID(), url, name: file.name.replace(/\.[^.]+$/, ""), file });
    }

    setPhotoError(message);
    setPhotos((current) => [...current, ...next]);
  }

  function movePhoto(id: string, targetIndex: number) {
    setPhotos((current) => {
      const from = current.findIndex((photo) => photo.id === id);
      if (from === -1 || targetIndex < 0 || targetIndex >= current.length || from === targetIndex) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  /** Builds the contract's MemoryInput + the new files, then saves through the data layer (database + private Storage). */
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const existingIds = new Set(memory?.media.map((item) => item.id) ?? []);
    const kept = photos.filter((photo) => !photo.file);
    const added = photos.filter((photo): photo is Photo & { file: File } => Boolean(photo.file));
    const reference = (photo: Photo) => (photo.file ? ({ kind: "new", client_id: photo.id } as const) : ({ kind: "existing", id: photo.id } as const));

    const input: MemoryInput = {
      title,
      body,
      memory_date: date,
      mood,
      period_label: memory?.period_label ?? null,
      tags: [...people.map((label) => ({ type: "person" as const, label })), ...places.map((label) => ({ type: "place" as const, label }))],
      media: {
        existing: kept.map((photo) => ({ id: photo.id, alt_text: photo.name })),
        added: added.map((photo) => ({ client_id: photo.id, file_name: photo.file.name, mime_type: photo.file.type as NewMediaUpload["mime_type"], size_bytes: photo.file.size, alt_text: photo.name })),
        removed_media_ids: [...existingIds].filter((id) => !kept.some((photo) => photo.id === id)),
        order: photos.map(reference),
        cover: cover ? reference(cover) : null,
      },
    };
    const uploads: NewMediaUpload[] = added.map((photo) => ({ client_id: photo.id, file_name: photo.file.name, mime_type: photo.file.type as NewMediaUpload["mime_type"], size_bytes: photo.file.size, alt_text: photo.name, file: photo.file }));

    setSaving(true);
    const source = createBrowserDataSource();
    const result = isEdit && memory ? await source.updateMemory(room.id, memory.id, input, uploads) : await source.createMemory(room.id, input, uploads);
    if (!result.ok) {
      // everything typed and every chosen photo stays in the form so the user can simply try again
      setFormError(result.error.message);
      setFieldErrors(result.error.field_errors ?? {});
      setSaving(false);
      return;
    }
    router.push(`/rooms/${room.id}/memories/${result.data.id}`);
    router.refresh();
  }

  return (
    <div>
    <Breadcrumbs
      card
      items={[{ label: "Home", href: "/" }, { label: room.name, href: `/rooms/${room.id}` }, { label: isEdit ? "Edit memory" : "New memory" }]}
      right={<><span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-sage)]/70 px-2.5 py-1 text-[0.7rem] font-medium text-[var(--color-green-deep)]"><LockIcon className="size-3.5" /> Private room</span><span className="inline-flex items-center gap-1.5 text-[0.75rem]"><UsersIcon className="size-4" /> {room.member_count} members</span></>}
    />
    <form className="grid items-stretch gap-5 lg:grid-cols-[1fr_19rem]" onSubmit={handleSubmit}>
      <section className="panel grid gap-5 p-5 sm:p-7">
        <h1 className="title-xl">{isEdit ? "Edit memory" : "New memory"}</h1>

        <div>
          <label className="field-label" htmlFor="title">Title</label>
          <input className="field-input" id="title" maxLength={120} name="title" onChange={(event) => setTitle(event.target.value)} placeholder="e.g. A day at Doi Suthep" required value={title} />
        </div>

        <div>
          <label className="field-label" htmlFor="memory-date">Date</label>
          <div className="relative sm:max-w-56"><CalendarIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted)]" /><input className="field-input pl-9 [&::-webkit-calendar-picker-indicator]:hidden" id="memory-date" name="memory_date" onChange={(event) => setDate(event.target.value)} required type="date" value={date} /></div>
        </div>

        <div>
          <label className="field-label" htmlFor="body">Diary</label>
          <textarea className="field-input" id="body" maxLength={MAX_BODY} name="body" onChange={(event) => setBody(event.target.value)} placeholder="What do you want to remember?" required value={body} />
          <p className="mt-1 text-right text-[0.7rem] text-[var(--color-muted)]">{body.length.toLocaleString()} / {MAX_BODY.toLocaleString()}</p>
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="field-label !mb-0">Photos ({photos.length}/{MEDIA_CONSTRAINTS.maxFiles}) <small>(optional)</small></h2>
            <label className="btn btn-secondary btn-sm cursor-pointer">
              <CameraIcon className="size-3.5" /> Add photos
              <input accept={MEDIA_CONSTRAINTS.acceptedMimeTypes.join(",")} className="sr-only" multiple onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} type="file" />
            </label>
          </div>
          {photoError ? <p className="mb-3 rounded-lg bg-[#f8e3e3] px-3 py-2 text-xs text-[#8a3a3a]" role="alert">{photoError}</p> : null}
          {photos.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--color-border-strong)] px-4 py-7 text-center text-xs text-[var(--color-muted)]">No photos yet — JPEG, PNG or WebP, up to 10 MB each</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((photo, index) => {
                const isCover = photo.id === cover?.id;
                return (
                  <li
                    className={`group transition-opacity ${dragId === photo.id ? "opacity-50" : ""}`}
                    draggable
                    key={photo.id}
                    onDragEnd={() => setDragId(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDragStart={() => setDragId(photo.id)}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (dragId) movePhoto(dragId, index);
                      setDragId(null);
                    }}
                  >
                    <div className={`relative aspect-[4/3] overflow-hidden rounded-xl bg-[var(--color-sage)] ${isCover ? "ring-2 ring-[var(--color-green)] ring-offset-2 ring-offset-[var(--color-paper)]" : ""}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element -- blob/signed URLs are not optimizable */}
                      <img alt={photo.name} className="size-full object-cover" draggable={false} src={photo.url} />
                      <button
                        aria-label={`Reorder photo ${photo.name}. Drag, or use the left and right arrow keys.`}
                        className="absolute left-2 top-2 flex size-7 cursor-grab items-center justify-center rounded-md bg-white/70 text-[var(--color-green-deep)] backdrop-blur-sm transition-colors hover:bg-white/90 active:cursor-grabbing"
                        onKeyDown={(event) => {
                          if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); movePhoto(photo.id, index - 1); }
                          if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); movePhoto(photo.id, index + 1); }
                        }}
                        type="button"
                      >
                        <GripIcon className="size-4" />
                      </button>
                      <button
                        aria-label={`Remove photo ${photo.name}`}
                        className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-md bg-white/70 text-[#8a3a3a] backdrop-blur-sm transition-colors hover:bg-white/90"
                        onClick={() => setPhotos((current) => current.filter((item) => item.id !== photo.id))}
                        type="button"
                      >
                        <TrashIcon className="size-4" />
                      </button>
                      {isCover ? (
                        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-[var(--color-green-deep)] px-2 py-0.5 text-[0.62rem] font-medium text-white">
                          <StarIcon className="size-3" /> Cover photo
                        </span>
                      ) : (
                        <button
                          className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-white/70 px-2 py-0.5 text-[0.62rem] font-medium text-[var(--color-green-deep)] opacity-0 backdrop-blur-sm transition hover:bg-white/90 focus-visible:opacity-100 group-hover:opacity-100"
                          onClick={() => setCoverId(photo.id)}
                          type="button"
                        >
                          <StarIcon className="size-3" /> Set as cover
                        </button>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      
                      {editingId === photo.id ? (
                        <input
                          aria-label="Photo caption"
                          autoFocus
                          className="field-input min-w-0 flex-1 !min-h-6 !rounded-md !px-2 !py-0.5 !text-[0.7rem]"
                          maxLength={80}
                          onBlur={() => setEditingId(null)}
                          onChange={(event) => setPhotos((current) => current.map((item) => (item.id === photo.id ? { ...item, name: event.target.value } : item)))}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === "Escape") { event.preventDefault(); setEditingId(null); }
                          }}
                          value={photo.name}
                        />
                      ) : (
                        <p className="min-w-0 truncate text-[0.7rem] text-[var(--color-muted)]">{index + 1}. {photo.name || "Untitled"}</p>
                      )}
                      <button
                        aria-label={`Rename photo ${photo.name}`}
                        className="ml-auto flex size-6 shrink-0 items-center justify-center text-[var(--color-muted)] transition-colors hover:text-[var(--color-green-deep)]"
                        onClick={() => setEditingId(photo.id)}
                        type="button"
                      >
                        <EditIcon className="size-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <aside className="panel flex flex-col gap-5 p-5">
        <h2 className="title-lg">Memory settings</h2>

        <fieldset>
          <legend className="field-label">Mood <small>(optional)</small></legend>
          <div className="grid grid-cols-3 gap-1.5">
            {MOODS.map((value) => (
              <label className="cursor-pointer" key={value}>
                <input checked={mood === value} className="peer sr-only" name="mood" onChange={() => setMood(value)} onClick={() => mood === value && setMood(null)} type="radio" value={value} />
                <span className="mood-badge !min-h-10 w-full justify-center !rounded-lg border border-black/10 !px-1 !text-[0.68rem] ring-1 ring-transparent transition peer-checked:border-[var(--color-green-deep)] peer-checked:ring-[var(--color-green-deep)] peer-focus-visible:ring-[var(--color-green)]/50" data-mood={value}>
                  {(() => { const Icon = MOOD_ICONS[value]; return <Icon className="size-4" />; })()} {MOOD_LABELS[value]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <TagInput icon={<UsersIcon className="size-4" />} hint="People who were part of this memory." label="People tags" noun="people" onChange={setPeople} suggestions={knownTags.filter((tag) => tag.room_id === room.id && tag.type === "person").map((tag) => tag.label)} values={people} />
        <TagInput icon={<PinIcon className="size-4" />} hint="Places where this memory happened." label="Places tags" noun="places" onChange={setPlaces} suggestions={knownTags.filter((tag) => tag.room_id === room.id && tag.type === "place").map((tag) => tag.label)} values={places} />

        <div>
          <label className="field-label" htmlFor="room-id">Room</label>
          {isEdit || rooms.length < 2 ? (
            <p className="field-input flex items-center bg-[var(--color-cream-100)]" id="room-id">{room.name}</p>
          ) : (
            <Dropdown icon={<DoorIcon />} id="room-id" name="room_id" onChange={setRoomId} options={rooms.map((item) => ({ value: item.id, label: item.name }))} value={roomId} />
          )}
          {isEdit || rooms.length < 2 ? null : <p className="mt-1.5 text-[0.7rem] text-[var(--color-muted)]">Choose which room this memory is saved to.</p>}
        </div>

        <div className="mt-auto grid gap-3">
          {formError ? <p className="rounded-lg bg-[#f8e3e3] px-3 py-2 text-xs text-[#8a3a3a]" role="alert">{formError}{Object.values(fieldErrors).flat()[0] ? ` (${Object.values(fieldErrors).flat()[0]})` : ""}</p> : null}
          <button className="btn btn-primary disabled:opacity-60" disabled={saving} type="submit">{saving ? "Saving…" : isEdit ? "Save changes" : "Save memory"}</button>
          <Link className="btn btn-secondary" href={isEdit && memory ? `/rooms/${room.id}/memories/${memory.id}` : `/rooms/${room.id}`}>Cancel</Link>
        </div>
      </aside>
    </form>
    </div>
  );
}

type TagInputProps = {
  label: string;
  noun: string;
  hint: string;
  values: string[];
  suggestions: string[];
  icon: React.ReactNode;
  onChange: (values: string[]) => void;
};

function TagInput({ label, noun, hint, values, suggestions, icon, onChange }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const inputId = `tag-${label}`;
  const needle = draft.trim().toLowerCase();
  const matches = suggestions.filter((item) => !values.includes(item) && (!needle || item.toLowerCase().includes(needle)));

  function add(raw: string) {
    const value = raw.trim().slice(0, 50);
    if (value && !values.some((item) => item.toLowerCase() === value.toLowerCase())) onChange([...values, value]);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      add(draft);
    } else if (event.key === "Escape") {
      setOpen(false);
    } else if (event.key === "Backspace" && !draft && values.length) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="field-label !mb-0 flex items-center gap-1.5" htmlFor={inputId}>{icon} {label} <small>(optional)</small></label>
        <span className="text-[var(--color-muted)]" role="img" aria-label={hint} title={hint}><InfoIcon className="size-4" /></span>
      </div>
      <div className="relative rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-paper)] transition focus-within:border-[var(--color-green)] focus-within:shadow-[0_0_0_3px_rgb(47_90_74/0.16)]">
        {values.length ? (
          <ul aria-label={`Selected ${noun}`} className="flex flex-wrap gap-1.5 px-2.5 pt-2.5">
            {values.map((value) => (
              <li className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-cream-100)] py-1 pl-2.5 pr-1 text-[0.78rem] font-medium text-[var(--color-green-deep)]" key={value}>
                {value}
                <button aria-label={`Remove ${value}`} className="flex size-5 items-center justify-center rounded-full text-[var(--color-muted)] hover:bg-black/10" onClick={() => onChange(values.filter((item) => item !== value))} type="button">
                  <CloseIcon className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="flex items-center gap-2 px-3">
          <SearchIcon className="size-4 shrink-0 text-[var(--color-muted)]" />
          <input
            autoComplete="off"
            className="min-h-10 w-full bg-transparent text-[0.65rem] !outline-none placeholder:text-[#9ea49f]"
            id={inputId}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onChange={(event) => { setDraft(event.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={`Search or add ${noun}`}
            value={draft}
          />
        </div>
        {open && (matches.length > 0 || draft.trim()) ? (
          <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-48 overflow-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-1 shadow-[var(--shadow-soft)]">
            {matches.map((item) => (
              <li key={item}>
                <button className="w-full rounded-md px-2.5 py-1.5 text-left text-[0.82rem] hover:bg-[var(--color-sage)]/60" onMouseDown={(event) => { event.preventDefault(); add(item); }} type="button">{item}</button>
              </li>
            ))}
            {draft.trim() && !suggestions.some((item) => item.toLowerCase() === needle) ? (
              <li>
                <button className="w-full rounded-md px-2.5 py-1.5 text-left text-[0.82rem] text-[var(--color-green-deep)] hover:bg-[var(--color-sage)]/60" onMouseDown={(event) => { event.preventDefault(); add(draft); }} type="button">Add &ldquo;{draft.trim()}&rdquo;</button>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
