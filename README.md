# EXTRA TIME

منصة رياضية عربية (Next.js 16 · App Router · TypeScript · Tailwind v4) — مباريات مباشرة، نتائج، بطولات، إحصائيات، وأخبار. تعمل بالكامل ببيانات تجريبية بدون أي إعداد، وتنتقل تلقائياً لبيانات حقيقية عند توفر مفاتيح API.

## Architecture

```
UI (app/, components/)
   ↓
Services (lib/services/)      ← orchestration فقط، لا تعرف مصدر البيانات
   ↓
Providers (lib/providers/)    ← FootballProvider · NewsProvider · SnapchatProvider
   ↓
Mock          |  External APIs / Supabase
(دائماً يعمل)  |  (اختياري، Fallback تلقائي لـ Mock عند الفشل)
```

- **الرياضة**: `lib/providers/football` — `MockFootballProvider` (بيانات منسّقة يدوياً) و`ApiFootballProvider` (api-football.com v3) خلف واجهة واحدة `FootballProvider`. لا مفتاح؟ يعمل الموقع بـ Mock. مفتاح موجود وفشل الطلب؟ سقوط تلقائي لـ Mock بدون كسر الصفحة.
- **الأخبار**: `lib/providers/news` — Mock فقط حالياً، خلف نفس نمط الواجهة لسهولة ربط مصدر حقيقي لاحقاً.
- **سناب شات**: `lib/providers/snapchat` — لا يوجد OAuth ولا "ربط حساب" وهمي. يستخدم Web Share API الحقيقية (تُظهر سناب شات كخيار مشاركة على الجوال إن كان مثبَّتاً)، وتظهر كـ"غير متاحة" بصدق على سطح المكتب.
- **المستخدمون/المفضلة**: Supabase (`lib/supabase/`) — قاعدة بيانات + مصادقة. تُخزَّن فقط تفضيلات المستخدم (مفضلة)، لا بيانات رياضية.

## التشغيل محلياً

```bash
npm install
npm run dev
```

يعمل الموقع مباشرة على `localhost:3000` بلا أي إعداد إضافي (بيانات تجريبية، بلا تسجيل دخول).

## Environment Variables

انسخ `.env.example` إلى `.env.local` — كل المتغيرات اختيارية:

| المتغير | الغرض | بدونه |
|---|---|---|
| `API_FOOTBALL_KEY` | بيانات مباريات حقيقية من [api-football.com](https://www.api-football.com) | Mock Data |
| `NEXT_PUBLIC_SUPABASE_URL` | رابط مشروع Supabase | تسجيل الدخول/المفضلة غير متاحة |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | المفتاح العام (anon) — **ليس** Service Role | نفس ما سبق |

## إعداد API-Football

1. سجّل حساباً مجانياً في [api-football.com](https://www.api-football.com) (100 طلب/يوم مجاناً).
2. انسخ المفتاح إلى `API_FOOTBALL_KEY`.
3. معرّفات البطولات الست المعروضة في المنصة معرّفة في `lib/providers/football/api-football-provider.ts` — تأكد منها عبر `GET /leagues?search=` بمفتاحك قبل الإنتاج.

## إعداد Supabase

1. أنشئ مشروعاً على [supabase.com](https://supabase.com).
2. انسخ **Project URL** و**anon/publishable key** إلى `.env.local` (وليس Service Role key).
3. طبّق الـ migration:
   ```bash
   npx supabase db push
   # أو الصق محتوى supabase/migrations/0001_init.sql في SQL Editor بلوحة Supabase
   ```
   ينشئ هذا: `profiles` (مع Trigger ينشئها تلقائياً عند التسجيل)، و`favorite_teams`/`favorite_competitions`/`favorite_matches` — كلها بـ Row Level Security مفعّلة (كل مستخدم يرى ويعدّل بياناته فقط).

## البناء للإنتاج

```bash
npm run build
npm run start
```

## بنية المجلدات

```
src/
├── app/            صفحات ومسارات API (App Router)
├── components/     ui/ (عناصر عامة) · shared/ · layout/ · home/ · match/
├── lib/
│   ├── providers/  Football · News · Snapchat — كل مصدر بيانات خارجي من هنا فقط
│   ├── services/   طبقة تنسيق بين Providers والواجهة
│   ├── actions/    Server Actions (مصادقة، مفضلة)
│   ├── supabase/   عملاء Supabase (متصفح/سيرفر) + فحص التهيئة
│   └── data/        Mock Data المنسّقة يدوياً
└── middleware.ts   تجديد جلسة Supabase (لا يفعل شيئاً بدون إعداد)
supabase/migrations/ SQL جاهز للتطبيق
```
