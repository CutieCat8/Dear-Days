import type {
  DataResult,
  Memory,
  MemoryInput,
  MemoryListParams,
  NewMediaUpload,
  Paginated,
  Room,
  RoomInput,
  Tag,
  TagInput,
} from "./types";

export interface DearDaysDataSource {
  listRooms(): Promise<DataResult<Room[]>>;
  getRoom(roomId: string): Promise<DataResult<Room>>;
  createRoom(input: RoomInput): Promise<DataResult<Room>>;
  updateRoom(roomId: string, input: Partial<RoomInput>): Promise<DataResult<Room>>;
  deleteRoom(roomId: string): Promise<DataResult<{ id: string }>>;
  joinRoom(inviteCode: string): Promise<DataResult<Room>>;

  listMemories(params: MemoryListParams): Promise<DataResult<Paginated<Memory>>>;
  getMemory(roomId: string, memoryId: string): Promise<DataResult<Memory>>;
  createMemory(roomId: string, input: MemoryInput, uploads: NewMediaUpload[]): Promise<DataResult<Memory>>;
  updateMemory(roomId: string, memoryId: string, input: MemoryInput, uploads: NewMediaUpload[]): Promise<DataResult<Memory>>;
  deleteMemory(roomId: string, memoryId: string): Promise<DataResult<{ id: string }>>;

  listTags(roomId: string): Promise<DataResult<Tag[]>>;
  upsertTags(roomId: string, tags: TagInput[]): Promise<DataResult<Tag[]>>;
}
