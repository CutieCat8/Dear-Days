import { MOODS } from "../src/lib/contracts/constants";
import { mockMemories, mockMemberships, mockRooms, mockTags } from "../src/lib/contracts/fixtures";
import { memorySchema, roomMembershipSchema, roomSchema, tagSchema } from "../src/lib/contracts/schemas";

for (const room of mockRooms) roomSchema.parse(room);
for (const membership of mockMemberships) roomMembershipSchema.parse(membership);
for (const tag of mockTags) tagSchema.parse(tag);
for (const memory of mockMemories) memorySchema.parse(memory);

const moods = new Set(mockMemories.map((memory) => memory.mood));
for (const mood of MOODS) {
  if (!moods.has(mood)) throw new Error(`Fixture is missing mood: ${mood}`);
}
if (!moods.has(null)) throw new Error("Fixture is missing nullable mood case");
if (!mockMemories.some((memory) => memory.media.length === 0)) throw new Error("Fixture is missing text-only memory");
if (!mockMemories.some((memory) => memory.media.length > 1)) throw new Error("Fixture is missing multi-image memory");

console.log(`Validated ${mockRooms.length} rooms, ${mockTags.length} tags, and ${mockMemories.length} memories.`);
