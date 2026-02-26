/**
 * Google Apps Script for HSE System - Contractors Module
 * 
 * موديول المقاولين - النسخة المحسنة
 */

/**
 * ============================================
 * ✅ تم إزالة دوال جدول Contractors
 * ✅ الآن نعتمد فقط على ApprovedContractors
 * ============================================
 * 
 * ملاحظة: تم نقل جميع وظائف المقاولين إلى ApprovedContractors
 * جميع المقاولين يجب أن يكونوا معتمدين في ApprovedContractors
 */

/**
 * ✅ دالة نقل البيانات من Contractors إلى ApprovedContractors
 * هذه الدالة تُستخدم لمرة واحدة لنقل البيانات القديمة
 * 
 * @returns {object} - نتيجة عملية النقل
 */
function migrateContractorsToApproved() {
    try {
        const spreadsheetId = getSpreadsheetId();
        
        if (!spreadsheetId || spreadsheetId.trim() === '') {
            return { 
                success: false, 
                message: 'معرف Google Sheets غير محدد' 
            };
        }
        
        // قراءة البيانات من كلا الجدولين
        const contractors = readFromSheet('Contractors', spreadsheetId);
        const approvedContractors = readFromSheet('ApprovedContractors', spreadsheetId);
        
        if (!Array.isArray(contractors) || contractors.length === 0) {
            return { 
                success: true, 
                message: 'لا توجد بيانات في جدول Contractors للنقل',
                migrated: 0
            };
        }
        
        let migratedCount = 0;
        let skippedCount = 0;
        const errors = [];
        
        contractors.forEach(contractor => {
            try {
                if (!contractor || !contractor.id) {
                    skippedCount++;
                    return;
                }
                
                // التحقق من عدم وجود المقاول في ApprovedContractors
                const exists = approvedContractors.find(ac => 
                    ac.contractorId === contractor.id || 
                    (ac.companyName && contractor.name && ac.companyName.trim().toLowerCase() === contractor.name.trim().toLowerCase()) ||
                    (ac.code && contractor.code && ac.code === contractor.code)
                );
                
                if (exists) {
                    skippedCount++;
                    return;
                }
                
                // إنشاء سجل معتمد جديد من بيانات المقاول
                const approvedEntity = {
                    id: contractor.approvedEntityId || generateSequentialId('ACN', 'ApprovedContractors', spreadsheetId),
                    contractorId: contractor.id, // الحفاظ على ID الأصلي للربط
                    companyName: contractor.name || contractor.company || 'غير محدد',
                    entityType: contractor.entityType || 'contractor',
                    serviceType: contractor.serviceType || '',
                    licenseNumber: contractor.contractNumber || contractor.licenseNumber || '',
                    code: contractor.code || generateContractorCode(spreadsheetId),
                    isoCode: contractor.code || generateContractorCode(spreadsheetId),
                    approvalDate: contractor.createdAt || new Date(),
                    expiryDate: contractor.endDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                    status: (contractor.status === 'نشط' || contractor.status === 'active') ? 'approved' : 'pending',
                    notes: contractor.notes || 'تم النقل تلقائياً من جدول Contractors',
                    safetyReviewer: contractor.contactPerson || '',
                    createdAt: contractor.createdAt || new Date(),
                    updatedAt: contractor.updatedAt || new Date()
                };
                
                approvedContractors.push(approvedEntity);
                migratedCount++;
                
            } catch (error) {
                errors.push({
                    contractorId: contractor.id,
                    error: error.toString()
                });
            }
        });
        
        // حفظ البيانات المحدثة
        if (migratedCount > 0) {
            const saveResult = saveToSheet('ApprovedContractors', approvedContractors, spreadsheetId);
            if (!saveResult.success) {
            return { 
                success: false, 
                    message: 'فشل حفظ البيانات: ' + saveResult.message,
                    migrated: migratedCount,
                    errors: errors
                };
            }
        }
        
        return { 
            success: true, 
            message: `تم نقل ${migratedCount} مقاول بنجاح`,
            migrated: migratedCount,
            skipped: skippedCount,
            errors: errors.length > 0 ? errors : null
        };
        
    } catch (error) {
        Logger.log('Error in migrateContractorsToApproved: ' + error.toString());
        return { 
            success: false, 
            message: 'حدث خطأ أثناء نقل البيانات: ' + error.toString() 
        };
    }
}

/**
 * حذف مقاول معتمد مباشرة
 * ✅ جديد: يدعم الحذف المتتالية
 */
function deleteApprovedContractor(approvedContractorId) {
    try {
        if (!approvedContractorId) {
            return { success: false, message: 'معرف المقاول المعتمد غير محدد' };
        }
        
        const spreadsheetId = getSpreadsheetId();
        
        // 1. حذف من ApprovedContractors
        const sheetName = 'ApprovedContractors';
        const data = readFromSheet(sheetName, spreadsheetId);
        const recordToDelete = data.find(c => c.id === approvedContractorId);
        const filteredData = data.filter(c => c.id !== approvedContractorId);
        
        if (filteredData.length === data.length) {
            return { success: false, message: 'المقاول المعتمد غير موجود' };
        }
        
        const saveResult = saveToSheet(sheetName, filteredData, spreadsheetId);
        if (!saveResult.success) {
            return saveResult;
        }
        
        // ✅ تم إزالة حذف من Contractors - نعتمد فقط على ApprovedContractors
        
        return { success: true, message: 'تم حذف المقاول المعتمد بنجاح' };
    } catch (error) {
        Logger.log('Error deleting approved contractor: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء حذف المقاول المعتمد: ' + error.toString() };
    }
}

/**
 * ============================================
 * المقاولين المعتمدين (Approved Contractors)
 * ============================================
 */

/**
 * إضافة مقاول معتمد
 */
