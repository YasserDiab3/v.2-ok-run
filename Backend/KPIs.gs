/**
 * Google Apps Script for HSE System - KPIs Module
 * 
 * موديول مؤشرات الأداء - النسخة المحسنة
 */

/**
 * إضافة مؤشر أداء
 */
function addKPIToSheet(kpiData) {
    try {
        if (!kpiData) {
            return { success: false, message: 'بيانات المؤشر غير موجودة' };
        }
        
        // محاولة تحديد نوع الورقة من البيانات
        let sheetName = 'KPIs';
        if (kpiData && (kpiData.kpiName || kpiData.name) && (kpiData.category === 'سلامة' || kpiData.type === 'safety')) {
            sheetName = 'SafetyPerformanceKPIs';
        }
        
        // إضافة حقول تلقائية
        if (!kpiData.id) {
            kpiData.id = Utilities.getUuid();
        }
        if (!kpiData.createdAt) {
            kpiData.createdAt = new Date();
        }
        if (!kpiData.updatedAt) {
            kpiData.updatedAt = new Date();
        }
        if (!kpiData.status) {
            kpiData.status = 'نشط';
        }
        
        return appendToSheet(sheetName, kpiData);
    } catch (error) {
        Logger.log('Error in addKPIToSheet: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء إضافة المؤشر: ' + error.toString() };
    }
}

/**
 * تحديث مؤشر أداء
 */
function updateKPI(kpiId, updateData) {
    try {
        if (!kpiId) {
            return { success: false, message: 'معرف المؤشر غير محدد' };
        }
        
        // البحث في كلا الورقتين
        let sheetName = 'KPIs';
        let spreadsheetId = getSpreadsheetId();
        let data = readFromSheet(sheetName, spreadsheetId);
        let kpiIndex = data.findIndex(k => k.id === kpiId);
        
        if (kpiIndex === -1) {
            // البحث في ورقة Safety KPIs
            sheetName = 'SafetyPerformanceKPIs';
            data = readFromSheet(sheetName, spreadsheetId);
            kpiIndex = data.findIndex(k => k.id === kpiId);
        }
        
        if (kpiIndex === -1) {
            return { success: false, message: 'المؤشر غير موجود' };
        }
        
        updateData.updatedAt = new Date();
        for (var key in updateData) {
            if (updateData.hasOwnProperty(key)) {
                data[kpiIndex][key] = updateData[key];
            }
        }
        
        return saveToSheet(sheetName, data, spreadsheetId);
    } catch (error) {
        Logger.log('Error updating KPI: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء تحديث المؤشر: ' + error.toString() };
    }
}

/**
 * الحصول على مؤشر أداء محدد
 */
function getKPI(kpiId) {
    try {
        if (!kpiId) {
            return { success: false, message: 'معرف المؤشر غير محدد' };
        }
        
        // البحث في كلا الورقتين
        let data = readFromSheet('KPIs', getSpreadsheetId());
        let kpi = data.find(k => k.id === kpiId);
        
        if (!kpi) {
            data = readFromSheet('SafetyPerformanceKPIs', getSpreadsheetId());
            kpi = data.find(k => k.id === kpiId);
        }
        
        if (!kpi) {
            return { success: false, message: 'المؤشر غير موجود' };
        }
        
        return { success: true, data: kpi };
    } catch (error) {
        Logger.log('Error getting KPI: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء قراءة المؤشر: ' + error.toString() };
    }
}

/**
 * الحصول على جميع مؤشرات الأداء
 */
function getAllKPIs(filters = {}) {
    try {
        // قراءة من كلا الورقتين
        let data = readFromSheet('KPIs', getSpreadsheetId());
        const safetyKPIs = readFromSheet('SafetyPerformanceKPIs', getSpreadsheetId());
        data = data.concat(safetyKPIs);
        
        // تطبيق الفلاتر
        if (filters.category) {
            data = data.filter(k => k.category === filters.category);
        }
        if (filters.type) {
            data = data.filter(k => k.type === filters.type);
        }
        if (filters.status) {
            data = data.filter(k => k.status === filters.status);
        }
        if (filters.department) {
            data = data.filter(k => k.department === filters.department);
        }
        
        // ترتيب حسب الاسم
        data.sort((a, b) => {
            const nameA = (a.kpiName || a.name || '').toLowerCase();
            const nameB = (b.kpiName || b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
        
        return { success: true, data: data, count: data.length };
    } catch (error) {
        Logger.log('Error getting all KPIs: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء قراءة المؤشرات: ' + error.toString(), data: [] };
    }
}

/**
 * حذف مؤشر أداء
 */
function deleteKPI(kpiId) {
    try {
        if (!kpiId) {
            return { success: false, message: 'معرف المؤشر غير محدد' };
        }
        
        // البحث في كلا الورقتين
        let sheetName = 'KPIs';
        let spreadsheetId = getSpreadsheetId();
        
        // التحقق من وجود spreadsheetId
        if (!spreadsheetId || spreadsheetId.trim() === '') {
            return { 
                success: false, 
                message: 'معرف Google Sheets غير محدد. يرجى إدخال معرف الجدول في الإعدادات أو في Config.gs.' 
            };
        }
        
        let data = readFromSheet(sheetName, spreadsheetId);
        let filteredData = data.filter(k => k.id !== kpiId);
        
        if (filteredData.length === data.length) {
            // البحث في ورقة Safety KPIs
            sheetName = 'SafetyPerformanceKPIs';
            data = readFromSheet(sheetName, spreadsheetId);
            filteredData = data.filter(k => k.id !== kpiId);
        }
        
        if (filteredData.length === data.length) {
            return { success: false, message: 'المؤشر غير موجود' };
        }
        
        return saveToSheet(sheetName, filteredData, spreadsheetId);
    } catch (error) {
        Logger.log('Error deleting KPI: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء حذف المؤشر: ' + error.toString() };
    }
}

