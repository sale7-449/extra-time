"use client";

import { useState } from "react";
import Image from "next/image";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { cx, formatKickoffTime } from "@/lib/utils";
import { localizeCompetitionShortName } from "@/lib/i18n/localized-names";
import { COMPETITION_CATALOG } from "@/lib/providers/football/competition-catalog";
import { tagId } from "@/lib/providers/football/ids";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { MatchStatusBadge } from "@/components/shared/MatchStatusBadge";
import { StoryTrigger } from "@/components/story/StoryTrigger";
import { MediaUploadField } from "@/components/admin/MediaUploadField";
import { isAllowedImageHost } from "@/lib/image-hosts";
import { resolveContentItem } from "@/lib/providers/social/content-builders";
import {
  createNewsDraftFromUrlAction,
  createManualDraftAction,
  createMatchSportDraftAction,
  updateDraftAction,
  publishDraftAction,
  archiveDraftAction,
  listMatchGroupsAction,
  searchMatchesAction,
  listTeamsByCompetitionAction,
  type TeamsByCompetitionGroup,
  getMatchDetailAction,
  getResolvedSubjectBaseAction,
  type MatchGroups,
} from "@/lib/actions/admin-content.actions";
import type { ContentDraft, ContentDestination, ContentDraftKind, SubjectType } from "@/lib/admin/content-drafts";
import type { ContentItem, Attachment } from "@/lib/providers/social/types";
import type { Match, MatchEvent, Team } from "@/lib/types";

type ManualKind = "NEWS" | "IMAGE" | "VIDEO";
type MatchSportKind = "MATCH_RESULT" | "GOAL" | "MATCH_SUMMARY";
type NewsCreateMode = "url" | "manual";

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

const pillClass = (active: boolean) =>
  cx(
    "h-9 px-4 rounded-[var(--radius-sm)] border text-sm font-bold disabled:opacity-40 transition-colors",
    active ? "border-primary text-primary bg-primary/10" : "border-border text-muted hover:border-primary/30"
  );

function MatchRow({ m, locale, onSelect }: { m: Match; locale: "ar" | "en"; onSelect: (m: Match) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(m)}
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
  );
}

const CATALOG_COMPETITIONS = COMPETITION_CATALOG.filter((e) => e.afId !== undefined).map((e) => ({
  id: tagId("af", e.afId!),
  fallback: String(e.afId),
}));