function addApprovedContractorToSheet(contractorData) {
    try {
        if (!contractorData) {
            return { success: false, message: 'بيانات المقاول غير موجودة' };
        }
        
        const sheetName = 'ApprovedContractors';
        const spreadsheetId = getSpreadsheetId();
        
        // قراءة البيانات الحالية للتأكد من عدم وجود مكرر
        const existingData = readFromSheet(sheetName, spreadsheetId);
        // ✅ تحسين التحقق من التكرار - فحص متعدد المعايير بدقة أكبر
        // ✅ التحقق من التكرار بناءً على ID أولاً (الأكثر دقة)
        let duplicate = null;
        if (contractorData.id) {
            duplicate = existingData.find(c => c && c.id === contractorData.id);
        }
        
        // ✅ إذا لم يوجد تكرار بالID، التحقق من الكود (يجب أن يكون فريداً)
        if (!duplicate && contractorData.code) {
            duplicate = existingData.find(c => {
                if (!c) return false;
                const existingCode = c.code || c.isoCode;
                return existingCode && existingCode === contractorData.code;
            });
        }
        
        // ✅ إذا لم يوجد تكرار بالكود، التحقق من السجل التجاري (يجب أن يكون فريداً أيضاً)
        if (!duplicate && contractorData.licenseNumber && contractorData.licenseNumber.trim() !== '') {
            duplicate = existingData.find(c => {
                if (!c || !c.licenseNumber) return false;
                return c.licenseNumber.trim() === contractorData.licenseNumber.trim();
            });
        }
        
        // ✅ ملاحظة: تم إزالة التحقق من اسم الشركة + نوع الجهة
        // ✅ لأنه قد يسبب مشاكل مع مقاولين مختلفين بنفس الاسم
        // ✅ نعتمد فقط على ID، الكود، ورقم الترخيص للتحقق من التكرار
        
        if (duplicate) {
            Logger.log('⚠️ Duplicate contractor found: id=' + (duplicate.id || 'N/A') + ', companyName=' + (duplicate.companyName || 'N/A') + ', code=' + (duplicate.code || duplicate.isoCode || 'N/A'));
            Logger.log('⚠️ Updating existing contractor instead of adding new one');
            
            // ✅ إصلاح: تحديث جميع الحقول المهمة بما فيها companyName و entityType
            const updateData = {};
            const fieldsToUpdate = [
                'companyName',      // ✅ إضافة اسم الشركة
                'entityType',       // ✅ إضافة نوع الجهة
                'code', 
                'isoCode', 
                'serviceType', 
                'licenseNumber', 
                'approvalDate', 
                'expiryDate', 
                'status', 
                'notes', 
                'contractorId', 
                'safetyReviewer',
                'contactPerson',    // ✅ إضافة شخص الاتصال
                'phone',            // ✅ إضافة الهاتف
                'email'             // ✅ إضافة البريد
            ];
            
            fieldsToUpdate.forEach(field => {
                if (contractorData.hasOwnProperty(field) && contractorData[field] !== undefined) {
                    updateData[field] = contractorData[field];
                }
            });
            
            // تحديث updatedAt دائماً
            updateData.updatedAt = new Date();
            
            const updateResult = updateApprovedContractor(duplicate.id, updateData);
            // ✅ إرجاع id المحدث في النتيجة مع رسالة توضيحية
            if (updateResult.success) {
                updateResult.id = duplicate.id;
                updateResult.isDuplicate = true;
                updateResult.message = 'المقاول/المورد مسجل بالفعل في قائمة المعتمدين. تم تحديث البيانات الموجودة بدلاً من إضافة سجل جديد.';
                updateResult.duplicateInfo = {
                    id: duplicate.id,
                    companyName: contractorData.companyName || duplicate.companyName, // ✅ استخدام الاسم الجديد
                    code: duplicate.code || duplicate.isoCode,
                    licenseNumber: duplicate.licenseNumber
                };
            }
            return updateResult;
        }
        
        Logger.log('✅ No duplicate found - adding new contractor: id=' + (contractorData.id || 'N/A') + ', companyName=' + (contractorData.companyName || 'N/A') + ', code=' + (contractorData.code || 'N/A'));
        
        // إضافة حقول تلقائية
        if (!contractorData.id) {
            contractorData.id = generateSequentialId('ACN', sheetName, spreadsheetId);
        }
        if (!contractorData.createdAt) {
            contractorData.createdAt = new Date();
        }
        if (!contractorData.updatedAt) {
            contractorData.updatedAt = new Date();
        }
        if (!contractorData.status) {
            contractorData.status = 'approved';
        }
        
        // ✅ تسجيل قبل الإضافة للتأكد
        Logger.log('📝 addApprovedContractorToSheet: About to append new contractor to ApprovedContractors');
        Logger.log('📝 Contractor data: id=' + contractorData.id + ', companyName=' + (contractorData.companyName || 'N/A') + ', code=' + (contractorData.code || 'N/A'));
        
        // ✅ قراءة البيانات الحالية قبل الإضافة لتسجيل عدد الصفوف
        const dataBeforeAppend = readFromSheet(sheetName, spreadsheetId);
        const rowCountBefore = Array.isArray(dataBeforeAppend) ? dataBeforeAppend.length : 0;
        Logger.log('📝 Current row count in ApprovedContractors: ' + rowCountBefore + ' (excluding headers)');
        
        // ✅ استدعاء appendToSheet() لإضافة المقاول في آخر صف
        const result = appendToSheet(sheetName, contractorData, spreadsheetId);
        
        // ✅ حفظ البيانات مباشرة بعد appendToSheet لضمان التحديث
        // ✅ (appendToSheet تستدعي flush() بالفعل، لكن نضيفه هنا للتأكد)
        SpreadsheetApp.flush();
        
        // ✅ التحقق من النتيجة والتحقق من أن الصف تم إضافته وليس استبداله
        if (result.success) {
            Logger.log('✅ addApprovedContractorToSheet: Successfully added contractor. Row number: ' + (result.rowNumber || 'N/A'));
            
            // ✅ التحقق النهائي: قراءة البيانات بعد الإضافة للتأكد من أن عدد الصفوف زاد
            try {
                const dataAfterAppend = readFromSheet(sheetName, spreadsheetId);
                const rowCountAfter = Array.isArray(dataAfterAppend) ? dataAfterAppend.length : 0;
                Logger.log('📝 Row count after append: ' + rowCountAfter + ' (was ' + rowCountBefore + ')');
                
                if (rowCountAfter <= rowCountBefore) {
                    Logger.log('❌ ERROR: Row count did not increase! Row was not added correctly.');
                    Logger.log('❌ This indicates the row may have been overwritten instead of appended.');
                    return { 
                        success: false, 
                        message: 'فشل إضافة المقاول: لم يتم إضافة صف جديد (قد يكون تم استبدال صف موجود)' 
                    };
                } else {
                    Logger.log('✅ VERIFIED: Row count increased from ' + rowCountBefore + ' to ' + rowCountAfter + ' - New row was added successfully');
                }
            } catch (verifyError) {
                Logger.log('⚠️ Warning: Could not verify row count after append: ' + verifyError.toString());
                // لا نعيد خطأ هنا، لأن appendToSheet قد تكون نجحت
            }
        } else {
            Logger.log('❌ addApprovedContractorToSheet: Failed to add contractor: ' + (result.message || 'Unknown error'));
        }
        
        return result;
    } catch (error) {
        Logger.log('Error in addApprovedContractorToSheet: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء إضافة المقاول المعتمد: ' + error.toString() };
    }
}

