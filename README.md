# صدى · Sada

منصة استبيانات بالعربية والإنجليزية: أنشئ استبيانًا، شاركه برابط أو رمز QR، وتابع النتائج برسوم واضحة، مع مساعد ذكي (Gemini) يقترح الأسئلة ويلخّص النتائج.

| الجزء | التقنية | الاستضافة المجانية |
|---|---|---|
| Backend | Java 21 · Spring Boot 4.1 · Spring Security (JWT) · JPA · Flyway | Render (Docker) |
| Frontend | React 19 · Vite · TypeScript · Tailwind CSS 4 · TanStack Query | Vercel |
| Database | PostgreSQL | Neon |
| AI (اختياري) | Gemini API | Google AI Studio |

## المزايا

- تسجيل بالبريد وكلمة المرور، ودخول عبر Google (اختياري).
- 9 أنواع أسئلة: اختيار واحد، اختيارات متعددة، قائمة منسدلة، إجابة قصيرة، فقرة، تقييم بالنجوم، مقياس خطي (مع NPS)، رقم، تاريخ.
- محرر بمعاينة حيّة، ترتيب الأسئلة، تكرارها، وحفظ بـ Ctrl+S وتنبيه عند وجود تغييرات غير محفوظة.
- نشر، إيقاف، إعادة فتح، إغلاق تلقائي بتاريخ، ورد واحد لكل جهاز.
- صفحة المشاركين بلغة الاستبيان واتجاهه (RTL/LTR) ولونه، مع تحقق من الإجابات.
- مشاركة برابط أو QR أو واتساب.
- نتائج: ردود يومية، نسب الخيارات، توزيع التقييم، المتوسط، NPS، الإجابات النصية، والردود الفردية مع الحذف.
- تصدير CSV يفتح العربية بشكل صحيح في Excel.
- AI: إنشاء استبيان من وصف، وملخص ذكي للنتائج (حد يومي لكل مستخدم).
- حماية: JWT، تشفير BCrypt، تحديد معدل الطلبات، منع حقن صيغ Excel، وكل استبيان يراه مالكه فقط.

---

## النشر المجاني خطوة بخطوة (يمكن من الجوال)

> افتح المواقع من متصفح الجوال. إذا اختفى زر، فعّل «عرض نسخة سطح المكتب» من إعدادات المتصفح.

### 1) قاعدة البيانات: Neon

