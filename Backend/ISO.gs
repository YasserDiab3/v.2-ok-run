/**
 * Google Apps Script for HSE System - ISO Module
 * 
 * موديول ISO - النسخة المحسنة
 */

/**
 * ============================================
 * وثائق ISO (ISO Documents)
 * ============================================
 */

/**
 * إضافة وثيقة ISO
 */
function addISODocumentToSheet(documentData) {
    try {
        if (!documentData) {
            return { success: false, message: 'بيانات الوثيقة غير موجودة' };
        }
        
        const sheetName = 'ISODocuments';
        
        // إضافة حقول تلقائية
        if (!documentData.id) {
            documentData.id = Utilities.getUuid();
        }
        if (!documentData.createdAt) {
            documentData.createdAt = new Date();
        }
        if (!documentData.updatedAt) {
            documentData.updatedAt = new Date();
        }
        if (!documentData.version) {
            documentData.version = '1.0';
        }
        
        return appendToSheet(sheetName, documentData);
    } catch (error) {
        Logger.log('Error in addISODocumentToSheet: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء إضافة الوثيقة: ' + error.toString() };
    }
}

/**
 * تحديث وثيقة ISO
 */
function updateISODocument(documentId, updateData) {
    try {
        if (!documentId) {
            return { success: false, message: 'معرف الوثيقة غير محدد' };
        }
        
        const sheetName = 'ISODocuments';
        const spreadsheetId = getSpreadsheetId();
        const data = readFromSheet(sheetName, spreadsheetId);
        const documentIndex = data.findIndex(d => d.id === documentId);
        
        if (documentIndex === -1) {
            return { success: false, message: 'الوثيقة غير موجودة' };
        }
        
        updateData.updatedAt = new Date();
        for (var key in updateData) {
            if (updateData.hasOwnProperty(key)) {
                data[documentIndex][key] = updateData[key];
            }
        }
        
        return saveToSheet(sheetName, data, spreadsheetId);
    } catch (error) {
        Logger.log('Error updating ISO document: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء تحديث الوثيقة: ' + error.toString() };
    }
}

/**
 * الحصول على جميع وثائق ISO
 */
function getAllISODocuments(filters = {}) {
    try {
        const sheetName = 'ISODocuments';
        let data = readFromSheet(sheetName, getSpreadsheetId());
        
        // تطبيق الفلاتر
        if (filters.type) {
            data = data.filter(d => d.type === filters.type);
        }
        if (filters.department) {
            data = data.filter(d => d.department === filters.department);
        }
        if (filters.version) {
            data = data.filter(d => d.version === filters.version);
        }
        
        // ترتيب حسب الاسم
        data.sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
        
        return { success: true, data: data, count: data.length };
    } catch (error) {
        Logger.log('Error getting all ISO documents: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء قراءة الوثائق: ' + error.toString(), data: [] };
    }
}

/**
 * ============================================
 * إجراءات ISO (ISO Procedures)
 * ============================================
 */

/**
 * إضافة إجراء ISO
 */
function addISOProcedureToSheet(procedureData) {
    try {
        if (!procedureData) {
            return { success: false, message: 'بيانات الإجراء غير موجودة' };
        }
        
        const sheetName = 'ISOProcedures';
        
        // إضافة حقول تلقائية
        if (!procedureData.id) {
            procedureData.id = generateSequentialId('ISP', sheetName);
        }
        if (!procedureData.createdAt) {
            procedureData.createdAt = new Date();
        }
        if (!procedureData.updatedAt) {
            procedureData.updatedAt = new Date();
        }
        if (!procedureData.version) {
            procedureData.version = '1.0';
        }
        
        return appendToSheet(sheetName, procedureData);
    } catch (error) {
        Logger.log('Error in addISOProcedureToSheet: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء إضافة الإجراء: ' + error.toString() };
    }
}

/**
 * تحديث إجراء ISO
 */
