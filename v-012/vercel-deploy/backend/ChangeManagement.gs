/**
 * Google Apps Script for HSE System - Change Management Module
 * موديول إدارة التغيرات (مشابه SAP Management of Change - MoC)
 *
 * المميزات:
 * - أنواع التغيير: تقني، إداري، تنظيمي
 * - سير عمل: مسودة → مراجعة → معتمد/مرفوض → تنفيذ → منفذ/مغلق
 * - تقييم أثر وأولوية وتقييم مخاطر وإجراءات تخفيف
 * - سجل زمني كامل لكل طلب
 */

const SHEET_NAME = 'ChangeRequests';

/**
 * إضافة طلب تغيير جديد
 */
function addChangeRequestToSheet(requestData) {
    try {
        if (!requestData) {
            return { success: false, message: 'لا توجد بيانات للإضافة' };
        }

        if (!requestData.id) {
            requestData.id = generateSequentialId('CRQ', SHEET_NAME, null);
        }
        if (!requestData.requestNumber) {
            requestData.requestNumber = requestData.id;
        }
        if (!requestData.createdAt) {
            requestData.createdAt = new Date().toISOString();
        }
        if (!requestData.updatedAt) {
            requestData.updatedAt = new Date().toISOString();
        }
        if (!requestData.status) {
            requestData.status = 'Draft';
        }
        if (!requestData.priority) {
            requestData.priority = '3-Medium';
        }
        if (!requestData.impact) {
            requestData.impact = '1-Minor';
        }
        if (!requestData.changeType) {
            requestData.changeType = 'Administrative';
        }

        if (!requestData.timeLog) {
            requestData.timeLog = [{
                action: 'created',
                user: requestData.requestedBy || requestData.createdBy || 'System',
                timestamp: new Date().toISOString(),
                note: 'تم إنشاء طلب التغيير'
            }];
        }

        if (!requestData.attachments) {
            requestData.attachments = [];
        }

        var result = appendToSheet(SHEET_NAME, requestData);
        if (result.success && requestData.id) {
            result.data = { id: requestData.id };
            try {
                if (typeof notifyAdminsOfNewChangeRequest === 'function') {
                    notifyAdminsOfNewChangeRequest(requestData.id, requestData.title || '', requestData.requestedBy || requestData.createdBy || '');
                }
            } catch (e) {
                Logger.log('Error notifying admins: ' + e.toString());
            }
        }
        return result;
    } catch (error) {
        Logger.log('Error in addChangeRequestToSheet: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء إضافة طلب التغيير: ' + error.toString() };
    }
}

/**
 * تحديث طلب تغيير
 */
function updateChangeRequest(requestId, updateData) {
    try {
        var spreadsheetId = getSpreadsheetId();
        if (!spreadsheetId) {
            return { success: false, message: 'معرف Google Sheets غير محدد' };
        }

        var data = readFromSheet(SHEET_NAME, spreadsheetId);
        var idx = data.findIndex(function (r) { return r.id === requestId; });
        if (idx === -1) {
            return { success: false, message: 'طلب التغيير غير موجود' };
        }

        var existing = data[idx];
        var updated = {};
        for (var k in existing) {
            if (existing.hasOwnProperty(k)) updated[k] = existing[k];
        }
        for (var u in updateData) {
            if (updateData.hasOwnProperty(u) && u !== 'id') {
                updated[u] = updateData[u];
            }
        }
        updated.updatedAt = new Date().toISOString();
        if (updateData.updatedBy) updated.updatedBy = updateData.updatedBy;

        var timeLog = [];
        try {
            if (Array.isArray(existing.timeLog)) {
                timeLog = existing.timeLog;
            } else if (typeof existing.timeLog === 'string' && existing.timeLog) {
                try {
                    timeLog = JSON.parse(existing.timeLog);
                } catch (e) {
                    timeLog = [];
                }
            }
        } catch (e) {
            timeLog = [];
        }

        timeLog.push({
            action: 'updated',
            user: updateData.updatedBy || 'System',
            timestamp: new Date().toISOString(),
            note: updateData.updateNote || 'تم تحديث طلب التغيير'
        });

        if (updateData.status && updateData.status !== existing.status) {
            timeLog.push({
                action: 'status_changed',
                user: updateData.updatedBy || 'System',
                timestamp: new Date().toISOString(),
                note: 'تم تغيير الحالة من ' + (existing.status || '') + ' إلى ' + updateData.status,
                oldStatus: existing.status,
                newStatus: updateData.status
            });
        }
        if (updateData.status === 'Approved') {
            updated.approvedAt = updated.approvedAt || new Date().toISOString();
            if (updateData.approvedBy) updated.approvedBy = updateData.approvedBy;
        }
        if (updateData.status === 'Rejected') {
            updated.rejectedAt = updated.rejectedAt || new Date().toISOString();
            if (updateData.rejectedBy) updated.rejectedBy = updateData.rejectedBy;
            if (updateData.rejectionReason) updated.rejectionReason = updateData.rejectionReason;
        }
        if (updateData.status === 'In Implementation') {
            timeLog.push({
                action: 'implementation_started',
                user: updateData.updatedBy || 'System',
                timestamp: new Date().toISOString(),
                note: 'بدء التنفيذ'
            });
        }
        if (updateData.status === 'Completed') {
            updated.implementedAt = updated.implementedAt || new Date().toISOString();
            if (updateData.implementedBy) updated.implementedBy = updateData.implementedBy;
            timeLog.push({
                action: 'completed',
                user: updateData.implementedBy || updateData.updatedBy || 'System',
                timestamp: new Date().toISOString(),
                note: 'تم التنفيذ'
            });
        }
        if (updateData.status === 'Closed') {
            updated.closedAt = updated.closedAt || new Date().toISOString();
            if (updateData.closedBy) updated.closedBy = updateData.closedBy;
            timeLog.push({
                action: 'closed',
                user: updateData.closedBy || updateData.updatedBy || 'System',
                timestamp: new Date().toISOString(),
                note: 'تم إغلاق الطلب'
            });
        }

        updated.timeLog = timeLog;
        return updateSingleRowInSheet(SHEET_NAME, requestId, updated, spreadsheetId);
    } catch (error) {
        Logger.log('Error in updateChangeRequest: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء تحديث طلب التغيير: ' + error.toString() };
    }
}

