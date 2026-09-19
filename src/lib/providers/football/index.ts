import { unstable_cache } from "next/cache";
import type { FootballProvider } from "./types";
import { MockFootballProvider } from "./mock-provider";
import { ApiFootballProvider } from "./api-football-provider";
import { TheSportsDbProvider } from "./thesportsdb-provider";
import { EspnProvider, findEspnEventId, getEspnEnrichment } from "./espn-provider";
import { parseTaggedId, type ProviderTag } from "./ids";
import type { Competition, Match, StandingsEntry, Team } from "@/lib/types";

const mock = new MockFootballProvider();
const apiKey = process.env.API_FOOTBALL_KEY;
const apiFootball = apiKey ? new ApiFootballProvider(apiKey) : null;
// لا مفتاح مطلوب — TheSportsDB وESPN مفعَّلان دائماً كمصدرين ثانٍ وثالث ما لم
// يُعطَّلا صراحةً.
const theSportsDb = process.env.THESPORTSDB_ENABLED === "false" ? null : new TheSportsDbProvider();
const espn = process.env.ESPN_ENABLED === "false" ? null : new EspnProvider();

/** يُرمى عندما تكون هناك بيانات حقيقية مُهيَّأة (مصدر واحد على الأقل) لكن كل
 * المصادر الحقيقية فشلت فعلياً — لا نُخفي هذا خلف Mock صامت، لأن ذلك يعرض
 * بيانات قديمة/مصطنعة على أنها حالية. طبقة الخدمة تلتقط هذا وتُرجع حالة
 * "unavailable" صريحة للواجهة. */
export class RealDataUnavailableError extends Error {}

// ترتيب الأولوية صريح: API-Football أولاً، ثم TheSportsDB، ثم ESPN — لقوائم
// المباريات/البطولات (أول نجاح يُستخدم بالكامل). لعنصر مفرد (مباراة واحدة)
// التوجيه يكون مباشراً حسب بادئة المعرّف عبر PROVIDER_BY_TAG أدناه، وESPN
// يُستخدم بشكل إضافي هناك لإثراء الحقول الناقصة فقط (انظر withMatchEnrichment).
const REAL_PROVIDERS: Array<{ tag: ProviderTag; provider: FootballProvider }> = [
  ...(apiFootball ? [{ tag: "af" as const, provider: apiFootball }] : []),
  ...(theSportsDb ? [{ tag: "tsdb" as const, provider: theSportsDb }] : []),
  ...(espn ? [{ tag: "espn" as const, provider: espn }] : []),
];

const PROVIDER_BY_TAG: Record<ProviderTag, FootballProvider | null> = {
  af: apiFootball,
  tsdb: theSportsDb,
  espn,
};

/**
 * سلسلة مصادر حقيقية: يُجرَّب كل مصدر مُهيَّأ بالترتيب (API-Football ثم
 * TheSportsDB ثم ESPN)، وأول نجاح يُستخدم. Mock هو المصدر المتعمَّد فقط عند
 * غياب أي مصدر حقيقي مُفعَّل إطلاقاً (بيئة تطوير/معاينة بلا مفاتيح).
 */
function withChain<K extends keyof FootballProvider>(method: K) {
  return async (...args: Parameters<FootballProvider[K]>): Promise<Awaited<ReturnType<FootballProvider[K]>>> => {
    if (REAL_PROVIDERS.length === 0) {
      // @ts-expect-error – التوقيع مطابق فعلياً بين كل المزوّدين لكل مفتاح K
      return mock[method](...args);
    }

    for (const { tag, provider } of REAL_PROVIDERS) {
      try {
        // @ts-expect-error – نفس السبب أعلاه
        return await provider[method](...args);
      } catch (error) {
        console.error(`[football] ${tag} failed for ${String(method)}:`, error);
      }
    }

    throw new RealDataUnavailableError(`All real football sources failed for ${String(method)}`);
  };
}

