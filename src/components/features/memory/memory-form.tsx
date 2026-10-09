"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useForm, useWatch } from "react-hook-form";

import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { CalendarIcon, CameraIcon, CloseIcon, EditIcon, FrownIcon, GripIcon, InfoIcon, LeafIcon, LockIcon, MehIcon, PinIcon, SearchIcon, SmileIcon, SparkleIcon, StarIcon, TrashIcon, UsersIcon } from "@/components/shared/icons";
import { MEDIA_CONSTRAINTS, MOOD_LABELS, MOODS } from "@/lib/contracts/constants";
import { memoryInputSchema } from "@/lib/contracts/schemas";
import type { MediaMutation, Memory, MemoryInput, Mood, NewMediaMetadata, Room, Tag } from "@/lib/contracts/types";
import { UPLOAD_FIELD_PREFIX } from "@/lib/data/form-fields";
import { saveMemoryAction } from "@/lib/data/memory-actions";

type MemoryFormProps = {
  mode: "create" | "edit";
  /** Room from the URL; preselected in the room picker when creating. */
  room: Room;
  /** Rooms the user can post to. Only used when creating. */
  rooms?: Room[];
  memory?: Memory;
  /** Existing tags of every room in `rooms`, used for suggestions. */
  tags: Tag[];
};

// Kept photos use their media id; new photos use a client_id that pairs metadata with the uploaded file.
type Photo = { id: string; url: string | null; name: string; kind: "existing" | "new"; file?: File };

// React Hook Form owns the plain fields; photos and tags are custom widgets merged in on submit.
const fieldsSchema = memoryInputSchema.pick({ title: true, memory_date: true, body: true, mood: true });
type MemoryFields = Pick<MemoryInput, "title" | "memory_date" | "body" | "mood">;
const FIELD_NAMES = ["title", "memory_date", "body", "mood"] as const;

const MOOD_ICONS: Record<Mood, typeof SmileIcon> = { awful: FrownIcon, stressed: MehIcon, sad: FrownIcon, relaxed: LeafIcon, happy: SmileIcon, excited: SparkleIcon };
const MAX_BODY = 10_000;

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p className="mt-1.5 text-xs text-[var(--color-danger)]" id={id}>{message}</p> : null;
}

function mediaRef(photo: Photo): MediaMutation["order"][number] {
  return photo.kind === "existing" ? { kind: "existing", id: photo.id } : { kind: "new", client_id: photo.id };
}

