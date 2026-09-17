"use client";

import { useState } from "react";
import Image from "next/image";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cx, formatKickoffTime } from "@/lib/utils";
import { localizeCompetitionShortName } from "@/lib/i18n/localized-names";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { MatchStatusBadge } from "@/components/shared/MatchStatusBadge";
import { StoryTrigger } from "@/components/story/StoryTrigger";
import { isAllowedImageHost } from "@/lib/image-hosts";
import { resolveContentItem } from "@/lib/providers/social/content-builders";
import {
  createNewsDraftFromUrlAction,
  createManualDraftAction,
  createMatchDraftAction,
  updateDraftAction,
  publishDraftAction,
  archiveDraftAction,
  searchMatchesAction,
  getMatchDetailAction,
} from "@/lib/actions/admin-content.actions";
import type { ContentDraft, ContentDestination, ContentDraftKind } from "@/lib/admin/content-drafts";
import type { Attachment } from "@/lib/providers/social/types";
import type { Match, MatchEvent } from "@/lib/types";

type CreateTab = "url" | "manual" | "match";
type ManualKind = "NEWS" | "IMAGE";
type MatchContentKind = "MATCH_RESULT" | "GOAL" | "MATCH_SUMMARY";

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

function useKindLabel() {
  const { t } = useLocale();
  return (kind: ContentDraftKind): string => {
    switch (kind) {
      case "NEWS":
        return t.admin.kindLabelNews;
      case "MATCH_RESULT":
        return t.admin.kindLabelMatchResult;
      case "GOAL":
        return t.admin.kindLabelGoal;
      case "MATCH_SUMMARY":
        return t.admin.kindLabelMatchSummary;
      case "IMAGE":
        return t.admin.kindLabelImage;
      case "VIDEO":
        return t.admin.kindLabelVideo;
      default:
        return kind;
    }
  };
}

const textareaClass =
  "w-full rounded-[var(--radius-sm)] border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-ink placeholder:text-muted-dim outline-none transition-colors focus:border-primary/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";