/**
 * تحديث مقاول معتمد
 * ✅ تم التعديل: استخدام updateSingleRowInSheet() لتحديث صف واحد فقط بدون حذف الصفوف الأخرى
 */
function updateApprovedContractor(approvedContractorId, updateData) {
    try {
        if (!approvedContractorId) {
            return { success: false, message: 'معرف المقاول المعتمد غير محدد' };
        }
        
        const sheetName = 'ApprovedContractors';
        const spreadsheetId = getSpreadsheetId();
        
        // ✅ استخدام updateSingleRowInSheet() لتحديث صف واحد فقط بدون حذف الصفوف الأخرى
        const result = updateSingleRowInSheet(sheetName, approvedContractorId, updateData, spreadsheetId);
        
        if (result.success) {
            Logger.log('✅ Successfully updated approved contractor: ' + approvedContractorId);
        } else {
            Logger.log('⚠️ Failed to update approved contractor: ' + result.message);
        }
        
        return result;
    } catch (error) {
        Logger.log('Error updating approved contractor: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء تحديث المقاول المعتمد: ' + error.toString() };
    }
}

/**
 * الحصول على جميع المقاولين المعتمدين
 */
function getAllApprovedContractors(filters = {}) {
    try {
        const sheetName = 'ApprovedContractors';
        let data = readFromSheet(sheetName, getSpreadsheetId());
        
        // تطبيق الفلاتر
        if (filters.status) {
            data = data.filter(c => c.status === filters.status);
        }
        if (filters.expiringSoon) {
            const now = new Date();
            const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            data = data.filter(c => {
                if (!c.expiryDate) return false;
                const expiryDate = new Date(c.expiryDate);
                return expiryDate >= now && expiryDate <= thirtyDaysFromNow;
            });
        }
        
        // ترتيب حسب تاريخ الموافقة
        data.sort((a, b) => {
            const dateA = new Date(a.approvalDate || a.createdAt || 0);
            const dateB = new Date(b.approvalDate || b.createdAt || 0);
            return dateB - dateA;
        });
        
        return { success: true, data: data, count: data.length };
    } catch (error) {
        Logger.log('Error getting all approved contractors: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء قراءة المقاولين المعتمدين: ' + error.toString(), data: [] };
    }
}

/**
 * ============================================
 * تقييمات المقاولين (Contractor Evaluations)
 * ============================================
 */

/**
 * إضافة تقييم مقاول
 */
function addContractorEvaluationToSheet(evaluationData) {
    try {
        if (!evaluationData) {
            return { success: false, message: 'بيانات التقييم غير موجودة' };
        }
        
        const sheetName = 'ContractorEvaluations';
        const spreadsheetId = getSpreadsheetId();
        
        // ✅ إصلاح: حفظ كل بند كسجل منفصل في الجدول
        const evaluationId = evaluationData.id || generateSequentialId('CEV', sheetName, spreadsheetId);
        const now = new Date();
        const userId = evaluationData.createdBy || evaluationData.updatedBy || '';
        
        // البيانات الأساسية للتقييم
        const baseData = {
            id: evaluationId,
            evaluationId: evaluationId,
            contractorId: evaluationData.contractorId || '',
            contractorName: evaluationData.contractorName || '',
            evaluationDate: evaluationData.evaluationDate || now,
            evaluatorName: evaluationData.evaluatorName || '',
            projectName: evaluationData.projectName || '',
            location: evaluationData.location || '',
            generalNotes: evaluationData.generalNotes || '',
            compliantCount: evaluationData.compliantCount || 0,
            totalItems: evaluationData.totalItems || 0,
            finalScore: evaluationData.finalScore || null,
            finalRating: evaluationData.finalRating || '',
            isoCode: evaluationData.isoCode || ''
        };
        
        // ✅ حفظ كل بند كسجل منفصل
        const items = evaluationData.items || [];
        const results = [];
        
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var record = {
                ...baseData,
                // معلومات البند
                criteriaId: item.criteriaId || '',
                title: item.title || item.label || '',
                status: item.status || '',
                notes: item.notes || '',
                itemIndex: i + 1,
                // الحقول المطلوبة
                createdAt: item.createdAt || evaluationData.createdAt || now,
                updatedAt: item.updatedAt || evaluationData.updatedAt || now,
                createdBy: item.createdBy || evaluationData.createdBy || userId,
                updatedBy: item.updatedBy || evaluationData.updatedBy || userId,
                rowId: item.rowId || generateSequentialId('CEVROW', sheetName, spreadsheetId)
            };
            
            var result = appendToSheet(sheetName, record, spreadsheetId);
            results.push(result);
        }
        
        // إرجاع النتيجة (نجاح إذا تم حفظ جميع البنود)
        var allSuccess = results.every(function(r) { return r && r.success !== false; });
        return {
            success: allSuccess,
            message: allSuccess ? 'تم حفظ التقييم بنجاح' : 'حدث خطأ أثناء حفظ بعض البنود',
            evaluationId: evaluationId,
            savedItems: results.length
        };
    } catch (error) {
        Logger.log('Error in addContractorEvaluationToSheet: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء إضافة التقييم: ' + error.toString() };
    }
}

