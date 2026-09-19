"use client";

import { useState } from "react";
import { TrophyIcon } from "@/components/icons";
import { competitionLogoCandidates } from "@/lib/competition-logos";

/**
 * المكوّن الوحيد لعرض شعار أي بطولة في الموقع (بطاقة، تفاصيل، بحث، متابَعات).
 * المصدر من lib/competition-logos.ts (شعار الكتالوج ثم شعار المزوّد). الحاوية
 * الفاتحة الصلبة جزء من المكوّن نفسه لا من كل صفحة: شعارات كثيرة (البريميرليج
 * أرجواني داكن، دوري روشن بنص رمادي) مصمَّمة لخلفية فاتحة وتختفي على تدرّج
 * الصفحة الداكن. عند فشل كل المصادر تبقى الحاوية بأيقونة كأس ثابتة مرئية.
 *
 * `size` هو قطر الحاوية الدائرية بالبكسل.
 */
export function CompetitionLogo({
  competitionId,
  logoUrl,
  name,
  size = 44,
}: {
  competitionId: string;
  logoUrl?: string | null;
  name: string;
  size?: number;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const src = competitionLogoCandidates(competitionId, logoUrl).find((url) => !failed.includes(url));
  const inner = Math.round(size * 0.72);

  return (
    <span
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm"
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- شعارات صغيرة من CDN المصدر نفسه؛ <img> يتيح fallback متتابع عند الفشل بلا قيود قائمة مضيفي next/image.
        <img
          src={src}
          alt={name}
          width={inner}
          height={inner}
          loading="lazy"
          decoding="async"
          className="object-contain"
          style={{ width: inner, height: inner }}
          // فشل التحميل قبل اكتمال الـhydration (CDN محجوب/بطيء أو 404 سريع) يفوت onError
          // لأن الحدث يقع قبل ربط React للمعالج — فنفحص حالة الصورة نفسها عند التركيب.
          ref={(img) => {
            if (img && img.complete && img.naturalWidth === 0) setFailed((prev) => (prev.includes(src) ? prev : [...prev, src]));
          }}
          onError={() => setFailed((prev) => (prev.includes(src) ? prev : [...prev, src]))}
        />
      ) : (
        <TrophyIcon className="text-slate-500" style={{ width: Math.round(size * 0.5), height: Math.round(size * 0.5) }} aria-label={name} />
      )}
    </span>
  );
}
