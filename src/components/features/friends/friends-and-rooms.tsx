"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { CopyIcon, LinkIcon, LockIcon, MoreIcon, SendIcon, UserPlusIcon, UsersIcon } from "@/components/shared/icons";
import { THEME_LABELS } from "@/components/shared/room-cover";
import { INVITE_CODE_LENGTH, ROOM_MAX_MEMBERS } from "@/lib/contracts/constants";
import type { FriendRequestView, FriendsOverview, FriendView, Room } from "@/lib/contracts/types";
import { createBrowserDataSource } from "@/lib/data/browser";

type FriendsAndRoomsProps = {
  friends: FriendsOverview;
  viewerUsername: string | null;
  /** Rooms the viewer owns: only the owner shares a room's invite code. */
  ownedRooms: Room[];
  initialCode: string;
  demo: boolean;
};

// Same pictures as the room form's live preview (one render per theme).
const ROOM_PREVIEW: Record<Room["theme"], string> = { sunrise: "/room-preview.jpg", rose: "/room-preview-rose.jpg", night: "/room-preview-night.jpg" };
const AVATAR_TONES = ["#5d7765", "#c98268", "#a59dbf", "#6f9cc4", "#b8925a"];
const ERROR_BOX = "rounded-lg bg-[#f8e3e3] px-3 py-2 text-xs text-[#8a3a3a]";
const OK_BOX = "rounded-lg bg-[var(--color-sage)] px-3 py-2 text-xs text-[var(--color-green-deep)]";

type Message = { kind: "ok" | "error"; text: string } | null;