/**
 * الحصول على طلب تغيير بمُعرف
 */
function getChangeRequest(requestId) {
    try {
        var spreadsheetId = getSpreadsheetId();
        if (!spreadsheetId) {
            return { success: false, message: 'معرف Google Sheets غير محدد' };
        }
        var data = readFromSheet(SHEET_NAME, spreadsheetId);
        var req = data.find(function (r) { return r.id === requestId; });
        if (!req) {
            return { success: false, message: 'طلب التغيير غير موجود' };
        }
        return { success: true, data: req };
    } catch (error) {
        Logger.log('Error in getChangeRequest: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء قراءة طلب التغيير: ' + error.toString() };
    }
}

/**
 * الحصول على جميع طلبات التغيير مع الفلاتر
 */
function getAllChangeRequests(filters) {
    try {
        filters = filters || {};
        var spreadsheetId = getSpreadsheetId();
        if (!spreadsheetId) {
            return { success: false, message: 'معرف Google Sheets غير محدد', data: [] };
        }

        var data = readFromSheet(SHEET_NAME, spreadsheetId);
        if (!data || !Array.isArray(data)) {
            data = [];
        }

        if (filters.status) {
            data = data.filter(function (r) {
                return (r.status || '').toLowerCase() === (filters.status || '').toLowerCase();
            });
        }
        if (filters.changeType) {
            data = data.filter(function (r) {
                return (r.changeType || '') === filters.changeType;
            });
        }
        if (filters.priority) {
            data = data.filter(function (r) {
                return (r.priority || '') === filters.priority;
            });
        }
        if (filters.impact) {
            data = data.filter(function (r) {
                return (r.impact || '') === filters.impact;
            });
        }
        if (filters.relatedModule) {
            data = data.filter(function (r) {
                return (r.relatedModule || '') === filters.relatedModule;
            });
        }
        if (filters.requestedBy) {
            data = data.filter(function (r) {
                return (r.requestedBy || '').indexOf(filters.requestedBy) !== -1;
            });
        }
        if (filters.search) {
            var term = (filters.search || '').toLowerCase();
            data = data.filter(function (r) {
                return (r.title || '').toLowerCase().indexOf(term) !== -1 ||
                    (r.description || '').toLowerCase().indexOf(term) !== -1 ||
                    (r.id || '').toLowerCase().indexOf(term) !== -1 ||
                    (r.requestNumber || '').toLowerCase().indexOf(term) !== -1;
            });
        }
        if (filters.startDate) {
            data = data.filter(function (r) {
                if (!r.requestedAt && !r.createdAt) return false;
                var d = new Date(r.requestedAt || r.createdAt);
                return d >= new Date(filters.startDate);
            });
        }
        if (filters.endDate) {
            data = data.filter(function (r) {
                if (!r.requestedAt && !r.createdAt) return false;
                var d = new Date(r.requestedAt || r.createdAt);
                return d <= new Date(filters.endDate);
            });
        }

        data.sort(function (a, b) {
            var dateA = new Date(a.createdAt || a.updatedAt || 0);
            var dateB = new Date(b.createdAt || b.updatedAt || 0);
            return dateB - dateA;
        });

        return { success: true, data: data };
    } catch (error) {
        Logger.log('Error in getAllChangeRequests: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء قراءة طلبات التغيير: ' + error.toString(), data: [] };
    }
}

/**
 * الحصول على الرقم المسلسل التالي لطلب تغيير (للعرض في النموذج قبل الحفظ)
 */
function getNextChangeRequestNumber() {
    try {
        var nextId = typeof generateSequentialId === 'function'
            ? generateSequentialId('CRQ', SHEET_NAME, null)
            : 'CRQ_?';
        return { success: true, data: { requestNumber: nextId, id: nextId } };
    } catch (e) {
        Logger.log('getNextChangeRequestNumber: ' + e.toString());
        return { success: false, message: e.toString(), data: { requestNumber: '', id: '' } };
    }
}

/**
 * إحصائيات طلبات التغيير
 */
function getChangeRequestStatistics(filters) {
    try {
        var all = getAllChangeRequests(filters || {});
        if (!all.success) {
            return { success: false, message: 'فشل في قراءة الطلبات', data: {} };
        }
        var list = all.data;
        var byStatus = {};
        var byChangeType = {};
        var byPriority = {};
        var byImpact = {};
        for (var i = 0; i < list.length; i++) {
            var s = list[i].status || 'Unknown';
            byStatus[s] = (byStatus[s] || 0) + 1;
            var ct = list[i].changeType || 'Unknown';
            byChangeType[ct] = (byChangeType[ct] || 0) + 1;
            var p = list[i].priority || 'Unknown';
            byPriority[p] = (byPriority[p] || 0) + 1;
            var im = list[i].impact || 'Unknown';
            byImpact[im] = (byImpact[im] || 0) + 1;
        }
        return {
            success: true,
            data: {
                total: list.length,
                byStatus: byStatus,
                byChangeType: byChangeType,
                byPriority: byPriority,
                byImpact: byImpact
            }
        };
    } catch (error) {
        Logger.log('Error in getChangeRequestStatistics: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء حساب الإحصائيات', data: {} };
    }
}
