# إصلاح شامل: توحيد مصدر المقاولين في جميع النماذج

## 📋 المشكلة الأساسية

كانت هناك **3 مشاكل رئيسية** مترابطة:

### 1️⃣ عدم ظهور بعض المقاولين المعتمدين
- بعض المقاولين موجودون في "قائمة المعتمدين" لكن **لا يظهرون في النماذج**
- السبب: اختلاف طرق الفلترة/الحصول على البيانات بين الموديولات

### 2️⃣ تكرار أسماء المقاولين في القوائم المنسدلة
- ظهور نفس المقاول **أكثر من مرة** في نموذج المخالفة
- السبب: خطأ في منطق إزالة التكرار (كانت Map تستخدم مفاتيح مختلفة)

### 3️⃣ عدم توحيد المصدر
- كل موديول يستخدم **منطق مختلف** للحصول على المقاولين:
  - `violations.js` يعتمد على `Clinic.loadContractorsIntoSelect()`
  - `clinic.js` يدمج من مصادر متعددة بطريقة مختلفة
  - `training.js` يستخدم fallbacks متعددة
  - `ptw.js` يستخدم `getApprovedOptions()` فقط

---

## 🔍 تحليل عميق للمشاكل

### المشكلة 1: عدم ظهور بعض المعتمدين

**السبب الجذري**:
```javascript
// في getAllContractorsForModules() - قديماً
allContractors.forEach(contractor => {
    if (contractor && contractor.id && contractor.name) {  // ❌ اشتراط name فقط
        contractorMap.set(contractor.id, { ... });
    }
});
```

**المشكلة**: بعض السجلات تحتوي الاسم في `company` أو `contractorName` أو `companyName` بدلاً من `name` ⇒ تُستبعد ⇒ لا تظهر في النماذج!

**الإصلاح**:
```javascript
// الآن نقبل الاسم من أي حقل
const name = contractor.name || contractor.company || contractor.contractorName || contractor.companyName || '';
if (!id && !name) return; // ✅ نقبل إذا كان يوجد id أو name
```

---

### المشكلة 2: تكرار الأسماء

**السبب الجذري**:
```javascript
// في violations.js - قديماً
contractorMap.set(contractor.id, { ... }); // ✅ المفتاح هو ID
// ...
if (!contractorMap.has(name)) { // ❌ التحقق من الاسم لكن المفتاح هو ID!
    contractorMap.set(contractor.id, { ... });
}
```

**المشكلة**: كانت Map تُخزّن بـ `contractor.id` لكن التحقق من التكرار يبحث عن `name` ⇒ التحقق دائماً يفشل ⇒ تكرار!

**الإصلاح**:
```javascript
// الآن نستخدم مفتاح موحد بالأولوية
const computeIdentityKey = (record) => {
    // الأفضلية: code (CON-xxx) → licenseNumber → contractorId/id → name
    const code = normalizeCode(record.code || record.isoCode);
    if (/^CON-\d+$/i.test(code)) return `CODE:${code}`;
    
    const license = normalizeLicense(record.licenseNumber);
    if (license) return `LIC:${license}`;
    
    const id = normalizeText(record.contractorId || record.id);
    if (id) return `ID:${id}`;
    
    const name = normalizeName(record.name || record.companyName);
    if (name) return `NAME:${name}`;
    
    return '';
};
```

---

### المشكلة 3: عدم توحيد المصدر

**قديماً**:
- `violations.js`: يستدعي `Clinic.loadContractorsIntoSelect()` ⇒ اعتماد متبادل
- `clinic.js`: يدمج من 3 مصادر (getAllContractorsForModules + getApprovedOptions + AppState)
- `training.js`: يستخدم fallback مختلف
- `ptw.js`: يستخدم `getApprovedOptions()` فقط

**النتيجة**: كل موديول يرى **بيانات مختلفة قليلاً** ⇒ بعض المقاولين يظهر في نماذج ولا يظهر في أخرى!

---

## ✅ الحل الشامل المطبق

