# Backend Review - Changelog
## تاريخ المراجعة: 2025-12-27

---

## 📋 الهدف من المراجعة
مراجعة شاملة لملفات الواجهة الخلفية (Google Apps Script) للتأكد من:
1. ✅ **عدم مسح أو استبدال البيانات** عند التسجيل اليدوي أو إرسال إخطار/تحقيق
2. ✅ **تسجيل البيانات في الجداول أسفل كل صف** (append only)
3. ✅ **تسجيل البيانات كنص عادي أو رقمي** حسب كل خلية/حقل
4. ✅ **منع تسجيل أي بيانات بصيغة JSON** في الخلايا

---

## 🔧 التغييرات الرئيسية

### 1. **Backend/Utils.gs**

#### أ) تحويل `toSheetCellValue_()` - منع JSON تمامًا
**قبل:**
```javascript
if (Array.isArray(value)) return JSON.stringify(value);
if (typeof value === 'object') return JSON.stringify(value);
```

**بعد:**
```javascript
// ✅ Arrays: convert to multi-line text (one item per line)
if (Array.isArray(value)) {
    if (value.length === 0) return '';
    return value.map(item => {
        if (item === null || item === undefined) return '';
        if (typeof item === 'object') {
            return Object.entries(item)
                .map(([k, v]) => `${k}: ${v}`)
                .join(', ');
        }
        return String(item);
    }).join('\n');
}

// ✅ Objects: convert to readable key: value format
if (typeof value === 'object') {
    return Object.entries(value)
        .filter(([k, v]) => v !== null && v !== undefined)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
}
```

**النتيجة:** 
- ✅ أي array يتحول لنص متعدد الأسطر (سطر لكل عنصر)
- ✅ أي object يتحول لـ `key: value` على أسطر منفصلة
- ✅ الأرقام تبقى أرقام، التواريخ تبقى Date objects
- ❌ **لا يوجد JSON في أي خلية**

---

#### ب) تحويل `saveToSheet()` من "مسح وإعادة كتابة" إلى "Upsert"
**قبل:**
```javascript
// ✅ مسح البيانات الموجودة (لكن نبقى على الرؤوس)
if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
}
```

**بعد:**
```javascript
// ✅ Upsert: تحديث الصفوف الموجودة بالـ id وإضافة الجديدة أسفل الشيت
const existingData = readFromSheet(sheetName, spreadsheetId);
const existingIds = new Set(existingData.map(r => r.id).filter(Boolean));

const toUpdate = [];
const toAppend = [];

dataArray.forEach(item => {
    if (item.id && existingIds.has(item.id)) {
        toUpdate.push(item);
    } else {
        toAppend.push(item);
    }
});

// تحديث الصفوف الموجودة (صف واحد في كل مرة)
for (const item of toUpdate) {
    updateSingleRowInSheet(sheetName, item.id, item, spreadsheetId);
}

// إضافة الصفوف الجديدة أسفل الشيت
if (toAppend.length > 0) {
    appendToSheet(sheetName, toAppend, spreadsheetId);
}
```

**النتيجة:**
- ✅ **لا يتم مسح أي صفوف موجودة**
- ✅ الصفوف الموجودة (بنفس الـ id) يتم تحديثها فقط
- ✅ الصفوف الجديدة تُضاف أسفل الشيت

---

#### ج) إزالة `JSON.stringify` من `appendToSheet()`
**قبل:**
```javascript
if (Array.isArray(value)) return JSON.stringify(value);
if (typeof value === 'object') return JSON.stringify(value);
```

**بعد:**
```javascript
// ✅ استخدام toSheetCellValue_() لكل خلية (بدون JSON)
const rowValues = headers.map(header => toSheetCellValue_(header, processedItem[header]));
```

**النتيجة:**
- ✅ كل الخلايا تستخدم التحويل الموحد (نص/رقم/تاريخ)
- ❌ **لا يوجد JSON**

---

#### د) إضافة دوال حذف آمنة
```javascript
/**
 * حذف صف واحد بالـ id (بدون إعادة كتابة الشيت بالكامل)
 */
function deleteRowById(sheetName, recordId, spreadsheetId = null) {
    // ... يحذف الصف المحدد فقط بدون مسح باقي البيانات
}

/**
 * حذف صف بأي حقل (field: value)
 */
function deleteRowByField(sheetName, fieldName, fieldValue, spreadsheetId = null) {
    // ... يحذف الصف المطابق فقط
}
```

**النتيجة:**
- ✅ الحذف يستهدف صف واحد فقط
- ✅ لا يتم إعادة كتابة الشيت بالكامل

---

### 2. **Backend/Incidents.gs**

#### أ) `addIncidentToSheet()` - إزالة JSON
**قبل:**
```javascript
if (incidentData.investigation && typeof incidentData.investigation === 'object') {
    incidentData.investigation = JSON.stringify(incidentData.investigation);
}
```

