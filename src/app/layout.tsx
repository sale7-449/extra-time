import type { Metadata } from "next";
import { Tajawal } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { MobileNav } from "@/components/layout/MobileNav";
import { Footer } from "@/components/layout/Footer";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { FollowProvider } from "@/lib/follow/FollowProvider";
import { getServerLocale, getMessages } from "@/lib/i18n/getServerLocale";
import { getAdminSession } from "@/lib/admin/session";

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700", "800"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = getMessages(await getServerLocale());
  return {
    title: t.home.siteTitle,
    description: t.home.siteDescription,
    openGraph: {
      title: "EXTRA TIME",
      description: `${t.home.heroTitle1} ${t.home.heroTitle2}`,
      type: "website",
      // يُطبَّق فقط على الصفحات التي لا تُعرّف openGraph خاصاً بها (مثل
      // الرئيسية) — أي صفحة فرعية تُعرّف openGraph كائناً كاملاً (كصفحتي
      // المباراة/الخبر) تستبدل هذا الكائن بالكامل بدل دمجه معه (تحقّق فعلي
      // عبر فحص HTML المُخرَج فوق نفق Cloudflare)، لذا siteName مكرَّر يدوياً
      // هناك أيضاً.
      siteName: "EXTRA TIME",
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getServerLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";
  // جلسة Admin موقَّعة صالحة فقط تُظهر رابط لوحة الإدارة — قيمة boolean فقط
  // تصل للعميل (لا اسم مستخدم ولا رمز). التحقق الفعلي من الصلاحية يبقى دائماً
  // على الخادم (middleware + (protected)/layout + كل Server Action).
  const isAdmin = (await getAdminSession()) !== null;
  const year = new Date().getFullYear();

  return (
    <html lang={locale} dir={dir} className={`${tajawal.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-bg text-ink antialiased">
        <LocaleProvider locale={locale}>
          <FollowProvider>
            <Header isAdmin={isAdmin} />
            <main className="flex-1 pb-20 md:pb-0">{children}</main>
            <Footer year={year} isAdmin={isAdmin} />
            <MobileNav isAdmin={isAdmin} />
          </FollowProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
