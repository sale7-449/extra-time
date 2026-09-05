import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

type Tone = "neutral" | "primary" | "live" | "success" | "warning" | "error";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted border border-border",
  primary: "bg-primary/10 text-primary border border-primary/30",
  live: "bg-live/10 text-live border border-live/30",
  success: "bg-success/10 text-success border border-success/30",
  warning: "bg-warning/10 text-warning border border-warning/30",
  error: "bg-error/10 text-error border border-error/30",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold leading-none",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
