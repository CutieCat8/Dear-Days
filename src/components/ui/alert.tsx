import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

const VARIANTS = {
  default: "border-[var(--color-border-strong)] bg-[var(--color-paper)] text-[var(--color-green-deep)]",
  destructive: "border-[#e3b9b9] bg-[#fbeeee] text-[#8a3a3a]",
} as const;

type AlertProps = ComponentProps<"div"> & { variant?: keyof typeof VARIANTS };

/** Same API as the shadcn/ui Alert: an optional leading icon, then AlertTitle and AlertDescription. */
export function Alert({ className, variant = "default", ...props }: AlertProps) {
  return (
    <div
      className={cn(
        "relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[1.1rem_1fr] has-[>svg]:gap-x-3 [&>svg]:size-[1.1rem] [&>svg]:translate-y-0.5 [&>svg]:text-current",
        VARIANTS[variant],
        className,
      )}
      data-slot="alert"
      role="alert"
      {...props}
    />
  );
}

export function AlertTitle({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("col-start-2 min-h-4 font-semibold leading-tight tracking-tight", className)} data-slot="alert-title" {...props} />;
}

export function AlertDescription({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("col-start-2 text-[0.8rem] leading-snug opacity-90", className)} data-slot="alert-description" {...props} />;
}
