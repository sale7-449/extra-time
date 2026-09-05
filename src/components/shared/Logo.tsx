import { cx } from "@/lib/utils";

/**
 * الشعار (Wordmark مؤقت) — مصدر واحد يمكن استبداله لاحقاً بملف شعار حقيقي
 * دون تعديل أي مكان آخر يستخدمه. dir="ltr" مقصود: اسم العلامة لاتيني ويجب
 * أن يبقى بترتيب EXTRA ثم TIME دائماً، حتى داخل صفحة RTL (وإلا ينعكس ترتيب
 * العنصرين بسبب اتجاه flex في RTL).
 */
export function Logo({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <span
      dir="ltr"
      className={cx(
        "inline-flex items-center gap-1 font-extrabold tracking-wide",
        size === "md" ? "text-lg" : "text-base"
      )}
    >
      <span>EXTRA</span>
      <span className="text-primary">TIME</span>
    </span>
  );
}