/**
 * تحديث تقييم مقاول
 */
function updateContractorEvaluation(evaluationId, updateData) {
    try {
        if (!evaluationId) {
            return { success: false, message: 'معرف التقييم غير محدد' };
        }
        
        const sheetName = 'ContractorEvaluations';
        const spreadsheetId = getSpreadsheetId();
        const data = readFromSheet(sheetName, spreadsheetId);
        const evaluationIndex = data.findIndex(e => e.id === evaluationId);
        
        if (evaluationIndex === -1) {
            return { success: false, message: 'التقييم غير موجود' };
        }
        
        updateData.updatedAt = new Date();
        for (var key in updateData) {
            if (updateData.hasOwnProperty(key)) {
                data[evaluationIndex][key] = updateData[key];
            }
        }
        
        return saveToSheet(sheetName, data, spreadsheetId);
    } catch (error) {
        Logger.log('Error updating contractor evaluation: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء تحديث التقييم: ' + error.toString() };
    }
}

/**
 * الحصول على جميع تقييمات المقاولين
 */
function getAllContractorEvaluations(filters = {}) {
    try {
        const sheetName = 'ContractorEvaluations';
        let data = readFromSheet(sheetName, getSpreadsheetId());
        
        // تطبيق الفلاتر
        if (filters.contractorId) {
            data = data.filter(e => e.contractorId === filters.contractorId);
        }
        if (filters.status) {
            data = data.filter(e => e.status === filters.status);
        }
        if (filters.startDate) {
            data = data.filter(e => {
                if (!e.evaluationDate) return false;
                return new Date(e.evaluationDate) >= new Date(filters.startDate);
            });
        }
        if (filters.endDate) {
            data = data.filter(e => {
                if (!e.evaluationDate) return false;
                return new Date(e.evaluationDate) <= new Date(filters.endDate);
            });
        }
        
        // ترتيب حسب تاريخ التقييم
        data.sort((a, b) => {
            const dateA = new Date(a.evaluationDate || a.createdAt || 0);
            const dateB = new Date(b.evaluationDate || b.createdAt || 0);
            return dateB - dateA;
        });
        
        return { success: true, data: data, count: data.length };
    } catch (error) {
        Logger.log('Error getting all contractor evaluations: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء قراءة التقييمات: ' + error.toString(), data: [] };
    }
}

/**
 * الحصول على تقييمات مقاول محدد
 */
function getContractorEvaluations(contractorId) {
    try {
        return getAllContractorEvaluations({ contractorId: contractorId });
    } catch (error) {
        Logger.log('Error getting contractor evaluations: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء قراءة التقييمات: ' + error.toString(), data: [] };
    }
}

/**
 * ============================================
 * طلبات اعتماد المقاولين (Contractor Approval Requests)
 * ============================================
 */

/**
 * إضافة طلب اعتماد مقاول
 */
function addContractorApprovalRequest(requestData) {
    try {
        if (!requestData) {
            return { success: false, message: 'بيانات الطلب غير موجودة' };
        }
        
        const sheetName = 'ContractorApprovalRequests';
        const spreadsheetId = getSpreadsheetId();
        
        // ✅ إصلاح: التحقق من أن ID غير موجود أو مؤقت (TEMP_) قبل توليد ID جديد
        // ✅ إذا كان ID غير موجود أو يبدأ بـ TEMP_ أو لا يبدأ بـ CAR_، نولد ID جديد
        const hasValidId = requestData.id && 
                           typeof requestData.id === 'string' && 
                           requestData.id.startsWith('CAR_') && 
                           !requestData.id.startsWith('TEMP_');
        
        if (!hasValidId) {
            // ✅ حذف ID القديم (المؤقت) قبل توليد ID جديد
            if (requestData.id && typeof requestData.id === 'string' && requestData.id.startsWith('TEMP_')) {
                Logger.log('⚠️ Warning: Removing temporary ID before generating new one. tempId=' + requestData.id);
            } else if (requestData.id && typeof requestData.id === 'string' && !requestData.id.startsWith('CAR_')) {
                Logger.log('⚠️ Warning: Removing invalid ID (does not start with CAR_) before generating new one. invalidId=' + requestData.id);
            } else if (!requestData.id) {
                Logger.log('ℹ️ No ID provided - generating new sequential ID');
            }
            requestData.id = generateSequentialId('CAR', sheetName, spreadsheetId);
            Logger.log('✅ Generated new ID for approval request: ' + requestData.id);
        } else {
            Logger.log('ℹ️ Using existing valid ID: ' + requestData.id);
        }
        if (!requestData.createdAt) {
            requestData.createdAt = new Date();
        }
        if (!requestData.status) {
            requestData.status = 'pending';
        }
        
        // ✅ استخدام appendToSheet مع spreadsheetId للاتساق
        const appendResult = appendToSheet(sheetName, requestData, spreadsheetId);
        
        // ✅ إرجاع البيانات مع ID للاستخدام في Frontend
        if (appendResult.success) {
            return {
                success: true,
                message: appendResult.message || 'تم إضافة طلب الاعتماد بنجاح',
                data: requestData, // ✅ إرجاع requestData مع ID المولد
                rowNumber: appendResult.rowNumber
            };
        } else {
            return appendResult;
        }
    } catch (error) {
        Logger.log('Error in addContractorApprovalRequest: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء إضافة طلب الاعتماد: ' + error.toString() };
    }
}

