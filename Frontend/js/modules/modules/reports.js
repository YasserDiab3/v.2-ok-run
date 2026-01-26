/**
 * Reports Module
 * ØªÙ… Ø§Ø³ØªØ®Ø±Ø§Ø¬Ù‡ Ù…Ù† app-modules.js
 */
const Reports = {
    /**
     * تحميل الموديول
     */
    async load() {
        const section = document.getElementById('reports-section');
        if (!section) return;

        // التحقق من وجود AppState
        if (typeof AppState === 'undefined') {
            if (typeof Utils !== 'undefined' && Utils.safeError) {
                Utils.safeError('AppState غير متوفر!');
            } else {
                console.error('AppState غير متوفر!');
            }
            return;
        }

        try {
            section.innerHTML = `
            <div class="section-header">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="section-title">
                            <i class="fas fa-file-alt ml-3"></i>
                            التقارير
                        </h1>
                        <p class="section-subtitle">إنشاء وتصدير التقارير المختلفة</p>
                    </div>
                </div>
            </div>

            <div class="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="content-card">
                    <div class="card-header">
                        <h3 class="card-title">
                            <i class="fas fa-exclamation-triangle ml-2"></i>
                            تقرير الحوادث
                        </h3>
                    </div>
                    <div class="card-body">
                        <p class="text-gray-600 mb-4">إنشاء تقرير شامل عن جميع الحوادث المسجلة</p>
                        <button onclick="Reports.generateAndExport('incidents')" class="btn-primary w-full">
                            <i class="fas fa-file-pdf ml-2"></i>
                            إنشاء التقرير
                        </button>
                    </div>
                </div>

                <div class="content-card">
                    <div class="card-header">
                        <h3 class="card-title">
                            <i class="fas fa-graduation-cap ml-2"></i>
                            تقرير التدريب
                        </h3>
                    </div>
                    <div class="card-body">
                        <p class="text-gray-600 mb-4">إنشاء تقرير عن برامج التدريب والمشاركين</p>
                        <button onclick="Reports.generateAndExport('training')" class="btn-primary w-full">
                            <i class="fas fa-file-pdf ml-2"></i>
                            إنشاء التقرير
                        </button>
                    </div>
                </div>

                <div class="content-card">
                    <div class="card-header">
                        <h3 class="card-title">
                            <i class="fas fa-chart-line ml-2"></i>
                            التقرير الشامل
                        </h3>
                    </div>
                    <div class="card-body">
                        <p class="text-gray-600 mb-4">إنشاء تقرير شامل لجميع بيانات النظام</p>
                        <button onclick="Reports.generateAndExport('full')" class="btn-primary w-full">
                            <i class="fas fa-file-pdf ml-2"></i>
                            إنشاء التقرير
                        </button>
                    </div>
                </div>
            </div>
        `;
        } catch (error) {
            if (typeof Utils !== 'undefined' && Utils.safeError) {
                Utils.safeError('❌ خطأ في تحميل مديول التقارير:', error);
            } else {
                console.error('❌ خطأ في تحميل مديول التقارير:', error);
            }
            if (section) {
                section.innerHTML = `
                    <div class="content-card">
                        <div class="card-body">
                            <div class="empty-state">
                                <i class="fas fa-exclamation-triangle text-yellow-500 text-4xl mb-4"></i>
                                <p class="text-gray-500 mb-4">حدث خطأ أثناء تحميل البيانات</p>
                                <button onclick="Reports.load()" class="btn-primary">
                                    <i class="fas fa-redo ml-2"></i>
                                    إعادة المحاولة
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
    },

    async generateAndExport(type) {
        // التحقق من وجود AppState و appData
        if (typeof AppState === 'undefined' || !AppState.appData) {
            Notification.error('البيانات غير متوفرة. يرجى تحديث الصفحة');
            return;
        }

        // إنشاء تقرير PDF حسب النوع
        const data = AppState.appData;
        let title = '';
        let content = '';

        switch (type) {
            case 'incidents':
                title = 'تقرير الحوادث';
                // التحقق من وجود البيانات
                const incidentsData = data.incidents || [];
                if (!Array.isArray(incidentsData)) {
                    Notification.error('بيانات الحوادث غير صحيحة');
                    return;
                }
                content = this.generateIncidentsReport(incidentsData);
                break;
            case 'training':
                title = 'تقرير التدريب';
                // التحقق من وجود البيانات
                const trainingData = data.training || [];
                if (!Array.isArray(trainingData)) {
                    Notification.error('بيانات التدريب غير صحيحة');
                    return;
                }
                content = this.generateTrainingReport(trainingData);
                break;
            case 'full':
                title = 'التقرير الشامل';
                content = this.generateFullReport(data);
                break;
            default:
                throw new Error('نوع التقرير غير معروف');
        }

        // استخدام FormHeader.generatePDFHTML لإضافة الشعار والفوتر         
        const formCode = `REPORT-${type.toUpperCase()}-${new Date().toISOString().slice(0, 10)}`;
        const htmlContent = typeof FormHeader !== 'undefined' && FormHeader.generatePDFHTML
            ? FormHeader.generatePDFHTML(formCode, title, content, false, true, { version: '1.0' }, new Date().toISOString(), new Date().toISOString())
            : `<html><body>${content}</body></html>`;

        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const printWindow = window.open(url, '_blank');

        if (printWindow) {
            printWindow.onload = () => {
                setTimeout(() => {
                    printWindow.print();
                    setTimeout(() => {
                        URL.revokeObjectURL(url);
                    }, 1000);
                }, 500);
            };
        } else {
            Notification.error('يرجى السماح للنوافذ المنبثقة لعرض التقرير');
        }
    },

    generateIncidentsReport(incidents) {
        return `
            <div class="section-title">إجمالي الحوادث: ${incidents.length}</div>
            <p style="margin-bottom: 20px; color: #666;">تاريخ الإنشاء: ${new Date().toLocaleDateString('ar-SA')}</p>
            <table>
                <thead>
                    <tr>
                        <th>كود ISO</th>
                        <th>التاريخ</th>
                        <th>الموقع</th>
                        <th>الخطورة</th>
                        <th>الحالة</th>
                        <th>الوص</th>
                    </tr>
                </thead>
                <tbody>
                    ${incidents.map(incident => `
                        <tr>
                            <td>${Utils.escapeHTML(incident.isoCode || '')}</td>
                            <td>${incident.date ? Utils.formatDate(incident.date) : ''}</td>
                            <td>${Utils.escapeHTML(incident.location || '')}</td>
                            <td>${Utils.escapeHTML(incident.severity || '')}</td>
                            <td>${Utils.escapeHTML(incident.status || '')}</td>
                            <td>${Utils.escapeHTML((incident.description || '').substring(0, 100))}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    generateTrainingReport(training) {
        return `
            <div class="section-title">إجمالي برامج التدريب: ${training.length}</div>
            <p style="margin-bottom: 20px; color: #666;">تاريخ الإنشاء: ${new Date().toLocaleDateString('ar-SA')}</p>
            <table>
                <thead>
                    <tr>
                        <th>اسم البرنامج</th>
                        <th>التاريخ</th>
                        <th>المدرب</th>
                        <th>عدد المشاركين</th>
                        <th>الحالة</th>
                    </tr>
                </thead>
                <tbody>
                    ${training.map(t => `
                        <tr>
                            <td>${Utils.escapeHTML(t.name || '')}</td>
                            <td>${t.startDate ? Utils.formatDate(t.startDate) : ''}</td>
                            <td>${Utils.escapeHTML(t.trainer || '')}</td>
                            <td>${t.participants?.length || t.participantsCount || 0}</td>
                            <td>${Utils.escapeHTML(t.status || '')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },

    generateFullReport(data) {
        // حساب إحصائيات التدريب
        const training = data.training || [];
        const allParticipants = [];
        let totalTrainingHours = 0;

        training.forEach(t => {
            if (t.participants && Array.isArray(t.participants)) {
                t.participants.forEach(p => {
                    if (!allParticipants.find(ap => (ap.code || ap.employeeNumber) === (p.code || p.employeeNumber))) {
                        allParticipants.push(p);
                    }
                });
            }
            // حساب ساعات التدريب (إذا كان موجوداً)
            if (t.hours) {
                totalTrainingHours += parseFloat(t.hours) || 0;
            } else if (t.duration) {
                totalTrainingHours += parseFloat(t.duration) || 0;
            } else if (t.startTime && t.endTime) {
                // حساب الرق بين الوقتين
                try {
                    const start = new Date(`2000-01-01 ${t.startTime}`);
                    const end = new Date(`2000-01-01 ${t.endTime}`);
                    const diff = (end - start) / (1000 * 60 * 60); // تحويل إلى ساعات
                    totalTrainingHours += diff || 0;
                } catch (e) {
                    // تجاهل الأخطاء
                }
            }
        });

        const uniqueTrainees = allParticipants.length || training.reduce((acc, t) => acc + (t.participantsCount || 0), 0);
        const avgTrainingHours = uniqueTrainees > 0 ? (totalTrainingHours / uniqueTrainees).toFixed(2) : 0;

        // حساب إحصائيات المخالات
        const violations = data.violations || [];
        const employeeViolations = violations.filter(v => v.violationType === 'موظفين' || v.category === 'موظفين' || (!v.contractorName && v.employeeName));
        const contractorViolations = violations.filter(v => v.violationType === 'مقاولين' || v.category === 'مقاولين' || v.contractorName);
        const violationsByDepartment = {};
        const violationsByType = {};

        violations.forEach(v => {
            const dept = v.department || v.employeeDepartment || 'غير محدد';
            violationsByDepartment[dept] = (violationsByDepartment[dept] || 0) + 1;
            const vType = (v.violationType || 'غير محدد').trim() || 'غير محدد';
            violationsByType[vType] = (violationsByType[vType] || 0) + 1;
        });

        const violationsByDeptHTML = Object.keys(violationsByDepartment).map(dept =>
            `<tr><td>${Utils.escapeHTML(dept)}</td><td>${violationsByDepartment[dept]}</td></tr>`
        ).join('');
        const violationsByTypeHTML = Object.keys(violationsByType).map(type =>
            `<tr><td>${Utils.escapeHTML(type)}</td><td>${violationsByType[type]}</td></tr>`
        ).join('');

        return `
            <div class="section-title">الإحصائيات العامة</div>
            <p style="margin-bottom: 20px; color: #666;">تاريخ الإنشاء: ${new Date().toLocaleDateString('ar-SA')}</p>
            
            <h3 style="margin-top: 30px; margin-bottom: 15px; font-weight: bold; color: #333;">الإحصائيات الأساسية</h3>
            <table style="margin-bottom: 30px;">
                <thead>
                    <tr>
                        <th>النوع</th>
                        <th>الإجمالي</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>الحوادث</td>
                        <td>${(data.incidents || []).length}</td>
                    </tr>
                    <tr>
                        <td>الحوادث الوشيكة</td>
                        <td>${(data.nearmiss || []).length}</td>
                    </tr>
                    <tr>
                        <td>تصاريح العمل</td>
                        <td>${(data.ptw || []).length}</td>
                    </tr>
                    <tr>
                        <td>برامج التدريب</td>
                        <td>${training.length}</td>
                    </tr>
                    <tr>
                        <td>المخالفات</td>
                        <td>${violations.length}</td>
                    </tr>
                    <tr>
                        <td>الزيارات الطبية</td>
                        <td>${(data.clinicVisits || []).length}</td>
                    </tr>
                </tbody>
            </table>
            
            <h3 style="margin-top: 30px; margin-bottom: 15px; font-weight: bold; color: #333;">بند التدريب</h3>
            <table style="margin-bottom: 30px;">
                <thead>
                    <tr>
                        <th>المؤشر</th>
                        <th>القيمة</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>عدد المتدربين</td>
                        <td>${uniqueTrainees}</td>
                    </tr>
                    <tr>
                        <td>متوسط ساعات التدريب للموظفين</td>
                        <td>${avgTrainingHours} ساعة</td>
                    </tr>
                    <tr>
                        <td>إجمالي ساعات التدريب لجميع الموظفين</td>
                        <td>${totalTrainingHours.toFixed(2)} ساعة</td>
                    </tr>
                </tbody>
            </table>
            
            <h3 style="margin-top: 30px; margin-bottom: 15px; font-weight: bold; color: #333;">بند المخالفات</h3>
            <table style="margin-bottom: 30px;">
                <thead>
                    <tr>
                        <th>المؤشر</th>
                        <th>القيمة</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>عدد المخالفات للموظفين</td>
                        <td>${employeeViolations.length}</td>
                    </tr>
                    <tr>
                        <td>عدد المخالفات للمقاولين</td>
                        <td>${contractorViolations.length}</td>
                    </tr>
                </tbody>
            </table>
            
            ${violationsByTypeHTML ? `
            <h3 style="margin-top: 30px; margin-bottom: 15px; font-weight: bold; color: #333;">المخالفات حسب النوع</h3>
            <table style="margin-bottom: 30px;">
                <thead>
                    <tr>
                        <th>نوع المخالفة</th>
                        <th>عدد المخالفات</th>
                    </tr>
                </thead>
                <tbody>
                    ${violationsByTypeHTML}
                </tbody>
            </table>
            ` : ''}
            
            ${violationsByDeptHTML ? `
            <h3 style="margin-top: 30px; margin-bottom: 15px; font-weight: bold; color: #333;">المخالفات حسب الإدارة</h3>
            <table style="margin-bottom: 30px;">
                <thead>
                    <tr>
                        <th>الإدارة</th>
                        <th>عدد المخالفات</th>
                    </tr>
                </thead>
                <tbody>
                    ${violationsByDeptHTML}
                </tbody>
            </table>
            ` : ''}
        `;
    }
};

// ===== Export module to global scope =====
// تصدير الموديول إلى window فوراً لضمان توافره
(function () {
    'use strict';
    try {
        if (typeof window !== 'undefined' && typeof Reports !== 'undefined') {
            window.Reports = Reports;
            
            // إشعار عند تحميل الموديول بنجاح
            if (typeof AppState !== 'undefined' && AppState.debugMode && typeof Utils !== 'undefined' && Utils.safeLog) {
                Utils.safeLog('✅ Reports module loaded and available on window.Reports');
            }
        }
    } catch (error) {
        console.error('❌ خطأ في تصدير Reports:', error);
        // محاولة التصدير مرة أخرى حتى في حالة الخطأ
        if (typeof window !== 'undefined' && typeof Reports !== 'undefined') {
            try {
                window.Reports = Reports;
            } catch (e) {
                console.error('❌ فشل تصدير Reports:', e);
            }
        }
    }
})();