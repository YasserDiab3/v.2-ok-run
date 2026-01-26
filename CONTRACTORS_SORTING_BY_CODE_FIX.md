# ترتيب المقاولين حسب كود المقاول

## 📅 التاريخ: 2026-01-19

---

## 🎯 **المطلوب**

ترتيب المقاولين في قائمة المقاولين طبقاً لتسلسل كود المقاول (CON-001, CON-002, ...)  
بشكل متسلسل ومرتب حسب العدد.

---

## ✅ **الحل المُطبّق**

### **1. إضافة دالة استخراج الرقم من كود المقاول**

```javascript
/**
 * ✅ استخراج الرقم من كود المقاول للترتيب الصحيح
 * مثال: CON-001 → 1, CON-010 → 10, CON-100 → 100
 */
extractContractorCodeNumber(code) {
    if (!code) return 0;
    const match = String(code).match(/CON-(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
}
```

**الهدف:**
- استخراج الرقم من الكود
- CON-001 → 1
- CON-010 → 10
- CON-100 → 100

---

### **2. إضافة دالة مقارنة للترتيب**

```javascript
/**
 * ✅ دالة مقارنة لترتيب المقاولين حسب كود المقاول
 * الترتيب: CON-001, CON-002, ..., CON-010, ..., CON-100
 */
sortByContractorCode(a, b) {
    const codeA = a.code || a.contractorCode || '';
    const codeB = b.code || b.contractorCode || '';
    
    const numA = this.extractContractorCodeNumber(codeA);
    const numB = this.extractContractorCodeNumber(codeB);
    
    // إذا كان لديهما أرقام، الترتيب حسب الرقم
    if (numA > 0 && numB > 0) {
        return numA - numB;
    }
    
    // إذا كان أحدهما فقط لديه رقم، الذي لديه رقم يأتي أولاً
    if (numA > 0) return -1;
    if (numB > 0) return 1;
    
    // إذا لم يكن لديهما أرقام، الترتيب أبجدياً حسب الاسم
    const nameA = a.companyName || a.name || '';
    const nameB = b.companyName || b.name || '';
    return nameA.localeCompare(nameB, 'ar', { sensitivity: 'base' });
}
```

**الميزات:**
1. ✅ ترتيب رقمي صحيح (CON-010 يأتي قبل CON-100)
2. ✅ المقاولين بدون كود يأتون في النهاية
3. ✅ ترتيب أبجدي احتياطي للمقاولين بدون كود

---

### **3. تطبيق الترتيب في `getActiveApprovedEntities()`**

**قبل:**
```javascript
// ❌ الترتيب حسب الاسم
return list.sort((a, b) => 
    (a.companyName || '').localeCompare(b.companyName || '', 'ar', { sensitivity: 'base' })
);
```

**بعد:**
```javascript
// ✅ الترتيب حسب كود المقاول
return list.sort((a, b) => this.sortByContractorCode(a, b));
```

---

### **4. تطبيق الترتيب في `getFilteredApprovedEntities()`**

**قبل:**
```javascript
// ❌ الترتيب حسب التاريخ (الأقدم أولاً)
}).sort((a, b) => {
    const dateA = new Date(a.approvalDate || a.createdAt || 0);
    const dateB = new Date(b.approvalDate || b.createdAt || 0);
    return dateA - dateB;
});
```

**بعد:**
```javascript
// ✅ الترتيب حسب كود المقاول
}).sort((a, b) => {
    return this.sortByContractorCode(a, b);
});
```

---

### **5. تطبيق الترتيب في `getAllContractorsForModules()`**

#### **أ) إضافة حقل `code` للكائنات:**

**في المقاولين العاديين:**
```javascript
contractorMap.set(contractor.id, {
    id: contractor.id,
    name: contractor.name || contractor.company || contractor.contractorName || 'غير معروف',
    serviceType: contractor.serviceType || '',
    licenseNumber: contractor.licenseNumber || contractor.contractNumber || '',
    entityType: contractor.entityType || 'contractor',
    approvedEntityId: contractor.approvedEntityId || null,
    code: contractor.code || '' // ✅ إضافة الكود للترتيب
});
```

**في المقاولين المعتمدين:**
```javascript
contractorMap.set(approved.contractorId, {
    id: approved.contractorId,
    name: approved.companyName,
    serviceType: approved.serviceType || '',
    licenseNumber: approved.licenseNumber || '',
    entityType: approved.entityType || 'contractor',
    approvedEntityId: approved.id,
    code: approved.code || '' // ✅ إضافة الكود للترتيب
});
```

#### **ب) تطبيق الترتيب:**

**قبل:**
```javascript
// ❌ الترتيب حسب الاسم
const finalList = Array.from(contractorMap.values()).sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', 'ar', { sensitivity: 'base' })
);
```

**بعد:**
```javascript
// ✅ الترتيب حسب كود المقاول
const finalList = Array.from(contractorMap.values()).sort((a, b) =>
    this.sortByContractorCode(a, b)
);
```

---

## 📊 **الملفات المُعدّلة**