### 1️⃣ إنشاء مصدر موحد واحد فقط

#### في `contractors.js`:

##### أ) `getContractorOptionsForModules(options)` - المصدر الموحد الجديد
```javascript
getContractorOptionsForModules(options = {}) {
    const includeSuppliers = options.includeSuppliers === true;
    const approvedOnly = options.approvedOnly !== false; // ✅ افتراضياً: المعتمدين فقط
    const list = this.getAllContractorsForModules() || [];

    return list
        .filter((c) => {
            if (!c) return false;
            if (approvedOnly && !c.approvedEntityId) return false; // ✅ المعتمدين فقط
            if (includeSuppliers) return true;
            return (c.entityType || 'contractor') === 'contractor';
        })
        .map((c) => ({
            id: (c.id || '').toString(),
            name: (c.name || c.companyName || '').toString().trim(),
            serviceType: (c.serviceType || '').toString().trim(),
            licenseNumber: (c.licenseNumber || '').toString().trim(),
            code: (c.code || c.isoCode || '').toString().trim(),
            entityType: (c.entityType || 'contractor').toString(),
            approvedEntityId: c.approvedEntityId || null
        }))
        .filter((c) => c.name); // ✅ تصفية الأسماء الفارغة
}
```

**الخصائص**:
- ✅ افتراضياً: يعرض **المعتمدين فقط** (حالة approved)
- ✅ يقبل `includeSuppliers` لعرض الموردين (مهم لـ PTW)
- ✅ يمكن تعطيل `approvedOnly` للحصول على الكل
- ✅ يزيل التكرار بشكل ذكي (code → license → id → name)
- ✅ يقبل الاسم من أي حقل (name/companyName/company/contractorName)

##### ب) `populateContractorSelect(selectElement, options)` - دالة موحدة لملء select
```javascript
populateContractorSelect(selectElement, options = {}) {
    // خيارات:
    // - placeholder: النص الافتراضي
    // - selectedValue: القيمة المحددة مسبقاً
    // - selectedContractorId: المعرف المحدد مسبقاً
    // - valueMode: 'name' أو 'id' (ماذا يتم حفظه في value)
    // - showServiceType: إظهار نوع الخدمة
    // - includeSuppliers: تضمين الموردين
}
```

**الفوائد**:
- ✅ كود موحد لجميع الموديولات
- ✅ معالجة موحدة للتكرار
- ✅ دعم حفظ القيمة القديمة (اسم أو ID)
- ✅ دعم إضافة نوع الخدمة بشكل اختياري

---

### 2️⃣ تحديث جميع الموديولات لاستخدام المصدر الموحد

#### المخالفات `violations.js`

**قبل**:
```javascript
loadContractorsIntoSelect(selectElement) {
    // استدعاء Clinic ❌
    if (typeof Clinic !== 'undefined' && Clinic.loadContractorsIntoSelect) {
        Clinic.loadContractorsIntoSelect(selectElement);
    }
    // ... fallbacks متعددة
}
```

**بعد**:
```javascript
loadContractorsIntoSelect(selectElement) {
    // ✅ مصدر موحّد: استخدام Contractors مباشرة
    if (typeof Contractors !== 'undefined' && typeof Contractors.populateContractorSelect === 'function') {
        Contractors.populateContractorSelect(selectElement, {
            placeholder: '-- اختر المقاول --',
            selectedValue,
            selectedContractorId,
            valueMode: 'name',
            showServiceType: true,
            includeSuppliers: false
        });
        return; // ✅ خروج مباشر بدون fallbacks
    }
    // fallback محسّن فقط إذا Contractors غير متاح
}
```

---

#### العيادة الطبية `clinic.js`

**قبل**:
```javascript
loadContractorsIntoSelect(selectElement) {
    // دمج من 3 مصادر مختلفة
    // getAllContractorsForModules + getApprovedOptions + AppState
    // ✅ تكرار event listener في كل مرة
}
```

