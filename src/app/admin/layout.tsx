import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAdminAccessState } from "@/lib/auth/isAdmin";
import { getServerLocale, getMessages } from "@/lib/i18n/getServerLocale";

/**
 * حارس واحد لكل مسارات /admin/* الحالية والمستقبلية — لا حاجة لتكرار هذا
 * الفحص داخل كل صفحة إدارية على حدة:
 * - غير مسجَّل دخول → /login مباشرة.
 * - مسجَّل لكن ليس Admin → رسالة 403 واضحة، لا محتوى إداري يُعرَض إطلاقاً.
 * - Admin فعلي → يُعرَض المحتوى الحقيقي للصفحة (children) بلا أي تعديل عليه.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const state = await getAdminAccessState();

  if (state.status === "unauthenticated") {
    redirect("/login");
  }

  if (state.status === "forbidden") {
    const t = getMessages(await getServerLocale());
    return (
      <div className="container-page py-24 text-center">
        <h1 className="text-2xl font-extrabold mb-2">{t.admin.forbiddenTitle}</h1>
        <p className="text-sm text-muted">{t.admin.forbiddenDesc}</p>
      </div>
    );
  }

  return <>{children}</>;
}
