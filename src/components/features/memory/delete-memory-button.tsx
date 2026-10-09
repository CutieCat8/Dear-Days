"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { TrashIcon } from "@/components/shared/icons";
import { createBrowserDataSource } from "@/lib/data/browser";

/** Two-step delete (author only; the database enforces it too). Removes the memory and its photos. */
export function DeleteMemoryButton({ roomId, memoryId }: { roomId: string; memoryId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setPending(true);
    setError(null);
    const result = await createBrowserDataSource().deleteMemory(roomId, memoryId);
    if (!result.ok) {
      setError(result.error.message);
      setPending(false);
      return;
    }
    router.replace(`/rooms/${roomId}`);
    router.refresh();
  }

  if (!confirming) {
    return (
      <button aria-label="Delete memory" className="btn btn-secondary btn-sm" onClick={() => setConfirming(true)} type="button">
        <TrashIcon className="size-3.5" /> Delete
      </button>
    );
  }

  return (
    <span className="flex flex-col items-end gap-1" role="group" aria-label="Confirm delete">
      <span className="flex items-center gap-1.5">
        <button className="btn btn-sm bg-[#8a3a3a] text-white hover:opacity-90 disabled:opacity-60" disabled={pending} onClick={remove} type="button">{pending ? "Deleting…" : "Delete for good"}</button>
        <button className="btn btn-secondary btn-sm" disabled={pending} onClick={() => setConfirming(false)} type="button">Keep</button>
      </span>
      {error ? <span className="text-[0.7rem] text-[#8a3a3a]" role="alert">{error}</span> : null}
    </span>
  );
}
