"use server";

import { cookies } from "next/headers";
import { LOCALES, type Locale } from "@/lib/i18n/messages";
import { COOKIE_NAME } from "@/lib/i18n/getServerLocale";

/** يكتب cookie اللغة فقط — تعيين cookie داخل Server Action يُعيد رسم المسار
 * الحالي ويُبطل Router Cache تلقائياً. لا revalidatePath هنا عمداً: كان يُبطل
 * أيضاً Data Cache (نتائج المزوّدين، وهي غير مرتبطة باللغة أصلاً) فيُجبر كل تبديل
 * لغة على إعادة جلب كل شيء من الصفر (3–8 ثوانٍ) بلا أي فائدة. */
export async function setLocaleAction(locale: Locale) {
  if (!LOCALES.includes(locale)) return;
  const store = await cookies();
  store.set(COOKIE_NAME, locale, { maxAge: 60 * 60 * 24 * 365, path: "/" });
}