/**
 * تحديث طلب اعتماد مقاول
 * ✅ تم التعديل: استخدام updateSingleRowInSheet() لتحديث صف واحد فقط بدون حذف الصفوف الأخرى
 */
function updateContractorApprovalRequest(requestId, updateData) {
    try {
        if (!requestId) {
            return { success: false, message: 'معرف الطلب غير محدد' };
        }
        
        const sheetName = 'ContractorApprovalRequests';
        const spreadsheetId = getSpreadsheetId();
        
        // ✅ استخدام updateSingleRowInSheet() لتحديث صف واحد فقط بدون حذف الصفوف الأخرى
        const result = updateSingleRowInSheet(sheetName, requestId, updateData, spreadsheetId);
        
        if (result.success) {
            Logger.log('✅ Successfully updated contractor approval request: ' + requestId);
        } else {
            Logger.log('⚠️ Failed to update contractor approval request: ' + result.message);
        }
        
        return result;
    } catch (error) {
        Logger.log('Error updating contractor approval request: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء تحديث طلب الاعتماد: ' + error.toString() };
    }
}

/**
 * الحصول على جميع طلبات الاعتماد
 */
function getAllContractorApprovalRequests(filters = {}) {
    try {
        const sheetName = 'ContractorApprovalRequests';
        let data = readFromSheet(sheetName, getSpreadsheetId());
        
        // ✅ معالجة evaluationData للتأكد من تحليلها بشكل صحيح
        data = data.map(function(record) {
            if (record && record.evaluationData) {
                // محاولة تحليل evaluationData إذا كانت نصاً
                var evalData = record.evaluationData;
                var parseAttempts = 0;
                while (evalData && typeof evalData === 'string' && parseAttempts < 3) {
                    try {
                        evalData = JSON.parse(evalData);
                        parseAttempts++;
                    } catch (e) {
                        Logger.log('Warning: Could not parse evaluationData for request ' + record.id + ': ' + e.toString());
                        break;
                    }
                }
                record.evaluationData = evalData;
                
                // ✅ تحليل items داخل evaluationData
                if (record.evaluationData && record.evaluationData.items && typeof record.evaluationData.items === 'string') {
                    try {
                        record.evaluationData.items = JSON.parse(record.evaluationData.items);
                    } catch (e) {
                        Logger.log('Warning: Could not parse evaluationData.items for request ' + record.id);
                    }
                }
            }
            return record;
        });
        
        // تطبيق الفلاتر
        if (filters.status) {
            data = data.filter(r => r.status === filters.status);
        }
        if (filters.requestType) {
            data = data.filter(r => r.requestType === filters.requestType);
        }
        if (filters.createdBy) {
            data = data.filter(r => r.createdBy === filters.createdBy);
        }
        if (filters.pendingOnly) {
            data = data.filter(r => r.status === 'pending' || r.status === 'under_review');
        }
        
        // ترتيب حسب تاريخ الإنشاء
        data.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
        });
        
        return { success: true, data: data, count: data.length };
    } catch (error) {
        Logger.log('Error getting all contractor approval requests: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء قراءة طلبات الاعتماد: ' + error.toString(), data: [] };
    }
}

/**
 * توليد كود CON-xxx للمقاول
 * @param {string} spreadsheetId - معرف جدول البيانات
 * @returns {string} - كود المقاول بصيغة CON-xxx
 */
/**
 * توليد كود CON-xxx للمقاول
 * ✅ تم التحديث: البحث فقط في ApprovedContractors
 * @param {string} spreadsheetId - معرف جدول البيانات
 * @returns {string} - كود المقاول بصيغة CON-xxx
 */
function generateContractorCode(spreadsheetId) {
    try {
        // ✅ البحث فقط في ApprovedContractors (تم إزالة Contractors)
        const approvedData = readFromSheet('ApprovedContractors', spreadsheetId);
        let maxNumber = 0;
        
        // البحث في المعتمدين
        if (Array.isArray(approvedData)) {
            approvedData.forEach(function(approved) {
                if (approved) { // ✅ التحقق من approved أولاً
                    const code = approved.code || approved.isoCode;
                    if (code) {
                        const match = code.match(/CON-(\d+)/);
                        if (match) {
                            const num = parseInt(match[1], 10);
                            if (!isNaN(num) && num > maxNumber) { // ✅ التحقق من isNaN
                                maxNumber = num;
                            }
                        }
                    }
                }
            });
        }
        
        const newNumber = maxNumber + 1;
        const paddedNumber = ('000' + newNumber).slice(-3); // تنسيق الرقم بـ 3 خانات
        return 'CON-' + paddedNumber;
    } catch (error) {
        Logger.log('Error in generateContractorCode: ' + error.toString());
        // في حالة الخطأ، نعيد كود افتراضي
        return 'CON-001';
    }
}

/**
 * اعتماد طلب اعتماد مقاول
 */

