# دليل اختبار إصلاحات المقاولين

## 🧪 اختبارات التحقق السريعة

استخدم هذا الدليل للتأكد من أن جميع الإصلاحات تعمل بشكل صحيح.

---

## ✅ الاختبار 1: التحقق من تحميل موديول Contractors

### الخطوات:
1. حدّث الصفحة (Ctrl+F5)
2. افتح Console (F12)
3. اكتب:
   ```javascript
   window.Contractors
   ```

### النتيجة المتوقعة:
```javascript
✅ Object {load: ƒ, switchTab: ƒ, getAllContractorsForModules: ƒ, ...}
```

### إذا ظهر `undefined`:
❌ الموديول لم يتم تحميله - راجع أخطاء Console

---

## ✅ الاختبار 2: التحقق من عدد المقاولين المعتمدين

### الخطوات:
في Console:
```javascript
// 1. عدد المعتمدين في قائمة المعتمدين
const approved = AppState.appData.approvedContractors.filter(a => a.status === 'approved');
console.log('✅ عدد المعتمدين:', approved.length);

// 2. عدد المقاولين المتاحين للنماذج
const forModules = Contractors.getAllContractorsForModules();
console.log('✅ عدد المقاولين في النماذج:', forModules.length);

// 3. المقارنة
console.log('✅ هل متطابق؟', forModules.length >= approved.length);
```

### النتيجة المتوقعة:
```
✅ عدد المعتمدين: 20
✅ عدد المقاولين في النماذج: 20
✅ هل متطابق؟ true
```

---

## ✅ الاختبار 3: فحص مقاول محدد (CON-056)

### الخطوات:
في Console:
```javascript
Contractors.debugContractorVisibility('CON-056');
```

### النتيجة المتوقعة:
```
🔍 فحص حالة المقاول: CON-056
✅ المقاول موجود في قائمة المعتمدين: {id: "ACN_123", companyName: "...", ...}
📊 الحالة (status): approved ✅ معتمد
📅 تاريخ الانتهاء (expiryDate): 2026-12-31 ✅ ساري
🔄 نشط (isApprovalActive): true ✅
📋 يظهر في قائمة المديولات (getAllContractorsForModules): true ✅
```

### إذا ظهر `❌`:
- **status ليس approved**: اذهب لقائمة المعتمدين وغيّر حالته إلى "معتمد"
- **expiryDate منتهي**: حدّث تاريخ الانتهاء
- **لا يظهر في قائمة المديولات**: أرسل لي نتيجة الفحص للتحليل

---

## ✅ الاختبار 4: فحص التكرار في نموذج المخالفة

### الخطوات:
1. افتح نموذج **تسجيل مخالفة جديدة**
2. اختر نوع الشخص: **مقاول**
3. افتح القائمة المنسدلة للمقاولين
4. في Console:
   ```javascript
   const select = document.getElementById('violation-contractor-select');
   const options = Array.from(select.options);
   const names = options.map(o => o.textContent.trim()).filter(n => n && n !== '-- اختر المقاول --');
   const unique = [...new Set(names)];
   
   console.log('📊 إجمالي الخيارات:', names.length);
   console.log('📊 الخيارات الفريدة:', unique.length);
   console.log('✅ يوجد تكرار؟', names.length !== unique.length ? 'نعم ❌' : 'لا ✅');
   
   // عرض المكررات إن وجدت
   const duplicates = names.filter((name, idx) => names.indexOf(name) !== idx);
   if (duplicates.length > 0) {
       console.log('❌ الأسماء المكررة:', [...new Set(duplicates)]);
   }
   ```

### النتيجة المتوقعة:
```
📊 إجمالي الخيارات: 20
📊 الخيارات الفريدة: 20
✅ يوجد تكرار؟ لا ✅
```

---

## ✅ الاختبار 5: فحص ظهور المقاولين في نموذج العيادة

### الخطوات:
1. افتح نموذج **تسجيل زيارة جديدة**
2. اختر نوع الشخص: **مقاول**
3. افتح القائمة المنسدلة للمقاولين
4. في Console:
   ```javascript
   const select = document.getElementById('visit-contractor-name-select');
   const options = Array.from(select.options);
   console.log('✅ عدد المقاولين في العيادة:', options.length - 1); // -1 للخيار الافتراضي
   ```

### النتيجة المتوقعة:
```
✅ عدد المقاولين في العيادة: 20
```

---

## ✅ الاختبار 6: فحص ظهور المقاولين في نموذج التدريب

### الخطوات:
1. افتح موديول **التدريب**
2. افتح نموذج **تسجيل تدريب للمقاولين**
3. في Console:
   ```javascript
   const select = document.getElementById('contractor-training-contractor');
   const options = Array.from(select.options);
   console.log('✅ عدد المقاولين في التدريب:', options.length - 1); // -1 للخيار الافتراضي
   ```

### النتيجة المتوقعة:
```
✅ عدد المقاولين في التدريب: 20
```

---

## ✅ الاختبار 7: فحص الانتقال التلقائي بين التبويبات

