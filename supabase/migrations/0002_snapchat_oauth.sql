-- EXTRA TIME — Snapchat Public Profile OAuth (ربط حساب المنصة، لا بيانات مستخدم)
-- صف واحد ثابت (id = 'extra_time') يخزّن access_token/refresh_token الخاصين
-- بحساب Snapchat Public Profile "Extra Time" نفسه. RLS مفعَّل عمداً بلا أي
-- سياسة وصول (create policy) — يعني رفض كامل لأي استعلام عبر anon أو
-- authenticated، والوصول الوحيد الممكن هو عبر service_role key الذي يتجاوز
-- RLS بطبيعته (راجع src/lib/supabase/service-role.ts وsrc/lib/providers/
-- snapchat/business-token-store.ts — الملفان الوحيدان المخوَّل لهما القراءة/
-- الكتابة هنا).

create table if not exists public.snapchat_oauth_tokens (
  id text primary key,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.snapchat_oauth_tokens enable row level security;
-- عمداً: صفر سياسات create policy على هذا الجدول.
