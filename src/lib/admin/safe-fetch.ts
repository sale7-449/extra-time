import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import type { LookupFunction } from "node:net";

/**
 * جلب HTML لرابط خارجي عشوائي من الخادم بحماية SSRF كاملة. أي رابط http/https
 * عام مقبول للتخزين (انظر http-url.ts)، لكن الجلب الفعلي من الخادم يُحظر إن
 * كانت الوجهة localhost أو شبكة خاصة/محلية أو عنوان بيانات السحابة
 * (169.254.169.254) أو أي نطاق محجوز. الفحص يحدث في ثلاث طبقات:
 *   1) اسم المضيف/عنوان IP الحرفي قبل أي اتصال (بما فيه صيغ IPv6 بأقواس،
 *      وIPv4-mapped، والأسماء الداخلية بلا نقطة أو بلاحقات .local/.internal).
 *   2) وقت الاتصال نفسه عبر `lookup` مخصّص: كل عناوين IP الناتجة عن DNS تُفحَص
 *      قبل الاتصال بها، فيُغلق حتى DNS Rebinding (لا فجوة بين "فحص" و"اتصال"
 *      لأن الاتصال يستخدم العنوان المفحوص نفسه).
 *   3) كل تحويل (redirect) يُتتبَّع يدوياً ويُعاد فيه فحص الطبقتين أعلاه —
 *      رابط عام يُحيل إلى عنوان داخلي يُرفض عند القفزة.
 * لا تسجيل دخول ولا تجاوز paywall/حماية: طلب GET عادي واحد بلا كوكيز.
 */

export class BlockedHostError extends Error {}
export class FetchFailedError extends Error {}

const MAX_REDIRECTS = 5;

function parseIpv4(ip: string): number[] | null {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  return parts.every((p) => p >= 0 && p <= 255) ? parts : null;
}

function isBlockedIpv4(parts: number[]): boolean {
  const [a, b, c] = parts;
  if (a === 0 || a === 10 || a === 127) return true; // this-network, private, loopback
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 169 && b === 254) return true; // link-local (يشمل بيانات السحابة)
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true; // IETF protocol / TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3
  if (a >= 224) return true; // multicast + reserved + broadcast
  return false;
}

/** يوسّع IPv6 إلى 8 مجموعات 16-بت (يدعم "::" والذيل IPv4 المنقَّط). */
function expandIpv6(ip: string): number[] | null {
  let addr = ip.toLowerCase();
  const zone = addr.indexOf("%");
  if (zone !== -1) addr = addr.slice(0, zone);

  const dotted = addr.match(/^(.*:)(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (dotted) {
    const v4 = parseIpv4(dotted[2]);
    if (!v4) return null;
    addr = `${dotted[1]}${((v4[0] << 8) | v4[1]).toString(16)}:${((v4[2] << 8) | v4[3]).toString(16)}`;
  }

  const halves = addr.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? head.length !== 8 : missing < 0) return null;

  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill("0"), ...tail].map((g) => parseInt(g, 16));
  return groups.length === 8 && groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff) ? groups : null;
}

function isBlockedIpv6(groups: number[]): boolean {
  const embeddedV4 = (hi: number, lo: number) => isBlockedIpv4([hi >> 8, hi & 255, lo >> 8, lo & 255]);

  if (groups.every((g) => g === 0)) return true; // ::
  if (groups.slice(0, 7).every((g) => g === 0) && groups[7] === 1) return true; // ::1
  if (groups.slice(0, 5).every((g) => g === 0) && groups[5] === 0xffff) return embeddedV4(groups[6], groups[7]); // ::ffff:a.b.c.d
  if (groups.slice(0, 6).every((g) => g === 0)) return embeddedV4(groups[6], groups[7]); // ::a.b.c.d (deprecated)
  if (groups[0] === 0x64 && groups[1] === 0xff9b) return embeddedV4(groups[6], groups[7]); // NAT64
  if (groups[0] === 0x2002) return embeddedV4(groups[1], groups[2]); // 6to4
  if ((groups[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 ULA
  if ((groups[0] & 0xffc0) === 0xfe80 || (groups[0] & 0xffc0) === 0xfec0) return true; // link-local / site-local
  if ((groups[0] & 0xff00) === 0xff00) return true; // multicast
  if (groups[0] === 0x2001 && groups[1] === 0x0db8) return true; // documentation
  return false;
}

/** true = العنوان محلي/خاص/محجوز ولا يجوز الاتصال به من الخادم. */
export function isBlockedIp(ip: string): boolean {
  const v4 = parseIpv4(ip);
  if (v4) return isBlockedIpv4(v4);
  const v6 = expandIpv6(ip);
  return v6 ? isBlockedIpv6(v6) : true; // صيغة غير مفهومة = حظر (فشل آمن)
}

/** فحص نصي للمضيف كما كُتب في الرابط (قبل DNS). URL.hostname يُطبِّع صيغ
 * الأرقام (عشري/سداسي/ثماني) إلى IPv4 منقَّط، ويُبقي أقواس IPv6. */
export function isBlockedHostname(rawHostname: string): boolean {
  let host = rawHostname.toLowerCase().replace(/\.$/, "");
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
  if (!host) return true;

  if (net.isIP(host)) return isBlockedIp(host);

  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (/\.(local|internal|localdomain|lan|home|corp|intranet|home\.arpa)$/.test(host)) return true;
  if (!host.includes(".")) return true; // اسم بلا نقطة = اسم شبكة داخلية، ليس مضيفاً عاماً
  return false;
}

/** lookup مخصّص لـhttp(s).request: يحلّ DNS ثم يرفض الاتصال إن كان أي عنوان
 * ناتج محجوزاً — العنوان المفحوص هو نفسه المستخدَم للاتصال. */
const guardedLookup: LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (error, addresses) => {
    if (error) return callback(error, "", 4);
    const list = addresses as dns.LookupAddress[];
    if (list.length === 0 || list.some((a) => isBlockedIp(a.address))) {
      return callback(new BlockedHostError(`blocked address for ${hostname}`), "", 4);
    }
    if (options.all) return callback(null, list);
    return callback(null, list[0].address, list[0].family);
  });
};

interface RawResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}

