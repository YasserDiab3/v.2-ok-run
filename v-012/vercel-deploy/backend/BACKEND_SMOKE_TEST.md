# Backend Smoke Test - اختبار سريع للتأكد من صحة العمليات

## 🎯 الهدف
التأكد من أن جميع التغييرات في الواجهة الخلفية تعمل بشكل صحيح:
- ✅ لا يتم مسح أو استبدال البيانات
- ✅ التسجيل يتم أسفل كل صف
- ✅ البيانات تُخزن كنص/رقم (بدون JSON)

---

## 📋 خطوات الاختبار

### 1. اختبار إضافة حادث جديد (addIncidentToSheet)

#### الخطوات:
1. افتح Google Apps Script Editor
2. شغّل الدالة التالية:

```javascript
function testAddIncident() {
  const testIncident = {
    title: 'حادث اختبار - ' + new Date().toISOString(),
    description: 'وصف الحادث للاختبار',
    date: new Date(),
    location: 'موقع الاختبار',
    severity: 'متوسطة',
    status: 'مفتوح',
    investigation: {
      findings: ['نتيجة 1', 'نتيجة 2', 'نتيجة 3'],
      conclusion: 'خلاصة التحقيق'
    },
    attachments: [
      { name: 'ملف 1.pdf', url: 'https://example.com/file1.pdf' },
      { name: 'ملف 2.pdf', url: 'https://example.com/file2.pdf' }
    ],
    userData: {
      email: 'test@example.com',
      role: 'admin'
    }
  };
  
  const result = addIncidentToSheet(testIncident);
  Logger.log('نتيجة إضافة الحادث:');
  Logger.log(JSON.stringify(result, null, 2));
  
  if (result.success) {
    Logger.log('✅ تم إضافة الحادث بنجاح');
  } else {
    Logger.log('❌ فشل إضافة الحادث: ' + result.message);
  }
}
```

#### النتيجة المتوقعة:
- ✅ `result.success === true`
- ✅ يتم إضافة صف جديد أسفل الشيت
- ✅ خلية `investigation` تحتوي على نص متعدد الأسطر (ليس JSON):
  ```
  findings: نتيجة 1, نتيجة 2, نتيجة 3
  conclusion: خلاصة التحقيق
  ```
- ✅ خلية `attachments` تحتوي على نص متعدد الأسطر:
  ```
  name: ملف 1.pdf, url: https://example.com/file1.pdf
  name: ملف 2.pdf, url: https://example.com/file2.pdf
  ```
- ✅ **لا توجد خلية `userData`** (تم حذفها)

---

### 2. اختبار تحديث حادث موجود (updateIncident)

#### الخطوات:
1. احصل على ID حادث موجود من الاختبار السابق
2. شغّل الدالة التالية:

```javascript
function testUpdateIncident() {
  // استبدل 'INC-XXX' بالـ ID الفعلي من الاختبار السابق
  const incidentId = 'INC-001';
  
  const updateData = {
    status: 'قيد التحقيق',
    investigation: {
      findings: ['نتيجة محدثة 1', 'نتيجة محدثة 2'],
      conclusion: 'خلاصة محدثة',
      recommendations: ['توصية 1', 'توصية 2']
    },
    userData: {
      email: 'updater@example.com',
      role: 'safety_officer'
    }
  };
  
  const result = updateIncident(incidentId, updateData);
  Logger.log('نتيجة تحديث الحادث:');
  Logger.log(JSON.stringify(result, null, 2));
  
  if (result.success) {
    Logger.log('✅ تم تحديث الحادث بنجاح');
    
    // التحقق من البيانات المحدثة
    const incident = getIncident(incidentId);
    Logger.log('البيانات المحدثة:');
    Logger.log(JSON.stringify(incident.data, null, 2));
  } else {
    Logger.log('❌ فشل تحديث الحادث: ' + result.message);
  }
}
```

#### النتيجة المتوقعة:
- ✅ `result.success === true`
- ✅ يتم تحديث الصف المحدد **فقط** (لا يتم مسح الصفوف الأخرى)
- ✅ خلية `investigation` تحتوي على النص المحدث (ليس JSON):
  ```
  findings: نتيجة محدثة 1, نتيجة محدثة 2
  conclusion: خلاصة محدثة
  recommendations: توصية 1, توصية 2
  ```
- ✅ **لا توجد خلية `userData`** (تم حذفها)

---

### 3. اختبار حذف حادث (deleteIncident)

