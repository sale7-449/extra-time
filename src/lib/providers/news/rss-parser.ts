/**
 * محلّل RSS 2.0 خفيف مبني بتعابير نمطية — لا مكتبة خارجية جديدة، ويكفي
 * لبنية RSS القياسية (title/description/link/pubDate/media:thumbnail) التي
 * تستخدمها مصادر الأخبار الحقيقية المدعومة هنا. ليس محلّل XML عام.
 */

export interface RssItem {
  title: string;
  description: string;
  link: string;
  pubDate: string | null;
  thumbnailUrl: string | null;
}

function extractTag(block: string, tag: string): string | null {
  const cdata = block.match(new RegExp(`<${tag}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`));
  if (cdata) return cdata[1].trim();
  const plain = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return plain ? plain[1].trim() : null;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  hellip: "…",
};

/** &amp;/&lt;/&gt;/&quot; كانت مغطاة، لكن &apos; (شائع في Guardian/Mirror)
 * ورموز الترقيم النموذجية (&rsquo;/&ndash;...) لم تكن — تظهر حرفياً كنص خام
 * في العناوين بدل علامة الترقيم الفعلية. رقمية `&#NNN;`/`&#xHH;` تُحلّ عامةً
 * بدل تعداد كل حالة، فتغطي أي رمز آخر لم يُذكر صراحة أعلاه. */
export function decodeEntities(text: string): string {
  return text
    .replace(/&(amp|lt|gt|quot|apos|nbsp|ndash|mdash|lsquo|rsquo|ldquo|rdquo|hellip);/g, (_, name) => NAMED_ENTITIES[name])
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

/** بعض المصادر (Guardian مثلاً) تُرسل الوصف كـ HTML مُرمَّز داخل الوسم —
 * بعد فك الترميز يظهر <ul><li>...</li></ul> كنص خام إن لم يُزَل، لأن
 * الواجهة تعرض `summary` كنص عادي لا HTML. إزالة الوسوم هنا فقط، لا العنوان
 * (نظيف دائماً في كل المصادر المفحوصة). */
function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function extractAttr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`${name}="([^"]*)"`));
  return match ? match[1] : null;
}

/** يستخرج رابط صورة الخبر من `<enclosure>` أو `<media:thumbnail>` أو
 * `<media:content>` — ترتيب الخصائص (attributes) داخل الوسم يختلف فعلياً
 * بين المصادر (بعضها يضع type قبل url، وبعضها بعدها)، فالاستخراج هنا
 * مستقل عن الترتيب بدل تعبير نمطي واحد صارم يفشل بصمت مع بعض المصادر. */
function extractThumbnail(block: string): string | null {
  const enclosure = block.match(/<enclosure\b[^>]*\/?>/);
  if (enclosure) {
    const type = extractAttr(enclosure[0], "type");
    const url = extractAttr(enclosure[0], "url");
    if (url && (!type || type.startsWith("image"))) return url;
  }

  const mediaThumb = block.match(/<media:thumbnail\b[^>]*\/?>/);
  if (mediaThumb) {
    const url = extractAttr(mediaThumb[0], "url");
    if (url) return url;
  }

  const mediaContentTags = block.match(/<media:content\b[^>]*\/?>/g) ?? [];
  for (const tag of mediaContentTags) {
    const type = extractAttr(tag, "type");
    const medium = extractAttr(tag, "medium");
    const url = extractAttr(tag, "url");
    if (url && ((type && type.startsWith("image")) || medium === "image")) return url;
  }

  return null;
}

export function parseRssItems(xml: string): RssItem[] {
  const blocks = xml.split(/<item[\s>]/).slice(1);

  return blocks
    .map((raw) => {
      const block = "<item " + raw.split(/<\/item>/)[0];
      const title = extractTag(block, "title");
      const link = extractTag(block, "link");
      if (!title || !link) return null;

      const description = extractTag(block, "description") ?? "";
      const pubDate = extractTag(block, "pubDate");

      return {
        title: decodeEntities(title),
        description: stripHtmlTags(decodeEntities(description)),
        link: decodeEntities(link),
        pubDate,
        thumbnailUrl: extractThumbnail(block),
      };
    })
    .filter((item): item is RssItem => item !== null);
}
