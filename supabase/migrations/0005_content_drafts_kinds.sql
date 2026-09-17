-- EXTRA TIME — Content Studio: تصميم Subject/Entity الرسمي (يحلّ محل أي
-- محاولة سابقة غير مُطبَّقة لهذا الملف). توسيع محض لـcontent_drafts (0004) —
-- لا جدول جديد، لا Backfill يدوي، الصفوف الحالية (kind='NEWS',
-- source_type in ('URL','MANUAL')) تبقى صالحة تماماً تحت القيود الأوسع أدناه.
--
-- المبدأ: الربط بمباراة/نادٍ/بطولة حقيقية يتم حصراً عبر subject_type +
-- subject_id (معرّف حقيقي من مزوّد المباريات نفسه، لا نسخ لبياناته هنا) —
-- source_type/source_ref يبقيان لتوثيق منشأ النص التحريري فقط (رابط أم
-- كتابة يدوية)، بلا أي علاقة بربط الكيان الرياضي بعد الآن.

-- kind: كل الأنواع الستة المدعومة في الاستوديو.
alter table public.content_drafts drop constraint if exists content_drafts_kind_check;
alter table public.content_drafts
  add constraint content_drafts_kind_check
  check (kind in ('NEWS', 'MATCH_RESULT', 'GOAL', 'MATCH_SUMMARY', 'IMAGE', 'VIDEO'));

-- source_type: محصور بمنشأ النص التحريري فقط — لا قيمة MATCH هنا إطلاقاً،
-- ذاك دور subject_type أدناه حصراً. (نفس القيد الذي أنشأته 0004 أصلاً — هذا
-- توثيق صريح له، لا تغيير فعلي على البيانات الحالية.)
alter table public.content_drafts drop constraint if exists content_drafts_source_type_check;
alter table public.content_drafts
  add constraint content_drafts_source_type_check
  check (source_type in ('URL', 'MANUAL'));

-- subject_type/subject_id/subject_event_id: الربط الحقيقي الوحيد بمباراة/
-- نادٍ/بطولة — نصّي (soft reference)، بلا Foreign Key إلى بيانات المزوّدين
-- (غير مخزَّنة محلياً أصلاً). الصفوف الحالية (كلها NEWS بلا كيان مرتبط) تُصنَّف
-- 'NEWS' تلقائياً عبر DEFAULT، بلا أي تدخّل يدوي.
alter table public.content_drafts
  add column if not exists subject_type text not null default 'NEWS'
    check (subject_type in ('MATCH', 'TEAM', 'COMPETITION', 'NEWS', 'GENERAL'));
alter table public.content_drafts
  add column if not exists subject_id text;
alter table public.content_drafts
  add column if not exists subject_event_id text;

-- معرّف حدث (goal) لا معنى له إلا ضمن مباراة تحديداً.
alter table public.content_drafts drop constraint if exists content_drafts_subject_event_requires_match;
alter table public.content_drafts
  add constraint content_drafts_subject_event_requires_match
  check (subject_event_id is null or subject_type = 'MATCH');

-- مباراة/نادٍ/بطولة كموضوع يتطلّب معرّفاً حقيقياً فعلياً، لا مرجعاً فارغاً.
alter table public.content_drafts drop constraint if exists content_drafts_subject_id_required;
alter table public.content_drafts
  add constraint content_drafts_subject_id_required
  check (subject_type not in ('MATCH', 'TEAM', 'COMPETITION') or subject_id is not null);

-- attachments: عناصر إضافية اختيارية (صورة/فيديو/رابط) فوق المحتوى الأساسي —
-- تركيبات حرة (مباراة+نص+صورة، نادٍ+فيديو+خبر...) بلا تغيير بنيوي إضافي لاحقاً.
alter table public.content_drafts
  add column if not exists attachments jsonb not null default '[]'::jsonb;
