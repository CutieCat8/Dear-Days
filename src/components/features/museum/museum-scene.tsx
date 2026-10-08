import Image from "next/image";
import Link from "next/link";

import { BookIcon, ImageIcon } from "@/components/shared/icons";
import { MoodBadge } from "@/components/shared/mood-badge";
import type { Memory, Room } from "@/lib/contracts/types";

import styles from "./museum-scene.module.css";

type MuseumSceneProps = {
  room: Room;
  memories: Memory[];
};

function memoryHref(memory: Memory) {
  return `/rooms/${memory.room_id}/memories/${memory.id}`;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${date}T00:00:00Z`));
}

export function MuseumScene({ room, memories }: MuseumSceneProps) {
  const featured = memories[memories.length - 1];
  const displayOrder = [...memories].sort((left, right) => Number(right.media.length > 0) - Number(left.media.length > 0));

  return (
    <div className={styles.shell} data-theme={room.theme}>
      <div className={styles.stage}>
        <svg aria-hidden="true" className={styles.scene} role="presentation" viewBox="0 0 900 570">
          <defs>
            <linearGradient id="left-wall" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="var(--museum-wall-light)" />
              <stop offset="1" stopColor="var(--museum-wall-left)" />
            </linearGradient>
            <linearGradient id="right-wall" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="var(--museum-wall-right)" />
              <stop offset="1" stopColor="var(--museum-wall-shadow)" />
            </linearGradient>
            <linearGradient id="floor" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#c99e6c" />
              <stop offset="1" stopColor="#9b6e47" />
            </linearGradient>
            <filter id="room-shadow" height="160%" width="160%" x="-30%" y="-30%">
              <feDropShadow dx="0" dy="18" floodColor="#33483d" floodOpacity=".2" stdDeviation="18" />
            </filter>
            <filter id="soft-shadow" height="150%" width="150%" x="-25%" y="-25%">
              <feDropShadow dx="0" dy="8" floodColor="#4c3826" floodOpacity=".24" stdDeviation="8" />
            </filter>
          </defs>

          <ellipse cx="450" cy="515" fill="#63786b" opacity=".13" rx="395" ry="43" />
          <g filter="url(#room-shadow)">
            <path d="M86 114 449 34v286L86 411Z" fill="url(#left-wall)" />
            <path d="m449 34 365 112v266L449 320Z" fill="url(#right-wall)" />
            <path d="m86 411 363-91 365 92-365 133Z" fill="url(#floor)" />
          </g>

          <g opacity=".22" stroke="#6f4f36" strokeWidth="2">
            <path d="m110 423 344-88 335 86M148 448l343-103M208 475l323-119M281 502l293-135M366 527l251-147" />
            <path d="m449 320-1 220M363 342l-6 166M275 365l-5 111M188 387l-6 58M538 343l10 165M627 366l12 109M716 389l10 57" />
          </g>

          <path d="m248 415 200-50 192 52-196 78Z" fill="#d8c19b" filter="url(#soft-shadow)" />
          <path d="m284 414 164-40 157 43-161 63Z" fill="var(--museum-rug)" />
          <path d="m314 423 132-31 126 34-128 48Z" fill="none" opacity=".4" stroke="#f4ead5" strokeWidth="5" />

          <g filter="url(#soft-shadow)">
            <path d="m114 382 167-42 41 12-167 45Z" fill="#89633f" />
            <path d="m155 397 167-45v23l-166 47Z" fill="#6f4d33" />
            <path d="m603 357 139 41v72l-139-39Z" fill="#78563c" />
            <path d="m612 369 120 35v25l-120-34Z" fill="#a77950" />
            <path d="m612 404 120 34v23l-120-34Z" fill="#98704d" />
          </g>

          <g filter="url(#soft-shadow)">
            <ellipse cx="465" cy="424" fill="#6f4b31" rx="66" ry="24" />
            <ellipse cx="465" cy="416" fill="#b9875c" rx="66" ry="24" />
            <path d="M447 432v46M484 430v49" stroke="#6f4b31" strokeWidth="9" />
            <ellipse cx="465" cy="408" fill="#ece3d3" rx="17" ry="7" />
            <path d="M455 405c2-15 20-15 22 0" fill="#91a18c" />
          </g>

          <g>
            <path d="M700 358c-3-45 21-76 46-81 26 14 21 53 6 83Z" fill="#71896f" />
            <path d="M720 364c-27-35-22-71-3-87 30 4 38 43 28 80Z" fill="#849b7e" />
            <path d="M733 365c7-43 33-68 57-65 17 24-2 55-31 75Z" fill="#5f7c62" />
            <path d="m716 360 55 14-9 43-56-15Z" fill="#b98c64" />
          </g>
          <g>
            <path d="M137 382c-8-43 8-78 31-87 29 10 29 50 18 79Z" fill="#688169" />
            <path d="M163 382c-27-31-26-67-8-86 30 0 42 37 35 72Z" fill="#8ea087" />
            <path d="m135 377 61-15 10 45-59 16Z" fill="#c79c6f" />
          </g>

          <g filter="url(#soft-shadow)">
            <path d="m648 414 80 24-27 62-84-25Z" fill="#6c766a" />
            <path d="m657 416 69 21-17 31-73-22Z" fill="#a5af9c" />
            <path d="m627 476-9 27M699 498l-4 25" stroke="#594631" strokeWidth="8" />
          </g>

          <g opacity=".55">
            <circle cx="553" cy="174" fill="#f4e9c8" r="20" />
            <path d="M553 194v58" stroke="#8c6843" strokeWidth="5" />
            <path d="m531 255 22-8 24 8" fill="none" stroke="#8c6843" strokeWidth="5" />
          </g>
        </svg>

        <p className={styles.wallNote} aria-hidden="true">Little moments,<br />kept close.</p>
        {displayOrder.slice(0, 7).map((memory, index) => (
          <MemoryObject index={index} key={memory.id} memory={memory} />
        ))}
        <div aria-hidden="true" className={styles.lightWash} />
        <p className={styles.helpText}>กด Tab เพื่อเลือกวัตถุ · Enter เพื่อเปิดอ่าน</p>
      </div>

      <aside className={styles.aside}>
        <div>
          <p className={styles.eyebrow}>กำลังจัดแสดง</p>
          <h2 className={styles.asideTitle}>{featured.title}</h2>
          <div className={styles.metaRow}>
            <time dateTime={featured.memory_date}>{formatDate(featured.memory_date)}</time>
            <MoodBadge mood={featured.mood} />
          </div>
          <p className={styles.excerpt}>{featured.body}</p>
        </div>

        <div className={styles.tags} aria-label="แท็กของความทรงจำ">
          {featured.tags.map((tag) => <span key={tag.id}>{tag.type === "person" ? "คน" : "ที่"} · {tag.label}</span>)}
        </div>

        <div className={styles.roomNote}>
          <span aria-hidden="true">❧</span>
          <p>ห้องนี้เก็บทั้งภาพถ่ายและเรื่องเล่า ทุกชิ้นเปิดอ่านได้โดยไม่ต้องเดินในฉาก 3D</p>
        </div>

        <Link className={styles.openButton} href={memoryHref(featured)}>เปิดความทรงจำ <span aria-hidden="true">→</span></Link>
      </aside>
    </div>
  );
}

function MemoryObject({ memory, index }: { memory: Memory; index: number }) {
  const cover = memory.media.find((item) => item.id === memory.cover_media_id) ?? memory.media[0];
  const slotClass = styles[`slot${index + 1}` as keyof typeof styles];

  return (
    <Link
      aria-label={`เปิดความทรงจำ ${memory.title}${cover ? ` มี ${memory.media.length} รูป` : " เป็นบันทึกข้อความ"}`}
      className={`${styles.memoryObject} ${slotClass} ${cover ? styles.photoObject : styles.bookObject}`}
      href={memoryHref(memory)}
    >
      {cover?.signed_url ? (
        <span className={styles.frame}>
          <span className={styles.photo}>
            <Image alt={cover.alt_text || memory.title} fill sizes="180px" src={cover.signed_url} />
          </span>
          <span className={styles.objectLabel}><ImageIcon />{memory.title}</span>
        </span>
      ) : (
        <span className={styles.book}>
          <span className={styles.bookCover}><BookIcon /><span>{memory.title}</span></span>
          <span className={styles.objectLabel}>{formatDate(memory.memory_date)}</span>
        </span>
      )}
    </Link>
  );
}