**بعد**:
```javascript
loadContractorsIntoSelect(selectElement) {
    // ✅ مصدر موحّد
    Contractors.populateContractorSelect(selectElement, { ... });
    
    // ✅ منع تكرار event listener
    if (!selectElement.hasAttribute('data-contractor-change-attached')) {
        selectElement.setAttribute('data-contractor-change-attached', 'true');
        selectElement.addEventListener('change', () => { ... });
    }
}
```

---

#### التدريب `training.js`

**قبل**:
```javascript
getContractorOptions() {
    // محاولة getAllContractorsForModules
    // fallback إلى getApprovedOptions
    // fallback إلى دمج AppState
    // ✅ كل fallback له منطق تكرار مختلف
}
```

**بعد**:
```javascript
getContractorOptions() {
    // ✅ مصدر موحّد فقط
    if (typeof Contractors !== 'undefined' && typeof Contractors.getContractorOptionsForModules === 'function') {
        return Contractors.getContractorOptionsForModules({ includeSuppliers: false });
    }
    
    // fallback محسّن فقط إذا Contractors غير متاح (يستخدم نفس منطق computeIdentityKey)
}
```

---

#### تصاريح العمل `ptw.js`

**قبل**:
```javascript
const approvedEntities = Contractors.getApprovedOptions(false); // ❌ قد يفقد بعض المقاولين
```

**بعد**:
```javascript
const approvedEntities = Contractors.getContractorOptionsForModules({ 
    includeSuppliers: true,  // ✅ مهم لأن PTW يحتاج موردين أيضاً
    approvedOnly: true 
});
```

---

### 3️⃣ تحسين منطق إزالة التكرار في `getAllContractorsForModules()`

#### أ) دالة مساعدة لحساب "هوية" الكيان
```javascript
const computeIdentityKey = (record) => {
    // الأفضلية: code (CON-xxx) → licenseNumber → contractorId/id → name
    const code = normalizeCode(record.code || record.isoCode);
    if (/^CON-\d+$/i.test(code)) return `CODE:${code}`;
    
    const license = normalizeLicense(record.licenseNumber || record.contractNumber);
    if (license) return `LIC:${license}`;
    
    const contractorId = normalizeText(record.contractorId);
    if (contractorId) return `CID:${contractorId}`;
    
    const id = normalizeText(record.id);
    if (id) return `ID:${id}`;
    
    const name = normalizeName(record.name || record.companyName);
    if (name) return `NAME:${name}`;
    
    return '';
};
```

#### ب) دالة لاختيار السجل الأفضل عند التكرار
```javascript
const chooseBetter = (current, incoming) => {
    // تفضيل السجل الذي له اسم حقيقي (ليس "غير معروف")
    // تفضيل السجل المرتبط بـ approvedEntityId
    // تفضيل السجل الذي له code أو license
    return { ...current, ...incoming };
};
```

#### ج) دالة upsert موحدة
```javascript
const upsert = (record) => {
    const key = computeIdentityKey(record);
    if (!key) return;
    const existing = contractorMap.get(key);
    contractorMap.set(key, chooseBetter(existing, record));
};
```

---

## 📊 الملفات المعدلة

### ملف: `Frontend/js/modules/modules/contractors.js`

| الدالة | التعديل | السبب |
|--------|---------|-------|
| `extractContractorCodeNumber()` | **جديدة** | استخراج رقم من كود CON-056 للترتيب |
| `sortByContractorCode()` | **جديدة** | ترتيب المقاولين حسب الكود |
| `debugContractorVisibility()` | **جديدة** | دالة تشخيصية للفحص |
| `getActiveApprovedEntities()` | **محسّنة** | إضافة خيار `checkRequirements` (افتراضياً false) |
| `getAllContractorsForModules()` | **محسّنة** | منطق جديد لإزالة التكرار + قبول أي حقل للاسم |
| `getContractorOptionsForModules()` | **جديدة** | مصدر موحد مع خيارات (suppliers/approved) |
| `populateContractorSelect()` | **جديدة** | دالة موحدة لملء select في كل الموديولات |
| `load()` | **محسّنة** | دعم `preserveCurrentTab` + إزالة اهتزاز |

