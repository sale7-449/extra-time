"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const SDK_SRC = "https://sdk.snapkit.com/js/v1/create.js";
const SDK_SCRIPT_ID = "snapkit-creative-kit-sdk";
const WIDGET_READY_TIMEOUT_MS = 4000;
const WIDGET_POLL_INTERVAL_MS = 200;

type WidgetState = "loading" | "ready" | "unavailable";

/**
 * Creative Kit for Web الرسمي فقط (developers.snap.com/snap-kit/creative-kit/web)
 * — يشارك رابط الصفحة الحالية الحقيقي + OG metadata الموجودة أصلاً على
 * الصفحة (title/description/image)، وليس صورة Story المولَّدة بـCanvas ولا
 * نشراً مباشراً لـPublic Story (كلاهما غير متاح رسمياً من الويب — راجع
 * تقرير Discovery). بلا تسجيل تطبيق، بلا مفتاح API — كلاهما اختياري بحت في
 * التوثيق الرسمي لهذا المسار تحديداً.
 *
 * لا يظهر الزر إطلاقاً حتى نتأكّد فعلياً أن الـSDK هيّأ العنصر (لا نكتفي
 * بنجاح تحميل السكربت نفسه — قد يُحمَّل بنجاح لكن يفشل التهيئة لسبب آخر:
 * CSP، حاجب إعلانات...) — نتحقّق من DOM مباشرة، لا افتراضاً.
 *
 * `path` (نسبي، مثل "/matches/tsdb-2506189") يصل من الصفحة (Server
 * Component) — آمن للعرض الأول على الخادم والعميل بلا فارق (لا hydration
 * mismatch). بعد التركيب فقط، يُستبدَل بالرابط العام الكامل الفعلي عبر
 * `window.location.origin` (يعكس النطاق الحقيقي الذي يُقدَّم منه الموقع الآن
 * — تطوير محلي/نفق عام/نطاق إنتاج لاحقاً — بلا أي إعداد يدوي قد يصبح قديماً).
 */
export function SnapchatCreativeKitButton({ path }: { path: string }) {
  const { t } = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<WidgetState>("loading");
  const [shareUrl, setShareUrl] = useState(path);
  const widgetId = useId();

  useEffect(() => {
    // setTimeout بدل استدعاء setState مباشرة في جسم الـeffect (يخالف قاعدة
    // react-hooks/set-state-in-effect) — نفس نمط استدعاءات setState داخل
    // callbacks المؤقّتات أدناه في هذا الملف نفسه، مقبول لأنه استجابة لحدث
    // خارجي (توفّر window بعد mount) لا تحديث متزامن أثناء الرندر.
    const timer = setTimeout(() => setShareUrl(`${window.location.origin}${path}`), 0);
    return () => clearTimeout(timer);
  }, [path]);

  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let timeoutTimer: ReturnType<typeof setTimeout> | undefined;

    function stopWatching() {
      if (pollTimer) clearInterval(pollTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
    }

    function watchForWidgetReady() {
      pollTimer = setInterval(() => {
        if (cancelled) return;
        if (containerRef.current && containerRef.current.children.length > 0) {
          setState("ready");
          stopWatching();
        }
      }, WIDGET_POLL_INTERVAL_MS);

      timeoutTimer = setTimeout(() => {
        if (cancelled) return;
        stopWatching();
        setState((prev) => (prev === "ready" ? prev : "unavailable"));
      }, WIDGET_READY_TIMEOUT_MS);
    }

    const existing = document.getElementById(SDK_SCRIPT_ID) as HTMLScriptElement | null;

    if (existing?.dataset.loaded === "true") {
      watchForWidgetReady();
    } else if (existing) {
      existing.addEventListener("load", watchForWidgetReady, { once: true });
      existing.addEventListener("error", () => !cancelled && setState("unavailable"), { once: true });
    } else {
      const script = document.createElement("script");
      script.id = SDK_SCRIPT_ID;
      script.src = SDK_SRC;
      script.async = true;
      script.onload = () => {
        script.dataset.loaded = "true";
        watchForWidgetReady();
      };
      script.onerror = () => {
        if (!cancelled) setState("unavailable");
      };
      document.body.appendChild(script);
    }

    return () => {
      cancelled = true;
      stopWatching();
    };
  }, []);

  if (state === "unavailable") return null;

  return (
    <div
      className="inline-flex items-center gap-2 h-10 px-4 rounded-[var(--radius-sm)] border border-border bg-surface"
      style={{ display: state === "ready" ? "inline-flex" : "none" }}
    >
      <span className="text-sm font-bold text-muted">{t.story.snapchat}</span>
      {/* عنصر Creative Kit الرسمي — الـSDK نفسه يملأه بأيقونة/رابط المشاركة
          الفعلي، لا نُنشئ أيقونة بديلة (يبقى ضمن إرشادات العلامة التجارية
          لأنه أصل Snapchat نفسه، لا محاكاة). */}
      <div
        key={widgetId}
        ref={containerRef}
        className="snapchat-creative-kit-share"
        data-share-url={shareUrl}
        data-theme="dark"
        data-size="small"
      />
    </div>
  );
}