function updateISOProcedure(procedureId, updateData) {
    try {
        if (!procedureId) {
            return { success: false, message: 'معرف الإجراء غير محدد' };
        }
        
        const sheetName = 'ISOProcedures';
        const spreadsheetId = getSpreadsheetId();
        const data = readFromSheet(sheetName, spreadsheetId);
        const procedureIndex = data.findIndex(p => p.id === procedureId);
        
        if (procedureIndex === -1) {
            return { success: false, message: 'الإجراء غير موجود' };
        }
        
        updateData.updatedAt = new Date();
        for (var key in updateData) {
            if (updateData.hasOwnProperty(key)) {
                data[procedureIndex][key] = updateData[key];
            }
        }
        
        return saveToSheet(sheetName, data, spreadsheetId);
    } catch (error) {
        Logger.log('Error updating ISO procedure: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء تحديث الإجراء: ' + error.toString() };
    }
}

/**
 * الحصول على جميع إجراءات ISO
 */
function getAllISOProcedures(filters = {}) {
    try {
        const sheetName = 'ISOProcedures';
        let data = readFromSheet(sheetName, getSpreadsheetId());
        
        // تطبيق الفلاتر
        if (filters.department) {
            data = data.filter(p => p.department === filters.department);
        }
        if (filters.version) {
            data = data.filter(p => p.version === filters.version);
        }
        
        // ترتيب حسب الاسم
        data.sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
        
        return { success: true, data: data, count: data.length };
    } catch (error) {
        Logger.log('Error getting all ISO procedures: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء قراءة الإجراءات: ' + error.toString(), data: [] };
    }
}

/**
 * ============================================
 * نماذج ISO (ISO Forms)
 * ============================================
 */

/**
 * إضافة نموذج ISO
 */
function addISOFormToSheet(formData) {
    try {
        if (!formData) {
            return { success: false, message: 'بيانات النموذج غير موجودة' };
        }
        
        const sheetName = 'ISOForms';
        
        // إضافة حقول تلقائية
        if (!formData.id) {
            formData.id = generateSequentialId('ISF', sheetName);
        }
        if (!formData.createdAt) {
            formData.createdAt = new Date();
        }
        if (!formData.updatedAt) {
            formData.updatedAt = new Date();
        }
        
        return appendToSheet(sheetName, formData);
    } catch (error) {
        Logger.log('Error in addISOFormToSheet: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء إضافة النموذج: ' + error.toString() };
    }
}

/**
 * تحديث نموذج ISO
 */
function updateISOForm(formId, updateData) {
    try {
        if (!formId) {
            return { success: false, message: 'معرف النموذج غير محدد' };
        }
        
        const sheetName = 'ISOForms';
        const spreadsheetId = getSpreadsheetId();
        const data = readFromSheet(sheetName, spreadsheetId);
        const formIndex = data.findIndex(f => f.id === formId);
        
        if (formIndex === -1) {
            return { success: false, message: 'النموذج غير موجود' };
        }
        
        updateData.updatedAt = new Date();
        for (var key in updateData) {
            if (updateData.hasOwnProperty(key)) {
                data[formIndex][key] = updateData[key];
            }
        }
        
        return saveToSheet(sheetName, data, spreadsheetId);
    } catch (error) {
        Logger.log('Error updating ISO form: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء تحديث النموذج: ' + error.toString() };
    }
}

/**
 * الحصول على جميع نماذج ISO
 */
function getAllISOForms(filters = {}) {
    try {
        const sheetName = 'ISOForms';
        let data = readFromSheet(sheetName, getSpreadsheetId());
        
        // تطبيق الفلاتر
        if (filters.type) {
            data = data.filter(f => f.type === filters.type);
        }
        
        // ترتيب حسب الاسم
        data.sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
        
        return { success: true, data: data, count: data.length };
    } catch (error) {
        Logger.log('Error getting all ISO forms: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء قراءة النماذج: ' + error.toString(), data: [] };
    }
}

/**
 * ============================================
 * SOP/JHA
 * ============================================
 */

/**
 * إضافة SOP/JHA
 */
