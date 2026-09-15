export type MatchStatus = "SCHEDULED" | "LIVE" | "FINISHED" | "POSTPONED" | "CANCELLED";

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logoUrl: string | null;
  country: string;
}

export interface Competition {
  id: string;
  name: string;
  shortName: string;
  country: string;
  logoUrl: string | null;
  colorFrom: string;
  colorTo: string;
}

export type MatchEventType = "GOAL" | "YELLOW_CARD" | "RED_CARD" | "SUBSTITUTION";

export interface MatchEvent {
  id: string;
  minute: number;
  extraMinute?: number;
  type: MatchEventType;
  teamId: string;
  playerName: string;
  /** معرّف اللاعب الحقيقي المُوسَوم بمصدره (af-...) إن توفّر من المصدر —
   * يُستخدم لتعريب الاسم عبر sports-names.ts، غير مضمون التوفر لكل مصدر. */
  playerId?: string;
  assistName?: string;
  assistId?: string;
  detail?: string;
  isOwnGoal?: boolean;
}

export type MatchStatKey =
  | "possession"
  | "shots"
  | "shotsOnTarget"
  | "corners"
  | "fouls"
  | "offsides"
  | "passes"
  | "passAccuracy"
  | "yellowCards"
  | "redCards";

export interface MatchStatLine {
  key: MatchStatKey;
  home: number;
  away: number;
  isPercentage?: boolean;
}

export interface LineupPlayer {
  number: number;
  name: string;
  /** معرّف اللاعب الحقيقي المُوسَوم بمصدره (af-...) إن توفّر من المصدر —
   * يُستخدم لتعريب الاسم عبر sports-names.ts، غير مضمون التوفر لكل مصدر. */
  playerId?: string;
  position: string;
  grid?: string | null;
  photoUrl?: string | null;
}

export interface TeamLineup {
  formation?: string;
  coach?: string;
  startXI: LineupPlayer[];
  substitutes: LineupPlayer[];
}

export type StandingsZone = "CONTINENTAL" | "RELEGATION" | null;

export interface StandingsEntry {
  position: number;
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  zone: StandingsZone;
}

export interface Match {
  id: string;
  competitionId: string;
  round?: string;
  venue?: string;
  city?: string;
  referee?: string;
  status: MatchStatus;
  kickoff: string; // ISO datetime
  minute?: number;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number | null;
  awayScore: number | null;
  events: MatchEvent[];
  stats: MatchStatLine[];
  lineups?: { home: TeamLineup; away: TeamLineup };
}

// قابلة للتوسع لاحقاً (المرحلة 3) بإضافة قيم جديدة فقط — لا تعديل بنيوي.
export type NewsCategory =
  | "SAUDI_LEAGUE"
  | "PREMIER_LEAGUE"
  | "LA_LIGA"
  | "BUNDESLIGA"
  | "SERIE_A"
  | "LIGUE_1"
  | "CHAMPIONS_LEAGUE"
  | "INTERNATIONAL"
  | "TRANSFERS"
  | "FOOTBALL"; // عام/غير مصنَّف تحديداً لبطولة بعينها

// تصنيف فرعي للانتقالات فقط — نصي مُستنتَج من عنوان/ملخص الخبر نفسه (لا
// قاعدة بيانات انتقالات منظّمة حقيقية متاحة مجاناً وقانونياً حالياً؛ راجع
// findTransferType في classify.ts). غير مؤكَّد = undefined، لا تخمين.
export type TransferType = "OFFICIAL" | "RUMOUR" | "CONTRACT" | "LOAN" | "FREE_TRANSFER";

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  imageUrl: string | null;
  source: string;
  sourceUrl: string;
  publishedAt: string; // ISO datetime
  category: NewsCategory;
  relatedName?: string; // اسم البطولة/الفريق المكتشَف من نص الخبر، إن وُجد
  language?: "ar" | "en"; // لغة نص الخبر الفعلية عند المصدر — لا ترجمة آلية أبداً
  // معرّف بطولة موحَّد (نفس نظام canonicalCompetitionId) — فقط عندما يكون
  // التصنيف إحدى البطولات الست الفعلية المتتبَّعة في المنصة (لها صفحة
  // حقيقية)، وإلا undefined بدل رابط لصفحة غير موجودة.
  competitionId?: string;
  // فقط عند category === "TRANSFERS" وتصنيف واثق من نص الخبر نفسه.
  transferType?: TransferType;
}

// محتوى مرئي كرة قدم حقيقي (Phase 2) — أهداف/ملخصات/مهارات/مقابلات من قنوات
// رسمية فقط (راجع lib/providers/media). قابلة للتوسع لاحقاً بقيم جديدة فقط.
export type MediaCategory =
  | "GOAL"
  | "HIGHLIGHT"
  | "EXTENDED_HIGHLIGHT"
  | "SKILLS"
  | "INTERVIEW"
  | "PRESS_CONFERENCE"
  | "OFFICIAL_CLUB"
  | "OFFICIAL_LEAGUE"
  | "NATIONAL_TEAM"
  | "OTHER";

export interface MediaItem {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl: string | null;
  source: string;
  sourceUrl: string;
  // رابط تضمين رسمي (iframe) فقط — لا تنزيل/استضافة ذاتية للفيديو أبداً.
  embedUrl?: string | null;
  publishedAt: string; // ISO datetime
  language?: "ar" | "en";
  category: MediaCategory;
  // اسم النادي/البطولة من هوية القناة الرسمية نفسها، إن وُجد — لا تخمين.
  relatedName?: string;
  // معرّفات موثوقة فقط عند وجود ربط حقيقي مؤكَّد — لا تخمين إطلاقاً. غير
  // مُفعَّلة حالياً (لا مخطط معرّفات موحَّد بين قنوات يوتيوب ومزوّدي المباريات).
  teamId?: string;
  competitionId?: string;
  matchId?: string;
  duration?: string | null;
  isEmbeddable: boolean;
  // من قناة معتمَدة يدوياً (راجع lib/providers/media/index.ts::CHANNELS)، لا
  // نتيجة بحث عام غير مؤكَّدة — يُستخدم كإشارة ثقة في match-media-matcher.
  // افتراضي true عند غيابه (كل المصادر الحالية معتمَدة يدوياً).
  isOfficialSource?: boolean;
}

export interface HomeStats {
  todayMatches: number;
  todayGoals: number;
  competitions: number;
  liveNow: number;
  newsToday: number;
}