#### الخطوات:
1. أنشئ حادث اختبار جديد للحذف
2. شغّل الدالة التالية:

```javascript
function testDeleteIncident() {
  // أولاً: إنشاء حادث للحذف
  const testIncident = {
    title: 'حادث للحذف - ' + new Date().toISOString(),
    description: 'هذا الحادث سيتم حذفه',
    date: new Date()
  };
  
  const addResult = addIncidentToSheet(testIncident);
  Logger.log('تم إنشاء حادث للحذف: ' + addResult.message);
  
  if (!addResult.success) {
    Logger.log('❌ فشل إنشاء الحادث للحذف');
    return;
  }
  
  // الحصول على ID الحادث المضاف
  const allIncidents = getAllIncidents({});
  const addedIncident = allIncidents.data.find(inc => inc.title === testIncident.title);
  
  if (!addedIncident) {
    Logger.log('❌ لم يتم العثور على الحادث المضاف');
    return;
  }
  
  Logger.log('ID الحادث المضاف: ' + addedIncident.id);
  
  // ثانياً: حذف الحادث
  const deleteResult = deleteIncident(addedIncident.id, {
    email: 'admin@example.com',
    role: 'admin'
  });
  
  Logger.log('نتيجة حذف الحادث:');
  Logger.log(JSON.stringify(deleteResult, null, 2));
  
  if (deleteResult.success) {
    Logger.log('✅ تم حذف الحادث بنجاح');
    
    // التحقق من الحذف
    const checkIncident = getIncident(addedIncident.id);
    if (!checkIncident.success) {
      Logger.log('✅ تأكيد: الحادث غير موجود بعد الحذف');
    } else {
      Logger.log('❌ خطأ: الحادث لا يزال موجوداً بعد الحذف');
    }
  } else {
    Logger.log('❌ فشل حذف الحادث: ' + deleteResult.message);
  }
}
```

#### النتيجة المتوقعة:
- ✅ `deleteResult.success === true`
- ✅ يتم حذف الصف المحدد **فقط**
- ✅ الصفوف الأخرى لا تتأثر
- ✅ `getIncident()` يعيد `success: false` بعد الحذف

---

### 4. اختبار إضافة إجازة مرضية (addSickLeaveToSheet)

#### الخطوات:
```javascript
function testAddSickLeave() {
  const testLeave = {
    employeeCode: 'EMP-001',
    employeeName: 'موظف اختبار',
    department: 'قسم الاختبار',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 أيام
    reason: 'إصابة عمل',
    treatingDoctor: 'د. أحمد محمد',
    medicalNotes: 'ملاحظات طبية للاختبار',
    userData: {
      email: 'hr@example.com',
      role: 'hr'
    }
  };
  
  const result = addSickLeaveToSheet(testLeave);
  Logger.log('نتيجة إضافة الإجازة المرضية:');
  Logger.log(JSON.stringify(result, null, 2));
  
  if (result.success) {
    Logger.log('✅ تم إضافة الإجازة المرضية بنجاح');
    Logger.log('عدد الأيام المحسوب: ' + testLeave.daysCount);
  } else {
    Logger.log('❌ فشل إضافة الإجازة المرضية: ' + result.message);
  }
}
```

#### النتيجة المتوقعة:
- ✅ `result.success === true`
- ✅ يتم إضافة صف جديد أسفل الشيت
- ✅ `daysCount` يتم حسابه تلقائيًا (7 أيام)
- ✅ **لا توجد خلية `userData`** (تم حذفها)

---

### 5. اختبار تحديث إجازة مرضية (updateSickLeave)

#### الخطوات:
```javascript
function testUpdateSickLeave() {
  // استبدل 'SKL-XXX' بالـ ID الفعلي
  const leaveId = 'SKL-001';
  
  const updateData = {
    endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 يوم
    medicalNotes: 'ملاحظات محدثة - تمديد الإجازة',
    userData: {
      email: 'hr@example.com',
      role: 'hr'
    }
  };
  
  const result = updateSickLeave(leaveId, updateData);
  Logger.log('نتيجة تحديث الإجازة المرضية:');
  Logger.log(JSON.stringify(result, null, 2));
  
  if (result.success) {
    Logger.log('✅ تم تحديث الإجازة المرضية بنجاح');
    
    // التحقق من إعادة حساب الأيام
    const allLeaves = getAllSickLeaves({});
    const updatedLeave = allLeaves.data.find(l => l.id === leaveId);
    Logger.log('عدد الأيام بعد التحديث: ' + updatedLeave.daysCount);
  } else {
    Logger.log('❌ فشل تحديث الإجازة المرضية: ' + result.message);
  }
}
```

