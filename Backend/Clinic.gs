/**
 * Google Apps Script for HSE System - Clinic Module
 * 
 * موديول العيادة - النسخة المحسنة
 */

/**
 * ============================================
 * زيارات العيادة (Clinic Visits)
 * ============================================
 */

/**
 * تحويل قائمة الأدوية (array أو JSON string) إلى نص قابل للتخزين (بدون JSON) + إجمالي كمية
 */
function flattenDispensedMedications_(medications) {
    let medsArr = [];
    try {
        if (!medications) {
            medsArr = [];
        } else if (Array.isArray(medications)) {
            medsArr = medications;
        } else if (typeof medications === 'string') {
            const s = medications.trim();
            if (!s) medsArr = [];
            else {
                const parsed = JSON.parse(s);
                medsArr = Array.isArray(parsed) ? parsed : [];
            }
        } else {
            medsArr = [];
        }
    } catch (e) {
        medsArr = [];
    }

    const parts = [];
    let totalQty = 0;
    medsArr.forEach(m => {
        if (!m || typeof m !== 'object') return;
        const name = (m.medicationName || m.name || '').toString().trim();
        const qty = parseInt(m.quantity, 10) || 0;
        if (name) {
            parts.push(name + (qty ? ` (${qty})` : ''));
        }
        totalQty += qty;
    });

    return {
        medicationsDispensed: parts.length ? parts.join('، ') : '',
        medicationsDispensedQty: totalQty
    };
}

/**
 * إعادة بناء قائمة أدوية منصرفة من نص (بدون JSON في الشيت)
 * صيغة النص: "Paracetamol (2)، Ibuprofen (1)" أو "Paracetamol، Ibuprofen"
 */
function parseDispensedMedicationsText_(text) {
    const s = (text || '').toString().trim();
    if (!s) return [];

    // split by Arabic comma or normal comma
    const parts = s.split(/،|,/).map(p => p.trim()).filter(Boolean);
    const result = [];

    parts.forEach(p => {
        // match "name (qty)"
        const m = p.match(/^(.*?)(?:\(\s*(\d+)\s*\))?$/);
        if (!m) return;
        const name = (m[1] || '').trim();
        const qty = m[2] ? parseInt(m[2], 10) : 1;
        if (!name) return;
        result.push({ medicationName: name, quantity: isNaN(qty) ? 1 : qty });
    });

    return result;
}

/**
 * تجهيز سجل الزيارة للكتابة في الشيت بدون أي حقول JSON
 */
function normalizeClinicVisitForSheet_(visitData) {
    const v = visitData && typeof visitData === 'object' ? visitData : {};
    const flattened = flattenDispensedMedications_(v.medications);

    // نحذف/نمنع أي حقول قد تُخزن كـ JSON
    const clean = {};
    for (var k in v) {
        if (!v.hasOwnProperty(k)) continue;
        if (k === 'medications') continue; // منع JSON array
        clean[k] = v[k];
    }

    // حقول مسطحة للأدوية
    clean.medicationsDispensed = flattened.medicationsDispensed;
    clean.medicationsDispensedQty = flattened.medicationsDispensedQty;

    return clean;
}

/**
 * تحديد اسم الشيت الصحيح حسب نوع الشخص
 * - employee/undefined -> ClinicVisits
 * - contractor/external -> ClinicContractorVisits
 */
function getClinicVisitSheetName_(visitData) {
    const type = (visitData && visitData.personType) ? String(visitData.personType) : '';
    if (type === 'contractor' || type === 'external') return 'ClinicContractorVisits';
    return 'ClinicVisits';
}

/**
 * إضافة زيارة عيادة
 */
function addClinicVisitToSheet(visitData) {
    try {
        if (!visitData) {
            return { success: false, message: 'بيانات الزيارة غير موجودة' };
        }
        
        const sheetName = getClinicVisitSheetName_(visitData);
        const normalized = normalizeClinicVisitForSheet_(visitData);
        
        // إضافة حقول تلقائية
        if (!normalized.id) {
            normalized.id = generateSequentialId('CLV', sheetName);
        }
        if (!normalized.createdAt) {
            normalized.createdAt = new Date();
        }
        if (!normalized.updatedAt) {
            normalized.updatedAt = new Date();
        }
        
        // ✅ إضافة createdBy و updatedBy (تخزين كنص فقط)
        if (normalized.createdBy && typeof normalized.createdBy === 'object') {
            normalized.createdBy = (normalized.createdBy.name || normalized.createdBy.email || '').toString();
        }
        if (normalized.updatedBy && typeof normalized.updatedBy === 'object') {
            normalized.updatedBy = (normalized.updatedBy.name || normalized.updatedBy.email || '').toString();
        }
        // إذا لم يتم تمرير createdBy، نستخدم القيمة الافتراضية
        if (!normalized.createdBy) {
            normalized.createdBy = 'النظام';
        }
        // إذا لم يتم تمرير updatedBy، نستخدم createdBy أو القيمة الافتراضية
        if (!normalized.updatedBy) {
            normalized.updatedBy = normalized.createdBy || 'النظام';
        }
        
        return appendToSheet(sheetName, normalized);
    } catch (error) {
        Logger.log('Error in addClinicVisitToSheet: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء إضافة الزيارة: ' + error.toString() };
    }
}

/**
 * تحديث زيارة عيادة
 */
function updateClinicVisit(visitId, updateData) {
    try {
        if (!visitId) {
            return { success: false, message: 'معرف الزيارة غير محدد' };
        }

        const spreadsheetId = getSpreadsheetId();
        const normalizedUpdate = normalizeClinicVisitForSheet_(updateData || {});
        normalizedUpdate.updatedAt = new Date();
        
        // ✅ إضافة updatedBy (تخزين كنص فقط)
        if (normalizedUpdate.updatedBy && typeof normalizedUpdate.updatedBy === 'object') {
            normalizedUpdate.updatedBy = (normalizedUpdate.updatedBy.name || normalizedUpdate.updatedBy.email || '').toString();
        }
        if (!normalizedUpdate.updatedBy) {
            normalizedUpdate.updatedBy = 'النظام';
        }

        // نبحث في شيت الموظفين أولاً ثم شيت المقاولين/الخارجية
        const sheetCandidates = ['ClinicVisits', 'ClinicContractorVisits'];
        for (var s = 0; s < sheetCandidates.length; s++) {
            const sheetName = sheetCandidates[s];
            const data = readFromSheet(sheetName, spreadsheetId);
            const visitIndex = data.findIndex(v => v.id === visitId);
            if (visitIndex === -1) continue;

            for (var key in normalizedUpdate) {
                if (normalizedUpdate.hasOwnProperty(key)) {
                    data[visitIndex][key] = normalizedUpdate[key];
                }
            }
            return saveToSheet(sheetName, data, spreadsheetId);
        }

        return { success: false, message: 'الزيارة غير موجودة' };
    } catch (error) {
        Logger.log('Error updating clinic visit: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء تحديث الزيارة: ' + error.toString() };
    }
}

