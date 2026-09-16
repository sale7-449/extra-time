"use client";

import { useActionState } from "react";
import { adminSetupAction, type AdminAuthState } from "@/lib/actions/admin-auth.actions";
import { Input } from "@/components/ui/Input";
import { useLocale } from "@/lib/i18n/LocaleProvider";

const initialState: AdminAuthState = { error: null };

export function AdminSetupForm() {
  const [state, formAction, pending] = useActionState(adminSetupAction, initialState);
  const { t } = useLocale();

  return (
    <form action={formAction} className="space-y-4">
      <Input type="text" name="username" placeholder={t.adminAuth.username} required autoComplete="username" />
      <Input type="email" name="email" placeholder={t.auth.email} required autoComplete="email" />
      <Input type="password" name="password" placeholder={t.auth.passwordMin} required autoComplete="new-password" />
      <Input type="password" name="confirmPassword" placeholder={t.auth.confirmPassword} required autoComplete="new-password" />

      {state.error && <p className="text-sm text-error">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full h-11 rounded-[var(--radius-sm)] bg-primary text-primary-ink font-bold hover:brightness-110 transition-[filter] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {pending ? t.adminAuth.settingUp : t.adminAuth.createAdmin}
      </button>
    </form>
  );
}
