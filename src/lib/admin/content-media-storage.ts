import { randomUUID } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

/**
 * رفع ملفات Content Studio (صور/فيديوهات من الجهاز) إلى Supabase Storage —
 * سيرفر-فقط (service_role)، Bucket واحد عام: content-media، المسار
 * content-media/<folder>/<اسم-فريد>. لا علاقة بأي جدول/Auth آخر — التحقق من
 * صلاحية المسؤول يحدث في admin-content.actions.ts قبل استدعاء هذا الملف،
 * لا هنا.
 */

const BUCKET = "content-media";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB

type ServiceRoleClient = NonNullable<ReturnType<typeof createServiceRoleClient>>;

/** ينشئ الـBucket مرة واحدة فقط إن لم يكن موجوداً بعد — عام (الملفات
 * المنشورة تصل للموقع العام لاحقاً) بلا حاجة لأي إعداد يدوي في Supabase. */
async function ensureBucket(supabase: ServiceRoleClient): Promise<void> {
  const { data: existing } = await supabase.storage.getBucket(BUCKET);
  if (existing) return;

  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: MAX_VIDEO_BYTES,
    allowedMimeTypes: [...IMAGE_TYPES, ...VIDEO_TYPES],
  });
  // تجاهل "already exists" فقط (حالة تسابق نادرة بين طلبين متزامنين) — أي
  // خطأ آخر يُعاد رميه ليتعامل معه المستدعي بصدق بدل رفع صامت فاشل.
  if (error && !error.message.toLowerCase().includes("already exists")) throw error;
}

export interface ContentMediaUploadTicket {
  bucket: string;
  path: string;
  /** رمز رفع لمرة واحدة ولهذا المسار فقط — يستخدمه المتصفح للرفع المباشر إلى Storage. */
  token: string;
  /** الرابط العام النهائي الذي يُحفَظ في الحقل بعد نجاح الرفع. */
  url: string;
}

/**
 * يُصدر "تذكرة رفع" موقَّعة بعد التحقق من المجلد والنوع والحجم — الملف نفسه لا
 * يمرّ عبر الخادم أبداً. كان الرفع السابق يمرّ عبر Server Action فيفشل صامتاً
 * لأي ملف يتجاوز 1MB (حدّ Next الافتراضي لجسم الـServer Action؛ وعلى Vercel
 * 4.5MB كحدّ أقصى للطلب)، أي كل صورة من كاميرا هاتف تقريباً. الآن يرفع المتصفح
 * مباشرةً إلى Supabase Storage بالتذكرة، والحدّ فقط حدود الـBucket (8MB صورة،
 * 50MB فيديو).
 */
export async function createContentMediaUpload(input: {
  /** مجلد التخزين — id المسودة الحقيقي عند التعديل، أو مفتاح مؤقت آمن
   * (uuid) قبل إنشاء المسودة فعلياً. مُتحقَّق من شكله فقط (لا مسارات عشوائية). */
  folder: string;
  kind: "IMAGE" | "VIDEO";
  fileName: string;
  contentType: string;
  size: number;
}): Promise<ContentMediaUploadTicket | { error: string }> {
  if (!/^[a-zA-Z0-9-]{1,64}$/.test(input.folder)) return { error: "invalid_folder" };
  if (!Number.isFinite(input.size) || input.size <= 0) return { error: "empty_file" };

  const allowedTypes = input.kind === "IMAGE" ? IMAGE_TYPES : VIDEO_TYPES;
  const maxBytes = input.kind === "IMAGE" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (!allowedTypes.includes(input.contentType)) return { error: "invalid_type" };
  if (input.size > maxBytes) return { error: "too_large" };

  const supabase = createServiceRoleClient();
  if (!supabase) return { error: "storage_unavailable" };

  try {
    await ensureBucket(supabase);
  } catch (error) {
    console.error("[content-media] failed to ensure bucket:", error);
    return { error: "storage_unavailable" };
  }

  const extFromName = input.fileName.split(".").pop()?.toLowerCase();
  const ext = extFromName && /^[a-z0-9]{2,5}$/.test(extFromName) ? extFromName : input.kind === "IMAGE" ? "jpg" : "mp4";
  const path = `${input.folder}/${randomUUID()}.${ext}`;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[content-media] failed to create signed upload url:", error?.message);
    return { error: "upload_failed" };
  }

  const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { bucket: BUCKET, path, token: data.token, url: publicData.publicUrl };
}
