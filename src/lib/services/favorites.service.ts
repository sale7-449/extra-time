import { createClient } from "@/lib/supabase/server";

export type FavoriteKind = "team" | "competition" | "match";

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

export interface CurrentUser {
  id: string;
  email: string | null;
  displayName: string | null;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    displayName: (data.user.user_metadata?.display_name as string | undefined) ?? null,
  };
}

export async function isFavorited(kind: FavoriteKind, id: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  const supabase = await createClient();
  if (!supabase) return false;

  const { data } = await supabase
    .from(TABLE[kind])
    .select("id")
    .eq("user_id", user.id)
    .eq(ID_COLUMN[kind], id)
    .maybeSingle();

  return Boolean(data);
}

export interface FavoriteRow {
  id: string;
  label: string;
}

export async function getUserFavorites(): Promise<{ teams: FavoriteRow[]; competitions: FavoriteRow[]; matches: FavoriteRow[] }> {
  const empty = { teams: [], competitions: [], matches: [] };
  const user = await getCurrentUser();
  if (!user) return empty;

  const supabase = await createClient();
  if (!supabase) return empty;

  const [teams, competitions, matches] = await Promise.all([
    supabase.from("favorite_teams").select("team_id, team_name").eq("user_id", user.id),
    supabase.from("favorite_competitions").select("competition_id, competition_name").eq("user_id", user.id),
    supabase.from("favorite_matches").select("match_id, match_label").eq("user_id", user.id),
  ]);

  return {
    teams: (teams.data ?? []).map((r) => ({ id: r.team_id, label: r.team_name })),
    competitions: (competitions.data ?? []).map((r) => ({ id: r.competition_id, label: r.competition_name })),
    matches: (matches.data ?? []).map((r) => ({ id: r.match_id, label: r.match_label })),
  };
}
