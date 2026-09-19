import { getServerLocale, getMessages } from "@/lib/i18n/getServerLocale";
import { listContentDraftsAction } from "@/lib/actions/admin-content.actions";
import { ContentStudioClient } from "@/components/admin/ContentStudioClient";

export async function generateMetadata() {
  const t = getMessages(await getServerLocale());
  return { title: `${t.admin.studioTitle} — EXTRA TIME` };
}

/**
 * Content Studio — المرحلة الأولى (NEWS فقط): مصدر/رابط → Draft محفوظ →
 * اختيار الوجهة → مراجعة/تعديل → Preview → Publish. طبقة العرض هنا Server
 * Component رقيقة فقط (جلب المسودات الأولي) — كل التفاعل في
 * ContentStudioClient (Server Actions تتحقّق من جلسة Admin بنفسها في
 * admin-content.actions.ts، بمعزل عن حماية هذه الصفحة عبر layout.tsx).
 */
export default async function AdminContentPage() {
  const t = getMessages(await getServerLocale());
  const drafts = await listContentDraftsAction();

  return (
    <div className="container-page py-6 md:py-10 max-w-5xl space-y-14">
      <div>
        <h1 className="text-2xl font-extrabold mb-1">{t.admin.studioTitle}</h1>
        <p className="text-sm text-muted">{t.admin.studioSubtitle}</p>
      </div>

      <ContentStudioClient initialDrafts={drafts} />
    </div>
  );
}
