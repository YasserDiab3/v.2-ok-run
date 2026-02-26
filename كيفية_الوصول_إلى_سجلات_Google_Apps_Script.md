# كيفية الوصول إلى سجلات Google Apps Script

## 📋 الخطوات التفصيلية

### الطريقة 1: من محرر Google Apps Script (الأسهل والأسرع)

#### الخطوة 1: فتح محرر Google Apps Script
1. اذهب إلى [script.google.com](https://script.google.com)
2. أو من Google Sheets: **Extensions** → **Apps Script**

#### الخطوة 2: فتح Execution Logs
**الطريقة أ:**
- في القائمة العلوية: **View** → **Executions**
- أو اضغط على أيقونة **الساعة** ⏰ في الشريط الجانبي الأيسر

**الطريقة ب:**
- في القائمة العلوية: **View** → **Logs**
- أو استخدم اختصار لوحة المفاتيح: `Ctrl+Enter` (Windows) أو `Cmd+Enter` (Mac)

#### الخطوة 3: عرض السجلات
1. في صفحة **Executions**، ستجد قائمة بجميع التنفيذات
2. اختر التنفيذ **الأحدث** (الأول في القائمة)
3. اضغط على التنفيذ لفتح التفاصيل
4. ستظهر السجلات (Logs) في الأسفل

### الطريقة 2: من محرر الكود مباشرة

1. افتح المشروع في Apps Script
2. في القائمة العلوية: **View** → **Logs**
3. **ملاحظة مهمة**: يجب أن يكون هناك تنفيذ حديث حتى تظهر السجلات

---

## 🔍 كيفية البحث عن رسائل `[BACKEND]`

### في صفحة Executions:

1. افتح **View** → **Executions**
2. اختر التنفيذ الأخير (الأحدث)
3. افتح التفاصيل
4. ابحث عن السطور التي تحتوي على:
   - `🚀 [BACKEND]`
   - `🔍 [BACKEND]`
   - `✅ [BACKEND]`
   - `❌ [BACKEND]`

### في صفحة Logs:

1. افتح **View** → **Logs**
2. في مربع البحث (إن وجد)، اكتب: `[BACKEND]`
3. أو استخدم `Ctrl+F` للبحث

---

## 📊 مثال على الرسائل المتوقعة:

عند تسجيل زيارة جديدة، يجب أن ترى:

```
🚀 [CODE.GS] ===== addClinicVisit action تم استدعاؤها =====
🚀 [CODE.GS] الوقت: 2026-01-25T12:01:38.000Z
🚀 [CODE.GS] payload keys: id, personType, employeeCode, ...
🚀 [CODE.GS] payload.createdBy: "اسم المستخدم"
🚀 [CODE.GS] payload.email: "user@example.com"
🚀 [BACKEND] ===== addClinicVisitToSheet تم استدعاؤها =====
🚀 [BACKEND] الوقت: 2026-01-25T12:01:38.000Z
✅ [BACKEND] visitData موجود، عدد الحقول: 15
🔍 [BACKEND] visitData.createdBy المستلم من Frontend: "اسم المستخدم"
🔍 [BACKEND] visitData.createdBy type: string
🔍 [BACKEND] visitData.updatedBy المستلم من Frontend: "اسم المستخدم"
🔍 [BACKEND] visitData.email: "user@example.com"
✅ استخدام string: اسم المستخدم
✅ [BACKEND] createdBy النهائي المحفوظ في قاعدة البيانات: اسم المستخدم
✅ [BACKEND] createdBy type: string
🚀 [BACKEND] جاري حفظ البيانات في الشيت: ClinicVisits
✅ [BACKEND] تم الحفظ بنجاح. النتيجة: {"success":true,...}
🚀 [BACKEND] ===== addClinicVisitToSheet اكتملت بنجاح =====
✅ [CODE.GS] addClinicVisitToSheet اكتملت. النتيجة: {"success":true,...}
🚀 [CODE.GS] ===== addClinicVisit action اكتملت =====
```

---

## ⚠️ إذا لم تظهر السجلات:

### المشكلة 1: لا توجد سجلات على الإطلاق
**الحل:**
1. تأكد من أنك قمت بتسجيل زيارة جديدة (لتفعيل التنفيذ)
2. انتظر بضع ثوانٍ (قد يكون هناك تأخير)
3. اضغط على زر **Refresh** في صفحة Executions

### المشكلة 2: تظهر فقط "Execution started" و "Execution completed"
**الحل:**
1. تأكد من أن الكود تم تحديثه في Google Apps Script
2. **أعد نشر Web App**:
   - **Deploy** → **Manage deployments**
   - اضغط على **Edit** (أيقونة القلم)
   - اضغط **Deploy**
3. أعد المحاولة بعد إعادة النشر

### المشكلة 3: السجلات تظهر ولكن بدون `[BACKEND]`
**الحل:**
1. تأكد من أن الكود المحدث موجود في Google Apps Script
2. تحقق من أن الدالة `addClinicVisitToSheet` موجودة في ملف `Clinic.gs`
3. تحقق من أن `doPost` موجود في ملف `Code.gs`

---

## 🔧 نصائح مهمة:

### 1. تنظيف السجلات:
- **View** → **Clear logs** (لتنظيف السجلات القديمة)

### 2. تصدير السجلات:
- انسخ النص من نافذة Logs
- أو استخدم: **View** → **Executions** → **Export**

### 3. البحث في السجلات:
- استخدم `Ctrl+F` للبحث عن كلمات محددة
- ابحث عن: `[BACKEND]` أو `createdBy` أو `email`

### 4. مراقبة السجلات في الوقت الفعلي:
- افتح **View** → **Logs**
- سجّل زيارة جديدة
- اضغط **Refresh** في نافذة Logs

---

## 📝 خطوات سريعة للتحقق الآن:

1. ✅ **سجّل زيارة جديدة** في التطبيق
2. ✅ **افتح Google Apps Script** ([script.google.com](https://script.google.com))
3. ✅ **View** → **Executions**
4. ✅ **اختر التنفيذ الأخير** (الأول في القائمة)
5. ✅ **افتح التفاصيل** وابحث عن `[BACKEND]`

---

## 🎯 ما الذي يجب أن تبحث عنه:

### ✅ إذا كان كل شيء يعمل بشكل صحيح:
- ستجد رسائل `🚀 [BACKEND]` و `✅ [BACKEND]`
- ستجد `createdBy` يحتوي على اسم المستخدم أو email
- ستجد `createdBy type: string`

### ❌ إذا كان هناك مشكلة:
- ستجد `❌ [BACKEND]` مع رسالة خطأ
- أو ستجد `createdBy` = `"النظام"`
- أو ستجد `createdBy` فارغاً

---

## 📞 إذا استمرت المشكلة:

1. **انسخ جميع السجلات** من Execution Log
2. **انسخ رسائل Console** من المتصفح (F12 → Console)
3. **أرسلها** للمساعدة في التشخيص

---

**آخر تحديث:** 2026-01-25