### الخطوات:
1. افتح موديول المقاولين
2. انتقل إلى تبويب **"المقاولين المعتمدين"**
3. احذف أي مقاول معتمد
4. انتظر انتهاء الحذف

### النتيجة المتوقعة:
```
✅ تبقى في تبويب "المقاولين المعتمدين"
✅ لا يتم الانتقال إلى تبويب "طلب اعتماد"
```

### إذا حدث انتقال تلقائي:
❌ هناك استدعاء `load()` بدون `preserveCurrentTab` - أرسل لي الموقع

---

## ✅ الاختبار 8: فحص الاهتزاز (Flicker)

### الخطوات:
1. افتح موديول المقاولين
2. انتقل بين التبويبات عدة مرات بسرعة
3. راقب الشاشة

### النتيجة المتوقعة:
```
✅ لا يوجد وميض أو اهتزاز في المحتوى
✅ التبديل سلس وسريع
```

### إذا ظهر اهتزاز:
❌ قد يكون هناك `setTimeout(() => switchTab())` متأخر - أرسل لي الموقع

---

## ✅ الاختبار 9: مقارنة شاملة بين النماذج

### الخطوات:
في Console:
```javascript
// جمع المقاولين من كل نموذج
const collectFromSelect = (selectId) => {
    const select = document.getElementById(selectId);
    if (!select) return [];
    return Array.from(select.options)
        .filter(o => o.value && o.value !== '')
        .map(o => o.textContent.trim());
};

// قد تحتاج فتح النماذج أولاً لإنشاء العناصر
// ثم تشغيل:
const violation = collectFromSelect('violation-contractor-select');
const clinic = collectFromSelect('visit-contractor-name-select');
const training = collectFromSelect('contractor-training-contractor');

console.log('📊 المخالفات:', violation.length);
console.log('📊 العيادة:', clinic.length);
console.log('📊 التدريب:', training.length);
console.log('✅ متطابقة؟', 
    violation.length === clinic.length && 
    clinic.length === training.length
);
```

### النتيجة المتوقعة:
```
📊 المخالفات: 20
📊 العيادة: 20
📊 التدريب: 20
✅ متطابقة؟ true
```

---

## ✅ الاختبار 10: فحص توحيد المصدر

### الخطوات:
في Console:
```javascript
// التحقق من أن الدوال الموحدة موجودة
console.log('getContractorOptionsForModules:', 
    typeof Contractors.getContractorOptionsForModules);
console.log('populateContractorSelect:', 
    typeof Contractors.populateContractorSelect);
console.log('debugContractorVisibility:', 
    typeof Contractors.debugContractorVisibility);

// التحقق من عدم وجود دوال قديمة متضاربة
console.log('✅ جميع الدوال الموحدة موجودة');
```

### النتيجة المتوقعة:
```
getContractorOptionsForModules: function
populateContractorSelect: function
debugContractorVisibility: function
✅ جميع الدوال الموحدة موجودة
```

---

## 🔍 اختبارات تشخيصية متقدمة

### فحص شامل لجميع المعتمدين:
```javascript
const approved = AppState.appData.approvedContractors || [];
const byStatus = {};
approved.forEach(a => {
    const status = a.status || 'unknown';
    byStatus[status] = (byStatus[status] || 0) + 1;
});
console.table(byStatus);

// فحص المنتهية
const now = new Date();
const expired = approved.filter(a => a.expiryDate && new Date(a.expiryDate) < now);
console.log('📅 عدد المنتهية:', expired.length);
console.log('📅 أسماء المنتهية:', expired.map(e => e.companyName));
```

---

### فحص التكرار في البيانات الأصلية:
```javascript
const approved = AppState.appData.approvedContractors || [];
const names = approved.map(a => a.companyName);
const codes = approved.map(a => a.code || a.isoCode);

console.log('📊 إجمالي السجلات:', approved.length);
console.log('📊 أسماء فريدة:', [...new Set(names)].length);
console.log('📊 أكواد فريدة:', [...new Set(codes.filter(Boolean))].length);

// البحث عن تكرار في الأكواد
const codeCounts = {};
codes.forEach(c => {
    if (c) codeCounts[c] = (codeCounts[c] || 0) + 1;
});
const duplicateCodes = Object.entries(codeCounts).filter(([k, v]) => v > 1);
if (duplicateCodes.length > 0) {
    console.warn('⚠️ أكواد مكررة:', duplicateCodes);
}
```

---

### فحص قائمة الـ Map المستخدمة:
```javascript
// داخل getAllContractorsForModules - يمكنك نسخ الكود ولصقه في Console
const contractorMap = new Map();

const approved = AppState.appData.approvedContractors || [];
approved.forEach(a => {
    const code = (a.code || a.isoCode || '').toUpperCase();
    const key = /^CON-\d+$/i.test(code) ? `CODE:${code}` : 
                (a.licenseNumber ? `LIC:${a.licenseNumber}` : 
                (a.id ? `ID:${a.id}` : 
                `NAME:${(a.companyName || '').toLowerCase()}`));
    
    if (contractorMap.has(key)) {
        console.warn('⚠️ تكرار مكتشف:', key, 'موجود:', contractorMap.get(key).name, 'جديد:', a.companyName);
    }
    contractorMap.set(key, a);
});

console.log('📊 عدد السجلات الأصلية:', approved.length);
console.log('📊 بعد إزالة التكرار:', contractorMap.size);
```

