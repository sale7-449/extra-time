-- EXTRA TIME — بيانات اعتماد المسؤول (نظام دخول Admin مستقل تماماً عن
-- Supabase Auth) — لا علاقة له بجدول auth.users ولا بأي مستخدم عادي في
-- الموقع. كلمة المرور تُخزَّن هنا كـhash فقط (scrypt + ملح عشوائي، راجع
-- src/lib/admin/password.ts) — لا نص صريح أبداً.
--
-- RLS مفعَّل عمداً بلا أي سياسة وصول (create policy) — رفض كامل لأي
-- استعلام عبر anon أو authenticated، والوصول الوحيد الممكن هو عبر
-- service_role (يتجاوز RLS)، من src/lib/admin/credentials.ts حصراً.

create table if not exists public.admin_credentials (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  email text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_credentials enable row level security;
-- عمداً: صفر سياسات create policy على هذا الجدول.
