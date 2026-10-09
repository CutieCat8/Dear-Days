"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { TrashIcon } from "@/components/shared/icons";
import { deleteMemoryAction } from "@/lib/data/memory-actions";

type DeleteMemoryButtonProps = {
  roomId: string;
  memoryId: string;
  title: string;
};

// Native <dialog> + showModal() gives focus trapping, Escape to close and an inert background for free.
export function DeleteMemoryButton({ roomId, memoryId, title }: DeleteMemoryButtonProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteMemoryAction(roomId, memoryId);
        if (!result.ok) {
          setError(result.error.message);
          return;
        }
        dialogRef.current?.close();
        router.push(`/rooms/${roomId}`);
        router.refresh();
      } catch {
        setError("Could not reach the server. Please try again.");
      }
    });
  }

  return (
    <>
      <button className="btn btn-secondary btn-sm shrink-0 text-[var(--color-danger)]" onClick={() => { setError(null); dialogRef.current?.showModal(); }} type="button">
        <TrashIcon className="size-3.5" /> Delete
      </button>
      <dialog aria-describedby="delete-memory-description" aria-labelledby="delete-memory-title" className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-[var(--radius-lg)] bg-[var(--color-paper)] p-6 text-[var(--color-ink)] shadow-[var(--shadow-soft)] backdrop:bg-black/40" ref={dialogRef}>
        <h2 className="title-md" id="delete-memory-title">Delete this memory?</h2>
        <p className="mt-2 text-sm text-[var(--color-muted)]" id="delete-memory-description">
          &ldquo;{title}&rdquo; and its photos will be removed for both members of the room. This cannot be undone.
        </p>
        {error ? <p className="mt-3 text-sm text-[var(--color-danger)]" role="alert">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button autoFocus className="btn btn-secondary btn-sm" disabled={pending} onClick={() => dialogRef.current?.close()} type="button">Cancel</button>
          <button className="btn btn-primary btn-sm !bg-[var(--color-danger)]" disabled={pending} onClick={confirmDelete} type="button">
            {pending ? "Deleting…" : "Delete memory"}
          </button>
        </div>
      </dialog>
    </>
  );
}
