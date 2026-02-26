/**
 * Google Apps Script for HSE System - Violations Module
 * 
 * موديول المخالفات
 */

/**
 * إضافة مخالفة
 */
function addViolationToSheet(violationData) {
    try {
        if (!violationData) {
            return { success: false, message: 'بيانات المخالفة غير موجودة' };
        }
        
        const sheetName = 'Violations';
        
        // إضافة حقول تلقائية
        if (!violationData.id) {
            violationData.id = generateSequentialId('VIO', sheetName);
        }
        if (!violationData.createdAt) {
            violationData.createdAt = new Date();
        }
        if (!violationData.updatedAt) {
            violationData.updatedAt = new Date();
        }
        
        // معالجة photo - إذا كانت Base64، نحولها إلى رابط
        if (violationData.photo && typeof violationData.photo === 'string' && violationData.photo.startsWith('data:')) {
            try {
                const uploadResult = uploadFileToDrive(
                    violationData.photo,
                    'violation_' + (violationData.id || Utilities.getUuid()) + '_' + Date.now() + '.jpg',
                    'image/jpeg',
                    'Violations'
                );
                if (uploadResult && uploadResult.success) {
                    violationData.photo = uploadResult.directLink || uploadResult.shareableLink || violationData.photo;
                }
            } catch (imageError) {
                Logger.log('خطأ في رفع صورة المخالفة: ' + imageError.toString());
            }
        }
        
        // معالجة attachments - التأكد من تحويلها إلى JSON string مع الروابط
        if (violationData.attachments && Array.isArray(violationData.attachments)) {
            violationData.attachments = stringifyAttachments(violationData.attachments);
        } else if (violationData.attachments && typeof violationData.attachments === 'object') {
            violationData.attachments = stringifyAttachments([violationData.attachments]);
        } else if (!violationData.attachments) {
            violationData.attachments = '[]';
        }
        
        return appendToSheet(sheetName, violationData);
    } catch (error) {
        Logger.log('Error in addViolationToSheet: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء إضافة المخالفة: ' + error.toString() };
    }
}


/**
 * حذف مخالفة
 */
function deleteViolationFromSheet(violationId) {
    try {
        if (!violationId) {
            return { success: false, message: 'معرف المخالفة غير موجود' };
        }
        
        const sheetName = 'Violations';
        const spreadsheetId = getSpreadsheetId();
        
        if (!spreadsheetId) {
            return { success: false, message: 'معرف Google Sheets غير محدد' };
        }
        
        // قراءة البيانات الحالية
        const currentData = readFromSheet(sheetName, spreadsheetId);
        
        // التحقق من وجود المخالفة والحصول على بياناتها قبل الحذف
        const violation = currentData.find(v => v.id === violationId);
        if (!violation) {
            return { success: false, message: 'المخالفة غير موجودة في قاعدة البيانات' };
        }
        
        // ✅ حذف الصف مباشرة بدون إعادة كتابة الجدول بالكامل
        const result = deleteRowById(sheetName, violationId, spreadsheetId);
        
        if (result.success) {
            // ✅ تم تحديث: تنظيف المراجع من ApprovedContractors فقط
            try {
                // تنظيف من جدول المقاولين المعتمدين (إذا كان هناك مراجع)
                if (violation.contractorId || violation.contractorName) {
                    const approvedContractorsSheet = 'ApprovedContractors';
                    const approvedContractorsData = readFromSheet(approvedContractorsSheet, spreadsheetId);
                    let contractorsUpdated = false;
                    
                    // ✅ لا حاجة لتخزين violations داخل contractors
                    // يمكن الاستعلام عن المخالفات من جدول Violations مباشرة
                    // هذا الكود تم إزالته لتبسيط البنية وتجنب JSON
                    
                    if (contractorsUpdated) {
                        saveToSheet(approvedContractorsSheet, approvedContractorsData, spreadsheetId);
                    }
                }
                
                // تنظيف من جدول الموظفين (إذا كان هناك مراجع)
                if (violation.employeeId || violation.employeeCode || violation.employeeNumber || violation.employeeName) {
                    const employeesSheet = 'Employees';
                    const employeesData = readFromSheet(employeesSheet, spreadsheetId);
                    let employeesUpdated = false;
                    
                    // ✅ لا حاجة لتخزين violations داخل employees
                    // يمكن الاستعلام عن المخالفات من جدول Violations مباشرة
                    // هذا الكود تم إزالته لتبسيط البنية وتجنب JSON
                    
                    if (employeesUpdated) {
                        saveToSheet(employeesSheet, employeesData, spreadsheetId);
                    }
                }
            } catch (cleanupError) {
                // لا نعتبر خطأ التنظيف خطأ فادح - المخالفة تم حذفها بالفعل
                Logger.log('Warning: Could not clean up violation references: ' + cleanupError.toString());
            }
            
            return { 
                success: true, 
                message: 'تم حذف المخالفة بنجاح من قاعدة البيانات وجميع السجلات المرتبطة' 
            };
        } else {
            return result;
        }
    } catch (error) {
        Logger.log('Error in deleteViolationFromSheet: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء حذف المخالفة: ' + error.toString() };
    }
}