export function MemoryForm({ mode, room: initialRoom, rooms = [initialRoom], memory, tags }: MemoryFormProps) {
  const isEdit = mode === "edit";
  const router = useRouter();
  const [roomId, setRoomId] = useState(initialRoom.id);
  const room = rooms.find((item) => item.id === roomId) ?? initialRoom;
  const { control, register, handleSubmit, setValue, setError, formState: { errors, isSubmitting } } = useForm<MemoryFields>({
    resolver: zodResolver(fieldsSchema),
    defaultValues: {
      title: memory?.title ?? "",
      memory_date: memory?.memory_date ?? new Date().toISOString().slice(0, 10),
      body: memory?.body ?? "",
      mood: memory?.mood ?? null,
    },
  });
  const body = useWatch({ control, name: "body" }) ?? "";
  const mood = useWatch({ control, name: "mood" });
  const setMood = (value: Mood | null) => setValue("mood", value, { shouldDirty: true });
  const [formError, setFormError] = useState<string | null>(null);
  const [people, setPeople] = useState(memory?.tags.filter((tag) => tag.type === "person").map((tag) => tag.label) ?? []);
  const [places, setPlaces] = useState(memory?.tags.filter((tag) => tag.type === "place").map((tag) => tag.label) ?? []);
  const [photos, setPhotos] = useState<Photo[]>(
    memory?.media.map((item) => ({ id: item.id, url: item.signed_url, name: item.alt_text, kind: "existing" })) ?? [],
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
      next.push({ id: crypto.randomUUID(), url, name: file.name.replace(/\.[^.]+$/, ""), kind: "new", file });
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

  async function save(fields: MemoryFields) {
    setFormError(null);
    setPhotoError(null);

    const added: NewMediaMetadata[] = photos.flatMap((photo) => photo.kind === "new" && photo.file
      ? [{ client_id: photo.id, file_name: photo.file.name.slice(0, 255) || "photo", mime_type: photo.file.type as NewMediaMetadata["mime_type"], size_bytes: photo.file.size, alt_text: photo.name.trim().slice(0, 300) }]
      : []);
    const input: MemoryInput = {
      ...fields,
      period_label: memory?.period_label ?? null,
      tags: [...people.map((label) => ({ type: "person" as const, label })), ...places.map((label) => ({ type: "place" as const, label }))],
      media: {
        existing: photos.filter((photo) => photo.kind === "existing").map((photo) => ({ id: photo.id, alt_text: photo.name.trim().slice(0, 300) })),
        added,
        removed_media_ids: (memory?.media ?? []).filter((item) => !photos.some((photo) => photo.id === item.id)).map((item) => item.id),
        order: photos.map(mediaRef),
        cover: cover ? mediaRef(cover) : null,
      },
    };
    const checked = memoryInputSchema.safeParse(input);
    if (!checked.success) {
      setFormError(checked.error.issues[0]?.message ?? "Please check the form.");
      return;
    }

    const formData = new FormData();
    formData.set("input", JSON.stringify(checked.data));
    for (const photo of photos) if (photo.kind === "new" && photo.file) formData.set(`${UPLOAD_FIELD_PREFIX}${photo.id}`, photo.file);

    let result: Awaited<ReturnType<typeof saveMemoryAction>>;
    try {
      result = await saveMemoryAction(room.id, memory?.id ?? null, formData);
    } catch {
      setFormError("Could not reach the server. Check your connection and try again.");
      return;
    }
    if (!result.ok) {
      const fieldErrors = result.error.field_errors ?? {};
      let shown = false;
      for (const name of FIELD_NAMES) {
        const message = fieldErrors[name]?.[0];
        if (message) { setError(name, { message }); shown = true; }
      }
      const mediaMessage = Object.entries(fieldErrors).find(([key]) => key.startsWith("media"))?.[1]?.[0];
      if (mediaMessage) { setPhotoError(mediaMessage); shown = true; }
      if (!shown || result.error.code !== "VALIDATION_ERROR") setFormError(result.error.message);
      return;
    }
    router.push(`/rooms/${result.data.room_id}/memories/${result.data.id}`);
    router.refresh();
  }

  return (
    <div>
    <Breadcrumbs
      card
      items={[{ label: "Home", href: "/" }, { label: room.name, href: `/rooms/${room.id}` }, { label: isEdit ? "Edit memory" : "New memory" }]}
      right={<><span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-sage)]/70 px-2.5 py-1 text-[0.7rem] font-medium text-[var(--color-green-deep)]"><LockIcon className="size-3.5" /> Private room</span><span className="inline-flex items-center gap-1.5 text-[0.75rem]"><UsersIcon className="size-4" /> {room.member_count} members</span></>}
    />
    <form className="grid items-stretch gap-5 lg:grid-cols-[1fr_19rem]" noValidate onSubmit={handleSubmit(save)}>
      <section className="panel grid gap-5 p-5 sm:p-7">
        <h1 className="title-xl">{isEdit ? "Edit memory" : "New memory"}</h1>
        {formError ? <p className="rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 px-3 py-2 text-sm text-[var(--color-danger)]" role="alert">{formError}</p> : null}

        <div>
          <label className="field-label" htmlFor="title">Title</label>
          <input aria-describedby={errors.title ? "title-error" : undefined} aria-invalid={Boolean(errors.title)} className="field-input" id="title" maxLength={120} placeholder="e.g. A day at Doi Suthep" required {...register("title")} />
          <FieldError id="title-error" message={errors.title?.message} />
        </div>

        <div>
          <label className="field-label" htmlFor="memory-date">Date</label>
          <div className="relative sm:max-w-56"><CalendarIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted)]" /><input aria-describedby={errors.memory_date ? "memory-date-error" : undefined} aria-invalid={Boolean(errors.memory_date)} className="field-input pl-9 [&::-webkit-calendar-picker-indicator]:hidden" id="memory-date" required type="date" {...register("memory_date")} /></div>
          <FieldError id="memory-date-error" message={errors.memory_date?.message} />
        </div>

        <div>
          <label className="field-label" htmlFor="body">Diary</label>
          <textarea aria-describedby={errors.body ? "body-error" : undefined} aria-invalid={Boolean(errors.body)} className="field-input" id="body" maxLength={MAX_BODY} placeholder="What do you want to remember?" required {...register("body")} />
          <div className="mt-1 flex justify-between gap-3">
            <FieldError id="body-error" message={errors.body?.message} />
            <p className="ml-auto text-[0.7rem] text-[var(--color-muted)]">{body.length.toLocaleString()} / {MAX_BODY.toLocaleString()}</p>
          </div>
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
                      {photo.url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- blob/signed URLs are not optimizable
                        <img alt={photo.name} className="size-full object-cover" draggable={false} src={photo.url} />
                      ) : (
                        <span className="flex size-full items-center justify-center text-[0.7rem] text-[var(--color-muted)]">Preview unavailable</span>
                      )}
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

        <TagInput icon={<UsersIcon className="size-4" />} hint="People who were part of this memory." label="People tags" noun="people" onChange={setPeople} suggestions={tags.filter((tag) => tag.room_id === room.id && tag.type === "person").map((tag) => tag.label)} values={people} />
        <TagInput icon={<PinIcon className="size-4" />} hint="Places where this memory happened." label="Places tags" noun="places" onChange={setPlaces} suggestions={tags.filter((tag) => tag.room_id === room.id && tag.type === "place").map((tag) => tag.label)} values={places} />

        <div>
          <label className="field-label" htmlFor="room-id">Room</label>
          {isEdit || rooms.length < 2 ? (
            <p className="field-input flex items-center bg-[var(--color-cream-100)]" id="room-id">{room.name}</p>
          ) : (
            <select className="field-input" id="room-id" name="room_id" onChange={(event) => setRoomId(event.target.value)} value={roomId}>
              {rooms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          )}
          {isEdit || rooms.length < 2 ? null : <p className="mt-1.5 text-[0.7rem] text-[var(--color-muted)]">Choose which room this memory is saved to.</p>}
        </div>

        <div className="mt-auto grid gap-3">
          <button aria-disabled={isSubmitting} className="btn btn-primary" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Saving…" : isEdit ? "Save changes" : "Save memory"}
          </button>
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
