"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction, type AuthActionState } from "@/lib/actions/auth.actions";
import { Input } from "@/components/ui/Input";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const initialState: AuthActionState = { error: null };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signInAction, initialState);
  const { t } = useLocale();

  return (
    <div className="container-page py-16 md:py-24 flex justify-center">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-extrabold mb-1">{t.auth.loginTitle}</h1>
        <p className="text-sm text-muted mb-8">{t.auth.loginSub}</p>

        <form action={formAction} className="space-y-4">
          <Input type="email" name="email" placeholder={t.auth.email} required autoComplete="email" />
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

        <div className="mt-6 flex justify-between text-sm">
          <Link href="/forgot-password" className="text-muted hover:text-primary transition-colors">
            {t.auth.forgotPassword}
          </Link>
          <Link href="/signup" className="font-bold text-primary hover:underline">
            {t.auth.newAccount}
          </Link>
        </div>
      </div>
    </div>
  );
}
