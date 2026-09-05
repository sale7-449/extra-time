import type { InputHTMLAttributes } from "react";
import { cx } from "@/lib/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        "h-11 w-full rounded-[var(--radius-sm)] border border-border bg-surface-2 px-3.5 text-sm text-ink placeholder:text-muted-dim outline-none transition-colors focus:border-primary/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary",
        className
      )}
      {...props}
    />
  );
}