function approveContractorApprovalRequest(requestId, userData) {
    try {
        if (!requestId) {
            return { success: false, message: 'معرف الطلب غير محدد' };
        }
        
        // التحقق من صلاحيات المستخدم
        if (!checkAdminPermissions(userData)) {
            return { success: false, message: 'ليس لديك صلاحية لاعتماد الطلبات' };
        }
        
        const sheetName = 'ContractorApprovalRequests';
        const spreadsheetId = getSpreadsheetId();
        const data = readFromSheet(sheetName, spreadsheetId);
        const requestIndex = data.findIndex(r => r.id === requestId);
        
        if (requestIndex === -1) {
            return { success: false, message: 'طلب الاعتماد غير موجود' };
        }
        
        const request = data[requestIndex];
        
        // تحديث حالة الطلب
        request.status = 'approved';
        request.approvedAt = new Date();
        request.approvedBy = userData.id || '';
        request.approvedByName = userData.name || '';
        request.updatedAt = new Date();
        
        let approvedEntity = null;
        let finalContractor = null;
        
        // إضافة المقاول/المورد إلى قائمة المعتمدين
        if (request.requestType === 'contractor' || request.requestType === 'supplier') {
            // ✅ توليد كود CON-xxx موحد
            const contractorCode = generateContractorCode(spreadsheetId);
            
            approvedEntity = {
                id: generateSequentialId('ACN', 'ApprovedContractors', spreadsheetId),
                code: contractorCode,          // ✅ إضافة كود CON-xxx
                isoCode: contractorCode,       // ✅ إضافة isoCode أيضاً للتوافق
                companyName: request.companyName,
                entityType: request.requestType === 'contractor' ? 'contractor' : 'supplier',
                serviceType: request.serviceType,
                licenseNumber: request.licenseNumber || '',
                contactPerson: request.contactPerson || '',  // ✅ إضافة شخص الاتصال
                phone: request.phone || '',                   // ✅ إضافة الهاتف
                email: request.email || '',                   // ✅ إضافة البريد
                approvalDate: new Date(),
                expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // سنة من الآن
                status: 'approved',
                notes: request.notes || '',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            
            Logger.log('✅ Approving contractor with code: ' + contractorCode);
            Logger.log('📝 Adding approved contractor to ApprovedContractors sheet (separate from ContractorApprovalRequests)');
            
            const addResult = addApprovedContractorToSheet(approvedEntity);
            if (!addResult.success) {
                Logger.log('❌ Error: Failed to add approved contractor: ' + addResult.message);
                // ✅ إرجاع خطأ فوري - لا نكمل العملية إذا فشل إضافة المعتمد
                return { success: false, message: 'فشل إضافة المقاول إلى قائمة المعتمدين: ' + addResult.message };
            }
            
            // ✅ التحقق من نجاح الإضافة أو التحديث
            if (addResult.isDuplicate) {
                Logger.log('⚠️ Contractor already exists - updated existing record instead of adding new one');
                Logger.log('⚠️ Duplicate info: id=' + (addResult.duplicateInfo?.id || 'N/A') + ', companyName=' + (addResult.duplicateInfo?.companyName || 'N/A'));
            } else {
                Logger.log('✅ Successfully added approved contractor to ApprovedContractors. Row number: ' + (addResult.rowNumber || 'N/A'));
            }
            
            // ✅ في حالة التحديث (duplicate)، نستخدم id من addResult
            // في حالة الإضافة الجديدة، approvedEntity.id موجود بالفعل
            if (addResult.id) {
                approvedEntity.id = addResult.id;
                Logger.log('✅ Using approved contractor ID: ' + approvedEntity.id);
            }
            
            // ✅ إضافة معلومات التكرار إلى النتيجة النهائية
            if (addResult.isDuplicate) {
                approvedEntity._isDuplicate = true;
                approvedEntity._duplicateMessage = addResult.message;
            }
            
            // ✅ تم إزالة إضافة المقاول إلى جدول Contractors
            // ✅ الآن نعتمد فقط على ApprovedContractors
            // ✅ approvedEntity يحتوي على جميع البيانات المطلوبة
            finalContractor = approvedEntity;
        }
        
        // إذا كان الطلب لتقييم، إضافة التقييم إلى القائمة
        if (request.requestType === 'evaluation' && request.evaluationData) {
            const evaluationData = request.evaluationData;
            evaluationData.status = 'approved';
            evaluationData.approvedAt = new Date();
            evaluationData.approvedBy = userData.id || '';
            
            const addEvaluationResult = addContractorEvaluationToSheet(evaluationData);
            if (!addEvaluationResult.success) {
                Logger.log('Warning: Failed to add evaluation: ' + addEvaluationResult.message);
            }
        }
        
        // ✅ حفظ تحديث الطلب في ContractorApprovalRequests فقط
        // ✅ هذا يؤثر فقط على ContractorApprovalRequests، لا يؤثر على ApprovedContractors
        // ✅ استخدام updateSingleRowInSheet() لتحديث صف واحد فقط بدون حذف الصفوف الأخرى
        Logger.log('📝 Updating approval request in ContractorApprovalRequests (sheetName=' + sheetName + ')');
        const updateData = {
            status: request.status,
            approvedAt: request.approvedAt,
            approvedBy: request.approvedBy,
            approvedByName: request.approvedByName
        };
        const updateResult = updateSingleRowInSheet(sheetName, requestId, updateData, spreadsheetId);
        
        if (updateResult.success) {
            Logger.log('✅ Successfully approved contractor approval request: ' + requestId);
            Logger.log('✅ Approval request updated in ContractorApprovalRequests');
            
            // ✅ التحقق من أن approvedEntity تم إنشاؤه بشكل صحيح
            if (approvedEntity) {
                Logger.log('✅ ApprovedEntity details: id=' + (approvedEntity.id || 'N/A') + ', companyName=' + (approvedEntity.companyName || 'N/A') + ', code=' + (approvedEntity.code || approvedEntity.isoCode || 'N/A') + ', entityType=' + (approvedEntity.entityType || 'N/A'));
            } else {
                Logger.log('⚠️ Warning: approvedEntity is null - this may be normal if requestType is not contractor/supplier');
            }
            
            // Return extended success object
            const result = {
                success: true,
                message: 'تم اعتماد الطلب بنجاح',
                approvedEntity: approvedEntity,
                contractor: finalContractor
            };
            
            // ✅ إضافة معلومات التكرار إذا كانت موجودة
            if (approvedEntity && approvedEntity._isDuplicate) {
                result.isDuplicate = true;
                result.duplicateMessage = approvedEntity._duplicateMessage || 'المقاول/المورد مسجل بالفعل في قائمة المعتمدين. تم تحديث البيانات الموجودة.';
                result.duplicateInfo = {
                    id: approvedEntity.id,
                    companyName: approvedEntity.companyName,
                    code: approvedEntity.code || approvedEntity.isoCode
                };
            }
            
            // ✅ التحقق النهائي: التأكد من أن approvedEntity يحتوي على جميع البيانات المطلوبة
            if (approvedEntity) {
                const requiredFields = ['id', 'code', 'companyName', 'entityType', 'status'];
                const missingFields = requiredFields.filter(field => !approvedEntity[field]);
                if (missingFields.length > 0) {
                    Logger.log('⚠️ Warning: ApprovedEntity is missing required fields: ' + missingFields.join(', '));
                } else {
                    Logger.log('✅ Verified: ApprovedEntity contains all required fields');
                }
            }
            
            return result;
        } else {
            Logger.log('⚠️ Failed to update approval request: ' + updateResult.message);
            return updateResult;
        }
        
    } catch (error) {
        Logger.log('❌ Error approving contractor approval request: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء اعتماد الطلب: ' + error.toString() };
    }
}

/**
 * رفض طلب اعتماد مقاول
 * ✅ تم التعديل: استخدام updateSingleRowInSheet() لتحديث صف واحد فقط بدون حذف الصفوف الأخرى
 */
function rejectContractorApprovalRequest(requestId, rejectionReason, userData) {
    try {
        if (!requestId) {
            return { success: false, message: 'معرف الطلب غير محدد' };
        }
        
        // التحقق من صلاحيات المستخدم
        if (!checkAdminPermissions(userData)) {
            return { success: false, message: 'ليس لديك صلاحية لرفض الطلبات' };
        }
        
        const sheetName = 'ContractorApprovalRequests';
        const spreadsheetId = getSpreadsheetId();
        
        // ✅ استخدام updateSingleRowInSheet() لتحديث صف واحد فقط بدون حذف الصفوف الأخرى
        const updateData = {
            status: 'rejected',
            rejectedAt: new Date(),
            rejectedBy: userData.id || '',
            rejectedByName: userData.name || '',
            rejectionReason: rejectionReason || ''
        };
        
        const result = updateSingleRowInSheet(sheetName, requestId, updateData, spreadsheetId);
        
        if (result.success) {
            Logger.log('✅ Successfully rejected contractor approval request: ' + requestId);
        } else {
            Logger.log('⚠️ Failed to reject contractor approval request: ' + result.message);
        }
        
        return result;
    } catch (error) {
        Logger.log('Error rejecting contractor approval request: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء رفض الطلب: ' + error.toString() };
    }
}

/**
 * ============================================
 * طلبات حذف المقاولين (Contractor Deletion Requests)
 * ============================================
 */

/**
 * إضافة طلب حذف مقاول
 */
function addContractorDeletionRequest(requestData) {
    try {
        if (!requestData) {
            return { success: false, message: 'بيانات الطلب غير موجودة' };
        }
        
        const sheetName = 'ContractorDeletionRequests';
        const spreadsheetId = getSpreadsheetId();
        
        // إضافة حقول تلقائية
        if (!requestData.id) {
            requestData.id = generateSequentialId('CDR', sheetName, spreadsheetId);
        }
        if (!requestData.createdAt) {
            requestData.createdAt = new Date();
        }
        if (!requestData.status) {
            requestData.status = 'pending';
        }
        
        // ✅ استخدام appendToSheet مع spreadsheetId للاتساق
        return appendToSheet(sheetName, requestData, spreadsheetId);
    } catch (error) {
        Logger.log('Error in addContractorDeletionRequest: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء إضافة طلب الحذف: ' + error.toString() };
    }
}

/**
 * تحديث طلب حذف مقاول
 * ✅ تم التعديل: استخدام updateSingleRowInSheet() لتحديث صف واحد فقط بدون حذف الصفوف الأخرى
 */
function updateContractorDeletionRequest(requestId, updateData) {
    try {
        if (!requestId) {
            return { success: false, message: 'معرف الطلب غير محدد' };
        }
        
        const sheetName = 'ContractorDeletionRequests';
        const spreadsheetId = getSpreadsheetId();
        
        // ✅ استخدام updateSingleRowInSheet() لتحديث صف واحد فقط بدون حذف الصفوف الأخرى
        const result = updateSingleRowInSheet(sheetName, requestId, updateData, spreadsheetId);
        
        if (result.success) {
            Logger.log('✅ Successfully updated contractor deletion request: ' + requestId);
        } else {
            Logger.log('⚠️ Failed to update contractor deletion request: ' + result.message);
        }
        
        return result;
    } catch (error) {
        Logger.log('Error updating contractor deletion request: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء تحديث طلب الحذف: ' + error.toString() };
    }
}

/**
 * الحصول على جميع طلبات الحذف
 */
function getAllContractorDeletionRequests(filters = {}) {
    try {
        const sheetName = 'ContractorDeletionRequests';
        let data = readFromSheet(sheetName, getSpreadsheetId());
        
        // تطبيق الفلاتر
        if (filters.status) {
            data = data.filter(r => r.status === filters.status);
        }
        if (filters.requestType) {
            data = data.filter(r => r.requestType === filters.requestType);
        }
        if (filters.createdBy) {
            data = data.filter(r => r.createdBy === filters.createdBy);
        }
        if (filters.pendingOnly) {
            data = data.filter(r => r.status === 'pending' || r.status === 'under_review');
        }
        
        // ترتيب حسب تاريخ الإنشاء
        data.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateB - dateA;
        });
        
        return { success: true, data: data, count: data.length };
    } catch (error) {
        Logger.log('Error getting all contractor deletion requests: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء قراءة طلبات الحذف: ' + error.toString(), data: [] };
    }
}

