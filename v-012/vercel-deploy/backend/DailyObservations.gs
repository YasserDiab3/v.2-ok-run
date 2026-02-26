/**
 * Google Apps Script for HSE System - Daily Observations Module
 * 
 * موديول الملاحظات اليومية - النسخة المنفصلة والمحسنة
 * 
 * هذا الموديول يتعامل مع:
 * - إضافة ملاحظات يومية
 * - تحديث الملاحظات
 * - الحصول على الملاحظات مع فلاتر متقدمة
 * - حذف الملاحظات
 * - إحصائيات الملاحظات
 * - ربط تلقائي مع Action Tracking
 */

/**
 * ============================================
 * إضافة ملاحظة يومية
 * ============================================
 * 
 * @param {Object} observationData - بيانات الملاحظة
 * @returns {Object} نتيجة العملية
 */
function addObservationToSheet(observationData) {
    try {
        if (!observationData) {
            return { success: false, message: 'بيانات الملاحظة غير موجودة' };
        }
        
        const sheetName = 'DailyObservations';
        
        // لا نغيّر id أبداً إذا كان موجوداً. الجديد فقط: id بتنسيق OBS-YYYYMM-NNNN
        if (!observationData.id) {
            observationData.id = generateDailyObservationId(sheetName);
        }
        // تسجيل isoCode في الجدول = DOB- + آخر 4 أرقام من id كما هي (مثال: OBS-202602-2328 → DOB-2328)
        observationData.isoCode = getObservationIsoCodeFromId(observationData.id);
        if (!observationData.createdAt) {
            observationData.createdAt = new Date();
        }
        if (!observationData.updatedAt) {
            observationData.updatedAt = new Date();
        } 
        if (!observationData.status) {
            observationData.status = 'جديد';
        }
        
        // معالجة attachments - التأكد من تحويلها إلى JSON string مع الروابط
        if (observationData.attachments && Array.isArray(observationData.attachments)) {
            observationData.attachments = stringifyAttachments(observationData.attachments);
        } else if (observationData.attachments && typeof observationData.attachments === 'object') {
            observationData.attachments = stringifyAttachments([observationData.attachments]);
        } else if (!observationData.attachments) {
            observationData.attachments = '[]';
        }
        
        // معالجة images - إذا كانت موجودة كـ array
        if (observationData.images && Array.isArray(observationData.images)) {
            const processedImages = [];
            for (let i = 0; i < observationData.images.length; i++) {
                const image = observationData.images[i];
                if (typeof image === 'string' && image.startsWith('data:')) {
                    try {
                        const uploadResult = uploadFileToDrive(
                            image,
                            'observation_' + (observationData.id || Utilities.getUuid()) + '_' + Date.now() + '_' + i + '.jpg',
                            'image/jpeg',
                            'DailyObservations'
                        );
                        if (uploadResult && uploadResult.success) {
                            processedImages.push(uploadResult.directLink || uploadResult.shareableLink);
                        } else {
                            processedImages.push(image);
                        }
                    } catch (imageError) {
                        Logger.log('خطأ في رفع صورة الملاحظة: ' + imageError.toString());
                        processedImages.push(image);
                    }
                } else {
                    processedImages.push(image);
                }
            }
            // ✅ لا تستخدم JSON - دع toSheetCellValue_() تتعامل معها
            observationData.images = processedImages;
        }
        
        const result = appendToSheet(sheetName, observationData);
        
        // إنشاء إجراء تلقائي في Action Tracking إذا كان هناك إجراء تصحيحي
        if (result.success && observationData.correctiveAction) {
            try {
                createActionFromModule('Observations', observationData.id || '', {
                    date: observationData.date || '',
                    description: observationData.description || observationData.observation || '',
                    correctiveAction: observationData.correctiveAction,
                    department: observationData.department || '',
                    location: observationData.location || '',
                    supervisor: observationData.supervisor || '',
                    createdBy: observationData.createdBy || 'System',
                    ...observationData
                });
            } catch (error) {
                Logger.log('Error creating auto action from observation: ' + error.toString());
                // لا نوقف العملية إذا فشل إنشاء الإجراء التلقائي
            }
        }
        
        return result;
    } catch (error) {
        Logger.log('Error in addObservationToSheet: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء إضافة الملاحظة: ' + error.toString() };
    }
}

