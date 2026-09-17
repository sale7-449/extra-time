-- EXTRA TIME — Content Studio، المرحلة الأولى: مسودات محتوى قابلة للمراجعة
-- والنشر (Draft/Published/Archived) قبل ظهورها على الموقع/Snapchat. لا علاقة
-- بأي جدول آخر — لا بيانات مباريات، لا مستخدمين عاديين، لا Supabase Auth.
--
-- base_content: لقطة مجمَّدة (ContentItem كامل) وقت الإنشاء/الاستيراد — لا
-- تتغيّر تلقائياً مع تغيّر المصدر الحي لاحقاً. overrides: تعديلات المحرِّر
-- فوقها (عنوان/وصف/صورة...). الناتج النهائي دائماً base_content + overrides
-- (دمج في الكود عبر resolveContentItem، راجع content-builders.ts) — لا نص
-- سرّي أو بيانات اعتماد يُخزَّن في أيّ منهما.
--
-- RLS مفعَّل عمداً بلا أي سياسة وصول — نفس نمط admin_credentials/
-- snapchat_oauth_tokens: رفض كامل لأي استعلام عبر anon أو authenticated،
-- والوصول الوحيد عبر service_role من src/lib/admin/content-drafts.ts حصراً.

create table if not exists public.content_drafts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('NEWS')),
  source_type text not null check (source_type in ('URL', 'MANUAL')),
  source_ref text,
  base_content jsonb not null,
  overrides jsonb not null default '{}'::jsonb,
  destinations text[] not null default array['SITE']::text[]
    check (destinations <@ array['SITE', 'SNAPCHAT']::text[] and array_length(destinations, 1) > 0),
  status text not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

alter table public.content_drafts enable row level security;
-- عمداً: صفر سياسات create policy على هذا الجدول.
