# ⚠️ تحديث عاجل: Code.gs في Google Apps Script

## 🔴 المشكلة الحالية:

السجلات تظهر:
```
❌ [BACKEND] ===== خطأ جذري: addClinicVisitToSheet تم استدعاؤها بدون معاملات =====
```

**⚠️ لا توجد رسائل `[CODE.GS]` أو `[DOPOST]` في السجلات!**

هذا يعني أن **الكود القديم لا يزال يعمل** في Google Apps Script.

---

## ✅ الحل الفوري:

### الخطوة 1: فتح Google Apps Script

1. اذهب إلى: [script.google.com](https://script.google.com)
2. افتح المشروع الخاص بك

### الخطوة 2: تحديث `Code.gs`

1. **افتح ملف `Code.gs`** في Google Apps Script
2. **حدد الكود بالكامل** (Ctrl+A)
3. **احذف الكود القديم** (Delete)
4. **افتح ملف `Backend/Code.gs`** من مجلد المشروع المحلي
5. **انسخ الكود بالكامل** (Ctrl+A ثم Ctrl+C)
6. **الصق في Google Apps Script** (Ctrl+V)
7. **احفظ** (Ctrl+S)

### الخطوة 3: التحقق من الكود

تأكد من أن الكود يحتوي على:

**في بداية `doPost`:**
```javascript
function doPost(e) {
    Logger.log('🚀 [DOPOST] ===== doPost تم استدعاؤها =====');
    Logger.log('🚀 [DOPOST] الوقت: ' + new Date().toISOString());
    // ...
}
```

**في `case 'addClinicVisit'`:**
```javascript
case 'addClinicVisit':
    Logger.log('🚀 [CODE.GS] ===== addClinicVisit action تم استدعاؤها =====');
    // ...
    result = addClinicVisitToSheet(visitDataToUse);  // ✅ يجب أن يكون visitDataToUse
    // ...
    break;
```

### الخطوة 4: تحديث `Clinic.gs` أيضاً

1. **افتح ملف `Clinic.gs`** في Google Apps Script (أو أنشئه إذا لم يكن موجوداً)
2. **حدد الكود بالكامل** (Ctrl+A)
3. **احذف الكود القديم** (Delete)
4. **افتح ملف `Backend/Clinic.gs`** من مجلد المشروع المحلي
5. **انسخ الكود بالكامل** (Ctrl+A ثم Ctrl+C)
6. **الصق في Google Apps Script** (Ctrl+V)
7. **احفظ** (Ctrl+S)

### الخطوة 5: إعادة نشر Web App

1. **Deploy** → **Manage deployments**
2. اضغط على **Edit** (أيقونة القلم ✏️)
3. **⚠️ مهم جداً:** اختر **New version** (وليس استخدام نفس الإصدار)
4. اضغط **Deploy**
5. **انسخ رابط الويب الجديد** (إذا تغير)

---

## ✅ التحقق من التحديث:

بعد التحديث، عند تسجيل زيارة جديدة يجب أن ترى في Execution Logs:

```
🚀 [DOPOST] ===== doPost تم استدعاؤها =====
🚀 [DOPOST] الوقت: 2026-01-27T22:28:08.329Z
🔍 [CODE.GS] postData.action: "addClinicVisit"
🔍 [CODE.GS] postData.data exists: true
🚀 [CODE.GS] ===== addClinicVisit action تم استدعاؤها =====
🚀 [CODE.GS] الوقت: 2026-01-27T22:28:08.329Z
✅ [CODE.GS] تم العثور على بيانات الزيارة، عدد الحقول: 15
🚀 [BACKEND] ===== addClinicVisitToSheet تم استدعاؤها =====
🚀 [BACKEND] عدد المعاملات: 1  ✅ (وليس 0)
✅ [BACKEND] visitData موجود، عدد الحقول: 15
```

---

## ⚠️ إذا لم تظهر رسائل `[CODE.GS]`:

هذا يعني أن `Code.gs` **لم يتم تحديثه بعد**. يجب:

1. **التحقق مرة أخرى** من أنك نسخت الكود من `Backend/Code.gs` المحلي
2. **التحقق** من أنك حفظت الملف في Google Apps Script (Ctrl+S)
3. **إعادة نشر Web App** مع **New version**
4. **انتظار بضع ثوان** بعد النشر قبل الاختبار

---

## 📝 ملاحظات مهمة:

- ✅ تأكد من نسخ **الكود بالكامل** من `Backend/Code.gs`
- ✅ تأكد من **حفظ الملف** بعد اللصق
- ✅ تأكد من اختيار **New version** عند النشر
- ✅ انتظر بضع ثوان بعد النشر قبل الاختبار

---

**آخر تحديث:** 2026-01-27
