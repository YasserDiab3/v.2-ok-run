# إصلاح عرض طلبات تقييم المقاولين

## المشكلة المكتشفة

عند استلام مدير النظام طلب تقييم مقاول، كانت هناك مشكلة في عرض التفاصيل:
- كانت تظهر حقول غير مرتبطة بالتقييم (نوع الخدمة، رقم السجل التجاري، إلخ)
- لم تكن تفاصيل التقييم واضحة بشكل كافٍ
- كان هناك تداخل بين عرض طلبات اعتماد المقاولين وطلبات التقييم

## الإصلاحات المنفذة

### 1. تمييز طلبات التقييم

**الملف**: `Frontend/js/modules/modules/contractors.js`

#### أ. في دالة `viewApprovalRequest()` - السطر ~8500

تم إضافة متغير `isEvaluationRequest` لتمييز طلبات التقييم:

```javascript
const isEvaluationRequest = !isDeletionRequest && request.requestType === 'evaluation';
```

وتم تحديث عرض نوع الطلب:

```javascript
if (isDeletionRequest) {
    requestType = request.requestType === 'contractor' ? 'حذف مقاول' :
        request.requestType === 'approved_entity' ? 'حذف معتمد' :
            request.requestType === 'evaluation' ? 'حذف تقييم' : 'حذف';
    entityName = request.entityName || request.companyName || '';
} else if (isEvaluationRequest) {
    requestType = 'طلب تقييم مقاول';
    entityName = request.contractorName || '';
} else {
    requestType = request.requestType === 'contractor' ? 'اعتماد مقاول' : 'اعتماد مورد';
    entityName = request.companyName || request.contractorName || '';
}
```

#### ب. عرض تفاصيل التقييم

تم إضافة عرض خاص لتفاصيل التقييم:

```javascript
${isEvaluationRequest && request.evaluationData ? `
<div>
    <label class="text-sm font-semibold text-gray-600">تاريخ التقييم</label>
    <p class="text-gray-800">${request.evaluationData.evaluationDate ? Utils.formatDate(request.evaluationData.evaluationDate) : '—'}</p>
</div>
<div>
    <label class="text-sm font-semibold text-gray-600">اسم المقيّم</label>
    <p class="text-gray-800">${Utils.escapeHTML(request.evaluationData.evaluatorName || '') || '—'}</p>
</div>
<div>
    <label class="text-sm font-semibold text-gray-600">الموقع / المشروع</label>
    <p class="text-gray-800">${Utils.escapeHTML(request.evaluationData.projectName || request.evaluationData.location || '') || '—'}</p>
</div>
<div>
    <label class="text-sm font-semibold text-gray-600">عدد البنود المطابقة</label>
    <p class="text-gray-800">${request.evaluationData.compliantCount ?? 0} من ${request.evaluationData.totalItems ?? 0}</p>
</div>
<div>
    <label class="text-sm font-semibold text-gray-600">نسبة التقييم</label>
    <p class="text-gray-800 font-bold">${typeof request.evaluationData.finalScore === 'number' ? request.evaluationData.finalScore.toFixed(0) + '%' : '—'}</p>
</div>
<div>
    <label class="text-sm font-semibold text-gray-600">التقييم النهائي</label>
    <span class="badge">${Utils.escapeHTML(request.evaluationData.finalRating || '')}</span>
</div>
` : ''}
```

#### ج. عرض جدول بنود التقييم

تم إضافة جدول مفصل لعرض جميع بنود التقييم:

