import { getCurrentUser, type CurrentUser } from "@/lib/services/favorites.service";

/**
 * نقطة مركزية واحدة لحالة وصول المسؤول — كل مكان يحتاج التمييز بين "غير
 * مسجَّل دخول" و"مسجَّل لكن ليس Admin" و"Admin فعلي" يستخدم هذه الدالة فقط
 * (لا تكرار لمنطق قراءة المستخدم/المقارنة في أي ملف آخر).
 *
 * حماية حقيقية وبسيطة: مستخدم واحد فقط مسموح له، محدَّد عبر ADMIN_EMAIL في
 * بيئة السيرفر — لا دور/جدول صلاحيات جديد الآن. يتطلّب أن يكون المستخدم
 * مسجَّلاً دخوله فعلياً عبر Supabase Auth الموجود أصلاً، وأن يطابق بريده
 * هذا المتغيّر (بعد trim + lowercase على الطرفين، لتفادي فشل صامت بسبب
 * مسافة زائدة عند إدخال القيمة في Vercel).
 */
export type AdminAccessState =
  | { status: "unauthenticated" }
  | { status: "forbidden"; user: CurrentUser }
  | { status: "admin"; user: CurrentUser };

export async function getAdminAccessState(): Promise<AdminAccessState> {
  const user = await getCurrentUser();
  if (!user) return { status: "unauthenticated" };

  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdmin = Boolean(adminEmail) && Boolean(user.email) && user.email!.trim().toLowerCase() === adminEmail!.trim().toLowerCase();

  return isAdmin ? { status: "admin", user } : { status: "forbidden", user };
}

/** اختصار بولياني — يُستخدَم في مسارات Snapchat OAuth الموجودة أصلاً
 * (start/callback)، لا تغيير على توقيعها أو سلوكها. */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const state = await getAdminAccessState();
  return state.status === "admin";
}
