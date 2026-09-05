"use client";

import { useEffect, type ReactNode } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const { t } = useLocale();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-[var(--radius-lg)] sm:rounded-[var(--radius-lg)] bg-surface border border-border p-6 shadow-[var(--shadow-card)]"
      >
        {title && <h3 className="text-lg font-extrabold mb-4">{title}</h3>}
        {children}
        <button
          onClick={onClose}
          className="mt-6 w-full h-11 rounded-[var(--radius-sm)] border border-border text-muted font-bold hover:text-ink hover:border-primary/40 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {t.common.close}
        </button>
      </div>
    </div>
  );
}
