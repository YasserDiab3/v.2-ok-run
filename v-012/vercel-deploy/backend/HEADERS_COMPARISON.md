# مقارنة رؤوس الجداول: Backend vs Frontend
## تاريخ المراجعة: 2025-12-27

---

## 1. **Incidents** (الحوادث الرئيسية)

### Backend Headers:
```javascript
['id', 'isoCode', 'title', 'description', 'location', 'siteId', 'siteName', 
'sublocation', 'sublocationId', 'sublocationName', 'date', 'severity', 
'incidentType', 'reportedBy', 'employeeCode', 'employeeNumber', 'status', 
'rootCause', 'correctiveAction', 'preventiveAction', 'actionPlan', 
'affectedType', 'affectedCode', 'affectedName', 'affectedJobTitle', 
'affectedDepartment', 'affectedContact', 'image', 'attachments', 
'closureDate', 'actionOwner', 'createdBy', 'createdAt', 'updatedAt']
```

### Frontend Sends (Investigation Form):
- ✅ id
- ✅ title
- ✅ description
- ✅ location, siteId, siteName
- ✅ sublocation, sublocationId, sublocationName
- ✅ date
- ✅ severity
- ✅ incidentType
- ✅ reportedBy
- ✅ employeeCode, employeeNumber
- ✅ status
- ✅ rootCause, correctiveAction, preventiveAction
- ✅ affectedType, affectedCode, affectedName, affectedJobTitle, affectedDepartment
- ✅ image, attachments
- ✅ createdBy, createdAt, updatedAt
- ❌ **employeeName** (Frontend uses this but Backend doesn't have it)
- ❌ **employeeJob** (Frontend uses this but Backend doesn't have it)
- ❌ **employeeDepartment** (Frontend uses this but Backend doesn't have it)
- ❌ **injuryDescription** (Frontend sends but Backend doesn't have it)
- ❌ **losses** (Frontend sends but Backend doesn't have it)
- ❌ **actionsTaken** (Frontend sends but Backend doesn't have it)
- ❌ **affiliation** (Frontend sends but Backend doesn't have it)
- ❌ **contractorName** (Frontend sends but Backend doesn't have it)
- ❌ **department** (Frontend sends but Backend doesn't have it)
- ❌ **investigation** (Frontend sends as object but Backend doesn't have separate column)

### التوصية:
إضافة الحقول المفقودة إلى Backend:
```javascript
'Incidents': ['id', 'isoCode', 'title', 'description', 'location', 'siteId', 'siteName', 
'sublocation', 'sublocationId', 'sublocationName', 'date', 'severity', 
'incidentType', 'affiliation', 'department', 'reportedBy', 'employeeCode', 'employeeNumber', 
'employeeName', 'employeeJob', 'employeeDepartment', // ✅ جديد
'status', 'rootCause', 'correctiveAction', 'preventiveAction', 'actionPlan', 
'affectedType', 'affectedCode', 'affectedName', 'affectedJobTitle', 
'affectedDepartment', 'affectedContact', 
'injuryDescription', 'losses', 'actionsTaken', // ✅ جديد
'contractorName', // ✅ جديد
'image', 'attachments', 
'investigation', // ✅ جديد (will store as formatted text)
'closureDate', 'actionOwner', 'createdBy', 'createdAt', 'updatedAt']
```

---

## 2. **IncidentNotifications** (إخطارات الحوادث)

### Backend Headers:
```javascript
['id', 'notificationNumber', 'date', 'location', 'siteId', 'siteName', 
'sublocation', 'sublocationId', 'sublocationName', 'department', 
'incidentType', 'affiliation', 'contractorName', 'description', 
'injuries', 'losses', 'actions', 'reporterName', 'reporterCode', 
'createdBy', 'createdAt', 'updatedAt']
```

### Frontend Sends:
- ✅ id
- ✅ notificationNumber
- ✅ date
- ✅ location, siteId, siteName
- ✅ sublocation, sublocationId, sublocationName
- ✅ department
- ✅ incidentType
- ✅ affiliation
- ✅ contractorName
- ✅ description
- ❌ **injuries** (Backend has this but Frontend sends **injuryDescription** instead!)
- ✅ losses
- ✅ actions
- ✅ reporterName, reporterCode
- ✅ createdBy, createdAt, updatedAt
- ❌ **employeeName** (Frontend sends but Backend doesn't have it)
- ❌ **employeeJob** (Frontend sends but Backend doesn't have it)
- ❌ **employeeDepartment** (Frontend sends but Backend doesn't have it)
- ❌ **employeeCode** (Frontend sends but Backend doesn't have it)
- ❌ **injuryDescription** (Frontend sends but Backend has **injuries** instead)

### التوصية:
تعديل Backend Headers:
```javascript
'IncidentNotifications': ['id', 'notificationNumber', 'date', 'location', 'siteId', 'siteName', 
'sublocation', 'sublocationId', 'sublocationName', 'department', 
'incidentType', 'affiliation', 'contractorName', 
'employeeCode', 'employeeName', 'employeeJob', 'employeeDepartment', // ✅ جديد
'description', 
'injuryDescription', // ✅ تغيير من 'injuries'
'losses', 'actions', 
'reporterName', 'reporterCode', 
'createdBy', 'createdAt', 'updatedAt']
```

---

## 3. **SafetyAlerts** (التنبيهات الأمنية)

### Backend Headers:
```javascript
['id', 'alertNumber', 'sequentialNumber', 'incidentId', 'incidentType', 
'incidentDate', 'incidentLocation', 'who', 'description', 'facts', 
'causes', 'lessonsLearned', 'preventiveMeasures', 'locationImage', 
'causesImage', 'notificationNumber', 'preparedBy', 'approvedBy', 
'approvedAt', 'issueDate', 'status', 'createdBy', 'createdAt', 'updatedAt']
```

### Frontend Sends:
(سأفحص الكود للتأكد من الحقول المُرسلة)

---

## 4. **SickLeave** (الإجازات المرضية)

### Backend Headers:
```javascript
['id', 'personType', 'employeeCode', 'employeeNumber', 'employeeName', 
'contractorName', 'externalName', 'startDate', 'endDate', 'reason', 
'medicalNotes', 'status', 'createdAt', 'updatedAt']
```

### Frontend Sends (من Clinic module):
- ✅ id
- ✅ personType
- ✅ employeeCode, employeeNumber
- ✅ employeeName
- ✅ contractorName, externalName
- ✅ startDate, endDate
- ✅ reason
- ✅ medicalNotes
- ✅ status
- ✅ createdAt, updatedAt
- ❌ **department** (Frontend sends but Backend doesn't have it)
- ❌ **treatingDoctor** (Frontend sends from Incidents Registry but Backend doesn't have it)
- ❌ **daysCount** (Frontend calculates but Backend doesn't have it)

### التوصية:
إضافة الحقول المفقودة:
```javascript
'SickLeave': ['id', 'personType', 'employeeCode', 'employeeNumber', 'employeeName', 
'department', // ✅ جديد
'contractorName', 'externalName', 
'startDate', 'endDate', 
'daysCount', // ✅ جديد
'reason', 'medicalNotes', 
'treatingDoctor', // ✅ جديد
'status', 
'linkedRegistryId', // ✅ جديد (للربط مع سجل الحوادث)
'createdBy', // ✅ جديد
'createdAt', 'updatedAt']
```

---

## 5. **IncidentsRegistry** (سجل الحوادث - الإدخال اليدوي)

### Backend Headers:
❌ **لا يوجد شيت بهذا الاسم في Backend!**

### Frontend Uses:
- sequentialNumber
- incidentType
- factory
- incidentLocation
- incidentDate, incidentDay, incidentTime
- shift
- employeeAffiliation
- employeeCode, employeeName, employeeJob, employeeDepartment
- incidentDetails
- injuryDescription
- losses
- actionsTaken
- incidentDetailsBrief
- injuredPart
- equipmentCause
- leaveStartDate, returnToWorkDate, totalLeaveDays
- status

### التوصية:
إنشاء شيت جديد في Backend:
```javascript
'IncidentsRegistry': ['id', 'sequentialNumber', 'incidentId', 
'incidentType', 'factory', 'incidentLocation', 
'incidentDate', 'incidentDay', 'incidentTime', 'shift', 
'employeeAffiliation', 'employeeCode', 'employeeName', 'employeeJob', 'employeeDepartment', 
'incidentDetails', 'incidentDetailsBrief', 
'injuryDescription', 'injuredPart', 
'losses', 'equipmentCause', 
'actionsTaken', 
'leaveStartDate', 'returnToWorkDate', 'totalLeaveDays', 
'treatingDoctor', // من options
'status', 
'createdAt', 'updatedAt']
```

---

## ملخص المشاكل والحلول:

| المشكلة | التأثير | الحل |
|---------|---------|-----|
| **IncidentsRegistry غير موجود** | البيانات لا تُحفظ في Google Sheets | ✅ إنشاء شيت جديد |
| **injuryDescription vs injuries** | عدم تطابق الحقول | ✅ توحيد الاسم لـ `injuryDescription` |
| **حقول موظف ناقصة** | بيانات الموظف لا تُحفظ كاملة | ✅ إضافة employeeName, employeeJob, employeeDepartment |
| **حقول إجازة ناقصة** | بيانات الإجازة غير كاملة | ✅ إضافة department, treatingDoctor, daysCount |
| **investigation كـ object** | يتم تحويلها لنص | ✅ إضافة عمود investigation (سيُحفظ كنص منظم) |

---

## الإجراءات المطلوبة:

### 1. تحديث Backend/Headers.gs
```javascript
// تحديث الرؤوس الموجودة + إضافة شيت جديد
```

### 2. اختبار التطابق
- إرسال بيانات من Frontend
- التحقق من حفظها بالكامل في Backend
- التأكد من عدم فقدان أي بيانات

---

**الحالة الحالية:** ⚠️ يوجد عدم تطابق  
**بعد التصحيح:** ✅ تطابق كامل 100%