#### النتيجة المتوقعة:
- ✅ `result.success === true`
- ✅ يتم تحديث الصف المحدد **فقط**
- ✅ `daysCount` يتم إعادة حسابه تلقائيًا (14 يوم)
- ✅ **لا توجد خلية `userData`** (تم حذفها)

---

### 6. اختبار إعدادات تحليل الحوادث (بدون JSON)

#### الخطوات:
```javascript
function testIncidentAnalysisSettings() {
  // حفظ الإعدادات
  const saveResult = saveIncidentAnalysisSettings({
    settings: {
      enabledSections: ['summary', 'trends', 'severity', 'department', 'location']
    },
    userData: {
      email: 'admin@example.com',
      role: 'admin'
    }
  });
  
  Logger.log('نتيجة حفظ الإعدادات:');
  Logger.log(JSON.stringify(saveResult, null, 2));
  
  if (saveResult.success) {
    Logger.log('✅ تم حفظ الإعدادات بنجاح');
    
    // قراءة الإعدادات
    const getResult = getIncidentAnalysisSettings();
    Logger.log('الإعدادات المحفوظة:');
    Logger.log(JSON.stringify(getResult.data, null, 2));
    
    // التحقق من أن enabledSections ليست JSON
    const allSettings = readFromSheet('Incident_Analysis_Settings', getSpreadsheetId());
    const savedSettings = allSettings.find(s => s.id === 'default');
    
    Logger.log('enabledSections في الشيت:');
    Logger.log(savedSettings.enabledSections);
    
    if (typeof savedSettings.enabledSections === 'string' && 
        !savedSettings.enabledSections.startsWith('[')) {
      Logger.log('✅ enabledSections مخزنة كنص (ليس JSON)');
    } else {
      Logger.log('❌ enabledSections مخزنة كـ JSON');
    }
  } else {
    Logger.log('❌ فشل حفظ الإعدادات: ' + saveResult.message);
  }
}
```

#### النتيجة المتوقعة:
- ✅ `saveResult.success === true`
- ✅ `enabledSections` مخزنة كنص: `"summary, trends, severity, department, location"`
- ✅ **ليس JSON:** `["summary","trends",...]`

---

## 🔍 التحقق اليدوي من Google Sheets

بعد تشغيل الاختبارات، افتح Google Sheets وتحقق من:

### 1. شيت "Incidents"
- ✅ لا توجد خلايا تحتوي على `{...}` أو `[...]`
- ✅ خلية `investigation` تحتوي على نص متعدد الأسطر:
  ```
  findings: نتيجة 1, نتيجة 2
  conclusion: خلاصة التحقيق
  ```
- ✅ خلية `attachments` تحتوي على نص متعدد الأسطر
- ✅ **لا توجد عمود `userData`**

### 2. شيت "SickLeave"
- ✅ عمود `daysCount` يحتوي على أرقام (ليس نص)
- ✅ أعمدة التواريخ تُعرض بشكل صحيح
- ✅ **لا توجد عمود `userData`**

### 3. شيت "Incident_Analysis_Settings"
- ✅ عمود `enabledSections` يحتوي على نص مفصول بفواصل
- ✅ **ليس JSON**

---

## ✅ معايير النجاح

الاختبار ناجح إذا:
1. ✅ جميع الدوال تعيد `success: true`
2. ✅ لا توجد أخطاء في `Logger.log()`
3. ✅ لا توجد خلايا تحتوي على JSON في Google Sheets
4. ✅ البيانات تُضاف أسفل الشيت (لا يتم مسح الصفوف الموجودة)
5. ✅ التحديث يستهدف صف واحد فقط
6. ✅ الحذف يستهدف صف واحد فقط
7. ✅ `userData` لا تظهر في أي شيت

---

## 🐛 في حالة الفشل

إذا فشل أي اختبار:
1. تحقق من `Logger.log()` للحصول على تفاصيل الخطأ
2. راجع `BACKEND_REVIEW_CHANGELOG.md` للتأكد من التطبيق الصحيح
3. تحقق من أن `Config.gs` يحتوي على `SPREADSHEET_ID` صحيح
4. تأكد من أن جميع الملفات تم نشرها (Deploy) بشكل صحيح

---

**تاريخ الإنشاء:** 2025-12-27  
**الإصدار:** 1.0

