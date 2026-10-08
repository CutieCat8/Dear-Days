import Link from "next/link";
import type { ReactNode } from "react";

import { LockIcon } from "@/components/shared/icons";

type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items, isPrivate = true, card = false, right }: { items: Crumb[]; isPrivate?: boolean; card?: boolean; right?: ReactNode }) {
  return (
    <div className={`mb-4 flex items-center justify-between gap-3 text-[0.78rem] text-[var(--color-muted)] ${card ? "panel !rounded-xl px-4 py-2.5" : "border-b border-[var(--color-border)] pb-3"}`}>
      <nav aria-label="Breadcrumb" className="lg:pointer-events-auto">
        <ol className="flex flex-wrap items-center gap-1.5">
          {items.map((item, index) => (
            <li className="flex items-center gap-1.5" key={item.label}>
              {index > 0 ? <span aria-hidden="true" className="text-[var(--color-sage-strong)]">&gt;</span> : null}
              {item.href ? (
                <Link className="rounded px-0.5 hover:text-[var(--color-green-deep)] hover:underline" href={item.href}>{item.label}</Link>
              ) : (
                <span aria-current="page" className="font-medium text-[var(--color-ink)]">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      {right ? <div className="flex shrink-0 items-center gap-3 lg:pointer-events-auto">{right}</div> : isPrivate ? (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--color-sage)]/70 lg:pointer-events-auto px-2.5 py-1 text-[0.7rem] font-medium text-[var(--color-green-deep)]">
          <LockIcon className="size-3.5" /> Private
        </span>
      ) : null}
    </div>
  );
}
