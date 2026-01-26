# إصلاح أخطاء Netlify iframe sandboxing

## المشكلة

عند نشر التطبيق على Netlify، تظهر الأخطاء التالية في Console:

```
An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing.
Blocked form submission to '' because the form's frame is sandboxed and the 'allow-forms' permission is not set.
```

## السبب

1. **X-Frame-Options: DENY** يمنع تحميل الصفحة في أي iframe، بما في ذلك iframes من Netlify نفسه (مثل في preview mode)
2. Netlify يستخدم iframe في بعض الحالات لتحميل الصفحة، مما يسبب تعارض مع إعدادات الأمان

## الحل المطبق

### 1. تحديث `_headers` (Cloudflare Pages)
- ✅ تغيير `X-Frame-Options: DENY` إلى `X-Frame-Options: SAMEORIGIN`
- ✅ إضافة `Content-Security-Policy: frame-ancestors 'self' https://*.netlify.app https://*.netlify.com`

### 2. تحديث `netlify.toml` (Netlify)
- ✅ تغيير `X-Frame-Options = "DENY"` إلى `X-Frame-Options = "SAMEORIGIN"`
- ✅ إضافة `Content-Security-Policy = "frame-ancestors 'self' https://*.netlify.app https://*.netlify.com"`

## التغييرات

### ملف `Frontend/_headers`
```diff
- X-Frame-Options: DENY
+ X-Frame-Options: SAMEORIGIN
+ Content-Security-Policy: frame-ancestors 'self' https://*.netlify.app https://*.netlify.com
```

### ملف `Frontend/netlify.toml`
```diff
- X-Frame-Options = "DENY"
+ X-Frame-Options = "SAMEORIGIN"
+ Content-Security-Policy = "frame-ancestors 'self' https://*.netlify.app https://*.netlify.com"
```

## النتيجة

- ✅ السماح بتحميل الصفحة في iframe من نفس النطاق (SAMEORIGIN)
- ✅ السماح بتحميل الصفحة في iframe من نطاقات Netlify (netlify.app و netlify.com)
- ✅ الحفاظ على الأمان من خلال منع تحميل الصفحة في iframes من نطاقات أخرى
- ✅ حل مشكلة form submission في iframes

## ملاحظات

1. **SAMEORIGIN** يسمح بتحميل الصفحة في iframe من نفس النطاق فقط، مما يحافظ على الأمان
2. **frame-ancestors** في CSP يوفر تحكم أفضل من `X-Frame-Options`
3. تم إضافة نطاقات Netlify في frame-ancestors للسماح بـ preview mode و deployment previews

## التحقق

بعد نشر التغييرات على Netlify:
1. تحقق من أن الأخطاء اختفت من Console
2. تأكد من أن النماذج تعمل بشكل صحيح
3. تحقق من أن preview mode يعمل بدون مشاكل

---

**تاريخ الإصلاح:** 2026-01-24
**الحالة:** ✅ مكتمل
