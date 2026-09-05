import type { Match, MediaItem } from "@/lib/types";
import { MatchCard } from "@/components/shared/MatchCard";
import { MediaCard } from "@/components/media/MediaCard";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { PlayIcon } from "@/components/icons";

/** لا يُعرض إطلاقاً إن لم توجد أي مباراة اليوم بفيديو موثوق مرتبط بها فعلياً
 * (راجع match-media-matcher) — لا فيديو عشوائي فقط لملء القسم. */
export function TodayMatchHighlights({ title, entries }: { title: string; entries: Array<{ match: Match; item: MediaItem }> }) {
  if (entries.length === 0) return null;

  return (
    <section>
      <SectionHeader title={title} icon={<PlayIcon />} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(({ match, item }) => (
          <div key={match.id} className="space-y-3">
            <MatchCard match={match} />
            <MediaCard item={item} />
          </div>
        ))}
      </div>
    </section>
  );
}
