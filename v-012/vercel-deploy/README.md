# نسخة التطبيق للتشغيل على Vercel

هذا المجلد نسخة مستقلة من التطبيق مُعدّة للنشر على **Vercel** دون المساس بالنسخة الأصلية في المشروع.

## هيكل المجلد

```
vercel-deploy/
├── frontend/     ← الواجهة الأمامية (تُنشر على Vercel)
├── backend/      ← الخلفية (Google Apps Script — تُنشر على Google)
└── README.md     ← هذا الملف
```

- **الواجهة الأمامية (frontend):** تُنشر على Vercel وتُقدّم الموقع الثابت (HTML, CSS, JS).
- **الخلفية (backend):** كود Google Apps Script (.gs)؛ لا يعمل على Vercel ويجب نشره في مشروع Google Apps Script منفصل.

---

# خطوات التشغيل من البداية

## المتطلبات قبل البدء

1. **حساب Vercel**  
   إنشاء حساب مجاني على [vercel.com](https://vercel.com).

2. **Node.js**  
   تثبيت Node.js (إصدار 18 أو أحدث) من [nodejs.org](https://nodejs.org) — مطلوب لتشغيل أوامر Vercel CLI وبناء المشروع محلياً إن رغبت.

3. **حساب Google**  
   لحساب Google Apps Script (نشر الخلفية وربطها بالواجهة).

4. **Git (اختياري)**  
   مفيد لربط المستودع مع Vercel للنشر التلقائي.

---

## خطوات رفع المشروع على GitHub

اتبع الخطوات التالية لرفع نسخة **vercel-deploy** (أو المشروع كاملاً) إلى GitHub ثم ربطها بـ Vercel.

### 1. تثبيت Git (إن لم يكن مثبتاً)

- تحميل Git من [git-scm.com](https://git-scm.com) وتثبيته.
- التأكد من التثبيت من الطرفية:
  ```bash
  git --version
  ```

### 2. إنشاء مستودع جديد على GitHub

1. ادخل إلى [github.com](https://github.com) وسجّل الدخول.
2. انقر **+** (أعلى اليمين) ← **New repository**.
3. أدخل **اسم المستودع** (مثلاً `hse-vercel` أو `hse-app`).
4. اختر **Public**.
5. **لا** تختر "Add a README" أو ".gitignore" إن كنت سترفع مشروعاً موجوداً.
6. انقر **Create repository**.

### 3. تهيئة Git وربط المستودع (من جهازك)

افتح الطرفية (PowerShell أو Command Prompt) ونفّذ الأوامر التالية.

**إذا أردت رفع مجلد vercel-deploy فقط كمستودع مستقل:**

```bash
cd "d:\App\v.2-ok run\v-012\vercel-deploy"
git init
git add .
git commit -m "نسخة التطبيق لـ Vercel - أول رفع"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

استبدل `YOUR_USERNAME` باسم مستخدمك على GitHub و`YOUR_REPO_NAME` باسم المستودع الذي أنشأته.

**إذا أردت رفع المشروع الكامل (الجذر v-012 أو المشروع الأصلي):**

```bash
cd "d:\App\v.2-ok run"
# أو المسار الذي فيه مجلدات Frontend و Backend و vercel-deploy
git init
git add .
git commit -m "المشروع مع نسخة Vercel"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### 4. إنشاء ملف .gitignore (مستحسن)

داخل المجلد الذي تشغّل فيه `git init` أنشئ ملفاً اسمه **.gitignore** بالمحتوى التالي (لتجاهل الملفات غير المطلوبة):

```
node_modules/
.vercel/
.env
.env.local
*.log
.DS_Store
```

ثم نفّذ:

```bash
git add .
git commit -m "إضافة .gitignore"
git push
```

### 5. التعامل مع GitHub عبر HTTPS وكلمة المرور

- عند أول `git push` قد يُطلب منك **اسم المستخدم** و**كلمة المرور**.
- GitHub لا يقبل كلمة مرور الحساب العادية؛ استخدم **Personal Access Token (PAT)**:
  1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**.
  2. **Generate new token**، اختر الصلاحيات (مثلاً `repo`).
  3. انسخ الرمز واستخدمه مكان **كلمة المرور** عند تنفيذ `git push`.

### 6. التأكد من الرفع

- ادخل إلى صفحة المستودع على GitHub وتأكد من ظهور المجلدات والملفات (مثل `frontend/`, `backend/`, `README.md`).

بعد الرفع يمكنك في Vercel اختيار **Import Git Repository** وربط هذا المستودع ثم تعيين **Root Directory** إلى `vercel-deploy/frontend` (إن رفعت المشروع كاملاً) أو نشر مباشرة إن كان المستودع يحتوي على محتويات `vercel-deploy` فقط.

---

## الجزء الأول: نشر الخلفية (Google Apps Script)

الخلفية مبنية على Google Apps Script ولا تُنشر على Vercel. يجب نشرها في Google أولاً ثم استخدام رابط النشر في الواجهة.

### 1. إنشاء مشروع Google Apps Script

1. افتح [script.google.com](https://script.google.com).
2. انقر **مشروع جديد** (أو New project).
3. سمّ المشروع مثلاً: `HSE-Backend-Vercel`.

### 2. نسخ ملفات الخلفية إلى المشروع

1. في المشروع الجديد، احذف الملف الافتراضي `Code.gs` إذا أردت (أو امسح محتواه).
2. لكل ملف `.gs` داخل مجلد **backend** في هذه النسخة:
   - من القائمة: **ملف ← جديد ← ملف سكربت**.
   - سمّ الملف بنفس الاسم (مثلاً `Config.gs`, `Utils.gs`, `Code.gs`, …).
   - انسخ محتوى الملف من مجلد `vercel-deploy/backend/` والصقه في الملف المناسب في المحرر.
3. انسخ أيضاً محتوى **appsscript.json** من `backend/appsscript.json` إلى ملف `appsscript.json` في المشروع (من خلال عرضه في المحرر أو عبر إعدادات المشروع إن وُجد).

### 3. ربط جدول Google Sheets (إن وُجد)

- في `Config.gs` عدّل دالة `getSpreadsheetId()` وضَع معرف جدول Google Sheets الخاص بك.
- تأكد أن الجدول يحتوي على الأوراق/الجداول المطلوبة أو أن النظام ينشئها تلقائياً حسب منطق التطبيق.

### 4. نشر الخلفية كتطبيق ويب

1. في المحرر: **نشر ← نشر كتطبيق ويب** (Deploy → New deployment).
2. اختر **تنفيذ كـ: أنا** و**من له حق الوصول: أي شخص** (أو حسب سياسة الوصول المطلوبة).
3. انقر **نشر** وانسخ **رابط التطبيق (رابط الويب)**.  
   الشكل التقريبي:  
   `https://script.google.com/macros/s/XXXXXXXX/exec`  
   **احتفظ بهذا الرابط** — ستحتاجه في إعداد الواجهة.

---

## الجزء الثاني: نشر الواجهة الأمامية على Vercel

### الطريقة (أ): النشر عبر موقع Vercel (من المتصفح)

1. **رفع المشروع إلى Git (مستحسن)**  
   - أنشئ مستودعاً (مثلاً على GitHub).  
   - ارفع محتويات مجلد **vercel-deploy** فقط (أو ارفع المشروع كاملاً واختر المجلد لاحقاً في Vercel).  
   أو استخدم **استيراد من Git** في Vercel واختر المستودع.

2. **استيراد المشروع في Vercel**  
   - ادخل إلى [vercel.com](https://vercel.com) وادخل إلى لوحة التحكم.  
   - انقر **Add New… → Project**.  
   - اختر **Import Git Repository** واختر المستودع، أو **Upload** لرفع مجلد المشروع يدوياً.

3. **إعدادات المشروع**  
   - **Root Directory:** اختر أو اكتب: `vercel-deploy/frontend` (أو المسار الذي فيه مجلد الواجهة داخل المستودع).  
   - **Framework Preset:** اختر **Other** (مشروع ثابت بدون إطار).  
   - **Build Command:** اتركه فارغاً أو ضع `npm run build:css` إن أردت تشغيل بناء CSS فقط.  
   - **Output Directory:** اتركه فارغاً (النشر من جذر المجلد المحدد في Root).  
   - **Install Command:** `npm install` (إن وُجدت حزم في `package.json`).

4. **متغيرات البيئة (اختياري)**  
   إن كان التطبيق يقرأ رابط السكربت من متغير بيئة، أضف مثلاً:  
   - الاسم: `VITE_SCRIPT_URL` أو الاسم الذي يستخدمه التطبيق.  
   - القيمة: `https://script.google.com/macros/s/XXXXXXXX/exec` (الرابط الذي نسخته من نشر Google Apps Script).

5. انقر **Deploy** وانتظر حتى يكتمل النشر.

6. بعد النشر ستحصل على رابط مثل:  
   `https://اسم-المشروع.vercel.app`  
   افتحه وتأكد أن الواجهة تعمل.

### الطريقة (ب): النشر عبر Vercel CLI

1. **تثبيت Vercel CLI**  
   في الطرفية (من أي مجلد):

   ```bash
   npm i -g vercel
   ```

2. **الدخول إلى مجلد الواجهة**  
   من جذر المشروع:

   ```bash
   cd "d:\App\v.2-ok run\v-012\vercel-deploy\frontend"
   ```

   (أو المسار الفعلي لمجلد `vercel-deploy/frontend` عندك.)

3. **تسجيل الدخول إلى Vercel (مرة واحدة)**  
   ```bash
   vercel login
   ```  
   اتبع التعليمات في المتصفح لتسجيل الدخول.

4. **النشر لأول مرة**  
   ```bash
   vercel
   ```  
   - سيُطلب منك ربط المشروع بحسابك (اختر الحساب والفريق إن وُجد).  
   - إذا سُئلت عن الإعدادات (Root, Build, Output):  
     - Root: `.` (النقطة تعني المجلد الحالي أي frontend).  
     - Build: فارغ أو `npm run build:css`.  
     - Output: فارغ.

5. **النشر للإنتاج**  
   بعد التأكد أن كل شيء يعمل:  
   ```bash
   vercel --prod
   ```

6. الرابط النهائي سيظهر في الطرفية ويمكنك فتحه من لوحة تحكم Vercel أيضاً.

---

## ربط الواجهة بالخلفية (رابط Google Apps Script)

التطبيق يتصل بالخلفية عبر **رابط نشر تطبيق الويب** (Google Apps Script).

- إن كان الرابط يُخزَّن من واجهة الإعدادات داخل التطبيق:  
  ادخل من الواجهة المنشورة على Vercel إلى **الإعدادات** وادخل رابط الـ **exec** الذي نسخته من نشر Google Apps Script.

- إن كان التطبيق يقرأ الرابط من متغير بيئة:  
  ضع الرابط في متغير البيئة في Vercel (كما في الخطوة 4 من الطريقة أ) ثم أعد النشر.

تأكد أن الرابط ينتهي بـ `/exec` وأنه من نوع **Web App** وليس رابط المحرر.

---

## تشغيل الواجهة محلياً (للتجربة قبل النشر)

1. تثبيت الحزم (مرة واحدة):  
   ```bash
   cd "d:\App\v.2-ok run\v-012\vercel-deploy\frontend"
   npm install
   ```

2. تشغيل خادم محلي (أي خادم ثابت)، مثلاً:  
   ```bash
   npx serve .
   ```  
   أو استخدم امتداد "Live Server" في VS Code وافتح `index.html`.

3. افتح في المتصفح الرابط المعروض (مثلاً `http://localhost:3000`) وتأكد من إعداد رابط السكربت من الإعدادات أو من متغير البيئة إن وُجد.

---

## ملاحظات مهمة

- **النسخة الأصلية:** كل الملفات الأصلية للمشروع تبقى في مجلدات **Frontend** و **Backend** خارج `vercel-deploy`. هذا المجلد نسخة مستقلة ولا يعدّل الملفات الأصلية.
- **الخلفية لا تعمل على Vercel:** الخلفية مكتوبة لـ Google Apps Script فقط؛ يجب نشرها في Google كما هو موضح أعلاه.
- **CORS و Google:** تأكد أن نشر تطبيق الويب في Google Apps Script مضبوط لـ "من له حق الوصول: أي شخص" (أو النطاق المناسب) حتى تعمل الطلبات من نطاق Vercel.
- **تحديثات لاحقة:** بعد أي تعديل على الواجهة في `vercel-deploy/frontend` أعد النشر من Vercel (من Git أو من CLI بـ `vercel --prod`). بعد أي تعديل على الخلفية في `vercel-deploy/backend` انسخ التعديلات إلى مشروع Google Apps Script وأنشئ **نشراً جديداً** وحدّث الرابط في الواجهة إن تغير.

---

## استكشاف الأخطاء

| المشكلة | ما يمكن فعله |
|--------|-----------------|
| الصفحة بيضاء أو لا تُحمّل | تأكد أن **Root Directory** في Vercel يشير إلى مجلد **frontend** وأن `index.html` موجود في جذر النشر. |
| "غير مفعل" أو أخطاء اتصال بالخلفية | تحقق من إدخال رابط **exec** الصحيح في الإعدادات أو في متغير البيئة، وأن النشر في Google Apps Script نشط. |
| Service Worker لا يعمل | تأكد أن ملف `vercel.json` داخل **frontend** يحتوي على الـ headers الخاصة بـ `service-worker.js` (موجودة في هذا الإعداد). |
| 404 عند التنقل داخل التطبيق | تأكد أن **rewrites** في `vercel.json` تضم قاعدة إعادة التوجيه إلى `index.html` (موجودة في هذا الإعداد). |
| **فشل تسجيل الدخول: البريد أو كلمة المرور غير صحيحة** | 1) اضغط **إعداد المزامنة** وأدخل رابط نشر Google Apps Script (ينتهي بـ `/exec`). 2) في Google: نشر التطبيق كـ Web App واختر **من له حق الوصول: أي شخص**. 3) تأكد من وجود مستخدمين في ورقة **Users** في Google Sheets. |

بعد اتباع هذه الخطوات تكون نسخة التطبيق جاهزة للتشغيل على Vercel مع الخلفية على Google Apps Script، دون التأثير على النسخة الحالية من المشروع.
