"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { FollowedTeam, FollowedCompetition } from "./types";
import { readFollowedTeams, writeFollowedTeams, readFollowedCompetitions, writeFollowedCompetitions } from "./storage";
import { canonicalCompetitionId } from "@/lib/providers/football/ids";

/**
 * نفس البطولة الحقيقية قد تصل بمعرّفات مختلفة حسب الصفحة (af-307 من نتائج
 * البحث، tsdb-4668 من صفحة المباراة) — بلا توحيد هنا، كانت تُتابَع مرتين
 * كسجلّين منفصلين. canonicalCompetitionId هو نفس التوحيد المستخدَم أصلاً في
 * following.actions.ts وصفحة البحث؛ إعادة الوسم بصيغة af- تبقيه متوافقاً مع
 * كل استدعاء آخر لـcanonicalCompetitionId في المشروع (يتوقّع بادئة مصدر).
 */
function normalizeCompetitionId(id: string): string {
  const canonical = canonicalCompetitionId(id);
  return canonical !== null ? `af-${canonical}` : id;
}

interface FollowContextValue {
  followedTeams: FollowedTeam[];
  followedCompetitions: FollowedCompetition[];
  isFollowingTeam: (id: string) => boolean;
  isFollowingCompetition: (id: string) => boolean;
  followTeam: (team: FollowedTeam) => void;
  unfollowTeam: (id: string) => void;
  followCompetition: (competition: FollowedCompetition) => void;
  unfollowCompetition: (id: string) => void;
}

const FollowContext = createContext<FollowContextValue | null>(null);

/**
 * مصدر حقيقة واحد للمتابعة على مستوى التطبيق كله (نفس نمط LocaleProvider) —
 * لا كل زر "متابعة" يقرأ localStorage بمعزل عن الآخرين، فتبقى كل الأزرار
 * لنفس الفريق/البطولة متزامنة فوراً عبر الصفحة الواحدة.
 *
 * القيمة الابتدائية دائماً [] (آمنة للعرض الأول على الخادم والعميل بلا فارق
 * — localStorage غير متاح للسيرفر أصلاً) ثم تُحدَّث فور التركيب من التخزين
 * الفعلي — وميض بسيط جداً غير محسوس، لا خطر hydration mismatch حقيقي.
 */
export function FollowProvider({ children }: { children: ReactNode }) {
  const [followedTeams, setFollowedTeams] = useState<FollowedTeam[]>([]);
  const [followedCompetitions, setFollowedCompetitions] = useState<FollowedCompetition[]>([]);

  useEffect(() => {
    // setTimeout بدل استدعاء setState مباشرة في جسم الـeffect — نفس الحل
    // المعتمَد سابقاً في المشروع لقاعدة react-hooks/set-state-in-effect
    // (راجع SnapchatCreativeKitButton.tsx وMatchShareButton.tsx).
    const timer = setTimeout(() => {
      setFollowedTeams(readFollowedTeams());
      setFollowedCompetitions(readFollowedCompetitions());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const followTeam = useCallback((team: FollowedTeam) => {
    setFollowedTeams((prev) => {
      if (prev.some((t) => t.id === team.id)) return prev; // لا تكرار لنفس المعرّف
      const next = [...prev, team];
      writeFollowedTeams(next);
      return next;
    });
  }, []);

  const unfollowTeam = useCallback((id: string) => {
    setFollowedTeams((prev) => {
      const next = prev.filter((t) => t.id !== id);
      writeFollowedTeams(next);
      return next;
    });
  }, []);

  const followCompetition = useCallback((competition: FollowedCompetition) => {
    const id = normalizeCompetitionId(competition.id);
    setFollowedCompetitions((prev) => {
      if (prev.some((c) => c.id === id)) return prev;
      const next = [...prev, { ...competition, id }];
      writeFollowedCompetitions(next);
      return next;
    });
  }, []);

  const unfollowCompetition = useCallback((id: string) => {
    const normalizedId = normalizeCompetitionId(id);
    setFollowedCompetitions((prev) => {
      const next = prev.filter((c) => c.id !== normalizedId);
      writeFollowedCompetitions(next);
      return next;
    });
  }, []);

  const isFollowingTeam = useCallback((id: string) => followedTeams.some((t) => t.id === id), [followedTeams]);
  const isFollowingCompetition = useCallback(
    (id: string) => followedCompetitions.some((c) => c.id === normalizeCompetitionId(id)),
    [followedCompetitions]
  );

  return (
    <FollowContext.Provider
      value={{
        followedTeams,
        followedCompetitions,
        isFollowingTeam,
        isFollowingCompetition,
        followTeam,
        unfollowTeam,
        followCompetition,
        unfollowCompetition,
      }}
    >
      {children}
    </FollowContext.Provider>
  );
}

export function useFollow() {
  const ctx = useContext(FollowContext);
  if (!ctx) throw new Error("useFollow must be used within FollowProvider");
  return ctx;
}
