import type {
  Competition,
  LineupPlayer,
  Match,
  MatchEvent,
  MatchEventType,
  MatchStatKey,
  MatchStatLine,
  MatchStatus,
  StandingsEntry,
  Team,
  TeamLineup,
} from "@/lib/types";
import type {
  EspnBoxscoreTeam,
  EspnEvent,
  EspnKeyEvent,
  EspnRosterEntry,
  EspnRosterTeam,
  EspnStandingEntry,
  EspnTeamRef,
} from "./espn-types";
import { tagId } from "./ids";
import { normalizePositionCode } from "./position";

/**
 * كل ما يعرف شكل استجابة ESPN محصور هنا. ESPN غير مُستخدَم كمصدر أساسي
 * للقوائم عادةً (API-Football وTheSportsDB يكفيان غالباً)، لكنه يُستخدم
 * لإثراء مباراة موجودة فعلاً بأحداث/إحصائيات/تشكيلة حين لا يوفّرها المصدر
 * الأصلي — ومصدر احتياطي كامل إن فشل الاثنان الآخران معاً.
 */

function toTeam(ref: EspnTeamRef): Team {
  const name = ref.displayName;
  return {
    id: tagId("espn", ref.id),
    name,
    shortName: (ref.shortDisplayName ?? name).slice(0, 3).toUpperCase(),
    logoUrl: ref.logo ?? null,
    country: "",
  };
}

const STATUS_MAP: Record<string, MatchStatus> = {
  pre: "SCHEDULED",
  in: "LIVE",
  post: "FINISHED",
};

export function mapEspnEventToMatch(event: EspnEvent, leagueSlug: string): Match | null {
  const comp = event.competitions[0];
  if (!comp) return null;
  const home = comp.competitors.find((c) => c.homeAway === "home");
  const away = comp.competitors.find((c) => c.homeAway === "away");
  if (!home || !away) return null;

  const statusName = event.status.type.name ?? "";
  let status = STATUS_MAP[event.status.type.state] ?? "SCHEDULED";
  if (statusName.includes("POSTPONED")) status = "POSTPONED";
  if (statusName.includes("CANCEL") || statusName.includes("ABANDON")) status = "CANCELLED";

  return {
    id: tagId("espn", event.id),
    competitionId: tagId("espn", leagueSlug),
    round: comp.round?.displayName ?? undefined,
    venue: comp.venue?.fullName ?? undefined,
    city: comp.venue?.address?.city ?? undefined,
    referee: undefined,
    status,
    kickoff: event.date,
    minute: status === "LIVE" ? Number(event.status.displayClock?.replace("'", "")) || undefined : undefined,
    homeTeam: toTeam(home.team),
    awayTeam: toTeam(away.team),
    // ESPN يُعيد "0" حرفياً لحقل score حتى لمباراة لم تبدأ بعد (status=pre) —
    // ليس null كما في المصادر الأخرى. عرض "0-0" كأنها نتيجة فعلية لمباراة لم
    // تُلعَب مضلِّل تماماً (راجع ScoreDisplay.tsx: null فقط يُظهر "VS" بدل رقمين).
    homeScore: status !== "SCHEDULED" && home.score !== undefined ? Number(home.score) : null,
    awayScore: status !== "SCHEDULED" && away.score !== undefined ? Number(away.score) : null,
    events: [],
    stats: [],
  };
}

/** ESPN يُصدر أنواعاً فرعية وصفية لنفس الحدث (أمثلة حقيقية رُصِدت: "Goal -
 * Header"، "Penalty - Scored") لا نصاً ثابتاً واحداً — مطابقة تامة فقط كانت
 * تُسقط هذه الأهداف بصمت (رُصِد فعلياً: مباراة انتهت 0-2 لكن حدث ركلة جزاء
 * محتسبة "Penalty - Scored" غاب من قائمة الأهداف، فبدت المباراة وكأنها
 * انتهت بهدف واحد فقط رغم صحة النتيجة المعروضة). "Penalty - Missed" يبقى
 * مستبعَداً عمداً — ليس هدفاً فعلياً ولا يوجد نوع حدث مناسب له في مخططنا. */
function classifyEspnEventType(text: string): MatchEventType | null {
  if (text === "Own Goal" || text === "Penalty - Scored" || text.startsWith("Goal")) return "GOAL";
  if (text === "Yellow Card") return "YELLOW_CARD";
  if (text === "Red Card") return "RED_CARD";
  if (text === "Substitution") return "SUBSTITUTION";
  return null;
}

