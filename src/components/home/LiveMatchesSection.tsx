"use client";

import { useEffect, useRef, useState } from "react";
import type { Match } from "@/lib/types";
import { LiveMatchCard } from "@/components/home/LiveMatchCard";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const REFRESH_INTERVAL_MS = 40_000; // لا Polling عدواني — كل 40 ثانية فقط، ولا يستدعي API-Football مباشرة (يمر عبر مسارنا المخزَّن مؤقتاً)

type FetchState = "idle" | "refreshing" | "error";

export function LiveMatchesSection({ initialMatches }: { initialMatches: Match[] }) {
  const [matches, setMatches] = useState(initialMatches);
  const [state, setState] = useState<FetchState>("idle");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isMounted = useRef(true);
  const { t, locale } = useLocale();

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (matches.length === 0) return; // لا داعي للتحديث إن لم تكن هناك مباريات مباشرة أصلاً

    const timer = setInterval(async () => {
      setState("refreshing");
      try {
        const res = await fetch("/api/live-matches", { cache: "no-store" });
        if (!res.ok) throw new Error("bad status");
        const data = await res.json();
        if (!isMounted.current) return;
        setMatches(data.matches);
        setLastUpdated(new Date());
        setState("idle");
      } catch {
        if (isMounted.current) setState("error");
      }
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [matches.length]);

  if (matches.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 text-xs text-muted-dim">
        {state === "refreshing" && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            {t.common.refreshing}
          </span>
        )}
        {state === "error" && <span className="text-warning">{t.common.refreshError}</span>}
        {state === "idle" && lastUpdated && (
          <span>
            {t.common.lastUpdated}{" "}
            <span dir="ltr" className="tabular">
              {lastUpdated.toLocaleTimeString(locale === "ar" ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {matches.map((m) => (
          <LiveMatchCard key={m.id} match={m} />
        ))}
      </div>
    </div>
  );
}
