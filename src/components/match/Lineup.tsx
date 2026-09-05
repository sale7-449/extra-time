"use client";

import type { Match } from "@/lib/types";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormationPitch } from "@/components/match/FormationPitch";
import { useLocale } from "@/lib/i18n/LocaleProvider";

// تشكيلة أساسية حقيقية = 11 لاعباً دائماً بلا استثناء في كرة القدم. مصدر
// يُعيد أقل من ذلك (رُصِد فعلياً: 3 مقابل 2 لمباراة لا تغطيها أي من مصادرنا
// الحقيقية بالكامل) يعني بيانات ناقصة فعلاً — عرضها على الملعب كأنها تشكيلة
// عادية (وإن بدت متناثرة) لا يُبلِّغ المستخدم بصدق أن المصدر ناقص. الحل:
// معاملتها كـ"غير متوفرة بثقة كافية" بدل رسمها جزئياً.
function isCompleteLineup(match: Match): boolean {
  if (!match.lineups) return false;
  return match.lineups.home.startXI.length >= 11 && match.lineups.away.startXI.length >= 11;
}

export function Lineup({ match }: { match: Match }) {
  const { t } = useLocale();

  if (!isCompleteLineup(match)) {
    if (match.status === "SCHEDULED") {
      return <EmptyState title={t.match.noLineup} description={t.match.noLineupDesc} />;
    }
    return <EmptyState title={t.match.noLineupUnavailable} description={t.match.noLineupUnavailableDesc} />;
  }

  return <FormationPitch match={match} />;
}
