import Link from "next/link";
import { adminCredentialExists } from "@/lib/admin/credentials";
import { getServerLocale, getMessages } from "@/lib/i18n/getServerLocale";
import { AdminSetupForm } from "./SetupForm";

export async function generateMetadata() {
  const t = getMessages(await getServerLocale());
  return { title: `${t.adminAuth.setupTitle} — EXTRA TIME` };
}

/**
 * يعمل مرة واحدة فقط بتصميمه: إن وُجد حساب مسؤول بالفعل في admin_credentials
 * (راجع credentials.ts)، لا يُعرض النموذج إطلاقاً — فقط رسالة صريحة ورابط
 * لتسجيل الدخول. لا طريقة لإعادة تشغيل هذا الإعداد لاحقاً إلا بحذف ذلك
 * الصف يدوياً من قاعدة البيانات (خارج نطاق هذا الكود عمداً).
 */
export default async function AdminSetupPage() {
  const t = getMessages(await getServerLocale());
  const alreadyConfigured = await adminCredentialExists();

  return (
    <div className="container-page py-16 md:py-24 flex justify-center">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-extrabold mb-1">{t.adminAuth.setupTitle}</h1>

        {alreadyConfigured ? (
          <div className="space-y-4">
            <p className="text-sm text-muted">{t.adminAuth.setupAlreadyDone}</p>
            <Link href="/admin/login" className="text-sm font-bold text-primary hover:underline">
              {t.adminAuth.goToAdminLogin}
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted mb-8">{t.adminAuth.setupSub}</p>
            <AdminSetupForm />
          </>
        )}
      </div>
    </div>
  );
}
