import { cookies } from "next/headers";
import { messages, DEFAULT_LOCALE, LOCALES, type Locale } from "./messages";

const COOKIE_NAME = "et_locale";

/** يُستخدم داخل Server Components فقط (Layout/Pages) لتحديد اللغة قبل أول
 * رسم — يضمن dir/lang صحيحين من أول تحميل بلا وميض. */
export async function getServerLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  return LOCALES.includes(value as Locale) ? (value as Locale) : DEFAULT_LOCALE;
}

export function getMessages(locale: Locale) {
  return messages[locale];
}

export { COOKIE_NAME };
