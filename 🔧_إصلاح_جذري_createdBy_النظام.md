# 🔧 إصلاح جذري: مشكلة createdBy يظهر "النظام"

## 📋 تاريخ الإصلاح: 2026-01-27

---

## 🔴 المشكلة:

- `createdBy` و `updatedBy` يظهران كـ **"النظام"** في قاعدة البيانات
- يظهران كـ **"غير محدد"** في الواجهة الأمامية
- لا يتم تسجيل اسم المستخدم الفعلي الذي قام بالتسجيل

---

## ✅ الإصلاحات المطبقة:

### 1️⃣ في `Frontend/js/modules/auth.js`

#### أ. عند تسجيل الدخول (السطر 685-710):

**قبل الإصلاح:**
```javascript
const userName = (user.name || user.displayName || '').trim() || email;
```

**بعد الإصلاح:**
```javascript
let userName = (user.name || user.displayName || '').trim();

// ✅ إذا كان userName فارغ أو "النظام"، نستخدم email
if (!userName || userName === 'النظام' || userName === '') {
    userName = email;
}

// ✅ إذا كان userName لا يزال فارغ، نستخدم id
if (!userName || userName === 'النظام' || userName === '') {
    userName = (fullUserData?.id || user.id || '').toString().trim();
}

// ✅ إذا كان userName لا يزال فارغ، نستخدم "مستخدم" كبديل
if (!userName || userName === 'النظام' || userName === '') {
    userName = 'مستخدم';
}
```

**ما يحدث:**
- ✅ التأكد من أن `AppState.currentUser.name` دائماً يحتوي على قيمة صحيحة
- ✅ استخدام `email` كبديل إذا كان `name` فارغ
- ✅ استخدام `id` كبديل إذا كان `email` فارغ
- ✅ استخدام "مستخدم" كبديل أخير

---

#### ب. عند استعادة الجلسة من localStorage (السطر 1459-1471):

**قبل الإصلاح:**
```javascript
const mergedName = (foundUser.name || foundUser.displayName || '').trim() || user.email;
```

**بعد الإصلاح:**
```javascript
let mergedName = (foundUser.name || foundUser.displayName || '').trim();

// ✅ إذا كان mergedName فارغ أو "النظام"، نستخدم email
if (!mergedName || mergedName === 'النظام' || mergedName === '') {
    mergedName = user.email || '';
}

// ✅ إذا كان mergedName لا يزال فارغ، نستخدم id
if (!mergedName || mergedName === 'النظام' || mergedName === '') {
    mergedName = (foundUser.id || user.id || '').toString().trim();
}

// ✅ إذا كان mergedName لا يزال فارغ، نستخدم "مستخدم"
if (!mergedName || mergedName === 'النظام' || mergedName === '') {
    mergedName = 'مستخدم';
}
```

---

#### ج. عند تحديث بيانات المستخدم (السطر 1628-1641):

**قبل الإصلاح:**
```javascript
const updatedName = (dbUser.name || dbUser.displayName || '').trim() || AppState.currentUser.name || AppState.currentUser.email;
```

**بعد الإصلاح:**
```javascript
let updatedName = (dbUser.name || dbUser.displayName || '').trim();

// ✅ إذا كان updatedName فارغ أو "النظام"، نستخدم AppState.currentUser.name
if (!updatedName || updatedName === 'النظام' || updatedName === '') {
    updatedName = (AppState.currentUser.name || '').toString().trim();
}

// ✅ إذا كان updatedName لا يزال فارغ، نستخدم email
if (!updatedName || updatedName === 'النظام' || updatedName === '') {
    updatedName = (AppState.currentUser.email || dbUser.email || '').toString().trim();
}

// ✅ إذا كان updatedName لا يزال فارغ، نستخدم id
if (!updatedName || updatedName === 'النظام' || updatedName === '') {
    updatedName = (AppState.currentUser.id || dbUser.id || '').toString().trim();
}

// ✅ إذا كان updatedName لا يزال فارغ، نستخدم "مستخدم"
if (!updatedName || updatedName === 'النظام' || updatedName === '') {
    updatedName = 'مستخدم';
}
```

---

### 2️⃣ في `Frontend/js/modules/modules/clinic.js`

#### في `saveEnhancedVisit` (السطر 12477-12506):

**قبل الإصلاح:**
```javascript
let finalCreatedBy = currentUserName; // استخدام currentUserName مباشرة (string)
```

**بعد الإصلاح:**
```javascript
let finalCreatedBy = currentUserName; // استخدام currentUserName مباشرة (string)

// ✅ إصلاح جذري: إذا كان currentUserName "النظام" أو فارغ، نستخدم email أو id
if (!finalCreatedBy || finalCreatedBy === 'النظام' || finalCreatedBy.trim() === '') {
    finalCreatedBy = (AppState.currentUser?.email || AppState.currentUser?.id || '').toString().trim();
    console.log('⚠️ [CLINIC] currentUserName كان "النظام" أو فارغ، استخدام email/id:', finalCreatedBy);
}

// ✅ التحقق النهائي: إذا كان finalCreatedBy لا يزال "النظام" أو فارغ، نوقف العملية
if (!finalCreatedBy || finalCreatedBy === 'النظام' || finalCreatedBy.trim() === '') {
    console.error('❌ [CLINIC] خطأ جذري: لا يمكن الحصول على اسم المستخدم!');
    Notification.error('خطأ: لا يمكن الحصول على اسم المستخدم. يرجى تسجيل الدخول مرة أخرى.');
    Loading.hide();
    return;
}
```