/**
 * الحصول على جميع زيارات العيادة
 */
function getAllClinicVisits(filters = {}) {
    try {
        const spreadsheetId = getSpreadsheetId();

        // ✅ تأكد من وجود الشيتات وتحديث رؤوسها (بدون تغيير البيانات)
        try {
            const ss = SpreadsheetApp.openById(spreadsheetId);
            const empSheet = createSheetWithHeaders(ss, 'ClinicVisits', {});
            ensureSheetHeaders(empSheet, 'ClinicVisits', {});

            const conSheet = createSheetWithHeaders(ss, 'ClinicContractorVisits', {});
            ensureSheetHeaders(conSheet, 'ClinicContractorVisits', {});
        } catch (e) {
            // لا نفشل القراءة إذا لم نقدر نهيئ الرؤوس لأي سبب
            Logger.log('Warning ensuring clinic sheets headers: ' + e.toString());
        }

        const employeeData = readFromSheet('ClinicVisits', spreadsheetId) || [];
        const contractorData = readFromSheet('ClinicContractorVisits', spreadsheetId) || [];
        let data = employeeData.concat(contractorData);

        // ✅ إعادة بناء medications في الـ API response فقط (بدون تخزين JSON في الشيت)
        data = data.map(v => {
            if (!v || typeof v !== 'object') return v;
            
            // التحقق من medications بشكل شامل
            let medsArray = [];
            
            // إذا كانت medications موجودة وليست فارغة
            if (v.medications) {
                if (Array.isArray(v.medications) && v.medications.length > 0) {
                    medsArray = v.medications;
                } else if (typeof v.medications === 'string' && v.medications.trim()) {
                    // محاولة parse JSON
                    try {
                        const parsed = JSON.parse(v.medications);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            medsArray = parsed;
                        }
                    } catch (e) {
                        // ليس JSON، سنستخدم medicationsDispensed بدلاً منه
                    }
                }
            }
            
            // إذا كانت medications فارغة أو غير صالحة، نحاول من medicationsDispensed
            if (medsArray.length === 0 && v.medicationsDispensed) {
                medsArray = parseDispensedMedicationsText_(v.medicationsDispensed);
            }
            
            // تعيين medications النهائي
            v.medications = medsArray;
            
            // ✅ التأكد من وجود createdBy و updatedBy (للبيانات القديمة)
            if (!v.createdBy) {
                v.createdBy = null;
            }
            if (!v.updatedBy) {
                v.updatedBy = null;
            }
            
            return v;
        });
        
        // تطبيق الفلاتر
        if (filters.employeeCode) {
            data = data.filter(v => v.employeeCode === filters.employeeCode);
        }
        if (filters.personType) {
            data = data.filter(v => v.personType === filters.personType);
        }
        if (filters.reason) {
            data = data.filter(v => v.reason === filters.reason);
        }
        if (filters.startDate) {
            data = data.filter(v => {
                if (!v.visitDate) return false;
                return new Date(v.visitDate) >= new Date(filters.startDate);
            });
        }
        if (filters.endDate) {
            data = data.filter(v => {
                if (!v.visitDate) return false;
                return new Date(v.visitDate) <= new Date(filters.endDate);
            });
        }
        
        // ترتيب حسب التاريخ
        data.sort((a, b) => {
            const dateA = new Date(a.visitDate || a.createdAt || 0);
            const dateB = new Date(b.visitDate || b.createdAt || 0);
            return dateB - dateA;
        });
        
        return { success: true, data: data, count: data.length };
    } catch (error) {
        Logger.log('Error getting all clinic visits: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء قراءة الزيارات: ' + error.toString(), data: [] };
    }
}

/**
 * ============================================
 * الأدوية (Medications)
 * ============================================
 */

/**
 * إضافة دواء
 */
