import Link from "next/link";
import type { ReactNode } from "react";

type ActionLinkProps = {
  children: ReactNode;
  href: string;
  icon?: ReactNode;
  variant?: "primary" | "secondary";
};

export function ActionLink({ children, href, icon, variant = "primary" }: ActionLinkProps) {
  return (
    <Link className={`btn ${variant === "primary" ? "btn-primary" : "btn-secondary"}`} href={href}>
      {icon}
      {children}
    </Link>
  );
}
