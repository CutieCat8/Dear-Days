import { z } from "zod";

import { INVITE_CODE_LENGTH, MEDIA_CONSTRAINTS, MOODS, ROOM_MAX_MEMBERS, ROOM_ROLES, ROOM_THEMES, TAG_TYPES } from "./constants";

const idSchema = z.string().uuid();
const timestampSchema = z.string().datetime({ offset: true });
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter the date as YYYY-MM-DD");

export const moodSchema = z.enum(MOODS);
export const nullableMoodSchema = moodSchema.nullable();
export const tagTypeSchema = z.enum(TAG_TYPES);
export const roomRoleSchema = z.enum(ROOM_ROLES);
export const roomThemeSchema = z.enum(ROOM_THEMES);

const displayNameSchema = z.string().trim().min(1, "Please enter a display name").max(50);
const bioSchema = z.string().trim().max(160, "Keep it to 160 characters or fewer");
const roomDescriptionSchema = z.string().trim().max(300);

export const inviteCodeSchema = z.string().trim().toUpperCase()
  .regex(new RegExp(`^[A-Z0-9]{${INVITE_CODE_LENGTH}}$`), `Invite codes are ${INVITE_CODE_LENGTH} letters or numbers`);

export const profileSchema = z.object({
  id: idSchema,
  display_name: displayNameSchema,
  bio: bioSchema.nullable(),
  avatar_url: z.string().min(1).nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export const roomSchema = z.object({
  id: idSchema,
  owner_id: idSchema,
  name: z.string().trim().min(1).max(80),
  life_period: z.string().trim().min(1).max(80),
  description: roomDescriptionSchema.nullable(),
  theme: roomThemeSchema,
  invite_code: inviteCodeSchema,
  member_count: z.number().int().min(1).max(ROOM_MAX_MEMBERS),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export const roomMembershipSchema = z.object({
  room_id: idSchema,
  user_id: idSchema,
  role: roomRoleSchema,
  joined_at: timestampSchema,
});

// Public view of another room member: no email or other account data.
export const roomMemberViewSchema = z.object({
  room_id: idSchema,
  user_id: idSchema,
  display_name: displayNameSchema,
  avatar_url: z.string().min(1).nullable(),
  role: roomRoleSchema,
  joined_at: timestampSchema,
});

export const memoryMediaSchema = z.object({
  id: idSchema,
  memory_id: idSchema,
  storage_path: z.string().min(1).max(500),
  signed_url: z.string().min(1).nullable(),
  alt_text: z.string().trim().max(300),
  mime_type: z.enum(MEDIA_CONSTRAINTS.acceptedMimeTypes),
  size_bytes: z.number().int().positive().max(MEDIA_CONSTRAINTS.maxFileBytes),
  position: z.number().int().min(0),
  created_at: timestampSchema,
});

export const tagSchema = z.object({
  id: idSchema,
  room_id: idSchema,
  type: tagTypeSchema,
  label: z.string().trim().min(1).max(50),
  created_at: timestampSchema,
});

export const memorySchema = z.object({
  id: idSchema,
  room_id: idSchema,
  author_id: idSchema,
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(10_000),
  memory_date: dateSchema,
  mood: nullableMoodSchema,
  period_label: z.string().trim().max(80).nullable(),
  cover_media_id: idSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
  media: z.array(memoryMediaSchema).max(MEDIA_CONSTRAINTS.maxFiles),
  tags: z.array(tagSchema),
}).superRefine((memory, context) => {
  if (memory.cover_media_id !== null && !memory.media.some((item) => item.id === memory.cover_media_id)) {
    context.addIssue({ code: "custom", path: ["cover_media_id"], message: "The cover photo must belong to this memory's media" });
  }
  if (memory.media.some((item) => item.memory_id !== memory.id)) {
    context.addIssue({ code: "custom", path: ["media"], message: "Every media item must reference the same memory" });
  }
  if (memory.tags.some((tag) => tag.room_id !== memory.room_id)) {
    context.addIssue({ code: "custom", path: ["tags"], message: "Every tag must belong to the same room as the memory" });
  }
  const positions = memory.media.map((item) => item.position).sort((a, b) => a - b);
  if (positions.some((position, index) => position !== index)) {
    context.addIssue({ code: "custom", path: ["media"], message: "Media positions must be consecutive, starting at 0" });
  }
});

export const roomInputSchema = z.object({
  name: z.string().trim().min(1, "Please enter a room name").max(80),
  life_period: z.string().trim().min(1, "Please enter a life period").max(80),
  description: roomDescriptionSchema.nullable(),
  theme: roomThemeSchema,
});

export const profileInputSchema = z.object({
  display_name: displayNameSchema,
  bio: bioSchema.nullable(),
});

const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Please enter your password").max(72),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, "Please enter your current password").max(72),
  new_password: z.string().min(8, "Use at least 8 characters").max(72, "Use 72 characters or fewer"),
  confirm_password: z.string(),
}).superRefine((value, context) => {
  if (value.new_password !== value.confirm_password) {
    context.addIssue({ code: "custom", path: ["confirm_password"], message: "Passwords do not match" });
  }
  if (value.new_password && value.new_password === value.current_password) {
    context.addIssue({ code: "custom", path: ["new_password"], message: "Choose a password you haven't used here" });
  }
});

// Supabase Auth hashes passwords with bcrypt, which ignores bytes after 72.
export const signUpSchema = z.object({
  display_name: displayNameSchema,
  email: emailSchema,
  password: z.string().min(8, "Use at least 8 characters").max(72, "Use 72 characters or fewer"),
});

export const tagInputSchema = z.object({
  type: tagTypeSchema,
  label: z.string().trim().min(1).max(50),
});

export const existingMediaInputSchema = z.object({
  id: idSchema,
  alt_text: z.string().trim().max(300),
});

export const newMediaMetadataSchema = z.object({
  client_id: z.string().uuid(),
  file_name: z.string().trim().min(1).max(255),
  mime_type: z.enum(MEDIA_CONSTRAINTS.acceptedMimeTypes),
  size_bytes: z.number().int().positive().max(MEDIA_CONSTRAINTS.maxFileBytes),
  alt_text: z.string().trim().max(300),
});

export const mediaReferenceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("existing"), id: idSchema }),
  z.object({ kind: z.literal("new"), client_id: z.string().uuid() }),
]);