export function ContentStudioClient({ initialDrafts }: { initialDrafts: ContentDraft[] }) {
  const { t, locale } = useLocale();
  const kindLabel = useKindLabel();

  const [drafts, setDrafts] = useState(initialDrafts);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const activeDraft = drafts.find((d) => d.id === activeDraftId) ?? null;
  // مجلد رفع مؤقت وآمن لملفات تُرفَع أثناء الإنشاء (قبل وجود id مسودة حقيقي
  // بعد) — نفس شكل مسار content-media/<draft-id>/<اسم> تماماً، فقط بمفتاح
  // مؤقت بدل id نهائي غير موجود بعد.
  const [uploadFolder] = useState(() => crypto.randomUUID());

  // اختيار الموضوع
  const [subject, setSubject] = useState<SubjectType | null>(null);
  const [createDestinations, setCreateDestinations] = useState<ContentDestination[]>(["SITE"]);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // أخبار: استيراد من رابط أو يدوي (NEWS فقط)
  const [newsMode, setNewsMode] = useState<NewsCreateMode>("url");
  const [importUrl, setImportUrl] = useState("");

  // نموذج يدوي مشترك (عام / أندية / بطولات / مباريات→NEWS-IMAGE-VIDEO)
  const [manualKind, setManualKind] = useState<ManualKind>("NEWS");
  const [manualTitle, setManualTitle] = useState("");
  const [manualSummary, setManualSummary] = useState("");
  const [manualImage, setManualImage] = useState("");
  const [manualVideoUrl, setManualVideoUrl] = useState("");

  // مباريات
  const [matchGroups, setMatchGroups] = useState<MatchGroups | null>(null);
  const [matchGroupsLoading, setMatchGroupsLoading] = useState(false);
  const [matchQuery, setMatchQuery] = useState("");
  const [matchSearching, setMatchSearching] = useState(false);
  const [matchSearchResults, setMatchSearchResults] = useState<Match[] | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchDetailLoading, setMatchDetailLoading] = useState(false);
  const [matchKind, setMatchKind] = useState<ContentDraftKind>("MATCH_SUMMARY");
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [summaryTitle, setSummaryTitle] = useState("");
  const [summaryText, setSummaryText] = useState("");
  const [summaryImage, setSummaryImage] = useState("");

  // أندية — مُصنَّفة حسب الدوري أولاً
  const [teamGroups, setTeamGroups] = useState<{ groups: TeamsByCompetitionGroup[]; other: Team[] } | null>(null);
  const [teamGroupsLoading, setTeamGroupsLoading] = useState(false);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | "OTHER" | null>(null);
  const [teamFilter, setTeamFilter] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);

  // بطولات
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);

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
  const [liveSubjectBase, setLiveSubjectBase] = useState<ContentItem | null>(null);
  const [liveSubjectLoading, setLiveSubjectLoading] = useState(false);

  function resetSubjectFlow() {
    setSubject(null);
    setNewsMode("url");
    setImportUrl("");
    setManualKind("NEWS");
    setManualTitle("");
    setManualSummary("");
    setManualImage("");
    setManualVideoUrl("");
    setMatchGroups(null);
    setMatchQuery("");
    setMatchSearchResults(null);
    setSelectedMatch(null);
    setMatchKind("MATCH_SUMMARY");
    setSelectedEventId("");
    setSummaryTitle("");
    setSummaryText("");
    setSummaryImage("");
    setSelectedLeagueId(null);
    setTeamFilter("");
    setSelectedTeam(null);
    setSelectedCompetitionId(null);
    setCreateError(null);
  }

  async function chooseSubject(s: SubjectType) {
    setSubject(s);
    setCreateError(null);
    if (s === "MATCH" && !matchGroups) {
      setMatchGroupsLoading(true);
      try {
        setMatchGroups(await listMatchGroupsAction());
      } finally {
        setMatchGroupsLoading(false);
      }
    }
    if (s === "TEAM" && !teamGroups) {
      setTeamGroupsLoading(true);
      try {
        setTeamGroups(await listTeamsByCompetitionAction());
      } finally {
        setTeamGroupsLoading(false);
      }
    }
  }

  async function selectDraft(draft: ContentDraft) {
    setActiveDraftId(draft.id);
    setEditError(null);
    setLiveSubjectBase(null);

    let base = draft.baseContent;
    if (draft.kind === "MATCH_RESULT" || draft.kind === "GOAL" || draft.kind === "MATCH_SUMMARY") {
      setLiveSubjectLoading(true);
      try {
        const live = await getResolvedSubjectBaseAction(draft.id);
        if (live) {
          base = live;
          setLiveSubjectBase(live);
        }
      } finally {
        setLiveSubjectLoading(false);
      }
    }

    const item = resolveContentItem(base, draft.overrides);
    setEditTitle(item.title);
    setEditSummary(item.summary ?? "");
    setEditImage(item.imageUrl ?? "");
    setEditDestinations(draft.destinations);
    setEditAttachments(draft.attachments);
  }

  function upsertDraft(draft: ContentDraft) {
    setDrafts((prev) => {
      const exists = prev.some((d) => d.id === draft.id);
      return exists ? prev.map((d) => (d.id === draft.id ? draft : d)) : [draft, ...prev];
    });
  }

  function errorMessage(code: string): string {
    switch (code) {
      case "not_found":
        return t.admin.importNotFound;
      case "empty":
      case "image_required":
      case "video_required":
        return t.admin.emptyTitleError;
      case "no_destination":
        return t.admin.noDestinationError;
      default:
        return t.admin.genericError;
    }
  }

  function applyCreateResult(result: { draft: ContentDraft } | { error: string }) {
    if ("error" in result) {
      setCreateError(errorMessage(result.error));
      return;
    }
    upsertDraft(result.draft);
    selectDraft(result.draft);
    resetSubjectFlow();
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

  async function submitManual(subjectType: SubjectType, subjectId: string | null) {
    setCreateError(null);
    if (createDestinations.length === 0) return setCreateError(t.admin.noDestinationError);
    setCreateLoading(true);
    try {
      applyCreateResult(
        await createManualDraftAction({
          kind: manualKind,
          subjectType,
          subjectId,
          title: manualTitle,
          summary: manualSummary,
          imageUrl: manualImage,
          videoUrl: manualVideoUrl,
          destinations: createDestinations,
        })
      );
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleMatchSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!matchQuery.trim()) return setMatchSearchResults(null);
    setMatchSearching(true);
    try {
      setMatchSearchResults(await searchMatchesAction(matchQuery));
    } finally {
      setMatchSearching(false);
    }
  }

  async function handleSelectMatch(m: Match) {
    setMatchDetailLoading(true);
    setSelectedEventId("");
    setMatchKind("MATCH_SUMMARY");
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
  const matchResultAvailable = Boolean(
    selectedMatch && selectedMatch.status === "FINISHED" && selectedMatch.homeScore !== null && selectedMatch.awayScore !== null
  );

  async function handleCreateMatchSport() {
    if (!selectedMatch) return;
    const kind = matchKind as MatchSportKind;
    setCreateError(null);
    if (createDestinations.length === 0) return setCreateError(t.admin.noDestinationError);
    setCreateLoading(true);
    try {
      applyCreateResult(
        await createMatchSportDraftAction({
          kind,
          matchId: selectedMatch.id,
          eventId: kind === "GOAL" ? selectedEventId : undefined,
          title: kind === "MATCH_SUMMARY" ? summaryTitle : undefined,
          summary: kind === "MATCH_SUMMARY" ? summaryText : undefined,
          imageUrl: kind === "MATCH_SUMMARY" ? summaryImage : undefined,
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
    ? resolveContentItem(liveSubjectBase ?? activeDraft.baseContent, {
        ...activeDraft.overrides,
        title: editTitle,
        summary: editSummary || undefined,
        imageUrl: editImage || null,
        attachments: editAttachments,
      })
    : null;
  const previewImageAllowed = isAllowedImageHost(previewItem?.imageUrl);

  /** نموذج المحتوى الحر المشترك — عنوان/ملخص/صورة(+فيديو) مع اختيار النوع
   * ضمن الأنواع المسموحة لهذا الموضوع، ثم الوجهة والإنشاء. تُستدعى من كل
   * موضوع غير "المباريات المرتبطة بأحداث رياضية" (عام/أندية/بطولات/مباريات
   * كخبر أو صورة أو فيديو عن المباراة). */
  function renderManualForm(kindOptions: ManualKind[], onSubmit: () => void) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="space-y-4 max-w-lg"
      >
        {kindOptions.length > 1 && (
          <div>
            <p className="text-sm font-bold mb-1.5">{t.admin.kindLabel}</p>
            <div className="flex gap-2">
              {kindOptions.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setManualKind(k)}
                  className={pillClass(manualKind === k)}
                >
                  {k === "NEWS" ? t.admin.kindNews : k === "IMAGE" ? t.admin.kindImage : t.admin.kindVideo}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className="block text-sm font-bold mb-1.5">{t.admin.manualTitleLabel}</label>
          <Input value={manualTitle} onChange={(e) => setManualTitle(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-bold mb-1.5">{t.admin.manualSummaryLabel}</label>
          <textarea value={manualSummary} onChange={(e) => setManualSummary(e.target.value)} rows={3} className={textareaClass} />
        </div>
        {manualKind === "VIDEO" && (
          <MediaUploadField kind="VIDEO" value={manualVideoUrl} onChange={setManualVideoUrl} folder={uploadFolder} label={t.admin.manualVideoLabel} />
        )}
        <MediaUploadField
          kind="IMAGE"
          value={manualImage}
          onChange={setManualImage}
          folder={uploadFolder}
          label={manualKind === "IMAGE" ? t.admin.manualImageLabel : t.admin.manualImageLabelOptional}
        />
        <div>
          <p className="text-sm font-bold mb-1.5">{t.admin.destinationLabel}</p>
          <DestinationPicker value={createDestinations} onChange={setCreateDestinations} />
        </div>
        {createError && <p className="text-sm text-error font-bold">{createError}</p>}
        <Button type="submit" disabled={createLoading}>
          {createLoading ? t.admin.creating : t.admin.createSubmit}
        </Button>
      </form>
    );
  }

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
          <h2 className="text-lg font-extrabold mb-4">{t.admin.newDraftTitle}</h2>

          {subject === null ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-w-lg">
              {([
                ["MATCH", t.admin.subjectMatches],
                ["TEAM", t.admin.subjectTeams],
                ["COMPETITION", t.admin.subjectCompetitions],
                ["NEWS", t.admin.subjectNews],
                ["GENERAL", t.admin.subjectGeneral],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => chooseSubject(key)}
                  className="h-16 rounded-[var(--radius-md)] border border-border bg-surface font-extrabold text-sm hover:border-primary/40 hover:bg-surface-2 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <div className="max-w-lg space-y-5">
              <button type="button" onClick={resetSubjectFlow} className="text-xs font-bold text-primary">
                ← {t.admin.changeSubject}
              </button>

              {/* ===== مباريات ===== */}
              {subject === "MATCH" &&
                (!selectedMatch ? (
                  <div className="space-y-5">
                    <form onSubmit={handleMatchSearch} className="flex gap-2">
                      <Input value={matchQuery} onChange={(e) => setMatchQuery(e.target.value)} placeholder={t.admin.matchSearchPlaceholder} />
                      <Button type="submit" disabled={matchSearching} variant="secondary">
                        {matchSearching ? t.admin.matchSearching : t.admin.matchSearchButton}
                      </Button>
                    </form>

                    {matchSearchResults !== null ? (
                      matchSearchResults.length === 0 ? (
                        <p className="text-sm text-muted-dim">{t.admin.matchNoResults}</p>
                      ) : (
                        <ul className="space-y-2">
                          {matchSearchResults.map((m) => (
                            <li key={m.id}>
                              <MatchRow m={m} locale={locale} onSelect={handleSelectMatch} />
                            </li>
                          ))}
                        </ul>
                      )
                    ) : matchGroupsLoading ? (
                      <p className="text-sm text-muted-dim">{t.admin.matchSearching}</p>
                    ) : (
                      matchGroups && (
                        <div className="space-y-5">
                          {(
                            [
                              ["today", t.admin.todayMatchesLabel, matchGroups.today],
                              ["upcoming", t.admin.upcomingMatchesLabel, matchGroups.upcoming],
                              ["recent", t.admin.recentMatchesLabel, matchGroups.recent],
                            ] as const
                          ).map(([key, label, list]) => (
                            <div key={key}>
                              <p className="text-xs font-extrabold text-muted mb-2">{label}</p>
                              {list.length === 0 ? (
                                <p className="text-xs text-muted-dim">{t.admin.noMatchesInGroup}</p>
                              ) : (
                                <ul className="space-y-2">
                                  {list.map((m) => (
                                    <li key={m.id}>
                                      <MatchRow m={m} locale={locale} onSelect={handleSelectMatch} />
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      )
                    )}
                  </div>
                ) : matchDetailLoading ? (
                  <p className="text-sm text-muted-dim">{t.admin.matchSearching}</p>
                ) : (
                  <div className="space-y-5">
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
                        {(
                          [
                            ["MATCH_RESULT", t.admin.matchKindResult, !matchResultAvailable],
                            ["GOAL", t.admin.matchKindGoal, eligibleGoalEvents.length === 0],
                            ["MATCH_SUMMARY", t.admin.matchKindSummary, false],
                            ["NEWS", t.admin.kindNews, false],
                            ["IMAGE", t.admin.kindImage, false],
                            ["VIDEO", t.admin.kindVideo, false],
                          ] as const
                        ).map(([key, label, disabled]) => (
                          <button
                            key={key}
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                              setMatchKind(key);
                              if (key === "NEWS" || key === "IMAGE" || key === "VIDEO") setManualKind(key);
                            }}
                            className={pillClass(matchKind === key)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {matchKind === "MATCH_RESULT" && !matchResultAvailable && <p className="text-xs text-warning mt-1.5">{t.admin.matchResultUnavailable}</p>}
                      {matchKind === "GOAL" && eligibleGoalEvents.length === 0 && <p className="text-xs text-warning mt-1.5">{t.admin.matchGoalUnavailable}</p>}
                    </div>

                    {matchKind === "GOAL" && eligibleGoalEvents.length > 0 && (
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

                    {matchKind === "MATCH_SUMMARY" && (
                      <>
                        <div>
                          <label className="block text-sm font-bold mb-1.5">{t.admin.matchSummaryTitleLabel}</label>
                          <Input value={summaryTitle} onChange={(e) => setSummaryTitle(e.target.value)} />
                        </div>
                        <div>
                          <label className="block text-sm font-bold mb-1.5">{t.admin.matchSummaryTextLabel}</label>
                          <textarea value={summaryText} onChange={(e) => setSummaryText(e.target.value)} rows={4} className={textareaClass} />
                        </div>
                        <MediaUploadField
                          kind="IMAGE"
                          value={summaryImage}
                          onChange={setSummaryImage}
                          folder={uploadFolder}
                          label={t.admin.manualImageLabelOptional}
                        />
                        <div>
                          <p className="text-sm font-bold mb-1.5">{t.admin.destinationLabel}</p>
                          <DestinationPicker value={createDestinations} onChange={setCreateDestinations} />
                        </div>
                        {createError && <p className="text-sm text-error font-bold">{createError}</p>}
                        <Button type="button" onClick={() => handleCreateMatchSport()} disabled={createLoading}>
                          {createLoading ? t.admin.creating : t.admin.createSubmit}
                        </Button>
                      </>
                    )}

                    {(matchKind === "MATCH_RESULT" || matchKind === "GOAL") && (
                      <>
                        <div>
                          <p className="text-sm font-bold mb-1.5">{t.admin.destinationLabel}</p>
                          <DestinationPicker value={createDestinations} onChange={setCreateDestinations} />
                        </div>
                        {createError && <p className="text-sm text-error font-bold">{createError}</p>}
                        <Button
                          type="button"
                          onClick={() => handleCreateMatchSport()}
                          disabled={createLoading || (matchKind === "GOAL" && !selectedEventId)}
                        >
                          {createLoading ? t.admin.creating : t.admin.createSubmit}
                        </Button>
                      </>
                    )}

                    {(matchKind === "NEWS" || matchKind === "IMAGE" || matchKind === "VIDEO") &&
                      renderManualForm(["NEWS", "IMAGE", "VIDEO"], () => submitManual("MATCH", selectedMatch.id))}
                  </div>
                ))}

              {/* ===== أندية ===== */}
              {subject === "TEAM" &&
                (teamGroupsLoading ? (
                  <p className="text-sm text-muted-dim">{t.admin.matchSearching}</p>
                ) : !teamGroups ? null : selectedTeam ? (
                  <div className="space-y-4">
                    <div className="rounded-[var(--radius-sm)] border border-border p-3 flex items-center justify-between">
                      <span className="text-sm font-bold">{selectedTeam.name}</span>
                      <button type="button" onClick={() => setSelectedTeam(null)} className="text-xs font-bold text-primary">
                        {t.admin.changeTeam}
                      </button>
                    </div>
                    {renderManualForm(["NEWS", "IMAGE", "VIDEO"], () => submitManual("TEAM", selectedTeam.id))}
                  </div>
                ) : selectedLeagueId ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">
                        {selectedLeagueId === "OTHER" ? t.admin.otherClubsLabel : localizeCompetitionShortName(selectedLeagueId, locale) ?? selectedLeagueId}
                      </span>
                      <button type="button" onClick={() => { setSelectedLeagueId(null); setTeamFilter(""); }} className="text-xs font-bold text-primary">
                        {t.admin.changeLeague}
                      </button>
                    </div>
                    {selectedLeagueId !== "OTHER" && teamGroups.groups.find((g) => g.competitionId === selectedLeagueId)?.isPartial && (
                      <p className="text-xs text-warning">{t.admin.partialTeamListNote}</p>
                    )}
                    <Input value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} placeholder={t.admin.teamSearchPlaceholder} />
                    {(() => {
                      const teams =
                        selectedLeagueId === "OTHER" ? teamGroups.other : teamGroups.groups.find((g) => g.competitionId === selectedLeagueId)?.teams ?? [];
                      const filtered = teamFilter.trim()
                        ? teams.filter((team) => team.name.toLowerCase().includes(teamFilter.trim().toLowerCase()))
                        : teams;
                      return filtered.length === 0 ? (
                        <p className="text-sm text-muted-dim">{t.admin.noTeamsInLeague}</p>
                      ) : (
                        <ul className="space-y-2">
                          {filtered.map((team) => (
                            <li key={team.id}>
                              <button
                                type="button"
                                onClick={() => setSelectedTeam(team)}
                                className="w-full text-start rounded-[var(--radius-sm)] border border-border p-3 hover:border-primary/30 transition-colors text-sm font-bold"
                              >
                                {team.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-dim mb-1">{t.admin.leagueSelectHint}</p>
                    <ul className="space-y-2">
                      {teamGroups.groups.map((g) => (
                        <li key={g.competitionId}>
                          <button
                            type="button"
                            onClick={() => setSelectedLeagueId(g.competitionId)}
                            className="w-full flex items-center justify-between rounded-[var(--radius-sm)] border border-border p-3 hover:border-primary/30 transition-colors text-sm font-bold"
                          >
                            <span>{localizeCompetitionShortName(g.competitionId, locale) ?? g.competitionId}</span>
                            <Badge tone="neutral">{g.teams.length}</Badge>
                          </button>
                        </li>
                      ))}
                      {teamGroups.other.length > 0 && (
                        <li>
                          <button
                            type="button"
                            onClick={() => setSelectedLeagueId("OTHER")}
                            className="w-full flex items-center justify-between rounded-[var(--radius-sm)] border border-border p-3 hover:border-primary/30 transition-colors text-sm font-bold"
                          >
                            <span>{t.admin.otherClubsLabel}</span>
                            <Badge tone="neutral">{teamGroups.other.length}</Badge>
                          </button>
                        </li>
                      )}
                    </ul>
                  </div>
                ))}

              {/* ===== بطولات ===== */}
              {subject === "COMPETITION" &&
                (!selectedCompetitionId ? (
                  <div>
                    <p className="text-sm text-muted-dim mb-3">{t.admin.competitionSelectHint}</p>
                    <ul className="space-y-2">
                      {CATALOG_COMPETITIONS.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedCompetitionId(c.id)}
                            className="w-full text-start rounded-[var(--radius-sm)] border border-border p-3 hover:border-primary/30 transition-colors text-sm font-bold"
                          >
                            {localizeCompetitionShortName(c.id, locale) ?? c.fallback}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-[var(--radius-sm)] border border-border p-3 flex items-center justify-between">
                      <span className="text-sm font-bold">{localizeCompetitionShortName(selectedCompetitionId, locale) ?? selectedCompetitionId}</span>
                      <button type="button" onClick={() => setSelectedCompetitionId(null)} className="text-xs font-bold text-primary">
                        {t.admin.changeCompetition}
                      </button>
                    </div>
                    {renderManualForm(["NEWS", "IMAGE", "VIDEO"], () => submitManual("COMPETITION", selectedCompetitionId))}
                  </div>
                ))}

              {/* ===== أخبار ===== */}
              {subject === "NEWS" && (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    {(
                      [
                        ["url", t.admin.importFromUrlTab],
                        ["manual", t.admin.manualTab],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setNewsMode(key);
                          if (key === "manual") setManualKind("NEWS");
                        }}
                        className={pillClass(newsMode === key)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {newsMode === "url" ? (
                    <form onSubmit={handleImportSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold mb-1.5">{t.admin.newsUrlLabel}</label>
                        <Input type="url" dir="ltr" value={importUrl} onChange={(e) => setImportUrl(e.target.value)} placeholder="https://..." />
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
                  ) : (
                    renderManualForm(["NEWS"], () => submitManual("NEWS", null))
                  )}
                </div>
              )}

              {/* ===== عام ===== */}
              {subject === "GENERAL" && renderManualForm(["NEWS", "IMAGE", "VIDEO"], () => submitManual("GENERAL", null))}
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
              {liveSubjectLoading && <span className="text-xs text-muted-dim">…</span>}
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
                  <MediaUploadField kind="IMAGE" value={editImage} onChange={setEditImage} folder={activeDraft.id} label={t.admin.manualImageLabelOptional} />
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
