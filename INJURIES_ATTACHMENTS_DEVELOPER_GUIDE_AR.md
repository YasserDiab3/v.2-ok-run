# دليل المطور - نظام المرفقات في تبويب الإصابات
# Developer Guide - Injuries Attachments System

## نظرة عامة

هذا الدليل يشرح كيفية عمل نظام المرفقات في تبويب الإصابات والدوال المتاحة للاستخدام.

---

## 🏗️ البنية المعمارية

### 1. تخزين الحالة (State Management)

المرفقات الحالية تُخزن في:
```javascript
Clinic.state.currentInjuryAttachments = []
```

**شكل البيانات:**
```javascript
{
    id: 'ATT_xyz123',              // معرف فريد للمرفق
    name: 'injury-photo.jpg',       // اسم الملف الأصلي
    type: 'image/jpeg',             // نوع MIME
    data: 'data:image/jpeg;base64,...', // البيانات بصيغة Base64
    size: 256,                      // الحجم بالكيلوبايت
    uploadedAt: '2026-01-18T12:00:00.000Z' // تاريخ الرفع
}
```

---

## 📦 الدوال المتاحة

### 1. `handleInjuryAttachmentsChange(fileList)`

**الوظيفة:** معالجة تحميل المرفقات من حقل الإدخال

**المعاملات:**
- `fileList` (FileList): قائمة الملفات من عنصر `<input type="file">`

**المثال:**
```javascript
const input = document.getElementById('injury-attachments-input');
input.addEventListener('change', async (event) => {
    await Clinic.handleInjuryAttachmentsChange(event.target.files);
});
```

**العملية:**
1. التحقق من وجود ملفات
2. التحقق من صيغة كل ملف (JPG, PNG, PDF فقط)
3. التحقق من حجم كل ملف (5MB كحد أقصى)
4. تحويل الملف إلى Base64
5. إضافة الملف إلى `state.currentInjuryAttachments`
6. تحديث المعاينة تلقائياً
7. مسح حقل الإدخال

**الاستثناءات:**
- إظهار تحذير للملفات غير المدعومة
- إظهار تحذير للملفات الكبيرة
- إظهار خطأ عند فشل القراءة

---

### 2. `renderInjuryAttachmentsPreview()`

**الوظيفة:** عرض معاينة المرفقات المحملة

**المعاملات:** لا يوجد

**المثال:**
```javascript
Clinic.renderInjuryAttachmentsPreview();
```

**الإخراج:**
- HTML يُحقن في عنصر `#injury-attachments-preview`
- كل مرفق يُعرض في كارت منفصل
- أيقونات مختلفة للصور (fa-image) و PDF (fa-file-pdf)
- أزرار للمعاينة (للصور) والحذف

**المنطق:**
```javascript
if (attachments.length === 0) {
    // عرض رسالة "لم يتم إضافة مرفقات بعد"
} else {
    // عرض كل مرفق في كارت
    attachments.map((att, index) => {
        // عرض الأيقونة، الاسم، الحجم
        // أزرار المعاينة (للصور) والحذف
    })
}
```

---

### 3. `removeInjuryAttachment(index)`

**الوظيفة:** حذف مرفق من القائمة

**المعاملات:**
- `index` (Number): فهرس المرفق في المصفوفة

**المثال:**
```javascript
// من HTML
<button onclick="Clinic.removeInjuryAttachment(0)">حذف</button>

// من JavaScript
Clinic.removeInjuryAttachment(0);
```

**العملية:**
1. التحقق من صحة الفهرس
2. حذف المرفق من `state.currentInjuryAttachments`
3. تحديث المعاينة
4. إظهار رسالة نجاح

---

### 4. `previewAttachment(index)`

**الوظيفة:** معاينة صورة في نافذة منبثقة

**المعاملات:**
- `index` (Number): فهرس المرفق في المصفوفة

**المثال:**
```javascript
// من HTML
<button onclick="Clinic.previewAttachment(0)">معاينة</button>

// من JavaScript
Clinic.previewAttachment(0);
```

**العملية:**
1. التحقق من أن المرفق صورة
2. إنشاء modal جديد
3. عرض الصورة بحجم كبير
4. إضافة زر إغلاق
5. السماح بالإغلاق بالنقر خارج النافذة

