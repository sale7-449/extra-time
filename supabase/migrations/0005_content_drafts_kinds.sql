-- EXTRA TIME — Content Studio، الموجة الأولى من توسيع المصادر الحرة.
-- توسيع محض لقيود content_drafts (0004) — لا جدول جديد، لا Backfill، الصفوف
-- الحالية (kind='NEWS', source_type in ('URL','MANUAL')) تبقى صالحة كما هي
-- تماماً تحت القيود الأوسع أدناه.

-- kind: إضافة MATCH_RESULT / GOAL / MATCH_SUMMARY / IMAGE / VIDEO إلى جانب NEWS.
alter table public.content_drafts drop constraint if exists content_drafts_kind_check;
alter table public.content_drafts
  add constraint content_drafts_kind_check
  check (kind in ('NEWS', 'MATCH_RESULT', 'GOAL', 'MATCH_SUMMARY', 'IMAGE', 'VIDEO'));

-- source_type: إضافة MATCH (مباراة حقيقية من بيانات الموقع) إلى جانب URL/MANUAL.
alter table public.content_drafts drop constraint if exists content_drafts_source_type_check;
alter table public.content_drafts
  add constraint content_drafts_source_type_check
  check (source_type in ('URL', 'MANUAL', 'MATCH'));

-- attachments: عناصر إضافية اختيارية (صورة/فيديو/رابط) فوق المحتوى الأساسي —
-- تتيح تركيبات حرة (نص+صورة، مباراة+نص+رابط...) بلا تغيير بنيوي إضافي لاحقاً.
-- افتراضي '[]' لكل الصفوف الحالية — لا Backfill مطلوب، لا كسر.
alter table public.content_drafts
  add column if not exists attachments jsonb not null default '[]'::jsonb;
