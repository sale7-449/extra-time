"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpAction, type AuthActionState } from "@/lib/actions/auth.actions";
import { Input } from "@/components/ui/Input";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const initialState: AuthActionState = { error: null };

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(signUpAction, initialState);
  const { t } = useLocale();

  return (
    <div className="container-page py-16 md:py-24 flex justify-center">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-extrabold mb-1">{t.auth.signupTitle}</h1>
        <p className="text-sm text-muted mb-8">{t.auth.signupSub}</p>

        <form action={formAction} className="space-y-4">
          <Input type="text" name="name" placeholder={t.auth.name} required autoComplete="name" />
          <Input type="email" name="email" placeholder={t.auth.email} required autoComplete="email" />
          <Input type="password" name="password" placeholder={t.auth.passwordMin} required minLength={8} autoComplete="new-password" />

          {state.error && <p className="text-sm text-error">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full h-11 rounded-[var(--radius-sm)] bg-primary text-primary-ink font-bold hover:brightness-110 transition-[filter] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            {pending ? t.auth.creating : t.common.signup}
          </button>
        </form>

        <p className="mt-6 text-sm text-center">
          {t.auth.haveAccount}{" "}
          <Link href="/login" className="font-bold text-primary hover:underline">
            {t.common.login}
          </Link>
        </p>
      </div>
    </div>
  );
}