1. ادخل [neon.tech](https://neon.tech) وأنشئ مشروعًا جديدًا. اختر منطقة **AWS Europe Central (Frankfurt)** لأنها الأقرب لخادم Render.
2. اضغط **Connect**، وانسخ رابط الاتصال الذي يبدأ بـ `postgresql://…`.

### 2) الـ Backend: Render

1. ادخل [render.com](https://render.com) ← **New** ← **Blueprint**.
2. اختر الـ repo **Sada**. سيقرأ Render ملف `render.yaml` تلقائيًا.
3. سيطلب قيم المتغيرات:
   - `DATABASE_URL`: الصق رابط Neon كما هو. **(إجباري)**
   - `GEMINI_API_KEY`: اتركه فارغًا الآن أو ضع مفتاحك (انظر الخطوة 5).
   - `GOOGLE_CLIENT_ID`: اتركه فارغًا الآن (انظر الخطوة 6).
4. اضغط **Apply**. أول بناء يأخذ تقريبًا 5–8 دقائق.
5. انسخ رابط الخدمة، مثل `https://sada-api.onrender.com`، وافتح `…/actuator/health`. يجب أن ترى `{"status":"UP"}`.

### 3) الـ Frontend: Vercel

1. ادخل [vercel.com](https://vercel.com) ← **Add New** ← **Project** ← اختر **Sada**.
2. في **Root Directory** اختر `frontend`. سيتعرف على Vite تلقائيًا.
3. في **Environment Variables** أضف:
   - `VITE_API_URL` = رابط Render من الخطوة السابقة (بدون `/` في النهاية).
4. اضغط **Deploy**. موقعك جاهز على رابط مثل `https://sada-xxxx.vercel.app` 🎉

> الـ API يقبل أي نطاق `*.vercel.app` افتراضيًا. إذا ربطت نطاقًا خاصًا، أضفه في متغير `CORS_ORIGINS` في Render (مفصولًا بفاصلة).

### 4) جرّب

سجّل حسابًا، أنشئ استبيانًا، انشره، وافتح الرابط من جهاز آخر.

### 5) (اختياري) تفعيل الذكاء الاصطناعي

1. من [aistudio.google.com](https://aistudio.google.com) أنشئ **API key**.
2. في Render ← خدمة `sada-api` ← **Environment** ← ضع المفتاح في `GEMINI_API_KEY` واحفظ. ستعيد الخدمة التشغيل تلقائيًا.
3. يستخدم التطبيق `gemini-flash-latest` افتراضيًا. لتغيير النموذج أضف `GEMINI_MODEL`.

### 6) (اختياري) الدخول عبر Google

1. من [Google Cloud Console](https://console.cloud.google.com/apis/credentials) أنشئ **OAuth client ID** من نوع **Web application**.
2. في **Authorized JavaScript origins** أضف رابط Vercel (مثل `https://sada-xxxx.vercel.app`).
3. انسخ الـ Client ID وضعه في `GOOGLE_CLIENT_ID` في Render.

### ملاحظات عن الخطط المجانية

- **Render** يوقف الخدمة بعد 15 دقيقة بدون طلبات، وأول طلب بعدها يأخذ 30–60 ثانية. الواجهة تعرض رسالة «الخادم يستيقظ» خلال الانتظار.
- **Neon** يعلّق قاعدة البيانات عند الخمول ويوقظها خلال ثوانٍ.
- المفاتيح والأسرار تبقى في لوحة Render فقط، ولا تُرفع على GitHub.

---

## التشغيل محليًا

المتطلبات: Java 21، Maven، Node 22، Docker (لقاعدة البيانات).

```bash
# قاعدة البيانات
docker compose up -d

# الـ backend على http://localhost:8080
cd backend
mvn spring-boot:run

# الـ frontend على http://localhost:5173
cd frontend
cp .env.example .env
npm install
npm run dev
```

الاختبارات: `cd backend && mvn verify` (تحتاج PostgreSQL من `docker compose`). كل push يشغّل الاختبارات وبناء الواجهة وصورة Docker عبر GitHub Actions.

## متغيرات البيئة (Backend)

| المتغير | الوصف | الافتراضي |
|---|---|---|
| `DATABASE_URL` | رابط PostgreSQL بصيغة `postgresql://` أو `jdbc:postgresql://` | قاعدة محلية |
| `JWT_SECRET` | مفتاح توقيع جلسات الدخول (Render يولّده) | قيمة تطوير فقط |
| `CORS_ORIGINS` | النطاقات المسموح لها، مفصولة بفاصلة | `https://*.vercel.app,http://localhost:5173` |
| `GEMINI_API_KEY` | يفعّل ميزات الذكاء الاصطناعي | فارغ (معطّل) |
| `GEMINI_MODEL` | نموذج Gemini | `gemini-flash-latest` |
| `AI_DAILY_LIMIT` | عدد طلبات AI لكل مستخدم يوميًا | `30` |
| `GOOGLE_CLIENT_ID` | يفعّل الدخول عبر Google | فارغ (معطّل) |
| `JWT_TTL` | مدة صلاحية الجلسة | `7d` |

## هيكل المشروع

```
backend/                Spring Boot API
  src/main/java/app/sada/
    auth/               تسجيل، دخول، Google
    survey/             الاستبيانات والأسئلة
    response/           استقبال الردود، النتائج، CSV
    ai/                 Gemini: توليد الأسئلة وملخص النتائج
    security/ config/ common/
  src/main/resources/db/migration/   Flyway
frontend/               React + Vite
  src/pages/            Landing, Auth, Dashboard, Editor, Results, PublicSurvey
  src/components/       الواجهة المشتركة (Form, Charts, Share, …)
  src/lib/              API client, i18n (ar/en), auth
render.yaml             إعداد Render
.github/workflows/      CI
```

## واجهة الـ API

| Method | Path | الوصف |
|---|---|---|
| POST | `/api/auth/register` · `/login` · `/google` | إنشاء حساب / دخول |
| GET | `/api/auth/me` | المستخدم الحالي |
| GET/POST | `/api/surveys` | قائمة / إنشاء |
| GET/PUT/DELETE | `/api/surveys/{id}` | قراءة / تعديل / حذف |
| POST | `/api/surveys/{id}/status` · `/duplicate` | نشر/إيقاف · نسخ |
| GET | `/api/surveys/{id}/results` · `/responses` · `/export` | النتائج · الردود · CSV |
| POST | `/api/surveys/{id}/insights` | ملخص ذكي |
| POST | `/api/ai/generate-survey` | إنشاء استبيان بالذكاء الاصطناعي |
| GET/POST | `/api/public/surveys/{slug}` · `/responses` | صفحة المشاركين وإرسال الرد |