| الملف | التعديلات | الأسطر |
|------|----------|--------|
| `contractors.js` | إضافة `extractContractorCodeNumber()` | بعد 1027 |
| `contractors.js` | إضافة `sortByContractorCode()` | بعد 1033 |
| `contractors.js` | تطبيق في `getActiveApprovedEntities()` | ~1957 |
| `contractors.js` | تطبيق في `getFilteredApprovedEntities()` | ~1570 |
| `contractors.js` | إضافة `code` في `getAllContractorsForModules()` | ~2162, 2189, 2207 |
| `contractors.js` | تطبيق في `getAllContractorsForModules()` | ~2224 |

**إجمالي:** 2 دالة جديدة + 4 أماكن تطبيق

---

## 🎯 **كيف يعمل الترتيب؟**

### **مثال عملي:**

**البيانات:**
```
- المقاول أ: CON-010
- المقاول ب: CON-002
- المقاول ج: CON-100
- المقاول د: CON-001
- المقاول ه: بدون كود
```

**قبل (ترتيب أبجدي):**
```
1. المقاول أ (CON-010)
2. المقاول ب (CON-002)
3. المقاول ج (CON-100)
4. المقاول د (CON-001)
5. المقاول ه (بدون كود)
```

**بعد (ترتيب حسب الكود):**
```
1. المقاول د (CON-001) ← رقم 1
2. المقاول ب (CON-002) ← رقم 2
3. المقاول أ (CON-010) ← رقم 10
4. المقاول ج (CON-100) ← رقم 100
5. المقاول ه (بدون كود) ← في النهاية
```

---

## 📈 **الفوائد**

| الميزة | الوصف |
|--------|-------|
| **ترتيب منطقي** | المقاولون مرتبون حسب تسلسل الكود الرقمي |
| **سهولة البحث** | سهل إيجاد مقاول معين حسب كوده |
| **توافقية** | يعمل مع المقاولين بدون كود (يظهرون في النهاية) |
| **أداء ممتاز** | الترتيب O(n log n) - سريع جداً |

---

## 🧪 **اختبار الترتيب**

### **اختبار 1: قائمة المقاولين المعتمدين**
```
1. افتح موديول المقاولين
2. اذهب إلى تبويب "قائمة المقاولين والموردين المعتمدين"
3. تحقق من الترتيب:
   ✅ CON-001 في الأعلى
   ✅ CON-002 بعده
   ✅ CON-010 بعد CON-009
   ✅ CON-100 بعد CON-099
```

### **اختبار 2: القوائم المنسدلة في المديولات الأخرى**
```
1. افتح موديول PTW (تصريح العمل)
2. افتح نموذج جديد
3. انظر إلى قائمة المقاولين في الحقل
   ✅ يجب أن تكون مرتبة حسب الكود (CON-001, CON-002, ...)
```

### **اختبار 3: مع بيانات مختلطة**
```
- CON-001 ← أول
- CON-005 ← ثاني
- CON-010 ← ثالث
- ABC شركة (بدون كود) ← في النهاية
- XYZ مؤسسة (بدون كود) ← في النهاية (أبجدياً)
```

---

## 🔄 **الاختلافات عن الترتيب السابق**

| الجانب | قبل | بعد |
|--------|-----|-----|
| **القاعدة** | أبجدي/تاريخي | رقمي حسب الكود |
| **CON-010 vs CON-100** | CON-010 بعد CON-100 ❌ | CON-010 قبل CON-100 ✅ |
| **بدون كود** | في مواقع عشوائية | في النهاية مرتبة أبجدياً |
| **المنطق** | غير منطقي للمستخدم | منطقي وسهل الفهم |

---

## 💡 **ملاحظات مهمة**

1. ✅ **التوافقية:** الكود يعمل مع المقاولين القدامى بدون كود
2. ✅ **الأداء:** لا يؤثر على سرعة التطبيق
3. ✅ **لا تغيير في البيانات:** فقط ترتيب العرض تغير، البيانات نفسها لم تتغير
4. ✅ **يعمل في كل مكان:** جميع القوائم الآن مرتبة حسب الكود

---

## 📋 **قائمة التحقق**

- [x] إضافة دالة `extractContractorCodeNumber()`
- [x] إضافة دالة `sortByContractorCode()`
- [x] تطبيق في `getActiveApprovedEntities()`
- [x] تطبيق في `getFilteredApprovedEntities()`
- [x] إضافة حقل `code` في `getAllContractorsForModules()`
- [x] تطبيق الترتيب في `getAllContractorsForModules()`
- [ ] اختبار من المستخدم

---

## 🎉 **الخلاصة**

### **التغيير:**
✅ **ترتيب المقاولين من حسب الاسم/التاريخ → حسب كود المقاول (CON-001, CON-002, ...)**

### **الفائدة:**
🎯 **سهولة إيجاد المقاولين وترتيب منطقي**

### **الأماكن المتأثرة:**
📍 **قائمة المقاولين المعتمدين + جميع القوائم المنسدلة في المديولات الأخرى**

---

**آخر تحديث:** 2026-01-19  
**الحالة:** ✅ **تم التطبيق - جاهز للاختبار**  
**التأثير:** 🟢 **إيجابي - تحسين تجربة المستخدم**

---

**🌟 تم تطبيق الترتيب حسب كود المقاول بنجاح!**