---

## 🎯 معايير النجاح

| الاختبار | الحالة | الملاحظات |
|----------|--------|-----------|
| تحميل Contractors | ✅ | `window.Contractors` موجود |
| عدد المقاولين متطابق | ✅ | forModules.length >= approved.length |
| لا تكرار في المخالفات | ✅ | names.length === unique.length |
| لا تكرار في العيادة | ✅ | names.length === unique.length |
| لا تكرار في التدريب | ✅ | names.length === unique.length |
| ظهور CON-056 | ✅ | debugContractorVisibility يعرض ✅ |
| عدم الانتقال التلقائي | ✅ | البقاء في نفس التبويب بعد الحذف |
| عدم الاهتزاز | ✅ | تبديل سلس بين التبويبات |

---

## 🔧 حل المشاكل

### مشكلة: مقاول لا يظهر في النماذج

#### الخطوة 1: فحص وجوده في المعتمدين
```javascript
const code = 'CON-XXX'; // استبدل بالكود الفعلي
const approved = AppState.appData.approvedContractors.find(a => 
    a.code === code || a.isoCode === code
);

if (!approved) {
    console.error('❌ المقاول غير موجود في قائمة المعتمدين');
} else {
    console.log('✅ المقاول موجود:', approved);
}
```

#### الخطوة 2: فحص حالته
```javascript
console.log('الحالة:', approved.status); // يجب: 'approved'
console.log('الصلاحية:', approved.expiryDate);
console.log('منتهي؟', new Date(approved.expiryDate) < new Date());
```

#### الخطوة 3: استخدام الدالة التشخيصية
```javascript
Contractors.debugContractorVisibility(code);
```

---

### مشكلة: أسماء مكررة في القائمة

#### الخطوة 1: فحص البيانات الأصلية
```javascript
const approved = AppState.appData.approvedContractors;
const codes = approved.map(a => a.code || a.isoCode).filter(Boolean);
const duplicates = codes.filter((c, idx) => codes.indexOf(c) !== idx);

if (duplicates.length > 0) {
    console.warn('⚠️ توجد أكواد مكررة في قائمة المعتمدين:', [...new Set(duplicates)]);
    console.warn('⚠️ يجب حذف أو دمج السجلات المكررة من قائمة المعتمدين');
}
```

#### الخطوة 2: فحص النموذج
```javascript
const select = document.getElementById('violation-contractor-select');
const names = Array.from(select.options).map(o => o.textContent);
const seen = {};
names.forEach(name => {
    seen[name] = (seen[name] || 0) + 1;
});
const duplicated = Object.entries(seen).filter(([k, v]) => v > 1);
if (duplicated.length > 0) {
    console.warn('❌ تكرار في النموذج:', duplicated);
}
```

---

### مشكلة: الانتقال التلقائي بين التبويبات

#### التحقق:
```javascript
// افتح موديول المقاولين
// اذهب لتبويب "المعتمدين"
// قبل حذف أي شيء، اكتب في Console:

const originalTab = Contractors.currentTab;
console.log('التبويب الحالي:', originalTab);

// بعد الحذف:
setTimeout(() => {
    console.log('التبويب بعد الحذف:', Contractors.currentTab);
    console.log('✅ متطابق؟', Contractors.currentTab === originalTab);
}, 500);
```

---

## 📋 قائمة فحص نهائية

قبل الموافقة على الإصلاحات، تأكد من:

- [ ] ✅ موديول Contractors يتم تحميله بدون أخطاء
- [ ] ✅ جميع المقاولين المعتمدين يظهرون في النماذج
- [ ] ✅ لا توجد أسماء مكررة في أي نموذج
- [ ] ✅ عدد المقاولين متطابق في جميع النماذج
- [ ] ✅ لا يحدث انتقال تلقائي بين التبويبات
- [ ] ✅ لا يوجد اهتزاز عند التبديل
- [ ] ✅ الترتيب حسب الكود (CON-001, CON-002, ...)
- [ ] ✅ الدوال التشخيصية تعمل بشكل صحيح

---

## 🆘 إذا فشل أي اختبار

أرسل النتائج التالية:

1. **نتيجة Console**:
   ```javascript
   Contractors.debugContractorVisibility('CON-XXX');
   ```

2. **قائمة المعتمدين**:
   ```javascript
   const approved = AppState.appData.approvedContractors
       .filter(a => a.status === 'approved')
       .map(a => ({ code: a.code, name: a.companyName, expiry: a.expiryDate }));
   console.table(approved);
   ```

3. **قائمة النماذج**:
   ```javascript
   const forModules = Contractors.getAllContractorsForModules();
   console.table(forModules);
   ```

4. **لقطة شاشة** للمشكلة

---

**تاريخ الاختبار**: _________________
**النتيجة العامة**: ☐ نجح  ☐ فشل
**الملاحظات**: _________________