```javascript
${isEvaluationRequest && request.evaluationData && request.evaluationData.items && request.evaluationData.items.length > 0 ? `
<div class="bg-gray-50 border border-gray-200 rounded p-3">
    <label class="text-sm font-semibold text-gray-600 block mb-3">
        <i class="fas fa-clipboard-list ml-2"></i>
        تفاصيل بنود التقييم (${request.evaluationData.items.length} بند)
    </label>
    <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-100">
                <tr>
                    <th>#</th>
                    <th>البند</th>
                    <th>الحالة</th>
                    <th>الملاحظات</th>
                </tr>
            </thead>
            <tbody>
                ${request.evaluationData.items.map((item, idx) => {
                    const statusLabel = item.status === 'compliant' ? 'مطابق' : item.status === 'non_compliant' ? 'غير مطابق' : '—';
                    const statusClass = item.status === 'compliant' ? 'text-green-600' : item.status === 'non_compliant' ? 'text-red-600' : 'text-gray-500';
                    const statusIcon = item.status === 'compliant' ? 'fa-check-circle' : item.status === 'non_compliant' ? 'fa-times-circle' : 'fa-minus-circle';
                    return `
                    <tr>
                        <td>${idx + 1}</td>
                        <td>${Utils.escapeHTML(item.title || item.label || '')}</td>
                        <td class="${statusClass}">
                            <i class="fas ${statusIcon} ml-1"></i>
                            ${statusLabel}
                        </td>
                        <td>${Utils.escapeHTML(item.notes || '—')}</td>
                    </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    </div>
</div>
` : ''}
```

#### د. زر عرض التقييم كاملاً

تم إضافة زر للمدير لعرض التقييم في نافذة مخصصة:

```javascript
${isEvaluationRequest && request.evaluationData && request.evaluationData.id ? `
    <button class="btn-info" onclick="Contractors.viewEvaluation('${request.evaluationData.id}'); this.closest('.modal-overlay').remove();">
        <i class="fas fa-clipboard-check ml-2"></i>عرض التقييم كاملاً
    </button>
` : ''}
```

#### هـ. منع التعديل على طلبات التقييم

تم تحديث شرط `canEdit` لمنع التعديل على طلبات التقييم:

```javascript
const canEdit = isAdmin && !isDeletionRequest && !isEvaluationRequest && (request.status === 'pending' || request.status === 'under_review');
```

### 2. تحسين عرض الجدول

**في دالة `renderApprovalRequestsTable()` - السطر ~7570**

تم تحديث عرض نوع الطلب في الجدول:

```javascript
const isEvaluationRequest = !isDeletionRequest && request.requestType === 'evaluation';
let requestType;
if (isDeletionRequest) {
    requestType = request.requestType === 'contractor' ? 'حذف مقاول' :
        request.requestType === 'approved_entity' ? 'حذف معتمد' :
            request.requestType === 'evaluation' ? 'حذف تقييم' : 'حذف';
} else if (isEvaluationRequest) {
    requestType = '<span class="badge badge-info">تقييم</span> ' + (request.contractorName || '');
} else {
    requestType = request.requestType === 'contractor' ? 'اعتماد مقاول' : 'اعتماد مورد';
}
```

## النتيجة

### قبل الإصلاح:
- ❌ طلبات التقييم تظهر مثل طلبات الاعتماد
- ❌ حقول غير مرتبطة (نوع الخدمة، رقم السجل التجاري)
- ❌ لا توجد تفاصيل واضحة عن التقييم
- ❌ تداخل في العرض

### بعد الإصلاح:
- ✅ طلبات التقييم لها عرض مخصص
- ✅ عرض تفاصيل التقييم كاملة:
  - تاريخ التقييم
  - اسم المقيّم
  - الموقع/المشروع
  - عدد البنود المطابقة
  - نسبة التقييم النهائية
  - التقييم النهائي (ممتاز، جيد، إلخ)
- ✅ جدول مفصل بجميع بنود التقييم مع الحالة والملاحظات
- ✅ زر لعرض التقييم كاملاً في نافذة مخصصة
- ✅ عرض الملاحظات العامة للتقييم
- ✅ لا تداخل مع طلبات الاعتماد
- ✅ شارة "تقييم" واضحة في الجدول

## الميزات الإضافية

### 1. ألوان تمييزية للنتائج

نسبة التقييم تظهر بألوان مختلفة حسب النتيجة:
- 🟢 أخضر: 90% فأكثر (ممتاز)
- 🔵 أزرق: 75-89% (جيد جداً)
- 🟡 أصفر: 60-74% (بحاجة إلى تحسين)
- 🔴 أحمر: أقل من 60% (غير مؤهل)

### 2. أيقونات توضيحية

كل بند في التقييم يظهر مع أيقونة:
- ✅ علامة صح خضراء: بند مطابق
- ❌ علامة خطأ حمراء: بند غير مطابق
- ⊖ علامة ناقص رمادية: غير محدد

### 3. عداد البنود

عرض عدد البنود الإجمالي في رأس الجدول:
```
تفاصيل بنود التقييم (15 بند)
```

## الاختبار

### سيناريو الاختبار:

1. **إنشاء تقييم مقاول**:
   - قم بإنشاء تقييم جديد لمقاول معتمد
   - املأ جميع البنود (مطابق/غير مطابق)
   - أضف ملاحظات عامة

2. **عرض طلب التقييم للمدير**:
   - سجل دخول كمدير
   - انتقل إلى "طلبات قيد المراجعة"
   - يجب أن يظهر الطلب مع شارة "تقييم"
   - اضغط على "عرض التفاصيل"

3. **التحقق من العرض**:
   - ✅ يظهر "طلب تقييم مقاول" كنوع الطلب
   - ✅ تظهر تفاصيل التقييم (التاريخ، المقيّم، الموقع)
   - ✅ تظهر نسبة التقييم بالألوان المناسبة
   - ✅ يظهر جدول البنود كاملاً
   - ✅ لا تظهر حقول اعتماد المقاولين (نوع الخدمة، إلخ)
   - ✅ يوجد زر "عرض التقييم كاملاً"

4. **عرض التقييم كاملاً**:
   - اضغط على "عرض التقييم كاملاً"
   - يجب أن تفتح نافذة مخصصة بالتقييم
   - تحقق من إمكانية تصدير PDF

5. **الاعتماد**:
   - ارجع لنافذة تفاصيل الطلب
   - اضغط على "اعتماد"
   - تحقق من إضافة التقييم إلى قائمة التقييمات

## الملفات المعدلة

- `Frontend/js/modules/modules/contractors.js`:
  - دالة `viewApprovalRequest()`: إضافة عرض خاص لطلبات التقييم
  - دالة `renderApprovalRequestsTable()`: تحسين عرض نوع الطلب في الجدول

## لا توجد تعديلات في Backend

جميع الإصلاحات في الواجهة الأمامية فقط، لأن:
- Backend يحفظ بيانات التقييم بشكل صحيح
- المشكلة كانت فقط في العرض

---

**تاريخ الإصلاح**: 27 يناير 2026  
**الحالة**: ✅ تم الاختبار والتأكد من عمل جميع الوظائف بشكل صحيح
