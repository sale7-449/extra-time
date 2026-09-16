"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { useLocale } from "@/lib/i18n/LocaleProvider";

type Status = "verifying" | "ready" | "invalid" | "submitting" | "success";

/**
 * يستقبل رابط استعادة كلمة المرور القادم من forgotPasswordAction
 * (redirectTo). Supabase قد يوصل الجلسة بإحدى طريقتين حسب إعداد المشروع —
 * لا نفترض أيّاً منهما:
 * 1. Hash fragment ضمني (#access_token=...&type=recovery) — يكتشفه Supabase
 *    JS SDK تلقائياً عند التحميل (detectSessionInUrl) ويُطلق حدث
 *    PASSWORD_RECOVERY عبر onAuthStateChange.
 * 2. PKCE صريح (?code=...) — نُبادل الكود يدوياً عبر exchangeCodeForSession.
 * رابط منتهي الصلاحية/غير صالح لا يُنتج أياً من الحالتين خلال مهلة قصيرة،
 * فنعرض رسالة صريحة بدل نموذج لا يعمل بصمت.
 */
export default function ResetPasswordPage() {
  const { t } = useLocale();
  const [status, setStatus] = useState<Status>("verifying");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      // setTimeout بدل استدعاء setState مباشرة ضمن جسم الـeffect نفسه (يخالف
      // react-hooks/set-state-in-effect) — نفس نمط SnapchatCreativeKitButton.tsx.
      const timer = setTimeout(() => setStatus("invalid"), 0);
      return () => clearTimeout(timer);
    }

    let settled = false;
    const markReady = (ok: boolean) => {
      if (settled) return;
      settled = true;
      setStatus(ok ? "ready" : "invalid");
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) markReady(true);
    });

    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => markReady(!error));
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") markReady(true);
    });

    const timeout = setTimeout(() => markReady(false), 4000);

    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (password.length < 8) {
      setFormError(t.auth.passwordTooShort);
      return;
    }
    if (password !== confirmPassword) {
      setFormError(t.auth.passwordsDontMatch);
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setFormError(t.auth.updatePasswordFailed);
      return;
    }

    setStatus("submitting");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setFormError(t.auth.updatePasswordFailed);
      setStatus("ready");
      return;
    }

    setStatus("success");
  }

  return (
    <div className="container-page py-16 md:py-24 flex justify-center">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-extrabold mb-1">{t.auth.resetPasswordTitle}</h1>
        <p className="text-sm text-muted mb-8">{t.auth.resetPasswordSub}</p>

        {status === "verifying" && <p className="text-sm text-muted">{t.auth.verifyingLink}</p>}

        {status === "invalid" && (
          <div className="space-y-4">
            <p className="text-sm text-error">{t.auth.invalidOrExpiredLink}</p>
            <Link href="/forgot-password" className="text-sm font-bold text-primary hover:underline">
              {t.auth.requestNewLink}
            </Link>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <p className="text-sm text-primary">{t.auth.passwordUpdated}</p>
            <Link
              href="/login"
              className="flex h-11 w-full items-center justify-center rounded-[var(--radius-sm)] bg-primary text-sm font-bold text-primary-ink hover:brightness-110 transition-[filter]"
            >
              {t.auth.goToLogin}
            </Link>
          </div>
        )}

        {(status === "ready" || status === "submitting") && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="password"
              placeholder={t.auth.newPassword}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <Input
              type="password"
              placeholder={t.auth.confirmPassword}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            {formError && <p className="text-sm text-error">{formError}</p>}

            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full h-11 rounded-[var(--radius-sm)] bg-primary text-primary-ink font-bold hover:brightness-110 transition-[filter] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              {status === "submitting" ? t.auth.updatingPassword : t.auth.updatePasswordCta}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
