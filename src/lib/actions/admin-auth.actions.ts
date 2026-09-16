"use server";

import { redirect } from "next/navigation";
import { adminCredentialExists, createAdminCredential, getAdminCredentialByUsername } from "@/lib/admin/credentials";
import { hashPassword, verifyPasswordHash } from "@/lib/admin/password";
import { createAdminSession, clearAdminSession } from "@/lib/admin/session";
import { getServerLocale } from "@/lib/i18n/getServerLocale";
import { messages } from "@/lib/i18n/messages";

/**
 * دخول Admin مستقل تماماً عن signInAction/signUpAction وعن Supabase Auth —
 * لا يمسّهما، ولا يُستدعى منهما. راجع src/lib/admin/{password,session,
 * credentials}.ts للتفاصيل.
 */

export interface AdminAuthState {
  error: string | null;
}

async function localeMessages() {
  const locale = await getServerLocale();
  return messages[locale];
}

/** يعمل مرة واحدة فقط — يرفض بصمت (رسالة صريحة) إن كان حساب مسؤول موجوداً
 * بالفعل، بلا استثناء لأي طلب لاحق. */
export async function adminSetupAction(_prev: AdminAuthState, formData: FormData): Promise<AdminAuthState> {
  const m = await localeMessages();
  const t = m.adminAuth;

  if (await adminCredentialExists()) {
    return { error: t.setupAlreadyDone };
  }

  const username = String(formData.get("username") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!username || !email || !password) return { error: t.setupMissingFields };
  if (password.length < 8) return { error: m.auth.passwordTooShort };
  if (password !== confirmPassword) return { error: m.auth.passwordsDontMatch };

  try {
    await createAdminCredential(username, email, hashPassword(password));
  } catch {
    return { error: t.setupFailed };
  }

  await createAdminSession(username);
  redirect("/admin");
}

export async function adminLoginAction(_prev: AdminAuthState, formData: FormData): Promise<AdminAuthState> {
  const t = (await localeMessages()).adminAuth;

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const credential = await getAdminCredentialByUsername(username);
  if (!credential || !verifyPasswordHash(password, credential.passwordHash)) {
    return { error: t.invalidCredentials };
  }

  await createAdminSession(credential.username);
  redirect("/admin");
}

export async function adminLogoutAction() {
  await clearAdminSession();
  redirect("/admin/login");
}
