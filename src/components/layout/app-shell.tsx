"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

import { FolderIcon, GridIcon, HomeIcon, LeafIcon, UserIcon, UsersIcon } from "@/components/shared/icons";

import { SceneHostContext } from "./scene-host";

type AppShellProps = {
  children: ReactNode;
  galleryHref: string;
  userName: string;
};

export function AppShell({ children, galleryHref, userName }: AppShellProps) {
  const pathname = usePathname();
  // A page (the room museum) can ask for a full-viewport scene layer between the shell's backgrounds and its text.
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [immersive, setImmersive] = useState(false);
  const sceneHost = useMemo(() => ({ host, setImmersive }), [host]);
  const items = [
    { href: "/", label: "Home", icon: HomeIcon, active: pathname === "/" },
    { href: "/rooms", label: "My rooms", icon: FolderIcon, active: pathname.startsWith("/rooms") && !pathname.endsWith("/gallery") && pathname !== "/rooms/join" },
    { href: galleryHref, label: "Gallery", icon: GridIcon, active: pathname.endsWith("/gallery") },
    { href: "/rooms/join", label: "Join room", icon: UsersIcon, active: pathname === "/rooms/join" },
    { href: "/profile", label: "Profile", icon: UserIcon, active: pathname === "/profile" },
  ];

  // Form pages float the sidebar card on the page background; other pages use the plain green sidebar.
  const floating = pathname.endsWith("/memories/new");

  return (
    <SceneHostContext.Provider value={sceneHost}>
    <div className={`${floating ? "" : "min-h-screen"} lg:grid lg:grid-cols-[14.5rem_1fr]`}>
      {immersive && (
        <>
          {/* back layer: the sidebar's own background, so the scene can sit above it and below the sidebar's content */}
          <div aria-hidden="true" className="pointer-events-none fixed left-0 top-0 z-0 hidden h-screen w-[14.5rem] border-r border-[var(--color-border)] bg-[var(--color-sidebar)] lg:block" />
          {/* scene layer: full viewport, above backgrounds, below all text and controls */}
          <div className="fixed inset-0 z-[1] hidden lg:block" ref={setHost} />
        </>
      )}
      <aside className={immersive ? "pointer-events-none sticky top-0 z-[2] hidden h-screen flex-col border-r border-transparent px-4 py-5 lg:flex" : floating ? "relative hidden flex-col py-6 pl-6 pr-0 lg:flex" : "sticky top-0 hidden h-screen flex-col border-r border-[var(--color-border)] bg-[var(--color-sidebar)] px-4 py-5 lg:flex"}>
        <p className={floating ? "absolute left-6 top-1.5 text-[0.68rem] text-[var(--color-muted)]" : "mb-5 px-2 text-[0.68rem] text-[var(--color-muted)]"}>{pathname === "/" ? "02 Home" : pathname === "/rooms" ? "05 Rooms" : floating ? "03 New memory" : "Dear Days"}</p>
        <div className={floating ? "flex flex-1 flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-sidebar)] px-3.5 py-5 shadow-[var(--shadow-card)]" : "flex min-h-0 flex-1 flex-col"}>
        <Link className="pointer-events-auto block px-2" href="/">
          <span className="font-display flex items-center gap-1.5 text-[1.65rem] leading-none text-[var(--color-green-deep)]">
            Dear Days <LeafIcon className="size-5 text-[var(--color-sage-strong)]" />
          </span>
          <span className="mt-1.5 block text-[0.7rem] text-[var(--color-muted)]">A personal photo diary</span>
        </Link>
        <nav aria-label="Main" className="pointer-events-auto mt-8 grid gap-1">
          {items.map(({ href, label, icon: Icon, active }) => (
            <Link
              aria-current={active ? "page" : undefined}
              className={`flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-[0.85rem] font-medium transition-colors ${active ? "bg-[var(--color-paper)]/70 text-[var(--color-green-deep)] shadow-[0_1px_2px_rgb(38_56_47/0.08)]" : "text-[var(--color-muted)] hover:bg-white/45 hover:text-[var(--color-green-deep)]"}`}
              href={href}
              key={label}
            >
              <Icon className="size-[1.1rem]" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="pointer-events-auto mt-auto flex items-center gap-2.5 border-t border-[var(--color-border-strong)]/50 px-2 pt-4">
          <span aria-hidden="true" className="font-display flex size-9 items-center justify-center rounded-full bg-[var(--color-green)] text-[0.95rem] text-white">{userName.charAt(0)}</span>
          <div className="min-w-0 text-sm">
            <p className="truncate text-[0.85rem] font-semibold leading-tight text-[var(--color-ink)]">{userName}</p>
            <p className="truncate text-[0.68rem] text-[var(--color-muted)]">A collection of good days</p>
          </div>
        </div>
      </div>
      </aside>

      <div className={`min-w-0 pb-20 lg:pb-0 ${immersive ? "relative z-[2] lg:pointer-events-none" : ""}`}>
        <header className="flex h-12 items-center justify-between border-b border-[var(--color-border)] px-4 lg:hidden">
          <Link className="font-display text-xl text-[var(--color-green-deep)]" href="/">Dear Days</Link>
          <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-[var(--color-green)] text-xs text-white">{userName.charAt(0)}</span>
        </header>
        <main className={`w-full px-4 py-5 sm:px-6 lg:py-6 lg:pr-9 ${floating ? "lg:pl-4" : "lg:pl-9"}`}>{children}</main>
      </div>

      <nav aria-label="Mobile" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[var(--color-border)] bg-[var(--color-paper)]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {items.map(({ href, label, icon: Icon, active }) => (
          <Link aria-current={active ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[0.68rem] font-medium ${active ? "text-[var(--color-green)]" : "text-[var(--color-muted)]"}`} href={href} key={label}>
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
    </SceneHostContext.Provider>
  );
}
