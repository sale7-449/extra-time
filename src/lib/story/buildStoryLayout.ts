import type { ContentItem } from "@/lib/providers/social/types";
import type { StoryLayout } from "./types";

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * تحويل صرف: ContentItem → StoryLayout — بلا Canvas إطلاقاً، قابل للاختبار
 * الكامل بدون متصفح. يُعيد null إن كانت البيانات الحقيقية اللازمة لهذا
 * النوع تحديداً غير مكتملة (لا يُبنى Story بحقل مُختلَق بدلاً منها).
 */
export function buildStoryLayout(item: ContentItem, locale: "ar" | "en" = "ar"): StoryLayout | null {
  const dir: "rtl" | "ltr" = item.language === "en" ? "ltr" : item.language === "ar" ? "rtl" : locale === "en" ? "ltr" : "rtl";

  switch (item.kind) {
    case "MATCH_RESULT": {
      const homeTeamName = str(item.data?.homeTeam);
      const awayTeamName = str(item.data?.awayTeam);
      const homeScore = num(item.data?.homeScore);
      const awayScore = num(item.data?.awayScore);
      if (!homeTeamName || !awayTeamName || homeScore === undefined || awayScore === undefined) return null;

      return {
        template: "MATCH_RESULT",
        dir,
        headline: item.title,
        homeTeamName,
        awayTeamName,
        homeTeamLogoUrl: str(item.data?.homeTeamLogo) ?? null,
        awayTeamLogoUrl: str(item.data?.awayTeamLogo) ?? null,
        scoreText: `${homeScore}-${awayScore}`,
      };
    }

    case "GOAL": {
      const player = str(item.data?.player);
      const team = str(item.data?.team);
      const homeTeamName = str(item.data?.homeTeam);
      const awayTeamName = str(item.data?.awayTeam);
      if (!player || !team || !homeTeamName || !awayTeamName) return null;

      const minute = num(item.data?.minute);
      const extraMinute = num(item.data?.extraMinute);
      const minuteLabel = minute !== undefined ? `${minute}${extraMinute ? `+${extraMinute}` : ""}'` : undefined;
      const isOwnGoal = item.data?.isOwnGoal === true;

      return {
        template: "GOAL",
        dir,
        headline: player,
        subline: [minuteLabel, isOwnGoal ? (dir === "rtl" ? "هدف عكسي" : "Own Goal") : undefined].filter(Boolean).join(" · ") || undefined,
        competitionLabel: team,
        homeTeamName,
        awayTeamName,
        imageUrl: str(item.data?.teamLogo) ?? null,
      };
    }

    case "NEWS": {
      const headline = str(item.title);
      if (!headline) return null;

      return {
        template: "NEWS",
        dir,
        headline,
        subline: str(item.summary),
        imageUrl: item.imageUrl ?? null,
        sourceLabel: str(item.data?.source),
      };
    }

    case "VIDEO": {
      const headline = str(item.title);
      if (!headline) return null;

      return {
        template: "VIDEO",
        dir,
        headline,
        imageUrl: item.imageUrl ?? null,
        isVideo: true,
        sourceLabel: str(item.data?.source),
      };
    }

    case "MATCH_SUMMARY": {
      const headline = str(item.title);
      if (!headline) return null;

      const homeScore = num(item.data?.homeScore);
      const awayScore = num(item.data?.awayScore);

      return {
        template: "MATCH_SUMMARY",
        dir,
        headline,
        subline: str(item.summary),
        imageUrl: item.imageUrl ?? null,
        homeTeamName: str(item.data?.homeTeam),
        awayTeamName: str(item.data?.awayTeam),
        scoreText: homeScore !== undefined && awayScore !== undefined ? `${homeScore}-${awayScore}` : undefined,
      };
    }

    case "IMAGE": {
      const headline = str(item.title);
      // صورة بلا صورة فعلية لا تصلح لهذا القالب أصلاً — لا صورة بديلة مُختلَقة.
      if (!headline || !item.imageUrl) return null;

      return {
        template: "IMAGE",
        dir,
        headline,
        subline: str(item.summary),
        imageUrl: item.imageUrl,
      };
    }

    // TRANSFER غير مدعوم بعد (لا مولّد Story له حالياً — راجع خطة Phase 3).
    default:
      return null;
  }
}
