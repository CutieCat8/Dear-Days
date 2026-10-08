export const MOODS = ["awful", "stressed", "sad", "relaxed", "happy", "excited"] as const;

export const MOOD_LABELS = {
  awful: "แย่",
  stressed: "เครียด",
  sad: "เศร้า",
  relaxed: "ชิลๆ สบายๆ",
  happy: "แฮปปี้",
  excited: "ตื่นเต้น",
} as const satisfies Record<(typeof MOODS)[number], string>;

export const TAG_TYPES = ["person", "place"] as const;
export const ROOM_ROLES = ["owner", "member"] as const;
export const ROOM_THEMES = ["sunrise", "rose", "night"] as const;

export const MEDIA_CONSTRAINTS = {
  maxFiles: 8,
  maxFileBytes: 10 * 1024 * 1024,
  acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
} as const;
