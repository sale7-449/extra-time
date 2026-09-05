export type ShareStatus = "idle" | "loading" | "success" | "unavailable" | "error";
export type SnapchatShareKind = "RESULT" | "STATS" | "GOAL" | "MOMENT";

export interface ShareContent {
  title: string;
  text: string;
  url: string;
}

/**
 * لا يوجد Snapchat Public Profile API متاح للنشر التلقائي من الويب بدون
 * حساب Public Profile معتمد (يتطلب OAuth وأهلية خاصة). الآلية الحقيقية
 * المتاحة لموقع ويب عادي هي مشاركة المستخدم بنفسه عبر قناة النظام (Web
 * Share API) — تُظهر سناب شات ضمن قائمة المشاركة على الجوال إن كان مثبتاً،
 * تماماً كما تفعل أي تطبيق مشاركة نظام آخر. لا OAuth، لا Access Token، ولا
 * أي وهم بربط حساب.
 */
export interface SnapchatProvider {
  isAvailable(): boolean;
  share(kind: SnapchatShareKind, content: ShareContent): Promise<ShareStatus>;
}
