import type { StoryLayout } from "./types";

/** مقاس Story القياسي 9:16 — يُستخدَم مباشرة كمرجع خارجي أيضاً (Share/Export لاحقاً). */
export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

const MARGIN = 72;

// نفس قيم globals.css:root حرفياً — احتياطي فقط لحالة نادرة (canvas خارج
// سياق الصفحة فلا CSS custom properties متاحة)؛ ضمن الموقع نفسه القيم
// الفعلية تُقرأ حيّة عبر getComputedStyle أدناه فتبقى متزامنة مع أي تعديل
// مستقبلي على الهوية بلا الحاجة لتحديث هذا الملف.
const FALLBACK_COLORS = {
  bg: "#0a0e16",
  surface: "#121826",
  surface2: "#1a2233",
  border: "#232c40",
  ink: "#f5f7fa",
  muted: "#8b93a7",
  mutedDim: "#5b6377",
  primary: "#2f6fed",
  primaryInk: "#f8faff",
};

const FALLBACK_FONT = '"Tajawal", "Segoe UI", sans-serif';

type BrandColors = typeof FALLBACK_COLORS;

function resolveBrandColors(): BrandColors {
  if (typeof document === "undefined") return FALLBACK_COLORS;
  const styles = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
  return {
    bg: read("--bg", FALLBACK_COLORS.bg),
    surface: read("--surface", FALLBACK_COLORS.surface),
    surface2: read("--surface-2", FALLBACK_COLORS.surface2),
    border: read("--border", FALLBACK_COLORS.border),
    ink: read("--ink", FALLBACK_COLORS.ink),
    muted: read("--muted", FALLBACK_COLORS.muted),
    mutedDim: read("--muted-dim", FALLBACK_COLORS.mutedDim),
    primary: read("--primary", FALLBACK_COLORS.primary),
    primaryInk: read("--primary-ink", FALLBACK_COLORS.primaryInk),
  };
}

function resolveFontFamily(): string {
  if (typeof document === "undefined") return FALLBACK_FONT;
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-tajawal").trim();
  return family ? `${family}, "Segoe UI", sans-serif` : FALLBACK_FONT;
}

/**
 * تحميل آمن دائماً (لا يرفض/يرمي أبداً) — null عند أي فشل، فيتجاهله الراسم
 * (لا صورة مكسورة، لا رمي استثناء يوقف بقية الرسم). crossOrigin="anonymous"
 * إلزامي: تحقّق فعلي (curl) أن صور TheSportsDB (شعارات الفرق — المصدر
 * الأساسي الحالي للمباريات) لا تُرسل Access-Control-Allow-Origin إطلاقاً؛
 * تحميلها بلا crossOrigin يُظهرها بصرياً لكنه "يُلطّخ" الـcanvas فيفشل
 * toBlob/toDataURL لاحقاً بصمت عند أي محاولة تنزيل/مشاركة — تفويت الصورة
 * الآن أفضل من كسر التصدير حين يحتاجه المستخدم فعلياً. يوتيوب/BBC/RT Arabic/
 * api-sports.io تُرسل الترويسة الصحيحة فعلياً (تحقّق مباشر)، فتُحمَّل بنجاح.
 */
function loadImageSafe(url: string | null | undefined, timeoutMs = 6000): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = setTimeout(() => resolve(null), timeoutMs);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    img.src = url;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 4
): number {
  const lines = wrapText(ctx, text, maxWidth).slice(0, maxLines);
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
  return lines.length;
}

function drawWordmark(ctx: CanvasRenderingContext2D, colors: BrandColors, fontFamily: string, dir: "rtl" | "ltr") {
  const x = dir === "rtl" ? STORY_WIDTH - MARGIN : MARGIN;
  ctx.textAlign = dir === "rtl" ? "right" : "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 34px ${fontFamily}`;
  ctx.fillStyle = colors.ink;
  ctx.fillText("EXTRA ", dir === "rtl" ? x : x, 96);
  const extraWidth = ctx.measureText("EXTRA ").width;
  ctx.fillStyle = colors.primary;
  ctx.fillText("TIME", dir === "rtl" ? x - extraWidth : x + extraWidth, 96);
}