/**
 * الموافقة على طلب حذف مقاول
 */
function approveContractorDeletionRequest(requestId, userData) {
    try {
        if (!requestId) {
            return { success: false, message: 'معرف الطلب غير محدد' };
        }
        
        // التحقق من صلاحيات المستخدم
        if (!checkAdminPermissions(userData)) {
            return { success: false, message: 'ليس لديك صلاحية لاعتماد طلبات الحذف' };
        }
        
        const sheetName = 'ContractorDeletionRequests';
        const spreadsheetId = getSpreadsheetId();
        const data = readFromSheet(sheetName, spreadsheetId);
        const requestIndex = data.findIndex(r => r.id === requestId);
        
        if (requestIndex === -1) {
            return { success: false, message: 'طلب الحذف غير موجود' };
        }
        
        const request = data[requestIndex];
        
        // تحديث حالة الطلب
        request.status = 'approved';
        request.approvedAt = new Date();
        request.approvedBy = userData.id || '';
        request.approvedByName = userData.name || '';
        request.updatedAt = new Date();
        
        // ✅ حذف المقاول/التقييم/المعتمد فعلياً
        // ✅ تم التحديث: الاعتماد فقط على ApprovedContractors
        if (request.requestType === 'contractor' || request.requestType === 'approved_entity') {
            // حذف من قائمة المعتمدين فقط
            const approvedSheet = 'ApprovedContractors';
            const approvedData = readFromSheet(approvedSheet, spreadsheetId);
            const approvedIndex = approvedData.findIndex(ac => 
                ac.id === request.entityId || 
                ac.contractorId === request.entityId
            );
            
            if (approvedIndex !== -1) {
                approvedData.splice(approvedIndex, 1);
                const saveResult = saveToSheet(approvedSheet, approvedData, spreadsheetId);
                if (!saveResult.success) {
                    return { success: false, message: 'فشل حذف الجهة المعتمدة: ' + saveResult.message };
                }
            } else {
                Logger.log('⚠️ Warning: Approved entity not found for deletion: ' + request.entityId);
            }
        } else if (request.requestType === 'evaluation') {
            // حذف التقييم
            const evaluationsSheet = 'ContractorEvaluations';
            const evaluationsData = readFromSheet(evaluationsSheet, spreadsheetId);
            const evaluationIndex = evaluationsData.findIndex(e => e.id === request.entityId);
            if (evaluationIndex !== -1) {
                evaluationsData.splice(evaluationIndex, 1);
                const saveResult = saveToSheet(evaluationsSheet, evaluationsData, spreadsheetId);
                if (!saveResult.success) {
                    return { success: false, message: 'فشل حذف التقييم: ' + saveResult.message };
                }
            }
        }
        
        // ✅ حفظ تحديث حالة الطلب باستخدام updateSingleRowInSheet() لتحديث صف واحد فقط
        const updateData = {
            status: request.status,
            approvedAt: request.approvedAt,
            approvedBy: request.approvedBy,
            approvedByName: request.approvedByName
        };
        return updateSingleRowInSheet(sheetName, requestId, updateData, spreadsheetId);
    } catch (error) {
        Logger.log('Error approving contractor deletion request: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء الموافقة على الحذف: ' + error.toString() };
    }
}