/**
 * ============================================
 * تحديث ملاحظة يومية
 * ============================================
 * 
 * @param {String} observationId - معرف الملاحظة
 * @param {Object} updateData - البيانات المحدثة
 * @returns {Object} نتيجة العملية
 */
function updateObservation(observationId, updateData) {
    try {
        if (!observationId) {
            return { success: false, message: 'معرف الملاحظة غير محدد' };
        }
        
        const sheetName = 'DailyObservations';
        const spreadsheetId = getSpreadsheetId();
        const data = readFromSheet(sheetName, spreadsheetId);
        const observationIndex = data.findIndex(o => o.id === observationId);
        
        if (observationIndex === -1) {
            return { success: false, message: 'الملاحظة غير موجودة' };
        }
        
        // عدم تغيير id أبداً — الاحتفاظ بالمعرف المسجل كما هو
        if (updateData.hasOwnProperty('id')) delete updateData.id;
        updateData.updatedAt = new Date();
        for (var key in updateData) {
            if (updateData.hasOwnProperty(key)) {
                data[observationIndex][key] = updateData[key];
            }
        }
        
        return saveToSheet(sheetName, data, spreadsheetId);
    } catch (error) {
        Logger.log('Error updating observation: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء تحديث الملاحظة: ' + error.toString() };
    }
}

/**
 * ============================================
 * الحصول على ملاحظة محددة
 * ============================================
 * 
 * @param {String} observationId - معرف الملاحظة
 * @returns {Object} نتيجة العملية مع بيانات الملاحظة
 */
function getObservation(observationId) {
    try {
        if (!observationId) {
            return { success: false, message: 'معرف الملاحظة غير محدد' };
        }
        
        const sheetName = 'DailyObservations';
        const data = readFromSheet(sheetName, getSpreadsheetId());
        const observation = data.find(o => o.id === observationId);
        
        if (!observation) {
            return { success: false, message: 'الملاحظة غير موجودة' };
        }
        
        return { success: true, data: observation };
    } catch (error) {
        Logger.log('Error getting observation: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء قراءة الملاحظة: ' + error.toString() };
    }
}

/**
 * ============================================
 * الحصول على جميع الملاحظات
 * ============================================
 * 
 * @param {Object} filters - فلاتر البحث (اختياري)
 * @param {String} filters.supervisor - المشرف
 * @param {String} filters.observationType - نوع الملاحظة
 * @param {String} filters.status - الحالة
 * @param {String} filters.department - الإدارة
 * @param {Date} filters.startDate - تاريخ البداية
 * @param {Date} filters.endDate - تاريخ النهاية
 * @returns {Object} نتيجة العملية مع قائمة الملاحظات
 */
function getAllObservations(filters = {}) {
    try {
        const sheetName = 'DailyObservations';
        let data = readFromSheet(sheetName, getSpreadsheetId());
        
        // تطبيق الفلاتر
        if (filters.supervisor) {
            data = data.filter(o => o.supervisor === filters.supervisor);
        }
        if (filters.observationType) {
            data = data.filter(o => o.observationType === filters.observationType);
        }
        if (filters.status) {
            data = data.filter(o => o.status === filters.status);
        }
        if (filters.department) {
            data = data.filter(o => o.department === filters.department);
        }
        if (filters.startDate) {
            data = data.filter(o => {
                if (!o.date) return false;
                return new Date(o.date) >= new Date(filters.startDate);
            });
        }
        if (filters.endDate) {
            data = data.filter(o => {
                if (!o.date) return false;
                return new Date(o.date) <= new Date(filters.endDate);
            });
        }
        
        // دالة مساعدة لاستخراج الرقم من رقم الملاحظة للترتيب
        const extractObservationNumber = (isoCode) => {
            if (!isoCode) return 0;
            const match = String(isoCode).match(/(\d+)$/);
            return match ? parseInt(match[1], 10) : 0;
        };
        
        // ترتيب حسب رقم الملاحظة من الأقدم للأحدث
        data.sort((a, b) => {
            const numA = extractObservationNumber(a.isoCode);
            const numB = extractObservationNumber(b.isoCode);
            return numA - numB;
        });
        
        return { success: true, data: data, count: data.length };
    } catch (error) {
        Logger.log('Error getting all observations: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء قراءة الملاحظات: ' + error.toString(), data: [] };
    }
}

/**
 * ============================================
 * حذف ملاحظة
 * ============================================
 * 
 * @param {String} observationId - معرف الملاحظة
 * @returns {Object} نتيجة العملية
 */