/** نوع الهدف حين يذكره النص الوصفي فعلياً ("Goal - Header" → "Header"،
 * "Penalty - Scored" → "Penalty") — لا شيء لنص "Goal"/"Own Goal" الفارغين
 * من تفصيل إضافي (isOwnGoal يُعلِّم الهدف العكسي أصلاً بمكان آخر). */
function extractGoalDetail(text: string): string | undefined {
  if (text === "Penalty - Scored") return "Penalty";
  if (text.startsWith("Goal - ")) return text.slice("Goal - ".length);
  return undefined;
}

/**
 * يربط event.team (معرّف ESPN الداخلي) بمعرّف الفريق الفعلي في المباراة
 * الأساسية (target.home/away قادمان من المصدر الأصلي af-/tsdb-، وليس من
 * ESPN) — عبر مقارنة جهة الفريق (home/away) على ESPN نفسه، لا عبر مطابقة
 * نصية للمعرّف بين مخططين مختلفين تماماً.
 */
/** يحلّل صيغة الدقيقة النصية من ESPN ("45'"، "45'+7'"، "90'+4'") إلى دقيقة
 * أساسية + دقيقة إضافية منفصلتين — تجريد كل الأرقام معاً (كما كان سابقاً)
 * كان يحوّل "45'+7'" إلى 457 خطأً بدل 45+7. */