function drawTeamBadge(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | null,
  teamName: string,
  cx: number,
  cy: number,
  radius: number,
  colors: BrandColors,
  fontFamily: string
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.closePath();

  if (img) {
    ctx.clip();
    // "object-fit: cover" داخل الدائرة — تحقّق أن الصورة تملأ المربع المحيط
    // بلا تشويه نسبة الأبعاد.
    const scale = Math.max((radius * 2) / img.width, (radius * 2) / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  } else {
    // بديل صادق عند تعذّر تحميل الشعار الفعلي: حرف أول اسم الفريق الحقيقي
    // ضمن دائرة بلون الهوية — لا شعار مُختلَق، مجرد معالجة نصية بديلة.
    ctx.fillStyle = colors.surface2;
    ctx.fill();
    ctx.fillStyle = colors.ink;
    ctx.font = `800 ${Math.round(radius * 0.9)}px ${fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(teamName.trim().charAt(0).toUpperCase(), cx, cy + radius * 0.05);
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = colors.border;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

async function drawMatchResult(ctx: CanvasRenderingContext2D, layout: StoryLayout, colors: BrandColors, fontFamily: string) {
  const [homeImg, awayImg] = await Promise.all([loadImageSafe(layout.homeTeamLogoUrl), loadImageSafe(layout.awayTeamLogoUrl)]);

  if (layout.competitionLabel) {
    ctx.textAlign = "center";
    ctx.font = `700 30px ${fontFamily}`;
    ctx.fillStyle = colors.primary;
    ctx.fillText(layout.competitionLabel, STORY_WIDTH / 2, 340);
  }

  const badgeRadius = 190;
  const badgeY = 700;
  drawTeamBadge(ctx, homeImg, layout.homeTeamName ?? "", STORY_WIDTH / 2 - 300, badgeY, badgeRadius, colors, fontFamily);
  drawTeamBadge(ctx, awayImg, layout.awayTeamName ?? "", STORY_WIDTH / 2 + 300, badgeY, badgeRadius, colors, fontFamily);

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.font = `700 40px ${fontFamily}`;
  ctx.fillStyle = colors.ink;
  drawWrappedText(ctx, layout.homeTeamName ?? "", STORY_WIDTH / 2 - 300, badgeY + badgeRadius + 70, 340, 48, 2);
  drawWrappedText(ctx, layout.awayTeamName ?? "", STORY_WIDTH / 2 + 300, badgeY + badgeRadius + 70, 340, 48, 2);

  ctx.font = `900 160px ${fontFamily}`;
  ctx.fillStyle = colors.ink;
  ctx.textAlign = "center";
  ctx.direction = "ltr"; // النتيجة رقمية دائماً بترتيب LTR (5-2) بغض النظر عن لغة الواجهة
  ctx.fillText(layout.scoreText ?? "", STORY_WIDTH / 2, badgeY + 65);
  ctx.direction = layout.dir;
}

async function drawGoal(ctx: CanvasRenderingContext2D, layout: StoryLayout, colors: BrandColors, fontFamily: string) {
  const img = await loadImageSafe(layout.imageUrl);
  drawTeamBadge(ctx, img, layout.competitionLabel ?? layout.headline, STORY_WIDTH / 2, 620, 170, colors, fontFamily);

  ctx.textAlign = "center";
  ctx.font = `700 60px ${fontFamily}`;
  ctx.fillStyle = colors.primary;
  ctx.fillText("⚽", STORY_WIDTH / 2, 880);

  ctx.font = `900 76px ${fontFamily}`;
  ctx.fillStyle = colors.ink;
  const headlineLines = drawWrappedText(ctx, layout.headline, STORY_WIDTH / 2, 980, STORY_WIDTH - MARGIN * 2, 88, 3);

  if (layout.subline) {
    ctx.font = `700 40px ${fontFamily}`;
    ctx.fillStyle = colors.muted;
    ctx.fillText(layout.subline, STORY_WIDTH / 2, 980 + headlineLines * 88 + 30);
  }

  if (layout.homeTeamName && layout.awayTeamName) {
    ctx.font = `600 34px ${fontFamily}`;
    ctx.fillStyle = colors.mutedDim;
    ctx.fillText(`${layout.homeTeamName} × ${layout.awayTeamName}`, STORY_WIDTH / 2, STORY_HEIGHT - 220);
  }
}

async function drawNews(ctx: CanvasRenderingContext2D, layout: StoryLayout, colors: BrandColors, fontFamily: string) {
  const img = await loadImageSafe(layout.imageUrl);
  const imageBottom = STORY_HEIGHT * 0.6;

  if (img) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, STORY_WIDTH, imageBottom);
    ctx.clip();
    const scale = Math.max(STORY_WIDTH / img.width, imageBottom / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.drawImage(img, (STORY_WIDTH - w) / 2, (imageBottom - h) / 2, w, h);
    ctx.restore();
  }

  const gradient = ctx.createLinearGradient(0, imageBottom - 400, 0, imageBottom + 40);
  gradient.addColorStop(0, `${colors.bg}00`);
  gradient.addColorStop(1, colors.bg);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, imageBottom - 400, STORY_WIDTH, 440);

  const textX = layout.dir === "rtl" ? STORY_WIDTH - MARGIN : MARGIN;
  ctx.textAlign = layout.dir === "rtl" ? "right" : "left";
  ctx.font = `800 66px ${fontFamily}`;
  ctx.fillStyle = colors.ink;
  const lines = drawWrappedText(ctx, layout.headline, textX, imageBottom + 110, STORY_WIDTH - MARGIN * 2, 76, 4);

  if (layout.sourceLabel) {
    ctx.font = `700 36px ${fontFamily}`;
    ctx.fillStyle = colors.primary;
    ctx.fillText(layout.sourceLabel, textX, imageBottom + 110 + lines * 76 + 20);
  }
}

function drawPlayButton(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, colors: BrandColors) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = colors.ink;
  const s = radius * 0.55;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.4, cy - s * 0.65);
  ctx.lineTo(cx - s * 0.4, cy + s * 0.65);
  ctx.lineTo(cx + s * 0.7, cy);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

async function drawVideo(ctx: CanvasRenderingContext2D, layout: StoryLayout, colors: BrandColors, fontFamily: string) {
  await drawNews(ctx, layout, colors, fontFamily);
  drawPlayButton(ctx, STORY_WIDTH / 2, STORY_HEIGHT * 0.3, 90, colors);
}

/** نفس تخطيط NEWS بالضبط + سطر فرق/نتيجة سفلي إن توفّرا — لا قالب رسم جديد
 * منفصل، فقط إضافة صغيرة فوق drawNews الموجودة. */
async function drawMatchSummary(ctx: CanvasRenderingContext2D, layout: StoryLayout, colors: BrandColors, fontFamily: string) {
  await drawNews(ctx, layout, colors, fontFamily);

  if (layout.homeTeamName && layout.awayTeamName) {
    ctx.textAlign = "center";
    ctx.font = `600 34px ${fontFamily}`;
    ctx.fillStyle = colors.mutedDim;
    const line = layout.scoreText
      ? `${layout.homeTeamName} ${layout.scoreText} ${layout.awayTeamName}`
      : `${layout.homeTeamName} × ${layout.awayTeamName}`;
    ctx.direction = "ltr";
    ctx.fillText(line, STORY_WIDTH / 2, STORY_HEIGHT - 100);
    ctx.direction = layout.dir;
  }
}

/**
 * الراسم الفعلي — يعمل داخل المتصفح فقط (Image/document.fonts/Canvas 2D).
 * مستقل تماماً عن React: يقبل عنصر canvas حقيقي و Layout جاهز، لا مكوّن ولا
 * Hook هنا. راجع src/lib/story/index.ts لواجهة الاستخدام المختصرة الكاملة
 * (ContentItem → صورة مباشرة).
 */
export async function renderStoryToCanvas(canvas: HTMLCanvasElement, layout: StoryLayout): Promise<void> {
  if (typeof document === "undefined") {
    throw new Error("renderStoryToCanvas requires a browser environment (document/Image/Canvas 2D)");
  }

  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");

  const colors = resolveBrandColors();
  const fontFamily = resolveFontFamily();
  if (document.fonts?.ready) await document.fonts.ready;

  ctx.direction = layout.dir;
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  const glow = ctx.createRadialGradient(STORY_WIDTH * 0.85, 120, 10, STORY_WIDTH * 0.85, 120, 520);
  glow.addColorStop(0, `${colors.primary}33`);
  glow.addColorStop(1, `${colors.primary}00`);
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  drawWordmark(ctx, colors, fontFamily, layout.dir);

  switch (layout.template) {
    case "MATCH_RESULT":
      await drawMatchResult(ctx, layout, colors, fontFamily);
      break;
    case "GOAL":
      await drawGoal(ctx, layout, colors, fontFamily);
      break;
    case "NEWS":
      await drawNews(ctx, layout, colors, fontFamily);
      break;
    case "VIDEO":
      await drawVideo(ctx, layout, colors, fontFamily);
      break;
    case "MATCH_SUMMARY":
      await drawMatchSummary(ctx, layout, colors, fontFamily);
      break;
    case "IMAGE":
      await drawNews(ctx, layout, colors, fontFamily);
      break;
  }
}
