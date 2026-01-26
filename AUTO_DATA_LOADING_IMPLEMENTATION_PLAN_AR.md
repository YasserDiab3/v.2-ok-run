# خطة تنفيذ التحميل التلقائي للبيانات بعد تسجيل الدخول
## Auto Data Loading Implementation Plan

**التاريخ:** 2024  
**الغرض:** تنفيذ نظام تحميل تلقائي للبيانات بعد تسجيل الدخول مع تحميل تدريجي (incremental loading)

---

## 📋 المتطلبات

1. **تحميل تلقائي بعد تسجيل الدخول:**
   - تحميل البيانات بشكل تلقائي في الخلفية بعد تسجيل الدخول
   - التحميل يتم حسب كل مستخدم
   - التحميل يتم من شاشة الدخول بعد تسجيل الدخول الناجح

2. **تحميل تدريجي (Incremental Loading):**
   - في حالة عدم تحميل بعض البيانات
   - عند الضغط على زر إعادة تحميل أو تحديث
   - تحميل البيانات غير المكتملة فقط (وليس جميع البيانات مرة أخرى)

---

## 🔧 التغييرات المطلوبة

### 1. تحديث AppState.syncMeta

**الملف:** `Frontend/js/modules/app-utils.js`

**التغيير المطلوب:**
```javascript
syncMeta: {
    users: 0,
    // ✅ إضافة: تتبع حالة تحميل كل ورقة
    sheets: {}, // { sheetName: timestamp }
    lastSyncTime: 0, // آخر مرة تم فيها التحميل الكامل
    userEmail: null // البريد الإلكتروني للمستخدم الحالي
}
```

### 2. تحديث GoogleIntegration.syncData

**الملف:** `Frontend/js/modules/services/google-integration.js`

**التغييرات المطلوبة:**

#### أ. دعم تحميل الأوراق غير المكتملة فقط:
```javascript
async syncData(options = {}) {
    const {
        silent = false,
        showLoader = false,
        notifyOnSuccess = !silent,
        notifyOnError = !silent,
        includeUsersSheet = true,
        sheets: requestedSheets = null,
        incremental = false // ✅ جديد: تحميل تدريجي
    } = options;

    // ✅ إضافة: تحديد الأوراق المطلوب تحميلها
    let sheetsToLoad = requestedSheets;
    
    if (incremental) {
        // ✅ تحميل تدريجي: تحميل الأوراق غير المكتملة فقط
        sheetsToLoad = this.getIncompleteSheets();
    }
    
    // ... باقي الكود ...
}
```

#### ب. إضافة دالة لتحديد الأوراق غير المكتملة:
```javascript
/**
 * تحديد الأوراق غير المكتملة (التي لم يتم تحميلها أو فشل تحميلها)
 */
getIncompleteSheets() {
    if (!AppState.syncMeta || !AppState.syncMeta.sheets) {
        // إذا لم يكن هناك تتبع، نعيد جميع الأوراق
        return null;
    }
    
    const allSheets = [
        'Users', 'Employees', 'Contractors', 'ApprovedContractors',
        'Incidents', 'NearMiss', 'PTW', 'PTWRegistry',
        'Training', 'ClinicVisits', 'Medications', 'SickLeave',
        'Injuries', 'ClinicInventory', 'FireEquipment',
        'DailyObservations', 'Violations', 'PPE',
        // ... باقي الأوراق ...
    ];
    
    const incompleteSheets = [];
    const currentTime = Date.now();
    const syncTimeout = 5 * 60 * 1000; // 5 دقائق
    
    // التحقق من كل ورقة
    allSheets.forEach(sheetName => {
        const lastSync = AppState.syncMeta.sheets[sheetName] || 0;
        const isExpired = (currentTime - lastSync) > syncTimeout;
        const hasData = AppState.appData[this.getSheetKey(sheetName)];
        const isLoaded = Array.isArray(hasData) && hasData.length > 0;
        
        // إذا لم يتم تحميلها أو انتهت صلاحيتها
        if (!lastSync || isExpired || !isLoaded) {
            incompleteSheets.push(sheetName);
        }
    });
    
    return incompleteSheets.length > 0 ? incompleteSheets : null;
}
```

#### ج. تحديث syncMeta بعد كل تحميل ناجح:
```javascript
// في syncData، بعد نجاح تحميل ورقة
results.forEach((result, index) => {
    const { sheetName, data, error, success } = result;
    const key = sheetMapping[sheetName];
    
    if (success && Array.isArray(data)) {
        AppState.appData[key] = data;
        
        // ✅ إضافة: تحديث syncMeta
        if (!AppState.syncMeta.sheets) {
            AppState.syncMeta.sheets = {};
        }
        AppState.syncMeta.sheets[sheetName] = Date.now();
        AppState.syncMeta.lastSyncTime = Date.now();
        AppState.syncMeta.userEmail = AppState.currentUser?.email || null;
        
        // ... باقي الكود ...
    }
});
```

### 3. تحديث UI.showMainApp

**الملف:** `Frontend/js/modules/app-ui.js`

**التغييرات المطلوبة:**

