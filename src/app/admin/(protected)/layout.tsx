import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/session";

/**
 * حارس /admin و/admin/content (وأي مسار مستقبلي داخل هذه المجموعة) — يعتمد
 * حصراً على جلسة Admin المستقلة (admin_session cookie)، **لا** على
 * Supabase Auth أو ADMIN_EMAIL إطلاقاً. لا جلسة صالحة → /admin/login مباشرة.
 * /admin/login و/admin/setup خارج هذه المجموعة (Route Group) عمداً فلا
 * يُطبَّق عليهما هذا الحارس — وإلا لتعذّر الوصول لصفحة الدخول نفسها.
 */
export default async function AdminProtectedLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return <>{children}</>;
}