/** يوجّه lookup معرّف واحد (بطولة/جدول) مباشرة إلى مصدره حسب بادئة المعرّف
 * (af-/tsdb-/espn-) بدل تجربة كل المصادر — لا لُبس بين مصادر مختلفة. */
function withIdRouting<K extends "getCompetitionById" | "getStandings">(method: K) {
  return async (id: string): Promise<Awaited<ReturnType<FootballProvider[K]>>> => {
    const { provider: tag, rawId } = parseTaggedId(id);

    if (REAL_PROVIDERS.length === 0) {
      // @ts-expect-error – نفس السبب أعلاه
      return mock[method](id);
    }

    if (tag) {
      const provider = PROVIDER_BY_TAG[tag];
      if (!provider) throw new RealDataUnavailableError(`Source ${tag} is not configured for ${String(method)}`);
      try {
        // @ts-expect-error – نفس السبب أعلاه
        return await provider[method](rawId);
      } catch (error) {
        console.error(`[football] ${tag} failed for ${String(method)}:`, error);
        throw new RealDataUnavailableError(`Source ${tag} failed for ${String(method)}`);
      }
    }

    // معرّف بلا بادئة معروفة وهناك مصادر حقيقية مُفعَّلة — جرّب المصادر
    // الحقيقية فقط. لا رجوع لـMock هنا مهما حدث: معرّف لا يطابق أي مصدر
    // حقيقي يعني أن هذا العنصر غير موجود فعلاً، وليس "جرّب بيانات تجريبية
    // بدلاً منه" — كان هذا يُسرّب مباريات Mock وهمية (مثل hilal-nassr-live)
    // كأنها حقيقية لأي معرّف غير معروف يصل لهذه الدالة.
    for (const { tag: t, provider } of REAL_PROVIDERS) {
      try {
        const result = await (provider[method] as (id: string) => Promise<unknown>)(id);
        if (result !== null && (!Array.isArray(result) || result.length > 0)) {
          return result as Awaited<ReturnType<FootballProvider[K]>>;
        }
      } catch (error) {
        console.error(`[football] ${t} failed for ${String(method)}:`, error);
      }
    }
    // @ts-expect-error – نفس السبب أعلاه: [] لـgetStandings، null لـgetCompetitionById
    return method === "getStandings" ? [] : null;
  };
}

/** يجلب المباراة من مصدرها الأصلي (حسب بادئة المعرّف)، ثم — إن كانت الأحداث
 * أو الإحصائيات أو التشكيلة ناقصة — يحاول إثراءها من ESPN عبر ربط حقيقي
 * (بطولة + تاريخ + اسما الفريقين، لا تطابق ID). فشل الربط أو فشل ESPN لا
 * يُسقط المباراة الأصلية إطلاقاً — فقط الحقول الناقصة تبقى فارغة كما كانت. */