**ما يحدث:**
- ✅ التأكد من أن `finalCreatedBy` ليس "النظام" أو فارغ قبل الإرسال
- ✅ استخدام `email` أو `id` كبديل إذا كان `currentUserName` "النظام"
- ✅ إيقاف العملية إذا لم يكن هناك أي قيمة صحيحة

---

### 3️⃣ في `Backend/Clinic.gs`

#### أ. معالجة `createdBy` string (السطر 219-236):

**قبل الإصلاح:**
```javascript
if (trimmed && trimmed !== '' && trimmed !== 'النظام') {
    normalized.createdBy = trimmed;
} else {
    const emailFromData = (visitData.email || '').toString().trim();
    if (emailFromData && emailFromData !== '') {
        normalized.createdBy = emailFromData;
    } else {
        normalized.createdBy = 'النظام';
    }
}
```

**بعد الإصلاح:**
```javascript
if (trimmed && trimmed !== '' && trimmed !== 'النظام') {
    normalized.createdBy = trimmed;
} else {
    // ✅ إصلاح جذري: محاولة استخدام email من visitData كبديل
    const emailFromData = (visitData.email || '').toString().trim();
    if (emailFromData && emailFromData !== '') {
        normalized.createdBy = emailFromData;
        Logger.log('✅ استخدام email من visitData (createdBy كان "النظام" أو فارغ): ' + emailFromData);
    } else {
        // ✅ إصلاح جذري: إذا لم يكن هناك email، نحاول استخدام id من visitData
        const idFromData = (visitData.id || '').toString().trim();
        if (idFromData && idFromData !== '') {
            normalized.createdBy = idFromData;
            Logger.log('✅ استخدام id من visitData (createdBy كان "النظام" أو فارغ): ' + idFromData);
        } else {
            normalized.createdBy = 'النظام';
        }
    }
}
```

---

#### ب. معالجة `createdBy` غير موجود (السطر 238-248):

**قبل الإصلاح:**
```javascript
const emailFromData = (visitData.email || '').toString().trim();
if (emailFromData && emailFromData !== '') {
    normalized.createdBy = emailFromData;
} else {
    normalized.createdBy = 'النظام';
}
```

**بعد الإصلاح:**
```javascript
const emailFromData = (visitData.email || '').toString().trim();
if (emailFromData && emailFromData !== '') {
    normalized.createdBy = emailFromData;
} else {
    // ✅ إصلاح جذري: إذا لم يكن هناك email، نحاول استخدام id من visitData
    const idFromData = (visitData.id || '').toString().trim();
    if (idFromData && idFromData !== '') {
        normalized.createdBy = idFromData;
        Logger.log('✅ استخدام id من visitData (createdBy غير موجود): ' + idFromData);
    } else {
        normalized.createdBy = 'النظام';
    }
}
```

---

## ✅ النتيجة المتوقعة:

بعد تطبيق هذه الإصلاحات:

1. ✅ `AppState.currentUser.name` دائماً يحتوي على قيمة صحيحة (ليس "النظام")
2. ✅ `finalCreatedBy` في `saveEnhancedVisit` دائماً يحتوي على قيمة صحيحة قبل الإرسال
3. ✅ `createdBy` في Backend يتم معالجته بشكل صحيح حتى لو كان "النظام"، يحاول استخدام `email` أو `id` كبديل
4. ✅ في قاعدة البيانات، `createdBy` يجب أن يحتوي على اسم المستخدم الفعلي أو email أو id (وليس "النظام")
5. ✅ في الواجهة الأمامية، `createdBy` يجب أن يظهر بشكل صحيح (وليس "غير محدد")

---

## 📝 خطوات التحقق:

1. ✅ **تأكد من تحديث الملفات:**
   - `Frontend/js/modules/auth.js`
   - `Frontend/js/modules/modules/clinic.js`
   - `Backend/Clinic.gs`

2. ✅ **تأكد من تحديث Google Apps Script:**
   - انسخ `Backend/Clinic.gs` إلى Google Apps Script
   - أعد نشر Web App مع **New version**

3. ✅ **اختبر تسجيل زيارة جديدة:**
   - سجّل زيارة جديدة من التطبيق
   - تحقق من السجلات في Google Apps Script
   - تحقق من قاعدة البيانات (Google Sheets)
   - تحقق من الواجهة الأمامية

4. ✅ **تحقق من السجلات:**
   - يجب أن ترى في السجلات: `✅ [BACKEND] createdBy النهائي المحفوظ في قاعدة البيانات: [اسم المستخدم أو email]`
   - يجب أن **لا** ترى: `⚠️ createdBy string فارغ - استخدام النظام`

---

## ⚠️ ملاحظات مهمة:

1. **إذا كان `AppState.currentUser.name` لا يزال "النظام":**
   - تحقق من بيانات المستخدم في قاعدة البيانات (Google Sheets)
   - تأكد من أن المستخدم لديه `name` أو `displayName` في قاعدة البيانات
   - إذا لم يكن موجوداً، سيتم استخدام `email` كبديل

2. **إذا كان `createdBy` لا يزال "النظام" في قاعدة البيانات:**
   - تحقق من السجلات في Google Apps Script
   - تحقق من أن `visitData.email` يتم إرساله من Frontend
   - تحقق من أن `normalizeClinicVisitForSheet_` يحتفظ بـ `createdBy` و `email`

3. **إذا كان `createdBy` لا يزال "غير محدد" في الواجهة الأمامية:**
   - تحقق من أن `visit.createdBy` يتم تحميله بشكل صحيح من قاعدة البيانات
   - تحقق من أن `normalizeVisitMedications` في `clinic.js` يعالج `createdBy` بشكل صحيح

---

**آخر تحديث:** 2026-01-27
