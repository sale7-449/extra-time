import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * بيانات اعتماد المسؤول — مخزَّنة في جدول Postgres مستقل (`admin_credentials`،
 * راجع supabase/migrations/0003_admin_credentials.sql)، **منفصل تماماً عن
 * auth.users الخاص بـSupabase Auth** — لا علاقة له بـsignInWithPassword ولا
 * بمستخدمي الموقع العاديين. الوصول حصراً عبر service_role (يتجاوز RLS)،
 * بنفس نمط snapchat_oauth_tokens تماماً.
 */

const TABLE = "admin_credentials";

export interface AdminCredential {
  username: string;
  email: string;
  passwordHash: string;
}

/** هل يوجد حساب مسؤول مُعَدّ بالفعل؟ يُستخدَم لمنع /admin/setup من العمل
 * أكثر من مرة واحدة. */
export async function adminCredentialExists(): Promise<boolean> {
  const supabase = createServiceRoleClient();
  if (!supabase) return false;

  const { count } = await supabase.from(TABLE).select("id", { count: "exact", head: true });
  return Boolean(count && count > 0);
}

export async function getAdminCredentialByUsername(username: string): Promise<AdminCredential | null> {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  const { data } = await supabase.from(TABLE).select("username, email, password_hash").eq("username", username).maybeSingle();
  if (!data) return null;

  return { username: data.username, email: data.email, passwordHash: data.password_hash };
}

export async function createAdminCredential(username: string, email: string, passwordHash: string): Promise<void> {
  const supabase = createServiceRoleClient();
  if (!supabase) throw new Error("Supabase service role client is not configured");

  const { error } = await supabase.from(TABLE).insert({ username, email, password_hash: passwordHash });
  if (error) throw new Error("Failed to create admin credential");
}