export const mediaMutationSchema = z.object({
  existing: z.array(existingMediaInputSchema).max(MEDIA_CONSTRAINTS.maxFiles),
  added: z.array(newMediaMetadataSchema).max(MEDIA_CONSTRAINTS.maxFiles),
  removed_media_ids: z.array(idSchema),
  order: z.array(mediaReferenceSchema).max(MEDIA_CONSTRAINTS.maxFiles),
  cover: mediaReferenceSchema.nullable(),
}).superRefine((plan, context) => {
  const existingIds = plan.existing.map((item) => item.id);
  const addedIds = plan.added.map((item) => item.client_id);
  if (new Set(existingIds).size !== existingIds.length || new Set(addedIds).size !== addedIds.length) {
    context.addIssue({ code: "custom", path: ["existing"], message: "Photo ids must be unique" });
  }
  if (new Set(plan.removed_media_ids).size !== plan.removed_media_ids.length) {
    context.addIssue({ code: "custom", path: ["removed_media_ids"], message: "Removed photo ids must be unique" });
  }
  if (plan.removed_media_ids.some((id) => existingIds.includes(id))) {
    context.addIssue({ code: "custom", path: ["removed_media_ids"], message: "Removed photos must not appear in existing" });
  }
  const available = new Set([
    ...plan.existing.map((item) => `existing:${item.id}`),
    ...plan.added.map((item) => `new:${item.client_id}`),
  ]);
  const orderKeys = plan.order.map((item) => item.kind === "existing" ? `existing:${item.id}` : `new:${item.client_id}`);
  if (new Set(orderKeys).size !== orderKeys.length || orderKeys.some((key) => !available.has(key)) || orderKeys.length !== available.size) {
    context.addIssue({ code: "custom", path: ["order"], message: "Order must reference each kept and new photo exactly once" });
  }
  if (plan.cover) {
    const coverKey = plan.cover.kind === "existing" ? `existing:${plan.cover.id}` : `new:${plan.cover.client_id}`;
    if (!available.has(coverKey)) {
      context.addIssue({ code: "custom", path: ["cover"], message: "The cover must be one of the saved photos" });
    }
  }
});

export const memoryInputSchema = z.object({
  title: z.string().trim().min(1, "Please enter a title").max(120),
  body: z.string().trim().min(1, "Please write something about this day").max(10_000),
  memory_date: dateSchema,
  mood: nullableMoodSchema,
  period_label: z.string().trim().max(80).nullable(),
  tags: z.array(tagInputSchema).max(20),
  media: mediaMutationSchema,
});

export const memoryListParamsSchema = z.object({
  room_id: idSchema,
  query: z.string().trim().max(100).optional(),
  date_from: dateSchema.optional(),
  date_to: dateSchema.optional(),
  moods: z.array(nullableMoodSchema).max(MOODS.length + 1).optional(),
  person_tag_ids: z.array(idSchema).optional(),
  place_tag_ids: z.array(idSchema).optional(),
  period_label: z.string().trim().max(80).optional(),
  page: z.number().int().min(1).default(1),
  page_size: z.number().int().min(1).max(50).default(20),
  sort: z.enum(["memory_date_desc", "memory_date_asc", "updated_at_desc"]).default("memory_date_desc"),
}).refine((params) => !params.date_from || !params.date_to || params.date_from <= params.date_to, {
  path: ["date_to"],
  message: "date_to must not be earlier than date_from",
});

export const appErrorCodeSchema = z.enum([
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_ERROR",
  "CONFLICT",
  "ROOM_FULL",
  "INVALID_INVITE_CODE",
  "UPLOAD_FAILED",
  "INTERNAL_ERROR",
]);