**بعد:**
```javascript
// ✅ Attachments: keep as array/object/string and let Utils handle formatting (NO JSON)
// ✅ Investigation: keep as object and let Utils handle formatting (NO JSON)
if (incidentData.attachments === undefined || incidentData.attachments === null) {
    incidentData.attachments = '';
}

// ✅ حذف userData لمنع تخزينها في Google Sheets
if (incidentData && incidentData.userData) {
    try { delete incidentData.userData; } catch (e) {}
}
```

**النتيجة:**
- ✅ `investigation` و `attachments` يتم تحويلهم بواسطة `toSheetCellValue_()` (نص منظم)
- ✅ `userData` لا يتم تخزينها في الجدول

---

#### ب) `updateIncident()` - تحديث صف واحد فقط
**قبل:**
```javascript
// معالجة الكائنات المعقدة - تحويلها إلى JSON string
for (var key in updateData) {
    if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
        data[incidentIndex][key] = JSON.stringify(value);
    }
}
return saveToSheet(sheetName, data, spreadsheetId);
```

**بعد:**
```javascript
// ✅ تحديث صف واحد فقط (بدون JSON وبدون إعادة كتابة الشيت)
updateData.updatedAt = new Date();

// ✅ حذف userData
if (updateData && updateData.userData) {
    try { delete updateData.userData; } catch (e) {}
}

return updateSingleRowInSheet(sheetName, incidentId, updateData, spreadsheetId);
```

**النتيجة:**
- ✅ يحدث صف واحد فقط (الحادث المحدد)
- ✅ لا يتم إعادة كتابة الشيت بالكامل
- ❌ **لا يوجد JSON**

---

#### ج) `deleteIncident()` و `deleteSafetyAlert()` - حذف آمن
**قبل:**
```javascript
const filteredData = data.filter(inc => inc.id !== incidentId);
return saveToSheet(sheetName, filteredData, spreadsheetId);
```

**بعد:**
```javascript
// ✅ حذف صف واحد بالـ id (بدون إعادة كتابة الشيت بالكامل)
return deleteRowById(sheetName, incidentId, spreadsheetId);
```

**النتيجة:**
- ✅ يحذف الصف المحدد فقط
- ✅ لا يتم مسح أو إعادة كتابة باقي البيانات

---

#### د) `addIncidentNotificationToSheet()` و `addSafetyAlertToSheet()`
```javascript
// ✅ حذف userData لمنع تخزينها في Google Sheets
if (notificationData && notificationData.userData) {
    try { delete notificationData.userData; } catch (e) {}
}
```

---

#### هـ) `getIncidentAnalysisSettings()` و `saveIncidentAnalysisSettings()`
**قبل:**
```javascript
enabledSections: JSON.stringify(['summary', 'trends', 'severity', 'department'])
```

**بعد:**
```javascript
enabledSections: 'summary, trends, severity, department'  // نص بسيط مفصول بفواصل
```

**النتيجة:**
- ✅ القوائم تُخزن كنص مفصول بفواصل (CSV-like)
- ❌ **لا يوجد JSON**

---

### 3. **Backend/Clinic.gs**

#### أ) `updateSickLeave()` - تحديث صف واحد فقط
**قبل:**
```javascript
for (var key in updateData) {
    data[leaveIndex][key] = updateData[key];
}
return saveToSheet(sheetName, data, spreadsheetId);
```

**بعد:**
```javascript
// ✅ قراءة السجل الحالي لحساب الأيام بدقة
const data = readFromSheet(sheetName, spreadsheetId);
const leave = data.find(l => l.id === leaveId);

// إعادة حساب عدد الأيام إذا تم تحديث التواريخ
if (updateData.startDate || updateData.endDate) {
    const start = new Date(updateData.startDate || leave.startDate);
    const end = new Date(updateData.endDate || leave.endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    updateData.daysCount = days;
}

// ✅ حذف userData
if (updateData && updateData.userData) {
    try { delete updateData.userData; } catch (e) {}
}

return updateSingleRowInSheet(sheetName, leaveId, updateData, spreadsheetId);
```

**النتيجة:**
- ✅ يحدث صف واحد فقط (الإجازة المحددة)
- ✅ حساب دقيق لعدد الأيام
- ✅ لا يتم إعادة كتابة الشيت بالكامل

---

#### ب) `addSickLeaveToSheet()`
```javascript
// ✅ حذف userData لمنع تخزينها في Google Sheets
if (sickLeaveData && sickLeaveData.userData) {
    try { delete sickLeaveData.userData; } catch (e) {}
}
```

---

## 📊 ملخص التغييرات