function addMedicationToSheet(medicationData) {
    try {
        if (!medicationData) {
            return { success: false, message: 'بيانات الدواء غير موجودة' };
        }
        
        const sheetName = 'Medications';

        // ✅ تأكيد أن الحقول الرقمية تُحفظ كأرقام
        if (medicationData.quantityAdded !== undefined && medicationData.quantityAdded !== null) {
            medicationData.quantityAdded = parseFloat(medicationData.quantityAdded) || 0;
        }
        if (medicationData.remainingQuantity !== undefined && medicationData.remainingQuantity !== null) {
            medicationData.remainingQuantity = parseFloat(medicationData.remainingQuantity) || 0;
        }
        if (medicationData.quantity !== undefined && medicationData.quantity !== null) {
            medicationData.quantity = parseFloat(medicationData.quantity) || 0;
        }

        // ✅ تطبيع الكمية/الرصيد لضمان التوافق مع الواجهة
        // - quantityAdded = الكمية (المدخلة/المضافة)
        // - remainingQuantity = الرصيد (بعد الصرف)
        if (medicationData.quantityAdded === undefined || medicationData.quantityAdded === null) {
            if (medicationData.quantity !== undefined && medicationData.quantity !== null) {
                medicationData.quantityAdded = medicationData.quantity;
            }
        }
        if (medicationData.remainingQuantity === undefined || medicationData.remainingQuantity === null) {
            if (medicationData.quantityAdded !== undefined && medicationData.quantityAdded !== null) {
                medicationData.remainingQuantity = medicationData.quantityAdded;
            } else if (medicationData.quantity !== undefined && medicationData.quantity !== null) {
                medicationData.remainingQuantity = medicationData.quantity;
            }
        }
        
        // إضافة حقول تلقائية
        if (!medicationData.id) {
            medicationData.id = generateSequentialId('MED', sheetName);
        }
        if (!medicationData.createdAt) {
            medicationData.createdAt = new Date();
        }
        if (!medicationData.updatedAt) {
            medicationData.updatedAt = new Date();
        }
        if (!medicationData.status) {
            medicationData.status = 'ساري';
        }
        
        // ✅ منع تخزين JSON في أي خلية: createdBy يتم تخزينه كنص فقط (اسم/بريد)
        if (medicationData.createdBy && typeof medicationData.createdBy === 'object') {
            medicationData.createdBy = (medicationData.createdBy.name || medicationData.createdBy.email || '').toString();
        }
        // ✅ إضافة updatedBy (تخزين كنص فقط)
        if (medicationData.updatedBy && typeof medicationData.updatedBy === 'object') {
            medicationData.updatedBy = (medicationData.updatedBy.name || medicationData.updatedBy.email || '').toString();
        }
        if (!medicationData.updatedBy && medicationData.createdBy) {
            medicationData.updatedBy = medicationData.createdBy;
        }
        
        // حساب الأيام المتبقية للانتهاء (فقط إذا لم يكن محسوباً مسبقاً)
        if (medicationData.expiryDate && (medicationData.daysRemaining === undefined || medicationData.daysRemaining === null)) {
            const expiryDate = new Date(medicationData.expiryDate);
            const now = new Date();
            const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
            medicationData.daysRemaining = daysRemaining;
            
            // تحديث الحالة بناءً على الأيام المتبقية (فقط إذا لم تكن محددة)
            if (!medicationData.status || medicationData.status === 'ساري') {
                if (daysRemaining < 0) {
                    medicationData.status = 'منتهي';
                } else if (daysRemaining <= 30) {
                    medicationData.status = 'قريب الانتهاء';
                } else {
                    medicationData.status = 'ساري';
                }
            }
        }
        
        Logger.log('Adding medication to sheet: ' + JSON.stringify({
            id: medicationData.id,
            name: medicationData.name,
            type: medicationData.type,
            hasExpiryDate: !!medicationData.expiryDate,
            daysRemaining: medicationData.daysRemaining,
            status: medicationData.status
        }));
        
        return appendToSheet(sheetName, medicationData);
    } catch (error) {
        Logger.log('Error in addMedicationToSheet: ' + error.toString());
        Logger.log('Medication data: ' + JSON.stringify(medicationData));
        return { success: false, message: 'حدث خطأ أثناء إضافة الدواء: ' + error.toString() };
    }
}

/**
 * تحديث دواء
 */
function updateMedication(medicationId, updateData) {
    try {
        if (!medicationId) {
            return { success: false, message: 'معرف الدواء غير محدد' };
        }
        
        const sheetName = 'Medications';
        const spreadsheetId = getSpreadsheetId();
        const data = readFromSheet(sheetName, spreadsheetId);
        const medicationIndex = data.findIndex(m => m.id === medicationId);
        
        if (medicationIndex === -1) {
            return { success: false, message: 'الدواء غير موجود' };
        }
        
        updateData.updatedAt = new Date();

        // ✅ تأكيد أن الحقول الرقمية تُحفظ كأرقام
        if (updateData.quantityAdded !== undefined && updateData.quantityAdded !== null) {
            updateData.quantityAdded = parseFloat(updateData.quantityAdded) || 0;
        }
        if (updateData.remainingQuantity !== undefined && updateData.remainingQuantity !== null) {
            updateData.remainingQuantity = parseFloat(updateData.remainingQuantity) || 0;
        }
        if (updateData.quantity !== undefined && updateData.quantity !== null) {
            updateData.quantity = parseFloat(updateData.quantity) || 0;
        }

        // ✅ تطبيع الكمية/الرصيد عند التحديث أيضاً
        if (updateData.quantityAdded === undefined || updateData.quantityAdded === null) {
            if (updateData.quantity !== undefined && updateData.quantity !== null) {
                updateData.quantityAdded = updateData.quantity;
            }
        }
        if (updateData.remainingQuantity === undefined || updateData.remainingQuantity === null) {
            if (updateData.quantityAdded !== undefined && updateData.quantityAdded !== null) {
                updateData.remainingQuantity = updateData.quantityAdded;
            } else if (updateData.quantity !== undefined && updateData.quantity !== null) {
                updateData.remainingQuantity = updateData.quantity;
            }
        }

        // ✅ منع تخزين JSON في أي خلية: createdBy يتم تخزينه كنص فقط (اسم/بريد)
        if (updateData.createdBy && typeof updateData.createdBy === 'object') {
            updateData.createdBy = (updateData.createdBy.name || updateData.createdBy.email || '').toString();
        }
        // ✅ إضافة updatedBy (تخزين كنص فقط)
        if (updateData.updatedBy && typeof updateData.updatedBy === 'object') {
            updateData.updatedBy = (updateData.updatedBy.name || updateData.updatedBy.email || '').toString();
        }
        if (!updateData.updatedBy) {
            // إذا لم يتم تمرير updatedBy، نستخدم createdBy من السجل الحالي أو القيمة الافتراضية
            const existing = data[medicationIndex];
            updateData.updatedBy = existing?.createdBy || existing?.updatedBy || 'النظام';
        }
        
        // إعادة حساب الأيام المتبقية إذا تم تحديث تاريخ الانتهاء
        if (updateData.expiryDate) {
            const expiryDate = new Date(updateData.expiryDate);
            const now = new Date();
            const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
            updateData.daysRemaining = daysRemaining;
            
            if (daysRemaining < 0) {
                updateData.status = 'منتهي';
            } else if (daysRemaining <= 30) {
                updateData.status = 'قريب الانتهاء';
            } else {
                updateData.status = updateData.status || 'ساري';
            }
        }
        
        for (var key in updateData) {
            if (updateData.hasOwnProperty(key)) {
                data[medicationIndex][key] = updateData[key];
            }
        }
        
        return saveToSheet(sheetName, data, spreadsheetId);
    } catch (error) {
        Logger.log('Error updating medication: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء تحديث الدواء: ' + error.toString() };
    }
}

