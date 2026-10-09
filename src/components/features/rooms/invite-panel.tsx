"use client";

import { useEffect, useRef, useState } from "react";

type InvitePanelProps = {
  inviteCode: string;
  roomName: string;
};

/** Owner-only: shows the 8-character code and a /rooms/join?code= link to copy or share. */
export function InvitePanel({ inviteCode, roomName }: InvitePanelProps) {
  const [notice, setNotice] = useState<string | null>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (shareButtonRef.current) shareButtonRef.current.hidden = typeof navigator.share !== "function";
  }, []);

  const link = () => `${window.location.origin}/rooms/join?code=${inviteCode}`;

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(`${label} copied.`);
    } catch {
      setNotice("Copy is not available here. Select the code and copy it by hand.");
    }
  }

  async function share() {
    try {
      await navigator.share({ title: `Join ${roomName} on Dear Days`, text: `Join my private room on Dear Days. Invite code: ${inviteCode}`, url: link() });
    } catch {
      // closed by the person: nothing to report
    }
  }

  return (
    <div className="mt-2">
      <p className="text-xs text-[var(--color-muted)]">Invite code (one person can join)</p>
      <p className="font-mono text-base font-semibold tracking-[0.25em] text-[var(--color-ink)]" data-testid="invite-code">{inviteCode}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button className="btn btn-secondary" onClick={() => copy(inviteCode, "Code")} type="button">Copy code</button>
        <button className="btn btn-secondary" onClick={() => copy(link(), "Link")} type="button">Copy link</button>
        <button className="btn btn-secondary" hidden ref={shareButtonRef} onClick={share} type="button">Share</button>
      </div>
      <p aria-live="polite" className="mt-1.5 min-h-4 text-xs text-[var(--color-muted)]">{notice}</p>
    </div>
  );
}
