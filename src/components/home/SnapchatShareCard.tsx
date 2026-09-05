"use client";

import { GhostIcon, ShareIcon } from "@/components/icons";
import { useSnapchatShare } from "@/lib/providers/snapchat/useSnapchatShare";
import type { SnapchatShareKind } from "@/lib/providers/snapchat";
import { cx } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function SnapchatShareCard() {
  const { status, message, share } = useSnapchatShare();
  const { t } = useLocale();

  const options: { kind: SnapchatShareKind; label: string; text: string }[] = [
    { kind: "RESULT", label: t.snapchat.result, text: t.snapchat.resultText },
    { kind: "STATS", label: t.snapchat.stats, text: t.snapchat.statsText },
    { kind: "GOAL", label: t.snapchat.goal, text: t.snapchat.goalText },
    { kind: "MOMENT", label: t.snapchat.moment, text: t.snapchat.momentText },
  ];

  function handleShare(opt: (typeof options)[number]) {
    share(opt.kind, {
      title: "EXTRA TIME",
      text: opt.text,
      url: typeof window !== "undefined" ? window.location.origin : "",
    });
  }

  return (
    <section className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface p-6 md:p-8">
      <div
        className="pointer-events-none absolute -top-24 -end-24 h-56 w-56 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--primary)" }}
        aria-hidden
      />

      <div className="relative flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex items-center gap-4 md:flex-1">
          <div className="w-14 h-14 shrink-0 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center text-primary [&_svg]:w-7 [&_svg]:h-7">
            <GhostIcon />
          </div>
          <div>
            <h3 className="text-xl font-extrabold">{t.snapchat.title}</h3>
            <p className="mt-1 text-sm text-muted max-w-md">{t.snapchat.desc}</p>
          </div>
        </div>
      </div>

      <div className="relative mt-6 grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {options.map((opt) => (
          <button
            key={opt.kind}
            onClick={() => handleShare(opt)}
            disabled={status === "loading"}
            className="flex items-center gap-2 rounded-[var(--radius-sm)] border border-border bg-surface-2 px-3.5 h-11 text-sm font-bold text-muted hover:border-primary/30 hover:text-ink transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            <ShareIcon className="w-4 h-4 shrink-0 text-primary" />
            <span className="truncate">{opt.label}</span>
          </button>
        ))}
      </div>

      {message && (
        <p className={cx("relative mt-4 text-xs", status === "success" ? "text-primary" : "text-muted-dim")}>{message}</p>
      )}
    </section>
  );
}
