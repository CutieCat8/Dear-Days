import type { Memory, MemoryMedia, Mood, Tag } from "./types";

/**
 * Mock-mode memories for the "University Days" room: 15 photo memories + 3 text-only memories (one photo memory has 2 photos).
 * This is the only memory set in the mock fixtures, so room scene, room header, gallery and detail all read the same data.
 * It is never written to Supabase.
 * Photos: public/mock/museum/ (see CREDITS.md there).
 */
export const DEMO_ROOM_ID = "10000000-0000-4000-8000-000000000001";
const OWNER_ID = "20000000-0000-4000-8000-000000000001";
const MEMBER_ID = "20000000-0000-4000-8000-000000000002";
const CREATED_AT = "2026-09-01T08:00:00.000Z";

const tag = (n: number, type: Tag["type"], label: string): Tag => ({
  id: `31000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  room_id: DEMO_ROOM_ID,
  type,
  label,
  created_at: CREATED_AT,
});

export const demoMuseumTags = [
  tag(1, "person", "Sea"),
  tag(2, "person", "Mint"),
  tag(3, "person", "Third"),
  tag(4, "place", "Ristr8to Cafe"),
  tag(5, "place", "Doi Suthep"),
  tag(6, "place", "Chiang Mai University"),
  tag(7, "place", "Old City"),
  tag(8, "place", "Mae Hia Fields"),
] satisfies Tag[];

const [SEA, MINT, THIRD, CAFE, SUTHEP, CMU, OLD_CITY, FIELDS] = demoMuseumTags;

type Entry = { title: string; body: string; mood: Mood | null; tags: Tag[]; photo?: number; extraPhoto?: number };

const ENTRIES: Entry[] = [
  { title: "A perfect study break", body: "A much needed break after midterms! Good coffee, great company, and the same conversations that always make everything feel lighter.", mood: "happy", tags: [SEA, MINT, THIRD, CAFE], photo: 2 },
  { title: "The long way to class", body: "We took the tree-lined path instead of the shortcut. Nobody was in a hurry, and the morning smelled like cut grass.", mood: "relaxed", tags: [SEA, CMU], photo: 1 },
  { title: "Green after the rain", body: "The whole valley turned a different green after last night's storm. We stood there far longer than we planned.", mood: "excited", tags: [MINT, SUTHEP], photo: 3 },
  { title: "Lying in the field", body: "Shoes off, phones away. Ten minutes of doing absolutely nothing turned into the best part of the week.", mood: "relaxed", tags: [SEA, FIELDS], photo: 4 },
  { title: "Golden hour, again", body: "The sky did that thing again. We stopped the bikes, and nobody said anything until the light was gone.", mood: "happy", tags: [MINT, FIELDS], photo: 5 },
  { title: "By the lake", body: "A quiet weekend away from deadlines. Reeds, mountains and one very slow afternoon.", mood: "relaxed", tags: [THIRD], photo: 6, extraPhoto: 16 },
  { title: "Two on a bench", body: "Waiting for the sunset with someone who does not need you to fill the silence. Rare, and worth keeping.", mood: "happy", tags: [SEA, MINT], photo: 7 },
  { title: "Canal walk", body: "Colourful houses, tiny bridges, and a map we gave up on after ten minutes. Getting lost was the plan.", mood: "excited", tags: [OLD_CITY, THIRD], photo: 8 },
  { title: "Up above the clouds", body: "The climb was brutal and the view was unfair. We carried our lunch up and ate it with our legs shaking.", mood: "excited", tags: [SEA, SUTHEP], photo: 9 },
  { title: "Midterm week trail", body: "Needed to clear my head before the last exam, so I walked until the stress had somewhere else to be.", mood: "stressed", tags: [CMU], photo: 10 },
  { title: "White walls, blue sea", body: "A postcard from the trip we keep promising ourselves. For now it lives on this wall.", mood: "happy", tags: [MINT, THIRD], photo: 11 },
  { title: "Peak day", body: "We reached the top just as the clouds opened. Cold hands, warm tea, no regrets.", mood: "excited", tags: [SEA, SUTHEP], photo: 12 },
  { title: "Hills at the end of term", body: "The last bus ride home across the hills. Quietly proud, a little sad that it was ending.", mood: "sad", tags: [MINT], photo: 13 },
  { title: "The green bicycle", body: "Found it leaning on a wooden wall in the Old City. We took twenty photos and bought nothing.", mood: "happy", tags: [OLD_CITY, SEA], photo: 14 },
  { title: "Two dachshunds", body: "Not our dogs, but they adopted us for the afternoon. Best study group we ever had.", mood: "awful", tags: [THIRD, CMU], photo: 15 },
  { title: "Growth, Dec 2020", body: "A note for future me: the year was hard and I still grew. Keep the small proofs, like finishing this notebook.", mood: "relaxed", tags: [SEA] },
  { title: "Hard days (Mar 2023)", body: "No photos for this one. Some days are heavy, and writing it down helps — so does knowing someone will read it kindly.", mood: "sad", tags: [MINT] },
  { title: "A note on ordinary days", body: "Nothing happened today, and that is exactly why I want to remember it.", mood: null, tags: [] },
];

function media(n: number, memoryId: string, photo: number, position = 0): MemoryMedia {
  return {
    id: `51000000-0000-4000-8000-${String(n + position * 100).padStart(12, "0")}`,
    memory_id: memoryId,
    storage_path: `${DEMO_ROOM_ID}/${memoryId}/photo-${position + 1}.jpg`,
    signed_url: `/mock/museum/photo-${String(photo).padStart(2, "0")}.jpg`,
    alt_text: ENTRIES[n - 1].title,
    mime_type: "image/jpeg",
    size_bytes: 120_000,
    position,
    created_at: "2026-10-01T10:00:00.000Z",
  };
}

export const demoMuseumMemories: Memory[] = ENTRIES.map((entry, index) => {
  const n = index + 1;
  const id = `41000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const day = String(((n * 3) % 27) + 1).padStart(2, "0");
  const date = `2026-${String(((n - 1) % 12) + 1).padStart(2, "0")}-${day}`;
  const mediaItems = entry.photo ? [media(n, id, entry.photo), ...(entry.extraPhoto ? [media(n, id, entry.extraPhoto, 1)] : [])] : [];
  return {
    id,
    room_id: DEMO_ROOM_ID,
    author_id: n % 3 === 0 ? MEMBER_ID : OWNER_ID,
    title: entry.title,
    body: entry.body,
    memory_date: date,
    mood: entry.mood,
    period_label: "Demo year",
    cover_media_id: mediaItems[0]?.id ?? null,
    created_at: `${date}T10:00:00.000Z`,
    updated_at: `${date}T10:00:00.000Z`,
    media: mediaItems,
    tags: entry.tags,
  };
});
