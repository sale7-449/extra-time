"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, type FavoriteKind } from "@/lib/services/favorites.service";

const TABLE: Record<FavoriteKind, string> = {
  team: "favorite_teams",
  competition: "favorite_competitions",
  match: "favorite_matches",
};

const ID_COLUMN: Record<FavoriteKind, string> = {
  team: "team_id",
  competition: "competition_id",
  match: "match_id",
};

const LABEL_COLUMN: Record<FavoriteKind, string> = {
  team: "team_name",
  competition: "competition_name",
  match: "match_label",
};

/** يبدّل حالة المفضلة (إضافة/حذف) — يتطلب مستخدماً مسجَّلاً وSupabase مُهيَّأً،
 * وإلا لا يفعل شيئاً بصمت (الواجهة تُخفي الزر أصلاً في هذه الحالة). */
export async function toggleFavoriteAction(kind: FavoriteKind, id: string, label: string, path: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const };

  const supabase = await createClient();
  if (!supabase) return { ok: false as const };

  const table = TABLE[kind];
  const idColumn = ID_COLUMN[kind];

  const { data: existing } = await supabase.from(table).select("id").eq("user_id", user.id).eq(idColumn, id).maybeSingle();

  if (existing) {
    await supabase.from(table).delete().eq("id", existing.id);
  } else {
    await supabase.from(table).insert({ user_id: user.id, [idColumn]: id, [LABEL_COLUMN[kind]]: label });
  }

  revalidatePath(path);
  return { ok: true as const, favorited: !existing };
}
