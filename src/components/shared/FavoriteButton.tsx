"use client";

import { useState, useTransition } from "react";
import { StarIcon } from "@/components/icons";
import { toggleFavoriteAction } from "@/lib/actions/favorites.actions";
import type { FavoriteKind } from "@/lib/services/favorites.service";
import { cx } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/LocaleProvider";

export function FavoriteButton({
  kind,
  id,
  label,
  initiallyFavorited,
  path,
}: {
  kind: FavoriteKind;
  id: string;
  label: string;
  initiallyFavorited: boolean;
  path: string;
}) {
  const [favorited, setFavorited] = useState(initiallyFavorited);
  const [pending, startTransition] = useTransition();
  const { t } = useLocale();

  function toggle() {
    setFavorited((f) => !f); // تحديث متفائل فوري
    startTransition(async () => {
      const result = await toggleFavoriteAction(kind, id, label, path);
      if (!result.ok) setFavorited((f) => !f); // تراجع إن فشلت العملية (غير مسجَّل مثلاً)
    });
  }

  const ariaLabel = favorited
    ? `${t.common.removeFavoritePrefix} ${label} ${t.common.removeFavoriteSuffix}`
    : `${t.common.addFavoritePrefix} ${label} ${t.common.addFavoriteSuffix}`;

  return (
    <button
      onClick={toggle}
      disabled={pending}
      aria-pressed={favorited}
      aria-label={ariaLabel}
      className={cx(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary [&_svg]:w-4 [&_svg]:h-4",
        favorited
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-surface text-muted hover:text-primary hover:border-primary/40"
      )}
    >
      <StarIcon fill={favorited ? "currentColor" : "none"} />
    </button>
  );
}
