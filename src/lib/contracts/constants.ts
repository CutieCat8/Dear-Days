export const MOODS = ["awful", "stressed", "sad", "relaxed", "happy", "excited"] as const;

export const MOOD_LABELS = {
  awful: "Awful",
  stressed: "Stressed",
  sad: "Sad",
  relaxed: "Relaxed",
  happy: "Happy",
  excited: "Excited",
} as const satisfies Record<(typeof MOODS)[number], string>;

export const TAG_TYPES = ["person", "place"] as const;
export const ROOM_ROLES = ["owner", "member"] as const;
export const ROOM_THEMES = ["sunrise", "rose", "night"] as const;

export const ROOM_MAX_MEMBERS = 2;
export const INVITE_CODE_LENGTH = 8;

export const MEDIA_CONSTRAINTS = {
  maxFiles: 8,
  maxFileBytes: 10 * 1024 * 1024,
  acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
} as const;