function deleteObservation(observationId) {
    try {
        if (!observationId) {
            return { success: false, message: 'معرف الملاحظة غير محدد' };
        }
        
        const sheetName = 'DailyObservations';
        const spreadsheetId = getSpreadsheetId();
        const data = readFromSheet(sheetName, spreadsheetId);
        const filteredData = data.filter(o => o.id !== observationId);
        
        if (filteredData.length === data.length) {
            return { success: false, message: 'الملاحظة غير موجودة' };
        }
        
        return saveToSheet(sheetName, filteredData, spreadsheetId);
    } catch (error) {
        Logger.log('Error deleting observation: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء حذف الملاحظة: ' + error.toString() };
    }
}

/**
 * ============================================
 * حذف جميع الملاحظات
 * ============================================
 * 
 * @returns {Object} نتيجة العملية
 */
function deleteAllObservations() {
    try {
        const sheetName = 'DailyObservations';
        const spreadsheetId = getSpreadsheetId();
        
        // حفظ مصفوفة فارغة (سيحذف جميع البيانات)
        const result = saveToSheet(sheetName, [], spreadsheetId);
        
        if (result.success) {
            return { success: true, message: 'تم حذف جميع الملاحظات بنجاح' };
        } else {
            return { success: false, message: result.message || 'فشل حذف جميع الملاحظات' };
        }
    } catch (error) {
        Logger.log('Error in deleteAllObservations: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء حذف جميع الملاحظات: ' + error.toString() };
    }
}

/**
 * ============================================
 * الحصول على إحصائيات الملاحظات
 * ============================================
 * 
 * @param {Object} filters - فلاتر البحث (اختياري)
 * @returns {Object} نتيجة العملية مع الإحصائيات
 */
function getObservationStatistics(filters = {}) {
    try {
        const allObservations = getAllObservations(filters);
        if (!allObservations.success) {
            return { success: false, message: 'فشل في قراءة الملاحظات' };
        }
        
        const observations = allObservations.data;
        const stats = {
            total: observations.length,
            byType: {},
            byStatus: {},
            bySupervisor: {},
            byDepartment: {},
            withCorrectiveAction: 0,
            trend: 'stable'
        };
        
        observations.forEach(obs => {
            // حسب النوع
            const type = obs.observationType || 'Unknown';
            stats.byType[type] = (stats.byType[type] || 0) + 1;
            
            // حسب الحالة
            const status = obs.status || 'Unknown';
            stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
            
            // حسب المشرف
            if (obs.supervisor) {
                stats.bySupervisor[obs.supervisor] = (stats.bySupervisor[obs.supervisor] || 0) + 1;
            }
            
            // حسب الإدارة
            if (obs.department) {
                stats.byDepartment[obs.department] = (stats.byDepartment[obs.department] || 0) + 1;
            }
            
            // مع إجراء تصحيحي
            if (obs.correctiveAction) {
                stats.withCorrectiveAction++;
            }
        });
        
        // حساب الاتجاه
        const now = new Date();
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        const recent = observations.filter(obs => {
            if (!obs.date) return false;
            return new Date(obs.date) >= threeMonthsAgo;
        });
        const older = observations.filter(obs => {
            if (!obs.date) return false;
            const obsDate = new Date(obs.date);
            return obsDate < threeMonthsAgo && obsDate >= new Date(now.getFullYear(), now.getMonth() - 6, 1);
        });
        
        if (recent.length > older.length * 1.2) {
            stats.trend = 'increasing';
        } else if (recent.length < older.length * 0.8) {
            stats.trend = 'decreasing';
        }
        
        return { success: true, data: stats };
    } catch (error) {
        Logger.log('Error getting observation statistics: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء حساب الإحصائيات: ' + error.toString() };
    }
}

/**
 * ============================================
 * إدارة Template ID لتصدير PPT
 * ============================================
 */

/**
 * ضبط Template ID لتصدير PPT للملاحظات اليومية
 * 
 * @param {string|Object} templateIdOrPayload - File ID لملف Google Slides Template أو payload يحتوي على templateId
 * @returns {Object} نتيجة العملية
 */
