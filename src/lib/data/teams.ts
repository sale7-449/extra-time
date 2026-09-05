import type { Team } from "@/lib/types";

// لا شعارات حقيقية بعد — logoUrl فارغ عمداً حتى ربط API حقيقي.
// المكوّن TeamCrest يعرض Placeholder بدل تخمين شعار خاطئ (قاعدة معتمدة في المعمارية).
export const teams: Record<string, Team> = {
  hilal: { id: "hilal", name: "الهلال", shortName: "HIL", logoUrl: null, country: "السعودية" },
  nassr: { id: "nassr", name: "النصر", shortName: "NAS", logoUrl: null, country: "السعودية" },
  ittihad: { id: "ittihad", name: "الاتحاد", shortName: "ITT", logoUrl: null, country: "السعودية" },
  ahli: { id: "ahli", name: "الأهلي", shortName: "AHL", logoUrl: null, country: "السعودية" },
  realMadrid: { id: "real-madrid", name: "ريال مدريد", shortName: "RMA", logoUrl: null, country: "إسبانيا" },
  barcelona: { id: "barcelona", name: "برشلونة", shortName: "BAR", logoUrl: null, country: "إسبانيا" },
  liverpool: { id: "liverpool", name: "ليفربول", shortName: "LIV", logoUrl: null, country: "إنجلترا" },
  manCity: { id: "man-city", name: "مانشستر سيتي", shortName: "MCI", logoUrl: null, country: "إنجلترا" },
  bayern: { id: "bayern", name: "بايرن ميونخ", shortName: "BAY", logoUrl: null, country: "ألمانيا" },
  psg: { id: "psg", name: "باريس سان جيرمان", shortName: "PSG", logoUrl: null, country: "فرنسا" },
};