/**
 * حذف دواء
 */
function deleteMedication(medicationId) {
    try {
        if (!medicationId) {
            return { success: false, message: 'معرف الدواء غير محدد' };
        }
        
        const sheetName = 'Medications';
        const spreadsheetId = getSpreadsheetId();
        const data = readFromSheet(sheetName, spreadsheetId);
        const filteredData = data.filter(m => m.id !== medicationId);
        
        if (filteredData.length === data.length) {
            return { success: false, message: 'الدواء غير موجود' };
        }
        
        return saveToSheet(sheetName, filteredData, spreadsheetId);
    } catch (error) {
        Logger.log('Error deleting medication: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء حذف الدواء: ' + error.toString() };
    }
}

/**
 * الحصول على جميع الأدوية
 */
function getAllMedications(filters = {}) {
    try {
        const sheetName = 'Medications';
        let data = readFromSheet(sheetName, getSpreadsheetId());

        // ✅ إعادة بناء createdBy للواجهة فقط (بدون تخزين JSON في الشيت)
        data = (data || []).map(m => {
            if (!m || typeof m !== 'object') return m;
            if (m.createdBy && typeof m.createdBy === 'string' && m.createdBy.trim() !== '') {
                // إذا كانت الواجهة تتوقع createdBy ككائن (createdBy.name)
                m.createdBy = { name: m.createdBy, id: m.createdById || '' };
            }
            return m;
        });
        
        // تطبيق الفلاتر
        if (filters.status) {
            data = data.filter(m => m.status === filters.status);
        }
        if (filters.type) {
            data = data.filter(m => m.type === filters.type);
        }
        if (filters.expiringSoon) {
            const now = new Date();
            data = data.filter(m => {
                if (!m.expiryDate) return false;
                const expiryDate = new Date(m.expiryDate);
                const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
                return daysRemaining >= 0 && daysRemaining <= 30;
            });
        }
        
        // ترتيب حسب تاريخ الانتهاء
        data.sort((a, b) => {
            const dateA = new Date(a.expiryDate || '9999-12-31');
            const dateB = new Date(b.expiryDate || '9999-12-31');
            return dateA - dateB;
        });
        
        return { success: true, data: data, count: data.length };
    } catch (error) {
        Logger.log('Error getting all medications: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء قراءة الأدوية: ' + error.toString(), data: [] };
    }
}

/**
 * الحصول على الأدوية المنتهية أو التي تنتهي قريباً
 */
function getMedicationAlerts() {
    try {
        const sheetName = 'Medications';
        const data = readFromSheet(sheetName, getSpreadsheetId());
        const now = new Date();
        
        const alerts = {
            expired: [],
            expiringSoon: [],
            lowStock: []
        };
        
        data.forEach(medication => {
            // الأدوية المنتهية
            if (medication.expiryDate) {
                const expiryDate = new Date(medication.expiryDate);
                if (expiryDate < now) {
                    alerts.expired.push(medication);
                } else {
                    const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
                    if (daysRemaining <= 30) {
                        alerts.expiringSoon.push(medication);
                    }
                }
            }
            
            // المخزون المنخفض
            const remaining = parseFloat(medication.remainingQuantity ?? medication.quantityAdded ?? medication.quantity ?? 0);
            if (remaining > 0 && remaining <= 10) {
                alerts.lowStock.push(medication);
            }
        });
        
        return { success: true, data: alerts };
    } catch (error) {
        Logger.log('Error getting medication alerts: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء الحصول على التنبيهات: ' + error.toString() };
    }
}

/**
 * ============================================
 * الإجازات المرضية (Sick Leave)
 * ============================================
 */

/**
 * إضافة إجازة مرضية
 */
function addSickLeaveToSheet(sickLeaveData) {
    try {
        if (!sickLeaveData) {
            return { success: false, message: 'بيانات الإجازة غير موجودة' };
        }
        
        const sheetName = 'SickLeave';
        
        // ✅ حذف userData لمنع تخزينها في Google Sheets
        if (sickLeaveData && sickLeaveData.userData) {
            try { delete sickLeaveData.userData; } catch (e) {}
        }
        
        // إضافة حقول تلقائية
        if (!sickLeaveData.id) {
            sickLeaveData.id = generateSequentialId('SKL', sheetName);
        }
        if (!sickLeaveData.createdAt) {
            sickLeaveData.createdAt = new Date();
        }
        if (!sickLeaveData.updatedAt) {
            sickLeaveData.updatedAt = new Date();
        }
        if (!sickLeaveData.status) {
            sickLeaveData.status = 'قيد المراجعة';
        }
        
        // ✅ إضافة createdBy و updatedBy (تخزين كنص فقط)
        if (sickLeaveData.createdBy && typeof sickLeaveData.createdBy === 'object') {
            sickLeaveData.createdBy = (sickLeaveData.createdBy.name || sickLeaveData.createdBy.email || '').toString();
        }
        if (sickLeaveData.updatedBy && typeof sickLeaveData.updatedBy === 'object') {
            sickLeaveData.updatedBy = (sickLeaveData.updatedBy.name || sickLeaveData.updatedBy.email || '').toString();
        }
        if (!sickLeaveData.updatedBy && sickLeaveData.createdBy) {
            sickLeaveData.updatedBy = sickLeaveData.createdBy;
        }
        
        // حساب عدد الأيام
        if (sickLeaveData.startDate && sickLeaveData.endDate) {
            const start = new Date(sickLeaveData.startDate);
            const end = new Date(sickLeaveData.endDate);
            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            sickLeaveData.daysCount = days;
        }
        
        return appendToSheet(sheetName, sickLeaveData);
    } catch (error) {
        Logger.log('Error in addSickLeaveToSheet: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء إضافة الإجازة: ' + error.toString() };
    }
}

/**
 * تحديث إجازة مرضية
 */
