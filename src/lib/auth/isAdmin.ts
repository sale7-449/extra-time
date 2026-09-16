import { getCurrentUser } from "@/lib/services/favorites.service";

/**
 * حماية Admin حقيقية وبسيطة: مستخدم واحد فقط مسموح له، محدَّد عبر
 * ADMIN_EMAIL في بيئة السيرفر — لا دور/جدول صلاحيات جديد الآن (خارج نطاق
 * هذه المرحلة). يتطلّب أن يكون المستخدم مسجَّلاً دخوله فعلياً عبر Supabase
 * Auth الموجود أصلاً في المشروع، وأن يطابق بريده هذا المتغيّر تماماً.
 *
 * `false` إن لم يُضبَط ADMIN_EMAIL بعد — لا صلاحية افتراضية لأي أحد.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) return false;

  const user = await getCurrentUser();
  if (!user?.email) return false;

  return user.email.toLowerCase() === adminEmail.toLowerCase();
}
