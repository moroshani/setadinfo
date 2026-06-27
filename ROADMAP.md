# Roadmap

این فایل وضعیت واقعی کارهای باقی‌مانده را نگه می‌دارد. مخزن عمومی باید همیشه
طوری باشد که یک توسعه‌دهنده جدید بتواند بدون دسترسی به فایل‌های خصوصی، مسیر
بعدی را بفهمد.

## انجام شده

- ورک‌بنچ چندمسیره RTL با React، TypeScript و Vite.
- بک‌اند FastAPI با PostgreSQL، Redis، Celery worker/beat و SQLAlchemy.
- جستجوی زنده، ساخت پایش، تاریخچه اجرا، رویدادهای اعلان، بانک آگهی‌ها و مقصدهای
  Rubika.
- مدل اعلان baseline + delta برای ارسال فقط تغییرات بعد از لیست اولیه.
- مدیریت کاربران با نقش‌های `admin`، `operator` و `viewer`.
- اسکرین‌شات‌های عمومی با داده نمونه.
- مستندات فارسی برای اجرا، استقرار، معماری، Rubika و انتشار عمومی.
- مخزن عمومی پاک‌سازی‌شده بدون فایل‌های عملیاتی خصوصی، توکن، دامپ، کلید SSH یا
  فونت تجاری.

## اولویت‌های بعدی

1. بازطراحی کامل UX/UI فرانت‌اند بر اساس
   [FRONTEND_REDESIGN_BRIEF.md](FRONTEND_REDESIGN_BRIEF.md).
2. فعال کردن GitHub Actions واقعی بعد از دادن `workflow` scope به GitHub token
   و کپی کردن `docs/github-actions-ci.example.yml` به `.github/workflows/ci.yml`.
3. اضافه کردن migrations رسمی پایگاه داده، مثلا Alembic، تا schema production
   فقط با startup bootstrap مدیریت نشود.
4. ساخت seed/demo mode برای نمایش امن‌تر UI بدون اتصال به داده واقعی.
5. تکمیل QA تصویری بعد از بازطراحی، شامل viewport دسکتاپ و موبایل.
6. سخت‌تر کردن observability production: structured logs، export خطاها و run
   failure dashboard.
7. مستندسازی دقیق‌تر API عمومی داخلی برای مصرف فرانت‌اند.

## خط قرمزهای انتشار عمومی

- فایل `.env` واقعی وارد مخزن نشود.
- `.ops-private/` وارد مخزن نشود.
- توکن Rubika، chat ID، کلید SSH، دامپ PostgreSQL و اسکرین‌شات خصوصی وارد مخزن
  نشود.
- فونت‌های تجاری یا کاربر-فراهم‌شده بدون مجوز بازنشر وارد مخزن نشوند.

