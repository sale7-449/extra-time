import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { ContentItem } from "@/lib/providers/social/types";

/**
 * طبقة خدمة Drafts في Content Studio (المرحلة الأولى: NEWS فقط) — تخزين عبر
 * public.content_drafts (راجع supabase/migrations/0004_content_drafts.sql)،
 * وصول حصراً عبر service_role، بلا علاقة بـSupabase Auth أو نظام Admin
 * نفسه (هذا الملف يخزّن/يقرأ فقط — التحقق من صلاحية المسؤول يحدث في طبقة
 * الـServer Actions المستدعية عبر getAdminSession()، لا هنا).
 */

const TABLE = "content_drafts";

export type ContentDraftKind = "NEWS";
export type ContentDraftSourceType = "URL" | "MANUAL";
export type ContentDestination = "SITE" | "SNAPCHAT";
export type ContentDraftStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface ContentDraft {
  id: string;
  kind: ContentDraftKind;
  sourceType: ContentDraftSourceType;
  sourceRef: string | null;
  /** لقطة مجمَّدة من ContentItem وقت الإنشاء/الاستيراد — لا تتغيّر تلقائياً. */
  baseContent: ContentItem;
  /** تعديلات المحرِّر فوق baseContent (جزئية) — راجع resolveContentItem في content-builders.ts. */
  overrides: Partial<ContentItem>;
  destinations: ContentDestination[];
  status: ContentDraftStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

interface ContentDraftRow {
  id: string;
  kind: string;
  source_type: string;
  source_ref: string | null;
  base_content: ContentItem;
  overrides: Partial<ContentItem>;
  destinations: string[];
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

function fromRow(row: ContentDraftRow): ContentDraft {
  return {
    id: row.id,
    kind: row.kind as ContentDraftKind,
    sourceType: row.source_type as ContentDraftSourceType,
    sourceRef: row.source_ref,
    baseContent: row.base_content,
    overrides: row.overrides ?? {},
    destinations: (row.destinations ?? []) as ContentDestination[],
    status: row.status as ContentDraftStatus,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}

const SELECT_COLUMNS =
  "id, kind, source_type, source_ref, base_content, overrides, destinations, status, created_by, created_at, updated_at, published_at";

export async function listContentDrafts(): Promise<ContentDraft[]> {
  const supabase = createServiceRoleClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from(TABLE)
    .select(SELECT_COLUMNS)
    .neq("status", "ARCHIVED")
    .order("updated_at", { ascending: false });

  if (error || !data) return [];
  return (data as ContentDraftRow[]).map(fromRow);
}

export async function getContentDraft(id: string): Promise<ContentDraft | null> {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  const { data, error } = await supabase.from(TABLE).select(SELECT_COLUMNS).eq("id", id).maybeSingle();
  if (error || !data) return null;
  return fromRow(data as ContentDraftRow);
}

export async function createContentDraft(input: {
  kind: ContentDraftKind;
  sourceType: ContentDraftSourceType;
  sourceRef?: string | null;
  baseContent: ContentItem;
  destinations: ContentDestination[];
  createdBy: string;
}): Promise<ContentDraft | null> {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      kind: input.kind,
      source_type: input.sourceType,
      source_ref: input.sourceRef ?? null,
      base_content: input.baseContent,
      overrides: {},
      destinations: input.destinations,
      status: "DRAFT",
      created_by: input.createdBy,
    })
    .select(SELECT_COLUMNS)
    .single();

  if (error || !data) return null;
  return fromRow(data as ContentDraftRow);
}

export async function updateContentDraft(
  id: string,
  patch: { overrides?: Partial<ContentItem>; destinations?: ContentDestination[] }
): Promise<ContentDraft | null> {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.overrides !== undefined) update.overrides = patch.overrides;
  if (patch.destinations !== undefined) update.destinations = patch.destinations;

  const { data, error } = await supabase.from(TABLE).update(update).eq("id", id).select(SELECT_COLUMNS).maybeSingle();
  if (error || !data) return null;
  return fromRow(data as ContentDraftRow);
}

export async function publishContentDraft(id: string): Promise<ContentDraft | null> {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from(TABLE)
    .update({ status: "PUBLISHED", published_at: now, updated_at: now })
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .maybeSingle();

  if (error || !data) return null;
  return fromRow(data as ContentDraftRow);
}

export async function archiveContentDraft(id: string): Promise<ContentDraft | null> {
  const supabase = createServiceRoleClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from(TABLE)
    .update({ status: "ARCHIVED", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .maybeSingle();

  if (error || !data) return null;
  return fromRow(data as ContentDraftRow);
}

/** المحتوى المنشور فقط لوجهة الموقع — تُستدعى من news.service.ts لدمجه مع
 * مجمّع RSS الحقيقي. فشل القراءة (لا service role، خطأ شبكة...) يُعيد []
 * بصمت بدل كسر صفحة الأخبار العامة بالكامل بسبب Content Studio. */
export async function listPublishedSiteNewsDrafts(): Promise<ContentDraft[]> {
  const supabase = createServiceRoleClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from(TABLE)
    .select(SELECT_COLUMNS)
    .eq("status", "PUBLISHED")
    .eq("kind", "NEWS")
    .contains("destinations", ["SITE"])
    .order("published_at", { ascending: false });

  if (error || !data) return [];
  return (data as ContentDraftRow[]).map(fromRow);
}
