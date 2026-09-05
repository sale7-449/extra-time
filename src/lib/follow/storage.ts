import type { FollowedTeam, FollowedCompetition } from "./types";

/**
 * الاستمرارية المحلية الوحيدة في المشروع حالياً (Phase 5) — بلا حساب، بلا
 * backend، تماماً كما طُلب. localStorage فقط، بفشل صامت وآمن دائماً (خاص/
 * معطَّل/حصة ممتلئة) — المتابعة تبقى تعمل لهذه الجلسة حتى لو تعذّر الحفظ.
 */

const TEAMS_KEY = "et:followedTeams";
const COMPETITIONS_KEY = "et:followedCompetitions";

function isValidEntry(v: unknown): v is { id: string; name: string; logoUrl: string | null } {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.id === "string" && o.id.length > 0 && typeof o.name === "string" && (o.logoUrl === null || typeof o.logoUrl === "string");
}

function readList<T extends { id: string }>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // بيانات محفوظة تالفة/قديمة الصيغة تُتجاهَل بصمت بدل تعطيل الميزة بالكامل
    // أو عرضها كأنها عناصر حقيقية.
    return parsed.filter(isValidEntry) as unknown as T[];
  } catch {
    return [];
  }
}

function writeList<T>(key: string, list: T[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // التخزين غير متاح — لا كسر، الحالة تبقى في الذاكرة فقط لهذه الجلسة.
  }
}

export function readFollowedTeams(): FollowedTeam[] {
  return readList<FollowedTeam>(TEAMS_KEY);
}

export function writeFollowedTeams(list: FollowedTeam[]): void {
  writeList(TEAMS_KEY, list);
}

export function readFollowedCompetitions(): FollowedCompetition[] {
  return readList<FollowedCompetition>(COMPETITIONS_KEY);
}

export function writeFollowedCompetitions(list: FollowedCompetition[]): void {
  writeList(COMPETITIONS_KEY, list);
}