/**
 * إضافة نوع مخالفة (للإضافة المباشرة)
 */
function addViolationTypeToSheet(typeData) {
    const sheetName = 'ViolationTypes';
    return appendToSheet(sheetName, typeData);
}

/**
 * التحقق من صلاحيات المستخدم لإدارة أنواع المخالفات (من الإعدادات)
 */
function checkViolationTypesPermission(userData) {
    try {
        // إذا لم يتم تمرير بيانات المستخدم، رفض الوصول
        if (!userData) {
            return { hasPermission: false, message: 'يجب تسجيل الدخول أولاً' };
        }
        
        // التحقق من الدور (Role)
        const userRole = userData.role || '';
        const allowedRoles = ['admin', 'safety_officer', 'manager'];
        
        if (allowedRoles.includes(userRole.toLowerCase())) {
            return { hasPermission: true, message: 'صلاحية صحيحة' };
        }
        
        // التحقق من الصلاحيات المخصصة (Permissions)
        let userPermissions = userData.permissions || {};
        if (typeof userPermissions === 'string') {
            try {
                userPermissions = JSON.parse(userPermissions);
            } catch (e) {
                userPermissions = {};
            }
        }
        
        // التحقق من صلاحية 'admin' أو 'manage-settings' أو 'violation-types'
        if (userPermissions['admin'] === true || 
            userPermissions['manage-settings'] === true ||
            userPermissions['violation-types'] === true) {
            return { hasPermission: true, message: 'صلاحية صحيحة' };
        }
        
        return { 
            hasPermission: false, 
            message: 'ليس لديك صلاحية لإدارة أنواع المخالفات. يجب أن تكون مدير النظام أو لديك صلاحية خاصة.' 
        };
    } catch (error) {
        Logger.log('Error checking violation types permissions: ' + error.toString());
        return { hasPermission: false, message: 'حدث خطأ أثناء التحقق من الصلاحيات' };
    }
}

/**
 * حفظ جميع أنواع المخالفات في Violation_Types_DB (من الإعدادات)
 */