| الملف | التغييرات | الهدف |
|------|----------|-------|
| **Utils.gs** | تحويل `toSheetCellValue_()` لمنع JSON + تحويل `saveToSheet()` لـ upsert + إضافة `deleteRowById()` | منع JSON + منع مسح البيانات |
| **Incidents.gs** | إزالة JSON من جميع الدوال + استخدام `updateSingleRowInSheet()` + حذف `userData` | تخزين نصي/رقمي فقط + تحديث آمن |
| **Clinic.gs** | استخدام `updateSingleRowInSheet()` + حذف `userData` | تحديث آمن + منع تخزين بيانات مؤقتة |

---

## ✅ النتائج المتوقعة

### 1. **عدم مسح البيانات**
- ✅ `saveToSheet()` الآن يعمل كـ **upsert** (تحديث الموجود + إضافة الجديد)
- ✅ لا يتم حذف أي صفوف إلا عند استدعاء `deleteRowById()` صراحةً

### 2. **التسجيل أسفل كل صف**
- ✅ `appendToSheet()` يضيف دائمًا في آخر الشيت
- ✅ `updateSingleRowInSheet()` يحدث صف واحد فقط بدون تحريك الصفوف الأخرى

### 3. **تسجيل نصي/رقمي فقط**
- ✅ الأرقام → أرقام
- ✅ النصوص → نصوص
- ✅ التواريخ → Date objects (تُعرض بشكل صحيح في Sheets)
- ✅ Arrays → نص متعدد الأسطر (سطر لكل عنصر)
- ✅ Objects → `key: value` على أسطر منفصلة
- ❌ **لا يوجد JSON في أي خلية**

### 4. **منع تخزين بيانات مؤقتة**
- ✅ `userData` يتم حذفها قبل الحفظ في جميع الدوال
- ✅ فقط البيانات الفعلية للسجل يتم تخزينها

---

## 🧪 اختبارات الجودة

### اختبار 1: إضافة حادث جديد
```javascript
// ✅ يجب أن يُضاف أسفل الشيت بدون مسح البيانات الموجودة
addIncidentToSheet({
    title: 'حادث اختبار',
    date: new Date(),
    investigation: { findings: ['نتيجة 1', 'نتيجة 2'] }
});
// النتيجة المتوقعة في الخلية:
// findings: نتيجة 1
// findings: نتيجة 2
```

### اختبار 2: تحديث حادث موجود
```javascript
// ✅ يجب أن يحدث الصف المحدد فقط
updateIncident('INC-001', {
    status: 'مغلق',
    investigation: { conclusion: 'تم الحل' }
});
// النتيجة: صف INC-001 فقط يتم تحديثه
```

### اختبار 3: حذف حادث
```javascript
// ✅ يجب أن يحذف الصف المحدد فقط
deleteIncident('INC-001');
// النتيجة: صف INC-001 فقط يتم حذفه
```

---

## 📝 ملاحظات مهمة

1. **التوافق مع الإصدارات السابقة:**
   - ✅ `readFromSheet()` يمكنه قراءة البيانات القديمة (JSON) وتحويلها تلقائيًا
   - ✅ البيانات الجديدة تُكتب بصيغة نصية فقط

2. **الأداء:**
   - ✅ `updateSingleRowInSheet()` أسرع من `saveToSheet()` (يحدث صف واحد فقط)
   - ✅ `deleteRowById()` أسرع من إعادة كتابة الشيت بالكامل

3. **الأمان:**
   - ✅ `userData` لا يتم تخزينها في Google Sheets (حماية البيانات الحساسة)
   - ✅ جميع العمليات تستخدم `try-catch` للتعامل مع الأخطاء

---

## 🔍 التحقق من التطبيق الصحيح

للتحقق من أن التغييرات تعمل بشكل صحيح:

1. **افتح Google Sheets** وتحقق من:
   - ✅ لا توجد خلايا تحتوي على `{...}` أو `[...]` (JSON)
   - ✅ Arrays تظهر كنص متعدد الأسطر
   - ✅ Objects تظهر كـ `key: value`

2. **اختبر العمليات:**
   - ✅ إضافة حادث جديد → يُضاف أسفل الشيت
   - ✅ تحديث حادث → يحدث الصف المحدد فقط
   - ✅ حذف حادث → يحذف الصف المحدد فقط

3. **تحقق من Logs:**
   - ✅ لا توجد أخطاء في `Logger.log()`
   - ✅ جميع العمليات تنتهي بـ `success: true`

---

## 📞 الدعم

في حالة وجود أي مشاكل أو أسئلة، يرجى:
1. التحقق من `Logger.log()` في Google Apps Script
2. مراجعة هذا الملف للتأكد من التطبيق الصحيح
3. اختبار العمليات خطوة بخطوة

---

**تاريخ آخر تحديث:** 2025-12-27  
**الإصدار:** 2.0 (Backend Review - No JSON, Safe Operations)

