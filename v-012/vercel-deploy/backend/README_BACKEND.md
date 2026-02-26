# الخلفية (Backend) — Google Apps Script

هذا المجلد يحتوي على كود **الخلفية** للتطبيق. الخلفية مبنية على **Google Apps Script** ولا تُنشر على Vercel.

## الاستخدام

- انسخ جميع ملفات `.gs` وملف `appsscript.json` إلى مشروع جديد في [script.google.com](https://script.google.com).
- عدّل `Config.gs` (معرف جدول Google Sheets إن لزم).
- انشر المشروع كـ **تطبيق ويب** (Deploy → New deployment) وانسخ رابط `/exec`.
- استخدم هذا الرابط في إعدادات الواجهة المنشورة على Vercel.

التفاصيل الكاملة في **[../README.md](../README.md)** ضمن "الجزء الأول: نشر الخلفية".