function setDailyObservationsPptTemplateId(templateIdOrPayload) {
    try {
        let templateId;
        if (typeof templateIdOrPayload === 'string') {
            templateId = templateIdOrPayload;
        } else if (templateIdOrPayload && typeof templateIdOrPayload === 'object') {
            templateId = templateIdOrPayload.templateId || templateIdOrPayload.templateID || templateIdOrPayload.id;
        }
        
        if (!templateId || typeof templateId !== 'string' || templateId.trim() === '') {
            return { success: false, message: 'يرجى تحديد Template ID صحيح.' };
        }
        
        templateId = templateId.trim();
        
        // التحقق من صحة Template ID بمحاولة الوصول للملف
        try {
            const templateFile = DriveApp.getFileById(templateId);
            const mimeType = templateFile.getMimeType();
            if (mimeType !== 'application/vnd.google-apps.presentation') {
                return { 
                    success: false, 
                    message: 'الملف المحدد ليس ملف Google Slides. يرجى تحديد ملف Google Slides Template.' 
                };
            }
        } catch (fileError) {
            return { 
                success: false, 
                message: 'لا يمكن الوصول للملف المحدد. تأكد من صحة Template ID وصلاحيات الوصول.' 
            };
        }
        
        // حفظ في Script Properties
        const props = PropertiesService.getScriptProperties();
        props.setProperty('DAILY_OBSERVATIONS_PPT_TEMPLATE_ID', templateId);
        
        return { 
            success: true, 
            message: 'تم ضبط Template ID بنجاح.',
            templateId: templateId
        };
    } catch (error) {
        Logger.log('Error in setDailyObservationsPptTemplateId: ' + error.toString());
        return { 
            success: false, 
            message: 'حدث خطأ أثناء ضبط Template ID: ' + error.toString() 
        };
    }
}

/**
 * الحصول على Template ID الحالي لتصدير PPT
 * 
 * @returns {Object} Template ID الحالي
 */
function getDailyObservationsPptTemplateId() {
    try {
        const props = PropertiesService.getScriptProperties();
        const templateId = String(props.getProperty('DAILY_OBSERVATIONS_PPT_TEMPLATE_ID') || '').trim();
        
        if (!templateId) {
            return { 
                success: false, 
                message: 'لم يتم ضبط Template ID بعد.',
                templateId: null
            };
        }
        
        // التحقق من صحة Template ID
        try {
            const templateFile = DriveApp.getFileById(templateId);
            return { 
                success: true, 
                templateId: templateId,
                fileName: templateFile.getName(),
                fileUrl: templateFile.getUrl()
            };
        } catch (fileError) {
            return { 
                success: false, 
                message: 'Template ID غير صحيح أو لا يمكن الوصول للملف.',
                templateId: templateId
            };
        }
    } catch (error) {
        Logger.log('Error in getDailyObservationsPptTemplateId: ' + error.toString());
        return { 
            success: false, 
            message: 'حدث خطأ أثناء قراءة Template ID: ' + error.toString(),
            templateId: null
        };
    }
}

/**
 * ============================================
 * تصدير تقرير الملاحظات اليومية إلى PowerPoint (PPTX)
 * ============================================
 *
 * يعتمد على Template في Google Slides يحتوي على 3 شرائح:
 * 1) شريحة الغلاف (ثابتة): تحتوي Placeholders:
 *    - {{DEPARTMENT}}
 *    - {{REPORT_DATE}}
 * 2) شريحة الملاحظة (Template): سيتم تكرارها لكل ملاحظة وتعبئة Placeholders:
 *    - {{OBS_NO}}
 *    - {{ISO_CODE}}
 *    - {{OBS_DATE}}
 *    - {{OBS_LOCATION}}
 *    - {{OBS_TYPE}}
 *    - {{OBS_DETAILS}}
 *    - {{CORRECTIVE_ACTION}}
 *    - {{RISK_LEVEL}}
 *    - {{TARGET_DATE}}
 *    - {{RESPONSIBLE}}
 *    - {{STATUS}}
 *    - (اختياري) {{SHIFT}}, {{OBSERVER}}
 *
 * صورة الملاحظة:
 * - ضع عنصر Shape (مستطيل/نص) في الشريحة الثانية واجعل Title أو Description = OBS_IMAGE
 * - سيتم استبداله بصورة الملاحظة (إذا وُجدت).
 *
 * الإعدادات عبر Script Properties:
 * - DAILY_OBSERVATIONS_PPT_TEMPLATE_ID: (مطلوب) File ID لعرض Google Slides Template
 * - REPORTS_OUTPUT_FOLDER_ID: (اختياري) Folder ID لحفظ الملفات الناتجة
 * 
 * يمكن تمرير templateId في payload كبديل لـ Script Properties
 */