function requestOnce(url: URL, budgetMs: number, maxBytes: number): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    if (budgetMs <= 0) return reject(new FetchFailedError("timeout"));

    const client = url.protocol === "https:" ? https : http;
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return; // أول نتيجة تفوز؛ destroy() المقصود يُنتج أخطاءً لاحقة تُتجاهَل
      settled = true;
      clearTimeout(deadline);
      fn();
    };

    const req = client.request(
      url,
      {
        method: "GET",
        lookup: guardedLookup,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; ExtraTimeBot/1.0)",
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
          "Accept-Encoding": "identity",
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400) {
          res.resume(); // تحويل: الجسم غير مطلوب
          return finish(() => resolve({ status, headers: res.headers, body: Buffer.alloc(0) }));
        }

        const chunks: Buffer[] = [];
        let received = 0;
        res.on("data", (chunk: Buffer) => {
          chunks.push(chunk);
          received += chunk.length;
          if (received >= maxBytes) {
            // نصف ميغابايت يكفي لوسوم <head> — لا تنزيل للصفحة كاملة
            finish(() => resolve({ status, headers: res.headers, body: Buffer.concat(chunks) }));
            res.destroy();
          }
        });
        res.on("end", () => finish(() => resolve({ status, headers: res.headers, body: Buffer.concat(chunks) })));
        res.on("error", (error) => finish(() => reject(error)));
      }
    );

    // مهلة إجمالية للطلب كله (لا خمول-مقبس فقط): خادم يُسرّب بايتاً كل بضع ثوانٍ
    // لا يستطيع تعليق الطلب أطول من الميزانية المتبقية.
    const deadline = setTimeout(() => {
      finish(() => reject(new FetchFailedError("timeout")));
      req.destroy();
    }, budgetMs);

    req.on("error", (error) => finish(() => reject(error)));
    req.end();
  });
}

function decodeBody(body: Buffer, contentType: string): string {
  const headerCharset = contentType.match(/charset=["']?([\w-]+)/i)?.[1];
  const sniffed = body.subarray(0, 4096).toString("latin1").match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1];
  const label = (headerCharset ?? sniffed ?? "utf-8").toLowerCase();
  try {
    return new TextDecoder(label).decode(body);
  } catch {
    return new TextDecoder("utf-8").decode(body);
  }
}

export interface SafeFetchResult {
  html: string;
  finalUrl: string;
}

/** يجلب صفحة HTML (بحدّ حجم ووقت) أو يرمي BlockedHostError/FetchFailedError. */
export async function safeFetchHtml(
  rawUrl: string,
  { timeoutMs = 8000, maxBytes = 512 * 1024 }: { timeoutMs?: number; maxBytes?: number } = {}
): Promise<SafeFetchResult> {
  let current: URL;
  try {
    current = new URL(rawUrl);
  } catch {
    throw new FetchFailedError("invalid url");
  }

  // ميزانية زمنية واحدة للطلب كله بما فيه كل قفزات التحويل.
  const deadlineAt = Date.now() + timeoutMs;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (current.protocol !== "http:" && current.protocol !== "https:") throw new FetchFailedError("unsupported protocol");
    if (isBlockedHostname(current.hostname)) throw new BlockedHostError(`blocked host ${current.hostname}`);

    let response: RawResponse;
    try {
      response = await requestOnce(current, deadlineAt - Date.now(), maxBytes);
    } catch (error) {
      if (error instanceof BlockedHostError) throw error;
      // node يلفّ أخطاء lookup داخل error.cause أحياناً حسب الإصدار
      if ((error as { cause?: unknown })?.cause instanceof BlockedHostError) throw (error as { cause: BlockedHostError }).cause;
      throw new FetchFailedError(error instanceof Error ? error.message : "request failed");
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.location;
      if (!location) throw new FetchFailedError("redirect without location");
      try {
        current = new URL(location, current);
      } catch {
        throw new FetchFailedError("bad redirect location");
      }
      continue; // الفحص يُعاد أعلى الحلقة للوجهة الجديدة
    }

    if (response.status < 200 || response.status >= 300) throw new FetchFailedError(`HTTP ${response.status}`);

    const contentType = String(response.headers["content-type"] ?? "");
    if (!/text\/html|application\/xhtml/i.test(contentType)) throw new FetchFailedError("not html");

    return { html: decodeBody(response.body, contentType), finalUrl: current.toString() };
  }

  throw new FetchFailedError("too many redirects");
}
