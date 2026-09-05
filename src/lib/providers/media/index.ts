import { YouTubeFeedProvider, type YouTubeChannelConfig } from "./youtube-feed-provider";
import { YouTubeSearchProvider } from "./youtube-search-provider";
import type { MediaProvider } from "./types";
import type { MediaItem } from "@/lib/types";

/**
 * قنوات يوتيوب الرسمية المعتمدة (Phase 2) — كل قناة تحقّقنا يدوياً من كونها
 * القناة الرسمية الفعلية النشطة (لا قناة معجبين، لا قناة قديمة متوقفة) قبل
 * إضافتها: وصف القناة نفسه يذكر صراحة "القناة الرسمية"/"official channel"
 * (أو علامة تجارية عالمية معروفة بلا لبس كـFIFA/UEFA)، ورفع نشط حديث خلال
 * الأيام الأخيرة قبل الفحص — لا سنوات.
 *
 * محاولات أولى بـ @AlHilalSFC و@AlNassrFC (تطابق اسم المستخدم المتوقَّع)
 * تبيّن أنهما حسابان قديمان متوقفان فعلياً منذ 2011 — استُبدلا بـ
 * @AlhilalSCOfficial و@AlNassrSaudi الفعليَّين بعد تحقّق كامل من الوصف
 * والنشاط الحقيقي.
 *
 * التغطية الحالية: FIFA، UEFA (يشمل دوري أبطال أوروبا)، الدوري الإنجليزي،
 * ريال مدريد وبرشلونة (الدوري الإسباني)، الهلال والنصر (الدوري السعودي).
 * إضافة قناة أخرى لاحقاً = سطر واحد هنا بعد نفس التحقق اليدوي، لا تعديل بنيوي.
 */
const CHANNELS: YouTubeChannelConfig[] = [
  { channelId: "UCpcTrCXblq78GZrTUTLWeBw", source: "FIFA", kind: "COMPETITION" },
  { channelId: "UCyGa1YEx9ST66rYrJTGIKOw", source: "UEFA", kind: "COMPETITION", relatedName: "Champions League" },
  { channelId: "UCG5qGWdu8nIRZqJ_GgDwQ-w", source: "Premier League", kind: "LEAGUE", relatedName: "Premier League" },
  { channelId: "UCWV3obpZVGgJ3j9FVhEjF2Q", source: "Real Madrid", kind: "CLUB", relatedName: "Real Madrid" },
  { channelId: "UC14UlmYlSNiQCBe9Eookf_A", source: "FC Barcelona", kind: "CLUB", relatedName: "Barcelona" },
  { channelId: "UCqLSkV09TTWtrDak1X0aWuw", source: "Al Hilal", kind: "CLUB", relatedName: "Al Hilal" },
  { channelId: "UCHEQtltsiDd3p8ga-5nC-ow", source: "Al Nassr", kind: "CLUB", relatedName: "Al Nassr" },
];

/**
 * مفتاح إيقاف عام — المصدر الحالي (موجز Atom عام) لا يحتاج مفتاح API إطلاقاً،
 * لكن هذا يُبقي نفس نمط التفعيل/التعطيل المستخدَم في مزوّدي كرة القدم
 * (THESPORTSDB_ENABLED/ESPN_ENABLED) وجاهز فوراً لمزوّد لاحق يحتاج مفتاحاً
 * (مثلاً YouTube Data API v3 لتغطية أوسع/بحث) بلا أي تعديل بنيوي — فقط إضافة
 * مصدر جديد للسلسلة، تماماً كمزوّدي كرة القدم. الموقع يعمل طبيعياً ويعرض
 * حالة فارغة صريحة إن كان VIDEO_PROVIDER_ENABLED=false.
 */
const enabled = process.env.VIDEO_PROVIDER_ENABLED !== "false";
const youtube = enabled ? new YouTubeFeedProvider(CHANNELS) : null;

export const mediaProvider: MediaProvider | null = youtube;
export const isUsingRealMediaData = mediaProvider !== null;

// معرّفات القنوات الرسمية المعتمدة فقط — مرجع سريع لأي كود لاحق (مثلاً بحث
// مقيَّد بقناة رسمية معروفة) بلا الحاجة لاستيراد الشكل الكامل لـCHANNELS.
export const officialChannelIds: string[] = CHANNELS.map((c) => c.channelId);

/**
 * محوّل بحث اختياري (YouTube Data API v3) — يُفعَّل فقط عند توفّر
 * YOUTUBE_DATA_API_KEY (لا نطلبه، لا نفترض وجوده، لا تكلفة أو تعطّل بدونه).
 * غير مربوط بمسار match-media-matcher الحيّ بعد — راجع التعليق في
 * youtube-search-provider.ts لسبب ذلك. جاهز للربط لاحقاً بخطوة صغيرة إذا
 * قرَّرت إضافة المفتاح لتغطية مباريات أقدم لا يوفّرها موجز Atom.
 */
const youtubeApiKey = process.env.YOUTUBE_DATA_API_KEY;
export const youtubeSearchProvider = youtubeApiKey ? new YouTubeSearchProvider(youtubeApiKey) : null;

export type { MediaProvider, MediaItem };