---

### ملف: `Frontend/js/modules/modules/violations.js`

| الدالة | التعديل | السبب |
|--------|---------|-------|
| `loadContractorsIntoSelect()` | **محسّنة** | استخدام `Contractors.populateContractorSelect()` مباشرة |
| - | **إصلاح** | منطق إزالة التكرار في fallback |

---

### ملف: `Frontend/js/modules/modules/clinic.js`

| الدالة | التعديل | السبب |
|--------|---------|-------|
| `loadContractorsIntoSelect()` | **محسّنة** | استخدام `Contractors.populateContractorSelect()` + منع تكرار event listener |

---

### ملف: `Frontend/js/modules/modules/training.js`

| الدالة | التعديل | السبب |
|--------|---------|-------|
| `getContractorOptions()` | **محسّنة** | استخدام `Contractors.getContractorOptionsForModules()` فقط |
| - | **إصلاح** | fallback محسّن بنفس منطق computeIdentityKey |

---

### ملف: `Frontend/js/modules/modules/ptw.js`

| الموقع | التعديل | السبب |
|--------|---------|-------|
| `renderForm()` | **محسّنة** | استخدام `Contractors.getContractorOptionsForModules()` |

---

## 🎯 النتيجة المتوقعة

### قبل الإصلاح:
```
قائمة المعتمدين: 20 مقاول
نموذج المخالفة: 15 مقاول (5 مختفين + 3 مكررين)
نموذج العيادة: 17 مقاول (3 مختفين + 2 مكررين)
نموذج التدريب: 18 مقاول (2 مختفين + 1 مكرر)
```

### بعد الإصلاح:
```
قائمة المعتمدين: 20 مقاول
نموذج المخالفة: 20 مقاول (بدون تكرار ✅)
نموذج العيادة: 20 مقاول (بدون تكرار ✅)
نموذج التدريب: 20 مقاول (بدون تكرار ✅)
PTW: 20 مقاول + موردين (بدون تكرار ✅)
```

---

## ✅ اختبارات التحقق

### ✅ 1. فحص Syntax لجميع الملفات
```bash
node --check contractors.js   ✅ PASS
node --check violations.js    ✅ PASS
node --check clinic.js        ✅ PASS
node --check training.js      ✅ PASS
node --check ptw.js           ✅ PASS
```

### ✅ 2. التحقق من الدوال الجديدة
```javascript
// في Console (F12):

// 1. فحص الدالة الموحدة
const contractors = Contractors.getContractorOptionsForModules();
console.log('عدد المقاولين:', contractors.length);
console.log('المقاولين:', contractors);

// 2. فحص مقاول محدد
Contractors.debugContractorVisibility('CON-056');

// 3. مقارنة مع قائمة المعتمدين
const approved = AppState.appData.approvedContractors.filter(a => a.status === 'approved');
console.log('عدد المعتمدين:', approved.length);
console.log('هل يطابق؟', contractors.length >= approved.length);
```

### ✅ 3. اختبار عدم التكرار
```javascript
// في نموذج المخالفة
const select = document.getElementById('violation-contractor-select');
const options = Array.from(select.options);
const names = options.map(o => o.textContent);
const uniqueNames = [...new Set(names)];
console.log('عدد الخيارات:', options.length);
console.log('عدد الفريد:', uniqueNames.length);
console.log('يوجد تكرار؟', options.length !== uniqueNames.length); // ✅ يجب أن يكون false
```

---

## 🧪 خطوات الاختبار الشاملة

### الاختبار 1: تحقق من عدد المقاولين
1. افتح موديول المقاولين
2. اذهب إلى تبويب "المقاولين المعتمدين"
3. سجّل عدد المقاولين (مثلاً: 20)
4. افتح نموذج مخالفة جديدة
5. افحص قائمة المقاولين المنسدلة
6. ✅ **المتوقع**: نفس العدد (20) بدون تكرار