/**
 * رفض طلب حذف مقاول
 * ✅ تم التعديل: استخدام updateSingleRowInSheet() لتحديث صف واحد فقط بدون حذف الصفوف الأخرى
 */
function rejectContractorDeletionRequest(requestId, rejectionReason, userData) {
    try {
        if (!requestId) {
            return { success: false, message: 'معرف الطلب غير محدد' };
        }
        
        // التحقق من صلاحيات المستخدم
        if (!checkAdminPermissions(userData)) {
            return { success: false, message: 'ليس لديك صلاحية لرفض طلبات الحذف' };
        }
        
        const sheetName = 'ContractorDeletionRequests';
        const spreadsheetId = getSpreadsheetId();
        
        // ✅ استخدام updateSingleRowInSheet() لتحديث صف واحد فقط بدون حذف الصفوف الأخرى
        const updateData = {
            status: 'rejected',
            rejectedAt: new Date(),
            rejectedBy: userData.id || '',
            rejectedByName: userData.name || '',
            rejectionReason: rejectionReason || ''
        };
        
        const result = updateSingleRowInSheet(sheetName, requestId, updateData, spreadsheetId);
        
        if (result.success) {
            Logger.log('✅ Successfully rejected contractor deletion request: ' + requestId);
        } else {
            Logger.log('⚠️ Failed to reject contractor deletion request: ' + result.message);
        }
        
        return result;
    } catch (error) {
        Logger.log('Error rejecting contractor deletion request: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء رفض الطلب: ' + error.toString() };
    }
}