function updateSickLeave(leaveId, updateData) {
    try {
        if (!leaveId) {
            return { success: false, message: 'معرف الإجازة غير محدد' };
        }
        
        const sheetName = 'SickLeave';
        const spreadsheetId = getSpreadsheetId();

        // لا نحفظ userData في الشيت (إن وُجدت)
        if (updateData && updateData.userData) {
            try { delete updateData.userData; } catch (e) {}
        }

        updateData.updatedAt = new Date();
        
        // ✅ إضافة updatedBy (تخزين كنص فقط)
        if (updateData.updatedBy && typeof updateData.updatedBy === 'object') {
            updateData.updatedBy = (updateData.updatedBy.name || updateData.updatedBy.email || '').toString();
        }
        if (!updateData.updatedBy) {
            // إذا لم يتم تمرير updatedBy، نستخدم createdBy من السجل الحالي أو القيمة الافتراضية
            const existing = readFromSheet(sheetName, spreadsheetId).find(l => l && l.id === leaveId) || {};
            updateData.updatedBy = existing?.createdBy || existing?.updatedBy || 'النظام';
        }
        
        // إعادة حساب عدد الأيام إذا تم تحديث التواريخ
        if (updateData.startDate || updateData.endDate) {
            // نستخدم القيم الجديدة إن وُجدت، وإلا نستخدم القيم الحالية في الشيت
            const existing = readFromSheet(sheetName, spreadsheetId).find(l => l && l.id === leaveId) || {};
            const start = new Date(updateData.startDate || existing.startDate || new Date());
            const end = new Date(updateData.endDate || existing.endDate || updateData.startDate || existing.startDate || new Date());
            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            updateData.daysCount = days;
        }

        // ✅ تحديث صف واحد فقط (بدون استبدال/مسح بيانات أخرى)
        return updateSingleRowInSheet(sheetName, leaveId, updateData, spreadsheetId);
    } catch (error) {
        Logger.log('Error updating sick leave: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء تحديث الإجازة: ' + error.toString() };
    }
}

/**
 * الحصول على جميع الإجازات المرضية
 */
function getAllSickLeaves(filters = {}) {
    try {
        const sheetName = 'SickLeave';
        let data = readFromSheet(sheetName, getSpreadsheetId());
        
        // تطبيق الفلاتر
        if (filters.employeeCode) {
            data = data.filter(l => l.employeeCode === filters.employeeCode);
        }
        if (filters.status) {
            data = data.filter(l => l.status === filters.status);
        }
        if (filters.startDate) {
            data = data.filter(l => {
                if (!l.startDate) return false;
                return new Date(l.startDate) >= new Date(filters.startDate);
            });
        }
        if (filters.endDate) {
            data = data.filter(l => {
                if (!l.endDate) return false;
                return new Date(l.endDate) <= new Date(filters.endDate);
            });
        }
        
        // ترتيب حسب تاريخ البدء
        data.sort((a, b) => {
            const dateA = new Date(a.startDate || a.createdAt || 0);
            const dateB = new Date(b.startDate || b.createdAt || 0);
            return dateB - dateA;
        });
        
        return { success: true, data: data, count: data.length };
    } catch (error) {
        Logger.log('Error getting all sick leaves: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء قراءة الإجازات: ' + error.toString(), data: [] };
    }
}

/**
 * ============================================
 * الإصابات (Injuries)
 * ============================================
 */

/**
 * إضافة إصابة
 */
function addInjuryToSheet(injuryData) {
    try {
        if (!injuryData) {
            return { success: false, message: 'بيانات الإصابة غير موجودة' };
        }
        
        const sheetName = 'Injuries';
        
        // إضافة حقول تلقائية
        if (!injuryData.id) {
            injuryData.id = generateSequentialId('INJ', sheetName);
        }
        if (!injuryData.createdAt) {
            injuryData.createdAt = new Date();
        }
        if (!injuryData.updatedAt) {
            injuryData.updatedAt = new Date();
        }
        
        // ✅ إضافة createdBy و updatedBy (تخزين كنص فقط)
        if (injuryData.createdBy && typeof injuryData.createdBy === 'object') {
            injuryData.createdBy = (injuryData.createdBy.name || injuryData.createdBy.email || '').toString();
        }
        if (injuryData.updatedBy && typeof injuryData.updatedBy === 'object') {
            injuryData.updatedBy = (injuryData.updatedBy.name || injuryData.updatedBy.email || '').toString();
        }
        if (!injuryData.createdBy && !injuryData.updatedBy) {
            injuryData.createdBy = injuryData.createdBy || 'النظام';
            injuryData.updatedBy = injuryData.updatedBy || 'النظام';
        }
        if (!injuryData.updatedBy && injuryData.createdBy) {
            injuryData.updatedBy = injuryData.createdBy;
        }
        
        return appendToSheet(sheetName, injuryData);
    } catch (error) {
        Logger.log('Error in addInjuryToSheet: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء إضافة الإصابة: ' + error.toString() };
    }
}

/**
 * تحديث إصابة
 */
function updateInjury(injuryId, updateData) {
    try {
        if (!injuryId) {
            return { success: false, message: 'معرف الإصابة غير محدد' };
        }
        
        const sheetName = 'Injuries';
        const spreadsheetId = getSpreadsheetId();
        const data = readFromSheet(sheetName, spreadsheetId);
        const injuryIndex = data.findIndex(i => i.id === injuryId);
        
        if (injuryIndex === -1) {
            return { success: false, message: 'الإصابة غير موجودة' };
        }
        
        updateData.updatedAt = new Date();
        
        // ✅ إضافة updatedBy (تخزين كنص فقط)
        if (updateData.updatedBy && typeof updateData.updatedBy === 'object') {
            updateData.updatedBy = (updateData.updatedBy.name || updateData.updatedBy.email || '').toString();
        }
        if (!updateData.updatedBy) {
            // إذا لم يتم تمرير updatedBy، نستخدم createdBy من السجل الحالي أو القيمة الافتراضية
            const existing = data[injuryIndex];
            updateData.updatedBy = existing?.createdBy || existing?.updatedBy || 'النظام';
        }
        
        for (var key in updateData) {
            if (updateData.hasOwnProperty(key)) {
                data[injuryIndex][key] = updateData[key];
            }
        }
        
        return saveToSheet(sheetName, data, spreadsheetId);
    } catch (error) {
        Logger.log('Error updating injury: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء تحديث الإصابة: ' + error.toString() };
    }
}

/**
 * الحصول على جميع الإصابات
 */