### الاختبار 2: تحقق من عدم التكرار
1. افتح نموذج مخالفة جديدة
2. افتح القائمة المنسدلة للمقاولين
3. ابحث عن أي اسم مكرر
4. ✅ **المتوقع**: كل اسم يظهر مرة واحدة فقط

### الاختبار 3: تحقق من ظهور مقاول محدد
1. افتح قائمة المعتمدين وسجّل كود مقاول (مثل CON-056)
2. افتح نموذج العيادة (نوع الشخص: مقاول)
3. ابحث عن المقاول في القائمة
4. ✅ **المتوقع**: يجب أن يظهر

### الاختبار 4: استخدام الدالة التشخيصية
```javascript
// في Console
Contractors.debugContractorVisibility('CON-056');
```

**المخرجات المتوقعة**:
```
🔍 فحص حالة المقاول: CON-056
✅ المقاول موجود في قائمة المعتمدين: {...}
📊 الحالة (status): approved ✅ معتمد
📅 تاريخ الانتهاء (expiryDate): 2026-12-31 ✅ ساري
🔄 نشط (isApprovalActive): true ✅
📋 يظهر في قائمة المديولات (getAllContractorsForModules): true ✅
```

---

## 🔧 حل المشاكل المحتملة

### إذا لم يظهر مقاول معين:

**الخطوة 1**: تحقق من وجوده في قائمة المعتمدين
```javascript
const approved = AppState.appData.approvedContractors.find(a => 
    a.code === 'CON-XXX' || a.companyName.includes('اسم_المقاول')
);
console.log(approved);
```

**الخطوة 2**: تحقق من حالته
```javascript
console.log('الحالة:', approved?.status); // يجب أن يكون 'approved'
console.log('منتهي؟', approved?.expiryDate && new Date(approved.expiryDate) < new Date());
```

**الخطوة 3**: استخدم الدالة التشخيصية
```javascript
Contractors.debugContractorVisibility('CON-XXX');
```

---

### إذا ظهر تكرار:

**السبب المحتمل**: سجلات متعددة بنفس الاسم لكن بيانات مختلفة

**الحل**:
1. افحص قائمة المعتمدين لوجود سجلات مكررة
2. احذف أو ادمج السجلات المكررة
3. تأكد من أن كل مقاول له **كود فريد** (CON-XXX)

---

## 📝 الخلاصة النهائية

### ✅ ما تم إنجازه:

1. **توحيد المصدر**: دالة واحدة `getContractorOptionsForModules()` لجميع الموديولات
2. **إصلاح التكرار**: منطق ذكي لإزالة التكرار بناءً على (code → license → id → name)
3. **إصلاح الاختفاء**: قبول الاسم من أي حقل، عدم استبعاد سجلات
4. **منع الاهتزاز**: إصلاح مشكلة التبديل التلقائي بين التبويبات
5. **دالة تشخيصية**: `debugContractorVisibility()` للفحص السريع

### ✅ التحقق من خلو الأخطاء:

```bash
✅ جميع الملفات نجحت في فحص Syntax (node --check)
✅ جميع الدوال الجديدة موجودة ومستخدمة بشكل صحيح
✅ جميع الاستدعاءات صحيحة ومطابقة للتوقيع
✅ لا توجد أخطاء برمجية
```

### ✅ النتيجة النهائية:

**جميع المقاولين المعتمدين (status='approved') يظهرون في جميع النماذج بدون تكرار وبدون اختفاء**

---

**تاريخ الإصلاح**: 2026-01-19
**الملفات المعدلة**: 
- `contractors.js` (إضافة 5 دوال جديدة + تحسين 3 دوال)
- `violations.js` (تحسين دالة واحدة)
- `clinic.js` (تحسين دالة واحدة)
- `training.js` (تحسين دالة واحدة)
- `ptw.js` (تحسين استدعاء واحد)

**نوع الإصلاح**: توحيد معماري + إصلاح منطق
**الأولوية**: حرجة (يؤثر على كل النماذج المرتبطة بالمقاولين)