function parseEspnClock(displayValue: string): { minute: number; extraMinute?: number } {
  const match = displayValue.match(/(\d+)\s*'?\s*(?:\+\s*(\d+))?/);
  if (!match) return { minute: 0 };
  return {
    minute: parseInt(match[1], 10) || 0,
    extraMinute: match[2] ? parseInt(match[2], 10) : undefined,
  };
}

export function mapEspnKeyEventsToEvents(
  keyEvents: EspnKeyEvent[],
  espnHomeTeamId: string,
  espnAwayTeamId: string,
  targetTeamIds: { home: string; away: string }
): MatchEvent[] {
  return keyEvents
    .map((e, i) => ({ e, i, type: classifyEspnEventType(e.type.text) }))
    .filter((x): x is { e: EspnKeyEvent; i: number; type: MatchEventType } => x.type !== null)
    .map(({ e, i, type }) => {
      const { minute, extraMinute } = parseEspnClock(e.clock.displayValue);
      const teamId = e.team?.id === espnAwayTeamId ? targetTeamIds.away : targetTeamIds.home;
      const participants = e.participants ?? [];

      // ترتيب المشاركين في ESPN يختلف فعلياً حسب نوع الحدث — رُصِد مباشرة:
      // التبديل [الخارج, الداخل]، لكن الهدف [الهادف, صاحب التمريرة الحاسمة]
      // (عكسي تماماً). استخدام نفس منطق الفهرسة للنوعين كان يُظهر صاحب
      // التمريرة الحاسمة كأنه الهدّاف والعكس.
      let playerName = "—";
      let assistName: string | undefined;
      let detail: string | undefined;

      if (type === "SUBSTITUTION") {
        playerName = participants[participants.length > 1 ? 1 : 0]?.athlete.displayName ?? "—";
        detail = participants.length > 1 ? participants[0].athlete.displayName : undefined;
      } else if (type === "GOAL") {
        playerName = participants[0]?.athlete.displayName ?? "—";
        assistName = participants.length > 1 ? participants[1].athlete.displayName : undefined;
        detail = extractGoalDetail(e.type.text);
      } else {
        playerName = participants[0]?.athlete.displayName ?? "—";
      }

      return {
        id: `espn-${e.id}-${i}`,
        minute,
        extraMinute,
        type,
        teamId,
        playerName,
        assistName,
        detail,
        isOwnGoal: e.type.text === "Own Goal",
      };
    });
}

const STAT_NAME_TO_KEY: Record<string, MatchStatKey> = {
  possessionPct: "possession",
  totalShots: "shots",
  shotsOnTarget: "shotsOnTarget",
  wonCorners: "corners",
  foulsCommitted: "fouls",
  offsides: "offsides",
  totalPasses: "passes",
  passPct: "passAccuracy",
  yellowCards: "yellowCards",
  redCards: "redCards",
};

export function mapEspnBoxscoreToStats(teams: EspnBoxscoreTeam[]): MatchStatLine[] {
  const home = teams.find((t) => t.homeAway === "home") ?? teams[0];
  const away = teams.find((t) => t.homeAway === "away") ?? teams[1];
  if (!home || !away) return [];

  const find = (team: EspnBoxscoreTeam, name: string) => team.statistics.find((s) => s.name === name);

  // الاستحواذ الحقيقي بين فريقين يجمع لِما يقارب 100% دائماً — "0" للفريقين
  // معاً مستحيل لمباراة لُعبت فعلاً، وهو تحديداً ما يُعيده ESPN حين لا يُتابع
  // إحصائيات صندوق النتيجة (Box Score) لهذه المباراة (رُصِد فعلياً في دوري
  // روشن السعودي) — البطاقات تبقى صحيحة (مصدرها موجز الأحداث المنفصل) لكن كل
  // إحصائية أخرى تصبح "0" حرفياً لا لأنها القيمة الحقيقية، بل غيابها. عرضها
  // كأرقام حقيقية (كـ"0% - 0% استحواذ") أشد تضليلاً من عدم عرضها إطلاقاً.
  const possessionHome = parseFloat(find(home, "possessionPct")?.displayValue ?? "");
  const possessionAway = parseFloat(find(away, "possessionPct")?.displayValue ?? "");
  if (possessionHome === 0 && possessionAway === 0) return [];

  return Object.entries(STAT_NAME_TO_KEY)
    .map(([espnName, key]): MatchStatLine | null => {
      const homeStat = find(home, espnName);
      const awayStat = find(away, espnName);
      if (!homeStat && !awayStat) return null;

      const isPercentage = espnName === "possessionPct";
      const parse = (v: string | undefined) => {
        if (!v) return 0;
        const n = parseFloat(v.replace("%", ""));
        return espnName === "passPct" ? Math.round(n * 100) : Math.round(n);
      };

      return {
        key,
        home: parse(homeStat?.displayValue),
        away: parse(awayStat?.displayValue),
        isPercentage: isPercentage || espnName === "passPct",
      };
    })
    .filter((s): s is MatchStatLine => s !== null);
}

export function mapEspnRostersToLineups(rosters: EspnRosterTeam[]): { home: TeamLineup; away: TeamLineup } | undefined {
  if (rosters.length < 2) return undefined;
  const home = rosters.find((r) => r.homeAway === "home");
  const away = rosters.find((r) => r.homeAway === "away");
  if (!home || !away) return undefined;

  const toPlayer = (entry: EspnRosterEntry): LineupPlayer => ({
    number: entry.jersey ? Number(entry.jersey) : 0,
    name: entry.athlete.displayName,
    position: normalizePositionCode(entry.position?.abbreviation),
    photoUrl: entry.athlete.headshot?.href ?? null,
  });

  // رُصِد فعلياً: ESPN قد يُعيد عنصر فريق داخل rosters بلا مصفوفة roster
  // فعلية (مباراة لم تُعلَن تشكيلتها بعد) — كان .filter على undefined يرمي
  // استثناءً يُسقط events/stats المحسوبة بنجاح في نفس الاستدعاء أيضاً (كلها
  // تُبنى داخل نفس try/catch في الطرف المستدعي)، لا التشكيلة فقط.
  const toLineup = (r: EspnRosterTeam): TeamLineup => ({
    formation: r.formation ?? undefined,
    startXI: (r.roster ?? []).filter((p) => p.starter).map(toPlayer),
    substitutes: (r.roster ?? []).filter((p) => !p.starter).map(toPlayer),
  });

  return { home: toLineup(home), away: toLineup(away) };
}

export function mapEspnLeagueToCompetition(leagueSlug: string, name: string, logo: string | null): Competition {
  const palette: Array<[string, string]> = [
    ["#1f6b3a", "#0f3320"],
    ["#3a1f6b", "#1c0f33"],
    ["#6b1f2f", "#330f17"],
    ["#1f3d6b", "#0f1e33"],
    ["#6b5a1f", "#332b0f"],
    ["#6b1f1f", "#330f0f"],
  ];
  let hash = 0;
  for (const ch of leagueSlug) hash += ch.charCodeAt(0);
  const [colorFrom, colorTo] = palette[hash % palette.length];

  return {
    id: tagId("espn", leagueSlug),
    name,
    shortName: name,
    country: "",
    logoUrl: logo,
    colorFrom,
    colorTo,
  };
}

export function mapEspnStandingsToStandings(entries: EspnStandingEntry[]): StandingsEntry[] {
  const getStat = (e: EspnStandingEntry, name: string) => e.stats.find((s) => s.name === name)?.value ?? 0;

  return entries.map((e, i) => {
    const goalsFor = getStat(e, "pointsFor");
    const goalsAgainst = getStat(e, "pointsAgainst");
    return {
      position: i + 1,
      team: toTeam(e.team),
      played: getStat(e, "gamesPlayed"),
      won: getStat(e, "wins"),
      drawn: getStat(e, "ties"),
      lost: getStat(e, "losses"),
      goalsFor,
      goalsAgainst,
      points: getStat(e, "points"),
      zone: i < 4 ? "CONTINENTAL" : entries.length - i < 3 ? "RELEGATION" : null,
    };
  });
}