function getAllInjuries(filters = {}) {
    try {
        const sheetName = 'Injuries';
        let data = readFromSheet(sheetName, getSpreadsheetId());
        
        // تطبيق الفلاتر
        if (filters.employeeCode) {
            data = data.filter(i => i.employeeCode === filters.employeeCode);
        }
        if (filters.injuryType) {
            data = data.filter(i => i.injuryType === filters.injuryType);
        }
        if (filters.startDate) {
            data = data.filter(i => {
                if (!i.injuryDate) return false;
                return new Date(i.injuryDate) >= new Date(filters.startDate);
            });
        }
        if (filters.endDate) {
            data = data.filter(i => {
                if (!i.injuryDate) return false;
                return new Date(i.injuryDate) <= new Date(filters.endDate);
            });
        }
        
        // ترتيب حسب تاريخ الإصابة
        data.sort((a, b) => {
            const dateA = new Date(a.injuryDate || a.createdAt || 0);
            const dateB = new Date(b.injuryDate || b.createdAt || 0);
            return dateB - dateA;
        });
        
        return { success: true, data: data, count: data.length };
    } catch (error) {
        Logger.log('Error getting all injuries: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء قراءة الإصابات: ' + error.toString(), data: [] };
    }
}

/**
 * ============================================
 * مخزون العيادة (Clinic Inventory)
 * ============================================
 */

/**
 * إضافة مخزون العيادة
 */
function addClinicInventoryToSheet(inventoryData) {
    try {
        if (!inventoryData) {
            return { success: false, message: 'بيانات المخزون غير موجودة' };
        }
        
        const sheetName = 'ClinicInventory';
        
        // إضافة حقول تلقائية
        if (!inventoryData.id) {
            inventoryData.id = generateSequentialId('CLI', sheetName);
        }
        if (!inventoryData.createdAt) {
            inventoryData.createdAt = new Date();
        }
        if (!inventoryData.updatedAt) {
            inventoryData.updatedAt = new Date();
        }
        
        // ✅ إضافة createdBy و updatedBy (تخزين كنص فقط)
        if (inventoryData.createdBy && typeof inventoryData.createdBy === 'object') {
            inventoryData.createdBy = (inventoryData.createdBy.name || inventoryData.createdBy.email || '').toString();
        }
        if (inventoryData.updatedBy && typeof inventoryData.updatedBy === 'object') {
            inventoryData.updatedBy = (inventoryData.updatedBy.name || inventoryData.updatedBy.email || '').toString();
        }
        if (!inventoryData.createdBy && !inventoryData.updatedBy) {
            inventoryData.createdBy = inventoryData.createdBy || 'النظام';
            inventoryData.updatedBy = inventoryData.updatedBy || 'النظام';
        }
        if (!inventoryData.updatedBy && inventoryData.createdBy) {
            inventoryData.updatedBy = inventoryData.createdBy;
        }
        
        return appendToSheet(sheetName, inventoryData);
    } catch (error) {
        Logger.log('Error in addClinicInventoryToSheet: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء إضافة المخزون: ' + error.toString() };
    }
}

/**
 * تحديث مخزون العيادة
 */
function updateClinicInventory(inventoryId, updateData) {
    try {
        if (!inventoryId) {
            return { success: false, message: 'معرف المخزون غير محدد' };
        }
        
        const sheetName = 'ClinicInventory';
        const spreadsheetId = getSpreadsheetId();
        const data = readFromSheet(sheetName, spreadsheetId);
        const inventoryIndex = data.findIndex(inv => inv.id === inventoryId);
        
        if (inventoryIndex === -1) {
            return { success: false, message: 'المخزون غير موجود' };
        }
        
        updateData.updatedAt = new Date();
        
        // ✅ إضافة updatedBy (تخزين كنص فقط)
        if (updateData.updatedBy && typeof updateData.updatedBy === 'object') {
            updateData.updatedBy = (updateData.updatedBy.name || updateData.updatedBy.email || '').toString();
        }
        if (!updateData.updatedBy) {
            // إذا لم يتم تمرير updatedBy، نستخدم createdBy من السجل الحالي أو القيمة الافتراضية
            const existing = data[inventoryIndex];
            updateData.updatedBy = existing?.createdBy || existing?.updatedBy || 'النظام';
        }
        
        for (var key in updateData) {
            if (updateData.hasOwnProperty(key)) {
                data[inventoryIndex][key] = updateData[key];
            }
        }
        
        return saveToSheet(sheetName, data, spreadsheetId);
    } catch (error) {
        Logger.log('Error updating clinic inventory: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء تحديث المخزون: ' + error.toString() };
    }
}

/**
 * الحصول على جميع مخزون العيادة
 */
function getAllClinicInventory(filters = {}) {
    try {
        const sheetName = 'ClinicInventory';
        let data = readFromSheet(sheetName, getSpreadsheetId());
        
        // تطبيق الفلاتر
        if (filters.location) {
            data = data.filter(inv => inv.location === filters.location);
        }
        if (filters.lowStock) {
            data = data.filter(inv => {
                const quantity = parseFloat(inv.quantity || 0);
                return quantity > 0 && quantity <= 10;
            });
        }
        if (filters.expiringSoon) {
            const now = new Date();
            data = data.filter(inv => {
                if (!inv.expiryDate) return false;
                const expiryDate = new Date(inv.expiryDate);
                const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
                return daysRemaining >= 0 && daysRemaining <= 30;
            });
        }
        
        // ترتيب حسب تاريخ الانتهاء
        data.sort((a, b) => {
            const dateA = new Date(a.expiryDate || '9999-12-31');
            const dateB = new Date(b.expiryDate || '9999-12-31');
            return dateA - dateB;
        });
        
        return { success: true, data: data, count: data.length };
    } catch (error) {
        Logger.log('Error getting all clinic inventory: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء قراءة المخزون: ' + error.toString(), data: [] };
    }
}

/**
 * ============================================
 * نظام الموافقات على حذف الأدوية (Medication Deletion Approvals)
 * ============================================
 */

/**
 * إضافة طلب موافقة على حذف دواء
 */
