import { MOODS } from "../src/lib/contracts/constants";
import { mockMemories, mockMemberships, mockProfiles, mockRoomMembers, mockRooms, mockTags } from "../src/lib/contracts/fixtures";
import { memorySchema, profileSchema, roomMembershipSchema, roomMemberViewSchema, roomSchema, tagSchema } from "../src/lib/contracts/schemas";

for (const room of mockRooms) roomSchema.parse(room);
for (const profile of mockProfiles) profileSchema.parse(profile);
for (const membership of mockMemberships) roomMembershipSchema.parse(membership);
for (const member of mockRoomMembers) roomMemberViewSchema.parse(member);
for (const tag of mockTags) tagSchema.parse(tag);
for (const memory of mockMemories) memorySchema.parse(memory);

const moods = new Set(mockMemories.map((memory) => memory.mood));
for (const mood of MOODS) {
  if (!moods.has(mood)) throw new Error(`Fixture is missing mood: ${mood}`);
}
if (!moods.has(null)) throw new Error("Fixture is missing nullable mood case");
if (!mockMemories.some((memory) => memory.media.length === 0)) throw new Error("Fixture is missing text-only memory");
if (!mockMemories.some((memory) => memory.media.length > 1)) throw new Error("Fixture is missing multi-image memory");

for (const room of mockRooms) {
  const owners = mockMemberships.filter((membership) => membership.room_id === room.id && membership.role === "owner");
  if (owners.length > 1 || owners.some((owner) => owner.user_id !== room.owner_id)) throw new Error(`Room ${room.id} owner membership does not match owner_id`);
}

console.log(`Validated ${mockProfiles.length} profiles, ${mockRooms.length} rooms, ${mockTags.length} tags, and ${mockMemories.length} memories.`);
