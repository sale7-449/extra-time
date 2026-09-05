import type { ReactNode } from "react";
import type { MediaItem } from "@/lib/types";
import { MediaCard } from "@/components/media/MediaCard";
import { SectionHeader } from "@/components/shared/SectionHeader";

/** لا يُعرض إطلاقاً إن كانت القائمة فارغة — لا قسم بعنوان بلا محتوى. */
export function MediaSection({ title, href, icon, items }: { title: string; href?: string; icon?: ReactNode; items: MediaItem[] }) {
  if (items.length === 0) return null;

  return (
    <section>
      <SectionHeader title={title} href={href} icon={icon} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <MediaCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