function Avatar({ name, userId }: { name: string; userId: string }) {
  const tone = AVATAR_TONES[[...userId].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_TONES.length];
  return (
    <span aria-hidden="true" className="font-display flex size-11 shrink-0 items-center justify-center rounded-full text-lg text-white" style={{ background: tone }}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function Notice({ message }: { message: Message }) {
  if (!message) return null;
  return <p className={message.kind === "ok" ? OK_BOX : ERROR_BOX} role={message.kind === "ok" ? "status" : "alert"}>{message.text}</p>;
}

export function FriendsAndRooms({ friends, viewerUsername, ownedRooms, initialCode, demo }: FriendsAndRoomsProps) {
  const router = useRouter();
  const openRooms = ownedRooms.filter((room) => room.member_count < ROOM_MAX_MEMBERS);
  const [roomId, setRoomId] = useState((openRooms[0] ?? ownedRooms[0])?.id ?? "");
  const room = ownedRooms.find((item) => item.id === roomId);
  const roomHasSpace = room ? room.member_count < ROOM_MAX_MEMBERS : false;

  const [busy, setBusy] = useState<string | null>(null);
  const [friendMessage, setFriendMessage] = useState<Message>(null);
  const [inviteMessage, setInviteMessage] = useState<Message>(null);

  const inviteLink = () => (room ? `${window.location.origin}/rooms/join?code=${room.invite_code}` : "");

  // `show` decides where the result appears: next to the invite card, or next to the friends list.
  async function copy(text: string, done: string, show: (message: Message) => void = setInviteMessage) {
    try {
      await navigator.clipboard.writeText(text);
      show({ kind: "ok", text: done });
    } catch {
      show({ kind: "error", text: `Copy is not available here. Copy this by hand: ${text}` });
    }
  }

  async function mutate<T>(key: string, action: () => Promise<{ ok: true; data: T } | { ok: false; error: { message: string } }>, done: string | ((data: T) => string)) {
    setBusy(key);
    setFriendMessage(null);
    try {
      const result = await action();
      if (!result.ok) {
        setFriendMessage({ kind: "error", text: result.error.message });
        return false;
      }
      setFriendMessage({ kind: "ok", text: typeof done === "function" ? done(result.data) : done });
      router.refresh();
      return true;
    } catch {
      setFriendMessage({ kind: "error", text: "We could not reach the server. Please check your connection and try again." });
      return false;
    } finally {
      setBusy(null);
    }
  }

  function inviteFriend(friend: FriendView) {
    if (!room || !roomHasSpace) return;
    void copy(inviteLink(), `Invite link for ${room.name} copied. Send it to ${friend.display_name}.`, setFriendMessage);
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "My rooms", href: "/rooms" }, { label: "Friends & Rooms" }]} />

      <div className="grid gap-6 xl:grid-cols-[1fr_26rem]">
        <div className="grid min-w-0 content-start gap-5">
          <header>
            <h1 className="title-xl">Good memories are better together.</h1>
            <p className="mt-1.5 text-[0.95rem] text-[var(--color-muted)]">Add a friend, invite them to your room, or join theirs.</p>
          </header>

          <AddFriendCard busy={busy === "send"} demo={demo} onSend={(username) => {
            const handle = username.trim().replace(/^@+/, "").toLowerCase();
            return mutate("send", () => createBrowserDataSource().sendFriendRequest(username), (data) => (data.status === "accepted" ? `@${handle} had already asked you, so you are now friends.` : `Request sent to @${handle}.`));
          }} viewerUsername={viewerUsername} />
          <Notice message={friendMessage} />

          <section aria-labelledby="friends-title" className="panel p-5">
            <h2 className="title-md flex items-center gap-2" id="friends-title">
              Your friends <span className="rounded-full bg-[var(--color-sage)] px-2 py-0.5 font-sans text-xs text-[var(--color-green-deep)]">{friends.friends.length}</span>
            </h2>
            {friends.friends.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--color-muted)]">No friends yet. Add someone by their username above.</p>
            ) : (
              <ul className="mt-2 divide-y divide-[var(--color-border)]">
                {friends.friends.map((friend) => (
                  <FriendRow
                    busy={busy === friend.friendship_id}
                    canInvite={Boolean(room && roomHasSpace)}
                    demo={demo}
                    friend={friend}
                    key={friend.friendship_id}
                    onInvite={() => inviteFriend(friend)}
                    onRemove={() => mutate(friend.friendship_id, () => createBrowserDataSource().removeFriend(friend.friendship_id), `${friend.display_name} was removed from your friends.`)}
                  />
                ))}
              </ul>
            )}
          </section>

          {friends.incoming.length + friends.outgoing.length > 0 ? (
            <section aria-labelledby="requests-title" className="panel p-5">
              <h2 className="title-md flex items-center gap-2" id="requests-title">
                Friend requests <span className="rounded-full bg-[#f8e3e3] px-2 py-0.5 font-sans text-xs text-[#8a3a3a]">{friends.incoming.length}</span>
              </h2>
              <ul className="mt-2 divide-y divide-[var(--color-border)]">
                {[...friends.incoming, ...friends.outgoing].map((request) => (
                  <RequestRow
                    busy={busy === request.friendship_id}
                    demo={demo}
                    key={request.friendship_id}
                    onAccept={() => mutate(request.friendship_id, () => createBrowserDataSource().respondFriendRequest(request.friendship_id, true), `You and ${request.display_name} are now friends.`)}
                    onCancel={() => mutate(request.friendship_id, () => createBrowserDataSource().removeFriend(request.friendship_id), `Request to ${request.display_name} cancelled.`)}
                    onDecline={() => mutate(request.friendship_id, () => createBrowserDataSource().respondFriendRequest(request.friendship_id, false), `Request from ${request.display_name} declined.`)}
                    request={request}
                  />
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <div className="grid content-start gap-5">
          <section aria-labelledby="invite-title" className="panel grid gap-4 p-5">
            <div>
              <h2 className="title-lg" id="invite-title">Invite to your room</h2>
              <p className="mt-1 text-xs text-[var(--color-muted)]">Choose a room and share an invite code or link with a friend.</p>
            </div>

            {ownedRooms.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">You do not own a room yet. <Link className="font-medium text-[var(--color-green-deep)] underline underline-offset-4" href="/rooms/new">Create one</Link> to invite a friend.</p>
            ) : (
              <>
                <div>
                  <label className="field-label" htmlFor="invite-room">Room</label>
                  <select className="field-input" id="invite-room" onChange={(event) => { setRoomId(event.target.value); setInviteMessage(null); }} value={roomId}>
                    {ownedRooms.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>

                {room ? (
                  <>
                    <div className="relative aspect-[16/8] overflow-hidden rounded-xl bg-[var(--color-sage)]">
                      <Image alt={`${room.name} room preview`} className="object-cover" fill sizes="(max-width: 1280px) 100vw, 416px" src={ROOM_PREVIEW[room.theme]} />
                      <span className="absolute left-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-[0.7rem] font-medium text-[var(--color-green-deep)]">{THEME_LABELS[room.theme]}</span>
                      <span className="absolute right-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-[0.7rem] font-medium text-[var(--color-ink)]">{room.member_count} of {ROOM_MAX_MEMBERS} members</span>
                    </div>
                    <p className="-mt-2 text-xs text-[var(--color-muted)]">{roomHasSpace ? "One spot left for someone special." : "This room is full: it already has two people."}</p>

                    {roomHasSpace ? (
                      <>
                        <div>
                          <p className="field-label">Invite code</p>
                          <div className="flex gap-2">
                            <p className="field-input flex flex-1 items-center bg-[var(--color-cream-100)] font-mono text-base tracking-[0.35em]" data-testid="invite-code">{room.invite_code}</p>
                            <button className="btn btn-secondary shrink-0" onClick={() => copy(room.invite_code, "Invite code copied.")} type="button"><CopyIcon className="size-4" /> Copy code</button>
                          </div>
                        </div>
                        <button className="btn btn-primary w-full" onClick={() => copy(inviteLink(), "Invite link copied.")} type="button"><LinkIcon className="size-4" /> Copy invite link</button>
                        <p className="-mt-2 text-xs text-[var(--color-muted)]">Your friend chooses whether to join.</p>
                      </>
                    ) : null}
                    <Notice message={inviteMessage} />
                  </>
                ) : null}
              </>
            )}
          </section>

          <JoinCard initialCode={initialCode} />
        </div>
      </div>

      <p className="mt-6 flex items-center justify-center gap-2 text-xs text-[var(--color-muted)]">
        <LockIcon className="size-3.5" /> Rooms stay private. Each room holds you and one invited member.
      </p>
    </div>
  );
}

function AddFriendCard({ viewerUsername, demo, busy, onSend }: { viewerUsername: string | null; demo: boolean; busy: boolean; onSend: (username: string) => Promise<boolean> }) {
  const [username, setUsername] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!username.trim()) return;
    if (await onSend(username)) setUsername("");
  }

  return (
    <section aria-labelledby="add-friend-title" className="panel p-5">
      <div className="flex items-start gap-4">
        <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-sage)] text-[var(--color-green-deep)]"><UserPlusIcon className="size-6" /></span>
        <div>
          <h2 className="title-lg" id="add-friend-title">Add a friend</h2>
          <p className="text-sm text-[var(--color-muted)]">Find a friend by their exact username.</p>
        </div>
      </div>
      <form className="mt-4" onSubmit={submit}>
        <label className="field-label" htmlFor="friend-username">Username</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]">@</span>
            <input autoCapitalize="none" autoComplete="off" className="field-input pl-8" disabled={demo} id="friend-username" maxLength={31} onChange={(event) => setUsername(event.target.value)} placeholder="mint.days" spellCheck={false} value={username} />
          </div>
          <button className="btn btn-primary shrink-0 sm:min-w-40 disabled:opacity-60" disabled={demo || busy || !username.trim()} type="submit">{busy ? "Sending…" : "Send request"}</button>
        </div>
        <p className="mt-1.5 text-xs text-[var(--color-muted)]">
          {demo ? "Demo mode: friend requests are not sent." : viewerUsername ? <>Your username is <b className="font-medium text-[var(--color-green-deep)]">@{viewerUsername}</b>. Share it so friends can find you.</> : null}
        </p>
      </form>
    </section>
  );
}

