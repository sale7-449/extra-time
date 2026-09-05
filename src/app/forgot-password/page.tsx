"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction, type AuthActionState } from "@/lib/actions/auth.actions";
import { Input } from "@/components/ui/Input";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const initialState: AuthActionState = { error: null };

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initialState);
  const { t } = useLocale();

  return (
    <div className="container-page py-16 md:py-24 flex justify-center">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-extrabold mb-1">{t.auth.forgotTitle}</h1>
        <p className="text-sm text-muted mb-8">{t.auth.forgotSub}</p>

        <form action={formAction} className="space-y-4">
          <Input type="email" name="email" placeholder={t.auth.email} required autoComplete="email" />

          {state.error && <p className="text-sm text-error">{state.error}</p>}
          {!state.error && state !== initialState && (
            <p className="text-sm text-primary">{t.auth.resetSent}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full h-11 rounded-[var(--radius-sm)] bg-primary text-primary-ink font-bold hover:brightness-110 transition-[filter] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {pending ? t.auth.sending : t.auth.sendReset}
          </button>
        </form>

        <p className="mt-6 text-sm text-center">
          <Link href="/login" className="font-bold text-primary hover:underline">
            {t.auth.backToLogin}
          </Link>
        </p>
      </div>
    </div>
  );
}
