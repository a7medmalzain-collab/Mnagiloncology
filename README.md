# مركز المناقل لعلاج الأورام

موقع ولوحة تحكم عربية (RTL) على Netlify: واجهة ثابتة + Netlify Functions + Netlify Blobs (تخزين مجاني).

## الهيكل
index.html · css/ · js/ · admin/ (لوحة التحكم) · assets/logo.jpg · netlify/functions/api.mjs · database/schema.sql (مرجع للانتقال لـ PostgreSQL لاحقًا)

## المتغيرات المطلوبة في Netlify (Site configuration > Environment variables)
- `ADMIN_PASSWORD`: كلمة مرور لوحة التحكم (قوية)
- `JWT_SECRET`: نص عشوائي طويل (32 حرفًا فأكثر)

## التشغيل محليًا
npm i -g netlify-cli && npm i && cp .env.example .env && netlify dev

## النشر
1. ارفع المشروع إلى مستودع GitHub.
2. Netlify: Add new site > Import an existing project > GitHub > اختر المستودع (الإعدادات تُقرأ من netlify.toml).
3. أضف المتغيرين أعلاه ثم Deploy. لوحة التحكم: `/admin/`

## ملاحظات
- لا جرعات ولا بروتوكولات مضمّنة؛ أدخلها من اللوحة من بيانات المركز المعتمدة. الأدوية تظهر للعامة فقط إذا فعّلت "ظاهر للعامة" (دون جرعات).
- بيانات المرضى والمتابعات لا تُعرض إلا بعد تسجيل دخول المشرف.
