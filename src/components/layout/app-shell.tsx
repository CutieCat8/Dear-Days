"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { FolderIcon, GridIcon, HomeIcon, LeafIcon, UsersIcon } from "@/components/shared/icons";

type AppShellProps = {
  children: ReactNode;
  galleryHref: string;
  userName: string;
};

export function AppShell({ children, galleryHref, userName }: AppShellProps) {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "หน้าหลัก", icon: HomeIcon, active: pathname === "/" },
    { href: "/#rooms", label: "ห้องของฉัน", icon: FolderIcon, active: pathname.startsWith("/rooms") && !pathname.endsWith("/gallery") && pathname !== "/rooms/join" },
    { href: galleryHref, label: "Gallery", icon: GridIcon, active: pathname.endsWith("/gallery") },
    { href: "/rooms/join", label: "เข้าร่วมห้อง", icon: UsersIcon, active: pathname === "/rooms/join" },
  ];

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16.5rem_1fr]">
      <aside className="sticky top-0 hidden h-screen flex-col bg-[var(--color-sidebar)] px-5 py-8 lg:flex">
        <Link className="font-display block px-2 text-3xl leading-none text-[var(--color-green-deep)]" href="/">
          Dear Days
          <span className="mt-2 flex items-center gap-1.5 font-sans text-xs font-medium text-[var(--color-muted)]">
            ไดอารี่ภาพส่วนตัว <LeafIcon className="size-4 text-[var(--color-sage-strong)]" />
          </span>
        </Link>
        <nav aria-label="เมนูหลัก" className="mt-10 grid gap-1.5">
          {items.map(({ href, label, icon: Icon, active }) => (
            <Link
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${active ? "bg-[var(--color-sage)] text-[var(--color-green-deep)] shadow-sm" : "text-[var(--color-muted)] hover:bg-white/50 hover:text-[var(--color-green-deep)]"}`}
              href={href}
              key={label}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-3 px-2">
          <span aria-hidden="true" className="font-display flex size-11 items-center justify-center rounded-full bg-[var(--color-green)] text-lg text-white">{userName.charAt(0)}</span>
          <div className="min-w-0 text-sm">
            <p className="truncate font-semibold text-[var(--color-ink)]">{userName}</p>
            <p className="truncate text-xs text-[var(--color-muted)]">เก็บวันดี ๆ ไว้ด้วยกัน</p>
          </div>
        </div>
      </aside>

      <div className="min-w-0 pb-24 lg:pb-0">
        <header className="flex h-14 items-center justify-between border-b border-[var(--color-border)] px-4 lg:hidden">
          <Link className="font-display text-2xl text-[var(--color-green-deep)]" href="/">Dear Days</Link>
          <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-[var(--color-green)] text-sm text-white">{userName.charAt(0)}</span>
        </header>
        <main className="mx-auto w-full max-w-[76rem] px-4 py-6 sm:px-6 lg:px-9 lg:py-8">{children}</main>
      </div>

      <nav aria-label="เมนูมือถือ" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-[var(--color-border)] bg-[var(--color-paper)]/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {items.map(({ href, label, icon: Icon, active }) => (
          <Link aria-current={active ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${active ? "text-[var(--color-green)]" : "text-[var(--color-muted)]"}`} href={href} key={label}>
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
