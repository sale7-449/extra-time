"use client";

import { useState, type ReactNode } from "react";
import { cx } from "@/lib/utils";

interface TabItem {
  key: string;
  label: string;
  /** لا بيانات حقيقية لهذا التبويب لهذه المباراة بعينها — يبقى ظاهراً (يوضح
   * أن الميزة موجودة أصلاً) لكن غير قابل للنقر، بدل تبويب يبدو عادياً يفتح
   * على حالة فارغة، أو تبويب يختفي فيبدو أن الميزة غير موجودة إطلاقاً. */
  disabled?: boolean;
  /** يُشرح لماذا هو معطَّل (tooltip) — يمنع الالتباس بين "معطَّل عمداً" و"عطل". */
  disabledHint?: string;
}

export function Tabs({
  items,
  defaultKey,
  onChange,
  className,
}: {
  items: TabItem[];
  defaultKey?: string;
  onChange?: (key: string) => void;
  className?: string;
}) {
  const [active, setActive] = useState(defaultKey ?? items[0]?.key);

  function select(item: TabItem) {
    if (item.disabled) return;
    setActive(item.key);
    onChange?.(item.key);
  }

  return (
    <div
      role="tablist"
      className={cx(
        "flex items-center gap-1 rounded-[var(--radius-sm)] bg-surface border border-border p-1 w-fit",
        className
      )}
    >
      {items.map((item) => (
        <button
          key={item.key}
          role="tab"
          aria-selected={active === item.key}
          aria-disabled={item.disabled}
          disabled={item.disabled}
          title={item.disabled ? item.disabledHint : undefined}
          onClick={() => select(item)}
          className={cx(
            "shrink-0 whitespace-nowrap px-4 h-8 rounded-[8px] text-sm font-bold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary inline-flex items-center gap-1.5",
            item.disabled
              ? "text-muted-dim cursor-not-allowed opacity-60"
              : active === item.key
                ? "bg-primary text-primary-ink"
                : "text-muted hover:text-ink"
          )}
        >
          {item.disabled && (
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
              <rect x="5" y="11" width="14" height="9" rx="1.5" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          )}
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function TabPanel({ active, children }: { active: boolean; children: ReactNode }) {
  if (!active) return null;
  return <div>{children}</div>;
}
