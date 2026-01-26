/**
 * Dashboard Module - موديول لوحة التحكم
 * تم استخراجه من app-modules.js لتحسين الأداء
 */

// ===== Dashboard Module =====
const Dashboard = {
    /**
     * تحميل لوحة التحكم
     */
    load() {
        // تحديث KPIs (يتضمن تحديث التقارير والإحصائيات تلقائياً)
        this.updateKPIs();
        // تحميل الأنشطة والمهام
        this.loadRecentActivities();
        this.loadUserTasksWidget();
        // تحديث الإحصائيات السريعة
        this.updateStats();
        // تحميل الودجات الإضافية
        this.loadReportsWidget();
        this.loadEmployeeReportWidget();
    },

    /**
     * تحميل قسم التقارير في Dashboard - تصميم محسّن وتحديثات غير متزحمة
     */
    async loadReportsWidget() {
        const container = document.getElementById('dashboard-reports-widget');
        if (!container) return;

        // عرض حالة التحميل أولاً (Skeleton Loader)
        container.innerHTML = this.renderReportsWidgetSkeleton();

        // تحميل البيانات بشكل غير متزحم
        try {
            // استخدام requestIdleCallback إذا كان متاحاً، وإلا setTimeout
            const loadData = () => {
                return new Promise((resolve) => {
                    if (window.requestIdleCallback) {
                        window.requestIdleCallback(() => resolve(), { timeout: 1000 });
                    } else {
                        setTimeout(() => resolve(), 100);
                    }
                });
            };

            await loadData();

            const data = AppState.appData;

            // حساب الإحصائيات بشكل تدريجي
            const stats = await this.calculateStatsAsync(data);
            const expiringMedications = await this.getExpiringMedicationsAsync(data);

            // عرض الكارت مع البيانات
            container.innerHTML = this.renderReportsWidget(stats, expiringMedications);

            // إضافة animations للكروت
            this.animateStatCards(container);

            // إعداد مستمعي الأحداث
            this.setupReportsWidgetEvents(container);
        } catch (error) {
            Utils.safeError('خطأ في تحميل كارت التقارير:', error);
            container.innerHTML = `
                <div class="content-card">
                    <div class="card-body">
                        <div class="empty-state">
                            <i class="fas fa-exclamation-triangle text-4xl text-gray-300 mb-4"></i>
                            <p class="text-gray-500">حدث خطأ أثناء تحميل البيانات</p>
                            <button onclick="Dashboard.loadReportsWidget()" class="btn-primary mt-4">
                                <i class="fas fa-redo ml-2"></i>إعادة المحاولة
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
    },

    /**
     * عرض حالة التحميل (Skeleton Loader)
     */
    renderReportsWidgetSkeleton() {
        return `
            <div class="content-card">
                <div class="card-header">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="skeleton-icon" style="width: 24px; height: 24px; border-radius: 6px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite;"></div>
                            <div class="skeleton-text" style="width: 200px; height: 24px; border-radius: 4px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite;"></div>
                        </div>
                        <button class="btn-icon" id="refresh-reports-btn" style="display: none;">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <div class="stats-cards-grid mb-6">
                        ${Array.from({ length: 5 }).map(() => `
                            <div class="stat-card" style="opacity: 0.7;">
                                <div class="skeleton-icon" style="width: 48px; height: 48px; border-radius: 12px; margin: 0 auto 0.75rem; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite;"></div>
                                <div class="skeleton-text" style="width: 60px; height: 32px; border-radius: 4px; margin: 0 auto 0.5rem; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite;"></div>
                                <div class="skeleton-text" style="width: 100px; height: 16px; border-radius: 4px; margin: 0 auto; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite;"></div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <style>
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            </style>
        `;
    },

    /**
     * حساب الإحصائيات بشكل غير متزحم
     */
    async calculateStatsAsync(data) {
        return new Promise((resolve) => {
            // استخدام requestIdleCallback أو setTimeout للتحميل غير المتزحم
            const calculate = () => {
                const registryData = (data.incidentsRegistry || []);
                const incidentsCount = (registryData && registryData.length > 0)
                    ? registryData.length
                    : (data.incidents || []).length;

                resolve({
                    incidents: incidentsCount,
                    training: (data.training || []).length,
                    ptw: (data.ptw || []).length,
                    violations: (data.violations || []).length,
                    sickLeave: (data.sickLeave || []).length,
                    ppe: (data.ppe || []).length,
                    behaviorMonitoring: (data.behaviorMonitoring || []).length,
                    clinicVisits: (data.clinicVisits || []).length
                });
            };

            if (window.requestIdleCallback) {
                window.requestIdleCallback(calculate, { timeout: 500 });
            } else {
                setTimeout(calculate, 50);
            }
        });
    },

    /**
     * الحصول على الأدوية المنتهية الصلاحية بشكل غير متزحم
     */
    async getExpiringMedicationsAsync(data) {
        return new Promise((resolve) => {
            const process = () => {
                const clinicMedications = data.clinicMedications || data.clinicInventory || [];
                const today = new Date();
                const expiringMedications = clinicMedications
                    .filter((med) => {
                        if (!med || !med.expiryDate) return false;
                        const expiry = new Date(med.expiryDate);
                        if (Number.isNaN(expiry.getTime())) return false;
                        const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
                        return diffDays <= 30;
                    })
                    .sort((a, b) => {
                        const aDate = new Date(a.expiryDate || 0);
                        const bDate = new Date(b.expiryDate || 0);
                        return aDate - bDate;
                    });
                resolve(expiringMedications);
            };

            if (window.requestIdleCallback) {
                window.requestIdleCallback(process, { timeout: 500 });
            } else {
                setTimeout(process, 50);
            }
        });
    },

    /**
     * عرض كارت التقارير مع البيانات
     */
    renderReportsWidget(stats, expiringMedications) {
        const today = new Date();

        return `
            <div class="reports-widget-card">
                
                <!-- الهيدر -->
                <div class="card-header reports-widget-header">
                    <div class="header-content-wrapper">
                        <div class="header-title-section">
                            <div class="reports-icon-wrapper">
                                <i class="fas fa-chart-line"></i>
                            </div>
                            <div class="title-text">
                                <h2>التقارير والإحصائيات</h2>
                                <p>نظرة شاملة على جميع البيانات والإحصائيات في النظام</p>
                            </div>
                        </div>
                        <div class="header-actions">
                            <button class="btn-icon reports-refresh-btn" id="refresh-reports-btn" title="تحديث البيانات">
                                <i class="fas fa-sync-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
                
                <!-- المحتوى الرئيسي -->
                <div class="card-body">
                    <!-- قسم كروت الإحصائيات -->
                    <div class="stats-section">
                        <div class="section-header-row">
                            <h3>
                                <i class="fas fa-chart-pie"></i>
                                <span>الإحصائيات السريعة</span>
                            </h3>
                        </div>
                        <div class="stats-cards-grid" id="reports-stats-grid">
                            ${this.renderStatCard('violations', stats.violations, 'المخالفات', 'fa-ban', 'yellow', 0)}
                            ${this.renderStatCard('sickLeave', stats.sickLeave, 'الإجازات المرضية', 'fa-calendar-times', 'blue', 100)}
                            ${this.renderStatCard('training', stats.training, 'برامج التدريب', 'fa-graduation-cap', 'green', 200)}
                            ${this.renderStatCard('ppe', stats.ppe, 'مهمات الوقاية', 'fa-hard-hat', 'orange', 300)}
                            ${this.renderStatCard('behaviorMonitoring', stats.behaviorMonitoring, 'مراقبة السلوكيات', 'fa-user-check', 'purple', 400)}
                            ${this.renderStatCard('clinicVisits', stats.clinicVisits, 'التردد على العيادة', 'fa-hospital', 'pink', 500)}
                            ${this.renderStatCard('incidents', stats.incidents, 'الحوادث', 'fa-exclamation-triangle', 'red', 600)}
                        </div>
                    </div>
                    
                    <!-- قسم أزرار التصدير -->
                    <div class="reports-actions-section">
                        <div class="section-header-row">
                            <h3>
                                <i class="fas fa-file-export"></i>
                                <span>تصدير التقارير</span>
                            </h3>
                            <span class="info-text">
                                <i class="fas fa-info-circle"></i>
                                يمكنك تصدير التقارير بصيغة PDF
                            </span>
                        </div>
                        <div class="reports-export-grid">
                            <button class="report-export-btn report-export-btn-incidents" data-report-type="incidents">
                                <div class="btn-content">
                                    <div class="btn-icon-wrapper">
                                        <i class="fas fa-file-pdf"></i>
                                    </div>
                                    <span class="btn-label">تقرير الحوادث</span>
                                </div>
                                <span class="btn-description">تصدير تقرير شامل عن الحوادث</span>
                            </button>
                            <button class="report-export-btn report-export-btn-training" data-report-type="training">
                                <div class="btn-content">
                                    <div class="btn-icon-wrapper">
                                        <i class="fas fa-file-pdf"></i>
                                    </div>
                                    <span class="btn-label">تقرير التدريب</span>
                                </div>
                                <span class="btn-description">تصدير تقرير عن برامج التدريب</span>
                            </button>
                            <button class="report-export-btn report-export-btn-full" data-report-type="full">
                                <div class="btn-content">
                                    <div class="btn-icon-wrapper">
                                        <i class="fas fa-file-pdf"></i>
                                    </div>
                                    <span class="btn-label">تقرير شامل</span>
                                </div>
                                <span class="btn-description">تصدير تقرير شامل لجميع البيانات</span>
                            </button>
                        </div>
                    </div>
                    
                    <!-- تنبيهات الأدوية -->
                    ${this.renderMedicationsAlerts(expiringMedications, today)}
                </div>
            </div>

        `;
    },

    /**
     * تحويل معرف الكارت إلى اسم الموديول
     */
    getModuleNameFromStatId(statId) {
        const statToModuleMap = {
            'violations': 'violations',
            'sickLeave': 'clinic',
            'training': 'training',
            'ppe': 'ppe',
            'behaviorMonitoring': 'behavior-monitoring',
            'clinicVisits': 'clinic',
            'incidents': 'incidents',
            'nearmiss': 'nearmiss',
            'periodic-inspections': 'periodic-inspections',
            'ptw': 'ptw',
            'iso': 'iso',
            'electricity-consumption': 'sustainability',
            'water-consumption': 'sustainability',
            'gas-consumption': 'sustainability'
        };
        return statToModuleMap[statId] || null;
    },

    /**
     * عرض كارت إحصائية واحد - تصميم محسّن ومتطور
     */
    renderStatCard(id, value, label, icon, color, delay) {
        // استخدام formatNumber لضمان عرض الأرقام بالإنجليزية
        const formattedValue = typeof value === 'number' ? this.formatNumber(value) : value;

        return `
            <div class="enhanced-stat-card stat-card-${color}" 
                 data-stat-id="${id}" 
                 data-stat-value="${value}"
                 data-clickable="true"
                 style="animation-delay: ${delay}ms; cursor: pointer;">
                
                <div class="stat-card-icon">
                    <i class="fas ${icon}"></i>
                </div>
                
                <div class="stat-card-value">
                    <span class="stat-value-number english-number" dir="ltr" style="direction: ltr; text-align: left; font-variant-numeric: tabular-nums;">${formattedValue}</span>
                </div>
                
                <div class="stat-card-label">
                    ${label}
                </div>
            </div>
        `;
    },

    /**
     * عرض تنبيهات الأدوية
     */
    renderMedicationsAlerts(expiringMedications, today) {
        if (expiringMedications.length === 0) {
            return `
                <div class="medications-alerts-section" style="border-top: 1px solid var(--border-color); padding-top: 2rem; margin-top: 2rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
                        <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(139, 92, 246, 0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <i class="fas fa-pills" style="color: #7c3aed; font-size: 1.125rem;"></i>
                        </div>
                        <h3 style="margin: 0; font-size: 1.25rem; font-weight: 600; color: var(--text-primary);">
                            تنبيهات صلاحية الأدوية
                        </h3>
                    </div>
                    <div style="background: rgba(34, 197, 94, 0.08); border: 1px solid rgba(34, 197, 94, 0.2); border-radius: 12px; padding: 1.25rem; display: flex; align-items: center; gap: 1rem;">
                        <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(34, 197, 94, 0.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <i class="fas fa-check-circle" style="color: #16a34a; font-size: 1.5rem;"></i>
                        </div>
                        <p style="margin: 0; font-size: 0.9375rem; font-weight: 500; color: var(--text-primary); line-height: 1.5;">
                            لا توجد أدوية منتهية أو قريبة الانتهاء خلال 30 يوماً.
                        </p>
                    </div>
                </div>
            `;
        }

        return `
            <div class="medications-alerts-section" style="border-top: 1px solid var(--border-color); padding-top: 2rem; margin-top: 2rem;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.75rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(139, 92, 246, 0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                            <i class="fas fa-pills" style="color: #7c3aed; font-size: 1.125rem;"></i>
                        </div>
                        <h3 style="margin: 0; font-size: 1.25rem; font-weight: 600; color: var(--text-primary);">
                            تنبيهات صلاحية الأدوية
                        </h3>
                    </div>
                    <span class="badge badge-warning" style="padding: 0.5rem 1rem; border-radius: 8px; font-weight: 600; font-size: 0.875rem; background: rgba(234, 179, 8, 0.15); color: #ca8a04; border: 1px solid rgba(234, 179, 8, 0.3);">
                        ${expiringMedications.length} تنبيه
                    </span>
                </div>
                <div class="medications-list" style="display: flex; flex-direction: column; gap: 0.75rem;">
                    ${expiringMedications.slice(0, 5).map((med, index) => {
            const expiry = med.expiryDate ? new Date(med.expiryDate) : null;
            const diff = expiry ? Math.ceil((expiry - today) / (1000 * 60 * 60 * 24)) : null;
            const statusText = diff !== null
                ? (diff < 0 ? 'منتهية الصلاحية' : `يتبقى ${diff} يوم`)
                : 'تاريخ غير محدد';
            const badgeClass = diff !== null
                ? (diff < 0 ? 'badge-danger' : diff <= 7 ? 'badge-danger' : diff <= 30 ? 'badge-warning' : 'badge-success')
                : 'badge-secondary';

            const badgeStyles = {
                'badge-danger': 'background: rgba(220, 38, 38, 0.1); color: #dc2626; border: 1px solid rgba(220, 38, 38, 0.2);',
                'badge-warning': 'background: rgba(234, 179, 8, 0.1); color: #ca8a04; border: 1px solid rgba(234, 179, 8, 0.2);',
                'badge-success': 'background: rgba(34, 197, 94, 0.1); color: #16a34a; border: 1px solid rgba(34, 197, 94, 0.2);',
                'badge-secondary': 'background: rgba(107, 114, 128, 0.1); color: #6b7280; border: 1px solid rgba(107, 114, 128, 0.2);'
            };

            return `
                        <div class="medication-alert-item" style="opacity: 0; transform: translateX(-20px); animation: slideInRight 0.4s ease ${index * 80}ms forwards; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.25rem; display: flex; align-items: center; justify-content: space-between; transition: all 0.2s ease; cursor: pointer; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);">
                            <div style="flex: 1; min-width: 0;">
                                <div style="font-size: 0.9375rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem; line-height: 1.4;">
                                    ${Utils.escapeHTML(med.name || '')}
                                </div>
                                <div style="font-size: 0.8125rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-calendar-alt" style="font-size: 0.75rem; opacity: 0.7;"></i>
                                    <span>${med.expiryDate ? Utils.formatDate(med.expiryDate) : 'تاريخ غير محدد'}</span>
                                </div>
                            </div>
                            <span class="badge ${badgeClass}" style="margin-right: 1rem; font-weight: 600; padding: 0.5rem 0.875rem; border-radius: 8px; font-size: 0.8125rem; white-space: nowrap; flex-shrink: 0; ${badgeStyles[badgeClass] || badgeStyles['badge-secondary']}">
                                ${statusText}
                            </span>
                        </div>
                    `;
        }).join('')}
                    ${expiringMedications.length > 5
                ? `<div class="text-center mt-3">
                        <p class="text-xs font-medium" style="color: var(--text-secondary);">
                            <i class="fas fa-info-circle ml-1"></i>
                            يوجد ${expiringMedications.length - 5} أدوية أخرى تتطلب المتابعة
                        </p>
                    </div>`
                : ''}
                </div>
            </div>
        `;
    },

    /**
     * إضافة animations للكروت
     */
    animateStatCards(container) {
        // البحث عن جميع أنواع الكروت (القديمة والجديدة)
        const oldCards = container.querySelectorAll('.reports-stat-card');
        const enhancedCards = container.querySelectorAll('.enhanced-stat-card');
        const cards = [...oldCards, ...enhancedCards];
        const self = this; // حفظ المرجع للكائن Dashboard

        cards.forEach((card, index) => {
            // إزالة أي event listeners سابقة لتجنب التكرار
            // استخدام dataset لتجنب إعادة إنشاء العناصر
            if (card.dataset.animated === 'true') {
                return; // تم إعداد هذا الكارت بالفعل
            }
            card.dataset.animated = 'true';

            // إضافة تأثير hover مع تحسين الأداء ومنع الاهتزاز
            let hoverTimeout = null;

            // CSS يتعامل مع hover effects تلقائياً، لكن نضيف event listeners للكروت المحسّنة
            // لضمان عمل جميع التأثيرات بشكل صحيح
            if (card.classList.contains('enhanced-stat-card')) {
                // الكروت المحسّنة تستخدم CSS للـ hover effects
                // فقط نضيف animation للقيم
            } else {
                // للكروت القديمة، نضيف hover effects يدوياً
                card.addEventListener('mouseenter', function () {
                    if (hoverTimeout) {
                        cancelAnimationFrame(hoverTimeout);
                    }
                    hoverTimeout = requestAnimationFrame(() => {
                        this.style.transform = 'translateY(-8px) scale(1.02)';
                        this.style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)';
                        this.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease';

                        const topBar = this.querySelector('.stat-card-top-bar');
                        if (topBar) {
                            topBar.style.height = '6px';
                            topBar.style.transition = 'height 0.3s ease';
                        }

                        const icon = this.querySelector('.stat-card-icon');
                        if (icon) {
                            icon.style.transform = 'scale(1.1) rotate(5deg)';
                            icon.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
                        }
                    });
                }, { passive: true });

                card.addEventListener('mouseleave', function () {
                    if (hoverTimeout) {
                        cancelAnimationFrame(hoverTimeout);
                    }
                    hoverTimeout = requestAnimationFrame(() => {
                        this.style.transform = '';
                        this.style.boxShadow = '';

                        const topBar = this.querySelector('.stat-card-top-bar');
                        if (topBar) {
                            topBar.style.height = '';
                        }

                        const icon = this.querySelector('.stat-card-icon');
                        if (icon) {
                            icon.style.transform = '';
                        }
                    });
                }, { passive: true });
            }

            // Animation للقيم (Count Up)
            const valueElement = card.querySelector('.stat-value-number');
            if (valueElement) {
                const targetValue = parseInt(card.dataset.statValue) || 0;
                self.animateValue(valueElement, 0, targetValue, 1000 + (index * 100));
            }
        });

        // إعداد معالجات النقر للكروت بعد إعداد الـ animations
        // (سيتم استدعاؤها مرة أخرى من setupReportsWidgetEvents، لكن هذا يضمن أنها تعمل)
        this.setupStatCardsClickHandlers(container);
    },

    /**
     * Animation للقيم (Count Up Effect)
     */
    animateValue(element, start, end, duration) {
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const current = Math.floor(progress * (end - start) + start);
            element.textContent = current.toLocaleString('en-US');
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    },

    /**
     * إعداد مستمعي الأحداث
     */
    setupReportsWidgetEvents(container) {
        // زر التحديث
        const refreshBtn = container.querySelector('#refresh-reports-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                const icon = refreshBtn.querySelector('i');
                if (icon) {
                    icon.style.transform = 'rotate(360deg)';
                    setTimeout(() => {
                        icon.style.transform = 'rotate(0deg)';
                    }, 500);
                }
                await this.loadReportsWidget();
            });
        }

        // أزرار التصدير
        const exportBtns = container.querySelectorAll('.report-export-btn');
        exportBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const reportType = btn.dataset.reportType;
                if (typeof Reports !== 'undefined' && Reports.generateAndExport) {
                    Reports.generateAndExport(reportType);
                } else {
                    Notification.warning('نظام التقارير غير متاح حالياً');
                }
            });

            // تأثير hover
            btn.addEventListener('mouseenter', function () {
                this.style.transform = 'translateY(-2px)';
                this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            });
            btn.addEventListener('mouseleave', function () {
                this.style.transform = 'translateY(0)';
                this.style.boxShadow = '';
            });
        });

        // إضافة معالجات النقر على كروت الإحصائيات
        this.setupStatCardsClickHandlers(container);
    },

    /**
     * إعداد معالجات النقر على كروت التقارير والإحصائيات (Reports & Statistics)
     */
    setupReportsStatisticsCardsClickHandlers() {
        const reportsStatisticsSection = document.querySelector('.reports-statistics-section');
        if (!reportsStatisticsSection) return;

        const metricCards = reportsStatisticsSection.querySelectorAll('.metric-card-frame[data-clickable="true"]');
        
        metricCards.forEach(card => {
            // تجنب إضافة معالج النقر أكثر من مرة
            if (card.dataset.clickHandlerAdded === 'true') {
                return;
            }
            card.dataset.clickHandlerAdded = 'true';

            card.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const statId = card.getAttribute('data-stat-id');
                if (!statId) return;

                // الحصول على اسم الموديول من معرف الكارت
                const moduleName = this.getModuleNameFromStatId(statId);
                if (!moduleName) {
                    console.warn('لم يتم العثور على موديول للكارت:', statId);
                    return;
                }

                // التحقق من الصلاحيات (fail-closed إذا Permissions غير متاح)
                const canAccess = (typeof Permissions !== 'undefined' && typeof Permissions.hasAccess === 'function')
                    ? Permissions.hasAccess(moduleName)
                    : ((AppState?.currentUser?.role || '').toLowerCase() === 'admin');

                if (!canAccess) {
                    // المستخدم ليس لديه صلاحية للوصول إلى هذا الموديول
                    if (typeof Notification !== 'undefined' && typeof Notification.warning === 'function') {
                        Notification.warning('ليس لديك صلاحية للوصول إلى هذا القسم');
                    } else {
                        alert('ليس لديك صلاحية للوصول إلى هذا القسم');
                    }
                    return;
                }

                // التنقل إلى الموديول المطلوب
                if (typeof UI !== 'undefined' && typeof UI.showSection === 'function') {
                    UI.showSection(moduleName);
                } else if (typeof window !== 'undefined' && window.location) {
                    window.location.hash = moduleName;
                } else {
                    console.warn('لا يمكن التنقل إلى الموديول:', moduleName);
                }
            });

            // إضافة تأثير hover إضافي للكارت
            card.addEventListener('mouseenter', function () {
                if (!this.style.transition) {
                    this.style.transition = 'all 0.3s ease';
                }
            });
        });
    },

    /**
     * إعداد معالجات النقر على كروت الإحصائيات
     */
    setupStatCardsClickHandlers(container) {
        const statCards = container.querySelectorAll('.enhanced-stat-card[data-clickable="true"]');
        
        statCards.forEach(card => {
            // تجنب إضافة معالج النقر أكثر من مرة
            if (card.dataset.clickHandlerAdded === 'true') {
                return;
            }
            card.dataset.clickHandlerAdded = 'true';

            card.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const statId = card.getAttribute('data-stat-id');
                if (!statId) return;

                // الحصول على اسم الموديول من معرف الكارت
                const moduleName = this.getModuleNameFromStatId(statId);
                if (!moduleName) {
                    console.warn('لم يتم العثور على موديول للكارت:', statId);
                    return;
                }

                // التحقق من الصلاحيات (fail-closed إذا Permissions غير متاح)
                const canAccess = (typeof Permissions !== 'undefined' && typeof Permissions.hasAccess === 'function')
                    ? Permissions.hasAccess(moduleName)
                    : ((AppState?.currentUser?.role || '').toLowerCase() === 'admin');

                if (!canAccess) {
                    // المستخدم ليس لديه صلاحية للوصول إلى هذا الموديول
                    if (typeof Notification !== 'undefined' && typeof Notification.warning === 'function') {
                        Notification.warning('ليس لديك صلاحية للوصول إلى هذا القسم');
                    } else {
                        alert('ليس لديك صلاحية للوصول إلى هذا القسم');
                    }
                    return;
                }

                // التنقل إلى الموديول المطلوب
                if (typeof UI !== 'undefined' && typeof UI.showSection === 'function') {
                    UI.showSection(moduleName);
                } else if (typeof window !== 'undefined' && window.location) {
                    window.location.hash = moduleName;
                } else {
                    console.warn('لا يمكن التنقل إلى الموديول:', moduleName);
                }
            });

            // إضافة تأثير hover إضافي للكارت
            card.addEventListener('mouseenter', function () {
                if (!this.style.transition) {
                    this.style.transition = 'all 0.3s ease';
                }
            });
        });
    },

    /**
     * تحميل قسم تقرير الموظف
     */
    loadEmployeeReportWidget() {
        const container = document.getElementById('employee-report-widget');
        if (!container) return;

        container.innerHTML = `
            <div class="content-card">
                <div class="card-header">
                    <h2 class="card-title">
                        <i class="fas fa-user-search ml-2"></i>
                        البحث بكود الموظف - تقرير شامل
                    </h2>
                </div>
                <div class="card-body">
                    <div class="mb-6">
                        <div class="flex items-end gap-4 mb-4">
                            <div style="flex: 0 0 auto; width: 200px;">
                                <label class="block text-sm font-semibold text-gray-700 mb-2">
                                    <i class="fas fa-id-card ml-2"></i>
                                    الكود الوظيفي
                                </label>
                                <div class="relative" style="display: flex; align-items: center; gap: 0.5rem;">
                                    <input type="text" id="employee-code-search" class="form-input" 
                                        placeholder="أدخل الكود الوظيفي"
                                        style="width: 120px; padding: 0.625rem 0.75rem; border-radius: 8px; font-size: 0.95rem; text-align: center;">
                                    <button id="search-employee-btn" class="btn-primary" style="width: 44px; height: 44px; padding: 0; display: flex; align-items: center; justify-content: center; border-radius: 8px; flex-shrink: 0;">
                                        <i class="fas fa-search"></i>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <button id="export-employee-report-btn" class="btn-success" disabled>
                                    <i class="fas fa-file-pdf ml-2"></i>تصدير التقرير PDF
                                </button>
                            </div>
                        </div>
                    </div>
                    <div id="employee-report-content" class="hidden">
                        <div id="employee-report-data"></div>
                    </div>
                </div>
            </div>
        `;

        const searchBtn = document.getElementById('search-employee-btn');
        const exportBtn = document.getElementById('export-employee-report-btn');
        const searchInput = document.getElementById('employee-code-search');

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const code = searchInput?.value.trim();
                if (code) {
                    this.generateEmployeeReport(code);
                } else {
                    Notification.warning('يرجى إدخال الكود الوظيفي');
                }
            });
        }

        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const code = searchInput.value.trim();
                    if (code) {
                        this.generateEmployeeReport(code);
                    }
                }
            });
        }

        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                const code = searchInput?.value.trim();
                if (code) {
                    this.exportEmployeeReportPDF(code);
                }
            });
        }
    },

    /**
     * توليد تقرير شامل للموظف
     */
    generateEmployeeReport(employeeCode) {
        const data = AppState.appData;
        // البحث بكود الموظف مع تحسين البحث
        let employee = null;
        const employees = data.employees || [];

        // البحث الدقيق أولاً
        employee = employees.find(emp =>
            emp.employeeNumber === employeeCode ||
            emp.sapId === employeeCode ||
            emp.id === employeeCode ||
            emp.employeeCode === employeeCode
        );

        // إذا لم يتم العثور، البحث الجزئي (يحتوي على)
        if (!employee) {
            employee = employees.find(emp => {
                const code = String(emp.employeeNumber || emp.sapId || emp.id || emp.employeeCode || '').trim();
                const searchCode = String(employeeCode).trim();
                return code.includes(searchCode) || searchCode.includes(code);
            });
        }

        // إذا لم يتم العثور، البحث بالاسم (إذا كان الكود يحتوي على اسم)
        if (!employee && employeeCode.length > 3) {
            employee = employees.find(emp => {
                const name = String(emp.name || '').toLowerCase().trim();
                const searchTerm = String(employeeCode).toLowerCase().trim();
                return name.includes(searchTerm) || searchTerm.includes(name);
            });
        }

        if (!employee) {
            Notification.error('لم يتم العثور على الموظف بهذا الكود');
            const contentContainer = document.getElementById('employee-report-content');
            if (contentContainer) contentContainer.classList.add('hidden');
            return;
        }

        // ✅ إصلاح: جمع جميع المعرفات الممكنة للموظف
        const normalizeValue = (val) => {
            if (!val) return null;
            const str = String(val).trim();
            return str ? str.toLowerCase() : null;
        };

        const employeeIdentifiers = new Set();
        // إضافة جميع المعرفات الممكنة بعد تطبيعها
        [
            employee.id,
            employee.employeeNumber,
            employee.sapId,
            employee.employeeCode,
            employee.code,
            employee.cardId,
            employee.nationalId
        ].forEach(id => {
            const normalized = normalizeValue(id);
            if (normalized) {
                employeeIdentifiers.add(normalized);
                // إضافة القيمة الأصلية أيضاً (بدون تطبيع) للبحث الدقيق
                if (id) employeeIdentifiers.add(String(id).trim());
            }
        });

        // ✅ إصلاح: دالة مطابقة محسّنة للاسم - استخدام الاسم الكامل بدلاً من الاسم الأول فقط
        const employeeFullName = String(employee.name || '').trim();
        const employeeNameNormalized = employeeFullName.toLowerCase().trim();
        const employeeNameParts = employeeNameNormalized.split(/\s+/).filter(p => p.length > 0);

        const matchesEmployeeName = (value) => {
            if (!employeeNameNormalized || !value) return false;
            if (value === undefined || value === null) return false;

            let candidateName = '';
            if (typeof value === 'string') {
                candidateName = value;
            } else if (typeof value === 'object') {
                if (value.name) {
                    candidateName = value.name;
                } else if (value.label) {
                    candidateName = value.label;
                } else if (value.displayName) {
                    candidateName = value.displayName;
                } else {
                    candidateName = JSON.stringify(value);
                }
            } else {
                candidateName = String(value);
            }

            const candidateNameNormalized = String(candidateName).toLowerCase().trim();
            
            // ✅ مطابقة دقيقة: يجب أن يكون الاسم مطابقاً تماماً أو يحتوي على جميع أجزاء الاسم
            if (candidateNameNormalized === employeeNameNormalized) {
                return true;
            }
            
            // ✅ مطابقة جزئية محسّنة: يجب أن يحتوي على جميع أجزاء الاسم (وليس فقط الاسم الأول)
            if (employeeNameParts.length > 0) {
                const allPartsMatch = employeeNameParts.every(part => 
                    part.length > 2 && candidateNameNormalized.includes(part)
                );
                return allPartsMatch;
            }
            
            return false;
        };

        // ✅ إصلاح: دالة مساعدة للتحقق من مطابقة المعرفات
        const matchesEmployeeIdentifier = (record) => {
            if (!record) return false;
            
            // التحقق من جميع الحقول الممكنة للمعرفات
            const recordIdentifiers = [
                record.employeeCode,
                record.employeeNumber,
                record.employeeId,
                record.id,
                record.code,
                record.sapId,
                record.cardId
            ];
            
            return recordIdentifiers.some(recordId => {
                if (!recordId) return false;
                const normalized = normalizeValue(recordId);
                const original = String(recordId).trim();
                return employeeIdentifiers.has(normalized) || employeeIdentifiers.has(original);
            });
        };

        // ✅ إصلاح: البحث عن جميع السجلات المتعلقة بالموظف باستخدام المعرفات الفعلية
        const violations = (data.violations || []).filter(v => {
            // ✅ استبعاد سجلات المقاولين
            if (v.personType === 'contractor' || v.contractorName) return false;
            // أولاً: التحقق من المعرفات (الأولوية)
            if (matchesEmployeeIdentifier(v)) return true;
            // ثانياً: التحقق من الاسم (كحل احتياطي فقط)
            if (v.employeeName && matchesEmployeeName(v.employeeName)) return true;
            return false;
        });

        const sickLeave = (data.sickLeave || []).filter(s => {
            // ✅ استبعاد سجلات المقاولين
            if (s.personType === 'contractor' || s.contractorName) return false;
            if (matchesEmployeeIdentifier(s)) return true;
            if (s.employeeName && matchesEmployeeName(s.employeeName)) return true;
            return false;
        });

        const training = (data.training || []).filter(t => {
            if (t.participants && Array.isArray(t.participants)) {
                return t.participants.some(p => {
                    // ✅ استبعاد المشاركين من نوع مقاول
                    if (p.personType === 'contractor' || p.type === 'contractor' || p.contractorName) return false;
                    // التحقق من المعرفات في بيانات المشارك
                    if (matchesEmployeeIdentifier(p)) return true;
                    // التحقق من الاسم
                    if (p.name && matchesEmployeeName(p.name)) return true;
                    return false;
                });
            }
            return false;
        });

        const ppe = (data.ppe || []).filter(p => {
            if (matchesEmployeeIdentifier(p)) return true;
            if (p.employeeName && matchesEmployeeName(p.employeeName)) return true;
            return false;
        });

        const behaviorMonitoring = (data.behaviorMonitoring || []).filter(b => {
            if (matchesEmployeeIdentifier(b)) return true;
            if (b.employeeName && matchesEmployeeName(b.employeeName)) return true;
            return false;
        });

        const clinicVisits = (data.clinicVisits || []).filter(c => {
            // ✅ استبعاد سجلات المقاولين
            if (c.personType === 'contractor' || c.contractorName) return false;
            if (matchesEmployeeIdentifier(c)) return true;
            if (c.employeeName && matchesEmployeeName(c.employeeName)) return true;
            return false;
        });

        const incidents = (data.incidents || []).filter(i => {
            // ✅ استبعاد سجلات المقاولين
            if (i.personType === 'contractor' || i.contractorName) return false;
            if (matchesEmployeeIdentifier(i)) return true;
            if (i.employeeName && matchesEmployeeName(i.employeeName)) return true;
            return false;
        });

        const reportContainer = document.getElementById('employee-report-data');
        const contentContainer = document.getElementById('employee-report-content');
        const exportBtn = document.getElementById('export-employee-report-btn');

        reportContainer.innerHTML = `
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <h3 class="text-xl font-bold text-gray-800 mb-2">
                            <i class="fas fa-user ml-2"></i>
                            ${Utils.escapeHTML(employee.name || '')}
                        </h3>
                        <p class="text-gray-600">
                            <i class="fas fa-id-card ml-2"></i>
                            الكود الوظيفي: <strong>${Utils.escapeHTML(employee.employeeNumber || employee.sapId || employeeCode)}</strong>
                        </p>
                        ${employee.department ? `<p class="text-gray-600 mt-1"><i class="fas fa-building ml-2"></i>القسم: ${Utils.escapeHTML(employee.department)}</p>` : ''}
                        ${employee.position ? `<p class="text-gray-600 mt-1"><i class="fas fa-briefcase ml-2"></i>المنصب: ${Utils.escapeHTML(employee.position)}</p>` : ''}
                    </div>
                    ${employee.photo ? `<img src="${employee.photo}" alt="صورة الموظف" class="w-24 h-24 rounded-full object-cover border-2 border-blue-500">` : ''}
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <div class="text-3xl font-bold text-red-600 mb-2">${violations.length}</div>
                    <div class="text-sm text-gray-700 font-semibold">المخالفات</div>
                </div>
                <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <div class="text-3xl font-bold text-blue-600 mb-2">${sickLeave.length}</div>
                    <div class="text-sm text-gray-700 font-semibold">الإجازات المرضية</div>
                </div>
                <div class="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <div class="text-3xl font-bold text-green-600 mb-2">${training.length}</div>
                    <div class="text-sm text-gray-700 font-semibold">برامج التدريب</div>
                </div>
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <div class="text-3xl font-bold text-yellow-600 mb-2">${ppe.length}</div>
                    <div class="text-sm text-gray-700 font-semibold">مهمات الوقاية</div>
                </div>
                <div class="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                    <div class="text-3xl font-bold text-purple-600 mb-2">${behaviorMonitoring.length}</div>
                    <div class="text-sm text-gray-700 font-semibold">مراقبة السلوكيات</div>
                </div>
                <div class="bg-pink-50 border border-pink-200 rounded-lg p-4 text-center">
                    <div class="text-3xl font-bold text-pink-600 mb-2">${clinicVisits.length}</div>
                    <div class="text-sm text-gray-700 font-semibold">التردد على العيادة</div>
                </div>
                <div class="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                    <div class="text-3xl font-bold text-orange-600 mb-2">${incidents.length}</div>
                    <div class="text-sm text-gray-700 font-semibold">الحوادث</div>
                </div>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                ${violations.length > 0 ? `
                    <div class="content-card">
                        <div class="card-header">
                            <h3 class="card-title"><i class="fas fa-exclamation-circle ml-2"></i>المخالفات (${violations.length})</h3>
                        </div>
                        <div class="card-body">
                            <div class="space-y-3">
                                ${violations.slice(0, 5).map(v => `
                                    <div class="border rounded p-3">
                                        <div class="flex items-center justify-between mb-2">
                                            <span class="font-semibold">${Utils.escapeHTML(v.violationType || '')}</span>
                                            <span class="badge badge-${v.severity === 'عالية' ? 'danger' : 'warning'}">${v.severity || ''}</span>
                                        </div>
                                        <p class="text-sm text-gray-600">${Utils.escapeHTML((v.actionTaken || '').substring(0, 100))}</p>
                                        <p class="text-xs text-gray-500 mt-2">${v.violationDate ? Utils.formatDate(v.violationDate) : ''}</p>
                                    </div>
                                `).join('')}
                                ${violations.length > 5 ? `<p class="text-sm text-gray-500 text-center mt-2">و ${violations.length - 5} مخالفات أخرى...</p>` : ''}
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                ${sickLeave.length > 0 ? `
                    <div class="content-card">
                        <div class="card-header">
                            <h3 class="card-title"><i class="fas fa-calendar-times ml-2"></i>الإجازات المرضية (${sickLeave.length})</h3>
                        </div>
                        <div class="card-body">
                            <div class="space-y-3">
                                ${sickLeave.slice(0, 5).map(s => `
                                    <div class="border rounded p-3">
                                        <div class="flex items-center justify-between mb-2">
                                            <span class="font-semibold">من ${s.startDate ? Utils.formatDate(s.startDate) : ''} إلى ${s.endDate ? Utils.formatDate(s.endDate) : ''}</span>
                                        </div>
                                        <p class="text-sm text-gray-600">${Utils.escapeHTML(s.reason || '')}</p>
                                        ${s.medicalNotes ? `<p class="text-xs text-gray-500 mt-2">${Utils.escapeHTML(s.medicalNotes)}</p>` : ''}
                                    </div>
                                `).join('')}
                                ${sickLeave.length > 5 ? `<p class="text-sm text-gray-500 text-center mt-2">و ${sickLeave.length - 5} إجازة أخرى...</p>` : ''}
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                ${training.length > 0 ? `
                    <div class="content-card">
                        <div class="card-header">
                            <h3 class="card-title"><i class="fas fa-graduation-cap ml-2"></i>برامج التدريب (${training.length})</h3>
                        </div>
                        <div class="card-body">
                            <div class="space-y-3">
                                ${training.slice(0, 5).map(t => `
                                    <div class="border rounded p-3">
                                        <div class="flex items-center justify-between mb-2">
                                            <span class="font-semibold">${Utils.escapeHTML(t.name || '')}</span>
                                            <span class="badge badge-${t.status === 'مكتمل' ? 'success' : 'warning'}">${t.status || ''}</span>
                                        </div>
                                        <p class="text-sm text-gray-600">المدرب: ${Utils.escapeHTML(t.trainer || '')}</p>
                                        <p class="text-xs text-gray-500 mt-2">${t.startDate ? Utils.formatDate(t.startDate) : ''}</p>
                                    </div>
                                `).join('')}
                                ${training.length > 5 ? `<p class="text-sm text-gray-500 text-center mt-2">و ${training.length - 5} برنامج آخر...</p>` : ''}
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                ${ppe.length > 0 ? `
                    <div class="content-card">
                        <div class="card-header">
                            <h3 class="card-title"><i class="fas fa-hard-hat ml-2"></i>مهمات الوقاية (${ppe.length})</h3>
                        </div>
                        <div class="card-body">
                            <div class="space-y-3">
                                ${ppe.slice(0, 5).map(p => `
                                    <div class="border rounded p-3">
                                        <div class="flex items-center justify-between mb-2">
                                            <span class="font-semibold">${Utils.escapeHTML(p.equipmentType || '')}</span>
                                            <span class="badge badge-success">${p.receiptNumber || p.id}</span>
                                        </div>
                                        <p class="text-sm text-gray-600">الكمية: ${p.quantity || 0}</p>
                                        <p class="text-xs text-gray-500 mt-2">تاريخ الاستلام: ${p.receiptDate ? Utils.formatDate(p.receiptDate) : ''}</p>
                                    </div>
                                `).join('')}
                                ${ppe.length > 5 ? `<p class="text-sm text-gray-500 text-center mt-2">و ${ppe.length - 5} استلام آخر...</p>` : ''}
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                ${behaviorMonitoring.length > 0 ? `
                    <div class="content-card">
                        <div class="card-header">
                            <h3 class="card-title"><i class="fas fa-user-check ml-2"></i>مراقبة السلوكيات (${behaviorMonitoring.length})</h3>
                        </div>
                        <div class="card-body">
                            <div class="space-y-3">
                                ${behaviorMonitoring.slice(0, 5).map(b => `
                                    <div class="border rounded p-3">
                                        <div class="flex items-center justify-between mb-2">
                                            <span class="font-semibold">${Utils.escapeHTML(b.behaviorType || '')}</span>
                                            <span class="badge badge-${b.rating >= 4 ? 'success' : b.rating >= 3 ? 'warning' : 'danger'}">${b.rating || 0}/5</span>
                                        </div>
                                        <p class="text-sm text-gray-600">${Utils.escapeHTML((b.description || '').substring(0, 100))}</p>
                                        <p class="text-xs text-gray-500 mt-2">${b.date ? Utils.formatDate(b.date) : ''}</p>
                                    </div>
                                `).join('')}
                                ${behaviorMonitoring.length > 5 ? `<p class="text-sm text-gray-500 text-center mt-2">و ${behaviorMonitoring.length - 5} تسجيل آخر...</p>` : ''}
                            </div>
                        </div>
                    </div>
                ` : ''}
                
                ${clinicVisits.length > 0 ? `
                    <div class="content-card">
                        <div class="card-header">
                            <h3 class="card-title"><i class="fas fa-hospital ml-2"></i>التردد على العيادة (${clinicVisits.length})</h3>
                        </div>
                        <div class="card-body">
                            <div class="space-y-3">
                                ${clinicVisits.slice(0, 5).map(c => `
                                    <div class="border rounded p-3">
                                        <div class="flex items-center justify-between mb-2">
                                            <span class="font-semibold">${Utils.escapeHTML(c.reason || 'زيارة عادية')}</span>
                                        </div>
                                        ${c.diagnosis ? `<p class="text-sm text-gray-600">التشخيص: ${Utils.escapeHTML(c.diagnosis)}</p>` : ''}
                                        ${c.treatment ? `<p class="text-sm text-gray-600">العلاج: ${Utils.escapeHTML(c.treatment)}</p>` : ''}
                                        <p class="text-xs text-gray-500 mt-2">${c.visitDate ? Utils.formatDate(c.visitDate) : ''}</p>
                                    </div>
                                `).join('')}
                                ${clinicVisits.length > 5 ? `<p class="text-sm text-gray-500 text-center mt-2">و ${clinicVisits.length - 5} زيارة أخرى...</p>` : ''}
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        contentContainer.classList.remove('hidden');
        if (exportBtn) exportBtn.disabled = false;

        // ✅ إصلاح: استخدام المعرف الأساسي للموظف (وليس مصطلح البحث)
        const primaryEmployeeCode = employee.employeeNumber || employee.sapId || employee.id || employee.employeeCode || employeeCode;

        // حفظ بيانات التقرير للتصدير
        window.currentEmployeeReport = {
            employee,
            employeeCode: primaryEmployeeCode, // ✅ استخدام المعرف الفعلي للموظف
            employeeIdentifiers: Array.from(employeeIdentifiers), // ✅ حفظ جميع المعرفات للتحقق
            violations,
            sickLeave,
            training,
            ppe,
            behaviorMonitoring,
            clinicVisits,
            incidents
        };
    },

    /**
     * تصدير تقرير الموظف كـ PDF
     */
    async exportEmployeeReportPDF(employeeCode) {
        if (!window.currentEmployeeReport || window.currentEmployeeReport.employeeCode !== employeeCode) {
            this.generateEmployeeReport(employeeCode);
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        const report = window.currentEmployeeReport;
        if (!report) {
            Notification.error('لا توجد بيانات تقرير');
            return;
        }

        try {
            Loading.show();

            const formCode = `EMP-REPORT-${employeeCode}-${new Date().toISOString().slice(0, 10)}`;
            const formTitle = `تقرير شامل للموظ: ${report.employee.name || ''}`;

            let content = `
                <table style="margin-bottom: 30px;">
                    <tr><th>الاسم</th><td>${Utils.escapeHTML(report.employee.name || '')}</td></tr>
                    <tr><th>الكود الوظيي</th><td>${Utils.escapeHTML(report.employee.employeeNumber || report.employee.sapId || employeeCode)}</td></tr>
                    ${report.employee.department ? `<tr><th>القسم</th><td>${Utils.escapeHTML(report.employee.department)}</td></tr>` : ''}
                    ${report.employee.position ? `<tr><th>المنصب</th><td>${Utils.escapeHTML(report.employee.position)}</td></tr>` : ''}
                </table>
                
                <div class="section-title">ملخص الإحصائيات</div>
                <table>
                    <tr><th>المخالفات</th><td>${report.violations.length}</td></tr>
                    <tr><th>الإجازات المرضية</th><td>${report.sickLeave.length}</td></tr>
                    <tr><th>برامج التدريب</th><td>${report.training.length}</td></tr>
                    <tr><th>مهمات الوقاية</th><td>${report.ppe.length}</td></tr>
                    <tr><th>مراقبة السلوكيات</th><td>${report.behaviorMonitoring.length}</td></tr>
                    <tr><th>التردد على العيادة</th><td>${report.clinicVisits.length}</td></tr>
                    <tr><th>الحوادث</th><td>${report.incidents.length}</td></tr>
                </table>
            `;

            if (report.violations.length > 0) {
                content += `
                    <div class="section-title">المخالفات (${report.violations.length})</div>
                    <table>
                        <tr>
                            <th>النوع</th>
                            <th>التاريخ</th>
                            <th>الشدة</th>
                            <th>الإجراء المتخذ</th>
                            <th>الحالة</th>
                        </tr>
                        ${report.violations.map(v => `
                            <tr>
                                <td>${Utils.escapeHTML(v.violationType || '')}</td>
                                <td>${v.violationDate ? Utils.formatDate(v.violationDate) : ''}</td>
                                <td>${Utils.escapeHTML(v.severity || '')}</td>
                                <td>${Utils.escapeHTML(v.actionTaken || '')}</td>
                                <td>${Utils.escapeHTML(v.status || '')}</td>
                            </tr>
                        `).join('')}
                    </table>
                `;
            }

            if (report.sickLeave.length > 0) {
                content += `
                    <div class="section-title">الإجازات المرضية (${report.sickLeave.length})</div>
                    <table>
                        <tr>
                            <th>من تاريخ</th>
                            <th>إلى تاريخ</th>
                            <th>السبب</th>
                            <th>الملاحظات الطبية</th>
                        </tr>
                        ${report.sickLeave.map(s => `
                            <tr>
                                <td>${s.startDate ? Utils.formatDate(s.startDate) : ''}</td>
                                <td>${s.endDate ? Utils.formatDate(s.endDate) : ''}</td>
                                <td>${Utils.escapeHTML(s.reason || '')}</td>
                                <td>${Utils.escapeHTML(s.medicalNotes || '')}</td>
                            </tr>
                        `).join('')}
                    </table>
                `;
            }

            if (report.training.length > 0) {
                content += `
                    <div class="section-title">برامج التدريب (${report.training.length})</div>
                    <table>
                        <tr>
                            <th>اسم البرنامج</th>
                            <th>المدرب</th>
                            <th>تاريخ البدء</th>
                            <th>الحالة</th>
                        </tr>
                        ${report.training.map(t => `
                            <tr>
                                <td>${Utils.escapeHTML(t.name || '')}</td>
                                <td>${Utils.escapeHTML(t.trainer || '')}</td>
                                <td>${t.startDate ? Utils.formatDate(t.startDate) : ''}</td>
                                <td>${Utils.escapeHTML(t.status || '')}</td>
                            </tr>
                        `).join('')}
                    </table>
                `;
            }

            if (report.ppe.length > 0) {
                content += `
                    <div class="section-title">مهمات الوقاية (${report.ppe.length})</div>
                    <table>
                        <tr>
                            <th>رقم الإيصال</th>
                            <th>نوع المعدة</th>
                            <th>الكمية</th>
                            <th>تاريخ الاستلام</th>
                            <th>الحالة</th>
                        </tr>
                        ${report.ppe.map(p => `
                            <tr>
                                <td>${Utils.escapeHTML(p.receiptNumber || p.id || '')}</td>
                                <td>${Utils.escapeHTML(p.equipmentType || '')}</td>
                                <td>${p.quantity || 0}</td>
                                <td>${p.receiptDate ? Utils.formatDate(p.receiptDate) : ''}</td>
                                <td>${Utils.escapeHTML(p.status || '')}</td>
                            </tr>
                        `).join('')}
                    </table>
                `;
            }

            if (report.behaviorMonitoring.length > 0) {
                content += `
                    <div class="section-title">مراقبة السلوكيات (${report.behaviorMonitoring.length})</div>
                    <table>
                        <tr>
                            <th>نوع السلوك</th>
                            <th>التقييم</th>
                            <th>التاريخ</th>
                            <th>الوصف</th>
                        </tr>
                        ${report.behaviorMonitoring.map(b => `
                            <tr>
                                <td>${Utils.escapeHTML(b.behaviorType || '')}</td>
                                <td>${b.rating || 0}/5</td>
                                <td>${b.date ? Utils.formatDate(b.date) : ''}</td>
                                <td>${Utils.escapeHTML(b.description || '')}</td>
                            </tr>
                        `).join('')}
                    </table>
                `;
            }

            if (report.clinicVisits.length > 0) {
                content += `
                    <div class="section-title">التردد على العيادة (${report.clinicVisits.length})</div>
                    <table>
                        <tr>
                            <th>تاريخ الزيارة</th>
                            <th>السبب</th>
                            <th>التشخيص</th>
                            <th>العلاج</th>
                        </tr>
                        ${report.clinicVisits.map(c => `
                            <tr>
                                <td>${c.visitDate ? Utils.formatDate(c.visitDate) : ''}</td>
                                <td>${Utils.escapeHTML(c.reason || '')}</td>
                                <td>${Utils.escapeHTML(c.diagnosis || '')}</td>
                                <td>${Utils.escapeHTML(c.treatment || '')}</td>
                            </tr>
                        `).join('')}
                    </table>
                `;
            }

            const htmlContent = typeof FormHeader !== 'undefined' && FormHeader.generatePDFHTML
                ? FormHeader.generatePDFHTML(formCode, formTitle, content, false, true)
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
                            Loading.hide();
                            Notification.success('تم تحضير التقرير للطباعة/الحفظ كـ PDF');
                        }, 1000);
                    }, 500);
                };
            } else {
                Loading.hide();
                Notification.error('يرجى السماح للنوافذ المنبثقة لعرض التقرير');
            }
        } catch (error) {
            Loading.hide();
            Utils.safeError('خطأ في تصدير PDF:', error);
            Notification.error('فشل تصدير PDF: ' + error.message);
        }
    },

    /**
     * تحديث مؤشرات الأداء
     */
    updateKPIs() {
        const data = AppState.appData;
        if (!data) {
            Utils.safeWarn('⚠️ AppState.appData غير متوفر');
            return;
        }

        try {
            // التحقق من وجود البيانات قبل استخدام filter
            const incidents = Array.isArray(data.incidents) ? data.incidents : [];
            const users = Array.isArray(data.users) ? data.users : [];
            const ptw = Array.isArray(data.ptw) ? data.ptw : [];
            const nearmiss = Array.isArray(data.nearmiss) ? data.nearmiss : [];
            const training = Array.isArray(data.training) ? data.training : [];
            const violations = Array.isArray(data.violations) ? data.violations : [];
            const clinicVisits = Array.isArray(data.clinicVisits) ? data.clinicVisits : [];
            const employees = Array.isArray(data.employees) ? data.employees : [];

        // تحديث KPIs الأساسية
        const totalIncidentsEl = document.getElementById('total-incidents');
        if (totalIncidentsEl) {
            // استخدام سجل الحوادث للحصول على العدد الدقيق
            const registryData = (data.incidentsRegistry || []);
            const totalIncidentsCount = (registryData && registryData.length > 0)
                ? registryData.length
                : incidents.length;
            totalIncidentsEl.textContent = this.formatNumber(totalIncidentsCount);
            this.applyEnglishNumberFormat(totalIncidentsEl);
        }

        const activeUsersEl = document.getElementById('active-users');
        if (activeUsersEl) {
            const activeUsersCount = users.filter(u => u && u.active !== false).length;
            activeUsersEl.textContent = this.formatNumber(activeUsersCount);
            this.applyEnglishNumberFormat(activeUsersEl);
        }

        // تحديث كارت تصاريح العمل المفصل
        const openPTWCount = ptw.filter(p => {
            if (!p || !p.status) return false;
            const status = p.status.toLowerCase();
            return status === 'مفتوح' ||
                status === 'قيد المراجعة' ||
                status === 'قيد الانتظار' ||
                status === 'open' ||
                status === 'pending' ||
                status === 'under review';
        }).length;

        const closedPTWCount = ptw.filter(p => {
            if (!p || !p.status) return false;
            const status = p.status.toLowerCase();
            return status === 'مغلق' ||
                status === 'مكتمل' ||
                status === 'منتهي' ||
                status === 'closed' ||
                status === 'completed' ||
                status === 'finished';
        }).length;

        const totalPTWCount = ptw.length;

            // تحديث العناصر الجديدة مع تنسيق الأرقام الإنجليزية
            const openPTWCountEl = document.getElementById('open-ptw-count');
            if (openPTWCountEl) {
                openPTWCountEl.textContent = this.formatNumber(openPTWCount);
                this.applyEnglishNumberFormat(openPTWCountEl);
            }

            const closedPTWCountEl = document.getElementById('closed-ptw-count');
            if (closedPTWCountEl) {
                closedPTWCountEl.textContent = this.formatNumber(closedPTWCount);
                this.applyEnglishNumberFormat(closedPTWCountEl);
            }

            const totalPTWCountEl = document.getElementById('total-ptw-count');
            if (totalPTWCountEl) {
                totalPTWCountEl.textContent = this.formatNumber(totalPTWCount);
                this.applyEnglishNumberFormat(totalPTWCountEl);
            }

            // الاحتفاظ بالتحديث القديم للتوافق مع الكود القديم
            const activePTWEl = document.getElementById('active-ptw');
            if (activePTWEl) {
                activePTWEl.textContent = this.formatNumber(openPTWCount);
                this.applyEnglishNumberFormat(activePTWEl);
            }

        // حساب معدل الامتثال بشكل أفضل
        const totalItems = incidents.length + nearmiss.length;
        const resolvedIncidents = incidents.filter(i => i && (i.status === 'مغلق' || i.status === 'محلول')).length;
        const resolvedNearMiss = nearmiss.filter(n => n && (n.correctiveProposed === false || n.status === 'مغلق' || n.status === 'محلول')).length;
        const resolvedItems = resolvedIncidents + resolvedNearMiss;
        const complianceRate = totalItems > 0 ? Math.round((resolvedItems / totalItems) * 100) : 100;
        const complianceRateEl = document.getElementById('compliance-rate');
        if (complianceRateEl) {
            complianceRateEl.textContent = `${complianceRate}%`;
            // إضافة لون حسب النسبة
            complianceRateEl.className = complianceRate >= 90 ? 'kpi-value text-green-600' :
                complianceRate >= 70 ? 'kpi-value text-yellow-600' : 'kpi-value text-red-600';
        }

        // ملاحظة: الإحصائيات الأسبوعية (week-incidents, open-ptw, completed-training) 
        // يتم تحديثها في updateStats() لتجنب التكرار

        // حساب عدد ساعات العمل
        const totalWorkHoursEl = document.getElementById('total-work-hours');
        if (totalWorkHoursEl) {
            const totalEmployees = employees.filter(e => e && e.active !== false).length || 200;
            const hoursPerDay = 8;
            const workDaysPerMonth = 22;
            const monthsPerYear = 12;
            const totalWorkHours = totalEmployees * hoursPerDay * workDaysPerMonth * monthsPerYear;

            // الحصول من الإعدادات إذا كان متاحاً
            const savedTotalHours = localStorage.getItem('hse_total_work_hours');
            const actualTotalHours = savedTotalHours ? parseFloat(savedTotalHours) : totalWorkHours;

            totalWorkHoursEl.textContent = this.formatNumber(actualTotalHours);
            this.applyEnglishNumberFormat(totalWorkHoursEl);
        }

        // حساب إجمالي الأيام منذ آخر حادث (من سجل الحوادث - الأكثر دقة)
        const daysWithoutInjuryEl = document.getElementById('days-without-injury');
        if (daysWithoutInjuryEl) {
            // استخدام سجل الحوادث للحصول على البيانات الأكثر دقة
            const registryData = (AppState.appData && AppState.appData.incidentsRegistry) || [];

            // إذا كان السجل فارغاً، نستخدم الحوادث كبديل
            let allRecords = [];
            if (registryData && registryData.length > 0) {
                // استخدام بيانات السجل
                allRecords = registryData.filter(r => r && r.incidentDate);
            } else {
                // استخدام الحوادث كبديل
                allRecords = incidents.filter(i => i && (i.incidentDate || i.date || i.createdAt));
            }

            if (allRecords.length > 0) {
                // ترتيب السجلات حسب التاريخ (الأحدث أولاً)
                const sortedRecords = allRecords.sort((a, b) => {
                    const dateA = new Date(a.incidentDate || a.date || a.createdAt);
                    const dateB = new Date(b.incidentDate || b.date || b.createdAt);
                    return dateB - dateA;
                });

                // آخر حادث من السجل
                const lastIncidentDate = new Date(sortedRecords[0].incidentDate || sortedRecords[0].date || sortedRecords[0].createdAt);
                const today = new Date();
                today.setHours(0, 0, 0, 0); // إزالة الوقت للتأكد من الحساب الصحيح
                lastIncidentDate.setHours(0, 0, 0, 0);
                const daysDiff = Math.floor((today - lastIncidentDate) / (1000 * 60 * 60 * 24));
                daysWithoutInjuryEl.textContent = daysDiff >= 0 ? this.formatNumber(daysDiff) : '0';
            } else {
                daysWithoutInjuryEl.textContent = 'N/A';
            }
            this.applyEnglishNumberFormat(daysWithoutInjuryEl);
        }

            // حساب مؤشرات السلامة (Safety Metrics) - استخدام بيانات السجل للحصول على دقة أعلى
            const registryData = Array.isArray(AppState.appData?.incidentsRegistry) ? AppState.appData.incidentsRegistry : [];
            this.calculateSafetyMetrics(incidents, employees, registryData);
            
            // تحديث قيم التقارير والإحصائيات
            this.updateReportsStatistics();
        } catch (error) {
            Utils.safeWarn('⚠️ خطأ في تحديث KPIs:', error);
        }
    },

    /**
     * حساب مؤشرات السلامة المهنية
     * LTI, TIR, FA, TRIR
     * يستخدم سجل الحوادث للحصول على دقة أعلى في الحسابات
     */
    calculateSafetyMetrics(incidents, employees, registryData = null) {
        try {
            // التحقق من صحة المدخلات
            if (!Array.isArray(incidents)) incidents = [];
            if (!Array.isArray(employees)) employees = [];
            if (!Array.isArray(registryData)) registryData = [];

            // إجمالي ساعات العمل (يمكن تحديثه من الإعدادات)
            // افتراضياً: 200 موظف × 8 ساعات × 22 يوم عمل × 12 شهر = 4,224,000 ساعة سنوياً
            // أو يمكن حسابها بناءً على عدد الموظفين العلي
            const totalEmployees = employees.filter(e => e && e.active !== false).length || 200;
            const hoursPerDay = 8;
            const workDaysPerMonth = 22;
            const monthsPerYear = 12;
            const totalWorkHours = totalEmployees * hoursPerDay * workDaysPerMonth * monthsPerYear;

            // الحصول من الإعدادات إذا كان متاحاً
            const savedTotalHours = localStorage.getItem('hse_total_work_hours');
            const actualTotalHours = savedTotalHours ? parseFloat(savedTotalHours) : totalWorkHours;
            
            if (isNaN(actualTotalHours) || actualTotalHours <= 0) {
                Utils.safeWarn('⚠️ إجمالي ساعات العمل غير صحيح:', actualTotalHours);
                return;
            }

        // حساب LTI (Lost Time Injury) - الحوادث التي تسببت في فقدان وقت العمل
        // نستخدم بيانات السجل للحصول على دقة أعلى في تحديد الحوادث التي تسببت في إجازة
        let ltiIncidents = 0;
        if (registryData && registryData.length > 0) {
            // استخدام بيانات السجل - الحوادث التي لها أيام إجازة > 0
            ltiIncidents = registryData.filter(entry =>
                entry && entry.totalLeaveDays && parseFloat(entry.totalLeaveDays) > 0
            ).length;
        } else {
            // استخدام بيانات الحوادث كبديل
            ltiIncidents = incidents.filter(i => i && (
                i.severity === 'عالية' ||
                i.severity === 'حرجة' ||
                i.severity === 'high' ||
                i.severity === 'critical' ||
                i.lostTime === true ||
                i.lostTimeDays > 0
            )).length;
        }

        // حساب TIR (Total Injury Rate) - معدل الإصابات الإجمالي
        // TIR = (عدد الحوادث / إجمالي الموظيفن) × 100
        // نستخدم عدد سجلات السجل إذا كان متوفراً
        const totalIncidentsCount = (registryData && registryData.length > 0)
            ? registryData.length
            : incidents.length;
        const tir = totalEmployees > 0 ? ((totalIncidentsCount / totalEmployees) * 100).toFixed(2) : '0.00';

        // حساب FA (Frequency Rate) - معدل التكرار
        // FA = (عدد الحوادث × 1,000,000) / إجمالي ساعات العمل
        const fa = actualTotalHours > 0 ? ((totalIncidentsCount * 1000000) / actualTotalHours).toFixed(2) : '0.00';

        // حساب TRIR (Total Recordable Injury Rate) - معدل الإصابات القابلة للتسجيل
        // TRIR = (عدد الإصابات القابلة للتسجيل × 200,000) / إجمالي ساعات العمل
        // نعتبر جميع الحوادث المسجلة في السجل هي قابلة للتسجيل
        const recordableInjuries = totalIncidentsCount;
        const trir = actualTotalHours > 0 ? ((recordableInjuries * 200000) / actualTotalHours).toFixed(2) : '0.00';

            // تحديث القيم في الواجهة مع التحقق من وجود العناصر وتطبيق تنسيق الأرقام الإنجليزية
            const ltiEl = document.getElementById('lti-value');
            if (ltiEl) {
                ltiEl.textContent = this.formatNumber(ltiIncidents);
                this.applyEnglishNumberFormat(ltiEl);
            }

            const tirEl = document.getElementById('tir-value');
            if (tirEl) {
                tirEl.textContent = this.formatNumber(parseFloat(tir));
                this.applyEnglishNumberFormat(tirEl);
            }

            const faEl = document.getElementById('fa-value');
            if (faEl) {
                faEl.textContent = this.formatNumber(parseFloat(fa));
                this.applyEnglishNumberFormat(faEl);
            }

            const trirEl = document.getElementById('trir-value');
            if (trirEl) {
                trirEl.textContent = this.formatNumber(parseFloat(trir));
                this.applyEnglishNumberFormat(trirEl);
            }

            Utils.safeLog('📊 مؤشرات السلامة:', {
                LTI: ltiIncidents,
                TIR: tir,
                FA: fa,
                TRIR: trir,
                totalWorkHours: actualTotalHours,
                totalEmployees: totalEmployees,
                totalIncidents: totalIncidentsCount,
                usingRegistry: (registryData && registryData.length > 0)
            });
        } catch (error) {
            Utils.safeWarn('⚠️ خطأ في حساب مؤشرات السلامة:', error);
        }
    },

    /**
     * تحديث بيانات الحوادث في Dashboard
     * يتم استدعاؤها عند إضافة/تحديث/حذف حادث
     */
    refreshIncidents() {
        this.updateKPIs();
    },

    /**
     * تحميل الأنشطة الأخيرة
     */
    loadRecentActivities() {
        const container = document.getElementById('recent-activities');
        if (!container) return;

        try {
            // التحقق من وجود AppState
            if (!AppState || !AppState.appData) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle text-4xl text-yellow-500 mb-4"></i>
                        <p class="text-yellow-600">جاري تحميل البيانات...</p>
                    </div>
                `;
                return;
            }

            const activities = [];

            // جمع الأنشطة من جميع المصادر
            const incidents = Array.isArray(AppState.appData.incidents) ? AppState.appData.incidents : [];
            incidents.forEach(incident => {
                if (!incident) return;

                try {
                    // الحصول على تاريخ الحادث (createdAt أو date)
                    const incidentDate = incident.createdAt || incident.date;
                    if (!incidentDate) return; // تخطي الحوادث بدون تاريخ

                    // التحقق من صحة التاريخ
                    const dateObj = new Date(incidentDate);
                    if (isNaN(dateObj.getTime())) return; // تخطي التواريخ غير الصحيحة

                    // الحصول على نوع أو عنوان الحادث
                    const incidentType = incident.incidentType || incident.title || incident.type || 'حادث';

                    activities.push({
                        type: 'incident',
                        title: `تم تسجيل حادث: ${incidentType}`,
                        date: dateObj, // حفظ التاريخ الفعلي للترتيب
                        time: this.getTimeAgo(incidentDate),
                        icon: 'fa-exclamation-triangle',
                        color: 'text-red-500'
                    });
                } catch (e) {
                    // تجاهل الأخطاء في معالجة حادث واحد والمتابعة
                    Utils.safeWarn('⚠️ خطأ في معالجة حادث:', e);
                }
            });

            // ترتيب الأنشطة حسب التاريخ الفعلي (الأحدث أولاً)
            activities.sort((a, b) => {
                if (!a.date || !b.date) return 0;
                return b.date - a.date;
            });

            if (activities.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-inbox text-4xl text-gray-300 mb-4"></i>
                        <p class="text-gray-500">لا توجد أنشطة حديثة</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = activities.slice(0, 5).map(activity => `
                <div class="activity-item">
                    <div class="activity-icon ${activity.color} bg-gray-100">
                        <i class="fas ${activity.icon}"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-title">${activity.title}</div>
                        <div class="activity-time">${activity.time}</div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            Utils.safeWarn('⚠️ خطأ في تحميل الأنشطة الأخيرة:', error);
            if (container) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
                        <p class="text-red-600">حدث خطأ في تحميل الأنشطة</p>
                    </div>
                `;
            }
        }
    },

    /**
     * تحميل مهام المستخدم في لوحة التحكم
     */
    async loadUserTasksWidget() {
        const container = document.getElementById('user-tasks-widget');
        if (!container) return;

        // الحصول على المستخدم الحالي
        const currentUser = AppState.currentUser;
        if (!currentUser) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-user-slash text-4xl text-gray-300 mb-4"></i>
                    <p class="text-gray-500">لم يتم تسجيل الدخول</p>
                </div>
            `;
            return;
        }

        // عرض حالة التحميل
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-spinner fa-spin text-4xl text-gray-300 mb-4"></i>
                <p class="text-gray-500">جاري تحميل المهام...</p>
            </div>
        `;

        try {
            // التحقق من توفر AppState
            if (typeof AppState === 'undefined' || !AppState.appData) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-exclamation-triangle text-4xl text-yellow-500 mb-4"></i>
                        <p class="text-yellow-600">جاري تحميل البيانات...</p>
                    </div>
                `;
                return;
            }

            // الحصول على معرف المستخدم
            const userId = currentUser.id || currentUser.email;

            // جلب المهام من Backend API
            let userTasks = [];

            if (typeof GoogleIntegration !== 'undefined' && GoogleIntegration.sendToAppsScript) {
                try {
                    const response = await GoogleIntegration.sendToAppsScript('getUserTasksByUserId', {
                        userId: userId
                    });

                    if (response && response.success && response.data) {
                        userTasks = Array.isArray(response.data) ? response.data : [];
                    }
                } catch (apiError) {
                    // تجاهل أخطاء Circuit Breaker و Google Apps Script غير المفعل
                    const errorMsg = String(apiError?.message || '').toLowerCase();
                    if (!errorMsg.includes('circuit breaker') &&
                        !errorMsg.includes('google apps script غير مفعل') &&
                        !errorMsg.includes('غير مفعل')) {
                        // تسجيل الأخطاء الأخرى فقط
                        Utils.safeWarn('⚠️ خطأ في جلب المهام من API:', apiError);
                    }
                    // المتابعة باستخدام البيانات المحلية
                }
            }

            // إذا فشل جلب البيانات من Backend، نستخدم البيانات المحلية كبديل
            if (userTasks.length === 0) {
                const allTasks = AppState.appData.userTasks || [];
                const userId = currentUser.id || currentUser.email;

                // تصفية المهام الخاصة بالمستخدم الحالي
                userTasks = allTasks.filter(task => {
                    const taskUserId = task.userId || task.assignedTo || task.assignedUserId;
                    return taskUserId === userId || taskUserId === currentUser.email;
                });
            }

            // ترتيب المهام حسب الأولوية والتاريخ
            userTasks.sort((a, b) => {
                // أولاً: المهام غير المكتملة أولاً
                if (a.status !== 'مكتمل' && b.status === 'مكتمل') return -1;
                if (a.status === 'مكتمل' && b.status !== 'مكتمل') return 1;

                // ثانياً: حسب الأولوية
                const priorityOrder = { 'عالية': 3, 'متوسطة': 2, 'منخفضة': 1 };
                const aPriority = priorityOrder[a.priority] || 0;
                const bPriority = priorityOrder[b.priority] || 0;
                if (aPriority !== bPriority) return bPriority - aPriority;

                // ثالثاً: حسب تاريخ الاستحقاق
                if (a.dueDate && b.dueDate) {
                    return new Date(a.dueDate) - new Date(b.dueDate);
                }
                if (a.dueDate) return -1;
                if (b.dueDate) return 1;

                // رابعاً: حسب تاريخ الإنشاء
                if (a.createdAt && b.createdAt) {
                    return new Date(b.createdAt) - new Date(a.createdAt);
                }
                return 0;
            });

            // عرض أول 5 مهام
            const tasksToShow = userTasks.slice(0, 5);

            if (tasksToShow.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-tasks text-4xl text-gray-300 mb-4"></i>
                        <p class="text-gray-500">لا توجد مهام</p>
                    </div>
                `;
                return;
            }

            // تحديد الألوان والأيقونات حسب الحالة
            const getTaskStatusInfo = (status) => {
                switch (status) {
                    case 'مكتمل':
                    case 'مكتملة':
                    case 'completed':
                        return { icon: 'fa-check-circle', color: 'text-green-500', bgColor: 'bg-green-100' };
                    case 'قيد التنفيذ':
                    case 'في العمل':
                    case 'in-progress':
                        return { icon: 'fa-spinner', color: 'text-blue-500', bgColor: 'bg-blue-100' };
                    case 'معلقة':
                    case 'pending':
                        return { icon: 'fa-pause-circle', color: 'text-yellow-500', bgColor: 'bg-yellow-100' };
                    case 'ملغاة':
                    case 'cancelled':
                        return { icon: 'fa-times-circle', color: 'text-red-500', bgColor: 'bg-red-100' };
                    default:
                        return { icon: 'fa-circle', color: 'text-gray-500', bgColor: 'bg-gray-100' };
                }
            };

            // تحديد لون الأولوية
            const getPriorityColor = (priority) => {
                switch (priority) {
                    case 'عالية':
                    case 'high':
                        return 'text-red-600';
                    case 'متوسطة':
                    case 'medium':
                        return 'text-yellow-600';
                    case 'منخفضة':
                    case 'low':
                        return 'text-green-600';
                    default:
                        return 'text-gray-600';
                }
            };

            container.innerHTML = tasksToShow.map(task => {
                const statusInfo = getTaskStatusInfo(task.status);
                const priorityColor = getPriorityColor(task.priority);
                const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                const isOverdue = dueDate && dueDate < new Date() && task.status !== 'مكتمل' && task.status !== 'مكتملة';

                // حساب الوقت المتبقي
                let timeInfo = '';
                if (dueDate) {
                    const now = new Date();
                    const diff = dueDate - now;
                    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

                    if (isOverdue) {
                        timeInfo = `<span class="text-red-600 font-semibold">متأخرة ${Math.abs(days)} يوم</span>`;
                    } else if (days === 0) {
                        timeInfo = '<span class="text-orange-600 font-semibold">اليوم</span>';
                    } else if (days === 1) {
                        timeInfo = '<span class="text-yellow-600 font-semibold">غداً</span>';
                    } else if (days <= 7) {
                        timeInfo = `<span class="text-gray-600">خلال ${days} أيام</span>`;
                    } else {
                        timeInfo = `<span class="text-gray-500">${days} يوم متبقي</span>`;
                    }
                }

                return `
                    <div class="activity-item ${isOverdue ? 'border-r-4 border-red-500' : ''}" style="cursor: pointer;" onclick="UI.showSection('user-tasks')">
                        <div class="activity-icon ${statusInfo.color} ${statusInfo.bgColor}">
                            <i class="fas ${statusInfo.icon}"></i>
                        </div>
                        <div class="activity-content" style="flex: 1;">
                            <div class="activity-title" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                <span>${Utils.escapeHTML(task.title || task.taskTitle || 'مهمة بدون عنوان')}</span>
                                ${task.priority ? `<span class="text-xs px-2 py-1 rounded ${priorityColor} bg-gray-100">${Utils.escapeHTML(task.priority)}</span>` : ''}
                            </div>
                            <div class="activity-time" style="display: flex; flex-direction: column; gap: 4px; margin-top: 4px;">
                                ${task.status ? `<span class="text-xs ${statusInfo.color}">${Utils.escapeHTML(task.status)}</span>` : ''}
                                ${timeInfo ? `<span class="text-xs">${timeInfo}</span>` : ''}
                                ${task.description ? `<span class="text-xs text-gray-500 truncate" style="max-width: 300px;">${Utils.escapeHTML(task.description)}</span>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            // إضافة رابط لعرض جميع المهام
            if (userTasks.length > 5) {
                container.innerHTML += `
                    <div class="mt-4 pt-4 border-t text-center">
                        <a href="#user-tasks" class="text-sm text-blue-600 hover:text-blue-800" style="text-decoration: none;">
                            عرض جميع المهام (${userTasks.length}) <i class="fas fa-arrow-left mr-1"></i>
                        </a>
                    </div>
                `;
            }
        } catch (error) {
            Utils.safeError('خطأ في تحميل مهام المستخدم:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle text-4xl text-gray-300 mb-4"></i>
                    <p class="text-gray-500">حدث خطأ أثناء تحميل المهام</p>
                    <p class="text-xs text-gray-400 mt-2">يرجى المحاولة مرة أخرى</p>
                </div>
            `;
        }
    },

    /**
     * تحديث الإحصائيات السريعة (Quick Stats)
     */
    updateStats() {
        const data = AppState.appData;
        if (!data) return;

        try {
            const now = new Date();
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            const incidents = Array.isArray(data.incidents) ? data.incidents : [];
            const ptw = Array.isArray(data.ptw) ? data.ptw : [];
            const training = Array.isArray(data.training) ? data.training : [];

            // حساب الإحصائيات الأسبوعية مع معالجة الأخطاء
            const weekIncidents = incidents.filter(i => {
                if (!i || !i.createdAt) return false;
                try {
                    const incidentDate = new Date(i.createdAt);
                    return !isNaN(incidentDate.getTime()) && incidentDate > weekAgo;
                } catch (e) {
                    return false;
                }
            }).length;

            const openPTW = ptw.filter(p => {
                if (!p || !p.status) return false;
                const status = String(p.status).toLowerCase();
                return status === 'قيد المراجعة' || status === 'مفتوح' || status === 'open' || status === 'pending';
            }).length;

            const completedTraining = training.filter(t => {
                if (!t || !t.status) return false;
                const status = String(t.status).toLowerCase();
                return status === 'مكتمل' || status === 'منتهي' || status === 'completed' || status === 'finished';
            }).length;

            // تحديث العناصر مع التحقق من وجودها وتطبيق تنسيق الأرقام الإنجليزية
            const weekIncidentsEl = document.getElementById('week-incidents');
            const openPTWEl = document.getElementById('open-ptw');
            const completedTrainingEl = document.getElementById('completed-training');
            const daysWithoutIncidentEl = document.getElementById('days-without-incident');

            // تحديث الأرقام مع تنسيق إنجليزي
            if (weekIncidentsEl) {
                weekIncidentsEl.textContent = this.formatNumber(weekIncidents);
                this.applyEnglishNumberFormat(weekIncidentsEl);
            }
            if (openPTWEl) {
                openPTWEl.textContent = this.formatNumber(openPTW);
                this.applyEnglishNumberFormat(openPTWEl);
            }
            if (completedTrainingEl) {
                completedTrainingEl.textContent = this.formatNumber(completedTraining);
                this.applyEnglishNumberFormat(completedTrainingEl);
            }
            
            // تحديث أيام بدون حوادث
            if (daysWithoutIncidentEl) {
                const incidents = Array.isArray(data.incidents) ? data.incidents : [];
                const registryData = Array.isArray(data.incidentsRegistry) ? data.incidentsRegistry : [];
                const allIncidents = registryData.length > 0 ? registryData : incidents;
                
                if (allIncidents.length > 0) {
                    const sortedIncidents = allIncidents
                        .filter(i => i && (i.incidentDate || i.date || i.createdAt))
                        .map(i => new Date(i.incidentDate || i.date || i.createdAt))
                        .filter(d => !isNaN(d.getTime()))
                        .sort((a, b) => b - a);
                    
                    if (sortedIncidents.length > 0) {
                        const lastIncidentDate = sortedIncidents[0];
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        lastIncidentDate.setHours(0, 0, 0, 0);
                        const daysDiff = Math.floor((today - lastIncidentDate) / (1000 * 60 * 60 * 24));
                        daysWithoutIncidentEl.textContent = daysDiff >= 0 ? this.formatNumber(daysDiff) : '0';
                    } else {
                        daysWithoutIncidentEl.textContent = '0';
                    }
                } else {
                    daysWithoutIncidentEl.textContent = '0';
                }
                this.applyEnglishNumberFormat(daysWithoutIncidentEl);
            }
        } catch (error) {
            Utils.safeWarn('⚠️ خطأ في تحديث الإحصائيات السريعة:', error);
        }
    },

    /**
     * تحديث قيم التقارير والإحصائيات مع دعم اللغة العربية والإنجليزية
     */
    updateReportsStatistics() {
        const data = AppState.appData;
        if (!data) return;

        try {
            // حساب إجمالي التقارير - التحقق من وجود البيانات
            const incidents = Array.isArray(data.incidents) ? data.incidents : [];
            const nearmiss = Array.isArray(data.nearmiss) ? data.nearmiss : [];
            const inspections = Array.isArray(data.inspections) ? data.inspections : [];
            const training = Array.isArray(data.training) ? data.training : [];
            const violations = Array.isArray(data.violations) ? data.violations : [];
            const ptw = Array.isArray(data.ptw) ? data.ptw : [];
            const audits = Array.isArray(data.audits) ? data.audits : [];

            // حساب إجمالي التقارير (جميع أنواع التقارير)
            const totalReports = incidents.length + nearmiss.length + inspections.length + 
                               training.length + violations.length + ptw.length + audits.length;

            // تحديث القيم مع تنسيق الأرقام الإنجليزية والتحقق من الأخطاء
            this.updateReportValue('total-reports-value', totalReports);
            this.updateReportValue('incident-reports-value', incidents.length);
            this.updateReportValue('nearmiss-reports-value', nearmiss.length);
            this.updateReportValue('inspections-reports-value', inspections.length);
            this.updateReportValue('training-sessions-value', training.length);
            this.updateReportValue('violations-value', violations.length);
            this.updateReportValue('ptw-reports-value', ptw.length);
            this.updateReportValue('audits-value', audits.length);

            // حساب استهلاك الموارد (الكهرباء، الماء، الغاز)
            const resourceConsumption = data.resourceConsumption || {};
            const electricityData = Array.isArray(resourceConsumption.electricity) ? resourceConsumption.electricity : [];
            const waterData = Array.isArray(resourceConsumption.water) ? resourceConsumption.water : [];
            const gasData = Array.isArray(resourceConsumption.gas) ? resourceConsumption.gas : [];

            // حساب إجمالي الاستهلاك لكل نوع
            const electricityTotal = electricityData.reduce((sum, record) => {
                return sum + (parseFloat(record.totalConsumption) || 0);
            }, 0);

            const waterTotal = waterData.reduce((sum, record) => {
                return sum + (parseFloat(record.totalConsumption) || 0);
            }, 0);

            const gasTotal = gasData.reduce((sum, record) => {
                return sum + (parseFloat(record.totalConsumption) || 0);
            }, 0);

            // تحديث قيم الاستهلاك (مع تنسيق الأرقام العشرية)
            this.updateConsumptionValue('electricity-consumption-value', electricityTotal);
            this.updateConsumptionValue('water-consumption-value', waterTotal);
            this.updateConsumptionValue('gas-consumption-value', gasTotal);

            // إعداد معالجات النقر على كروت التقارير والإحصائيات
            this.setupReportsStatisticsCardsClickHandlers();
        } catch (error) {
            Utils.safeWarn('⚠️ خطأ في تحديث التقارير والإحصائيات:', error);
        }
    },

    /**
     * تحديث قيمة تقرير مع تنسيق الأرقام
     */
    updateReportValue(elementId, value) {
        if (!elementId) return;
        
        const element = document.getElementById(elementId);
        if (!element) {
            // تسجيل تحذير فقط في وضع التطوير
            if (typeof Utils !== 'undefined' && Utils.safeWarn) {
                Utils.safeWarn(`⚠️ العنصر ${elementId} غير موجود في DOM`);
            }
            return;
        }

        try {
            // استخدام تنسيق الأرقام الإنجليزية دائماً
            const formattedValue = this.formatNumber(value);
            element.textContent = formattedValue;
            
            // إضافة جميع الخصائص اللازمة لضمان عرض الأرقام بالإنجليزية بشكل صحيح
            element.setAttribute('dir', 'ltr');
            element.style.direction = 'ltr';
            element.style.textAlign = 'left';
            element.style.unicodeBidi = 'embed';
            element.style.fontVariantNumeric = 'tabular-nums';
            element.style.fontFeatureSettings = '"tnum"';
            
            // إضافة class إضافي لضمان التطبيق الصحيح للـ CSS
            element.classList.add('english-number');
        } catch (error) {
            Utils.safeWarn(`⚠️ خطأ في تحديث ${elementId}:`, error);
        }
    },

    /**
     * تحديث قيمة استهلاك مع تنسيق الأرقام العشرية
     */
    updateConsumptionValue(elementId, value) {
        if (!elementId) return;
        
        const element = document.getElementById(elementId);
        if (!element) {
            if (typeof Utils !== 'undefined' && Utils.safeWarn) {
                Utils.safeWarn(`⚠️ العنصر ${elementId} غير موجود في DOM`);
            }
            return;
        }

        try {
            // تنسيق الأرقام مع منزلتين عشريتين
            const numValue = Number(value);
            const formattedValue = isNaN(numValue) || !isFinite(numValue) 
                ? '0.00' 
                : numValue.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                    useGrouping: true
                });
            
            element.textContent = formattedValue;
            
            // إضافة جميع الخصائص اللازمة لضمان عرض الأرقام بالإنجليزية بشكل صحيح
            element.setAttribute('dir', 'ltr');
            element.style.direction = 'ltr';
            element.style.textAlign = 'left';
            element.style.unicodeBidi = 'embed';
            element.style.fontVariantNumeric = 'tabular-nums';
            element.style.fontFeatureSettings = '"tnum"';
            element.classList.add('english-number');
        } catch (error) {
            Utils.safeWarn(`⚠️ خطأ في تحديث ${elementId}:`, error);
        }
    },

    /**
     * تنسيق الأرقام بالإنجليزية مع دعم الفواصل
     */
    formatNumber(number) {
        // التحقق من القيم الفارغة أو غير الصالحة
        if (number === null || number === undefined) {
            return '0';
        }
        
        // التحقق من أن القيمة رقمية
        const numValue = Number(number);
        if (isNaN(numValue) || !isFinite(numValue)) {
            return '0';
        }
        
        // استخدام تنسيق الأرقام الإنجليزية مع الفواصل
        // استخدام options لضمان التنسيق الصحيح
        return numValue.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
            useGrouping: true
        });
    },

    /**
     * تطبيق تنسيق الأرقام الإنجليزية على عنصر DOM
     */
    applyEnglishNumberFormat(element) {
        if (!element) return;
        
        try {
            // إضافة class للعنصر لضمان عرض الأرقام بالإنجليزية
            element.classList.add('english-number');
            element.setAttribute('dir', 'ltr');
            element.style.direction = 'ltr';
            element.style.textAlign = 'left';
            element.style.fontVariantNumeric = 'tabular-nums';
        } catch (error) {
            // تجاهل الأخطاء في حالة عدم وجود العنصر
            Utils.safeWarn('⚠️ خطأ في تطبيق تنسيق الأرقام الإنجليزية:', error);
        }
    },

    /**
     * حساب الوقت المنقضي
     */
    getTimeAgo(date) {
        if (!date) return 'تاريخ غير محدد';

        const now = new Date();
        const past = new Date(date);

        // التحقق من صحة التاريخ
        if (isNaN(past.getTime())) return 'تاريخ غير صحيح';

        const diff = now - past;

        // إذا كان التاريخ في المستقبل، إرجاع رسالة مناسبة
        if (diff < 0) return 'في المستقبل';

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (minutes < 1) return 'الآن';
        if (minutes < 60) return `منذ ${minutes} دقيقة`;
        if (hours < 24) return `منذ ${hours} ساعة`;
        return `منذ ${days} يوم`;
    },

    /**
     * تحميل الرسوم البيانية التفاعلية
     */
    loadCharts() {
        const container = document.getElementById('dashboard-charts');
        if (!container) {
            // إنشاء قسم الرسوم البيانية إذا لم يكن موجوداً
            const dashboardSection = document.getElementById('dashboard-section');
            if (dashboardSection) {
                const chartsDiv = document.createElement('div');
                chartsDiv.id = 'dashboard-charts';
                chartsDiv.className = 'mt-6';
                dashboardSection.appendChild(chartsDiv);
            } else {
                return;
            }
        }

        const data = AppState.appData;
        const now = new Date();
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // بيانات الرسوم البيانية
        const incidentsData = (data.incidents || []).filter(i => new Date(i.createdAt || i.date) >= last30Days);
        const ptwData = (data.ptw || []).filter(p => new Date(p.createdAt || p.startDate) >= last30Days);
        const trainingData = (data.training || []).filter(t => new Date(t.createdAt || t.startDate) >= last30Days);

        // تجميع البيانات حسب التاريخ
        const incidentsByDate = {};
        const ptwByDate = {};
        const trainingByDate = {};

        incidentsData.forEach(i => {
            const date = new Date(i.createdAt || i.date).toLocaleDateString('ar-SA');
            incidentsByDate[date] = (incidentsByDate[date] || 0) + 1;
        });

        ptwData.forEach(p => {
            const date = new Date(p.createdAt || p.startDate).toLocaleDateString('ar-SA');
            ptwByDate[date] = (ptwByDate[date] || 0) + 1;
        });

        trainingData.forEach(t => {
            const date = new Date(t.createdAt || t.startDate).toLocaleDateString('ar-SA');
            trainingByDate[date] = (trainingByDate[date] || 0) + 1;
        });

        const chartsHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div class="content-card">
                    <div class="card-header">
                        <h2 class="card-title">
                            <i class="fas fa-chart-line ml-2"></i>
                            الحوادث - آخر 30 يوم
                        </h2>
                    </div>
                    <div class="card-body">
                        <div class="chart-container" style="height: 250px; position: relative;">
                            <canvas id="incidents-chart"></canvas>
                        </div>
                    </div>
                </div>
                <div class="content-card">
                    <div class="card-header">
                        <h2 class="card-title">
                            <i class="fas fa-chart-pie ml-2"></i>
                            توزيع الحوادث حسب الخطورة
                        </h2>
                    </div>
                    <div class="card-body">
                        <div class="chart-container" style="height: 250px; position: relative;">
                            ${this.renderSeverityChart(data.incidents || [])}
                        </div>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="content-card">
                    <div class="card-header">
                        <h2 class="card-title">
                            <i class="fas fa-chart-bar ml-2"></i>
                            تصاريح العمل - آخر 30 يوم
                        </h2>
                    </div>
                    <div class="card-body">
                        <div class="chart-container" style="height: 250px; position: relative;">
                            ${this.renderBarChart(ptwByDate, 'تصاريح العمل')}
                        </div>
                    </div>
                </div>
                <div class="content-card">
                    <div class="card-header">
                        <h2 class="card-title">
                            <i class="fas fa-chart-area ml-2"></i>
                            التدريب - آخر 30 يوم
                        </h2>
                    </div>
                    <div class="card-body">
                        <div class="chart-container" style="height: 250px; position: relative;">
                            ${this.renderBarChart(trainingByDate, 'برامج التدريب')}
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = chartsHTML;

        // إنشاء رسم بياني تاعلي بسيط باستخدام CSS
        setTimeout(() => {
            this.renderSimpleCharts();
        }, 100);
    },

    renderSeverityChart(incidents) {
        const severityCount = {
            'عالي': 0,
            'متوسط': 0,
            'منخفض': 0
        };

        incidents.forEach(i => {
            const severity = i.severity || '';
            if (severity.includes('عالي') || severity.includes('عالية') || severity.includes('عالية جداً')) {
                severityCount['عالي']++;
            } else if (severity.includes('متوسط') || severity.includes('متوسطة')) {
                severityCount['متوسط']++;
            } else {
                severityCount['منخفض']++;
            }
        });

        const total = severityCount['عالي'] + severityCount['متوسط'] + severityCount['منخض'];
        if (total === 0) {
            return '<div class="empty-state"><p class="text-gray-500">لا توجد بيانات</p></div>';
        }

        const highPercent = (severityCount['عالي'] / total) * 100;
        const mediumPercent = (severityCount['متوسط'] / total) * 100;
        const lowPercent = (severityCount['منخفض'] / total) * 100;

        return `
            <div class="flex flex-col gap-4">
                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-sm font-semibold">عالي</span>
                        <span class="text-sm font-bold text-red-600">${severityCount['عالي']}</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-4">
                        <div class="bg-red-600 h-4 rounded-full transition-all duration-500" style="width: ${highPercent}%"></div>
                    </div>
                </div>
                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-sm font-semibold">متوسط</span>
                        <span class="text-sm font-bold text-yellow-600">${severityCount['متوسط']}</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-4">
                        <div class="bg-yellow-600 h-4 rounded-full transition-all duration-500" style="width: ${mediumPercent}%"></div>
                    </div>
                </div>
                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-sm font-semibold">منخفض</span>
                        <span class="text-sm font-bold text-green-600">${severityCount['منخفض']}</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-4">
                        <div class="bg-green-600 h-4 rounded-full transition-all duration-500" style="width: ${lowPercent}%"></div>
                    </div>
                </div>
            </div>
        `;
    },

    renderBarChart(dataByDate, title) {
        const dates = Object.keys(dataByDate).sort();
        if (dates.length === 0) {
            return '<div class="empty-state"><p class="text-gray-500">لا توجد بيانات</p></div>';
        }

        const maxValue = Math.max(...Object.values(dataByDate), 1);

        return `
            <div class="space-y-2" style="height: 100%; display: flex; flex-direction: column; justify-content: flex-end;">
                ${dates.slice(-7).map(date => {
            const value = dataByDate[date] || 0;
            const percent = (value / maxValue) * 100;
            return `
                        <div class="flex items-end gap-2" style="height: 100%;">
                            <div class="flex-1 bg-gray-200 rounded-t" style="position: relative; height: 100%;">
                                <div class="bg-blue-500 rounded-t transition-all duration-500 hover:bg-blue-600" style="width: 100%; height: ${percent}%; position: absolute; bottom: 0;" title="${date}: ${value}"></div>
                            </div>
                            <span class="text-xs text-gray-600" style="writing-mode: vertical-rl; text-orientation: mixed;">${date.substring(0, 5)}</span>
                        </div>
                    `;
        }).join('')}
            </div>
        `;
    },

    renderSimpleCharts() {
        // يمكن إضافة مكتبة Chart.js هنا لرسوم بيانية أكثر تفصيلاً
        Utils.safeLog('الرسوم البيانية جاهزة');
    },

    /**
     * تحديث بيانات الحوادث في Dashboard
     * يتم استدعاؤها عند إضافة/تحديث/حذف حادث
     */
    refreshIncidents() {
        // تحديث KPIs التي تعتمد على بيانات الحوادث والسجل
        this.updateKPIs();
    }
};
// تصدير Dashboard للتوافق مع الكود القديم
if (typeof window !== "undefined") {
    window.Dashboard = window.Dashboard || Dashboard;
}
