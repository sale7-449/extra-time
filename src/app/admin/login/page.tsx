"use client";

import { useActionState } from "react";
import { adminLoginAction, type AdminAuthState } from "@/lib/actions/admin-auth.actions";
import { Input } from "@/components/ui/Input";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const initialState: AdminAuthState = { error: null };

/**
 * تسجيل دخول مستقل تماماً عن /login العام — لا يستخدم Supabase Auth ولا
 * signInWithPassword إطلاقاً (راجع lib/actions/admin-auth.actions.ts).
 */
export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(adminLoginAction, initialState);
  const { t } = useLocale();

  return (
    <div className="container-page py-16 md:py-24 flex justify-center">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-extrabold mb-1">{t.adminAuth.loginTitle}</h1>
        <p className="text-sm text-muted mb-8">{t.adminAuth.loginSub}</p>

        <form action={formAction} className="space-y-4">
          <Input type="text" name="username" placeholder={t.adminAuth.username} required autoComplete="username" />
          <Input type="password" name="password" placeholder={t.auth.password} required autoComplete="current-password" />

          {state.error && <p className="text-sm text-error">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full h-11 rounded-[var(--radius-sm)] bg-primary text-primary-ink font-bold hover:brightness-110 transition-[filter] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {pending ? t.auth.loggingIn : t.common.login}
          </button>
        </form>
      </div>
    </div>
  );
}