**ملاحظة:** هذه الدالة تعمل فقط مع الصور (image/*)

---

### 5. `readFileAsBase64(file)`

**الوظيفة:** تحويل ملف إلى Base64

**المعاملات:**
- `file` (File): كائن الملف

**القيمة المُرجعة:**
- `Promise<string>`: البيانات بصيغة Base64

**المثال:**
```javascript
const file = input.files[0];
try {
    const base64 = await Clinic.readFileAsBase64(file);
    console.log('Base64:', base64);
} catch (error) {
    console.error('خطأ في القراءة:', error);
}
```

**التطبيق:**
```javascript
readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}
```

---

### 6. `detectMimeType(filename)`

**الوظيفة:** اكتشاف نوع MIME من اسم الملف

**المعاملات:**
- `filename` (String): اسم الملف

**القيمة المُرجعة:**
- `string`: نوع MIME

**المثال:**
```javascript
const type = Clinic.detectMimeType('photo.jpg');
console.log(type); // 'image/jpeg'

const type2 = Clinic.detectMimeType('document.pdf');
console.log(type2); // 'application/pdf'
```

**الأنواع المدعومة:**
```javascript
{
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'pdf': 'application/pdf'
}
```

**القيمة الافتراضية:** `'application/octet-stream'` للامتدادات غير المعروفة

---

## 🔄 دورة حياة المرفقات

### 1. عند فتح نموذج جديد
```javascript
async showInjuryForm(record = null) {
    // تهيئة المرفقات
    this.state.currentInjuryAttachments = Array.isArray(record?.attachments)
        ? record.attachments.map(att => this.normalizeAttachment(att)).filter(Boolean)
        : [];
    
    // عرض المعاينة
    if (typeof this.renderInjuryAttachmentsPreview === 'function') {
        this.renderInjuryAttachmentsPreview();
    }
}
```

### 2. عند تحميل ملف
```javascript
attachmentsInput.addEventListener('change', async (event) => {
    await this.handleInjuryAttachmentsChange(event.target.files);
    // المعاينة تُحدَّث تلقائياً داخل الدالة
});
```

### 3. عند الحفظ
```javascript
const payload = this.normalizeInjuryRecord({
    // ... بيانات أخرى
    attachments: this.state.currentInjuryAttachments.map(att => ({ ...att }))
});
```

### 4. عند الإغلاق
```javascript
const resetStateAndClose = () => {
    this.state.currentInjuryAttachments = [];
    modal.remove();
};
```

---

## 📝 أمثلة الاستخدام

### مثال 1: تحميل ملف واحد

```html
<input type="file" id="injury-attachments-input" accept=".png,.jpg,.jpeg,.pdf">
```

```javascript
const input = document.getElementById('injury-attachments-input');
input.addEventListener('change', async (event) => {
    await Clinic.handleInjuryAttachmentsChange(event.target.files);
    console.log('تم تحميل', Clinic.state.currentInjuryAttachments.length, 'مرفق');
});
```

---

### مثال 2: تحميل ملفات متعددة

```html
<input type="file" id="injury-attachments-input" accept=".png,.jpg,.jpeg,.pdf" multiple>
```

```javascript
// نفس الكود - الدالة تدعم ملفات متعددة تلقائياً
```

---

### مثال 3: الوصول إلى المرفقات

```javascript
// الحصول على عدد المرفقات
const count = Clinic.state.currentInjuryAttachments.length;

// الوصول إلى مرفق معين
const firstAttachment = Clinic.state.currentInjuryAttachments[0];

// تصفح جميع المرفقات
Clinic.state.currentInjuryAttachments.forEach((att, index) => {
    console.log(`${index + 1}. ${att.name} (${att.size} KB)`);
});
```

---

### مثال 4: تنظيف المرفقات

```javascript
// حذف مرفق واحد
Clinic.removeInjuryAttachment(0);

// حذف جميع المرفقات
Clinic.state.currentInjuryAttachments = [];
Clinic.renderInjuryAttachmentsPreview();
```

---

## 🔍 التحقق من الملفات

### 1. الصيغ المدعومة

```javascript
const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf'];
const extension = (file.name.split('.').pop() || '').toLowerCase();

if (!allowedExtensions.includes(extension)) {
    Notification.warning(`الملف ${file.name} غير مدعوم`);
    return;
}
```

### 2. الحجم الأقصى

```javascript
const maxSize = 5 * 1024 * 1024; // 5MB

if (file.size > maxSize) {
    Notification.warning(`الملف ${file.name} يتجاوز الحد الأقصى`);
    return;
}
```

---

## 🎨 تخصيص العرض

### تغيير أيقونات الملفات

```javascript
renderInjuryAttachmentsPreview() {
    const container = document.getElementById('injury-attachments-preview');
    
    container.innerHTML = this.state.currentInjuryAttachments.map((att, index) => {
        // تخصيص الأيقونات
        let icon = 'fa-file';
        if (att.type.startsWith('image/')) {
            icon = 'fa-image';
        } else if (att.type === 'application/pdf') {
            icon = 'fa-file-pdf';
        }
        
        return `
            <div class="attachment-card">
                <i class="fas ${icon}"></i>
                <span>${att.name}</span>
            </div>
        `;
    }).join('');
}
```

---

### تغيير تصميم الكارت

```css
.attachment-card {
    display: flex;
    align-items: center;
    padding: 12px;
    background: #f7fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    margin-bottom: 8px;
}

.attachment-card i {
    color: #3b82f6;
    font-size: 24px;
    margin-left: 12px;
}
```

---

## 🐛 معالجة الأخطاء

### 1. خطأ في القراءة

```javascript
try {
    const base64 = await this.readFileAsBase64(file);
    // المعالجة
} catch (error) {
    Utils.safeError('فشل تحميل الملف:', error);
    Notification.error(`تعذر تحميل الملف ${file.name}`);
}
```

### 2. ملف غير موجود

```javascript
if (index < 0 || index >= this.state.currentInjuryAttachments.length) {
    console.warn('فهرس المرفق غير صحيح');
    return;
}
```

### 3. نوع MIME غير صحيح

```javascript
const type = file.type || this.detectMimeType(file.name);
if (!type || type === 'application/octet-stream') {
    console.warn('نوع الملف غير معروف');
}
```

---

## 🔒 الأمان

### 1. التحقق من المحتوى

```javascript
// التحقق من أن الملف ليس تنفيذياً
const dangerousExtensions = ['exe', 'bat', 'cmd', 'sh'];
const ext = (file.name.split('.').pop() || '').toLowerCase();

if (dangerousExtensions.includes(ext)) {
    Notification.error('نوع الملف غير آمن');
    return;
}
```

### 2. تنظيف الأسماء

```javascript
// استخدام Utils.escapeHTML لتنظيف الأسماء
const safeName = Utils.escapeHTML(attachment.name);
```

### 3. حجم البيانات

```javascript
// التأكد من عدم تجاوز حد التخزين
const totalSize = this.state.currentInjuryAttachments.reduce(
    (sum, att) => sum + att.size, 
    0
);

if (totalSize > 50 * 1024) { // 50MB إجمالي
    Notification.warning('الحد الأقصى للمرفقات الإجمالي 50MB');
    return;
}
```

---

## 📊 الأداء

### 1. تحسين القراءة

```javascript
// قراءة الملفات بالتوازي
async handleMultipleFiles(files) {
    const promises = files.map(file => this.readFileAsBase64(file));
    const results = await Promise.all(promises);
    return results;
}
```

### 2. ضغط الصور (مستقبلي)

```javascript
async compressImage(file, maxWidth = 1920) {
    // استخدام Canvas API لضغط الصورة
    // إرجاع Base64 المضغوط
}
```

### 3. التحميل التدريجي (مستقبلي)

```javascript
async uploadChunked(file, chunkSize = 1024 * 1024) {
    // تقسيم الملف إلى أجزاء
    // رفع كل جزء على حدة
    // دمج الأجزاء في الخادم
}
```

---

## 🧪 الاختبار

### اختبار الوحدات (Unit Tests)

```javascript
describe('Clinic Attachments', () => {
    test('detectMimeType should return correct type', () => {
        expect(Clinic.detectMimeType('test.jpg')).toBe('image/jpeg');
        expect(Clinic.detectMimeType('test.pdf')).toBe('application/pdf');
    });
    
    test('removeInjuryAttachment should remove attachment', () => {
        Clinic.state.currentInjuryAttachments = [
            { id: '1', name: 'test1.jpg' },
            { id: '2', name: 'test2.jpg' }
        ];
        
        Clinic.removeInjuryAttachment(0);
        
        expect(Clinic.state.currentInjuryAttachments.length).toBe(1);
        expect(Clinic.state.currentInjuryAttachments[0].id).toBe('2');
    });
});
```

---

## 📚 المراجع

### واجهات برمجية ذات صلة

1. **FileReader API**
   - https://developer.mozilla.org/en-US/docs/Web/API/FileReader

2. **File API**
   - https://developer.mozilla.org/en-US/docs/Web/API/File

3. **Base64 Encoding**
   - https://developer.mozilla.org/en-US/docs/Web/API/btoa

---

## 🤝 المساهمة

عند إضافة ميزات جديدة:

1. اتبع نفس نمط الكود الموجود
2. أضف التعليقات بالعربية
3. اختبر على متصفحات متعددة
4. حدّث هذا الدليل

---

## 📞 الدعم الفني

للاستفسارات أو المشاكل، يرجى التواصل مع فريق التطوير.

---

**آخر تحديث:** 2026-01-18  
**النسخة:** 1.0  
**المطور:** AI Assistant