function saveViolationTypesToSheet(violationTypesData) {
    try {
        // التحقق من الصلاحيات
        const userData = violationTypesData.userData || violationTypesData.user || {};
        const permissionCheck = checkViolationTypesPermission(userData);
        
        if (!permissionCheck.hasPermission) {
            return { 
                success: false, 
                message: permissionCheck.message || 'ليس لديك صلاحية لحفظ أنواع المخالفات',
                errorCode: 'PERMISSION_DENIED'
            };
        }
        
        const sheetName = 'Violation_Types_DB';
        const spreadsheetId = getSpreadsheetId();
        
        if (!spreadsheetId) {
            return { success: false, message: 'معرف Google Sheets غير محدد' };
        }
        
        // التحقق من أن violationTypes موجودة
        const violationTypes = violationTypesData.violationTypes || violationTypesData.data || [];
        
        if (!Array.isArray(violationTypes)) {
            return { success: false, message: 'بيانات أنواع المخالفات غير صحيحة' };
        }
        
        // حفظ كل نوع في سطر منفصل
        // أولاً، نحذف البيانات القديمة (نحفظ نسخة احتياطية)
        const existingData = readFromSheet(sheetName, spreadsheetId);
        
        // ✅ حفظ البيانات الجديدة - array (سيتم تحويلها تلقائياً)
        const result = saveToSheet(sheetName, { 
            id: 'VIOLATION-TYPES-ALL',
            violationTypes: violationTypes, // ✅ array بدون JSON.stringify
            updatedAt: new Date().toISOString(),
            updatedBy: userData.name || userData.email || 'System'
        }, spreadsheetId);
        
        // أيضاً، نحفظ في ViolationTypes (للتوافق مع النظام القديم)
        if (result.success) {
            // محاولة حفظ في ViolationTypes أيضاً (لكل نوع سطر)
            try {
                const violationTypesSheetName = 'ViolationTypes';
                // نحفظ جميع الأنواع في ViolationTypes
                violationTypes.forEach(type => {
                    if (type && type.id) {
                        // تحقق إذا كان موجوداً بالفعل
                        const existingTypes = readFromSheet(violationTypesSheetName, spreadsheetId);
                        const existingIndex = existingTypes.findIndex(t => t.id === type.id);
                        
                        if (existingIndex >= 0) {
                            // تحديث
                            const updateData = { ...type, updatedAt: new Date().toISOString() };
                            saveToSheet(violationTypesSheetName, updateData, spreadsheetId);
                        } else {
                            // إضافة جديد
                            const newType = {
                                ...type,
                                createdAt: type.createdAt || new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            };
                            appendToSheet(violationTypesSheetName, newType, spreadsheetId);
                        }
                    }
                });
            } catch (syncError) {
                Logger.log('Warning: Could not sync to ViolationTypes sheet: ' + syncError.toString());
                // لا نعتبر هذا خطأ فادح
            }
        }
        
        return result;
    } catch (error) {
        Logger.log('Error in saveViolationTypesToSheet: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء حفظ أنواع المخالفات: ' + error.toString() };
    }
}

/**
 * الحصول على جميع أنواع المخالفات من Violation_Types_DB
 */
function getViolationTypesFromSheet() {
    try {
        const sheetName = 'Violation_Types_DB';
        const spreadsheetId = getSpreadsheetId();
        
        if (!spreadsheetId) {
            // إذا لم يكن هناك spreadsheetId، نحاول من ViolationTypes القديم
            return getViolationTypesFromLegacySheet();
        }
        
        const data = readFromSheet(sheetName, spreadsheetId);
        
        // إذا لم تكن هناك بيانات، نحاول من ViolationTypes القديم
        if (!data || data.length === 0) {
            return getViolationTypesFromLegacySheet();
        }
        
        // نأخذ آخر سجل (النسخة الأحدث)
        const latestRecord = data[data.length - 1];
        
        // تحليل JSON string
        let violationTypes = [];
        if (typeof latestRecord.violationTypes === 'string') {
            try {
                violationTypes = JSON.parse(latestRecord.violationTypes);
            } catch (e) {
                Logger.log('Error parsing violationTypes JSON: ' + e.toString());
                // نحاول من ViolationTypes القديم
                return getViolationTypesFromLegacySheet();
            }
        } else if (Array.isArray(latestRecord.violationTypes)) {
            violationTypes = latestRecord.violationTypes;
        }
        
        return { 
            success: true, 
            data: violationTypes,
            updatedAt: latestRecord.updatedAt || new Date().toISOString()
        };
    } catch (error) {
        Logger.log('Error in getViolationTypesFromSheet: ' + error.toString());
        // نحاول من ViolationTypes القديم
        return getViolationTypesFromLegacySheet();
    }
}

