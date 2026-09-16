import Link from "next/link";
import { getCurrentUser } from "@/lib/services/favorites.service";
import { signOutAction } from "@/lib/actions/auth.actions";
import { getServerLocale, getMessages } from "@/lib/i18n/getServerLocale";

export async function generateMetadata() {
  const t = getMessages(await getServerLocale());
  return { title: `${t.admin.dashboardTitle} — EXTRA TIME` };
}

/**
 * بوابة لوحة المسؤول — بسيطة عمداً في هذه المرحلة. الوصول لهذه الصفحة أصلاً
 * مضمون أنه Admin حقيقي (يحميها src/app/admin/layout.tsx)، فلا حاجة لأي
 * فحص إضافي هنا.
 */
export default async function AdminPage() {
  const t = getMessages(await getServerLocale());
  const user = await getCurrentUser();

  return (
    <div className="container-page py-16 md:py-24 flex justify-center">
      <div className="w-full max-w-sm text-center space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold mb-1">{t.admin.dashboardTitle}</h1>
          <p className="text-sm text-muted">
            {t.admin.accountStatusLabel}: <span className="font-bold text-primary">{t.admin.accountStatusAdmin}</span>
          </p>
          {user?.email && (
            <p className="text-xs text-muted-dim mt-1" dir="ltr">
              {user.email}
            </p>
          )}
        </div>

        <Link
          href="/admin/content"
          className="flex h-11 w-full items-center justify-center rounded-[var(--radius-sm)] bg-primary text-sm font-bold text-primary-ink hover:brightness-110 transition-[filter] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {t.admin.goToContent}
        </Link>

        <form action={signOutAction}>
          <button
            type="submit"
            className="h-11 w-full rounded-[var(--radius-sm)] border border-border text-sm font-bold text-muted hover:text-error hover:border-error/40 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {t.common.logout}
          </button>
        </form>
      </div>
    </div>
  );
}