async function getMatchByIdWithEnrichment(id: string): Promise<Match | null> {
  const { provider: tag, rawId } = parseTaggedId(id);

  let match: Match | null = null;

  if (REAL_PROVIDERS.length === 0) {
    return mock.getMatchById(id);
  }

  if (tag) {
    const provider = PROVIDER_BY_TAG[tag];
    if (!provider) throw new RealDataUnavailableError(`Source ${tag} is not configured for getMatchById`);
    try {
      match = await provider.getMatchById(rawId);
    } catch (error) {
      console.error(`[football] ${tag} failed for getMatchById:`, error);
      throw new RealDataUnavailableError(`Source ${tag} failed for getMatchById`);
    }
  } else {
    // معرّف بلا بادئة معروفة وهناك مصادر حقيقية مُفعَّلة — لا رجوع لـMock هنا
    // إطلاقاً (كان يُسرّب مباريات وهمية مثل hilal-nassr-live كأنها حقيقية
    // لأي معرّف غير معروف). لم يُطابَق أي مصدر حقيقي = المباراة غير موجودة.
    for (const { tag: t, provider } of REAL_PROVIDERS) {
      try {
        const result = await provider.getMatchById(id);
        if (result) {
          match = result;
          break;
        }
      } catch (error) {
        console.error(`[football] ${t} failed for getMatchById:`, error);
      }
    }
    if (!match) return null;
  }

  if (!match) return null;

  // "موجود" لا يعني "مكتمل" — رُصِد فعلياً: TheSportsDB يُعيد أحياناً كائن
  // lineups حقيقياً لكن ناقصاً جداً (4 لاعبين فقط من كل فريق بدل 11)، وكان
  // `!match.lineups` يعتبره "مكتملاً بما يكفي" فيمنع محاولة إثراء ESPN
  // نهائياً رغم أن ESPN يملك فعلياً التشكيلة الكاملة لنفس المباراة (تحقّق
  // فعلي: Real Sociedad × Celta Vigo). تشكيلة أساسية حقيقية = 11 لاعباً
  // دائماً بلا استثناء في كرة القدم — أي عدد أقل دليل نقص حقيقي، لا تخمين.
  const needsEvents = match.events.length === 0;
  const needsStats = match.stats.length === 0;
  const needsLineups =
    !match.lineups || match.lineups.home.startXI.length < 11 || match.lineups.away.startXI.length < 11;

  // ESPN نفسه هو مصدر المباراة، أو غير مفعَّل، أو لا نقص فعلي — لا داعٍ للإثراء.
  if (!espn || tag === "espn" || (!needsEvents && !needsStats && !needsLineups)) {
    return match;
  }

  try {
    const linked = await findEspnEventId({
      competitionId: match.competitionId,
      kickoffIso: match.kickoff,
      homeTeamName: match.homeTeam.name,
      awayTeamName: match.awayTeam.name,
    });
    if (!linked) return match;

    // teamId في الأحداث المُثراة يُعاد ربطه داخل getEspnEnrichment نفسها
    // بمعرّفات الفريقين الأصليين للمباراة (بادئة espn- لا تطابق بادئة المصدر
    // الأصلي af-/tsdb-)، عبر جهة الفريق على ESPN لا مقارنة نصية للمعرّف.
    const enrichment = await getEspnEnrichment(linked.eventId, linked.leagueSlug, {
      home: match.homeTeam.id,
      away: match.awayTeam.id,
    });

    if (needsEvents && enrichment.events.length > 0) {
      match = { ...match, events: enrichment.events };
    }
    if (needsStats && enrichment.stats.length > 0) {
      match = { ...match, stats: enrichment.stats };
    }
    if (needsLineups && enrichment.lineups) {
      match = { ...match, lineups: enrichment.lineups };
    }
  } catch (error) {
    console.error(`[football] ESPN enrichment failed for ${id}:`, error);
  }

  return match;
}

/**
 * كاش طبقة القوائم (Next Data Cache، مشترك بين كل نسخ Vercel) لنتيجة السلسلة
 * كاملةً بعد نجاح مصدر واحد. سبب وجوده: كل مزوّد يبدأ طلباته على دفعات
 * متباعدة (staggered) لتخفيف Rate Limit، فتكلفة الجلب الواحد ~2ث لكل مصدر
 * يفشل قبل نجاح التالي (API-Football ثم TheSportsDB = ~3.5ث للصفحة الرئيسية)
 * حتى عندما تكون استجابات fetch نفسها مخزَّنة — الفارق الزمني المتعمَّد
 * يُدفَع في كل زيارة. الكاش هنا يتجاوز السلسلة كلها في الزيارات المتتالية
 * (stale-while-revalidate: يُقدَّم آخر نتيجة صحيحة فوراً ويتجدد في الخلفية).
 *
 * لا يُخزَّن أي فشل: RealDataUnavailableError يُرمى ولا يدخل الكاش، فتُجرَّب
 * المصادر من جديد في الطلب التالي. المدد قصيرة عمداً لمسارات "مباشر/اليوم"
 * (حالة المباراة تتغير)، أطول لما يتغير ببطء. أي منطق يعتمد على الوقت الحالي
 * أو اللغة (reconcileStaleLiveStatus، الترجمة) يُطبَّق بعد الكاش في
 * matches.service، لا داخله — الكاش يحمل بيانات المزوّد الخام فقط.
 */
