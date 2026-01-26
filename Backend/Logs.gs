/**
 * Google Apps Script for HSE System - Logs Module
 * 
 * موديول السجلات - النسخة المحسنة
 */

/**
 * ============================================
 * سجلات التدقيق (Audit Logs)
 * ============================================
 */

/**
 * إضافة سجل تدقيق
 */
function addAuditLogToSheet(logData) {
    try {
        if (!logData) {
            return { success: false, message: 'بيانات السجل غير موجودة' };
        }
        
        const sheetName = 'AuditLog';
        
        // إضافة حقول تلقائية
        if (!logData.id) {
            logData.id = Utilities.getUuid();
        }
        if (!logData.timestamp) {
            logData.timestamp = new Date();
        }
        if (!logData.createdAt) {
            logData.createdAt = new Date();
        }
        
        return appendToSheet(sheetName, logData);
    } catch (error) {
        Logger.log('Error in addAuditLogToSheet: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء إضافة السجل: ' + error.toString() };
    }
}

/**
 * الحصول على جميع سجلات التدقيق
 */
function getAllAuditLogs(filters = {}) {
    try {
        const sheetName = 'AuditLog';
        let data = readFromSheet(sheetName, getSpreadsheetId());
        
        // تطبيق الفلاتر
        if (filters.userId) {
            data = data.filter(log => log.userId === filters.userId);
        }
        if (filters.action) {
            data = data.filter(log => log.action === filters.action);
        }
        if (filters.module) {
            data = data.filter(log => log.module === filters.module);
        }
        if (filters.startDate) {
            data = data.filter(log => {
                if (!log.timestamp) return false;
                return new Date(log.timestamp) >= new Date(filters.startDate);
            });
        }
        if (filters.endDate) {
            data = data.filter(log => {
                if (!log.timestamp) return false;
                return new Date(log.timestamp) <= new Date(filters.endDate);
            });
        }
        
        // ترتيب حسب الوقت
        data.sort((a, b) => {
            const dateA = new Date(a.timestamp || a.createdAt || 0);
            const dateB = new Date(b.timestamp || b.createdAt || 0);
            return dateB - dateA;
        });
        
        return { success: true, data: data, count: data.length };
    } catch (error) {
        Logger.log('Error getting all audit logs: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء قراءة السجلات: ' + error.toString(), data: [] };
    }
}

/**
 * ============================================
 * سجلات نشاط المستخدم (User Activity Logs)
 * ============================================
 */

/**
 * إضافة سجل نشاط المستخدم
 */
function addUserActivityLogToSheet(logData) {
    try {
        if (!logData) {
            return { success: false, message: 'بيانات السجل غير موجودة' };
        }
        
        const sheetName = 'UserActivityLog';
        
        // إضافة حقول تلقائية
        if (!logData.id) {
            logData.id = Utilities.getUuid();
        }
        if (!logData.timestamp) {
            logData.timestamp = new Date();
        }
        if (!logData.createdAt) {
            logData.createdAt = new Date();
        }
        
        return appendToSheet(sheetName, logData);
    } catch (error) {
        Logger.log('Error in addUserActivityLogToSheet: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء إضافة السجل: ' + error.toString() };
    }
}

/**
 * الحصول على جميع سجلات نشاط المستخدم
 */
function getAllUserActivityLogs(filters = {}) {
    try {
        const sheetName = 'UserActivityLog';
        let data = readFromSheet(sheetName, getSpreadsheetId());
        
        // تطبيق الفلاتر
        if (filters.userId) {
            data = data.filter(log => log.userId === filters.userId);
        }
        // دعم كلا من 'activity' و 'actionType' للتوافق
        if (filters.activity) {
            data = data.filter(log => log.activity === filters.activity || log.actionType === filters.activity);
        }
        if (filters.actionType) {
            data = data.filter(log => log.actionType === filters.actionType || log.activity === filters.actionType);
        }
        if (filters.module) {
            data = data.filter(log => log.module === filters.module);
        }
        if (filters.startDate) {
            data = data.filter(log => {
                if (!log.timestamp) return false;
                return new Date(log.timestamp) >= new Date(filters.startDate);
            });
        }
        if (filters.endDate) {
            data = data.filter(log => {
                if (!log.timestamp) return false;
                return new Date(log.timestamp) <= new Date(filters.endDate);
            });
        }
        
        // ترتيب حسب الوقت
        data.sort((a, b) => {
            const dateA = new Date(a.timestamp || a.createdAt || 0);
            const dateB = new Date(b.timestamp || b.createdAt || 0);
            return dateB - dateA;
        });
        
        return { success: true, data: data, count: data.length };
    } catch (error) {
        Logger.log('Error getting all user activity logs: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء قراءة السجلات: ' + error.toString(), data: [] };
    }
}

/**
 * الحصول على سجلات نشاط مستخدم محدد
 */
function getUserActivityLogs(userId, filters = {}) {
    try {
        filters.userId = userId;
        return getAllUserActivityLogs(filters);
    } catch (error) {
        Logger.log('Error getting user activity logs: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء قراءة السجلات: ' + error.toString(), data: [] };
    }
}

/**
 * الحصول على إحصائيات السجلات
 */
function getLogStatistics(filters = {}) {
    try {
        const auditLogs = getAllAuditLogs(filters);
        const activityLogs = getAllUserActivityLogs(filters);
        
        if (!auditLogs.success || !activityLogs.success) {
            return { success: false, message: 'فشل في قراءة السجلات' };
        }
        
        const stats = {
            totalAuditLogs: auditLogs.count,
            totalActivityLogs: activityLogs.count,
            byAction: {},
            byModule: {},
            byUser: {},
            byActivity: {},
            recentActivity: []
        };
        
        // إحصائيات سجلات التدقيق
        auditLogs.data.forEach(log => {
            if (log.action) {
                stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
            }
            if (log.module) {
                stats.byModule[log.module] = (stats.byModule[log.module] || 0) + 1;
            }
            if (log.userId) {
                stats.byUser[log.userId] = (stats.byUser[log.userId] || 0) + 1;
            }
        });
        
        // إحصائيات سجلات النشاط
        activityLogs.data.forEach(log => {
            if (log.activity) {
                stats.byActivity[log.activity] = (stats.byActivity[log.activity] || 0) + 1;
            }
            if (log.module) {
                stats.byModule[log.module] = (stats.byModule[log.module] || 0) + 1;
            }
            if (log.userId) {
                stats.byUser[log.userId] = (stats.byUser[log.userId] || 0) + 1;
            }
        });
        
        // النشاط الأخير (آخر 10)
        const allLogs = auditLogs.data.concat(activityLogs.data);
        allLogs.sort((a, b) => {
            const dateA = new Date(a.timestamp || a.createdAt || 0);
            const dateB = new Date(b.timestamp || b.createdAt || 0);
            return dateB - dateA;
        });
        stats.recentActivity = allLogs.slice(0, 10);
        
        return { success: true, data: stats };
    } catch (error) {
        Logger.log('Error getting log statistics: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء حساب الإحصائيات: ' + error.toString() };
    }
}

