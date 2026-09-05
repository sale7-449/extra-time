/** عنصر مُتابَع محفوظ محلياً — id هو المعرّف الحقيقي من مزوّد البيانات (مثال:
 * "af-40" لفريق، "af-307" لبطولة)، لا اسم مُخترَع ولا رقم تسلسلي محلي. */
export interface FollowedTeam {
  id: string;
  name: string;
  logoUrl: string | null;
}

export interface FollowedCompetition {
  id: string;
  name: string;
  logoUrl: string | null;
}