```javascript
async showMainApp() {
    // ... الكود الحالي ...
    
    // ✅ إضافة: تحميل البيانات تلقائياً بعد تسجيل الدخول
    (async () => {
        try {
            // تحميل البيانات المحلية أولاً
            if (typeof DataManager !== 'undefined' && DataManager.load) {
                await DataManager.load();
            }
            
            // ✅ تحميل البيانات من Google Sheets تلقائياً
            if (AppState.currentUser && 
                AppState.googleConfig?.appsScript?.enabled && 
                typeof GoogleIntegration !== 'undefined' &&
                typeof GoogleIntegration.syncData === 'function') {
                
                // تحميل البيانات في الخلفية (silent = true)
                GoogleIntegration.syncData({
                    silent: true, // تحميل صامت في الخلفية
                    showLoader: false, // لا نعرض loader
                    notifyOnSuccess: false, // لا نعرض إشعارات
                    notifyOnError: false,
                    incremental: false // تحميل كامل أول مرة
                }).catch(error => {
                    Utils.safeWarn('⚠️ فشل التحميل التلقائي للبيانات:', error);
                });
            }
        } catch (error) {
            Utils.safeWarn('⚠️ خطأ في تحميل البيانات التلقائي:', error);
        }
    })();
    
    // ... باقي الكود ...
}
```

### 4. تحديث زر إعادة التحميل

**الملف:** `Frontend/js/modules/app-ui.js`

**التغييرات المطلوبة:**

```javascript
async handleSyncData() {
    // ... الكود الحالي ...
    
    try {
        // ✅ استخدام تحميل تدريجي (incremental)
        if (typeof GoogleIntegration.syncData === 'function') {
            syncResult = await GoogleIntegration.syncData({
                silent: false,
                showLoader: true,
                notifyOnSuccess: true,
                notifyOnError: true,
                incremental: true // ✅ تحميل تدريجي: البيانات غير المكتملة فقط
            });
        }
        
        // ... باقي الكود ...
    } catch (error) {
        // ... معالجة الأخطاء ...
    }
}
```

### 5. حفظ syncMeta في localStorage

**الملف:** `Frontend/js/modules/services/data-manager.js`

**التغييرات المطلوبة:**

```javascript
// في دالة save()
save() {
    try {
        // ... الكود الحالي ...
        
        // ✅ حفظ syncMeta
        if (AppState.syncMeta) {
            localStorage.setItem('hse_sync_meta', Utils.safeStringify(AppState.syncMeta));
        }
        
        // ... باقي الكود ...
    } catch (error) {
        // ... معالجة الأخطاء ...
    }
}

// في دالة load()
async load() {
    try {
        // ... الكود الحالي ...
        
        // ✅ تحميل syncMeta
        try {
            const syncMetaStr = localStorage.getItem('hse_sync_meta');
            if (syncMetaStr) {
                const savedSyncMeta = JSON.parse(syncMetaStr);
                // التحقق من أن syncMeta ينتمي للمستخدم الحالي
                if (savedSyncMeta.userEmail === AppState.currentUser?.email) {
                    AppState.syncMeta = {
                        ...AppState.syncMeta,
                        ...savedSyncMeta
                    };
                }
            }
        } catch (e) {
            // تجاهل الأخطاء
        }
        
        // ... باقي الكود ...
    } catch (error) {
        // ... معالجة الأخطاء ...
    }
}
```

---

## 📝 خطوات التنفيذ

### المرحلة 1: تحديث AppState.syncMeta
1. تحديث `Frontend/js/modules/app-utils.js`
2. إضافة حقول `sheets`, `lastSyncTime`, `userEmail` إلى `syncMeta`

### المرحلة 2: تحديث GoogleIntegration.syncData
1. إضافة دالة `getIncompleteSheets()`
2. تحديث `syncData()` لدعم `incremental` option
3. تحديث `syncMeta` بعد كل تحميل ناجح

### المرحلة 3: تحديث UI.showMainApp
1. إضافة تحميل تلقائي بعد تسجيل الدخول
2. استخدام `silent: true` للتحميل في الخلفية

### المرحلة 4: تحديث زر إعادة التحميل
1. تحديث `handleSyncData()` لاستخدام `incremental: true`
2. تحميل البيانات غير المكتملة فقط

### المرحلة 5: حفظ syncMeta
1. تحديث `DataManager.save()` لحفظ `syncMeta`
2. تحديث `DataManager.load()` لتحميل `syncMeta`
3. التحقق من أن `syncMeta` ينتمي للمستخدم الحالي

---

## ✅ الاختبار

### اختبار 1: التحميل التلقائي بعد تسجيل الدخول
1. تسجيل الدخول كمستخدم جديد
2. التحقق من تحميل البيانات تلقائياً في الخلفية
3. التحقق من تحديث `syncMeta`

### اختبار 2: التحميل التدريجي
1. تسجيل الدخول
2. انتظار اكتمال التحميل الأولي
3. إيقاف تحميل بعض الأوراق (محاكاة فشل)
4. الضغط على زر إعادة التحميل
5. التحقق من تحميل الأوراق غير المكتملة فقط

### اختبار 3: التحقق من syncMeta
1. تسجيل الدخول
2. انتظار اكتمال التحميل
3. تسجيل الخروج
4. تسجيل الدخول مرة أخرى
5. التحقق من أن `syncMeta` محفوظ ومحمّل بشكل صحيح

---

## 🔍 ملاحظات مهمة

1. **التحقق من المستخدم:**
   - يجب التحقق من أن `syncMeta` ينتمي للمستخدم الحالي
   - إذا تغير المستخدم، يجب مسح `syncMeta` وبدء تحميل جديد

2. **التحميل التدريجي:**
   - يجب تحديد الأوراق غير المكتملة بدقة
   - يجب التحقق من انتهاء صلاحية البيانات (5 دقائق كحد أقصى)

3. **الأداء:**
   - التحميل التلقائي يجب أن يكون صامتاً (silent)
   - لا يجب عرض loader أو إشعارات أثناء التحميل التلقائي
   - التحميل التدريجي يجب أن يكون سريعاً (الأوراق غير المكتملة فقط)

---

**تم إعداد الخطة بواسطة:** نظام التخطيط  
**تاريخ المراجعة:** 2024  
**الإصدار:** 1.0
