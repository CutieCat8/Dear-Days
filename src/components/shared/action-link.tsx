import Link from "next/link";
import type { ReactNode } from "react";

type ActionLinkProps = {
  children: ReactNode;
  href: string;
  icon?: ReactNode;
  variant?: "primary" | "secondary";
};

export function ActionLink({ children, href, icon, variant = "primary" }: ActionLinkProps) {
  const style = variant === "primary"
    ? "bg-[var(--color-green)] text-white hover:bg-[var(--color-green-deep)]"
    : "border border-[var(--color-border)] bg-[var(--color-paper)] text-[var(--color-green-deep)] hover:border-[var(--color-sage-strong)] hover:bg-[var(--color-sage)]/45";

  return (
    <Link className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition ${style}`} href={href}>
      {icon}
      {children}
    </Link>
  );
}
