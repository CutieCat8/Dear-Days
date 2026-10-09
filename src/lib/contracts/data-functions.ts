import type {
  DataResult,
  FriendsOverview,
  Memory,
  MemoryInput,
  MemoryListParams,
  NewMediaUpload,
  Paginated,
  Profile,
  ProfileInput,
  Room,
  RoomInput,
  RoomMemberView,
  Tag,
  TagInput,
} from "./types";

export interface DearDaysDataSource {
  /** Profile of the signed-in user. UNAUTHENTICATED without a session. */
  getCurrentProfile(): Promise<DataResult<Profile>>;
  /** Updates the signed-in user's own profile only; the user id comes from the session. */
  updateProfile(input: ProfileInput): Promise<DataResult<Profile>>;

  listRooms(): Promise<DataResult<Room[]>>;
  getRoom(roomId: string): Promise<DataResult<Room>>;
  createRoom(input: RoomInput): Promise<DataResult<Room>>;
  updateRoom(roomId: string, input: Partial<RoomInput>): Promise<DataResult<Room>>;
  deleteRoom(roomId: string): Promise<DataResult<{ id: string }>>;
  /**
   * Normalizes the code with `inviteCodeSchema` (trim + uppercase).
   * Unknown/revoked code → INVALID_INVITE_CODE; room already has 2 members → ROOM_FULL.
   * Already a member → ok with the same room, no duplicate membership.
   */
  joinRoom(inviteCode: string): Promise<DataResult<Room>>;
  /** Members of a room the caller belongs to, owner first. Non-member → FORBIDDEN. */
  listRoomMembers(roomId: string): Promise<DataResult<RoomMemberView[]>>;
  /** Owner-only. Removing the owner (including themselves) → FORBIDDEN. */
  removeRoomMember(roomId: string, userId: string): Promise<DataResult<{ user_id: string }>>;

  /** The viewer's friends and pending requests (both directions). */
  listFriends(): Promise<DataResult<FriendsOverview>>;
  /**
   * Sends a request to `username` (spaces, case and a leading "@" are ignored).
   * Unknown username → NOT_FOUND; yourself → VALIDATION_ERROR; already friends or already asked → CONFLICT.
   * If they already asked you, their request is accepted instead (`status: "accepted"`).
   */
  sendFriendRequest(username: string): Promise<DataResult<{ friendship_id: string; status: "pending" | "accepted" }>>;
  /** Accept or decline a request sent to the viewer; anything else → NOT_FOUND. Declining deletes the request. */
  respondFriendRequest(friendshipId: string, accept: boolean): Promise<DataResult<{ friendship_id: string }>>;
  /** Unfriend, or cancel a request either person sent; not one of the two people → NOT_FOUND. */
  removeFriend(friendshipId: string): Promise<DataResult<{ friendship_id: string }>>;

  listMemories(params: MemoryListParams): Promise<DataResult<Paginated<Memory>>>;
  getMemory(roomId: string, memoryId: string): Promise<DataResult<Memory>>;
  createMemory(roomId: string, input: MemoryInput, uploads: NewMediaUpload[]): Promise<DataResult<Memory>>;
  updateMemory(roomId: string, memoryId: string, input: MemoryInput, uploads: NewMediaUpload[]): Promise<DataResult<Memory>>;
  deleteMemory(roomId: string, memoryId: string): Promise<DataResult<{ id: string }>>;

  listTags(roomId: string): Promise<DataResult<Tag[]>>;
  upsertTags(roomId: string, tags: TagInput[]): Promise<DataResult<Tag[]>>;
}