function FriendRow({ friend, canInvite, demo, busy, onInvite, onRemove }: { friend: FriendView; canInvite: boolean; demo: boolean; busy: boolean; onInvite: () => void; onRemove: () => void }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <Avatar name={friend.display_name} userId={friend.user_id} />
      <div className="min-w-0 flex-1">
        <p className="font-display truncate text-[1.05rem] text-[var(--color-ink)]">{friend.display_name}</p>
        <p className="truncate text-xs text-[var(--color-muted)]">@{friend.username}</p>
      </div>
      <span className="hidden items-center gap-1.5 rounded-full bg-[var(--color-sage)]/70 px-2.5 py-1 text-[0.7rem] font-medium text-[var(--color-green-deep)] sm:inline-flex">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--color-green)]" /> Friends
      </span>
      {confirming ? (
        <span className="flex items-center gap-1.5" role="group" aria-label={`Remove ${friend.display_name}`}>
          <button className="btn btn-sm bg-[#8a3a3a] text-white disabled:opacity-60" disabled={busy} onClick={onRemove} type="button">{busy ? "Removing…" : "Remove"}</button>
          <button className="btn btn-secondary btn-sm" disabled={busy} onClick={() => setConfirming(false)} type="button">Keep</button>
        </span>
      ) : (
        <>
          <button className="btn btn-secondary btn-sm disabled:opacity-50" disabled={!canInvite} onClick={onInvite} title={canInvite ? undefined : "Choose a room with a free spot first"} type="button">
            <SendIcon className="size-3.5" /> Invite to room
          </button>
          <details className="relative">
            <summary aria-label={`More options for ${friend.display_name}`} className="flex size-9 cursor-pointer list-none items-center justify-center rounded-lg text-[var(--color-muted)] hover:bg-black/5 [&::-webkit-details-marker]:hidden">
              <MoreIcon className="size-5" />
            </summary>
            <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper)] p-1 shadow-[var(--shadow-soft)]">
              <button className="w-full rounded-md px-2.5 py-1.5 text-left text-[0.82rem] text-[#8a3a3a] hover:bg-[#f8e3e3] disabled:opacity-50" disabled={demo} onClick={(event) => { (event.currentTarget.closest("details") as HTMLDetailsElement).open = false; setConfirming(true); }} type="button">
                Remove friend
              </button>
            </div>
          </details>
        </>
      )}
    </li>
  );
}

