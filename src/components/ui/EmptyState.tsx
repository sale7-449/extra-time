"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 py-16 px-6">
      {icon && <div className="text-muted opacity-60 [&_svg]:w-10 [&_svg]:h-10">{icon}</div>}
      <p className="font-extrabold text-lg">{title}</p>
      {description && <p className="text-muted text-sm max-w-xs">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 py-16 px-6">
      <p className="font-extrabold text-lg text-error">{title ?? t.common.errorTitle}</p>
      <p className="text-muted text-sm max-w-xs">{description ?? t.common.errorDesc}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 h-10 px-5 rounded-[var(--radius-sm)] bg-surface border border-border font-bold hover:border-primary/40 transition-colors"
        >
          {t.common.retry}
        </button>
      )}
    </div>
  );
}
