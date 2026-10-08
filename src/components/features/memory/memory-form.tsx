"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { CameraIcon, CloseIcon, PinIcon, UsersIcon } from "@/components/shared/icons";
import { MEDIA_CONSTRAINTS, MOOD_LABELS, MOODS } from "@/lib/contracts/constants";
import type { Memory, Mood, Room } from "@/lib/contracts/types";

type MemoryFormProps = {
  mode: "create" | "edit";
  room: Room;
  memory?: Memory;
};

type Photo = { id: string; url: string; name: string; error?: string; file?: File };

const MOOD_ICONS: Record<Mood, string> = { awful: "☂", stressed: "≋", sad: "◌", relaxed: "❧", happy: "☀", excited: "✦" };
const MAX_BODY = 10_000;

export function MemoryForm({ mode, room, memory }: MemoryFormProps) {
  const isEdit = mode === "edit";
  const [title, setTitle] = useState(memory?.title ?? "");
  const [date, setDate] = useState(memory?.memory_date ?? new Date().toISOString().slice(0, 10));
  const [body, setBody] = useState(memory?.body ?? "");
  const [mood, setMood] = useState<Mood | null>(memory?.mood ?? null);
  const [people, setPeople] = useState(memory?.tags.filter((tag) => tag.type === "person").map((tag) => tag.label) ?? []);
  const [places, setPlaces] = useState(memory?.tags.filter((tag) => tag.type === "place").map((tag) => tag.label) ?? []);
  const [photos, setPhotos] = useState<Photo[]>(
    memory?.media.filter((item) => item.signed_url).map((item) => ({ id: item.id, url: item.signed_url as string, name: item.alt_text })) ?? [],
  );
  const [photoError, setPhotoError] = useState<string | null>(null);
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
        message = `อัปโหลดได้สูงสุด ${MEDIA_CONSTRAINTS.maxFiles} รูป`;
        break;
      }
      if (!(MEDIA_CONSTRAINTS.acceptedMimeTypes as readonly string[]).includes(file.type)) {
        message = "รองรับเฉพาะไฟล์ JPEG, PNG และ WebP";
        continue;
      }
      if (file.size > MEDIA_CONSTRAINTS.maxFileBytes) {
        message = "ไฟล์ต้องมีขนาดไม่เกิน 10 MB";
        continue;
      }
      const url = URL.createObjectURL(file);
      objectUrls.current.push(url);
      next.push({ id: crypto.randomUUID(), url, name: file.name, file });
    }

    setPhotoError(message);
    setPhotos((current) => [...current, ...next]);
  }

  // TODO(T11-T16): build MemoryInput + NewMediaUpload[] and call createMemory/updateMemory.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <form className="grid items-start gap-6 lg:grid-cols-[1fr_21rem]" onSubmit={handleSubmit}>
      <section className="panel grid gap-6 p-6 sm:p-8">
        <h1 className="font-display text-4xl text-[var(--color-green-deep)]">{isEdit ? "แก้ไขความทรงจำ" : "ความทรงจำใหม่"}</h1>

        <div>
          <label className="field-label" htmlFor="title">ชื่อเรื่อง</label>
          <input className="field-input" id="title" maxLength={120} name="title" onChange={(event) => setTitle(event.target.value)} placeholder="เช่น วันหนึ่งที่ดอยสุเทพ" required value={title} />
        </div>

        <div>
          <label className="field-label" htmlFor="memory-date">วันที่</label>
          <input className="field-input sm:max-w-56" id="memory-date" name="memory_date" onChange={(event) => setDate(event.target.value)} required type="date" value={date} />
        </div>

        <div>
          <label className="field-label" htmlFor="body">ไดอารี่</label>
          <textarea className="field-input" id="body" maxLength={MAX_BODY} name="body" onChange={(event) => setBody(event.target.value)} placeholder="วันนี้เกิดอะไรขึ้นบ้าง…" required value={body} />
          <p className="mt-1 text-right text-xs text-[var(--color-muted)]">{body.length.toLocaleString()} / {MAX_BODY.toLocaleString()}</p>
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="field-label !mb-0">รูปภาพ ({photos.length}/{MEDIA_CONSTRAINTS.maxFiles}) <small>ไม่บังคับ</small></h2>
            <label className="btn btn-secondary !min-h-10 cursor-pointer text-sm">
              <CameraIcon className="size-4" /> เพิ่มรูป
              <input accept={MEDIA_CONSTRAINTS.acceptedMimeTypes.join(",")} className="sr-only" multiple onChange={(event) => { addFiles(event.target.files); event.target.value = ""; }} type="file" />
            </label>
          </div>
          {photoError ? <p className="mb-3 rounded-xl bg-[#f8e3e3] px-3 py-2 text-sm text-[#8a3a3a]" role="alert">{photoError}</p> : null}
          {photos.length === 0 ? (
            <p className="rounded-2xl border-2 border-dashed border-[var(--color-border)] px-4 py-8 text-center text-sm text-[var(--color-muted)]">ยังไม่มีรูป — JPEG, PNG, WebP ขนาดไม่เกิน 10 MB</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((photo, index) => (
                <li className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[var(--color-sage)]" key={photo.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- blob/signed URLs are not optimizable */}
                  <img alt={photo.name} className="size-full object-cover" src={photo.url} />
                  {index === 0 ? <span className="absolute left-2 top-2 rounded-full bg-[var(--color-green-deep)] px-2 py-1 text-[10px] font-bold text-white">ภาพปก</span> : null}
                  <button aria-label={`ลบรูป ${photo.name}`} className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-[var(--color-paper)]/90 text-[var(--color-green-deep)] hover:bg-white" onClick={() => setPhotos((current) => current.filter((item) => item.id !== photo.id))} type="button">
                    <CloseIcon className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <aside className="panel grid gap-6 p-6 lg:sticky lg:top-8">
        <h2 className="font-display text-2xl text-[var(--color-green-deep)]">ตั้งค่าความทรงจำ</h2>

        <fieldset>
          <legend className="field-label">มู้ด <small>ไม่บังคับ</small></legend>
          <div className="grid grid-cols-2 gap-2">
            {MOODS.map((value) => (
              <label className="cursor-pointer" key={value}>
                <input checked={mood === value} className="peer sr-only" name="mood" onChange={() => setMood(value)} onClick={() => mood === value && setMood(null)} type="radio" value={value} />
                <span className="mood-badge !min-h-11 w-full justify-center !text-xs ring-2 ring-transparent transition peer-checked:ring-[var(--color-green)] peer-focus-visible:ring-[var(--color-honey)]" data-mood={value}>
                  <span aria-hidden="true">{MOOD_ICONS[value]}</span> {MOOD_LABELS[value]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <TagInput icon={<UsersIcon className="size-4" />} label="คนในความทรงจำ" onChange={setPeople} placeholder="พิมพ์ชื่อแล้วกด Enter" values={people} />
        <TagInput icon={<PinIcon className="size-4" />} label="สถานที่" onChange={setPlaces} placeholder="พิมพ์สถานที่แล้วกด Enter" values={places} />

        <div>
          <p className="field-label">ห้อง</p>
          <p className="field-input flex items-center bg-[var(--color-cream-100)]">{room.name}</p>
        </div>

        <div className="grid gap-3">
          <button className="btn btn-primary" type="submit">{isEdit ? "บันทึกการแก้ไข" : "บันทึกความทรงจำ"}</button>
          <Link className="btn btn-secondary" href={isEdit && memory ? `/rooms/${room.id}/memories/${memory.id}` : `/rooms/${room.id}`}>ยกเลิก</Link>
        </div>
      </aside>
    </form>
  );
}

type TagInputProps = {
  label: string;
  placeholder: string;
  values: string[];
  icon: React.ReactNode;
  onChange: (values: string[]) => void;
};

function TagInput({ label, placeholder, values, icon, onChange }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const inputId = `tag-${label}`;

  function commit() {
    const value = draft.trim().slice(0, 50);
    if (value && !values.includes(value)) onChange([...values, value]);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    } else if (event.key === "Backspace" && !draft && values.length) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div>
      <label className="field-label flex items-center gap-1.5" htmlFor={inputId}>{icon} {label} <small>ไม่บังคับ</small></label>
      <div className="field-input flex flex-wrap items-center gap-2 !py-2 focus-within:border-[var(--color-green)]">
        {values.map((value) => (
          <span className="chip" key={value}>
            {value}
            <button aria-label={`ลบ ${value}`} className="flex size-5 items-center justify-center rounded-full hover:bg-black/10" onClick={() => onChange(values.filter((item) => item !== value))} type="button">
              <CloseIcon className="size-3.5" />
            </button>
          </span>
        ))}
        <input className="min-w-32 flex-1 bg-transparent py-1 text-sm outline-none" id={inputId} onBlur={commit} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} placeholder={placeholder} value={draft} />
      </div>
    </div>
  );
}