const CACHE_SECONDS = { live: 30, today: 30, tomorrow: 300, week: 600, results: 300, competitions: 1800 } as const;

const chainLive = withChain("getLiveMatches");
const chainRange = withChain("getMatchesByDateRange");
const chainResults = withChain("getRecentResults");
const chainCompetitions = withChain("getCompetitions");

const cachedLive = unstable_cache(() => chainLive(), ["football", "live"], { revalidate: CACHE_SECONDS.live });
const cachedRange = {
  today: unstable_cache(() => chainRange("today"), ["football", "range", "today"], { revalidate: CACHE_SECONDS.today }),
  tomorrow: unstable_cache(() => chainRange("tomorrow"), ["football", "range", "tomorrow"], { revalidate: CACHE_SECONDS.tomorrow }),
  week: unstable_cache(() => chainRange("week"), ["football", "range", "week"], { revalidate: CACHE_SECONDS.week }),
};
const cachedResults = unstable_cache(() => chainResults(), ["football", "results"], { revalidate: CACHE_SECONDS.results });
const cachedCompetitions = unstable_cache(() => chainCompetitions(), ["football", "competitions"], {
  revalidate: CACHE_SECONDS.competitions,
});

export const footballProvider: FootballProvider = {
  getLiveMatches: () => cachedLive(),
  getMatchesByDateRange: (range) => cachedRange[range](),
  getRecentResults: () => cachedResults(),
  getCompetitions: () => cachedCompetitions(),
  getMatchById: getMatchByIdWithEnrichment,
  getCompetitionById: withIdRouting("getCompetitionById"),
  getStandings: withIdRouting("getStandings"),
};

export const isUsingRealFootballData = REAL_PROVIDERS.length > 0;
export const activeFootballSources = REAL_PROVIDERS.map((p) => p.tag);

/**
 * قائمة أندية كاملة حقيقية لبطولة من الكتالوج — ميزة إضافية لمحرّر Content
 * Studio فقط (اختيار نادٍ حسب الدوري)، معزولة تماماً عن FootballProvider
 * المشترك أعلاه: لا تُضاف لواجهته (لا Mock ولا ESPN يطبّقانها)، ولا تُغيّر أي
 * سطر من منطق المباريات الحالي.
 *
 * API-Football فقط حالياً (موسم كامل، /teams?league=X&season=Y) — تحقّق
 * فعلي (curl مباشر) أثبت أن TheSportsDB لا يدعم /lookup_all_teams.php
 * بمعرّف دوري فعلي على المفتاح العام المجاني المُستخدَم هنا: يُعيد **نفس**
 * القائمة الثابتة حرفياً بغضّ النظر عن id الدوري المُرسَل (تحقّق مباشر: نفس
 * الفرق الإنجليزية ظهرت لكل من الدوري السعودي والإنجليزي معاً) — عرضها
 * كتشكيلة "حقيقية" لبطولة أخرى كان سيكون تضليلاً فعلياً، لا مجرّد نقص
 * بيانات، فاستُبعِد عمداً بدل استخدامه. عند تعذّر API-Football (كما هو
 * حالياً بسبب قيود الحساب الموثَّقة مسبقاً)، تعود null صراحة — المستدعي
 * (listTeamsByCompetitionAction) يتراجع حينها لقائمة جزئية صادقة من تجمّع
 * المباريات، لا اختلاق أي نادٍ.
 */
export async function getTeamsByCompetition(entry: { afId?: number }): Promise<Team[] | null> {
  if (apiFootball && entry.afId !== undefined) {
    try {
      const teams = await apiFootball.getTeamsByLeague(entry.afId);
      if (teams.length > 0) return teams;
    } catch (error) {
      console.error(`[football] af failed for getTeamsByLeague(${entry.afId}):`, error);
    }
  }
  return null;
}

export type { FootballProvider, Match, Competition, StandingsEntry };
