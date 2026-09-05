"use client";

import { useState } from "react";
import type { ContentItem } from "@/lib/providers/social/types";
import { StoryModal } from "./StoryModal";

/**
 * زر مستقل يدير حالة الـmodal بنفسه — لا يُعرض إطلاقاً إن كان item فارغاً
 * (لا بيانات حقيقية كافية أصلاً لهذا العنصر تحديداً)، فلا زر يفتح على قصة
 * "بيانات غير كافية" في الحالة الشائعة (مباراة لم تُلعَب، هدف بلا لاعب موثوق...).
 */
export function StoryTrigger({
  item,
  label,
  modalTitle,
  className,
}: {
  item: ContentItem | null;
  label: string;
  modalTitle: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  if (!item) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          "inline-flex items-center gap-2 h-10 px-4 rounded-[var(--radius-sm)] border border-border bg-surface text-sm font-bold hover:border-primary/40 hover:text-primary transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
        }
      >
        {label}
      </button>
      <StoryModal open={open} onClose={() => setOpen(false)} item={item} title={modalTitle} />
    </>
  );
}