function RequestRow({ request, demo, busy, onAccept, onDecline, onCancel }: { request: FriendRequestView; demo: boolean; busy: boolean; onAccept: () => void; onDecline: () => void; onCancel: () => void }) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <Avatar name={request.display_name} userId={request.user_id} />
      <div className="min-w-0 flex-1">
        <p className="font-display truncate text-[1.05rem] text-[var(--color-ink)]">{request.display_name}</p>
        <p className="truncate text-xs text-[var(--color-muted)]">@{request.username}</p>
      </div>
      {request.direction === "incoming" ? (
        <span className="flex items-center gap-2">
          <button className="btn btn-primary btn-sm min-w-20 disabled:opacity-60" disabled={demo || busy} onClick={onAccept} type="button">Accept</button>
          <button className="btn btn-secondary btn-sm min-w-20 disabled:opacity-60" disabled={demo || busy} onClick={onDecline} type="button">Decline</button>
        </span>
      ) : (
        <span className="flex items-center gap-2">
          <span className="text-xs text-[var(--color-muted)]">Requested</span>
          <button className="btn btn-secondary btn-sm disabled:opacity-60" disabled={demo || busy} onClick={onCancel} type="button">Cancel</button>
        </span>
      )}
    </li>
  );
}

function JoinCard({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (code.length !== INVITE_CODE_LENGTH) {
      setError(`The invite code must be ${INVITE_CODE_LENGTH} characters.`);
      return;
    }
    setError(null);
    setPending(true);
    try {
      // the data layer maps INVALID_INVITE_CODE and ROOM_FULL to readable messages
      const result = await createBrowserDataSource().joinRoom(code);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      router.push(`/rooms/${result.data.id}`);
      router.refresh();
    } catch {
      setError("We could not reach the server. Please check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="join-title" className="panel p-5">
      <h2 className="title-lg" id="join-title">Have an invite?</h2>
      <p className="mt-1 text-xs text-[var(--color-muted)]">Join a room with an eight-character code.</p>
      <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={submit}>
        <label className="sr-only" htmlFor="invite-code">Invite code</label>
        <div className="relative flex-1">
          <UsersIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted)]" />
          <input
            aria-describedby={error ? "invite-error" : undefined}
            aria-invalid={error ? true : undefined}
            autoCapitalize="characters"
            autoComplete="off"
            className="field-input pl-9 font-mono uppercase tracking-[0.2em] placeholder:font-sans placeholder:normal-case placeholder:tracking-normal"
            id="invite-code"
            maxLength={INVITE_CODE_LENGTH}
            onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            placeholder="Enter invite code"
            value={code}
          />
        </div>
        <button className="btn btn-primary shrink-0 disabled:opacity-60" disabled={pending} type="submit">{pending ? "Joining…" : "Join room"}</button>
      </form>
      {error ? <p className={`mt-2 ${ERROR_BOX}`} id="invite-error" role="alert">{error}</p> : null}
    </section>
  );
}