export function ContentStudioClient({ initialDrafts }: { initialDrafts: ContentDraft[] }) {
  const { t, locale } = useLocale();
  const kindLabel = useKindLabel();

  const [drafts, setDrafts] = useState(initialDrafts);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const activeDraft = drafts.find((d) => d.id === activeDraftId) ?? null;

  // تبويب الإنشاء
  const [createTab, setCreateTab] = useState<CreateTab>("url");
  const [createDestinations, setCreateDestinations] = useState<ContentDestination[]>(["SITE"]);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // استيراد من رابط
  const [importUrl, setImportUrl] = useState("");

  // إنشاء يدوي (خبر/صورة)
  const [manualKind, setManualKind] = useState<ManualKind>("NEWS");
  const [manualTitle, setManualTitle] = useState("");
  const [manualSummary, setManualSummary] = useState("");
  const [manualImage, setManualImage] = useState("");

  // من مباراة
  const [matchQuery, setMatchQuery] = useState("");
  const [matchSearching, setMatchSearching] = useState(false);
  const [matchResults, setMatchResults] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchDetailLoading, setMatchDetailLoading] = useState(false);
  const [matchContentKind, setMatchContentKind] = useState<MatchContentKind>("MATCH_SUMMARY");
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [summaryTitle, setSummaryTitle] = useState("");
  const [summaryText, setSummaryText] = useState("");

  // المراجعة/التعديل
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editImage, setEditImage] = useState("");
  const [editDestinations, setEditDestinations] = useState<ContentDestination[]>(["SITE"]);
  const [editAttachments, setEditAttachments] = useState<Attachment[]>([]);
  const [newAttachmentType, setNewAttachmentType] = useState<Attachment["type"]>("IMAGE");
  const [newAttachmentUrl, setNewAttachmentUrl] = useState("");
  const [newAttachmentCaption, setNewAttachmentCaption] = useState("");
  const [editLoading, setEditLoading] = useState<"save" | "publish" | "archive" | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  function selectDraft(draft: ContentDraft) {
    setActiveDraftId(draft.id);
    const item = resolveContentItem(draft.baseContent, draft.overrides);
    setEditTitle(item.title);
    setEditSummary(item.summary ?? "");
    setEditImage(item.imageUrl ?? "");
    setEditDestinations(draft.destinations);
    setEditAttachments(draft.attachments);
    setEditError(null);
  }

  function upsertDraft(draft: ContentDraft) {
    setDrafts((prev) => {
      const exists = prev.some((d) => d.id === draft.id);
      return exists ? prev.map((d) => (d.id === draft.id ? draft : d)) : [draft, ...prev];
    });
  }

  function resetCreateForms() {
    setImportUrl("");
    setManualTitle("");
    setManualSummary("");
    setManualImage("");
    setMatchQuery("");
    setMatchResults([]);
    setSelectedMatch(null);
    setSelectedEventId("");
    setSummaryTitle("");
    setSummaryText("");
  }

  function applyCreateResult(result: { draft: ContentDraft } | { error: string }) {
    if ("error" in result) {
      setCreateError(
        result.error === "not_found"
          ? t.admin.importNotFound
          : result.error === "empty" || result.error === "image_required"
            ? t.admin.emptyTitleError
            : result.error === "no_destination"
              ? t.admin.noDestinationError
              : t.admin.genericError
      );
      return;
    }
    upsertDraft(result.draft);
    selectDraft(result.draft);
    resetCreateForms();
  }

  async function handleImportSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    if (createDestinations.length === 0) return setCreateError(t.admin.noDestinationError);
    setCreateLoading(true);
    try {
      applyCreateResult(await createNewsDraftFromUrlAction({ newsUrl: importUrl, destinations: createDestinations }));
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    if (createDestinations.length === 0) return setCreateError(t.admin.noDestinationError);
    setCreateLoading(true);
    try {
      applyCreateResult(
        await createManualDraftAction({
          kind: manualKind,
          title: manualTitle,
          summary: manualSummary,
          imageUrl: manualImage,
          destinations: createDestinations,
        })
      );
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleMatchSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!matchQuery.trim()) return;
    setMatchSearching(true);
    setCreateError(null);
    try {
      setMatchResults(await searchMatchesAction(matchQuery));
    } finally {
      setMatchSearching(false);
    }
  }

  async function handleSelectMatch(m: Match) {
    setMatchDetailLoading(true);
    setSelectedEventId("");
    try {
      const detail = await getMatchDetailAction(m.id);
      setSelectedMatch(detail ?? m);
    } finally {
      setMatchDetailLoading(false);
    }
  }

  const eligibleGoalEvents: MatchEvent[] = selectedMatch
    ? selectedMatch.events.filter((e) => e.type === "GOAL" && e.playerName !== "—")
    : [];

  async function handleCreateFromMatch(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMatch) return;
    setCreateError(null);
    if (createDestinations.length === 0) return setCreateError(t.admin.noDestinationError);

    setCreateLoading(true);
    try {
      applyCreateResult(
        await createMatchDraftAction({
          kind: matchContentKind,
          matchId: selectedMatch.id,
          eventId: matchContentKind === "GOAL" ? selectedEventId : undefined,
          title: matchContentKind === "MATCH_SUMMARY" ? summaryTitle : undefined,
          summary: matchContentKind === "MATCH_SUMMARY" ? summaryText : undefined,
          destinations: createDestinations,
        })
      );
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleSave() {
    if (!activeDraft) return;
    setEditError(null);
    if (!editTitle.trim()) return setEditError(t.admin.emptyTitleError);
    if (editDestinations.length === 0) return setEditError(t.admin.noDestinationError);

    setEditLoading("save");
    try {
      const result = await updateDraftAction(activeDraft.id, {
        title: editTitle,
        summary: editSummary,
        imageUrl: editImage,
        destinations: editDestinations,
        attachments: editAttachments,
      });
      if ("error" in result) return setEditError(t.admin.genericError);
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
      const result = await publishDraftAction(activeDraft.id);
      if ("error" in result) return setEditError(t.admin.genericError);
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
      const result = await archiveDraftAction(activeDraft.id);
      if ("error" in result) return setEditError(t.admin.genericError);
      setDrafts((prev) => prev.filter((d) => d.id !== activeDraft.id));
      setActiveDraftId(null);
    } finally {
      setEditLoading(null);
    }
  }

  function addAttachment() {
    const url = newAttachmentUrl.trim();
    if (!url) return;
    setEditAttachments((prev) => [...prev, { type: newAttachmentType, url, caption: newAttachmentCaption.trim() || undefined }]);
    setNewAttachmentUrl("");
    setNewAttachmentCaption("");
  }

  function removeAttachment(index: number) {
    setEditAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  const previewItem = activeDraft
    ? resolveContentItem(activeDraft.baseContent, {
        ...activeDraft.overrides,
        title: editTitle,
        summary: editSummary || undefined,
        imageUrl: editImage || null,
        attachments: editAttachments,
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
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge tone="primary">{kindLabel(d.kind)}</Badge>
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
        {/* الإنشاء */}
        <div>
          <h2 className="text-lg font-extrabold mb-1">{t.admin.newDraftTitle}</h2>
          <div className="flex gap-2 mb-4">
            {([
              ["url", t.admin.importFromUrlTab],
              ["manual", t.admin.manualTab],
              ["match", t.admin.matchTab],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCreateTab(key)}
                className={cx(
                  "h-9 px-4 rounded-[var(--radius-sm)] border text-sm font-bold",
                  createTab === key ? "border-primary text-primary bg-primary/10" : "border-border text-muted"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {createTab === "url" && (
            <form onSubmit={handleImportSubmit} className="space-y-4 max-w-lg">
              <div>
                <label htmlFor="import-url" className="block text-sm font-bold mb-1.5">
                  {t.admin.newsUrlLabel}
                </label>
                <Input id="import-url" type="url" dir="ltr" value={importUrl} onChange={(e) => setImportUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <p className="text-sm font-bold mb-1.5">{t.admin.destinationLabel}</p>
                <DestinationPicker value={createDestinations} onChange={setCreateDestinations} />
              </div>
              {createError && <p className="text-sm text-error font-bold">{createError}</p>}
              <Button type="submit" disabled={createLoading}>
                {createLoading ? t.admin.importSubmitting : t.admin.importSubmit}
              </Button>
            </form>
          )}

          {createTab === "manual" && (
            <form onSubmit={handleManualSubmit} className="space-y-4 max-w-lg">
              <div>
                <p className="text-sm font-bold mb-1.5">{t.admin.kindLabel}</p>
                <div className="flex gap-2">
                  {([
                    ["NEWS", t.admin.kindNews],
                    ["IMAGE", t.admin.kindImage],
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setManualKind(key)}
                      className={cx(
                        "h-9 px-4 rounded-[var(--radius-sm)] border text-sm font-bold",
                        manualKind === key ? "border-primary text-primary bg-primary/10" : "border-border text-muted"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
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
                <textarea id="manual-summary" value={manualSummary} onChange={(e) => setManualSummary(e.target.value)} rows={3} className={textareaClass} />
              </div>
              <div>
                <label htmlFor="manual-image" className="block text-sm font-bold mb-1.5">
                  {manualKind === "IMAGE" ? t.admin.manualImageLabel : t.admin.manualImageLabelOptional}
                </label>
                <Input id="manual-image" type="url" dir="ltr" value={manualImage} onChange={(e) => setManualImage(e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <p className="text-sm font-bold mb-1.5">{t.admin.destinationLabel}</p>
                <DestinationPicker value={createDestinations} onChange={setCreateDestinations} />
              </div>
              {createError && <p className="text-sm text-error font-bold">{createError}</p>}
              <Button type="submit" disabled={createLoading}>
                {createLoading ? t.admin.creating : t.admin.createSubmit}
              </Button>
            </form>
          )}

          {createTab === "match" && (
            <div className="max-w-lg space-y-5">
              {!selectedMatch ? (
                <>
                  <form onSubmit={handleMatchSearch} className="flex gap-2">
                    <Input
                      value={matchQuery}
                      onChange={(e) => setMatchQuery(e.target.value)}
                      placeholder={t.admin.matchSearchPlaceholder}
                      aria-label={t.admin.matchSearchLabel}
                    />
                    <Button type="submit" disabled={matchSearching} variant="secondary">
                      {matchSearching ? t.admin.matchSearching : t.admin.matchSearchButton}
                    </Button>
                  </form>

                  {matchResults.length === 0 ? (
                    <p className="text-sm text-muted-dim">{t.admin.matchSelectHint}</p>
                  ) : (
                    <ul className="space-y-2">
                      {matchResults.map((m) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            onClick={() => handleSelectMatch(m)}
                            className="w-full text-start rounded-[var(--radius-sm)] border border-border p-3 hover:border-primary/30 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-bold">
                                {m.homeTeam.name} × {m.awayTeam.name}
                              </span>
                              <MatchStatusBadge status={m.status} minute={m.minute} />
                            </div>
                            <span className="text-xs text-muted-dim">
                              {localizeCompetitionShortName(m.competitionId, locale) ?? ""} · {formatKickoffTime(m.kickoff, locale)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : matchDetailLoading ? (
                <p className="text-sm text-muted-dim">{t.admin.matchSearching}</p>
              ) : (
                <form onSubmit={handleCreateFromMatch} className="space-y-4">
                  <div className="rounded-[var(--radius-sm)] border border-border p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-bold">
                        {selectedMatch.homeTeam.name} {selectedMatch.homeScore ?? "–"} : {selectedMatch.awayScore ?? "–"} {selectedMatch.awayTeam.name}
                      </span>
                      <MatchStatusBadge status={selectedMatch.status} minute={selectedMatch.minute} />
                    </div>
                    <p className="text-xs text-muted-dim">
                      {t.admin.matchCompetitionLabel}: {localizeCompetitionShortName(selectedMatch.competitionId, locale) ?? "—"} · {t.admin.matchDateLabel}:{" "}
                      {formatKickoffTime(selectedMatch.kickoff, locale)}
                    </p>
                    <button type="button" onClick={() => setSelectedMatch(null)} className="text-xs font-bold text-primary mt-2">
                      {t.admin.changeMatch}
                    </button>
                  </div>

                  <div>
                    <p className="text-sm font-bold mb-1.5">{t.admin.matchContentKindLabel}</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={selectedMatch.status !== "FINISHED" || selectedMatch.homeScore === null || selectedMatch.awayScore === null}
                        onClick={() => setMatchContentKind("MATCH_RESULT")}
                        className={cx(
                          "h-9 px-4 rounded-[var(--radius-sm)] border text-sm font-bold disabled:opacity-40",
                          matchContentKind === "MATCH_RESULT" ? "border-primary text-primary bg-primary/10" : "border-border text-muted"
                        )}
                      >
                        {t.admin.matchKindResult}
                      </button>
                      <button
                        type="button"
                        disabled={eligibleGoalEvents.length === 0}
                        onClick={() => setMatchContentKind("GOAL")}
                        className={cx(
                          "h-9 px-4 rounded-[var(--radius-sm)] border text-sm font-bold disabled:opacity-40",
                          matchContentKind === "GOAL" ? "border-primary text-primary bg-primary/10" : "border-border text-muted"
                        )}
                      >
                        {t.admin.matchKindGoal}
                      </button>
                      <button
                        type="button"
                        onClick={() => setMatchContentKind("MATCH_SUMMARY")}
                        className={cx(
                          "h-9 px-4 rounded-[var(--radius-sm)] border text-sm font-bold",
                          matchContentKind === "MATCH_SUMMARY" ? "border-primary text-primary bg-primary/10" : "border-border text-muted"
                        )}
                      >
                        {t.admin.matchKindSummary}
                      </button>
                    </div>
                    {matchContentKind === "MATCH_RESULT" && (selectedMatch.status !== "FINISHED" || selectedMatch.homeScore === null) && (
                      <p className="text-xs text-warning mt-1.5">{t.admin.matchResultUnavailable}</p>
                    )}
                    {matchContentKind === "GOAL" && eligibleGoalEvents.length === 0 && <p className="text-xs text-warning mt-1.5">{t.admin.matchGoalUnavailable}</p>}
                  </div>

                  {matchContentKind === "GOAL" && eligibleGoalEvents.length > 0 && (
                    <div>
                      <p className="text-sm font-bold mb-1.5">{t.admin.matchGoalSelectLabel}</p>
                      <div className="space-y-1.5">
                        {eligibleGoalEvents.map((ev) => (
                          <label key={ev.id} className="flex items-center gap-2 text-sm">
                            <input type="radio" name="goal-event" checked={selectedEventId === ev.id} onChange={() => setSelectedEventId(ev.id)} />
                            {ev.playerName} — {ev.minute}&apos;{ev.extraMinute ? `+${ev.extraMinute}` : ""}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {matchContentKind === "MATCH_SUMMARY" && (
                    <>
                      <div>
                        <label htmlFor="summary-title" className="block text-sm font-bold mb-1.5">
                          {t.admin.matchSummaryTitleLabel}
                        </label>
                        <Input id="summary-title" value={summaryTitle} onChange={(e) => setSummaryTitle(e.target.value)} />
                      </div>
                      <div>
                        <label htmlFor="summary-text" className="block text-sm font-bold mb-1.5">
                          {t.admin.matchSummaryTextLabel}
                        </label>
                        <textarea id="summary-text" value={summaryText} onChange={(e) => setSummaryText(e.target.value)} rows={4} className={textareaClass} />
                      </div>
                    </>
                  )}

                  <div>
                    <p className="text-sm font-bold mb-1.5">{t.admin.destinationLabel}</p>
                    <DestinationPicker value={createDestinations} onChange={setCreateDestinations} />
                  </div>

                  {createError && <p className="text-sm text-error font-bold">{createError}</p>}

                  <Button
                    type="submit"
                    disabled={createLoading || (matchContentKind === "GOAL" && !selectedEventId)}
                  >
                    {createLoading ? t.admin.creating : t.admin.createSubmit}
                  </Button>
                </form>
              )}
            </div>
          )}
        </div>

        {/* المراجعة والتعديل */}
        {activeDraft && previewItem ? (
          <div className="border-t border-border pt-8">
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-lg font-extrabold">{t.admin.editTitle}</h2>
              <Badge tone="primary">{kindLabel(activeDraft.kind)}</Badge>
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
                  <textarea id="edit-summary" value={editSummary} onChange={(e) => setEditSummary(e.target.value)} rows={3} className={textareaClass} />
                </div>
                <div>
                  <label htmlFor="edit-image" className="block text-sm font-bold mb-1.5">
                    {t.admin.manualImageLabelOptional}
                  </label>
                  <Input id="edit-image" type="url" dir="ltr" value={editImage} onChange={(e) => setEditImage(e.target.value)} placeholder="https://..." />
                  {editImage && !isAllowedImageHost(editImage) && <p className="text-xs text-warning mt-1">{t.admin.imageHostWarning}</p>}
                </div>

                <div>
                  <p className="text-sm font-bold mb-1.5">{t.admin.attachmentsLabel}</p>
                  {editAttachments.length === 0 ? (
                    <p className="text-xs text-muted-dim mb-2">{t.admin.noAttachments}</p>
                  ) : (
                    <ul className="space-y-1.5 mb-2">
                      {editAttachments.map((a, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs rounded-[var(--radius-sm)] border border-border p-2">
                          <Badge tone="neutral">
                            {a.type === "IMAGE" ? t.admin.attachmentTypeImage : a.type === "VIDEO" ? t.admin.attachmentTypeVideo : t.admin.attachmentTypeLink}
                          </Badge>
                          <span className="truncate flex-1" dir="ltr">
                            {a.url}
                          </span>
                          <button type="button" onClick={() => removeAttachment(i)} className="text-error font-bold shrink-0">
                            {t.admin.removeAttachment}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(["IMAGE", "VIDEO", "LINK"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewAttachmentType(type)}
                        className={cx(
                          "h-8 px-3 rounded-[var(--radius-sm)] border text-xs font-bold",
                          newAttachmentType === type ? "border-primary text-primary bg-primary/10" : "border-border text-muted"
                        )}
                      >
                        {type === "IMAGE" ? t.admin.attachmentTypeImage : type === "VIDEO" ? t.admin.attachmentTypeVideo : t.admin.attachmentTypeLink}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    <Input dir="ltr" value={newAttachmentUrl} onChange={(e) => setNewAttachmentUrl(e.target.value)} placeholder={t.admin.attachmentUrlPlaceholder} />
                    <Button type="button" size="sm" variant="secondary" onClick={addAttachment}>
                      {t.admin.addAttachment}
                    </Button>
                  </div>
                  <Input
                    className="mt-1.5"
                    value={newAttachmentCaption}
                    onChange={(e) => setNewAttachmentCaption(e.target.value)}
                    placeholder={t.admin.attachmentCaptionPlaceholder}
                  />
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