function addMedicationDeletionRequest(requestData) {
    try {
        if (!requestData) {
            return { success: false, message: 'بيانات الطلب غير موجودة' };
        }
        
        const sheetName = 'MedicationDeletionRequests';
        
        // إضافة حقول تلقائية
        if (!requestData.id) {
            requestData.id = generateSequentialId('MDR', sheetName);
        }
        if (!requestData.createdAt) {
            requestData.createdAt = new Date();
        }
        if (!requestData.status) {
            requestData.status = 'pending'; // pending, approved, rejected
        }
        
        // حفظ معلومات الدواء كاملة
        if (requestData.medicationData && typeof requestData.medicationData === 'object') {
            requestData.medicationDataJSON = JSON.stringify(requestData.medicationData);
        }
        
        // حفظ معلومات مقدم الطلب
        if (requestData.requestedBy && typeof requestData.requestedBy === 'object') {
            requestData.requestedByJSON = JSON.stringify(requestData.requestedBy);
        }
        
        return appendToSheet(sheetName, requestData);
    } catch (error) {
        Logger.log('Error in addMedicationDeletionRequest: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء إضافة طلب الموافقة: ' + error.toString() };
    }
}

/**
 * تحديث حالة طلب موافقة على حذف دواء
 */
function updateMedicationDeletionRequest(requestId, updateData) {
    try {
        if (!requestId) {
            return { success: false, message: 'معرف الطلب غير محدد' };
        }
        
        const sheetName = 'MedicationDeletionRequests';
        const spreadsheetId = getSpreadsheetId();
        const data = readFromSheet(sheetName, spreadsheetId);
        const requestIndex = data.findIndex(r => r.id === requestId);
        
        if (requestIndex === -1) {
            return { success: false, message: 'الطلب غير موجود' };
        }
        
        updateData.updatedAt = new Date();
        
        // إذا كانت هناك بيانات approvedBy/rejectedBy، تحويلها إلى JSON
        if (updateData.approvedBy && typeof updateData.approvedBy === 'object') {
            updateData.approvedByJSON = JSON.stringify(updateData.approvedBy);
        }
        if (updateData.rejectedBy && typeof updateData.rejectedBy === 'object') {
            updateData.rejectedByJSON = JSON.stringify(updateData.rejectedBy);
        }
        
        for (var key in updateData) {
            if (updateData.hasOwnProperty(key)) {
                data[requestIndex][key] = updateData[key];
            }
        }
        
        return saveToSheet(sheetName, data, spreadsheetId);
    } catch (error) {
        Logger.log('Error updating medication deletion request: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء تحديث الطلب: ' + error.toString() };
    }
}

/**
 * الحصول على جميع طلبات موافقة حذف الأدوية
 */
function getAllMedicationDeletionRequests(filters = {}) {
    try {
        const sheetName = 'MedicationDeletionRequests';
        let data = readFromSheet(sheetName, getSpreadsheetId());
        
        // تطبيق الفلاتر
        if (filters.status) {
            data = data.filter(r => r.status === filters.status);
        }
        if (filters.requestedById) {
            data = data.filter(r => r.requestedById === filters.requestedById);
        }
        
        // ترتيب حسب تاريخ الطلب (الأحدث أولاً)
        data.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
        });
        
        // تحويل JSON strings إلى objects
        data = data.map(request => {
            if (request.medicationDataJSON) {
                try {
                    request.medicationData = JSON.parse(request.medicationDataJSON);
                } catch (e) {
                    Logger.log('Error parsing medicationDataJSON: ' + e.toString());
                }
            }
            if (request.requestedByJSON) {
                try {
                    request.requestedBy = JSON.parse(request.requestedByJSON);
                } catch (e) {
                    Logger.log('Error parsing requestedByJSON: ' + e.toString());
                }
            }
            if (request.approvedByJSON) {
                try {
                    request.approvedBy = JSON.parse(request.approvedByJSON);
                } catch (e) {
                    Logger.log('Error parsing approvedByJSON: ' + e.toString());
                }
            }
            if (request.rejectedByJSON) {
                try {
                    request.rejectedBy = JSON.parse(request.rejectedByJSON);
                } catch (e) {
                    Logger.log('Error parsing rejectedByJSON: ' + e.toString());
                }
            }
            return request;
        });
        
        return { success: true, data: data, count: data.length };
    } catch (error) {
        Logger.log('Error getting medication deletion requests: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء قراءة طلبات الموافقة: ' + error.toString(), data: [] };
    }
}

/**
 * الموافقة على طلب حذف دواء
 */
function approveMedicationDeletion(requestId, approverData) {
    try {
        // تحديث حالة الطلب
        const updateResult = updateMedicationDeletionRequest(requestId, {
            status: 'approved',
            approvedBy: approverData,
            approvedById: approverData.id || approverData.userId,
            approvedAt: new Date()
        });
        
        if (!updateResult.success) {
            return updateResult;
        }
        
        // الحصول على بيانات الطلب
        const requestsResult = getAllMedicationDeletionRequests();
        if (!requestsResult.success) {
            return requestsResult;
        }
        
        const request = requestsResult.data.find(r => r.id === requestId);
        if (!request) {
            return { success: false, message: 'الطلب غير موجود' };
        }
        
        // حذف الدواء فعلياً
        const medicationId = request.medicationId;
        if (medicationId) {
            const deleteResult = deleteMedication(medicationId);
            if (!deleteResult.success) {
                // إذا فشل الحذف، نعيد حالة الطلب
                updateMedicationDeletionRequest(requestId, {
                    status: 'pending',
                    approvedBy: null,
                    approvedById: null,
                    approvedAt: null,
                    notes: 'فشل حذف الدواء: ' + deleteResult.message
                });
                return deleteResult;
            }
        }
        
        return { success: true, message: 'تمت الموافقة وحذف الدواء بنجاح' };
    } catch (error) {
        Logger.log('Error approving medication deletion: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء الموافقة على الحذف: ' + error.toString() };
    }
}

/**
 * رفض طلب حذف دواء
 */
function rejectMedicationDeletion(requestId, rejectorData, reason) {
    try {
        const updateResult = updateMedicationDeletionRequest(requestId, {
            status: 'rejected',
            rejectedBy: rejectorData,
            rejectedById: rejectorData.id || rejectorData.userId,
            rejectedAt: new Date(),
            rejectionReason: reason || ''
        });
        
        return updateResult;
    } catch (error) {
        Logger.log('Error rejecting medication deletion: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء رفض الطلب: ' + error.toString() };
    }
}

