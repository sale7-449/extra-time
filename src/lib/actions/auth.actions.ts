"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getServerLocale } from "@/lib/i18n/getServerLocale";
import { messages } from "@/lib/i18n/messages";

export interface AuthActionState {
  error: string | null;
}

async function authErrors() {
  const locale = await getServerLocale();
  return messages[locale].auth;
}

export async function signInAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const t = await authErrors();
  if (!isSupabaseConfigured()) return { error: t.notConfigured };

  const supabase = await createClient();
  if (!supabase) return { error: t.notConfigured };

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: t.invalidCredentials };

  revalidatePath("/", "layout");
  redirect("/profile");
}

export async function signUpAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const t = await authErrors();
  if (!isSupabaseConfigured()) return { error: t.notConfigured };

  const supabase = await createClient();
  if (!supabase) return { error: t.notConfigured };

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("name") ?? "");

  if (password.length < 8) return { error: t.passwordTooShort };

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) return { error: t.signupFailed };

  revalidatePath("/", "layout");
  redirect("/profile");
}

/** أصل الطلب الحقيقي الحالي (وليس NEXT_PUBLIC_SITE_URL — تلك تحمل placeholder
 * افتراضياً إن لم تُضبَط بعد، راجع sitemap.ts) — مبني من ترويسات الطلب
 * الفعلية، فيطابق دائماً نطاق Production الحقيقي بلا أي إعداد إضافي. */
async function getRequestOrigin(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const proto = headersList.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function forgotPasswordAction(_prev: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const t = await authErrors();
  if (!isSupabaseConfigured()) return { error: t.notConfigured };

  const supabase = await createClient();
  if (!supabase) return { error: t.notConfigured };

  const email = String(formData.get("email") ?? "");
  const origin = await getRequestOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });
  if (error) return { error: t.resetFailed };

  return { error: null };
}

export async function signOutAction() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
