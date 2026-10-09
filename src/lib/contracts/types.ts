import type { z } from "zod";

import type {
  appErrorCodeSchema,
  friendRequestViewSchema,
  friendsOverviewSchema,
  friendViewSchema,
  mediaMutationSchema,
  memoryInputSchema,
  memoryListParamsSchema,
  memoryMediaSchema,
  memorySchema,
  moodSchema,
  newMediaMetadataSchema,
  profileInputSchema,
  profileSchema,
  roomInputSchema,
  roomMembershipSchema,
  roomMemberViewSchema,
  roomRoleSchema,
  roomSchema,
  roomThemeSchema,
  tagInputSchema,
  tagSchema,
  tagTypeSchema,
} from "./schemas";

export type Mood = z.infer<typeof moodSchema>;
export type RoomTheme = z.infer<typeof roomThemeSchema>;
export type RoomRole = z.infer<typeof roomRoleSchema>;
export type TagType = z.infer<typeof tagTypeSchema>;
export type Room = z.infer<typeof roomSchema>;
export type RoomMembership = z.infer<typeof roomMembershipSchema>;
export type RoomMemberView = z.infer<typeof roomMemberViewSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type ProfileInput = z.infer<typeof profileInputSchema>;
export type FriendView = z.infer<typeof friendViewSchema>;
export type FriendRequestView = z.infer<typeof friendRequestViewSchema>;
export type FriendsOverview = z.infer<typeof friendsOverviewSchema>;
export type Memory = z.infer<typeof memorySchema>;
export type MemoryMedia = z.infer<typeof memoryMediaSchema>;
export type Tag = z.infer<typeof tagSchema>;
export type RoomInput = z.infer<typeof roomInputSchema>;
export type MemoryInput = z.infer<typeof memoryInputSchema>;
export type TagInput = z.infer<typeof tagInputSchema>;
export type MediaMutation = z.infer<typeof mediaMutationSchema>;
export type NewMediaMetadata = z.infer<typeof newMediaMetadataSchema>;
export type MemoryListParams = z.input<typeof memoryListParamsSchema>;
export type AppErrorCode = z.infer<typeof appErrorCodeSchema>;

/** A photo memory the room members pinned to one 3D picture frame (`slot_id` is the frame's id in the room layout). */
export type FrameAssignment = { slot_id: string; memory_id: string };

export type NewMediaUpload = NewMediaMetadata & { file: File };

export type DataError = {
  code: AppErrorCode;
  message: string;
  field_errors?: Record<string, string[]>;
  retryable?: boolean;
};

export type DataResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: DataError };

export type Paginated<T> = {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  has_more: boolean;
};