function addSOPJHAToSheet(sopData) {
    try {
        if (!sopData) {
            return { success: false, message: 'بيانات SOP/JHA غير موجودة' };
        }
        
        const sheetName = 'SOPJHA';
        
        // إضافة حقول تلقائية
        if (!sopData.id) {
            sopData.id = generateSequentialId('SOP', sheetName);
        }
        if (!sopData.createdAt) {
            sopData.createdAt = new Date();
        }
        if (!sopData.updatedAt) {
            sopData.updatedAt = new Date();
        }
        if (!sopData.status) {
            sopData.status = 'نشط';
        }
        if (!sopData.version) {
            sopData.version = '1.0';
        }
        
        return appendToSheet(sheetName, sopData);
    } catch (error) {
        Logger.log('Error in addSOPJHAToSheet: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء إضافة SOP/JHA: ' + error.toString() };
    }
}

/**
 * تحديث SOP/JHA
 */
function updateSOPJHA(sopId, updateData) {
    try {
        if (!sopId) {
            return { success: false, message: 'معرف SOP/JHA غير محدد' };
        }
        
        const sheetName = 'SOPJHA';
        const spreadsheetId = getSpreadsheetId();
        const data = readFromSheet(sheetName, spreadsheetId);
        const sopIndex = data.findIndex(s => s.id === sopId);
        
        if (sopIndex === -1) {
            return { success: false, message: 'SOP/JHA غير موجود' };
        }
        
        updateData.updatedAt = new Date();
        for (var key in updateData) {
            if (updateData.hasOwnProperty(key)) {
                data[sopIndex][key] = updateData[key];
            }
        }
        
        return saveToSheet(sheetName, data, spreadsheetId);
    } catch (error) {
        Logger.log('Error updating SOP/JHA: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء تحديث SOP/JHA: ' + error.toString() };
    }
}

/**
 * الحصول على SOP/JHA محدد
 */
function getSOPJHA(sopId) {
    try {
        if (!sopId) {
            return { success: false, message: 'معرف SOP/JHA غير محدد' };
        }
        
        const sheetName = 'SOPJHA';
        const data = readFromSheet(sheetName, getSpreadsheetId());
        const sop = data.find(s => s.id === sopId);
        
        if (!sop) {
            return { success: false, message: 'SOP/JHA غير موجود' };
        }
        
        return { success: true, data: sop };
    } catch (error) {
        Logger.log('Error getting SOP/JHA: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء قراءة SOP/JHA: ' + error.toString() };
    }
}

/**
 * الحصول على جميع SOP/JHA
 */
function getAllSOPJHAs(filters = {}) {
    try {
        const sheetName = 'SOPJHA';
        let data = readFromSheet(sheetName, getSpreadsheetId());
        
        // تطبيق الفلاتر
        if (filters.type) {
            data = data.filter(s => s.type === filters.type);
        }
        if (filters.department) {
            data = data.filter(s => s.department === filters.department);
        }
        if (filters.status) {
            data = data.filter(s => s.status === filters.status);
        }
        if (filters.version) {
            data = data.filter(s => s.version === filters.version);
        }
        
        // ترتيب حسب العنوان
        data.sort((a, b) => {
            const titleA = (a.title || '').toLowerCase();
            const titleB = (b.title || '').toLowerCase();
            return titleA.localeCompare(titleB);
        });
        
        return { success: true, data: data, count: data.length };
    } catch (error) {
        Logger.log('Error getting all SOP/JHAs: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء قراءة SOP/JHA: ' + error.toString(), data: [] };
    }
}

/**
 * حذف SOP/JHA
 */
function deleteSOPJHA(sopId) {
    try {
        if (!sopId) {
            return { success: false, message: 'معرف SOP/JHA غير محدد' };
        }
        
        const sheetName = 'SOPJHA';
        const spreadsheetId = getSpreadsheetId();
        const data = readFromSheet(sheetName, spreadsheetId);
        const filteredData = data.filter(s => s.id !== sopId);
        
        if (filteredData.length === data.length) {
            return { success: false, message: 'SOP/JHA غير موجود' };
        }
        
        return saveToSheet(sheetName, filteredData, spreadsheetId);
    } catch (error) {
        Logger.log('Error deleting SOP/JHA: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء حذف SOP/JHA: ' + error.toString() };
    }
}