/**
 * الحصول على أنواع المخالفات من ViolationTypes (للتوافق مع النظام القديم)
 */
function getViolationTypesFromLegacySheet() {
    try {
        const sheetName = 'ViolationTypes';
        const spreadsheetId = getSpreadsheetId();
        
        if (!spreadsheetId) {
            return { success: true, data: [], message: 'معرف Google Sheets غير محدد' };
        }
        
        const data = readFromSheet(sheetName, spreadsheetId);
        
        if (!data || data.length === 0) {
            return { success: true, data: [] };
        }
        
        // تصفية الأنواع النشطة فقط
        const activeTypes = data.filter(type => type.isActive !== false);
        
        return { success: true, data: activeTypes };
    } catch (error) {
        Logger.log('Error in getViolationTypesFromLegacySheet: ' + error.toString());
        return { success: true, data: [], message: 'حدث خطأ أثناء قراءة أنواع المخالفات' };
    }
}

/**
 * تحديث نوع مخالفة (من الإعدادات)
 */
function updateViolationTypeInSheet(typeId, updateData) {
    try {
        // التحقق من الصلاحيات
        const userData = updateData.userData || updateData.user || {};
        const permissionCheck = checkViolationTypesPermission(userData);
        
        if (!permissionCheck.hasPermission) {
            return { 
                success: false, 
                message: permissionCheck.message || 'ليس لديك صلاحية لتحديث أنواع المخالفات',
                errorCode: 'PERMISSION_DENIED'
            };
        }
        
        // الحصول على جميع الأنواع
        const allTypesResult = getViolationTypesFromSheet();
        if (!allTypesResult.success) {
            return { success: false, message: 'فشل في قراءة أنواع المخالفات' };
        }
        
        let violationTypes = allTypesResult.data || [];
        
        // البحث عن النوع وتحديثه
        const typeIndex = violationTypes.findIndex(t => t.id === typeId);
        if (typeIndex < 0) {
            return { success: false, message: 'نوع المخالفة غير موجود' };
        }
        
        // تحديث البيانات
        violationTypes[typeIndex] = {
            ...violationTypes[typeIndex],
            ...updateData,
            id: typeId, // التأكد من عدم تغيير ID
            updatedAt: new Date().toISOString()
        };
        
        // حفظ جميع الأنواع
        return saveViolationTypesToSheet({
            violationTypes: violationTypes,
            userData: userData
        });
    } catch (error) {
        Logger.log('Error in updateViolationTypeInSheet: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء تحديث نوع المخالفة: ' + error.toString() };
    }
}

/**
 * حذف نوع مخالفة (من الإعدادات)
 */
function deleteViolationTypeFromSheet(typeId, userData) {
    try {
        // التحقق من الصلاحيات
        const permissionCheck = checkViolationTypesPermission(userData || {});
        
        if (!permissionCheck.hasPermission) {
            return { 
                success: false, 
                message: permissionCheck.message || 'ليس لديك صلاحية لحذف أنواع المخالفات',
                errorCode: 'PERMISSION_DENIED'
            };
        }
        
        // الحصول على جميع الأنواع
        const allTypesResult = getViolationTypesFromSheet();
        if (!allTypesResult.success) {
            return { success: false, message: 'فشل في قراءة أنواع المخالفات' };
        }
        
        let violationTypes = allTypesResult.data || [];
        
        // حذف النوع
        violationTypes = violationTypes.filter(t => t.id !== typeId);
        
        // حفظ جميع الأنواع
        return saveViolationTypesToSheet({
            violationTypes: violationTypes,
            userData: userData
        });
    } catch (error) {
        Logger.log('Error in deleteViolationTypeFromSheet: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء حذف نوع المخالفة: ' + error.toString() };
    }
}