function exportDailyObservationsPptReport(payload) {
    try {
        payload = payload || {};
        const department = String(payload.department || payload.departmentName || '').trim();
        const reportDate = payload.reportDate ? new Date(payload.reportDate) : new Date();
        const observations = Array.isArray(payload.observations) ? payload.observations : [];

        if (!department) {
            return { success: false, message: 'يرجى تحديد الإدارة قبل التصدير.' };
        }
        if (observations.length === 0) {
            return { success: false, message: 'لا توجد ملاحظات لتصديرها لهذه الإدارة.' };
        }

        // الحصول على Template ID من payload أولاً، ثم من Script Properties
        const props = PropertiesService.getScriptProperties();
        let templateId = String(payload.templateId || payload.templateID || '').trim();
        if (!templateId) {
            templateId = String(props.getProperty('DAILY_OBSERVATIONS_PPT_TEMPLATE_ID') || '').trim();
        }
        
        if (!templateId) {
            return {
                success: false,
                message: 'لم يتم ضبط Template ID. يرجى إضافة DAILY_OBSERVATIONS_PPT_TEMPLATE_ID في Script Properties أو تمرير templateId في payload.\n\n' +
                         'لضبط Script Properties:\n' +
                         '1. افتح Google Apps Script Editor\n' +
                         '2. اذهب إلى Project Settings > Script Properties\n' +
                         '3. أضف خاصية جديدة:\n' +
                         '   Key: DAILY_OBSERVATIONS_PPT_TEMPLATE_ID\n' +
                         '   Value: [File ID من Google Slides Template]\n\n' +
                         'أو استخدم دالة setDailyObservationsPptTemplateId(templateId) لضبطها برمجياً.'
            };
        }

        const outputFolderId = String(props.getProperty('REPORTS_OUTPUT_FOLDER_ID') || '').trim();
        const outputFolder = outputFolderId ? DriveApp.getFolderById(outputFolderId) : null;

        const tz = Session.getScriptTimeZone();
        const dateLabel = Utilities.formatDate(reportDate, tz, 'yyyy-MM-dd');
        const safeDept = department.replace(/[\\\/:*?"<>|]/g, '-');
        const baseName = 'Daily_Observations_' + safeDept + '_' + dateLabel;

        // نسخ الـ Template
        const templateFile = DriveApp.getFileById(templateId);
        const copiedFile = outputFolder
            ? templateFile.makeCopy(baseName + '_TEMPLATE_COPY', outputFolder)
            : templateFile.makeCopy(baseName + '_TEMPLATE_COPY');

        const presId = copiedFile.getId();
        const presentation = SlidesApp.openById(presId);

        const slides = presentation.getSlides();
        if (!slides || slides.length < 3) {
            return { success: false, message: 'Template غير صالح: يجب أن يحتوي على 3 شرائح على الأقل.' };
        }

        const coverSlide = slides[0];
        const itemTemplateSlide = slides[1];
        // الشريحة الأخيرة ثابتة (نتركها كما هي)

        // تعبئة الغلاف
        _dob_replaceAllTextSafe_(presentation, coverSlide, {
            '{{DEPARTMENT}}': department,
            '{{REPORT_DATE}}': dateLabel
        });

        // تجهيز شرائح الملاحظات
        // استخدم الشريحة الثانية لأول ملاحظة ثم كررها للباقي
        observations.forEach(function (obs, idx) {
            const slide = (idx === 0) ? itemTemplateSlide : itemTemplateSlide.duplicate();
            const obsNo = String(idx + 1);
            const obsDate = _dob_formatDateTimeSafe_(obs.date, tz);
            const location = _dob_joinLocation_(obs.siteName, obs.locationName);
            const targetDate = _dob_formatDateSafe_(obs.expectedCompletionDate, tz);

            _dob_replaceAllTextSafe_(presentation, slide, {
                '{{OBS_NO}}': obsNo,
                '{{ISO_CODE}}': String(obs.isoCode || ''),
                '{{OBS_DATE}}': obsDate,
                '{{OBS_LOCATION}}': location,
                '{{OBS_TYPE}}': String(obs.observationType || ''),
                '{{OBS_DETAILS}}': String(obs.details || ''),
                '{{CORRECTIVE_ACTION}}': String(obs.correctiveAction || ''),
                '{{RISK_LEVEL}}': String(obs.riskLevel || ''),
                '{{TARGET_DATE}}': targetDate,
                '{{RESPONSIBLE}}': String(obs.responsibleDepartment || ''),
                '{{STATUS}}': String(obs.status || ''),
                '{{SHIFT}}': String(obs.shift || ''),
                '{{OBSERVER}}': String(obs.observerName || '')
            });

            // الصورة
            const imageUrl = String(obs.imageUrl || '').trim();
            if (imageUrl) {
                try {
                    const blob = _dob_getImageBlobFromUrl_(imageUrl);
                    if (blob) {
                        _dob_replaceImagePlaceholder_(slide, blob);
                    }
                } catch (imgErr) {
                    Logger.log('PPT Export: failed to insert image for obs ' + obsNo + ': ' + imgErr);
                }
            }
        });

        presentation.saveAndClose();

        // تصدير كـ PPTX
        const pptBlob = DriveApp.getFileById(presId).getAs(MimeType.MICROSOFT_POWERPOINT);
        pptBlob.setName(baseName + '.pptx');

        const pptFile = outputFolder ? outputFolder.createFile(pptBlob) : DriveApp.createFile(pptBlob);
        try {
            pptFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (shareErr) {
            Logger.log('PPT Export: sharing failed: ' + shareErr);
        }

        const fileId = pptFile.getId();
        return {
            success: true,
            fileId: fileId,
            fileName: pptFile.getName(),
            viewUrl: 'https://drive.google.com/file/d/' + fileId + '/view',
            downloadUrl: 'https://drive.google.com/uc?export=download&id=' + fileId
        };
    } catch (error) {
        Logger.log('Error in exportDailyObservationsPptReport: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء إنشاء تقرير PPT: ' + error.toString() };
    }
}

function _dob_replaceAllTextSafe_(presentation, slide, replacements) {
    if (!replacements) return;
    Object.keys(replacements).forEach(function (key) {
        const value = replacements[key] === null || replacements[key] === undefined ? '' : String(replacements[key]);
        try {
            if (slide && typeof slide.replaceAllText === 'function') {
                slide.replaceAllText(key, value);
            } else if (presentation && typeof presentation.replaceAllText === 'function') {
                presentation.replaceAllText(key, value);
            }
        } catch (e) {
            // تجاهل - قد تكون الشريحة لا تحتوي على النص
        }
    });
}

function _dob_formatDateTimeSafe_(value, tz) {
    try {
        if (!value) return '';
        const d = value instanceof Date ? value : new Date(value);
        if (isNaN(d.getTime())) return '';
        return Utilities.formatDate(d, tz || Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
    } catch (e) {
        return '';
    }
}

function _dob_formatDateSafe_(value, tz) {
    try {
        if (!value) return '';
        const d = value instanceof Date ? value : new Date(value);
        if (isNaN(d.getTime())) return '';
        return Utilities.formatDate(d, tz || Session.getScriptTimeZone(), 'yyyy-MM-dd');
    } catch (e) {
        return '';
    }
}

function _dob_joinLocation_(siteName, locationName) {
    const s = String(siteName || '').trim();
    const l = String(locationName || '').trim();
    if (s && l) return s + ' - ' + l;
    return s || l || '';
}

function _dob_extractDriveFileId_(url) {
    if (!url) return '';
    const s = String(url);
    // patterns:
    // - https://drive.google.com/file/d/<ID>/view
    // - https://drive.google.com/uc?export=view&id=<ID>
    // - https://drive.google.com/open?id=<ID>
    const match1 = s.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match1 && match1[1]) return match1[1];
    const match2 = s.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match2 && match2[1]) return match2[1];
    return '';
}

function _dob_getImageBlobFromUrl_(imageUrl) {
    const fileId = _dob_extractDriveFileId_(imageUrl);
    if (!fileId) return null;
    const file = DriveApp.getFileById(fileId);
    return file ? file.getBlob() : null;
}

function _dob_replaceImagePlaceholder_(slide, imageBlob) {
    if (!slide || !imageBlob) return;

    const elements = slide.getPageElements();
    let placeholder = null;
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        try {
            const title = String(el.getTitle && el.getTitle() ? el.getTitle() : '').trim();
            const desc = String(el.getDescription && el.getDescription() ? el.getDescription() : '').trim();
            if (title === 'OBS_IMAGE' || desc === 'OBS_IMAGE' || title === '{{OBS_IMAGE}}' || desc === '{{OBS_IMAGE}}') {
                placeholder = el;
                break;
            }
            // دعم placeholder كنص داخل shape
            if (el.getPageElementType && el.getPageElementType() === SlidesApp.PageElementType.SHAPE) {
                const txt = el.asShape().getText().asString();
                if (txt && (txt.indexOf('OBS_IMAGE') !== -1 || txt.indexOf('{{OBS_IMAGE}}') !== -1)) {
                    placeholder = el;
                    break;
                }
            }
        } catch (e) {
            // ignore
        }
    }

    if (!placeholder) return;

    const left = placeholder.getLeft();
    const top = placeholder.getTop();
    const width = placeholder.getWidth();
    const height = placeholder.getHeight();

    try {
        placeholder.remove();
    } catch (e) {
        // ignore
    }

    const img = slide.insertImage(imageBlob);
    img.setLeft(left);
    img.setTop(top);
    img.setWidth(width);
    img.setHeight(height);
}

/**
 * ============================================
 * إضافة تعليق على ملاحظة
 * ============================================
 * 
 * @param {String} observationId - معرف الملاحظة
 * @param {Object} commentData - بيانات التعليق
 * @returns {Object} نتيجة العملية
 */
function addObservationComment(observationId, commentData) {
    try {
        const sheetName = 'DailyObservations';
        const spreadsheetId = getSpreadsheetId();
        
        if (!spreadsheetId) {
            return { success: false, message: 'معرف Google Sheets غير محدد' };
        }
        
        const data = readFromSheet(sheetName, spreadsheetId);
        const observationIndex = data.findIndex(o => o.id === observationId);
        
        if (observationIndex === -1) {
            return { success: false, message: 'الملاحظة غير موجودة' };
        }
        
        const observation = data[observationIndex];
        
        // ✅ تحليل التعليقات الحالية
        let comments = [];
        try {
            if (Array.isArray(observation.comments)) {
                comments = observation.comments;
            } else if (typeof observation.comments === 'string' && observation.comments) {
                try {
                    comments = JSON.parse(observation.comments);
                } catch (e) {
                    comments = [];
                }
            }
        } catch (e) {
            comments = [];
        }
        
        // إضافة التعليق الجديد
        comments.push({
            id: 'CMT-' + Date.now().toString(),
            user: commentData.user || 'System',
            comment: commentData.comment || '',
            timestamp: new Date().toISOString()
        });
        
        // ✅ حفظ كـ array (بدون JSON.stringify)
        observation.comments = comments;
        observation.updatedAt = new Date().toISOString();
        
        // ✅ إضافة سجل زمني
        let timeLog = [];
        try {
            if (Array.isArray(observation.timeLog)) {
                timeLog = observation.timeLog;
            } else if (typeof observation.timeLog === 'string' && observation.timeLog) {
                try {
                    timeLog = JSON.parse(observation.timeLog);
                } catch (e) {
                    timeLog = [];
                }
            }
        } catch (e) {
            timeLog = [];
        }
        
        timeLog.push({
            action: 'comment_added',
            user: commentData.user || 'System',
            timestamp: new Date().toISOString(),
            note: 'تم إضافة تعليق'
        });
        
        // ✅ حفظ كـ array
        observation.timeLog = timeLog;
        
        // ✅ تحديث الصف مباشرة
        return updateSingleRowInSheet(sheetName, observationId, {
            comments: observation.comments,
            timeLog: observation.timeLog,
            updatedAt: observation.updatedAt
        }, spreadsheetId);
    } catch (error) {
        Logger.log('Error in addObservationComment: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء إضافة التعليق: ' + error.toString() };
    }
}

/**
 * ============================================
 * إضافة تحديث على ملاحظة
 * ============================================
 * 
 * @param {String} observationId - معرف الملاحظة
 * @param {Object} updateData - بيانات التحديث
 * @returns {Object} نتيجة العملية
 */
function addObservationUpdate(observationId, updateData) {
    try {
        const sheetName = 'DailyObservations';
        const spreadsheetId = getSpreadsheetId();
        
        if (!spreadsheetId) {
            return { success: false, message: 'معرف Google Sheets غير محدد' };
        }
        
        const data = readFromSheet(sheetName, spreadsheetId);
        const observationIndex = data.findIndex(o => o.id === observationId);
        
        if (observationIndex === -1) {
            return { success: false, message: 'الملاحظة غير موجودة' };
        }
        
        const observation = data[observationIndex];
        
        // ✅ تحليل التحديثات الحالية
        let updates = [];
        try {
            if (Array.isArray(observation.updates)) {
                updates = observation.updates;
            } else if (typeof observation.updates === 'string' && observation.updates) {
                try {
                    updates = JSON.parse(observation.updates);
                } catch (e) {
                    updates = [];
                }
            }
        } catch (e) {
            updates = [];
        }
        
        // إضافة التحديث الجديد
        updates.push({
            id: 'UPD-' + Date.now().toString(),
            user: updateData.user || 'System',
            update: updateData.update || '',
            progress: updateData.progress || 0,
            timestamp: new Date().toISOString()
        });
        
        // ✅ حفظ كـ array
        observation.updates = updates;
        observation.updatedAt = new Date().toISOString();
        
        // ✅ إضافة سجل زمني
        let timeLog = [];
        try {
            if (Array.isArray(observation.timeLog)) {
                timeLog = observation.timeLog;
            } else if (typeof observation.timeLog === 'string' && observation.timeLog) {
                try {
                    timeLog = JSON.parse(observation.timeLog);
                } catch (e) {
                    timeLog = [];
                }
            }
        } catch (e) {
            timeLog = [];
        }
        
        timeLog.push({
            action: 'update_added',
            user: updateData.user || 'System',
            timestamp: new Date().toISOString(),
            note: 'تم إضافة تحديث'
        });
        
        // ✅ حفظ كـ array
        observation.timeLog = timeLog;
        
        // ✅ تحديث الصف مباشرة
        return updateSingleRowInSheet(sheetName, observationId, {
            updates: observation.updates,
            timeLog: observation.timeLog,
            updatedAt: observation.updatedAt
        }, spreadsheetId);
    } catch (error) {
        Logger.log('Error in addObservationUpdate: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء إضافة التحديث: ' + error.toString() };
    }
}

/**
 * ============================================
 * تحديث حالة ملاحظة
 * ============================================
 * 
 * @param {String} observationId - معرف الملاحظة
 * @param {Object} statusData - بيانات الحالة (status, updatedBy)
 * @returns {Object} نتيجة العملية
 */
function updateObservationStatus(observationId, statusData) {
    try {
        const sheetName = 'DailyObservations';
        const spreadsheetId = getSpreadsheetId();
        
        if (!spreadsheetId) {
            return { success: false, message: 'معرف Google Sheets غير محدد' };
        }
        
        const data = readFromSheet(sheetName, spreadsheetId);
        const observationIndex = data.findIndex(o => o.id === observationId);
        
        if (observationIndex === -1) {
            return { success: false, message: 'الملاحظة غير موجودة' };
        }
        
        const observation = data[observationIndex];
        const oldStatus = observation.status || '';
        const newStatus = statusData.status || oldStatus;
        
        // تحديث الحالة
        observation.status = newStatus;
        observation.updatedAt = new Date().toISOString();
        
        // ✅ إضافة سجل زمني
        let timeLog = [];
        try {
            if (Array.isArray(observation.timeLog)) {
                timeLog = observation.timeLog;
            } else if (typeof observation.timeLog === 'string' && observation.timeLog) {
                try {
                    timeLog = JSON.parse(observation.timeLog);
                } catch (e) {
                    timeLog = [];
                }
            }
        } catch (e) {
            timeLog = [];
        }
        
        // إضافة سجل تغيير الحالة
        if (newStatus !== oldStatus) {
            timeLog.push({
                action: 'status_changed',
                user: statusData.updatedBy || statusData.user || 'System',
                timestamp: new Date().toISOString(),
                note: `تم تغيير الحالة من ${oldStatus} إلى ${newStatus}`,
                oldStatus: oldStatus,
                newStatus: newStatus
            });
        }
        
        // ✅ حفظ كـ array
        observation.timeLog = timeLog;
        
        // ✅ تحديث الصف مباشرة
        return updateSingleRowInSheet(sheetName, observationId, {
            status: observation.status,
            timeLog: observation.timeLog,
            updatedAt: observation.updatedAt
        }, spreadsheetId);
    } catch (error) {
        Logger.log('Error in updateObservationStatus: ' + error.toString());
        return { success: false, message: 'حدث خطأ أثناء تحديث الحالة: ' + error.toString() };
    }
}
