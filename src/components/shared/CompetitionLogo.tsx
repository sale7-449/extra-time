"use client";

import { useState } from "react";
import Image from "next/image";
import { TrophyIcon } from "@/components/icons";
import { isAllowedImageHost } from "@/lib/image-hosts";

/**
 * شعار البطولة الحقيقي (logoUrl من API-Football) إن وُجد ونجح تحميله، وإلا
 * أيقونة كأس عامة — لا شعار مُخمَّن أبداً. نفس منطق TeamLogo بالضبط، بما في
 * ذلك التحقق من أن المضيف مُدرَج في next.config قبل العرض.
 */
export function CompetitionLogo({
  logoUrl,
  name,
  size = 28,
}: {
  logoUrl: string | null;
  name: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (logoUrl && !failed && isAllowedImageHost(logoUrl)) {
    return (
      <Image
        src={logoUrl}
        alt={name}
        width={size}
        height={size}
        className="object-contain"
        onError={() => setFailed(true)}
      />
    );
  }

  // لون ثابت للأيقونة البديلة — لا تعتمد على لون النص الموروث من الحاوية
  // المستدعية (التي قد تتغيّر لخلفية بيضاء صلبة الآن)، فتبقى مرئية دائماً.
  return <TrophyIcon className="text-muted-dim" />;
}
