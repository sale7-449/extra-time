"use client";

import { useState } from "react";
import Image from "next/image";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cx } from "@/lib/utils";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { StoryTrigger } from "@/components/story/StoryTrigger";
import { isAllowedImageHost } from "@/lib/image-hosts";
import { resolveContentItem } from "@/lib/providers/social/content-builders";
import {
  createNewsDraftFromUrlAction,
  createManualNewsDraftAction,
  updateNewsDraftAction,
  publishNewsDraftAction,
  archiveNewsDraftAction,
} from "@/lib/actions/admin-content.actions";
import type { ContentDraft, ContentDestination } from "@/lib/admin/content-drafts";

type CreateMode = "url" | "manual";

/** يُطبَّع دائماً إلى إحدى 3 حالات: SITE فقط / SNAPCHAT فقط / كلاهما — يطابق
 * قيد قاعدة البيانات (destinations <@ ['SITE','SNAPCHAT']) بلا أي قيمة أخرى. */
function DestinationPicker({
  value,
  onChange,
  disabled,
}: {
  value: ContentDestination[];
  onChange: (next: ContentDestination[]) => void;
  disabled?: boolean;
}) {
  const { t } = useLocale();
  const current: "SITE" | "SNAPCHAT" | "BOTH" =
    value.includes("SITE") && value.includes("SNAPCHAT") ? "BOTH" : value.includes("SNAPCHAT") ? "SNAPCHAT" : "SITE";

  const options: Array<{ key: "SITE" | "SNAPCHAT" | "BOTH"; label: string; destinations: ContentDestination[] }> = [
    { key: "SITE", label: t.admin.destinationSite, destinations: ["SITE"] },
    { key: "SNAPCHAT", label: t.admin.destinationSnapchat, destinations: ["SNAPCHAT"] },
    { key: "BOTH", label: t.admin.destinationBoth, destinations: ["SITE", "SNAPCHAT"] },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.destinations)}
          className={cx(
            "h-9 px-4 rounded-[var(--radius-sm)] border text-sm font-bold transition-colors disabled:opacity-40",
            current === opt.key ? "border-primary bg-primary/10 text-primary" : "border-border text-muted hover:border-primary/30"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function statusTone(status: ContentDraft["status"]): "neutral" | "success" | "warning" {
  if (status === "PUBLISHED") return "success";
  if (status === "ARCHIVED") return "warning";
  return "neutral";
}

export function ContentStudioClient({ initialDrafts }: { initialDrafts: ContentDraft[] }) {
  const { t } = useLocale();

  const [drafts, setDrafts] = useState(initialDrafts);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const activeDraft = drafts.find((d) => d.id === activeDraftId) ?? null;

  // نموذج الإنشاء
  const [createMode, setCreateMode] = useState<CreateMode>("url");
  const [importUrl, setImportUrl] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualSummary, setManualSummary] = useState("");
  const [manualImage, setManualImage] = useState("");
  const [createDestinations, setCreateDestinations] = useState<ContentDestination[]>(["SITE"]);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // نموذج المراجعة/التعديل — يُهيَّأ من الـContentItem النهائي للمسودة المختارة
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editImage, setEditImage] = useState("");
  const [editDestinations, setEditDestinations] = useState<ContentDestination[]>(["SITE"]);
  const [editLoading, setEditLoading] = useState<"save" | "publish" | "archive" | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  function selectDraft(draft: ContentDraft) {
    setActiveDraftId(draft.id);
    const item = resolveContentItem(draft.baseContent, draft.overrides);
    setEditTitle(item.title);
    setEditSummary(item.summary ?? "");
    setEditImage(item.imageUrl ?? "");
    setEditDestinations(draft.destinations);
    setEditError(null);
  }

  function upsertDraft(draft: ContentDraft) {
    setDrafts((prev) => {
      const exists = prev.some((d) => d.id === draft.id);
      return exists ? prev.map((d) => (d.id === draft.id ? draft : d)) : [draft, ...prev];
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    if (createDestinations.length === 0) {
      setCreateError(t.admin.noDestinationError);
      return;
    }

    setCreateLoading(true);
    try {
      const result =
        createMode === "url"
          ? await createNewsDraftFromUrlAction({ newsUrl: importUrl, destinations: createDestinations })
          : await createManualNewsDraftAction({
              title: manualTitle,
              summary: manualSummary,
              imageUrl: manualImage,
              destinations: createDestinations,
            });

      if ("error" in result) {
        setCreateError(
          result.error === "not_found"
            ? t.admin.importNotFound
            : result.error === "empty"
              ? t.admin.emptyTitleError
              : result.error === "no_destination"
                ? t.admin.noDestinationError
                : t.admin.genericError
        );
        return;
      }

      upsertDraft(result.draft);
      selectDraft(result.draft);
      setImportUrl("");
      setManualTitle("");
      setManualSummary("");
      setManualImage("");
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleSave() {
    if (!activeDraft) return;
    setEditError(null);
    if (!editTitle.trim()) {
      setEditError(t.admin.emptyTitleError);
      return;
    }
    if (editDestinations.length === 0) {
      setEditError(t.admin.noDestinationError);
      return;
    }

    setEditLoading("save");
    try {
      const result = await updateNewsDraftAction(activeDraft.id, {
        title: editTitle,
        summary: editSummary,
        imageUrl: editImage,
        destinations: editDestinations,
      });
      if ("error" in result) {
        setEditError(t.admin.genericError);
        return;
      }
      upsertDraft(result.draft);
    } finally {
      setEditLoading(null);
    }
  }

  async function handlePublish() {
    if (!activeDraft) return;
    setEditLoading("publish");
    setEditError(null);
    try {
      const result = await publishNewsDraftAction(activeDraft.id);
      if ("error" in result) {
        setEditError(t.admin.genericError);
        return;
      }
      upsertDraft(result.draft);
    } finally {
      setEditLoading(null);
    }
  }

  async function handleArchive() {
    if (!activeDraft) return;
    setEditLoading("archive");
    setEditError(null);
    try {
      const result = await archiveNewsDraftAction(activeDraft.id);
      if ("error" in result) {
        setEditError(t.admin.genericError);
        return;
      }
      setDrafts((prev) => prev.filter((d) => d.id !== activeDraft.id));
      setActiveDraftId(null);
    } finally {
      setEditLoading(null);
    }
  }

  const previewItem = activeDraft
    ? resolveContentItem(activeDraft.baseContent, {
        ...activeDraft.overrides,
        title: editTitle,
        summary: editSummary || undefined,
        imageUrl: editImage || null,
      })
    : null;
  const previewImageAllowed = isAllowedImageHost(previewItem?.imageUrl);

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
      {/* قائمة المسودات */}
      <div>
        <h2 className="text-sm font-extrabold text-muted mb-3">{t.admin.draftsListTitle}</h2>
        {drafts.length === 0 ? (
          <p className="text-sm text-muted-dim">{t.admin.draftsEmpty}</p>
        ) : (
          <ul className="space-y-2">
            {drafts.map((d) => {
              const item = resolveContentItem(d.baseContent, d.overrides);
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => selectDraft(d)}
                    className={cx(
                      "w-full text-start rounded-[var(--radius-sm)] border p-3 transition-colors",
                      activeDraftId === d.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                    )}
                  >
                    <p className="text-sm font-bold line-clamp-2">{item.title}</p>
                    <div className="mt-2">
                      <Badge tone={statusTone(d.status)}>
                        {d.status === "PUBLISHED" ? t.admin.statusPublished : d.status === "ARCHIVED" ? t.admin.statusArchived : t.admin.statusDraft}
                      </Badge>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-10">
        {/* نموذج الإنشاء */}
        <div>
          <h2 className="text-lg font-extrabold mb-1">{t.admin.newDraftTitle}</h2>
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setCreateMode("url")}
              className={cx("h-9 px-4 rounded-[var(--radius-sm)] border text-sm font-bold", createMode === "url" ? "border-primary text-primary bg-primary/10" : "border-border text-muted")}
            >
              {t.admin.importFromUrlTab}
            </button>
            <button
              type="button"
              onClick={() => setCreateMode("manual")}
              className={cx("h-9 px-4 rounded-[var(--radius-sm)] border text-sm font-bold", createMode === "manual" ? "border-primary text-primary bg-primary/10" : "border-border text-muted")}
            >
              {t.admin.manualTab}
            </button>
          </div>

          <form onSubmit={handleCreate} className="space-y-4 max-w-lg">
            {createMode === "url" ? (
              <div>
                <label htmlFor="import-url" className="block text-sm font-bold mb-1.5">
                  {t.admin.newsUrlLabel}
                </label>
                <Input id="import-url" type="url" dir="ltr" value={importUrl} onChange={(e) => setImportUrl(e.target.value)} placeholder="https://..." />
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="manual-title" className="block text-sm font-bold mb-1.5">
                    {t.admin.manualTitleLabel}
                  </label>
                  <Input id="manual-title" value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="manual-summary" className="block text-sm font-bold mb-1.5">
                    {t.admin.manualSummaryLabel}
                  </label>
                  <textarea
                    id="manual-summary"
                    value={manualSummary}
                    onChange={(e) => setManualSummary(e.target.value)}
                    rows={3}
                    className="w-full rounded-[var(--radius-sm)] border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-ink placeholder:text-muted-dim outline-none transition-colors focus:border-primary/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  />
                </div>
                <div>
                  <label htmlFor="manual-image" className="block text-sm font-bold mb-1.5">
                    {t.admin.manualImageLabel}
                  </label>
                  <Input id="manual-image" type="url" dir="ltr" value={manualImage} onChange={(e) => setManualImage(e.target.value)} placeholder="https://..." />
                </div>
              </>
            )}

            <div>
              <p className="text-sm font-bold mb-1.5">{t.admin.destinationLabel}</p>
              <DestinationPicker value={createDestinations} onChange={setCreateDestinations} />
            </div>

            {createError && <p className="text-sm text-error font-bold">{createError}</p>}

            <Button type="submit" disabled={createLoading}>
              {createLoading
                ? createMode === "url"
                  ? t.admin.importSubmitting
                  : t.admin.creating
                : createMode === "url"
                  ? t.admin.importSubmit
                  : t.admin.createSubmit}
            </Button>
          </form>
        </div>

        {/* المراجعة والتعديل */}
        {activeDraft && previewItem ? (
          <div className="border-t border-border pt-8">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-lg font-extrabold">{t.admin.editTitle}</h2>
              <Badge tone={statusTone(activeDraft.status)}>
                {activeDraft.status === "PUBLISHED" ? t.admin.statusPublished : activeDraft.status === "ARCHIVED" ? t.admin.statusArchived : t.admin.statusDraft}
              </Badge>
            </div>
            {activeDraft.status === "PUBLISHED" && <p className="text-xs text-success mb-4">{t.admin.publishedHint}</p>}
            {activeDraft.status === "ARCHIVED" && <p className="text-xs text-muted-dim mb-4">{t.admin.archivedHint}</p>}

            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-4 max-w-lg">
                <div>
                  <label htmlFor="edit-title" className="block text-sm font-bold mb-1.5">
                    {t.admin.manualTitleLabel}
                  </label>
                  <Input id="edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="edit-summary" className="block text-sm font-bold mb-1.5">
                    {t.admin.manualSummaryLabel}
                  </label>
                  <textarea
                    id="edit-summary"
                    value={editSummary}
                    onChange={(e) => setEditSummary(e.target.value)}
                    rows={3}
                    className="w-full rounded-[var(--radius-sm)] border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-ink placeholder:text-muted-dim outline-none transition-colors focus:border-primary/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  />
                </div>
                <div>
                  <label htmlFor="edit-image" className="block text-sm font-bold mb-1.5">
                    {t.admin.manualImageLabel}
                  </label>
                  <Input id="edit-image" type="url" dir="ltr" value={editImage} onChange={(e) => setEditImage(e.target.value)} placeholder="https://..." />
                  {editImage && !isAllowedImageHost(editImage) && <p className="text-xs text-warning mt-1">{t.admin.imageHostWarning}</p>}
                </div>
                <div>
                  <p className="text-sm font-bold mb-1.5">{t.admin.destinationLabel}</p>
                  <DestinationPicker value={editDestinations} onChange={setEditDestinations} />
                </div>

                {editError && <p className="text-sm text-error font-bold">{editError}</p>}

                <div className="flex flex-wrap gap-2.5 pt-2">
                  <Button type="button" onClick={handleSave} disabled={editLoading !== null} variant="secondary">
                    {editLoading === "save" ? t.admin.saving : t.admin.saveDraft}
                  </Button>
                  {activeDraft.status !== "PUBLISHED" && (
                    <Button type="button" onClick={handlePublish} disabled={editLoading !== null}>
                      {editLoading === "publish" ? t.admin.publishing : t.admin.publish}
                    </Button>
                  )}
                  {activeDraft.status !== "ARCHIVED" && (
                    <Button type="button" onClick={handleArchive} disabled={editLoading !== null} variant="ghost">
                      {editLoading === "archive" ? t.admin.archiving : t.admin.archive}
                    </Button>
                  )}
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-6">
                <div>
                  <p className="text-sm font-bold mb-2">{t.admin.websitePreviewTitle}</p>
                  <div className="rounded-[var(--radius-lg)] border border-border bg-surface overflow-hidden max-w-sm">
                    <div className="relative h-40 bg-surface-2">
                      {previewItem.imageUrl && previewImageAllowed && (
                        <Image src={previewItem.imageUrl} alt={previewItem.title} fill sizes="384px" className="object-cover" />
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-extrabold text-sm leading-snug">{previewItem.title || "—"}</h3>
                      {previewItem.summary && <p className="text-xs text-muted mt-1.5 line-clamp-3">{previewItem.summary}</p>}
                    </div>
                  </div>
                </div>

                {editDestinations.includes("SNAPCHAT") && (
                  <div>
                    <p className="text-sm font-bold mb-2">{t.admin.snapchatPreviewTitle}</p>
                    <p className="text-xs text-muted-dim mb-2">{t.admin.snapchatPreviewHint}</p>
                    <StoryTrigger item={previewItem} label={t.story.snapchat} modalTitle={t.story.newsTitle} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-dim border-t border-border pt-8">{t.admin.selectDraftHint}</p>
        )}
      </div>
    </div>
  );
}
