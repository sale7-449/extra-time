"use client";

import { createContext, useContext, useMemo } from "react";
import { messages, type Locale } from "./messages";

type Messages = (typeof messages)["ar"];

const LocaleContext = createContext<{ locale: Locale; t: Messages } | null>(null);

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, t: messages[locale] }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** يُستخدم داخل مكوّنات "use client" فقط لقراءة النصوص المترجمة والّلغة الحالية. */
export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