/**
 * ============================================
 * طلبات الاحتياج (Supply Requests)
 * ============================================
 */

/**
 * إضافة طلب احتياج
 */
function addSupplyRequest(requestData) {
    try {
        if (!requestData) {
            return { success: false, message: 'بيانات الطلب غير موجودة' };
        }
        
        const sheetName = 'ClinicSupplyRequests';
        
        // إضافة حقول تلقائية
        if (!requestData.id) {
            requestData.id = generateSequentialId('CSR', sheetName);
        }
        if (!requestData.createdAt) {
            requestData.createdAt = new Date();
        }
        if (!requestData.requestDate) {
            requestData.requestDate = new Date();
        }
        if (!requestData.status) {
            requestData.status = 'pending'; // pending, approved, rejected, fulfilled
        }
        if (!requestData.priority) {
            requestData.priority = 'normal'; // normal, high, urgent
        }
        
        // حفظ معلومات مقدم الطلب
        if (requestData.requestedBy && typeof requestData.requestedBy === 'object') {
            requestData.requestedByJSON = JSON.stringify(requestData.requestedBy);
            requestData.requestedById = requestData.requestedBy.id || requestData.requestedBy.userId || '';
            requestData.requestedByName = requestData.requestedBy.name || '';
        }
        
        return appendToSheet(sheetName, requestData);
    } catch (error) {
        Logger.log('Error in addSupplyRequest: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء إضافة طلب الاحتياج: ' + error.toString() };
    }
}

/**
 * تحديث طلب احتياج
 */
function updateSupplyRequest(requestId, updateData) {
    try {
        if (!requestId) {
            return { success: false, message: 'معرف الطلب غير محدد' };
        }
        
        const sheetName = 'ClinicSupplyRequests';
        const spreadsheetId = getSpreadsheetId();
        const data = readFromSheet(sheetName, spreadsheetId);
        const requestIndex = data.findIndex(r => r.id === requestId);
        
        if (requestIndex === -1) {
            return { success: false, message: 'الطلب غير موجود' };
        }
        
        updateData.updatedAt = new Date();
        
        // إذا كانت هناك بيانات updatedBy/approvedBy/rejectedBy، تحويلها إلى JSON
        if (updateData.updatedBy && typeof updateData.updatedBy === 'object') {
            updateData.updatedByJSON = JSON.stringify(updateData.updatedBy);
        }
        if (updateData.approvedBy && typeof updateData.approvedBy === 'object') {
            updateData.approvedByJSON = JSON.stringify(updateData.approvedBy);
        }
        if (updateData.rejectedBy && typeof updateData.rejectedBy === 'object') {
            updateData.rejectedByJSON = JSON.stringify(updateData.rejectedBy);
        }
        
        for (var key in updateData) {
            if (updateData.hasOwnProperty(key)) {
                data[requestIndex][key] = updateData[key];
            }
        }
        
        return saveToSheet(sheetName, data, spreadsheetId);
    } catch (error) {
        Logger.log('Error updating supply request: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء تحديث الطلب: ' + error.toString() };
    }
}

/**
 * الحصول على جميع طلبات الاحتياج
 */
function getAllSupplyRequests(filters = {}) {
    try {
        const sheetName = 'ClinicSupplyRequests';
        let data = readFromSheet(sheetName, getSpreadsheetId());
        
        // تطبيق الفلاتر
        if (filters.status) {
            data = data.filter(r => r.status === filters.status);
        }
        if (filters.requestedById) {
            data = data.filter(r => r.requestedById === filters.requestedById);
        }
        if (filters.type) {
            data = data.filter(r => r.type === filters.type);
        }
        if (filters.priority) {
            data = data.filter(r => r.priority === filters.priority);
        }
        
        // ترتيب حسب تاريخ الطلب (الأحدث أولاً)
        data.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.requestDate || 0);
            const dateB = new Date(b.createdAt || b.requestDate || 0);
            return dateB - dateA;
        });
        
        // تحويل JSON strings إلى objects
        data = data.map(request => {
            if (request.requestedByJSON) {
                try {
                    request.requestedBy = JSON.parse(request.requestedByJSON);
                } catch (e) {
                    Logger.log('Error parsing requestedByJSON: ' + e.toString());
                }
            }
            if (request.updatedByJSON) {
                try {
                    request.updatedBy = JSON.parse(request.updatedByJSON);
                } catch (e) {
                    Logger.log('Error parsing updatedByJSON: ' + e.toString());
                }
            }
            if (request.approvedByJSON) {
                try {
                    request.approvedBy = JSON.parse(request.approvedByJSON);
                } catch (e) {
                    Logger.log('Error parsing approvedByJSON: ' + e.toString());
                }
            }
            if (request.rejectedByJSON) {
                try {
                    request.rejectedBy = JSON.parse(request.rejectedByJSON);
                } catch (e) {
                    Logger.log('Error parsing rejectedByJSON: ' + e.toString());
                }
            }
            return request;
        });
        
        return { success: true, data: data, count: data.length };
    } catch (error) {
        Logger.log('Error getting supply requests: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء قراءة طلبات الاحتياج: ' + error.toString(), data: [] };
    }
}

/**
 * الموافقة على طلب احتياج
 */
function approveSupplyRequest(requestId, approverData) {
    try {
        const updateResult = updateSupplyRequest(requestId, {
            status: 'approved',
            approvedBy: approverData,
            approvedById: approverData.id || approverData.userId,
            approvedAt: new Date()
        });
        
        return updateResult;
    } catch (error) {
        Logger.log('Error approving supply request: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء الموافقة على الطلب: ' + error.toString() };
    }
}

/**
 * رفض طلب احتياج
 */
function rejectSupplyRequest(requestId, rejectorData, reason) {
    try {
        const updateResult = updateSupplyRequest(requestId, {
            status: 'rejected',
            rejectedBy: rejectorData,
            rejectedById: rejectorData.id || rejectorData.userId,
            rejectedAt: new Date(),
            rejectionReason: reason || ''
        });
        
        return updateResult;
    } catch (error) {
        Logger.log('Error rejecting supply request: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء رفض الطلب: ' + error.toString() };
    }
}

