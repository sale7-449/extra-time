"use client";

import { useState } from "react";
import Image from "next/image";
import type { Team } from "@/lib/types";
import { cx } from "@/lib/utils";
import { isAllowedImageHost } from "@/lib/image-hosts";

const sizeMap = { sm: 28, md: 40, lg: 56, xl: 72 };

/**
 * يعرض شعار الفريق الحقيقي إن وُجد logoUrl، وإلا Placeholder بالأحرف الأولى
 * — لا نخمّن شعاراً أبداً (قاعدة معتمدة في هوية الأندية). إن فشل تحميل صورة
 * الشعار فعلياً (رابط معطوب، انقطاع شبكة) نتراجع لنفس الـ Placeholder بدل
 * ترك أيقونة صورة مكسورة — الشعار الحقيقي لا يُفقد صامتاً، فقط لا يُعرض حين
 * يتعذّر تحميله فعلياً. كذلك نتحقق من أن المضيف مُدرَج في next.config قبل
 * التمرير لـ next/image، لأن مضيفاً غير مُدرَج يرمي خطأ فوري لا يلتقطه onError
 * ويُسقط الصفحة كاملة عبر error boundary.
 */
export function TeamLogo({ team, size = "md" }: { team: Team; size?: "sm" | "md" | "lg" | "xl" }) {
  const px = sizeMap[size];
  const [failed, setFailed] = useState(false);

  if (team.logoUrl && !failed && isAllowedImageHost(team.logoUrl)) {
    return (
      <Image
        src={team.logoUrl}
        alt={team.name}
        width={px}
        height={px}
        className="rounded-full object-contain"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={team.name}
      className={cx(
        "flex items-center justify-center rounded-full bg-surface-2 border border-border font-extrabold text-muted shrink-0"
      )}
      style={{ width: px, height: px, fontSize: px * 0.34 }}
    >
      {team.shortName.slice(0, 2)}
    </div>
  );
}
